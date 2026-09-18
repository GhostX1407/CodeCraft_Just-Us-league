# SPEC — Capability-Match Ambulance–Hospital Coordination System

## 0. Document Control

| Field | Value |
|---|---|
| Document | `spec.md` |
| Project | Capability-Match Ambulance–Hospital Coordination System |
| Hackathon | CodeCraft / Technofora '26 |
| Track | HealthTech — Accessible Care & Intelligent Patient Support |
| Team | 3 members |
| Build window | Approximately 18 hours |
| Status | Pre-build implementation specification |
| Primary source | `PRD_Final.md` |
| Companion documents | `architecture.md`, `data-model.md`, `api-contract.md` |
| Purpose | Freeze implementation behavior before feature coding |

---

# 1. Purpose

This document converts the locked PRD and the foundation documents into an implementation-level specification.

The PRD defines the problem, locked scope, core feature set, data model, workflow, technology direction, demo scenarios, and hackathon constraints.

This document defines the exact prototype behavior required to implement those decisions consistently.

It exists so that the three developers do not independently invent:

- different scoring formulas,
- different timeout rules,
- different request states,
- different resource-hold semantics,
- different freshness thresholds,
- different mass-casualty behavior,
- different reliability calculations,
- different frontend interpretations of backend state.

---

# 2. Reading This Specification

There are two categories of decisions in this file.

## 2.1 PRD-locked requirements

These are directly constrained by the PRD.

Examples:

- Firebase/Firestore realtime layer.
- Capability-based matching.
- Accept/reject/timeout flow.
- Automatic rerouting.
- Concurrency-safe resource handling.
- Audit history.
- Mass-casualty distribution.
- Stale-data fallback.
- Human-confirmation framing.
- Reliability/accountability view.
- Functional multi-interface UI.

These must not be removed merely for convenience.

## 2.2 Implementation decisions

The PRD intentionally leaves some technical values open.

This document proposes concrete defaults for those open areas so the team can implement without ambiguity.

Examples:

- exact timeout duration,
- exact scoring factors,
- exact stale-data thresholds,
- exact mass-casualty optimization method,
- exact test criteria.

These values are implementation choices, not claims that the PRD itself specified them.

If the team later changes one, this document must be updated before the relevant code is changed.

---

# 3. Normative Language

The following terms are used deliberately.

### MUST

Required for the MVP.

### MUST NOT

Prohibited behavior within the MVP.

### SHOULD

Strong implementation expectation unless there is a concrete reason not to follow it.

### MAY

Optional implementation choice.

### ROADMAP

Explicitly not required for the current 18-hour build.

---

# 4. Product Boundary

## 4.1 Core product

The product is a realtime:

```text
Ambulance/Dispatcher
        ↕
Capability Matching
        ↕
Hospital Reception
```

coordination system with:

```text
commitment
rerouting
resource safety
auditability
accountability
```

and an administrative/oversight view.

## 4.2 Primary product thesis

The system is NOT:

```text
a hospital bed-count map
```

The core operation is:

```text
CASE
  →
NEED PROFILE
  →
CAPABILITY MATCH
  →
RANKED HOSPITAL
  →
ACTIVE REQUEST
  →
HUMAN ACCEPT/REJECT
  →
COMMIT OR REROUTE
```

---

# 5. Locked MVP Features

The following features are considered MVP under the locked PRD scope.

```text
1. Hospital capability profiles
2. Structured symptom/category → need profile
3. Capability-based matching
4. Distance factor
5. ER-load factor
6. Stale-data handling
7. "Why this hospital" explanation
8. Accept/reject request
9. Countdown timeout
10. Automatic reroute
11. Concurrency-safe resource consumption
12. Audit log
13. Reliability/accountability view
14. Mass-casualty distribution
15. Mid-transit reroute demonstration
16. Human-confirmation framing
17. Functional ambulance interface
18. Functional hospital interface
19. Functional admin/oversight interface
20. Demo/seed data
```

---

# 6. Explicit Roadmap / Out of Scope

These must not silently reappear as implementation requirements.

```text
Adversarial-gaming detection
Full reservation-abuse protection
Full insurance/scheme verification
Offline ambulance synchronization
Internal hospital resource reallocation
Family visibility link
```

The MVP may include small architectural hooks for future work, but these features are not to consume core build time.

---

# 7. Technology Specification

## 7.1 Required technology direction

The PRD locks:

```text
Firebase
Firestore
Realtime listeners / onSnapshot
React-based frontend
Node.js / Firebase Cloud Functions style backend logic
Browser geolocation
Haversine distance or a map API
Firebase Hosting or Vercel
```

## 7.2 Implementation recommendation

For consistency and minimum deployment friction:

```text
Frontend:
React + TypeScript + Vite

UI:
Tailwind CSS

Backend:
Firebase Cloud Functions + TypeScript

Database:
Cloud Firestore

Realtime:
Firestore onSnapshot

Authentication:
Prototype demo identity / optional Firebase Auth

Map:
Leaflet + OpenStreetMap tiles where network is reliable
Distance:
Haversine calculation

Hosting:
Firebase Hosting

Testing:
Vitest for pure logic
Firebase Emulator Suite where practical
```

The React/TypeScript/Vite/Tailwind/Leaflet choices are implementation choices added for consistency; they are not quoted as mandatory requirements from the PRD.

---

# 8. Monorepo Specification

The project uses one GitHub repository.

Recommended structure:

```text
project-root/
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types/
│   │   ├── utils/
│   │   └── styles/
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
│
├── functions/
│   ├── src/
│   │   ├── api/
│   │   ├── domain/
│   │   ├── matching/
│   │   ├── routing/
│   │   ├── resources/
│   │   ├── audit/
│   │   ├── reliability/
│   │   ├── ai/
│   │   ├── data/
│   │   └── utils/
│   ├── package.json
│   └── tsconfig.json
│
├── docs/
│   ├── architecture.md
│   ├── data-model.md
│   ├── api-contract.md
│   ├── spec.md
│   ├── plans.md
│   └── tasks.md
│
├── scripts/
│   └── seed/
│
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── .firebaserc
├── .env.example
├── .gitignore
└── README.md
```

---

# 9. Single Frontend Application

The frontend is one application with role-specific routes.

Recommended routes:

```text
/
/ambulance
/hospital
/hospital/:hospitalId
/admin
```

The frontend does not need three separately deployed React projects.

This keeps:

```text
one build
one deployment
one package management path
one UI codebase
```

while still presenting three distinct application experiences.

---

# 10. Frontend Interface Responsibilities

## 10.1 Ambulance

Must provide:

```text
New case
Case category
Severity
Need profile preview
Location
Find hospital
Pending request
Countdown
Acceptance
Reroute
Mass-casualty mode
Structured handoff
```

## 10.2 Hospital

Must provide:

```text
Hospital identity
Capability profile
Incoming request queue
Countdown
Accept
Reject
Capability update
Reliability display
Incoming-case preparation view
```

## 10.3 Admin

Must provide:

```text
Hospital map
Hospital status
Reliability metrics
Request history
Audit log
Live routing activity
```

---

# 11. Realtime Architecture Specification

Firestore is authoritative for shared state.

The system uses:

```text
write to Firestore
   ↓
onSnapshot
   ↓
subscribed clients update
```

The frontend MUST NOT simulate cross-device state locally.

Example:

```text
Hospital taps Accept
       ↓
backend transaction commits
       ↓
Firestore request.status = accepted
       ↓
ambulance listener receives update
       ↓
ambulance UI changes to Accepted
```

---

# 12. Server-Authoritative Time

All critical time decisions must use backend/server time.

Client clocks may drift.

Therefore:

```text
request.expires_at
```

must be generated using server-authoritative time.

The frontend countdown is only a visual representation.

The frontend MUST NOT decide that a request has timed out merely because its local timer reached zero.

---

# 13. Timeouts

## 13.1 MVP timeout

Implementation default:

```text
REQUEST_TIMEOUT_SECONDS = 30
```

This is a prototype/demo implementation choice.

The PRD used a longer example countdown such as 90 seconds; the exact duration was not locked.

Thirty seconds is chosen for practical demonstration.

## 13.2 Configuration

The timeout must be configured once:

```text
REQUEST_TIMEOUT_SECONDS
```

and imported by the request lifecycle logic.

It must not be hard-coded into multiple components.

---

# 14. Request Lifecycle

Canonical request lifecycle:

```text
CREATED
  ↓
PENDING
  ├── ACCEPTED
  ├── REJECTED
  └── TIMED_OUT

REJECTED/TIMED_OUT
  ↓
REROUTE
  ↓
NEXT REQUEST

ACCEPTED
  ↓
COMMITTED

ACCEPTED
  ↓
CAPABILITY INVALIDATED WHILE IN TRANSIT
  ↓
SUPERSEDED
  ↓
REROUTE
```

The final mid-transit behavior adds a controlled exception to the ordinary terminal-state pattern because the PRD requires a live reroute demonstration.

---

# 15. Request State Definitions

## `pending`

Active request awaiting hospital response.

## `accepted`

Hospital explicitly accepted and the resource commitment transaction succeeded.

## `rejected`

Hospital explicitly rejected.

## `timed_out`

Hospital did not respond before the server-authoritative deadline.

## `superseded`

The request is no longer the active routing attempt because:

- a later request was accepted, or
- an accepted commitment became invalid during transit.

---

# 16. Case-Level Routing State

A case maintains a routing summary.

Recommended:

```json
{
  "status": "routing",
  "active_request_id": "request_001",
  "attempt_number": 1,
  "accepted_hospital_id": null
}
```

Recommended case routing states:

```text
routing
accepted
exhausted
```

### `routing`

At least one request is pending or a reroute is being processed.

### `accepted`

A hospital has accepted and holds the required resource.

### `exhausted`

No candidate hospital remains.

---

# 17. Case Cannot Have Two Active Acceptances

Invariant:

```text
For one CASE:
maximum one active accepted commitment.
```

Once a case is accepted:

```text
other pending requests
```

must not remain independently actionable.

They must be:

```text
superseded
```

or otherwise prevented from accepting by the backend state check.

---

# 18. Need Profile Rules

## 18.1 General rule

The prototype uses deterministic rules.

Input:

```text
case.category
case.severity
```

Output:

```text
need_profile
```

No LLM is required to generate the authoritative need profile.

---

