# Architecture — Capability-Match Ambulance–Hospital Coordination System

**Project:** CodeCraft / Technofora '26 Hackathon  
**Track:** HealthTech — Accessible Care & Intelligent Patient Support  
**Architecture status:** Pre-build foundation document  
**Source of truth:** `PRD_Final.md`  
**Team:** 3 members  
**Build window:** approximately 18 hours

---

## 0. Purpose of This Document

This document defines the system architecture that the team will implement for the hackathon project.

It exists **before feature development** so that all three team members share the same mental model of the system and so that implementation work can proceed in parallel without repeatedly changing interfaces, data ownership, or core workflow assumptions.

This document is intentionally more detailed than a conventional hackathon architecture note. It is intended to serve four purposes simultaneously:

1. **Engineering blueprint** — developers use it to decide where code belongs and how components interact.
2. **Coordination contract** — the three teammates use it to avoid overlapping or conflicting implementation.
3. **Anti-Gravity context** — future coding prompts should reference this document rather than rediscovering architecture from the PRD every time.
4. **Judging/Q&A reference** — the team can explain the problem → architecture → technology → implementation chain consistently.

No implementation should silently contradict this document. When a technical limitation requires an architectural change, the change should be explicitly discussed and recorded rather than made implicitly inside code.

---

# 1. Architectural Summary

The system is an **event-driven, realtime coordination platform** connecting an ambulance/dispatcher interface with hospital reception interfaces through a shared Firebase/Firestore state layer.

The central architectural idea is not a hospital availability dashboard. It is a **capability-match + active commitment protocol**.

The system takes:

- the patient's structured emergency case,
- the required capabilities derived from that case,
- the patient's/ambulance's location,
- and the current capability state of participating hospitals,

and produces an explainable ranked set of hospitals.

The top-ranked hospital receives a **specific request**, not merely a passive availability display. The request remains pending for a limited countdown period. The hospital can accept or reject it. If it rejects or does not respond before timeout, the coordination workflow automatically moves to the next candidate.

Every material workflow transition is written to an audit trail.

For mass-casualty incidents, multiple cases belonging to one incident are processed jointly so that cases are distributed across multiple suitable hospitals rather than independently converging on the same hospital.

The system therefore has four architectural layers:

```text
┌──────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                    │
│                                                          │
│  Ambulance UI     Hospital UI     Admin/Oversight UI    │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│                 APPLICATION / DOMAIN LAYER               │
│                                                          │
│  Case Intake                                             │
│  Need Profile Rules                                      │
│  Capability Matching                                     │
│  Ranking                                                 │
│  Request / Reroute State Machine                         │
│  Reservation / Hold Logic                                │
│  Reliability Calculation                                 │
│  Stale-Data Handling                                     │
│  Mass-Casualty Distribution                              │
│  Audit Event Creation                                    │
│  AI Explanation Layer (optional, non-authoritative)      │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│                 REALTIME / DATA LAYER                    │
│                                                          │
│  Firebase Firestore                                     │
│  Realtime listeners / onSnapshot                         │
│  Firestore transactions                                  │
│  Seeded demo data                                        │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│                 EXTERNAL / PLATFORM LAYER                │
│                                                          │
│  Browser Geolocation                                    │
│  Optional map provider                                  │
│  Hosting                                                 │
│  Optional LLM provider for explanation text             │
└──────────────────────────────────────────────────────────┘
```

---

# 2. Architectural Principles

## 2.1 The matching engine is deterministic

The system must never use an opaque LLM decision as the authoritative hospital-selection mechanism.

The authoritative decision is computed from explicit inputs such as:

- capability match,
- distance,
- current ER load,
- freshness of hospital data,
- and applicable basic eligibility fields.

This is important both technically and for judge Q&A: the team must be able to explain exactly why Hospital A ranked above Hospital B.

An LLM may optionally transform a structured score breakdown into a human-readable explanation, but it does not own the ranking decision.

Example:

```text
Authoritative calculation:

Hospital B
Capability match = 100%
Distance = 4.2 km
Load = 2/5
Freshness = current
Final score = 87.4

Optional explanation layer:
"Hospital B is recommended because the required specialist is on shift,
ICU capacity is available, and the estimated travel distance is short."
```

The explanation must be traceable to the underlying structured facts.

---

## 2.2 Firestore is the shared realtime source of truth

The project uses Firebase Firestore as the shared data/state layer.

The frontends should not maintain separate authoritative copies of:

- hospital capacity,
- request status,
- acceptance state,
- reroute state,
- audit history.

Local UI state is allowed for presentation concerns such as:

- which tab is open,
- input currently being edited,
- animation state,
- temporary form state.

But shared workflow state belongs in Firestore.

---

## 2.3 State transitions are explicit

The system must not rely on vague booleans such as:

```text
isAccepted = true
```

when the real workflow has meaningful intermediate states.

The canonical request states are:

```text
pending
accepted
rejected
timed_out
superseded
```

Each transition should be deliberate and auditable.

---

## 2.4 Hospital capability is treated as contested inventory

A capability being shown as available is not enough.

