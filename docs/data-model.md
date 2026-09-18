# Data Model — Capability-Match Ambulance–Hospital Coordination System

## 0. Document Control

| Field | Value |
|---|---|
| Document | `data-model.md` |
| Project | Capability-Match Ambulance–Hospital Coordination System |
| Track | HealthTech — Accessible Care & Intelligent Patient Support |
| Build window | ~18 hours |
| Database | Firebase Firestore |
| Status | Foundation specification |
| Source of truth | `PRD_Final.md` |
| Depends on | `architecture.md` |
| Purpose | Freeze the application's logical and Firestore data model before implementation |

> **Important:** The PRD is locked and explicitly supersedes `Project_Plan.md` and `Project_Plan_Old.md`. This document therefore formalizes the PRD data model rather than introducing a second product definition.

---

# 1. Purpose

This document defines the application's data model at sufficient detail for all three developers to implement against the same contract.

It answers:

- What entities exist?
- What is stored for each entity?
- Which fields are required?
- Which values are allowed?
- What is derived versus persisted?
- How entities relate to one another in Firestore?
- Which fields are updated by which subsystem?
- Which operations require a transaction?
- Which data must be copied into the audit trail?
- What data is needed for single-case routing?
- What data is needed for mass-casualty distribution?
- What data is needed for stale-data handling?
- What data is needed for reliability/accountability reporting?
- Which parts are demo-only and which are designed as production-oriented concepts?

The model is designed around the PRD's core distinction:

> A hospital is not represented merely by a bed count. The matching decision uses a capability profile, the current state of that profile, the case's structured need profile, distance, current load, and freshness of hospital data.

---

# 2. Data-Model Principles

## 2.1 Firestore-native design

The implementation uses Firestore documents and collections rather than a relational schema.

The logical entities remain:

```text
HOSPITAL
CASE
REQUEST
AUDIT_LOG
```

The relational relationships described in the PRD are therefore represented through document IDs and denormalized snapshots where appropriate.

## 2.2 Separate source-of-truth state from historical snapshots

Live entities represent current state.

Historical audit entries represent what the system knew and what it decided at a particular point in time.

For example:

```text
Hospital document
    last_updated_at = current value

Audit document
    hospital_snapshot = value observed when the decision was made
```

The audit record must not depend on a future read of the hospital document because the live document may later change.

## 2.3 Persist only what is necessary

Do not create a field merely because it sounds useful.

Every field should support at least one of:

- matching,
- routing,
- realtime state synchronization,
- resource holding,
- auditability,
- reliability,
- mass-casualty distribution,
- demo visibility,
- required handoff information.

## 2.4 Deterministic matching data

The critical matching decision must use structured fields.

The AI/LLM layer must not become the source of truth for the selected hospital.

The stored match result therefore contains numeric and categorical information that can be reproduced independently.

## 2.5 Explicit derived fields

Fields such as `reliability_score`, `match_score`, and `data_freshness` may be derived.

Whenever practical:

- keep the raw inputs,
- keep the derived result used by the UI,
- document how the derived result was obtained.

This makes technical Q&A and auditability much easier.

---

# 3. Firestore Top-Level Collections

Recommended top-level collections:

```text
/hospitals
/cases
/requests
/audit_logs
```

Optional support collections that may be introduced during implementation:

```text
/demo_config
/rate_limits
```

The four primary collections are the minimum logical model.

A developer must not create alternative collections representing the same concepts without first updating this document.

---

# 4. Entity Overview

```text
┌────────────────────┐
│      HOSPITAL      │
│ live capability    │
│ live resource state│
└─────────┬──────────┘
          │
          │ hospital_id
          ▼
┌────────────────────┐
│      REQUEST       │
│ routing attempt    │
│ pending/accepted/  │
│ rejected/timed out │
└─────────┬──────────┘
          │
          │ case_id
          ▼
┌────────────────────┐
│        CASE        │
│ patient need       │
│ severity           │
│ need profile       │
│ incident group     │
└─────────┬──────────┘
          │
          │ request_id
          ▼
┌────────────────────┐
│     AUDIT_LOG      │
│ immutable decision │
│ history + snapshot │
└────────────────────┘
```

Conceptually:

```text
CASE 1 ────────< REQUEST >──────── 1 HOSPITAL

CASE 1 ────────< AUDIT_LOG through REQUEST
```

A case can have multiple requests because a case may be:

```text
Hospital A → rejected
Hospital B → timed out
Hospital C → accepted
```

All of those requests remain part of the historical trail.

---

# 5. HOSPITAL

## 5.1 Purpose

A `HOSPITAL` document represents the current operational capability state of one participating facility.

This is the central supply-side object used by the matching engine.

The PRD explicitly requires:

- trauma-team state,
- specialists,
- ICU capacity,
- ventilator capacity,
- blood stock,
- ER load,
- scheme eligibility flag,
- update timestamp,
- reliability score.

## 5.2 Firestore location

```text
/hospitals/{hospitalId}
```

## 5.3 Schema