# 19. Initial Need Rules

The following are the proposed prototype rules.

These are implementation decisions, not clinical guidelines.

## Cardiac

```json
{
  "specialists_needed": ["cardiologist"],
  "capability_flags": ["ecg", "icu"],
  "blood_type_needed": null
}
```

## Trauma

```json
{
  "specialists_needed": [],
  "capability_flags": ["trauma_team", "icu"],
  "blood_type_needed": "O-"
}
```

## Obstetric

```json
{
  "specialists_needed": ["obgyn"],
  "capability_flags": ["maternity"],
  "blood_type_needed": null
}
```

## Pediatric

```json
{
  "specialists_needed": ["pediatrician"],
  "capability_flags": ["pediatric_emergency"],
  "blood_type_needed": null
}
```

These profiles exist for deterministic demonstration of the capability-matching mechanism. They must not be presented as medical diagnostic standards.

---

# 20. Severity Rules

Allowed:

```text
red
yellow
green
```

The prototype interprets them only as urgency tags.

The system MUST NOT claim to diagnose a disease or determine a clinically authoritative triage category.

The frontend should label severity as:

```text
Prototype urgency
```

or otherwise make the decision-support nature clear.

---

# 21. Hard Capability Eligibility

To prevent obviously incompatible routing, a candidate may be marked ineligible before scoring.

Proposed MVP rule:

```text
If a required specialist is absent:
    candidate ineligible.

If a required capability flag is absent:
    candidate ineligible.

If blood is required and stock == 0:
    candidate ineligible.

If ICU is required and icu_beds_free <= active committed ICU holds:
    candidate ineligible.

If ventilator is required and ventilators_free <= active committed ventilator holds:
    candidate ineligible.
```

This creates:

```text
eligibility gate
      ↓
scoring
```

rather than allowing a hospital with zero ability to treat the case to rank highly due to distance alone.

---

# 22. Capability Match Percentage

The PRD requires a capability-match percentage.

The exact formula was not specified, so this implementation defines:

### Requirement groups

```text
specialists
capability_flags
blood
```

### Group weights

```text
specialists = 40%
capability flags = 40%
blood = 20%
```

A group that has no requirement is removed from the denominator and the remaining weights are normalized.

Example:

```text
Case requires:
1 specialist
2 capabilities
no blood

Applicable group weights:
specialists = 40
capabilities = 40

Normalized:
specialists = 50
capabilities = 50
```

---

# 23. Capability Matching Within a Group

For each applicable group:

```text
matched requirements
-------------------- × 100
total requirements
```

Example:

```text
Required specialists:
cardiologist
neurologist

Hospital has:
cardiologist

Specialist match:
1 / 2 = 50%
```

The group contribution is then multiplied by the normalized group weight.

---

# 24. Capability Percentage Example

Case:

```text
specialists:
cardiologist

flags:
ecg
icu

blood:
none
```

Weights after normalization:

```text
specialist = 50%
flags = 50%
```

Hospital:

```text
cardiologist = yes
ecg = yes
icu = yes
```

Result:

```text
specialist = 100%
flags = 100%

capability_match_pct = 100%
```

If:

```text
cardiologist = yes
ecg = yes
icu = no
```

then:

```text
specialist = 100%
flags = 50%

capability_match_pct = 75%
```

Because ICU is required by the need profile, the candidate would still normally fail the hard-capability eligibility gate rather than merely receiving a lower score.

This protects the semantic difference between:

```text
partially matched
```

and:

```text
cannot actually satisfy the case
```

---

# 25. Distance Calculation

The baseline uses Haversine distance.

Inputs:

```text
ambulance latitude
ambulance longitude
hospital latitude
hospital longitude
```

Formula:

```text
a =
  sin²(Δlat/2)
  +
  cos(lat1) × cos(lat2) × sin²(Δlng/2)

c = 2 × atan2(√a, √(1-a))

distance_km = R × c
```

where:

```text
R = 6371 km
```

The exact code should use radians.

---

# 26. Distance Factor

Implementation default:

```text
distance_factor = max(
    0.35,
    1 / (1 + distance_km / 5)
)
```

Properties:

```text
0 km    → 1.00
5 km    → 0.50
10 km   → 0.333 → clamped to 0.35
```

The clamp prevents extremely distant hospitals from being assigned an almost-zero score solely because of distance.

The factor is intentionally non-linear.

---

# 27. ER Load Factor

The hospital's `er_load_score` ranges:

```text
1–5
```

The implementation default:

```text
load_factor =
    1.00 for load 1
    0.88 for load 2
    0.76 for load 3
    0.64 for load 4
    0.52 for load 5
```

Equivalent formula:

```text
load_factor = 1 - 0.12 × (er_load_score - 1)
```

This is bounded by the valid 1–5 input range.

---

# 28. Freshness Factor

Hospital freshness is derived from:

```text
current_server_time - last_updated_at
```

Implementation default:

```text
0–10 minutes:
    fresh

>10–30 minutes:
    stale

>30 minutes:
    unknown
```

Factors:

```text
fresh   = 1.00
stale   = 0.85
unknown = 0.70
```

These values are prototype tuning parameters and must remain in configuration.

---

# 29. Final Match Score

Canonical formula:

```text
final_score =
    capability_factor
    × distance_factor
    × load_factor
    × freshness_factor
    × 100
```

where:

```text
capability_factor =
    capability_match_pct / 100
```

Example:

```text
capability_match = 100%
distance_factor   = 0.70
load_factor       = 0.88
freshness         = 1.00

final_score =
    1.00 × 0.70 × 0.88 × 1.00 × 100
  = 61.6
```

---

# 30. Score Range

Expected:

```text
0 ≤ final_score ≤ 100
```

The system should round for UI display:

```text
61.6
```

but preserve adequate precision internally for deterministic comparisons.

Recommended:

```text
round to 2 decimal places
```

---

# 31. Candidate Ranking

Algorithm:

```text
1. Load hospitals.
2. Load current committed resources.
3. Derive freshness.
4. Apply eligibility gate.
5. Calculate capability match.
6. Calculate distance.
7. Calculate distance factor.
8. Calculate load factor.
9. Calculate freshness factor.
10. Calculate final score.
11. Sort descending by final score.
12. Apply deterministic tie-breakers.
```

---

# 32. Ranking Tie-Breakers

If final scores are equal after rounding:

```text
1. higher capability_match_pct
2. fresher hospital data
3. lower distance_km
4. lower er_load_score
5. lexicographically smaller hospital_id
```

This ensures repeatability.

---

# 33. Candidate Exclusion

Exclude a hospital when:

```text
required specialist unavailable
required capability unavailable
required blood stock is zero
required countable resource unavailable
```

Also exclude:

```text
hospital already attempted for this case
```

during reroute.

A hospital may be excluded for temporary state rather than permanently removed from the system.

---

# 34. Reroute Ranking

On reject or timeout:

```text
DO NOT blindly reuse the original ranking.
```

Instead:

```text
reload current hospital states
exclude attempted hospitals
recalculate ranking
send to next best valid candidate
```

This matters because:

```text
Hospital B may have changed capacity
```

while the first request was pending.

It also makes mid-transit rerouting more realistic.

---

# 35. Active Attempt History

The backend should determine attempted hospitals from request history.

Example:

```text
requests for case_001:

request_001 → H1 → timed_out
request_002 → H3 → rejected
request_003 → H4 → pending
```

Candidate exclusion:

```text
H1 excluded
H3 excluded
H4 active
```

The backend must not accidentally create a duplicate new request for an already attempted hospital unless a deliberate policy later permits retries.

---

# 36. Request Creation Invariant

The match operation must not create multiple active requests for one case unintentionally.

Invariant:

```text
one CASE
    ↓
at most one active PENDING request
```

Mass casualty is an exception because:

```text
one incident
    ↓
multiple independent cases
    ↓
one active request per case
```

---

# 37. Resource Model

The prototype has countable resources:

```text
ICU beds
ventilators
blood units
```

and non-counted boolean capabilities:

```text
trauma_team_on_shift
```

plus specialist availability:

```text
specialists_on_call[]
```

---

# 38. Resource Hold Strategy

The implementation should use:

```text
Firestore transaction
+
hospital resource update
+
hold/audit record
```

For countable resources:

```text
available count decreases on accepted commitment
```

For example:

```text
icu_beds_free = 4
```

becomes:

```text
icu_beds_free = 3
```

after a transactionally successful ICU commitment.

---

# 39. Resource Hold Record

To preserve accountability without overloading the hospital document, use an implementation-level subcollection:

```text
/hospitals/{hospitalId}/holds/{requestId}
```

Proposed structure:

```json
{
  "request_id": "request_003",
  "case_id": "case_001",
  "created_at": "Firestore Timestamp",
  "status": "active",

  "resources": {
    "icu": 1,
    "ventilator": 0,
    "blood": {}
  }
}
```

This is an implementation extension to the initial data-model document and must be reflected in its next revision before implementation.

---

# 40. Resource Hold States

Recommended:

```text
active
released
consumed
```

### `active`

Resource is currently committed to an accepted case.

### `released`

The commitment ended before final consumption, for example because the case was rerouted.

### `consumed`

Prototype bookkeeping state indicating the commitment was honored/closed.

---

# 41. Acceptance Transaction

Conceptual transaction:

```text
BEGIN

READ case
READ request
READ hospital

VERIFY request.status == pending
VERIFY case not already accepted
VERIFY request not expired
VERIFY hospital still eligible
VERIFY countable resources available

UPDATE hospital counts
CREATE hold document
UPDATE request → accepted
UPDATE case → accepted
WRITE audit event(s)

COMMIT
```

The transaction must fail atomically if any required invariant is violated.

---

# 42. Double-Accept Scenario

Example:

```text
ICU free = 1

Request A → Hospital clicks Accept
Request B → Hospital clicks Accept almost simultaneously
```

Exactly one acceptance can consume the single slot.

Expected:

```text
A → accepted
B → concurrency conflict OR resource unavailable
```

Never:

```text
A → accepted
B → accepted
ICU free → 0
```

while both cases believe they own the same one slot.

---

# 43. Blood Stock Reservation

If a case requires blood:

```text
blood_stock[bloodType]
```

must be verified transactionally.

Example:

```text
O- stock = 3
case requires 1 O-
```

after accepted hold:

```text
O- stock = 2
```