When an accepted request consumes a scarce resource, the resource must be held/decremented atomically so another simultaneous request cannot also consume the same slot.

The architecture therefore treats a scarce capability as mutable shared inventory, not as a static display value.

---

## 2.5 Every important decision leaves evidence

For any significant routing outcome, the system should preserve enough information to reconstruct what happened.

The audit record should allow the team to answer:

- What case existed?
- Which hospital was considered?
- What was the match score?
- What was the hospital status at that time?
- When was the request sent?
- Did the hospital accept, reject, or timeout?
- When did it respond?
- What happened next?
- Why did the system reroute?

This is not only a dashboard feature; it is part of the architecture.

---

## 2.6 Graceful degradation is preferable to confident use of stale information

Hospital state includes `last_updated_at`.

The architecture must be able to detect stale data and downgrade its influence rather than presenting old status as current truth.

The exact freshness threshold is an implementation parameter that must be defined in configuration, not scattered through UI code.

Conceptually:

```text
Fresh hospital data
    ↓
normal ranking influence

Stale hospital data
    ↓
status = unknown / stale
    ↓
reduced ranking confidence / de-weighting
```

The system should communicate this to the operator instead of hiding the uncertainty.

---

## 2.7 Human confirmation remains explicit

The application is a decision-support and coordination prototype. It is not presented as an autonomous medical decision-maker.

The UI should therefore distinguish between:

```text
System recommendation
        ↓
Human hospital / dispatcher action
```

The acceptance action is explicitly human-controlled.

Any automated ranking should be labelled as a recommendation rather than an irreversible medical decision.

---

# 3. System Actors

There are three primary application-facing actors.

## 3.1 Ambulance / Dispatcher

Primary responsibilities:

- create a case,
- choose structured emergency category,
- provide severity and available handoff information,
- inspect generated need profile,
- request hospital matching,
- observe ranked recommendation,
- observe request state in realtime,
- receive acceptance/rejection/reroute status,
- submit/trigger mass-casualty cases.

Primary device in the intended live demo:

```text
Phone / mobile browser
```

---

## 3.2 Hospital Staff

Primary responsibilities:

- maintain a hospital capability profile,
- receive incoming requests in realtime,
- inspect the structured case/handoff summary,
- see countdown timer,
- accept or reject a request,
- observe the effect of accepting on capability inventory,
- allow a demo operator to change hospital status to simulate mid-transit capability changes.

Primary device in the intended live demo:

```text
Laptop / tablet / phone
```

---

## 3.3 Administrator / Oversight User

Primary responsibilities:

- inspect participating hospital states,
- view aggregate reliability information,
- view response-time information,
- inspect audit history,
- understand network-wide patterns.

This interface is a dashboard, but the overall product is **not** a dashboard-only system.

Primary live-demo device:

```text
Laptop / large screen
```

---

# 4. Major Components

## 4.1 Ambulance Application

### Responsibilities

- Case intake
- Need-profile preview
- Location capture
- Match initiation
- Match-result display
- Request status display
- Realtime reroute notifications
- Mass-casualty mode
- Structured handoff display

### Does not own

- authoritative hospital capability data,
- matching calculations,
- acceptance state,
- audit state.

Those are shared/domain responsibilities.

---

## 4.2 Hospital Application

### Responsibilities

- Hospital selection / seeded hospital session
- Capability editing
- Incoming-request listener
- Request countdown rendering
- Accept / reject action
- Status-update controls
- Incoming-case preparation information
- Reliability display

### Does not own

- final global ranking,
- authoritative request lifecycle,
- reliability calculation logic duplicated independently in the browser.

The hospital UI sends actions. The shared application/domain layer validates and persists them.

---

## 4.3 Admin / Oversight Application

### Responsibilities

- Network map
- Hospital state visualization
- Reliability statistics
- Response-time statistics
- Audit log
- Request/event history

### Does not own

- independent copies of matching logic,
- direct mutation of request state except where an explicitly designed administrative action exists.

For the initial prototype, this interface is primarily observational.

---

## 4.4 Need-Profile Rules Engine

The case intake is intentionally structured rather than dependent on free-form language parsing.

Example concept:

```text
CASE CATEGORY

cardiac
  → cardiologist
  → ECG capability
  → ICU capability

trauma
  → trauma team
  → ICU / ventilator as required
  → relevant blood availability where applicable

obstetric
  → obstetric capability
  → relevant specialist
  → emergency support capability

pediatric
  → pediatric capability
  → appropriate emergency support
```

The exact rules table belongs in configuration/code owned by the backend/core developer and documented separately in `spec.md`.

The rule engine should produce a normalized `need_profile` object. All downstream matching operates on that normalized representation.

---

## 4.5 Matching Engine

The matching engine is the central domain component.

Inputs:

```text
Case
Need profile
Ambulance location
Hospital collection
Hospital freshness
Current hospital load
Current resource availability
```

Outputs:

```text
Ordered candidate hospitals
Score breakdown for each candidate
Human-readable reason inputs
```

Conceptual pipeline:

```text
Case
  ↓
Need profile
  ↓
Fetch hospital candidates
  ↓
Filter impossible matches
  ↓
Calculate capability match
  ↓
Calculate distance factor
  ↓
Calculate current-load factor
  ↓
Apply freshness adjustment
  ↓
Calculate final score
  ↓
Sort candidates
  ↓
Return ranked list
```

The engine should not immediately assume the first-ranked hospital will accept. Ranking determines the order in which commitments are attempted.

---

# 5. Matching Architecture

## 5.1 Candidate evaluation

Every hospital is evaluated against the current case.

At a high level:

```text
Hospital capability
        ×
Case need
        ↓
Capability match

Hospital location
        ×
Ambulance location
        ↓
Distance factor

Hospital ER load
        ↓
Load factor

Hospital data freshness
        ↓
Freshness adjustment

All factors
        ↓
Final ranking score
```

The PRD defines the core scoring concept as:

```text
capability match % × distance factor × current-load factor
```

with stale data de-weighted.

The exact mathematical normalization should be specified in `spec.md`, including weights, edge cases, and test examples.

---

## 5.2 Capability matching

Capability matching is not equivalent to bed-count matching.

The engine should examine required capabilities such as:

- specialist availability,
- trauma team availability,
- ICU availability,
- ventilator availability,
- relevant blood stock,
- other structured capability flags.

A hospital with a shorter distance but missing a required capability may therefore rank below a farther hospital that can satisfy the actual case requirements.

The system must make this visible through the score breakdown.

---

## 5.3 Distance calculation

For the initial build, distance should be calculated from latitude/longitude using a deterministic distance calculation rather than introducing an external maps dependency unless the live map requires one.

Primary safe architecture:

```text
ambulance lat/lng
        +
hospital lat/lng
        ↓
Haversine distance
        ↓
distance_km
```

An external map provider may later be used only where it materially improves the presentation, while the core ranking should not become dependent on a live third-party API for basic correctness.

---

## 5.4 Freshness adjustment

Each hospital carries `last_updated_at`.

The matching engine calculates:

```text
current_time - last_updated_at
```

and categorizes the hospital as sufficiently current or stale according to a configured threshold.

A stale hospital should not be deleted from the network. It should instead be explicitly marked and given reduced trust in ranking.

This distinction matters because:

```text
stale ≠ definitely unavailable
stale = insufficiently fresh information
```

The UI should communicate that distinction.

---

# 6. Active Commitment Protocol

This is the most important workflow in the architecture.

A match is not considered confirmed merely because a hospital has capacity.

The process is:

```text
1. Rank candidates
        ↓
2. Select highest-ranked candidate
        ↓
3. Create REQUEST
        ↓
4. REQUEST = pending
        ↓
5. Hospital screen receives realtime event
        ↓
6. Countdown starts
        ↓
   ┌────────────┬─────────────┐
   ↓            ↓             ↓
Accept       Reject        Timeout
   ↓            ↓             ↓
Hold         release        release
resource     attempt        attempt
   ↓            ↓             ↓
Confirmed      Reroute       Reroute
```

The system therefore distinguishes:

```text
RECOMMENDED
```
from:

```text
ACCEPTED / COMMITTED
```

This distinction should exist both in data and in the UI.

---

# 7. Request State Machine

Canonical request lifecycle:

```text
                    ┌──────────────┐
                    │    PENDING   │
                    └──────┬───────┘
                           │
              ┌────────────┼─────────────┐
              │            │             │
              ▼            ▼             ▼
         ┌─────────┐  ┌──────────┐  ┌────────────┐
         │ACCEPTED │  │ REJECTED │  │ TIMED_OUT  │
         └────┬────┘  └─────┬────┘  └──────┬─────┘
              │             │              │
              ▼             └──────┬───────┘
       capability held              │
       / decremented                ▼
                              NEXT CANDIDATE
                                     │
                                     ▼
                              NEW REQUEST
                                     │
                                     ▼
                                PENDING
```

`superseded` is used when a previous request is no longer the active candidate because a new candidate has taken over the workflow.

### State transition rules

| From | Event | To | Notes |
|---|---|---|---|
| none | case created | case active | A case exists before a request is sent. |
| none | match initiated | pending | First request is created. |
| pending | hospital accepts | accepted | Resource is held/decremented atomically. |
| pending | hospital rejects | rejected | Candidate is no longer eligible for this attempt. |
| pending | countdown expires | timed_out | No human response in the allowed period. |
| rejected | reroute | new pending request | Next ranked candidate is attempted. |
| timed_out | reroute | new pending request | Next ranked candidate is attempted. |
| pending | superseded | superseded | Old candidate replaced by another active candidate. |
| accepted | completion/follow-up | recorded in history | Exact post-arrival lifecycle is outside the initial routing protocol. |

The implementation should enforce allowed transitions rather than trusting client-provided status changes.

---

# 8. Realtime Event Flow

The live demo depends on one device causing another device to change without manual page refresh.

Target behavior:

```text
Ambulance Device
      │
      │ create request
      ▼
Firestore REQUEST document
      │
      │ realtime propagation
      ▼
Hospital Device
      │
      ├── visual alert
      ├── optional sound
      └── countdown
```