```json
{
  "id": "hospital_001",
  "name": "CityCare General Hospital",
  "lat": 21.1702,
  "lng": 72.8311,

  "trauma_team_on_shift": true,

  "specialists_on_call": [
    "cardiologist",
    "orthopedist"
  ],

  "icu_beds_free": 4,
  "ventilators_free": 2,

  "blood_stock": {
    "O-": 3,
    "O+": 14,
    "A+": 11,
    "A-": 2,
    "B+": 9,
    "B-": 1,
    "AB+": 5,
    "AB-": 1
  },

  "er_load_score": 2,

  "accepts_scheme_patients": true,

  "last_updated_at": "Firestore Timestamp",

  "reliability_score": 0.94
}
```

## 5.4 Field specification

| Field | Type | Required | Mutable | Description |
|---|---|---:|---:|---|
| `id` | string | yes | no | Stable hospital identifier |
| `name` | string | yes | yes | Display name |
| `lat` | number | yes | yes | Latitude used for distance calculation |
| `lng` | number | yes | yes | Longitude used for distance calculation |
| `trauma_team_on_shift` | boolean | yes | yes | Whether the hospital currently has a trauma team available |
| `specialists_on_call` | array<string> | yes | yes | Specialists currently available/on-call |
| `icu_beds_free` | integer | yes | yes | Available ICU capacity |
| `ventilators_free` | integer | yes | yes | Available ventilator capacity |
| `blood_stock` | map<string, integer> | yes | yes | Current stock counts by blood group |
| `er_load_score` | integer | yes | yes | Self-reported emergency load from 1–5 |
| `accepts_scheme_patients` | boolean | yes | yes | Simple eligibility/access flag retained by the PRD |
| `last_updated_at` | timestamp | yes | yes | Last time the hospital capability profile was updated |
| `reliability_score` | number | yes | derived/updateable | Current reliability metric |

## 5.5 Validation rules

### `id`

- Non-empty.
- Immutable after creation.
- Use a stable identifier rather than hospital display name as the document key.

### `name`

- Non-empty.
- Human-readable.
- No assumption that the name uniquely identifies the document.

### `lat`

- Numeric.
- Valid geographic latitude range.

### `lng`

- Numeric.
- Valid geographic longitude range.

### `trauma_team_on_shift`

Only:

```text
true
false
```

### `specialists_on_call`

Array of normalized strings.

Use a controlled vocabulary for the hackathon seed data:

```text
cardiologist
orthopedist
neurologist
obgyn
pediatrician
general_surgeon
anesthetist
```

The implementation may support additional values, but the UI and demo data should remain consistent.

### `icu_beds_free`

- Integer.
- Minimum `0`.
- Never negative.

### `ventilators_free`

- Integer.
- Minimum `0`.
- Never negative.

### `blood_stock`

Each stock value:

- integer,
- minimum `0`.

The allowed blood-group keys for the initial demo dataset:

```text
O-
O+
A+
A-
B+
B-
AB+
AB-
```

### `er_load_score`

Allowed range:

```text
1 = low load
2 = moderate-low
3 = medium
4 = high
5 = very high
```

Do not change the meaning of these values between screens.

### `accepts_scheme_patients`

Boolean only.

This is intentionally a simplified representation. Full eligibility verification is roadmap scope.

### `last_updated_at`

Firestore timestamp.

This is critical for stale-data handling.

### `reliability_score`

Decimal between:

```text
0.0 and 1.0
```

UI may display it as a percentage:

```text
0.94 → 94%
```

The numeric canonical value remains the stored representation.

---

# 6. Hospital Capability Semantics

The fields above must not be interpreted as generic "hospital quality" indicators.

They represent capabilities that can be matched against a case.

Examples:

```text
Cardiac case
→ cardiologist
→ ECG capability
→ ICU capacity
```

```text
Trauma case
→ trauma team
→ surgeon/orthopedist depending on rule profile
→ ICU or ventilator depending on case
```

```text
Obstetric case
→ obgyn
→ maternity capability
```

```text
Pediatric case
→ pediatrician
```

The exact case-to-need mapping belongs to the rules layer.

The hospital document stores supply-side capability; it does not decide what a case needs.

---

# 7. CASE

## 7.1 Purpose

A `CASE` is the canonical representation of one patient/emergency episode entering the system.

It contains the structured information necessary to generate a need profile and route the case.

## 7.2 Firestore location

```text
/cases/{caseId}
```

## 7.3 Schema

```json
{
  "id": "case_001",
  "created_at": "Firestore Timestamp",

  "category": "cardiac",
  "severity": "red",

  "need_profile": {
    "specialists_needed": [
      "cardiologist"
    ],
    "capability_flags": [
      "ecg",
      "icu"
    ],
    "blood_type_needed": null
  },

  "vitals_summary": "Chest pain, SpO2 91%, pulse 118",

  "onset_time": "25 minutes ago",
  "treatment_administered": "Oxygen started",

  "patient_basic_info": {
    "age": 61,
    "sex": "male"
  },

  "incident_group_id": null,

  "ambulance_location": {
    "lat": 21.1632,
    "lng": 72.8398
  }
}
```

The `ambulance_location` object is an implementation-supporting field needed to perform the distance component of matching. It should be treated as case-location input, not as a patient-identity field.

## 7.4 Field specification