The prototype should use one unit per blood requirement unless the specific demo rules state otherwise.

This is an implementation simplification for the prototype and not a clinical transfusion protocol.

---

# 44. Boolean Capability Handling

`trauma_team_on_shift` remains a boolean capability field.

For the MVP:

```text
true = eligible
false = ineligible
```

The prototype does not attempt to model a full staff-capacity scheduling system.

Concurrency demonstrations should focus on countable resources such as ICU slots.

This limitation should be explained honestly during technical Q&A.

---

# 45. Specialist Availability

Specialists are modeled as available/not available by membership in:

```text
specialists_on_call[]
```

The prototype does not model:

```text
number of simultaneous specialist cases
exact duty-roster times
consultation duration
specialist burnout/load
```

These are beyond the locked scope.

---

# 46. Acceptance and Human Confirmation

Every match result shown to the ambulance UI MUST clearly communicate:

```text
Recommended — human confirmation required
```

The system does not claim:

```text
The patient must go to Hospital X
```

It communicates:

```text
Hospital X is the current system recommendation.
Hospital staff must explicitly accept the request.
```

The hospital's human acceptance is the commitment point.

---

# 47. AI Boundary

AI is NOT allowed to:

```text
choose the hospital
change the final score
change hospital capability data
declare a diagnosis
override human acceptance
decide whether a request timed out
```

AI MAY:

```text
phrase a structured explanation
summarize non-authoritative data
assist documentation
```

---

# 48. AI Explanation Inputs

Allowed input:

```json
{
  "hospital_name": "Hospital C",
  "capability_match_pct": 100,
  "distance_km": 4.2,
  "er_load_score": 2,
  "freshness_status": "fresh",
  "matched_capabilities": [
    "cardiologist",
    "ecg",
    "icu"
  ]
}
```

---

# 49. AI Explanation Constraints

The AI prompt must explicitly instruct:

```text
Use only supplied facts.
Do not invent capabilities.
Do not invent patient conditions.
Do not change scores.
Do not produce clinical advice.
Return a concise explanation.
```

---

# 50. AI Failure Behavior

If the AI provider fails:

```text
routing continues
```

Fallback:

```text
deterministic explanation template
```

Example:

```text
Hospital C — 100% capability match, approximately 4.2 km away,
ER load 2/5, status updated recently.
```

Therefore:

```text
AI outage
≠
routing outage
```

---

# 51. AI Provider Configuration

Provider must remain abstracted behind:

```text
ExplanationProvider
```

Possible interface:

```text
generateMatchExplanation(matchFacts) -> string
```

The implementation may use an LLM provider through an environment variable.

Example:

```text
AI_PROVIDER=
AI_API_KEY=
```

No API key is committed to GitHub.

If the AI provider requires a network dependency that proves unreliable during the hackathon, disable AI without affecting routing.

---

# 52. Mid-Transit Reroute Trigger

The PRD requires a scenario where a hospital becomes unable to receive the patient after acceptance.

Prototype trigger:

```text
Hospital changes a critical required capability
from available → unavailable
```

while:

```text
case.status == accepted
```

Example:

```text
trauma_team_on_shift: true → false
```

for a case that requires trauma capability.

---

# 53. Mid-Transit Reroute Behavior

When an active commitment becomes invalid:

```text
1. Detect affected accepted case.
2. Mark current accepted request as superseded.
3. Release its active resource holds where appropriate.
4. Return case to routing state.
5. Recalculate candidate ranking.
6. Exclude previous hospital for the immediate reroute.
7. Create a new request.
8. Write audit entries.
9. Notify ambulance UI via Firestore.
```

The hospital does not get to silently erase an accepted commitment.

---

# 54. Mid-Transit UI

Ambulance UI should show something like:

```text
ROUTE UPDATE

Hospital A is no longer able to receive this case.

Reason:
Required trauma capability became unavailable.

Automatically searching for the next viable hospital...
```

Then:

```text
Rerouted to Hospital C
```

The user should not need to restart the case.

---

# 55. Audit Event Specification

Minimum event set:

```text
CASE_CREATED
NEED_PROFILE_GENERATED
MATCH_COMPUTED
REQUEST_CREATED
REQUEST_SENT
REQUEST_ACCEPTED
REQUEST_REJECTED
REQUEST_TIMED_OUT
REROUTE_TRIGGERED
REQUEST_SUPERSEDED
RESOURCE_HELD
RESOURCE_RELEASED
HOSPITAL_STATUS_UPDATED
```

Optional:

```text
CASE_ACCEPTED
CASE_EXHAUSTED
AI_EXPLANATION_GENERATED
AI_EXPLANATION_FALLBACK
```

---

# 56. Audit Event Payload

Every audit event should contain:

```text
id
timestamp
event_type
case_id
request_id if applicable
hospital_id if applicable
actor_type
actor_id
snapshot
```

---

# 57. Audit Snapshot Requirements

At minimum, the snapshot for a routing decision should capture:

```text
case category
severity
need profile
ambulance location
hospital capability state
hospital freshness
distance
load
match score
```

For acceptance:

```text
request status before transition
request status after transition
resources affected
```

---

# 58. Audit Immutability

Application code must treat audit logs as append-only.

MUST NOT:

```text
rewrite old audit records
delete old audit records
change historical score
```

MAY:

```text
append a correction event
```

---

# 59. Reliability Calculation

The PRD defines reliability around:

```text
accepted-and-honored commitments
/
total accepted commitments
```

Prototype implementation:

```text
reliability_score =
honored_commitments / accepted_commitments
```

Range:

```text
0.0–1.0
```

Display:

```text
0–100%
```

---

# 60. Reliability for New Hospitals

If:

```text
accepted_commitments == 0
```

the system should not falsely display a mature historical score.

Recommended behavior:

```text
numeric score = null
display = "No history"
```

This requires making the field nullable in the next data-model revision.

For the hackathon demo, all visible seeded hospitals should have seeded reliability history so that the accountability dashboard has meaningful data.

---

# 61. Reliability Seed History

Seed history may conceptually include:

```text
accepted commitments
honored commitments
average response time
```

Example:

```text
Hospital C:
accepted = 50
honored = 47
reliability = 94%
```

The history can be represented through seeded request/audit data or precomputed demonstration values.

The source of truth should remain consistent with the implementation.

---

# 62. Reliability Update Timing

For the MVP, reliability is updated when the case reaches a defined commitment outcome.

Recommended demo lifecycle:

```text
accepted
   ↓
commitment considered honored when the acceptance remains valid
and the case completes the simulated handoff/arrival milestone
```

Because there is no external hospital admission feed, the "honored" event is simulated by a controlled demo action or deterministic local completion step.

This must be labeled as simulation in the UI/documentation.

---

# 63. Mass-Casualty Distribution

## 63.1 Objective

For an incident group:

```text
N cases
M hospitals
```

assign each case to a hospital that can satisfy its needs while avoiding unnecessary concentration.

The PRD specifically requires joint distribution rather than independently routing every patient to the same top hospital.

---

# 64. Mass-Casualty Candidate Set

For each case:

```text
calculate normal ranked candidates
```

Keep:

```text
top K = 5
```

or all eligible candidates when fewer than 5 exist.

This bounds the search space.

---

# 65. Mass-Casualty Priority Ordering

Cases are processed for assignment in this deterministic order:

```text
1. red severity before yellow before green
2. greater number of required capabilities first
3. case_id ascending as tie-breaker
```

This gives more constrained cases priority.

---

# 66. Mass-Casualty Joint Search

Because the demo is limited to a small number of cases, the implementation may use bounded backtracking.

Concept:

```text
For every case:
    generate top candidate hospitals

Explore feasible assignments.

Reject assignment if:
    hard capability missing
    resource capacity violated

Score assignment:
    sum(individual hospital scores)
    minus concentration penalty

Choose highest valid group score.
```

This is computationally trivial for the hackathon-sized dataset.

---

# 67. Concentration Penalty

Implementation default:

```text
0 penalty for first patient at a hospital
8 points penalty for each additional patient
```

Example:

```text
Hospital A receives:
patient 1 → no penalty
patient 2 → -8
patient 3 → -16
```

The penalty encourages distribution without making distribution absolute.

If one hospital is the only feasible destination, feasibility takes precedence.

This is an implementation tuning parameter.

---

# 68. Mass-Casualty Feasibility

A candidate assignment is invalid when it would cause:

```text
ICU count < 0
ventilator count < 0
blood stock < 0
```

or otherwise violate hard capability availability.

The assignment algorithm simulates resource consumption before committing final requests.

---

# 69. Mass-Casualty Output

The API must return:

```text
incident_group_id
case_id
assigned hospital_id
individual score
```

and a collection of requests created.

The ambulance UI should render the distribution.

---

# 70. Mass-Casualty Commit

After a distribution plan is computed:

```text
verify current resources again
```

before committing individual requests.

This prevents:

```text
planned assignment
```

from becoming:

```text
stale assignment
```

because another request changed capacity during planning.

If the commit fails:

```text
retry/recompute once
```

then display a controlled failure.

---

# 71. Stale Data

Hospital freshness is based on:

```text
last_updated_at
```

No client-provided "is_stale" flag is authoritative.

---

# 72. Freshness Thresholds

Implementation defaults:

```text
Fresh:
age <= 10 min

Stale:
10 min < age <= 30 min

Unknown:
age > 30 min
```

These thresholds are configuration values.

---

# 73. Stale Ranking

Freshness factors:

```text
fresh   = 1.00
stale   = 0.85
unknown = 0.70
```

The purpose is:

```text
don't trust old data equally
```

not:

```text
automatically eliminate every stale hospital
```

unless a hard capability check also fails.

---

# 74. Stale UI

Hospital card:

```text
Status: FRESH
Updated: 2 min ago
```

or:

```text
Status: STALE
Updated: 18 min ago
```

or:

```text
Status: UNKNOWN
Updated: 47 min ago
```

The UI should avoid styling stale data as equivalent to fresh data.

---

# 75. Human-Confirmation Framing

All ambulance match results must include:

```text
System recommendation
Human confirmation required
```

All hospital acceptance controls should make clear that:

```text
Accept = hospital is committing to this request
```

This is the prototype's human-override/liability boundary.

The formal legal/liability framework remains roadmap scope.

---

# 76. Hospital Capability Editing

A hospital operator may change:

```text
trauma_team_on_shift
specialists_on_call
icu_beds_free
ventilators_free
blood_stock
er_load_score
accepts_scheme_patients
```

The backend automatically sets:

```text
last_updated_at = server timestamp
```

---

# 77. Capability Update Validation

Reject:

```text
negative ICU count
negative ventilator count
negative blood count
ER load < 1
ER load > 5
unknown severity enum
```

Normalize specialist names through controlled values.

---

# 78. Accepted-Case Resource Protection

Hospital staff must not be allowed to manually edit an active resource count into an impossible state without a server-side consistency policy.

Example:

```text
ICU free = 2
1 active committed hold
```

Operator attempts:

```text
set ICU free = 0
```

This may be allowed as a reported operational update if it reflects reality, but the backend must account for active commitments when evaluating future requests.

The implementation should never allow:

```text
negative effective available capacity
```

---

# 79. Effective Capacity

For countable resources:

```text
effective_available =
reported_available
```

only if the hospital's reported number already includes current commitments.

The system must avoid double-subtracting.

To simplify the prototype:

> The hospital's `icu_beds_free`, `ventilators_free`, and blood stock fields are treated as the current uncommitted available counts.

When the system accepts a case:

```text
the backend decrements the current free count
```

Therefore hospital staff should edit the resulting current value rather than the pre-commit historical value.

---

# 80. Double-Decrement Prevention

A request can only consume a resource if its acceptance transaction changes:

```text
pending → accepted
```

Once that transition has committed:

```text
a repeated accept
```

must not perform another resource decrement.

---

# 81. Release on Reroute

If an accepted commitment becomes invalid before completion:

```text
release active hold
```

and restore the count exactly once if the system previously decremented it.

Example:

```text
ICU free:
4 → 3 after acceptance

Mid-transit invalidation:
3 → 4 after hold release
```

Then the new hospital is processed.

---

# 82. Resource Ledger Invariant

For each countable resource:

```text
0 <= available_count <= seeded/operational maximum
```

where a maximum may be omitted if not needed by the prototype.

The system must never write:

```text
-1
```

or otherwise produce physically impossible negative availability.

---

# 83. Demo Authentication

Because the PRD permits seeded login without full production authentication, the prototype uses a controlled demo identity model.

Recommended visible roles:

```text
AMBULANCE_DEMO
HOSPITAL_DEMO
ADMIN_DEMO
```

Hospital users identify a seeded hospital.

Production-grade IAM is not part of the hackathon scope.

If Firebase Authentication is implemented, use it to bind these identities to actual user accounts.

If not, the backend must still validate actor/hospital relationships using a server-side controlled mapping.

The team must not describe demo identity as production authentication.

---

# 84. Authorization Intent

Allowed operations:

### Ambulance

```text
create case
request match
view own case/request state
```

### Hospital

```text
view requests addressed to own hospital
accept/reject own requests
update own hospital capabilities
```

### Admin

```text
view hospital network
view request history
view audit logs
view reliability metrics
```

---

# 85. Secret Handling

Required files:

```text
.env
.env.example
```

`.env`:

```text
NEVER COMMITTED
```

`.env.example`:

```text
MAY BE COMMITTED
```

Required Git ignore entries:

```text
.env
.env.*
!.env.example
```

The exact ignore syntax must be verified so the example file remains trackable.

---

# 86. No Secret in Client Bundle

If a key is genuinely secret, it must never be exposed through:

```text
VITE_*
```

environment variables.

Frontend environment variables are bundled into client code.

Public map/tile configuration may be treated as public configuration only when the provider's terms allow it.

---

# 87. Map Specification

Preferred map stack:

```text
Leaflet
react-leaflet
OpenStreetMap-compatible tiles
```

Use markers for:

```text
ambulance
hospital locations
```

Hospital marker state:

```text
fresh
stale
unknown
```

The map is a visualization layer.

Routing distance calculation does not depend on road-network routing.

---

# 88. ETA Specification

The canonical ranking input is:

```text
distance_km
```

A simple ETA estimate may be:

```text
eta_minutes =
    (distance_km / DEMO_AVERAGE_SPEED_KMPH) × 60
```

Implementation default:

```text
DEMO_AVERAGE_SPEED_KMPH = 40
```

The value must be clearly treated as an estimate.

This is not a real emergency navigation ETA.

---

# 89. Browser Geolocation

Ambulance screen may request:

```text
navigator.geolocation
```

Behavior:

```text
permission granted
    ↓
use actual position

permission denied/unavailable
    ↓
use demo fallback coordinate
```

The UI must indicate:

```text
Live location
```

or:

```text
Demo location
```

accordingly.

---

# 90. Demo Fallback Coordinates

The team should seed one fixed ambulance origin in the same city as the fictional hospitals.

The exact coordinates belong in `plans.md`/seed configuration and must be documented.

Do not depend on the judges' physical location for the deterministic demo.

---

# 91. API Implementation

Use the logical contracts defined in `api-contract.md`.

Minimum operations:

```text
create case
get case
match case
match incident
update hospital
accept request
reject request
timeout request
get case requests
get audit
get reliability
optional AI explanation
```

---

# 92. Backend Layering

Recommended backend structure:

```text
API handlers
    ↓
application services
    ↓
domain functions
    ↓
Firestore repository helpers
```

Example:

```text
acceptRequestHandler()
      ↓
acceptRequestService()
      ↓
validateAcceptance()
      ↓
runAcceptanceTransaction()
      ↓
writeAudit()
```

Avoid putting scoring/routing math directly inside HTTP handlers.

---

# 93. Domain Layer

Pure functions should include:

```text
generateNeedProfile
calculateHaversineDistance
calculateCapabilityMatch
calculateDistanceFactor
calculateLoadFactor
calculateFreshnessFactor
calculateFinalScore
rankHospitals
buildDistributionPlan
```

These should be testable without Firebase whenever possible.

---

# 94. Realtime Layer

Firebase listeners belong to frontend hooks/services.

Examples:

```text
useCase()
useCaseRequests()
useHospitalRequests()
useHospital()
useAuditEvents()
```

The hooks should map Firestore documents into typed frontend models.

---

# 95. Type Sharing

Recommended:

```text
shared type definitions
```

may live in:

```text
functions/src/types
```

and be exported into the frontend through a simple shared package/path.

Do not duplicate the same interface manually in five different files.

If shared package tooling becomes a build-time burden, copy a small stable set of types intentionally and document the duplication rather than blocking the MVP.

---

# 96. Frontend State Management

A large application-wide state library is unnecessary.

Recommended:

```text
React state
+ Firestore subscription hooks
+ small service layer
```

Use a dedicated state manager only if realtime synchronization proves difficult without one.

Do not introduce Redux/Zustand/etc. merely for form state.

---

# 97. UI Data Ownership

Components receive data.

Service/hooks own retrieval.

Backend owns business truth.

Example:

```text
HospitalRequestCard
     ↓
request object
```

rather than:

```text
HospitalRequestCard
     ↓
Firestore query
     ↓
transaction
```

---

# 98. Loading and Connection States

Every major realtime screen MUST account for:

```text
loading
connected
reconnecting
error
```

The hospital screen should not falsely imply live synchronization if the connection is lost.

---

# 99. Request Countdown UI

Display:

```text
00:30
00:29
...
00:01
```

When zero is reached:

```text
Waiting for server confirmation...
```

not immediately:

```text
TIMEOUT
```

The server-authoritative request status determines the actual state.

---

# 100. Accept Button Behavior

On click:

```text
disable Accept/Reject
show submitting state
send accept command
```

On success:

```text
show accepted
```

On conflict:

```text
show that another state won
```

Do not optimistically display the acceptance before backend confirmation.

---

# 101. Reject Button Behavior

On click:

```text
disable buttons
send reject command
```

Once committed:

```text
request becomes rejected
reroute begins
```

The frontend should not independently select the next hospital.

---

# 102. Timeout Worker

The timeout implementation can be:

```text
backend scheduler
```

or:

```text
trusted client-triggered timeout command validated by server time
```

For the hackathon, a simple backend callable/endpoint triggered by the active client plus server-time validation is acceptable.

The exact implementation should prefer reliability and simplicity over elaborate infrastructure.

---

# 103. Timeout Safety

A timeout command:

```text
MUST read expires_at
MUST read current server time
```

If:

```text
now < expires_at
```

return an expiration-related error.

If:

```text
now >= expires_at
```

transition:

```text
pending → timed_out
```

and trigger reroute.

---

# 104. Reject/Timeout Race

If reject and timeout happen simultaneously:

```text
only one terminal transition wins
```

The transaction must re-read request state.

The losing operation sees:

```text
request.status != pending
```

and must not create another reroute.

---

# 105. Accept/Timeout Race

Same rule:

```text
only one authoritative transition wins
```

If timeout commits first:

```text
accept must fail.
```

If acceptance commits first:

```text
timeout must fail.
```

No UI-side clock can override this.

---

# 106. Reroute Creation Race

After a terminal request transition:

```text
verify no active request already exists
```

before creating the next request.

This prevents duplicate reroute requests during simultaneous backend triggers.

---

# 107. Idempotency

Mutation endpoints must tolerate duplicate user actions.

Examples:

```text
double click Accept
double click Reject
retry after network uncertainty
```

The backend should return a clear state-aware result instead of performing the mutation twice.

---

# 108. Network Uncertainty

Potential case:

```text
hospital clicks Accept
network drops
frontend does not know whether it succeeded
```

The frontend should:

```text
retry carefully
then subscribe to the request
```

It must not blindly assume failure and submit a second independent request.

---

# 109. Firestore Transaction Scope

Acceptance transaction should include:

```text
case
request
hospital
hold
```

where needed.

The transaction should perform:

```text
read required documents
validate
write required documents
```

in one atomic commit.

---

# 110. Firestore Batch vs Transaction

Use:

```text
transaction
```

when current values affect the validity of the write.

Use:

```text
batch write
```

when values are independent and no read-before-write invariant must be enforced.

Examples:

```text
Accept request → transaction
```

```text
Multiple audit event writes → batch may be acceptable
```

provided the transaction semantics remain correct for the authoritative state transition.

---

# 111. Firestore Query Constraints

Keep queries small because the dataset is tiny.

Target:

```text
6–10 hospitals
```

This is intentional.

Do not build pagination-heavy architecture for a dataset smaller than a single screen.