When the hospital accepts:

```text
Hospital Device
      │
      │ accept action
      ▼
Firestore transaction / domain action
      │
      ├── REQUEST → accepted
      ├── capability held/decremented
      ├── reliability updated
      └── audit event created
      │
      ▼
Ambulance realtime listener
      │
      ▼
Accepted UI
```

When rejected or timed out:

```text
REQUEST rejected/timed out
        ↓
Audit event
        ↓
Candidate marked failed for this attempt
        ↓
Next candidate selected
        ↓
New REQUEST
        ↓
Hospital realtime listener
        ↓
Ambulance listener sees reroute
```

---

# 9. Concurrency and Resource Holds

Concurrency is a first-class architectural concern, not a UI detail.

## 9.1 The problem

Suppose:

```text
Hospital B
ICU slots available = 1
```

Two ambulances submit requests at almost the same moment.

Without a transactional update:

```text
Ambulance 1 reads ICU = 1
Ambulance 2 reads ICU = 1
Ambulance 1 accepts
Ambulance 2 accepts
```

The system has logically allocated one resource twice.

## 9.2 Required behavior

The acceptance operation must atomically check and update the relevant capability state.

Conceptually:

```text
TRANSACTION

read current capability
      ↓
verify capability >= required amount
      ↓
if valid:
    decrement / hold capability
    mark request accepted
    write audit event
else:
    reject acceptance / report unavailable
```

Firestore transactions are the intended implementation mechanism in the chosen architecture.

## 9.3 Important design principle

The frontend must never perform:

```text
read capability
→ subtract locally
→ write capability
```

as the authoritative operation.

The transaction must occur in the authoritative domain/data layer.

---

# 10. Auto-Reroute Architecture

The reroute protocol must be automatic from the ambulance operator's perspective.

Example:

```text
Ranked candidates:

1. Hospital A
2. Hospital C
3. Hospital D
4. Hospital B
```

First request:

```text
REQUEST-001 → Hospital A
```

Hospital A rejects:

```text
REQUEST-001 → rejected
       ↓
audit
       ↓
REQUEST-002 → Hospital C
```

If Hospital C accepts:

```text
REQUEST-002 → accepted
       ↓
CASE → confirmed at Hospital C
```

The ambulance UI should show the transition, not simply replace the original hospital name silently.

For example:

```text
Hospital A — did not accept the case
↓
Automatically rerouted
↓
Hospital C — request pending
```

This visible history is part of the product's explanatory behavior.

---

# 11. Mass-Casualty Architecture

Mass-casualty mode is different from sending four independent requests one after another.

All cases from the same incident share:

```text
incident_group_id
```

Conceptually:

```text
INCIDENT-001
│
├── CASE-001 — Trauma / red
├── CASE-002 — Trauma / yellow
├── CASE-003 — Cardiac / red
└── CASE-004 — Pediatric / yellow
```

The matching engine receives the set as a group and attempts to distribute cases across hospitals according to:

- capability fit,
- capacity constraints,
- distance,
- current load,
- freshness.

The objective is not simply:

```text
For each case:
    find individual #1 hospital
```

because this can result in:

```text
Case 1 → Hospital A
Case 2 → Hospital A
Case 3 → Hospital A
Case 4 → Hospital A
```

The group mode should account for the fact that hospital capacity is shared across the group.

The exact batch allocation algorithm will be specified in `spec.md`.

For the hackathon prototype, the algorithm should prioritize deterministic, explainable allocation over mathematically elaborate optimization that is difficult to test under an 18-hour constraint.

---

# 12. Mid-Transit Reroute Architecture

The architecture must support hospital status changes after a request has been accepted but before the simulated arrival.

Example:

```text
Hospital B accepted
        ↓
Ambulance en route
        ↓
Hospital B changes:
trauma_team_on_shift = false
        ↓
System detects capability loss
        ↓
Current route becomes invalid / degraded
        ↓
Next matching attempt
        ↓
Ambulance receives reroute alert
```

For the prototype, this behavior should be triggered deliberately through a hospital-side status control so it is reliable during the demonstration.

The architecture must avoid hiding the transition. The UI should show something equivalent to:

```text
REROUTE REQUIRED
Hospital B no longer satisfies the required capability.
Searching for the next suitable facility…
```

The exact post-acceptance re-routing policy must be documented in `spec.md` because the PRD establishes the requirement but does not fully specify every edge condition.

---

# 13. Audit Architecture

Every meaningful routing event should generate an audit event.

Minimum conceptual events:

```text
CASE_CREATED
NEED_PROFILE_GENERATED
MATCH_STARTED
MATCH_COMPLETED
REQUEST_SENT
REQUEST_ACCEPTED
REQUEST_REJECTED
REQUEST_TIMED_OUT
REROUTED
CAPABILITY_HELD
CAPABILITY_CHANGED
STALE_HOSPITAL_DETECTED
CASE_CONFIRMED
```

Not every event must expose every field to the UI, but the stored audit trail should preserve enough context for forensic reconstruction.

Each audit record should be immutable from the perspective of normal operator actions.

The core audit shape defined by the PRD is:

```text
id
request_id
event_type
timestamp
snapshot_of_data_at_decision_time
```

The snapshot should capture the relevant decision context rather than merely storing a generic message.

---

# 14. Reliability Architecture

Hospital reliability is derived from the system's recorded commitment outcomes.

Conceptually:

```text
accepted-and-honored commitments
---------------------------------
all accepted commitments
```

The exact handling of:

- timeout,
- rejection,
- post-acceptance failure,
- cancellation,
- incomplete demo scenarios

must be explicitly specified in `spec.md`.

The important architectural rule is that reliability should be derived from recorded events rather than manually typed into the hospital profile.

The hospital profile may contain the displayed/computed `reliability_score`, but its authoritative calculation should be reproducible from history.

---

# 15. Data Ownership Model

To keep the three-person team from overwriting one another's responsibilities, data ownership is conceptually divided as follows.

| Domain | Primary owner | Other consumers |
|---|---|---|
| Hospital capability state | Backend/Realtime developer | Frontend, Matching engine |
| Case records | Backend/Realtime developer | Ambulance UI, Matching engine, Audit |
| Need-profile rules | Backend/Core developer | Ambulance UI |
| Matching calculation | Backend/Core developer | Ambulance UI, Admin UI |
| Request lifecycle | Backend/Realtime developer | All UIs |
| Resource hold transaction | Backend/Realtime developer | Matching engine |
| Audit history | Backend/Realtime developer | Admin UI |
| Reliability calculation | Backend/Realtime developer | Hospital/Admin UI |
| AI explanation | Backend/Realtime/AI developer | Ambulance UI/Admin UI as applicable |
| Visual presentation | Frontend developer | Entire team |

The ownership is about implementation responsibility, not exclusive knowledge. Every teammate should understand the complete architecture sufficiently for technical Q&A.

---

# 16. Three-Person Team Architecture

## Person 1 — Core Backend / Matching

### Owns

```text
backend/
├── matching/
├── rules/
├── scoring/
├── routing/
└── batch/
```

### Primary responsibilities

- need-profile rules
- capability matching
- score calculation
- candidate ranking
- reroute candidate selection
- mass-casualty distribution algorithm
- deterministic unit tests

### Does not own

- frontend component layout
- Firestore listener UI behavior
- visual styling

---

## Person 2 — Backend / Realtime / AI

### Owns

```text
backend/
├── firestore/
├── requests/
├── transactions/
├── audit/
├── reliability/
└── ai/
```

### Primary responsibilities

- Firestore integration
- realtime subscriptions and event flow
- request state transitions
- countdown/timeout handling mechanism
- transactional capability holds
- audit logging
- reliability aggregation
- seeded data
- optional AI explanation layer

### Does not own

- authoritative ranking formulas unless coordinated with Person 1
- frontend layout/styling

---

## Person 3 — Frontend

### Owns

```text
frontend/
├── ambulance/
├── hospital/
├── admin/
├── components/
└── services/
```

### Primary responsibilities

- responsive ambulance interface
- hospital reception interface
- admin dashboard
- realtime UI updates
- countdown display
- alerts
- maps/cards/visualizations
- frontend state management
- accessibility and presentation polish

### Does not own

- duplicating backend decision logic inside UI
- direct modification of database semantics without agreement

---

# 17. Recommended Repository Architecture

The following is the initial repository organization.

```text
project-root/
│
├── frontend/
│   ├── src/
│   │   ├── ambulance/
│   │   ├── hospital/
│   │   ├── admin/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── lib/
│   │   └── styles/
│   └── ...
│
├── backend/
│   ├── matching/
│   ├── rules/
│   ├── requests/
│   ├── transactions/
│   ├── realtime/
│   ├── audit/
│   ├── reliability/
│   ├── ai/
│   ├── seed/
│   └── tests/
│
├── docs/
│   ├── architecture.md
│   ├── data-model.md
│   ├── api-contract.md
│   ├── plans.md
│   ├── tasks.md
│   └── spec.md
│
├── .env.example
├── .gitignore
├── README.md
└── ...
```

This structure is intentionally conceptual at this stage. The implementation team may merge tiny backend directories where doing so simplifies the project, but the architectural ownership boundaries should remain.

---

# 18. Git Branch Architecture

Because the team is new to branches, the initial branch model is deliberately simple.

```text
main
│
├── backend-core
├── backend-realtime-ai
└── frontend
```

## `main`

`main` is the stable integration branch.

Rules:

- Do not use it as someone's personal working branch.
- No half-finished experimental feature should be merged merely because it exists.
- It should remain runnable.
- Integration is performed through reviewed changes.

## `backend-core`

Owned by Person 1.

## `backend-realtime-ai`

Owned by Person 2.

## `frontend`

Owned by Person 3.

Later, when a larger feature is developed, short-lived feature branches may be created from the relevant working branch if useful, but this should not be introduced until the team is comfortable with the simple three-branch structure.

---

# 19. Integration Rules

## Rule 1 — Interfaces are frozen before parallel feature work

Once `data-model.md` and `api-contract.md` are agreed, developers should not casually change object shapes while another teammate is building against them.