| Field | Type | Required | Mutable | Description |
|---|---|---:|---:|---|
| `id` | string | yes | no | Stable case ID |
| `created_at` | timestamp | yes | no | Case creation time |
| `category` | enum string | yes | preferably no after matching | Emergency category |
| `severity` | enum string | yes | yes | Red/yellow/green severity tag |
| `need_profile` | object | yes | derived/updateable before routing | Structured capabilities required |
| `vitals_summary` | string | optional for minimal flow, recommended | yes | Structured handoff summary |
| `onset_time` | string | optional | yes | Time since onset / known onset time |
| `treatment_administered` | string | optional | yes | Treatment already provided |
| `patient_basic_info` | object | yes for demo | limited | Minimal demographic information |
| `incident_group_id` | string/null | yes | no after grouping | Links cases from one mass-casualty incident |
| `ambulance_location` | object | yes for live distance | yes | Current routing origin |

---

# 8. Case Category Enumeration

Initial allowed values:

```text
cardiac
trauma
obstetric
pediatric
```

Additional categories should not be introduced during implementation unless the rules table and matching tests are updated at the same time.

The PRD specifically calls for demo coverage across:

- trauma,
- cardiac,
- maternity/obstetric,
- pediatric.

---

# 9. Severity Enumeration

Allowed:

```text
red
yellow
green
```

Interpretation for the prototype:

| Severity | Meaning |
|---|---|
| `red` | Immediate/high urgency |
| `yellow` | Urgent but not immediate catastrophic deterioration |
| `green` | Lower urgency relative to the other prototype categories |

This is a prototype routing signal, not a clinical diagnosis system.

The system must not claim to perform medical diagnosis.

---

# 10. NEED_PROFILE

## 10.1 Purpose

`need_profile` is the bridge between:

```text
patient/case description
```

and:

```text
hospital capability
```

It is one of the most important objects in the entire project.

The project exists specifically to avoid the old pattern of:

```text
case → nearest hospital
```

and instead use:

```text
case → structured needs → capability match
```

## 10.2 Schema

```json
{
  "specialists_needed": [
    "cardiologist"
  ],
  "capability_flags": [
    "ecg",
    "icu"
  ],
  "blood_type_needed": null
}
```

## 10.3 Fields

| Field | Type | Required | Description |
|---|---|---:|---|
| `specialists_needed` | array<string> | yes | Specialists required |
| `capability_flags` | array<string> | yes | Non-specialist capabilities needed |
| `blood_type_needed` | string/null | yes | Blood group requirement where applicable |

## 10.4 Capability flag examples

Initial controlled vocabulary:

```text
ecg
icu
ventilator
trauma_team
maternity
pediatric_emergency
```

The rules engine may reference these flags.

---

# 11. RULE PROFILE

The rules mapping is logically part of the matching domain, even if it is not stored as a primary Firestore entity.

Example:

```json
{
  "cardiac": {
    "specialists_needed": ["cardiologist"],
    "capability_flags": ["ecg", "icu"],
    "blood_type_needed": null
  },
  "trauma": {
    "specialists_needed": [],
    "capability_flags": ["trauma_team", "icu"],
    "blood_type_needed": "O-"
  },
  "obstetric": {
    "specialists_needed": ["obgyn"],
    "capability_flags": ["maternity"],
    "blood_type_needed": null
  },
  "pediatric": {
    "specialists_needed": ["pediatrician"],
    "capability_flags": ["pediatric_emergency"],
    "blood_type_needed": null
  }
}
```

This is illustrative structure; the final rule values must be frozen before implementation/testing.

The core architectural principle is:

```text
case category
      ↓
rule lookup
      ↓
need profile
```

not:

```text
free-text prompt
      ↓
LLM
      ↓
uncontrolled clinical interpretation
```

---

# 12. REQUEST

## 12.1 Purpose

A `REQUEST` represents one hospital-specific routing attempt for one case.

This is not the case itself.

One case may generate several request documents.

Example:

```text
CASE_001

REQUEST_001 → Hospital A → timed_out
REQUEST_002 → Hospital B → rejected
REQUEST_003 → Hospital C → accepted
```

That distinction is essential for rerouting and auditability.

## 12.2 Firestore location

```text
/requests/{requestId}
```

## 12.3 Schema

```json
{
  "id": "request_003",
  "case_id": "case_001",
  "hospital_id": "hospital_003",

  "status": "accepted",

  "sent_at": "Firestore Timestamp",
  "responded_at": "Firestore Timestamp",

  "expires_at": "Firestore Timestamp",

  "attempt_number": 3,

  "match_score_breakdown": {
    "capability_match_pct": 100,
    "distance_km": 4.2,
    "distance_factor": 0.88,
    "load_factor": 0.80,
    "staleness_factor": 1.0,
    "final_score": 70.4
  },

  "reason_shown_to_dispatcher": "Hospital C — cardiologist on shift, ICU free, 6 min away",

  "need_profile_snapshot": {
    "specialists_needed": [
      "cardiologist"
    ],
    "capability_flags": [
      "ecg",
      "icu"
    ],
    "blood_type_needed": null
  },

  "hospital_capability_snapshot": {
    "trauma_team_on_shift": true,
    "specialists_on_call": [
      "cardiologist"
    ],
    "icu_beds_free": 4,
    "ventilators_free": 2,
    "er_load_score": 2,
    "last_updated_at": "Firestore Timestamp"
  }
}
```

## 12.4 Field specification