---

# 112. Index Requirements

Likely indexes:

```text
requests:
hospital_id + status + sent_at

requests:
case_id + sent_at

cases:
incident_group_id

audit_logs:
case_id + timestamp

audit_logs:
hospital_id + timestamp
```

Final index file must be generated/verified against actual queries.

Do not create unnecessary indexes before implementation.

---

# 113. Firestore Security Rules

Security rules should protect obvious direct writes.

Preferred pattern:

```text
clients can read relevant public/demo data
privileged state transitions go through controlled backend functions
```

The backend remains authoritative for:

```text
accept
reject
timeout
reroute
resource decrement
reliability update
audit write
```

Do not rely entirely on the browser to enforce business rules.

---

# 114. Demo Environment Separation

There should be:

```text
local development
hackathon demo/deployment
```

at minimum.

Environment variables should identify Firebase project configuration.

The demo project should contain only:

```text
synthetic hospital data
synthetic patient/case data
demo users/actors
```

No actual patient data.

---

# 115. Synthetic Data Policy

All demonstration patients should be fictitious.

Examples:

```text
Patient A
Patient B
```

rather than real individuals.

Do not upload:

```text
real patient records
real medical reports
real identifiable health information
```

---

# 116. Demo Hospital Data

Recommended seed:

```text
8 hospitals
```

with deliberately different capabilities.

Example conceptual matrix:

| Hospital | Cardiac | Trauma | Obstetric | Pediatric | ICU | Ventilator | Load | Freshness |
|---|---|---|---|---|---:|---:|---:|---|
| H1 | strong | weak | medium | weak | high | medium | 2 | fresh |
| H2 | weak | strong | weak | medium | medium | high | 3 | fresh |
| H3 | medium | weak | strong | medium | medium | low | 2 | fresh |
| H4 | weak | medium | weak | strong | low | medium | 2 | fresh |
| H5 | balanced | balanced | balanced | balanced | high | high | 4 | fresh |
| H6 | cardiac strong | trauma strong | weak | weak | medium | medium | 1 | fresh |
| H7 | close distance | limited capability | limited | limited | low | low | 5 | fresh |
| H8 | suitable capabilities | suitable | suitable | suitable | medium | medium | 2 | stale |
```

The exact numeric seed values should be designed to force the intended demo outcomes.

---

# 117. Seed Data Must Be Deterministic

The live demo must not depend on random hospital states.

Seed:

```text
known capabilities
known coordinates
known reliability
known timestamps
```

for repeatable scenarios.

---

# 118. Scenario A Specification

## Goal

Show clean capability matching and commitment.

### Setup

```text
cardiac case
red severity
ambulance demo location
H3/H5/etc. suitable candidates
```

### Expected sequence

```text
Case created
Need profile generated
Hospitals scored
Top hospital selected
Request sent
Hospital screen receives request in realtime
Countdown starts
Hospital accepts
ICU/resource commit occurs
Ambulance receives accepted state
Reason displayed
Audit written
```

### Acceptance criteria

```text
No manual refresh
No fake UI state
No duplicate request
Correct hospital visible
Reason matches underlying data
Resource count updates
Audit contains the transition
```

---

# 119. Scenario B Specification

## Goal

Demonstrate the defining commitment/reroute mechanism.

### Setup

Top hospital will:

```text
reject
```

or:

```text
not respond
```

### Expected

```text
request 1 → rejected/timed_out
     ↓
reroute triggered
     ↓
request 2 created
     ↓
hospital 2 receives request
```

### Acceptance criteria

```text
ambulance does not restart
previous request remains in history
next hospital is recalculated
request 2 has incremented attempt number
audit contains rejection/timeout + reroute
```

---

# 120. Scenario C Specification

## Goal

Demonstrate joint mass-casualty distribution.

### Setup

```text
incident_group_id = incident_demo_01

case 1 = red cardiac
case 2 = red trauma
case 3 = yellow obstetric
case 4 = yellow pediatric
```

### Expected

Assignments span multiple hospitals based on capabilities and capacity.

The exact hospital IDs are controlled by seeded data.

### Acceptance criteria

```text
all four cases are represented
each gets one intended destination
hospital capacity constraints respected
assignment is not four independent copies of the same selection
distribution is explainable
```

---

# 121. Scenario D Specification

## Goal

Demonstrate stale-data handling.

### Setup

One hospital:

```text
last_updated_at > 30 min old
```

### Expected

```text
freshness = unknown
freshness factor = 0.70
UI visibly marks data as stale/unknown
```

### Acceptance criteria

The system does not silently present stale data as current.

---

# 122. Scenario E Specification

## Goal

Demonstrate accountability.

### Setup

Use a completed Scenario B or A.

### Expected admin screen

```text
Case
 ↓
Match
 ↓
Request sent
 ↓
Reject/timeout
 ↓
Reroute
 ↓
Acceptance
 ↓
Resource hold
```

with timestamps and relevant snapshots.

---

# 123. Demo Device Specification

Recommended:

```text
Device 1:
phone
ambulance

Device 2:
laptop/tablet
hospital

Device 3:
laptop/tablet
admin
```

If Device 3 is unavailable:

```text
admin screen as tab on Device 2
```

The PRD explicitly identifies a third-device decision as an open team item.

---

# 124. Demo Network Strategy

Primary:

```text
venue Wi-Fi
```

Backup:

```text
phone hotspot
```

The team must test:

```text
phone ↔ Firestore
laptop ↔ Firestore
admin ↔ Firestore
```

before the demonstration.

---

# 125. Demo Failure Fallbacks

### AI unavailable

```text
deterministic explanation
```

### Map tile unavailable

```text
hospital cards + coordinate markers/fallback visualization
```

### Third screen unavailable

```text
admin tab
```

### Venue Wi-Fi unstable

```text
phone hotspot
```

### Browser GPS denied

```text
demo coordinate
```

---

# 126. UI Functional Requirement

The hackathon requires a working, user-accessible interface.

Therefore:

```text
no terminal-only demonstration
no backend-only submission
no slide-only simulation
```

Core workflows must be visually accessible.

---

# 127. UI Accessibility Requirements

Minimum:

```text
large touch targets
high-contrast status labels
clear countdown
clear Accept/Reject actions
responsive layout
readable typography
```

Hospital accept/reject buttons should be large enough for a projected demo.

---

# 128. Color Semantics

Do not rely only on color.

Examples:

```text
Accepted
Rejected
Timed out
Stale
Unknown
Pending
```

should always have text labels/icons in addition to color.

This improves accessibility and judge readability.

---

# 129. Ambulance Main Flow

```text
Home
 ↓
New Case
 ↓
Select Category
 ↓
Select Severity
 ↓
Review Need Profile
 ↓
Confirm Location
 ↓
Find Best Hospital
 ↓
Hospital Recommendation
 ↓
Pending Request
 ↓
Accepted OR Rerouted
 ↓
Structured Handoff
```

Mass-casualty is an alternate entry path from Home.

---

# 130. Hospital Main Flow

```text
Hospital Login/Select
 ↓
Dashboard
 ↓
Capability Status
 ↓
Incoming Request
 ↓
Review Need
 ↓
Countdown
 ↓
Accept OR Reject
 ↓
Outcome
```

---

# 131. Admin Main Flow

```text
Admin Dashboard
 ├── Network Map
 ├── Hospital Status
 ├── Reliability
 ├── Active Requests
 └── Audit Log
```

---

# 132. Structured Handoff Screen

After acceptance, hospital view should show:

```text
Case Category
Severity
Required Capabilities
Vitals Summary
Onset Time
Treatment Administered
Patient Basic Information
ETA
```

The purpose is to preserve the structured information already needed for matching.

---

# 133. "Why This Hospital" Panel

Minimum content:

```text
Recommended because:

✓ Cardiologist available
✓ ECG capability
✓ ICU available
✓ 4.2 km away
✓ ER load 2/5
✓ Data updated 2 min ago
```

The panel must derive statements from actual structured data.

---

# 134. Recommendation Language

Preferred:

```text
Current recommendation
```

Not:

```text
Guaranteed best hospital
```

because the system is a prototype decision-support tool.

---

# 135. Error UX

Errors should be contextual.

Example:

```text
No eligible hospital found.