A required interface change should be discussed and updated across the relevant documents before code is changed.

## Rule 2 — `main` must remain runnable

A merge should not intentionally leave the primary application in an unbuildable state.

## Rule 3 — Backend logic must not be duplicated in the frontend

The frontend can display a computed score but should not implement a second version of the scoring algorithm.

## Rule 4 — Shared state changes must be atomic where required

Capability holds and request acceptance are transactional operations.

## Rule 5 — All significant work produces meaningful commits

The official technical rules call for meaningful commits, at least two genuine contributions from every member, and roughly one meaningful commit every 1–2 hours during development.

## Rule 6 — Every teammate must understand their code

AI-assisted implementation is allowed by the event rules, but significant AI-generated work must be disclosed and team members must be able to explain code they submit.

---

# 20. Realtime Query / Listener Boundaries

The application should subscribe only to the data each interface needs.

## Ambulance UI listeners

Potential realtime targets:

```text
Current case
Current active request
Current reroute event
Final accepted hospital
```

The ambulance screen should not continuously listen to every audit record in the network.

## Hospital UI listeners

Potential realtime targets:

```text
Incoming requests for current hospital
Current hospital capability state
Relevant request updates
```

## Admin UI listeners

Potential realtime targets:

```text
Hospital status collection
Request/event activity
Aggregated statistics
Audit history
```

The exact Firestore query patterns and indexes belong in `spec.md` or a future implementation note once the final schema is defined.

---

# 21. Deployment Architecture

The target deployment should minimize the number of independently failing services.

Conceptual deployment:

```text
Internet
   │
   ▼
Hosted React application
   │
   ├─────────────┐
   │             │
   ▼             ▼
Ambulance     Hospital/Admin
UI            UI
   │             │
   └──────┬──────┘
          ▼
       Firebase
          │
     ┌────┴─────┐
     ▼          ▼
 Firestore   Backend functions/
             domain actions
```

Primary architecture choice:

- Firebase/Firestore for shared realtime state
- React for the web interfaces
- Firebase Functions as the preferred backend execution mechanism if a server-side execution boundary is required
- Firebase Hosting or an equivalent simple frontend host

The PRD allows a thin Node.js backend layer or Firebase Cloud Functions; the architecture favors the Firebase-centered approach because it reduces the number of independently deployed moving parts during a short hackathon.

If the team chooses a separate Node.js service instead, this document must be updated before implementation begins.

---

# 22. External Services and Dependency Policy

The prototype should minimize external live dependencies.

## Required core dependency

```text
Firebase / Firestore
```

## Optional dependency

```text
Map provider
```

The product must remain logically functional without a live maps API.

Distance calculation should be independently computable.

## Optional dependency

```text
LLM provider
```

The product must remain fully functional if the LLM explanation service is unavailable.

## Explicitly avoided unless core MVP is complete

```text
Telephony / SMS
WhatsApp automation
Other nonessential live service integrations
```

The reason is reliability: the PRD intentionally prefers Firestore realtime alerts over introducing another externally verified, network-dependent component during the live demo.

---

# 23. Secrets and Environment Configuration

No API keys, passwords, tokens, or private credentials may be committed to GitHub.

The repository should contain:

```text
.env.example
```

and the real local file:

```text
.env
```

must remain ignored by Git.

Example categories only:

```text
FIREBASE_* environment values where applicable
MAPS_* optional
LLM_* optional
```

The exact variable names are to be finalized when the implementation configuration is created.

---

# 24. Demo-Oriented Architecture

The architecture is designed around a live demonstration with at least two simultaneously active interfaces.

## Device A — Ambulance

```text
Create case
→ Need profile
→ Find hospital
→ Pending
→ Accepted / Rerouted
```

## Device B — Hospital

```text
Incoming request
→ Audible/visual alert
→ Countdown
→ Accept / Reject
→ Capability held
```

## Device C — Admin

```text
Map
→ hospital status
→ reliability
→ audit trail
```

The system must support all three independently connecting to the same backend state.

---

# 25. Failure Modes and Architectural Responses

| Failure | Expected architectural response |
|---|---|
| Hospital rejects | Create audit record, mark attempt unsuccessful, move to next candidate. |
| Hospital times out | Mark request timed out, create audit record, automatically reroute. |
| Hospital data is stale | Mark/de-prioritize the hospital and expose stale/unknown status. |
| Resource became unavailable between ranking and acceptance | Transactional acceptance check fails; do not double-allocate; reroute. |
| Two requests compete for one slot | Transaction determines one valid allocation; competing request sees updated state and must be rerouted or rejected. |
| LLM explanation service fails | Show deterministic structured explanation derived from score factors. |
| Map provider fails | Continue with coordinates and computed distance; map visualization becomes degraded rather than breaking routing logic. |
| Realtime connection temporarily interrupts | Firebase client reconnection behavior should restore listeners; UI must not invent new authoritative state locally. |
| No candidate satisfies required capabilities | Return a clearly defined "no confirmed match" outcome rather than fabricating an acceptance. |
| Final candidate rejects/times out | End the reroute chain with an explicit unresolved state and audit record. |
| User double-clicks Accept | Domain layer must make acceptance idempotent and state-aware. |
| User attempts invalid state transition | Reject the action and preserve the current valid state. |