| Field | Type | Required | Description |
|---|---|---:|---|
| `id` | string | yes | Stable request ID |
| `case_id` | string | yes | Case being routed |
| `hospital_id` | string | yes | Hospital receiving this attempt |
| `status` | enum | yes | Current request state |
| `sent_at` | timestamp | yes | When the request was sent |
| `responded_at` | timestamp/null | yes | Human response time, null until resolved |
| `expires_at` | timestamp | yes | Request timeout deadline |
| `attempt_number` | integer | yes | Reroute attempt sequence |
| `match_score_breakdown` | object | yes | Reproducible ranking inputs/outputs |
| `reason_shown_to_dispatcher` | string | yes | Human-readable explanation |
| `need_profile_snapshot` | object | yes | Need state used for this request |
| `hospital_capability_snapshot` | object | yes | Capability state used at decision time |

---

# 13. REQUEST STATUS ENUMERATION

Allowed states:

```text
pending
accepted
rejected
timed_out
superseded
```

## 13.1 `pending`

The request is active and waiting for a hospital response.

## 13.2 `accepted`

The hospital explicitly accepted the case.

This is the only state that converts the proposed routing into a confirmed commitment in the prototype flow.

## 13.3 `rejected`

Hospital explicitly declined.

The routing engine should proceed to the next eligible ranked hospital.

## 13.4 `timed_out`

Hospital did not respond before `expires_at`.

The routing engine should proceed to the next ranked hospital.

## 13.5 `superseded`

The request is no longer the active candidate because another request has become authoritative.

Example:

```text
Hospital A request → superseded
Hospital B request → accepted
```

---

# 14. REQUEST STATE TRANSITION RULES

Valid transition patterns:

```text
pending
  ├── accepted
  ├── rejected
  └── timed_out
```

Then:

```text
rejected/timed_out
      ↓
create next request
```

And optionally:

```text
previous request
      ↓
superseded
```

Invalid transitions should be rejected.

Examples:

```text
accepted → pending        INVALID
accepted → rejected       INVALID
timed_out → accepted      INVALID
rejected → accepted       INVALID
```

The implementation should enforce transitions in the backend/service layer rather than trusting the frontend.

---

# 15. REQUEST COUNTDOWN

The countdown should be represented by:

```text
sent_at
expires_at
```

The frontend calculates:

```text
remaining_seconds =
    expires_at - current_time
```

Do not persist a changing `remaining_seconds` every second.

That would generate unnecessary writes and complicate realtime synchronization.

Instead:

```text
Firestore:
expires_at = fixed timestamp

Frontend:
render countdown locally
```

At demo time, the prototype may use a short interval such as the PRD's example 90-second countdown.

The actual configured duration should be centralized in configuration rather than hard-coded across multiple components.

---

# 16. MATCH SCORE BREAKDOWN

The request must retain enough information to explain how a hospital was ranked.

Minimum components:

```text
capability_match_pct
distance_km
load_factor
```

Recommended additional persisted components:

```text
distance_factor
staleness_factor
final_score
```

This produces a trace such as:

```text
Capability match: 100%
Distance: 4.2 km
Distance factor: 0.88
ER load factor: 0.80
Freshness factor: 1.00
Final score: 70.4
```

The exact mathematical formula must be frozen in `spec.md`.

`data-model.md` only establishes where those values live.

---

# 17. WHY-THIS-HOSPITAL EXPLANATION

The `reason_shown_to_dispatcher` field stores the deterministic human-readable explanation actually shown to the ambulance UI.

Example:

```text
Hospital C — cardiologist on shift, ICU free, 6 min away
```

The explanation should correspond to actual stored fields.

The system must never display an explanation that claims a capability the hospital document did not contain.

If an AI/LLM later assists in phrasing the explanation:

```text
raw match facts
      ↓
AI wording layer
      ↓
human-readable explanation
```

The raw facts remain authoritative.

---

# 18. AUDIT_LOG

## 18.1 Purpose

The audit log provides the forensic history of routing decisions.

This directly supports the PRD's accountability requirement.

An audit record should answer:

```text
What happened?
When?
For which case?
For which request?
Which hospital?
What data did the system observe?
What decision was made?
Why?
```

## 18.2 Firestore location

```text
/audit_logs/{auditLogId}
```

## 18.3 Schema

```json
{
  "id": "audit_00017",
  "request_id": "request_003",
  "case_id": "case_001",
  "hospital_id": "hospital_003",

  "event_type": "REQUEST_ACCEPTED",

  "timestamp": "Firestore Timestamp",

  "actor_type": "hospital_user",

  "actor_id": "hospital_003_demo",

  "snapshot_of_data_at_decision_time": {
    "case": {
      "category": "cardiac",
      "severity": "red"
    },

    "need_profile": {
      "specialists_needed": [
        "cardiologist"
      ],
      "capability_flags": [
        "ecg",
        "icu"
      ],
      "blood_type_needed": null
    },

    "hospital": {
      "icu_beds_free": 4,
      "ventilators_free": 2,
      "er_load_score": 2,
      "specialists_on_call": [
        "cardiologist"
      ],
      "last_updated_at": "Firestore Timestamp"
    },

    "match": {
      "capability_match_pct": 100,
      "distance_km": 4.2,
      "final_score": 70.4
    }
  },

  "metadata": {
    "source": "hospital_app"
  }
}
```

## 18.4 Event types

Minimum controlled vocabulary:

```text
CASE_CREATED
NEED_PROFILE_GENERATED
MATCH_COMPUTED
REQUEST_CREATED
REQUEST_SENT
REQUEST_ACCEPTED
REQUEST_REJECTED
REQUEST_TIMED_OUT
REQUEST_SUPERSEDED
REROUTE_TRIGGERED
RESOURCE_HELD
RESOURCE_RELEASED
HOSPITAL_STATUS_UPDATED
```

The exact final list should be frozen in `spec.md`.

---

# 19. Audit Log Immutability

Audit records should be append-only.

Normal application flows must not mutate old audit records.

Correct:

```text
create audit entry
create audit entry
create audit entry
```

Incorrect:

```text
edit yesterday's audit entry
delete old audit entry
rewrite historical decision
```

If a correction or unusual administrative operation is ever needed, it should create a new audit event rather than rewriting history.

---

# 20. AUDIT SNAPSHOT PRINCIPLE

This is important.

Suppose:

```text
10:02 Hospital A:
ICU = 1
Cardiologist = available
ER load = 2
```

The match occurs.

At:

```text
10:07
```

the hospital updates:

```text
ICU = 0
ER load = 5
```

The 10:02 routing decision must still be explainable from the audit record.

Therefore:

```text
audit_log.snapshot_of_data_at_decision_time
```

must be a copy of the relevant inputs at the moment the decision was made.

Do not rely only on a live pointer such as:

```text
hospital_id = hospital_A
```

for forensic reconstruction.

---

# 21. RESOURCE-HOLD DATA

The PRD requires concurrency-safe holds.

The simplest implementation should not introduce an entirely separate reservation entity unless needed.

Resource availability can be represented directly in the hospital document:

```text
icu_beds_free
ventilators_free
blood_stock
```

When an accepted request consumes/holds capacity:

```text
icu_beds_free: 4 → 3
```

or:

```text
ventilators_free: 2 → 1
```

The specific capability decrement depends on the accepted case's need profile.

---

# 22. Concurrency Invariant

The central invariant is:

> A resource must never be successfully consumed twice from the same available slot because of simultaneous requests.

Example:

Initial:

```text
icu_beds_free = 1
```

Two requests arrive nearly simultaneously.

Wrong behavior:

```text
Request A reads 1
Request B reads 1
A writes 0
B writes 0

Result: both think they got the bed.
```

Correct behavior:

```text
Transaction A:
  reads 1
  reserves/decrements to 0
  commits

Transaction B:
  reads updated state or transaction conflicts
  sees 0
  cannot commit the same allocation
```

The PRD explicitly points to Firestore transactions for this purpose.

---

# 23. DATA OWNERSHIP BY SUBSYSTEM

| Data | Primary owner | Read by |
|---|---|---|
| Hospital capability | Hospital module/backend | Matching engine, hospital UI, admin UI |
| Case | Ambulance/backend | Matching engine, hospital UI, admin UI |
| Need profile | Rules/matching backend | Ambulance UI, matching engine, hospital UI |
| Request | Realtime/backend module | Ambulance UI, hospital UI, admin UI |
| Audit log | Backend/realtime module | Admin UI |
| Reliability | Backend/reliability logic | Hospital UI, admin UI, ambulance explanation layer |
| Match breakdown | Matching engine | Request, ambulance UI, admin UI |
| Incident group | Ambulance/mass-casualty module | Matching engine, ambulance UI, admin UI |

This ownership division is intended to reduce accidental cross-editing between the two backend developers.

---

# 24. Realtime Update Model

Firestore realtime listeners should observe state changes rather than manually polling every screen.

Key examples:

## Ambulance listens to

```text
/cases/{caseId}
/requests filtered by case_id
```

## Hospital listens to

```text
/requests filtered by hospital_id and status == pending
/hospitals/{hospitalId}
```

## Admin listens to

```text
/hospitals
/requests
/audit_logs
```

The final query design belongs in `api-contract.md` and implementation specifications.

---

# 25. Mass-Casualty Data Model

The PRD requires multiple patients from a single incident to share an `incident_group_id`.

Example:

```text
incident_group_001
│
├── case_101
├── case_102
├── case_103
└── case_104
```

Each case still remains an independent `CASE` document.

This allows:

- individual patient attributes,
- individual need profiles,
- individual requests,
- individual audit trails.

The group identifier lets the matching engine recognize:

```text
these four cases came from the same incident
```

and solve them jointly.

---

# 26. Mass-Casualty Grouping Rules

For the prototype:

```text
incident_group_id != null
```

means the case participates in a mass-casualty distribution workflow.

Cases with:

```text
incident_group_id == null
```

follow the normal single-case workflow.

The matching engine must not assume every case is part of a group.

---

# 27. Recommended Future Group Metadata

If needed by implementation, a future `incident_group` collection could store:

```text
incident_group_id
incident_name
created_at
origin_location
case_count
status
```

However, this is not necessary for the first implementation if the group can be represented safely using the existing `incident_group_id` field.

Do not add another collection solely for organizational neatness during the hackathon.

---

# 28. Ambulance Location

The matching engine needs an origin coordinate.

Recommended structure:

```json
{
  "lat": 21.1632,
  "lng": 72.8398
}
```

This may represent:

- current ambulance position, or
- manually seeded demo origin.

The implementation should clearly distinguish:

```text
live browser location
```

from:

```text
demo fallback location
```

so the UI does not falsely imply live GPS when the demo uses a fixed coordinate.

---

# 29. Hospital Location

Hospital coordinates are persistent attributes of a seeded hospital.

They exist primarily for:

```text
distance calculation
map display
ETA approximation
```

The prototype can compute straight-line distance using geographic coordinates.

A third-party mapping provider is not required just to calculate distance.

---

# 30. ETA

The PRD requires the UI to communicate distance/ETA.

The underlying canonical data remains:

```text
distance_km
```

A simple prototype ETA can be derived from distance using a fixed configurable demonstration speed.

The exact formula and whether the final implementation uses an actual routing API or Haversine-derived approximation belongs in `spec.md`.

Do not store an independently invented ETA value unless there is a clear need.

---

# 31. Reliability Data

## 31.1 Concept

The PRD requires a hospital reliability score based on observed commitment behavior.

Conceptually:

```text
successful accepted-and-honored outcomes
-----------------------------------------
total accepted commitments
```

represented as a value from `0.0` to `1.0`.

Example display:

```text
0.94
↓
94% reliable
```

## 31.2 Important distinction

Reliability is not:

```text
hospital quality
medical quality
clinical outcome score
```

It is a prototype accountability metric related to the hospital's behavior in the system's commitment protocol.

## 31.3 Storage

The current aggregate value can live in:

```text
hospitals/{hospitalId}.reliability_score
```

The evidence/history should be recoverable from request and audit data.

---

# 32. Reliability Update Events

The implementation must define which events affect reliability.

Candidate event sequence:

```text
REQUEST_ACCEPTED
       ↓
case ultimately honored
```

versus:

```text
REQUEST_ACCEPTED
       ↓
commitment later considered failed
```

The PRD refers to "accepted-and-delivered vs. claimed available, patient still turned away."

Because a full real hospital admission integration is out of scope, the prototype must define an explicit demo interpretation of "honored."

That definition must be frozen in `spec.md` before implementation.

---

# 33. Stale-Data Model

The stale-data fallback depends on:

```text
hospital.last_updated_at
```

No extra boolean such as:

```text
is_stale
```

is required as a source-of-truth field.

Instead derive:

```text
age = current_time - last_updated_at
```

then determine:

```text
fresh
stale
unknown
```

according to the threshold defined in `spec.md`.

This avoids two pieces of state getting out of sync.

---

# 34. Stale Snapshot in Requests

When a hospital is ranked, store:

```text
hospital_capability_snapshot.last_updated_at
```

inside the request.

This lets the audit trail show:

```text
the recommendation used data that was X minutes old
```

rather than merely showing the hospital's current timestamp after the fact.

---

# 35. Scheme / Eligibility Field

The PRD retains:

```text
accepts_scheme_patients
```

as a simplified boolean.

This is intentionally not expanded into:

```text
insurance verification
scheme database
eligibility rules engine
document verification
```

Those belong to roadmap scope.

For the prototype:

```text
true
false
```

is sufficient.

---

# 36. Patient Basic Information

Prototype minimum:

```json
{
  "age": 61,
  "sex": "male"
}
```

Optional:

```text
name
```

Do not store unnecessary personally identifying data.

The project is a prototype and should use synthetic/demo patients.

---

# 37. Handoff Information

The structured request must carry:

```text
severity
category
need_profile
vitals_summary
onset_time
treatment_administered
patient_basic_info
```

This means the hospital does not merely receive:

```text
"Cardiac emergency"
```

It receives an interpretable structured handoff.

The UI can render:

```text
Need:
Cardiologist + ECG + ICU

Vitals:
SpO2 91%, pulse 118

Treatment:
Oxygen started

ETA:
6 minutes
```

---

# 38. Demo Synthetic Data

The PRD calls for approximately 6–10 fictional hospitals representing one city.

Recommended seed count:

```text
8 hospitals
```

Recommended capability distribution:

| Hospital | Example distinguishing capabilities |
|---|---|
| H1 | Strong cardiac capability |
| H2 | Strong trauma capability |
| H3 | Strong obstetric capability |
| H4 | Strong pediatric capability |
| H5 | Balanced general capabilities |
| H6 | ICU/ventilator-heavy |
| H7 | Near location but high ER load |
| H8 | Stale data / deliberately de-prioritized |

The exact seed values should be chosen to make the demo scenarios deterministic and visually understandable.

---

# 39. Demo Cases

At minimum seed or generate cases representing:

```text
cardiac
trauma
obstetric
pediatric
```

Mass-casualty demo:

```text
4 cases
same incident_group_id
different severity/needs
```

The four cases must have sufficiently different needs for distribution across multiple hospitals to be visibly meaningful.

---

# 40. Data Required for Scenario A

Scenario A needs:

```text
1 CASE
1 NEED_PROFILE
several HOSPITALS
1 REQUEST
1 ACCEPT
1 AUDIT trail
```

Expected sequence:

```text
CASE_CREATED
NEED_PROFILE_GENERATED
MATCH_COMPUTED
REQUEST_CREATED
REQUEST_SENT
REQUEST_ACCEPTED
RESOURCE_HELD
AUDIT events
```

---

# 41. Data Required for Scenario B

Reject/timeout → auto-reroute requires:

```text
1 CASE
multiple ranked hospitals
REQUEST_1
REQUEST_2
...
```

Example:

```text
REQUEST_1 → Hospital A → timed_out
REQUEST_2 → Hospital C → accepted
```

The original request must remain in the database.

Do not overwrite it with the rerouted request.

---

# 42. Data Required for Scenario C

Mass casualty needs:

```text
4 CASE documents
same incident_group_id
4 or more ranked hospital candidates
multiple REQUEST documents
```

The group should eventually show:

```text
Patient 1 → Hospital B
Patient 2 → Hospital D
Patient 3 → Hospital B
Patient 4 → Hospital F
```

subject to the actual joint matching algorithm.

---

# 43. Data Required for Scenario D

Stale fallback requires:

```text
Hospital H8
last_updated_at = deliberately old timestamp
```

The UI and matching engine should derive:

```text
status = stale/unknown
```

from the timestamp.

Do not seed a separate fake field merely to make the UI say "stale."

---

# 44. Data Required for Scenario E

Audit dashboard needs:

```text
requests
audit_logs
hospital reliability
```

The dashboard should be able to answer:

```text
Which hospital was contacted?
What was the score?
What did it say it had?
Did it accept?
How long did it take?
Was it rerouted?
What happened afterward?
```

---

# 45. Indexing Considerations

Final Firestore indexes should be generated from actual query patterns.

Expected query families include:

### Hospital list

```text
/hospitals
```

### Hospital incoming queue

```text
requests
where hospital_id == X
and status == pending
```

### Case requests

```text
requests
where case_id == X
order by sent_at
```

### Admin audit

```text
audit_logs
where case_id == X
order by timestamp
```

### Mass-casualty

```text
cases
where incident_group_id == X
```

Do not manually create large numbers of speculative composite indexes.

Implement the required query, observe Firestore's index requirements, and add only the necessary indexes.

---

# 46. Document Size Discipline

Avoid storing large uncontrolled objects.

Especially:

```text
full chat logs
large AI responses
binary attachments
medical documents
images
```

These are not part of the locked prototype data model.

The model is intentionally text-and-structured-data based.

---

# 47. Secret Handling

No credential or secret belongs in any document represented here.

Never store:

```text
API keys
passwords
access tokens
private keys
service-account JSON
```

inside Firestore seed data committed to GitHub.

The hackathon technical rules explicitly prohibit credentials in source/GitHub and require `.env` / `.env.example` where appropriate.

---

# 48. Source of Truth vs. Derived Data

## Source-of-truth examples

```text
hospital.icu_beds_free
hospital.specialists_on_call
hospital.er_load_score
hospital.last_updated_at

case.category
case.severity
case.need_profile

request.status
request.sent_at
request.expires_at
```

## Derived examples

```text
hospital freshness state
match capability percentage
distance factor
load factor
final match score
reliability percentage
ETA
```

A derived value may be persisted for display/audit, but the inputs needed to reproduce it should remain available.

---

# 49. Normalization vs. Denormalization

Because Firestore is document-oriented, some duplication is intentional.

Example:

```text
REQUEST
    hospital_id = H3

    hospital_capability_snapshot = {...}
```

This duplicates hospital capability information.

That duplication is intentional because it gives us:

- historical accuracy,
- auditability,
- fewer joins at display time,
- easier debugging,
- a direct explanation of why the request was generated.

Live hospital state remains in the hospital document.

The snapshot remains in the request/audit records.

---

# 50. Data Lifecycle

## Hospital

```text
seed
 ↓
edit capability
 ↓
used in matching
 ↓
capacity updated
 ↓
reliability updated
 ↓
continues as live facility
```

## Case

```text
created
 ↓
need profile generated
 ↓
matched
 ↓
requests created
 ↓
accepted/rerouted
 ↓
closed
```

## Request

```text
created
 ↓
pending
 ↓
accepted/rejected/timed_out
 ↓
possibly superseded
 ↓
immutable historical record
```

## Audit Log

```text
created once
 ↓
never rewritten
```

---

# 51. Case Closure

The current prototype should have a clear terminal concept for a case, even if the PRD does not require a dedicated `closed_at` field.

Potential logical states:

```text
routing
accepted
exhausted
```

If a case-level status is added, its exact values must be defined in `spec.md`.

Do not allow every frontend developer to invent their own case status model.

---

# 52. Empty / Null Semantics

Use `null` when a field is conceptually applicable but currently unknown/not applicable.

Example:

```json
"blood_type_needed": null
```

means:

```text
no blood-type requirement for this case
```

For arrays:

```json
"specialists_needed": []
```

means:

```text
no specialist requirement
```

Do not mix:

```text
null
""
[]
```

for the same semantic meaning across different documents.

---

# 53. Timestamps

Use Firestore timestamps for system events:

```text
created_at
sent_at
responded_at
expires_at
last_updated_at
timestamp
```

Do not use formatted display strings as canonical timestamps.

The UI can render:

```text
6:42 PM
```

from the timestamp.

---

# 54. IDs

Use stable opaque IDs.

Examples:

```text
hospital_001
case_001
request_001
audit_001
```

for seeded/demo data are acceptable.

Random/auto-generated IDs are also acceptable for runtime creation.

Do not use human-readable names as relational keys.

Example to avoid:

```text
hospital_id = "CityCare General Hospital"
```

Prefer:

```text
hospital_id = "hospital_003"
```

---

# 55. Security / Access Intent

The data model is not an authorization specification.

However, data responsibilities should follow:

### Ambulance

May create/read its own relevant case/request state.

### Hospital

May update its own capability profile and act on requests addressed to it.

### Admin

May read aggregate hospital state, requests, and audit records.

Actual Firestore security rules belong in the implementation/specification layer and must enforce the intended boundaries.

The prototype may use seeded/mock identities rather than a full authentication system, consistent with the PRD.

---

# 56. Three-Person Development Mapping

## Person 1 — Backend Core

Primary data responsibility:

```text
CASE
NEED_PROFILE
matching inputs
REQUEST scoring fields
resource-hold logic
```

## Person 2 — Backend Realtime + AI

Primary data responsibility:

```text
REQUEST state synchronization
AUDIT_LOG
reliability calculations
Firestore transactions
realtime listeners
AI explanation metadata if used
seed data
```

## Person 3 — Frontend

Primary read/render responsibility:

```text
CASE inputs
NEED_PROFILE visualization
REQUEST status
HOSPITAL capabilities
AUDIT/reliability views
```

The frontend developer should not invent backend field names independently.

---

# 57. Frontend Contract Rule

Frontend code must consume the fields defined here.

For example, use:

```text
request.match_score_breakdown.final_score
```

not:

```text
request.smartness
```

unless this document is changed first.

This prevents API/schema drift.

---

# 58. Backend Contract Rule

The backend must not silently change:

```text
field name
type
enum
null semantics
state meaning
```

during implementation.

Any required change should update:

```text
data-model.md
api-contract.md
spec.md
```

before the changed behavior is merged into `main`.

---

# 59. AI Data Boundary

If AI is used, define its input boundary clearly.

Allowed AI input:

```text
structured match facts
structured hospital/case facts
```

Example:

```json
{
  "hospital": "Hospital C",
  "capability_match_pct": 100,
  "distance_km": 4.2,
  "specialists": ["cardiologist"],
  "icu_beds_free": 4
}
```

AI output:

```text
Human-readable explanation.
```

Not allowed as the authoritative data path:

```text
raw patient story
    ↓
LLM decides hospital
    ↓
write hospital ID
```

The matching engine remains authoritative.

---

# 60. Minimum Viable Database State

Before feature implementation is considered ready, Firestore should be able to contain at least:

```text
8 hospitals
4 case categories
1 or more cases
multiple requests
audit events
reliability values
```

At least one hospital should be deliberately:

```text
stale
```

to make Scenario D deterministic.

---

# 61. Definition of Data-Model Completion

This document is considered implementation-ready when the team agrees on:

- collection names,
- document identity,
- required fields,
- field types,
- enum values,
- null/empty semantics,
- request state model,
- timestamp fields,
- match-score fields,
- audit snapshot requirements,
- hospital capability fields,
- mass-casualty grouping,
- reliability inputs,
- stale-data inputs,
- ownership boundaries.

No feature developer should need to ask:

> "What field do we use for this?"

for any core MVP concept after this document is frozen.

---

# 62. Open Decisions to Freeze in `spec.md`

The following are deliberately left for the next specification document rather than hidden inside the data model:

1. Exact match-score mathematical formula.
2. Exact stale-data threshold.
3. Exact countdown duration.
4. Exact resource-hold/decrement rules for each capability.
5. Exact reliability scoring lifecycle.
6. Exact case-level status model.
7. Exact request timeout implementation mechanism.
8. Exact Firestore security rules.
9. Exact API/event contract.
10. Exact AI explanation interface, if AI is enabled.
11. Exact mass-casualty optimization heuristic.
12. Exact seed values used for the final demo.
13. Exact ETA derivation.
14. Exact rate-limiting mechanism.
15. Exact audit event vocabulary.

Those decisions must be made once in `spec.md` and then treated as frozen implementation contracts.

---

# 63. Summary Schema

```text
HOSPITAL
├── identity
├── geo
├── trauma capability
├── specialist availability
├── ICU capacity
├── ventilator capacity
├── blood stock
├── ER load
├── scheme-access flag
├── freshness timestamp
└── reliability

CASE
├── identity
├── created_at
├── category
├── severity
├── need_profile
├── handoff information
├── patient basics
├── incident_group_id
└── ambulance location

REQUEST
├── case_id
├── hospital_id
├── status
├── timestamps
├── expiry
├── attempt number
├── match-score breakdown
├── explanation
├── need snapshot
└── hospital snapshot

AUDIT_LOG
├── request_id
├── case_id
├── hospital_id
├── event_type
├── timestamp
├── actor metadata
└── snapshot of relevant decision-time data
```

---

# 64. Final Design Rule

The data model should always preserve this causal chain:

```text
CASE
  ↓
NEED_PROFILE
  ↓
HOSPITAL CAPABILITIES
  ↓
MATCH SCORE
  ↓
REQUEST
  ↓
HUMAN ACCEPT/REJECT
  ↓
RESOURCE HOLD / REROUTE
  ↓
AUDIT
  ↓
RELIABILITY
```

That chain is the backbone of the entire project.

Every implementation decision that breaks this traceability should be treated as an architecture/specification change rather than an incidental coding detail.