The current hospital network does not show a facility
meeting all required capabilities.
```

Avoid:

```text
500 Internal Server Error
```

in the user-facing screen.

---

# 136. Empty States

Hospital:

```text
No pending requests.
```

Admin:

```text
No recent audit events.
```

Ambulance:

```text
No active case.
```

---

# 137. Accessibility for Medical Context

Use plain language where practical.

Example:

```text
ICU available
```

rather than obscure database field names:

```text
icu_beds_free > 0
```

The technical interface and human interface are different layers.

---

# 138. Testing Strategy

Testing has four layers:

```text
1. Unit tests
2. Backend integration tests
3. Realtime workflow tests
4. End-to-end demo tests
```

---

# 139. Unit Test Targets

Pure matching functions:

```text
need profile mapping
distance
capability match
distance factor
load factor
freshness factor
final score
ranking tie-breaker
mass-casualty scoring
```

---

# 140. Unit Test Examples

### Distance

```text
same coordinates → approximately 0 km
```

### Capability

```text
all requirements met → 100%
```

### Load

```text
load 1 → 1.00
load 5 → 0.52
```

### Freshness

```text
5 min → fresh
20 min → stale
45 min → unknown
```

### Score

Known inputs must produce deterministic output.

---

# 141. Backend Integration Tests

At minimum:

```text
create case
create request
accept request
reject request
timeout request
reroute
concurrency
resource decrement
resource release
audit
reliability
```

---

# 142. Concurrency Test

Test setup:

```text
ICU free = 1
two requests
same hospital
```

Parallel accept operations.

Expected:

```text
one success
one failure
final ICU count = 0
```

---

# 143. Acceptance Race Test

Execute:

```text
accept
timeout
```

nearly simultaneously.

Expected:

```text
exactly one terminal transition
exactly one valid routing continuation
```

---

# 144. Reject Race Test

Execute:

```text
reject
timeout
```

nearly simultaneously.

Expected:

```text
exactly one transition
```

No duplicate reroute.

---

# 145. Realtime Integration Test

Use:

```text
ambulance client
hospital client
```

connected to the same backend.

Action:

```text
ambulance creates request
```

Expected:

```text
hospital screen updates without refresh
```

Then:

```text
hospital accepts
```

Expected:

```text
ambulance screen updates without refresh
```

---

# 146. Mass-Casualty Test

Input:

```text
4 cases
```

Expected:

```text
4 assignments
resource constraints respected
```

Additional assertion:

```text
distribution must differ from naive independent top-1 selection
```

when the seeded scenario is designed to make that distinction possible.

---

# 147. Stale-Data Test

Given:

```text
last_updated_at = now - 45 minutes
```

Expected:

```text
freshness.status = unknown
freshness_factor = 0.70
```

---

# 148. Audit Test

Every authoritative transition should produce the expected audit record.

Example:

```text
REQUEST_SENT
REQUEST_ACCEPTED
RESOURCE_HELD
```

The audit snapshot must contain enough information to reconstruct the decision.

---

# 149. AI Fallback Test

Force the AI provider to fail.

Expected:

```text
match still succeeds
deterministic explanation returned
```

---

# 150. Frontend Testing Minimum

Verify:

```text
routing flow
request status changes
countdown
accept/reject
reroute
mass casualty display
stale badge
audit display
responsive layout
```

---

# 151. Type Safety

Use TypeScript types for:

```text
Hospital
Case
NeedProfile
Request
AuditLog
MatchResult
DistributionAssignment
ApiResponse
ApiError
```

Do not use:

```text
any
```

for core domain objects unless unavoidable.

---

# 152. Runtime Validation

TypeScript only protects compile-time assumptions.

Backend input must also be validated at runtime.

Validate:

```text
enums
numbers
ranges
required fields
IDs
timestamps
arrays
```

A runtime schema validator such as Zod is a reasonable implementation choice.

---

# 153. Logging

Development logs should include:

```text
request ID
case ID
hospital ID
operation
result
```

Never log:

```text
API keys
passwords
secrets
unnecessary patient-identifying details
```

---

# 154. Observability Minimum

For a hackathon prototype:

```text
structured console logs
Firebase logs
audit records
```

are sufficient.

A full monitoring platform is unnecessary.

---

# 155. Performance Target

The project is designed for approximately:

```text
6–10 hospitals
1–10 concurrent demo cases
```

The MVP does not target production-scale healthcare traffic.

Target:

```text
match computation < 500 ms locally/backend-side
normal Firestore round trip comfortably under a few seconds
realtime UI update without manual refresh
```

These are engineering targets, not contractual service-level guarantees.

---

# 156. Failure Handling

### No eligible hospital

```text
case routing = exhausted
```

### Firestore unavailable

```text
show connection/error state
do not fabricate acceptance
```

### AI unavailable

```text
fallback explanation
```

### Map unavailable

```text
continue matching using coordinates
```

### GPS unavailable

```text
demo coordinate
```

---

# 157. No Fabricated State

MUST NOT fabricate:

```text
accepted request
resource reservation
hospital capability
reliability event
audit entry
```

The demo may use seeded fictional data, but a state shown as "live" must come from the live prototype's state layer.

---

# 158. Demo Simulation Boundaries

Allowed simulation:

```text
fictional hospitals
fictional patients
simulated request countdown
simulated hospital capability update
simulated arrival/honored event
```

Not allowed to misrepresent:

```text
fake external medical records
real patient data
clinical validation
production hospital integrations
real emergency response guarantee
```

---

# 159. Documentation Requirements

README must contain:

```text
problem statement
proposed solution
features
technology stack
architecture
APIs
database
setup
environment
run commands
deployment
demo credentials if applicable
AI disclosure
third-party libraries
datasets
limitations
roadmap
```

This follows the hackathon's technical rules.

---

# 160. AI Disclosure

The presentation/documentation should disclose significant AI assistance.

The team must be able to explain:

```text
what AI generated
what the team changed
what the deterministic system actually does
```

Do not claim the LLM authored the routing logic as the product's intelligence layer.

---

# 161. Third-Party Disclosure

Document:

```text
Firebase
React
Vite
Tailwind
Leaflet
OpenStreetMap tiles
any LLM/API
any external package
```

plus licenses/terms where required.

---

# 162. External Data Policy

No external dataset is needed for core matching.

Hospital and patient data are synthetic demo data.

Distance is calculated from:

```text
coordinates
```

rather than a paid routing service.

---

# 163. Security Minimum

Before merge:

```text
no .env committed
no API keys
no Firebase service-account JSON
no access tokens
no passwords
no private keys
```

The technical rules explicitly prohibit secrets in source/GitHub.

---

# 164. Git Commit Rules

The hackathon requires meaningful development history.

Team target:

```text
at least one meaningful commit every 1–2 hours
```

and:

```text
at least 2 meaningful contributions per member
```

The practical target should be higher than the minimum so development history is naturally visible.

---

# 165. Branch Rules

Stable branch:

```text
main
```

Developer branches:

```text
backend-core
backend-realtime-ai
frontend
```

Major completed work is merged through pull requests.

---

# 166. Direct Main Push

During normal development:

```text
do not push directly to main
```

Exceptions may be made for emergency documentation-only changes if the team explicitly agrees, but feature work should use branches.

---

# 167. Main Branch Invariant

At all meaningful milestones:

```text
main = latest known stable integrated version
```

If a feature is incomplete:

```text
leave it on feature branch
```

rather than breaking main.

---

# 168. Pull Request Checklist

Before merge:

```text
[ ] builds
[ ] tests pass
[ ] no secrets
[ ] contract matches
[ ] no unrelated changes
[ ] teammate understands change
[ ] demo flow still works
```

---

# 169. Commit Message Convention

Recommended:

```text
feat: add deterministic hospital scoring
feat: implement request acceptance transaction
feat: build ambulance case intake
fix: prevent duplicate reroute requests
test: add concurrency acceptance test
docs: update data model
chore: configure Firebase hosting
```

Avoid:

```text
update
changes
final
done
stuff
```

---

# 170. Three-Person Technical Ownership

## Person 1 — Backend Core + Matching

Owns:

```text
need rules
matching
scoring
distance
ranking
mass-casualty assignment
domain tests
```

## Person 2 — Backend Realtime + State + AI

Owns:

```text
Firestore
request lifecycle
transactions
resource holds
rerouting triggers
audit
reliability
seed data
AI adapter
```

## Person 3 — Frontend

Owns:

```text
ambulance UI
hospital UI
admin UI
realtime hooks
service integration
UX
responsive design
frontend tests
```

The two backend people are both backend engineers. AI is a responsibility inside Person 2's backend ownership, not a separate team role.

---

# 171. Collaboration Boundary

Person 1 should expose pure domain functionality.

Person 2 should expose infrastructure/application services that use those functions.

Person 3 should consume those contracts.

Target dependency direction:

```text
Person 1 domain
       ↓
Person 2 backend/application
       ↓