---

# 26. Security / Integrity Boundaries

This is a hackathon prototype, not a production medical system, but the architecture should still avoid obviously unsafe patterns.

## Client is not authoritative

Clients can request actions, but they should not be trusted to define:

- acceptance timestamps,
- final request status,
- capability decrement semantics,
- reliability values,
- audit history.

Those values should be created/validated by the backend/data layer.

## Demo authentication

The PRD permits seeded hospital sessions without full authentication for the demonstration.

The prototype should therefore clearly treat hospital identity as controlled demo context rather than implying production-grade identity verification.

## Medical data minimization

The project should only collect the case information necessary for the demo workflow. It should not encourage arbitrary free-text medical records when structured fields are enough.

---

# 27. Observability for the Hackathon

A small amount of observability will dramatically reduce debugging time.

The backend/domain layer should provide clear logs around:

```text
match started
match result
request created
request accepted
request rejected
request timeout
reroute triggered
resource hold attempted
resource hold succeeded/failed
audit event written
```

Logs should avoid exposing unnecessary patient information.

The frontend should make important state transitions visually obvious during testing.

---

# 28. Testing Architecture

Testing should occur at three levels.

## Level 1 — Pure logic tests

Owned mainly by Person 1:

- need-profile generation,
- score calculations,
- ranking order,
- stale-data behavior,
- mass-casualty assignment.

## Level 2 — Backend integration tests

Owned mainly by Person 2:

- request creation,
- accept/reject/timeout transitions,
- transactions,
- audit writes,
- reliability updates.

## Level 3 — End-to-end tests

Owned jointly:

```text
Ambulance UI
→ Firestore
→ Hospital UI
→ Accept
→ Firestore
→ Ambulance UI
```

Then:

```text
Reject
→ reroute
→ second hospital
→ accept
```

Then:

```text
Timeout
→ reroute
→ second hospital
```

Then:

```text
Two concurrent requests
→ one scarce resource
→ verify no double allocation
```

Then:

```text
Mass casualty
→ 4 cases
→ distributed plan
```

Then:

```text
Stale hospital
→ de-prioritized
```

Then:

```text
Audit dashboard
→ verify events exist
```

The technical rules explicitly require testing the main user flow, input validation, API connectivity, database operations, error handling, and responsiveness where applicable.

---

# 29. Architecture-to-PRD Traceability

The following maps the main PRD requirements to architecture components.

| PRD requirement | Architecture response |
|---|---|
| Capability matching | Matching Engine |
| Structured symptom → need profile | Need-Profile Rules Engine |
| Match by capability + distance + load | Scoring pipeline |
| Why-this-hospital explanation | Score breakdown + optional explanation layer |
| Accept / Reject | Request state machine |
| Timeout | Countdown + timeout transition |
| Automatic reroute | Candidate list + reroute controller |
| Concurrency-safe holds | Firestore transaction |
| Audit log | Audit event architecture |
| Reliability | Event-derived reliability service |
| Mass casualty | `incident_group_id` + joint batch allocation |
| Mid-transit reroute | Realtime capability state + reroute flow |
| Stale-data fallback | `last_updated_at` + freshness adjustment |
| Human confirmation | UI labeling + explicit acceptance action |
| Admin dashboard | Oversight application |
| Working UI | Ambulance + Hospital + Admin frontend |
| Public/aggregate accountability | Reliability + audit dashboard |

---

# 30. Architecture Decisions That Are Locked

The following are considered architectural commitments for implementation unless the team explicitly changes this document.

1. The product is an ambulance ↔ hospital coordination system, not a generic hospital bed dashboard.
2. Capability matching is the core routing function.
3. Acceptance is an active hospital commitment.
4. Rejection and timeout trigger automatic rerouting.
5. Scarce capacity must be held/decremented transactionally.
6. Hospital status includes freshness.
7. Every important decision generates an audit trail.
8. Mass-casualty cases are grouped through `incident_group_id` and solved jointly.
9. The ranking engine remains deterministic and explainable.
10. AI, when present, is an optional explanation layer rather than the authoritative routing decision.
11. Firestore is the shared realtime state layer.
12. The frontend contains three logical experiences: ambulance, hospital, and admin/oversight.
13. `main` is the stable Git integration branch.
14. The three people have separated implementation ownership but collectively understand the architecture.
15. The MVP must remain functional without optional telephony/SMS integrations.

---

# 31. Architecture Decisions Still Requiring Explicit Specification

These are **not missing concepts**; they are implementation details that should be frozen in `spec.md` before coding.

## 31.1 Exact score formula

The PRD states the components of the score but does not fully prescribe numerical normalization and weights.

`spec.md` must define:

- capability score calculation,
- distance normalization,
- load normalization,
- stale-data adjustment,
- tie-breaking,
- impossible-match handling.

## 31.2 Exact stale threshold

`spec.md` must define when a hospital moves from current to stale/unknown.

## 31.3 Exact countdown duration