Person 3 frontend
```

Person 3 should not directly depend on Person 1's private implementation details.

---

# 172. Backend File Ownership

Person 1:

```text
functions/src/matching/**
functions/src/domain/**
functions/src/utils/geo/**
```

Person 2:

```text
functions/src/api/**
functions/src/routing/**
functions/src/resources/**
functions/src/audit/**
functions/src/reliability/**
functions/src/ai/**
functions/src/data/**
```

Shared:

```text
functions/src/types/**
```

Any shared-type breaking change requires communication before merge.

---

# 173. Frontend File Ownership

Person 3 owns:

```text
frontend/**
```

Backend developers should avoid editing frontend unless explicitly helping with integration/debugging.

Frontend should avoid editing:

```text
functions/**
```

unless coordinating a contract issue.

---

# 174. Shared Documentation Ownership

All three:

```text
architecture
data-model
api-contract
spec
```

must be understood by the entire team.

Documentation editing can be distributed, but technical changes should not silently contradict the implementation.

---

# 175. Definition of Integration Point

The first integration point is:

```text
Scenario A
```

The team should not wait until every feature is complete before integrating.

By approximately hour 5–7, the target is:

```text
one real case
one real request
one real accept
two live screens
```

---

# 176. Integration Sequence

Recommended order:

```text
1. Firebase project
2. Hospital seed
3. Case creation
4. Need profile
5. Match engine
6. Request creation
7. Hospital realtime listener
8. Accept
9. Ambulance realtime listener
10. Audit
```

Then:

```text
11. Reject
12. Timeout
13. Reroute
14. Resource concurrency
15. Mass casualty
16. Stale data
17. Admin dashboard
18. Reliability
19. Mid-transit reroute
```

---

# 177. Hour-Window Engineering Targets

The PRD supplies the overall sequence.

This implementation spec converts it into checkpoints.

## Hour 0–1

```text
repo
branches
Firebase project
documentation foundation
schema
contracts
```

## Hour 1–3

```text
Firestore setup
seed data
need profile
matching functions
frontend shell
```

## Hour 3–5

```text
request creation
hospital realtime
ambulance realtime
```

## Hour 5–7

```text
Scenario A end-to-end
```

## Hour 7–9

```text
reject
timeout
reroute
concurrency
```

## Hour 9–12

```text
mass casualty
```

## Hour 12–13

```text
stale-data fallback
audit
```

## Hour 13–15

```text
admin/reliability/mid-transit
```

## Hour 15–16

```text
full rehearsal
```

## Hour 16–17

```text
README
documentation
AI disclosure
```

## Hour 17–18

```text
demo video
buffer
final test
freeze
```

---

# 178. Scope Cut Rule

If the team falls behind, do not destabilize the core protocol.

Cut or simplify in this order:

```text
1. Admin dashboard depth
2. AI explanation
3. Map visual sophistication
4. Reliability visualization depth
5. Stale-data visual polish
6. Mass-casualty visual animation
```

Do NOT cut:

```text
case creation
need profile
matching
request
accept/reject
timeout
reroute
resource safety
audit
```

The exact PRD scope says the commitment/reroute mechanism is central to the product.

---

# 179. AI Priority Rule

AI must only be attempted after:

```text
Scenario A works
Scenario B works
```

If the AI integration is unstable, remove it from the live critical path.

The product remains fully functional without it.

---

# 180. Map Priority Rule

A visually polished map is useful but not more important than:

```text
realtime request
acceptance
rerouting
mass casualty
```

If map integration causes external network/API problems:

```text
switch to coordinate-based simple visualization
```

without delaying core workflow.

---

# 181. Performance Priority Rule

Do not prematurely optimize.

Optimize only observed bottlenecks.

The dataset is intentionally small.

Priority is:

```text
correctness
realtime reliability
demo stability
explainability
```

before micro-optimization.

---

# 182. Data Consistency Rules

Core state must always obey:

```text
request.status is valid enum
case.active_request_id references existing request
hospital count values are non-negative
accepted request belongs to its target hospital
audit event references correct entity
attempt numbers increase monotonically
```

---

# 183. Referential Integrity

The backend should validate:

```text
request.case_id exists
request.hospital_id exists
audit.request_id exists where applicable
audit.case_id exists
audit.hospital_id exists where applicable
hold.request_id exists
```

Firestore does not enforce relational foreign keys automatically.

---

# 184. Orphan Data

The system should avoid creating:

```text
request without case
hold without request
audit without referenced entity
```

except for deliberately generic system events where the relevant ID is genuinely not applicable.

---

# 185. Case Creation Idempotency

If network retry creates duplicate case submissions, the frontend should have a local submission guard.

Optional backend support:

```text
client_submission_id
```

may be added if necessary.

This field is not currently mandatory.

---

# 186. Request Attempt Number

For one case:

```text
first attempt = 1
second attempt = 2
third attempt = 3
```

Never reset attempt number after reroute.

---

# 187. Reroute Exhaustion

If no eligible hospital remains:

```text
case.status = exhausted
active_request_id = null
```

Ambulance UI:

```text
No remaining matched facilities in the prototype network.
```

Admin audit records the exhaustion.

This is a demo state, not a real-world emergency instruction.

---

# 188. Reliability Dashboard

Minimum cards:

```text
Hospital name
Reliability %
Average response time
Accepted commitments
Honored commitments
```

The dashboard is an accountability visualization, not a clinical performance ranking.

---

# 189. Admin Audit Display

Columns:

```text
Time
Case
Hospital
Event
Request
Reason
```

Expandable row:

```text
decision snapshot
```

This allows judges to see the forensic trail without reading raw Firestore documents.

---

# 190. Hospital Reliability Display

Hospital screen may show:

```text
Network reliability
94%
```

Avoid showing complex scoring formulas to hospital staff during the live flow unless useful.

---

# 191. Hospital Capability Display

Use grouped sections:

```text
Teams
Specialists
Beds
Equipment
Blood
ER load
Last updated
```

This mirrors the logical data model.

---

# 192. Admin Map Marker Information

Clicking a hospital marker should reveal:

```text
name
capability summary
ER load
ICU
ventilator
freshness
reliability
```

Avoid an overloaded pop-up.

---

# 193. Ambulance Recommendation Card

Must show:

```text
Hospital
Final score
Capability match
Distance
ETA
Load
Freshness
Why this hospital
Human confirmation required
```

---

# 194. Matching Explainability

Every displayed final score must be backed by:

```text
capability match
distance
load
freshness
```

The backend must preserve the same values in the request.

---

# 195. No Opaque AI Score

MUST NOT display:

```text
AI confidence = 97%
```

for the hospital selection.

There is no such authoritative AI score in the system.

---

# 196. AI Usage Disclosure in UI

No special AI label is needed for users unless the team chooses one.

In technical documentation/presentation, disclose AI assistance appropriately.

---

# 197. Demo Login

If credentials are used:

```text
document them in README/demo notes
```

Do not hard-code them in the source.

---

# 198. Deployment

Preferred:

```text
Firebase Hosting → React frontend
Firebase Functions → backend
Firestore → data
```

This keeps the deployment stack inside one provider.

If Firebase Hosting proves problematic, frontend may be deployed on Vercel while backend remains Firebase.

---

# 199. Deployment Environment

The deployed demo must contain:

```text
working frontend
working Firestore
working backend functions
seed data
```

The deployment URL must be tested from an independent browser/device.

---

# 200. Demo Credential Policy

Provide judge credentials if login is required.

Recommended:

```text
demo ambulance
demo hospital
demo admin
```

The README must state which credential corresponds to which role.

---

# 201. Build Reproducibility

README must contain:

```text
Node version
npm/pnpm commands
Firebase CLI installation
environment setup
Firebase project configuration
Firestore seed instructions
development command
production build command
deployment command
```

The project must be reproducible on another machine as required by the hackathon rules.

---

# 202. Local Development

Target developer workflow:

```text
git clone
npm install
configure env
firebase login
firebase use <project>
npm run dev
```

Exact package manager may be finalized in `plans.md`.

---

# 203. Emulator Strategy

Recommended:

```text
Firebase Emulator Suite
```

for:

```text
Firestore
Functions
Auth if used
```

Use emulator testing where practical.

Do not spend excessive time building a full local simulation if cloud integration is already stable.

---

# 204. Production Demo Project

The live demo should use a dedicated Firebase project if possible.

This avoids contaminating a personal project with hackathon runtime data.

---

# 205. Firestore Seed Strategy

Use a deterministic script:

```text
scripts/seed/
```

rather than manually entering every record.

The PRD notes that Firebase Console seeding is viable, but a script is more reproducible.

If scripting becomes a time sink, manual console seeding remains acceptable for the hackathon.

---

# 206. Seed Script Requirements

The seed script should:

```text
create/update hospitals
create seeded reliability history
create demo configuration
create stale hospital
```

It should not create random patient cases every execution unless explicitly requested.

---

# 207. Seed Safety

Development-only script MUST NOT accidentally wipe production/demo data without an explicit confirmation flag.

Avoid a destructive:

```text
delete all
```

command as the default.

---

# 208. Data Migration Policy

No complex migration framework is needed.

During hackathon development:

```text
schema changes
→ seed script updated
→ test
→ deploy
```

Large destructive migrations should be avoided.

---

# 209. Documentation Synchronization

If code changes:

```text
field name
status
formula
threshold
```

the relevant documentation MUST be updated in the same work stream.

---

# 210. Change Approval

A change to any of the following requires team agreement:

```text
core data model
request states
match score
resource semantics
mass-casualty algorithm
realtime architecture
deployment architecture
MVP feature scope
```

Small UI styling changes do not require architecture review.

---

# 211. Definition of Done — Backend Core

Person 1 is functionally done with the first core layer when:

```text
need profile works
distance works
capability match works
score works
ranking works
tie-break works
unit tests pass
```

---

# 212. Definition of Done — Backend Realtime

Person 2 is functionally done with core realtime when:

```text
request creates
Firestore updates
hospital receives request
accept works transactionally
reject works
timeout works
reroute works
audit writes
```

---

# 213. Definition of Done — Frontend

Person 3's first milestone is done when:

```text
ambulance can create a case
ambulance can see need profile
hospital can receive a request
hospital can accept/reject
ambulance sees realtime result
```

without page refresh.

---

# 214. First Vertical Slice Definition

The first real milestone is:

```text
ONE CARDIAC CASE
       ↓
ONE NEED PROFILE
       ↓
ONE MATCH
       ↓
ONE REQUEST
       ↓
ONE HOSPITAL SCREEN
       ↓
ONE ACCEPT
       ↓
ONE REALTIME RESULT
```

Everything else comes after this is proven.

---

# 215. First Vertical Slice Test Script

### Device 1

```text
Open /ambulance
Select cardiac
Select red
Review need profile
Tap Find Best Hospital
```

### Device 2

```text
Open /hospital/{hospitalId}
Wait for request
Observe countdown
Tap Accept
```

### Device 1

```text
Observe Accepted state
Observe hospital reason
```

### Device 2

```text
Observe resource count decrement
```

### Device 3

```text
Open /admin
Observe audit event
```

---

# 216. First Milestone Commit Set

Recommended commits:

Person 1:

```text
feat: add deterministic need-profile rules
feat: implement hospital scoring engine
```

Person 2:

```text
feat: configure Firestore data layer
feat: implement request acceptance transaction
```

Person 3:

```text
feat: create ambulance case intake
feat: create hospital request screen
```

These satisfy genuine contribution expectations naturally.

---

# 217. Team Stand-Up Format

Every 60–120 minutes, each developer reports:

```text
Done:
Blocked:
Next:
Changed contract:
```

No long meetings.

---

# 218. Integration Rules During Hackathon

At each integration point:

```text
pull main
merge/rebase only according to team workflow
run tests
run frontend build
perform smoke test
merge PR
```

The exact Git commands are documented in `plans.md`/`tasks.md`.

---

# 219. Branch Synchronization

Before starting a significant new feature:

```text
update local branch from main
```

to reduce divergence.

Avoid long-running branches containing many unrelated changes.

---

# 220. Conflict Resolution

When a Git conflict occurs:

```text
do not blindly choose "ours" or "theirs"
```

Instead:

```text
identify intended contract
resolve
run tests
run build
```

Shared files such as:

```text
types
Firebase config
documentation
```

deserve extra attention.

---

# 221. No Last-Minute Repository Dump

Do not wait until hour 17 to push the whole project.

The technical rules specifically allow inspection of:

```text
Git history
individual contributions
documentation
deployment
```

Development history should therefore reflect the actual build.

---

# 222. Final Freeze

At the submission deadline:

```text
main branch
=
final evaluation version
```

Freeze the repository after:

```text
final tests
README verification
demo verification
video preparation
```

No untracked local "better version" should exist outside the submitted branch.

---

# 223. Final Technical Verification

Before freeze:

```text
[ ] main builds
[ ] deployment works
[ ] database works
[ ] case creation works
[ ] matching works
[ ] accept works
[ ] reject works
[ ] timeout works
[ ] reroute works
[ ] concurrency test passes
[ ] mass casualty works
[ ] stale data works
[ ] audit works
[ ] reliability works
[ ] no secrets
[ ] README works
[ ] all three members can explain their code
```

---

# 224. Judge Q&A — Architecture

Every member should be able to explain:

```text
Why Firestore?
Why realtime listeners?
Why deterministic matching?
Why not use an LLM for routing?
Why transactions?
Why audit snapshots?
Why separate case and request?
Why mass-casualty joint matching?
Why stale-data de-weighting?
```

---

# 225. Judge Q&A — Matching

The team should be able to explain:

```text
capability match
distance factor
load factor
freshness factor
eligibility gate
tie breakers
```

with one worked numeric example.

---

# 226. Judge Q&A — AI

The team should be able to state:

```text
AI does not make the routing decision.
The ranking engine is deterministic.
AI is optional and only phrases structured facts.
If AI fails, routing continues.
```

---

# 227. Judge Q&A — Concurrency

The answer should demonstrate:

```text
Firestore transaction
    ↓
read current resource
    ↓
verify availability
    ↓
decrement
    ↓
write accepted state
```

as one atomic operation.

---

# 228. Judge Q&A — Why Not a Bed Dashboard?

The technical answer should focus on the actual architectural distinction:

```text
dashboard:
availability is passive information

this system:
availability
    +
specific case need
    +
explicit hospital commitment
    +
transactional resource hold
    +
automatic reroute
    +
audit trail
```

Do not rely only on marketing language.

---

# 229. Judge Q&A — Limitations

The team should proactively acknowledge:

```text
synthetic data
prototype scoring
simplified capability rules
simulated hospital commitment
no offline mode
no full eligibility verification
no production authentication if using demo identity
no clinical validation
```

This is preferable to overclaiming.

---

# 230. Clinical Safety Boundary

The application is a hackathon prototype.

It MUST NOT claim to:

```text
diagnose patients
replace clinicians
guarantee emergency outcomes
guarantee hospital admission
provide medical treatment advice
```

The system is a coordination/decision-support prototype.

---

# 231. Product Language

Preferred:

```text
capability matching
routing recommendation
hospital commitment
resource availability
decision support
structured handoff
accountability
```

Avoid unsupported claims such as:

```text
AI doctor
guaranteed hospital
clinically validated emergency prediction
```

---

# 232. Data Privacy

Use the minimum information necessary for the demo.

Patient data should be:

```text
synthetic
minimal
non-identifying
```

No real medical records.

---

# 233. Logging Privacy

Do not write excessive patient information into:

```text
console logs
analytics
error telemetry
```

Audit logs contain only the structured data needed for the prototype's accountability purpose.

---

# 234. Core System Invariants

The following invariants are non-negotiable.

```text
Invariant 1:
One case has at most one active pending request.

Invariant 2:
One case has at most one active accepted commitment.

Invariant 3:
A countable resource cannot be consumed below zero.

Invariant 4:
A resource is decremented only once for a commitment.

Invariant 5:
A request has exactly one authoritative terminal transition.

Invariant 6:
Reject/timeout cannot create duplicate reroutes.

Invariant 7:
Audit history is append-only.

Invariant 8:
Match results are reproducible from stored inputs.

Invariant 9:
AI cannot alter authoritative routing.

Invariant 10:
Frontend cannot manufacture acceptance.
```

---

# 235. Failure Mode — Hospital Rejects

Expected:

```text
request = rejected
audit = written
resource = unchanged
reroute = triggered
```

---

# 236. Failure Mode — Hospital Times Out

Expected:

```text
request = timed_out
audit = written
resource = unchanged
reroute = triggered
```

---

# 237. Failure Mode — Hospital Accepts but Resource Is Gone

Expected:

```text
transaction fails
request remains pending OR transitions only according to a controlled conflict policy
no negative capacity
user sees "capacity no longer available"
reroute can proceed
```

The exact error code:

```text
CONCURRENCY_CONFLICT
```

or:

```text
NO_AVAILABLE_CAPABILITY
```

must be returned according to the failing condition.

---

# 238. Failure Mode — All Hospitals Invalid

Expected:

```text
case = exhausted
active request = none
audit = CASE_EXHAUSTED
```

The ambulance UI communicates that no eligible prototype facility remains.

---

# 239. Failure Mode — Firestore Temporarily Unavailable

Expected:

```text
no fabricated new state
frontend shows reconnecting/error
retry safely
```

The system must not display:

```text
Accepted
```

unless acceptance is confirmed.

---

# 240. Failure Mode — AI Service Down

Expected:

```text
match succeeds
fallback explanation
```

---

# 241. Failure Mode — Map Down

Expected:

```text
matching continues
hospital cards still work
distance still works through Haversine
```

---

# 242. Failure Mode — GPS Denied

Expected:

```text
use seeded demo coordinates
show demo-location indicator
```

---

# 243. Failure Mode — Stale Hospital

Expected:

```text
hospital visible with stale/unknown badge
score de-weighted
audit captures freshness
```

---

# 244. Failure Mode — Duplicate Accept Click

Expected:

```text
one accepted transition
one resource decrement
```

---

# 245. Failure Mode — Duplicate Network Retry

Expected:

```text
backend state check prevents duplicate commit
```

---

# 246. Failure Mode — Mid-Transit Capability Loss

Expected:

```text
accepted request superseded
hold released
new ranking
new request
ambulance realtime notification
audit trail
```

---

# 247. Demo Success Criteria

The demo is considered functionally successful when the team can execute:

```text
Scenario A
Scenario B
Scenario C
Scenario D
Scenario E
```

without:

```text
manual database editing during the live flow
page refresh for realtime transitions
terminal commands during the main demo
fake acceptance states
```

Seed/setup may of course be done beforehand.

---

# 248. Submission Compliance Mapping

## GitHub

```text
one public repo
stable main
feature branches
meaningful commits
```

## Prototype

```text
functional UI
functional backend
demonstrable core features
```

## Documentation

```text
README
architecture
API
database
setup
run
```

## Security

```text
no secrets
.env
.env.example
```

## AI

```text
disclosed use
explainable implementation
```

## Deployment

```text
working demo/deployment
backup
```

## Video

```text
≤ 5 minutes
working product demonstration
```

---

# 249. Final 5-Minute Demo Technical Flow

Recommended:

```text
0:00–0:30
Problem + product

0:30–1:15
Scenario A

1:15–2:00
Scenario B

2:00–3:00
Scenario C

3:00–3:30
Scenario D

3:30–4:00
Scenario E

4:00–4:45
Explicit roadmap / limitations

4:45–5:00
Close
```

The final recorded video must remain within the hackathon's five-minute limit.

---

# 250. Specification Freeze

Before coding begins, the team should explicitly confirm:

```text
[ ] technology choices
[ ] routes
[ ] collections
[ ] field names
[ ] request states
[ ] timeout
[ ] score formula
[ ] freshness thresholds
[ ] resource behavior
[ ] mass-casualty algorithm
[ ] reliability definition
[ ] AI boundary
[ ] demo identities
[ ] seed dataset
[ ] branch ownership
```

---

# 251. Required Data-Model Amendments

This specification introduces two implementation details that should be reflected back into `data-model.md` before coding:

```text
1. /hospitals/{hospitalId}/holds/{requestId}

2. reliability_score may be null when no history exists
```

The team should revise `data-model.md` to incorporate these explicitly.

This is intentional; the change is documented rather than silently hidden.

---

# 252. Required API-Contract Amendments

The next revision of `api-contract.md` should include:

```text
1. mid-transit invalidation flow
2. superseded accepted request
3. hold object
4. exact case routing state response
5. mass-casualty incident endpoint decision
6. freshness object
7. reliability "no history" behavior
```

---

# 253. Required Architecture Amendments

The next revision of `architecture.md` should mention:

```text
1. hospital hold subcollection
2. single React application with role routes
3. Cloud Functions as the authoritative mutation boundary
4. bounded mass-casualty backtracking
5. server-authoritative timeout
```

These amendments are small formalizations of the foundation, not a change to the product idea.

---

# 254. Implementation Readiness Test

The project is ready to move from documentation to code when three developers can independently answer:

### Person 1

```text
What data do I consume?
What functions do I build?
What do I return?
How do I calculate the score?
How do I rank?
How do I solve mass casualty?
```

### Person 2

```text
Where does state live?
How do requests transition?
How does Accept work transactionally?
How does timeout work?
How does reroute work?
How does audit work?
Where can AI fit?
```

### Person 3

```text
What screens exist?
What data does each screen consume?
Which data is realtime?
What happens on loading/error/reconnect?
What does Accept/Reject mean?
How is stale data shown?
```

If any of those still require guessing, update the relevant documentation before writing feature code.

---

# 255. Final System Contract

The complete prototype obeys:

```text
                         CASE
                           │
                           ▼
                    NEED PROFILE
                           │
                           ▼
                ELIGIBILITY GATE
                           │
                           ▼
                   MATCH ENGINE
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
         CAPABILITY     DISTANCE        LOAD
             │             │             │
             └─────────────┼─────────────┘
                           │
                      FRESHNESS
                           │
                           ▼
                    FINAL SCORE
                           │
                           ▼
                 RANKED HOSPITALS
                           │
                           ▼
                   REQUEST #1
                           │
                 ┌─────────┼─────────┐
                 ▼         ▼         ▼
              ACCEPT    REJECT    TIMEOUT
                 │         │         │
                 ▼         └────┬────┘
             RESOURCE           │
               HOLD             ▼
                 │           REROUTE
                 ▼              │
              ACCEPTED          ▼
                 │        REQUEST #2...
                 │
                 ▼
          MID-TRANSIT CHECK
                 │
          ┌──────┴──────┐
          ▼             ▼
        VALID        INVALIDATED
          │             │
          ▼             ▼
       CONTINUE      RELEASE HOLD
                        │
                        ▼
                     REROUTE

Every material transition
          │
          ▼
      AUDIT LOG

Every completed commitment
          │
          ▼
       RELIABILITY

AI, if enabled:
structured facts
      ↓
explanation wording only
```

---

# 256. Final Engineering Principle

The entire system can be summarized technically as:

```text
deterministic matching
+
transactional commitment
+
realtime synchronization
+
automatic rerouting
+
historical accountability
+
joint surge distribution
+
explicit human confirmation
```

The prototype does not attempt to solve every healthcare coordination problem.

It solves one narrow coordination loop deeply:

```text
Need
→ Capability
→ Recommendation
→ Commitment
→ Failure detection
→ Reroute
→ Accountability
```

That loop is the implementation center of gravity for every subsequent plan and task.

---

# 257. End State

At the end of the build, the repository must contain:

```text
working code
+
stable main
+
documented architecture
+
documented data model
+
documented API contract
+
this implementation specification
+
plans.md
+
tasks.md
+
README.md
+
seed data
+
tests
+
deployment
```

No implementation task should begin by redesigning this core system.

The next project-control documents should convert this specification into:

```text
plans.md
```

for sequencing, milestones, dependencies, Git workflow, and hour-by-hour coordination, followed by:

```text
tasks.md
```

for the concrete developer checklist and granular task ownership.