The demo PRD mentions a short countdown such as 90 seconds but the prototype needs one explicit value.

That value belongs in configuration, not hard-coded into multiple components.

## 31.4 Exact resource consumption rules

`spec.md` must say which resource is consumed for which capability requirement.

## 31.5 Exact timeout implementation

The system must define whether timeout detection occurs through:

- client timer plus server-side validation,
- scheduled backend action,
- or another deterministic method.

Client display must never be the sole source of truth for a timeout.

## 31.6 Exact mass-casualty allocation algorithm

The prototype needs a deterministic allocation strategy that is simple enough to explain during Q&A.

## 31.7 Exact post-acceptance mid-transit failure behavior

The PRD requires mid-transit rerouting but the detailed trigger/transition rules need to be frozen.

## 31.8 Exact Firestore collection and index layout

This belongs in `data-model.md` and `spec.md` after the schema is finalized.

## 31.9 Exact frontend routing structure

The application may use a single React app with role routes rather than physically separate applications. The implementation should choose the simplest structure that allows the three experiences to work independently.

---

# 32. Recommended Implementation Shape

For the 18-hour constraint, the architecture should favor a **single deployable web application with clearly separated role experiences** rather than three independently deployed frontends.

Conceptually:

```text
Single React application
│
├── /ambulance
├── /hospital
└── /admin
```

and a shared backend/domain layer:

```text
Firebase
│
├── Firestore
├── server-side/domain functions
└── shared rules/services
```

This still satisfies the product's multi-interface requirement while reducing deployment and integration overhead.

The live demo can open the same application in multiple browsers/devices with different role routes.

---

# 33. Why This Architecture Fits the Hackathon

The official technical rules require a functional prototype, meaningful Git development, a stable `main`, reproducible setup, documented architecture/APIs/database, and a working demo/deployment where applicable.

This architecture supports those requirements by minimizing infrastructure that the team must maintain while maximizing visible end-to-end behavior.

The project can demonstrate real engineering depth through:

- deterministic matching,
- capability-based scoring,
- realtime state propagation,
- transactional reservation/holds,
- automatic rerouting,
- stale-data handling,
- joint mass-casualty allocation,
- auditability,
- and a multi-interface live flow.

---

# 34. First Vertical Slice Required Before Expanding Scope

Before implementing the full feature set, the architecture requires a working vertical slice:

```text
Ambulance creates cardiac case
        ↓
Need profile generated
        ↓
Hospital ranked
        ↓
REQUEST created
        ↓
Hospital receives realtime request
        ↓
Hospital accepts
        ↓
Resource hold succeeds
        ↓
Audit event written
        ↓
Ambulance receives accepted state
```

This is the minimum proof that the architecture is actually connected end-to-end.

Only after this vertical slice works should the team expand into:

```text
Reject
→ Timeout
→ Auto-reroute
→ Concurrency
→ Mass casualty
→ Stale data
→ Mid-transit reroute
→ Reliability
→ Admin/audit polish
```

---

# 35. Definition of Architectural Completion

This architecture document is considered ready for implementation when the three teammates can independently answer all of the following without contradiction:

### Product flow

- What happens from case creation to acceptance?
- What happens on rejection?
- What happens on timeout?
- What happens if the first hospital becomes unsuitable?
- What happens when two ambulances compete for the same scarce capacity?
- How is mass casualty different from repeated single-case routing?

### Data

- Where is hospital state stored?
- Where is request state stored?
- How is a case represented?
- Where is audit history stored?
- How is reliability derived?

### Technology

- Why is Firestore used?
- Why is the matching algorithm deterministic?
- Where can AI be used safely?
- How is distance calculated?
- What happens if the map/LLM service fails?

### Team boundaries

- Which files does Person 1 own?
- Which files does Person 2 own?
- Which files does Person 3 own?
- Which interfaces must be agreed upon before changes are merged?

### Git

- What is `main`?
- What branch does each teammate work on?
- When is a pull request opened?
- What conditions must be satisfied before merging?

If these answers are stable, the project is ready for the next foundation document: `data-model.md`.

---

# 36. Source Alignment

This architecture is derived from the locked PRD and the official hackathon technical rules provided to the team.

The PRD explicitly states that `PRD_Final.md` supersedes the older planning files and is the single source of truth for the build. It also defines the locked scope around capability matching, accept/reject/timeout with rerouting, concurrency-safe holds, audit logging, mass-casualty mode, stale-data fallback, human-confirmation framing, and accountability. It defines the core data objects and workflow and specifies Firebase/Firestore realtime as the preferred realtime layer. 

The technical rules require a working prototype, meaningful contributions from every member, use of feature branches merged into a stable `main`, reproducible setup instructions, documented APIs/database/architecture, no committed secrets, and disclosure of substantial AI-assisted work.

---

# 37. Next Document in the Foundation Sequence

The next document should be:

```text
data-model.md
```

It will freeze the actual Firestore collections/documents, field names, field types, relationships, enumerations, indexes/query patterns, transactional fields, audit snapshots, sample seed data, and migration/seed strategy.

No feature implementation should begin until that document and the API contract are also frozen.
