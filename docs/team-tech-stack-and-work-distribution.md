# RAAHI — TEAM TECHNOLOGY STACK & WORK DISTRIBUTION
## Common Engineering Coordination Document

**Project:** Raahi — Capability-Match Ambulance–Hospital Coordination System  
**Hackathon:** CodeCraft / Technofora '26  
**Track:** HealthTech — Accessible Care & Intelligent Patient Support  
**Team Size:** 3  
**Build Window:** Approximately 18 hours  
**Status:** Pre-implementation team coordination document  
**Purpose:** Establish one shared technical baseline, clear ownership boundaries, integration rules, Git workflow, and substitution rules so all three developers can work in parallel without creating incompatible implementations.

---

# 1. Document Purpose

This document is the **team coordination layer** above the detailed engineering specifications.

The project already has the following authoritative documents:

```text
docs/PRD_Final.md
docs/architecture.md
docs/data-model.md
docs/api-contract.md
docs/spec.md
docs/plans.md
docs/tasks.md
docs/mobile-demo.md
```

These documents define the product, behavior, data model, API/realtime contract, implementation rules, execution plan, tasks, and later mobile-demo scope.

This document does **not** replace those documents.

Its purpose is to answer the practical team questions:

```text
What are we building with?
Who owns what?
Where does each person's code live?
What may one person change?
What must remain shared?
How can we substitute a technology without breaking integration?
How do we merge safely?
What must be true before code is merged into main?
```

When this document conflicts with a more detailed frozen specification, the more detailed frozen specification remains authoritative unless the team explicitly updates the relevant documents.

---

# 2. Core Engineering Principle

The team may use different implementation techniques or libraries internally, but the final system must behave as **one coherent system**.

The rule is:

> **Implementation details may vary; integration contracts may not.**

The three branches must converge on the same:

- domain concepts,
- Firestore data model,
- request state machine,
- matching behavior,
- resource-hold semantics,
- audit semantics,
- public API/service contract,
- realtime event/state expectations,
- frontend/backend data shapes,
- environment-variable strategy,
- error conventions,
- testing expectations.

A developer must not introduce a local implementation that silently changes one of these shared contracts.

---

# 3. Current Reference Stack

The current repository scaffold and frozen specifications use the following baseline.

| Layer | Reference Technology | Status |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | Reference |
| Styling | Tailwind CSS | Reference |
| Routing | React Router | Reference |
| Icons | Lucide React | Reference |
| Map/UI geography | Leaflet + OpenStreetMap or equivalent | Optional/reference |
| Realtime client | Firebase client SDK + `onSnapshot` | Required direction |
| Database | Firebase Firestore | Required direction |
| Backend execution | Firebase Cloud Functions v2 / Node.js + TypeScript | Preferred current implementation |
| Backend SDK | Firebase Admin SDK | Preferred |
| Matching engine | Deterministic TypeScript domain logic | Required behavior |
| Distance | Haversine calculation | Preferred / fallback |
| Testing | Vitest | Reference |
| Deployment | Firebase Hosting or Vercel | Either is acceptable |
| Optional AI | LLM used only for explanation phrasing | Optional, non-authoritative |
| Optional maps API | Google Maps / OpenRouteService | Optional |
| Package management | npm workspaces | Current repository setup |

Current repository structure:

```text
/
├── frontend/
├── functions/
├── docs/
├── scripts/
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

`functions/` is the backend boundary in the current scaffold.

A separate `backend/` directory is **not required** and must not be created solely to rename the Firebase Functions backend.

---

# 4. Technology Substitution Policy

The team may discover a better library, framework feature, or implementation approach during the hackathon.

That is acceptable only when the substitute preserves the shared integration boundary.

## 4.1 Allowed substitutions

Examples:

```text
Leaflet
    ↕
another map component
```

or:

```text
Firebase Cloud Functions
    ↕
another Node.js server boundary
```

or:

```text
plain React component
    ↕
another React-compatible UI component library
```

provided the substitution does not break the shared contract.

## 4.2 Required compatibility checks

Before adopting a substitute, verify:

### A. Data compatibility

The same canonical entities remain available:

```text
HOSPITAL
CASE
REQUEST
AUDIT_LOG
```

with the fields and semantics defined in `data-model.md`.

### B. Behavioral compatibility

The same rules remain intact:

```text
need profile
→ eligibility
→ scoring
→ ranking
→ request
→ accept/reject/timeout
→ hold/release
→ reroute
→ audit
```

### C. Realtime compatibility

The frontend must still be able to observe the authoritative state changes required by the demo.

### D. API compatibility

The frontend cannot be forced to understand implementation-specific backend internals.

### E. Deployment compatibility

The whole application must remain reproducible on another machine and deployable within the hackathon constraints.

## 4.3 Substitutions that require team approval

Do not independently replace any of these:

```text
Firestore
canonical data model
request state machine
matching semantics
resource-hold semantics
shared API/realtime contract
authentication/authorization boundary
```

A major stack change must be agreed by all three members and reflected in the relevant documentation before dependent implementation proceeds.

---

# 5. Shared Architecture

The system is one application with three role-oriented experiences.

```text
                    RAAHI
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   /ambulance    /hospital      /admin
        │            │            │
        └────────────┼────────────┘
                     │
                     ▼
             Shared Backend
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   Matching      Request/       Audit &
    Engine        State         Reliability
        │            │            │
        └────────────┼────────────┘
                     ▼
                 Firestore
                     │
                     ▼
              Realtime Updates
```

The main architectural boundary is:

```text
Frontend
   ↓
Shared contract / service layer
   ↓
Backend/domain logic
   ↓
Firestore
```

The frontend must not duplicate authoritative matching, timeout, resource reservation, or reliability logic.

---

# 6. Non-Negotiable Integration Contracts

The following are shared across all three branches.

## 6.1 Canonical entities

The primary entities are:

```text
Hospital
Case
Request
AuditLog
```

The detailed field definitions are in:

```text
docs/data-model.md
```

No developer should invent a competing version such as:

```text
hospitalData
hospitalRecord
facility
hospitalInfo
```

for the same canonical concept without an explicit reason.

Use one canonical domain vocabulary.

---

# 7. Canonical Domain Responsibilities

## 7.1 Hospital

Represents current hospital capability and status.

Important fields include:

```text
id
name
lat
lng
trauma_team_on_shift
specialists_on_call
icu_beds_free
ventilators_free
blood_stock
er_load_score
accepts_scheme_patients
last_updated_at
reliability_score
```

The authoritative field semantics are in `data-model.md`.

## 7.2 Case

Represents an ambulance-side case.

Important concepts include:

```text
category
severity
need_profile
vitals_summary
onset_time
treatment_administered
patient_basic_info
incident_group_id
```

The case should remain a structured object rather than an unstructured text blob.

## 7.3 Request

Represents an active or historical hospital request attempt for a case.

Important states include:

```text
pending
accepted
rejected
timed_out
superseded
```

The complete lifecycle belongs to the backend.

## 7.4 AuditLog

Records what the system did and why.

Every meaningful request-state transition must be auditable.

---

# 8. Shared State Machine

All developers must use the same conceptual flow:

```text
CASE CREATED
     │
     ▼
NEED PROFILE GENERATED
     │
     ▼
MATCHING / RANKING
     │
     ▼
REQUEST SENT
     │
     ▼
PENDING
   ┌─┼───────────────┐
   │ │               │
   ▼ ▼               ▼
ACCEPTED          REJECTED      TIMED_OUT
   │                 │              │
   ▼                 └──────┬───────┘
RESOURCE HOLD                │
   │                         ▼
   ▼                     AUTO-REROUTE
IN TRANSIT                    │
   │                          ▼
   ▼                     NEXT CANDIDATE
COMPLETED / HANDOFF
```

The exact transitions, transaction behavior, and edge cases are frozen in `spec.md`.

The UI may display state.

The backend owns authoritative state changes.

---

# 9. Matching Engine Contract

The ranking engine is deterministic.

Conceptually:

```text
CASE
  ↓
NEED PROFILE
  ↓
HARD ELIGIBILITY
  ↓
CAPABILITY FACTOR
  ↓
DISTANCE FACTOR
  ↓
LOAD FACTOR
  ↓
FRESHNESS FACTOR
  ↓
FINAL SCORE
  ↓
DETERMINISTIC TIE-BREAKING
  ↓
RANKED CANDIDATES
```

The currently frozen prototype rules include:

```text
Haversine radius = 6371 km

distance_factor =
    max(0.35, 1 / (1 + distance_km / 5))

freshness:
    ≤ 10 min      → fresh
    > 10–30 min   → stale
    > 30 min      → unknown

freshness factors:
    1.00 / 0.85 / 0.70

load factor:
    score 1 → 1.00
    score 2 → 0.88
    score 3 → 0.76
    score 4 → 0.64
    score 5 → 0.52

final_score =
    capability_factor
    × distance_factor
    × load_factor
    × freshness_factor
    × 100
```

Capability groups and tie-breakers are defined in `spec.md`.

**Important:** these formulas belong to P1's domain engine and must not be independently reimplemented inside the frontend or P2's request orchestration layer.

---

# 10. Team Structure

The team has exactly three implementation owners.

```text
P1 — Backend Core + Matching
P2 — Backend Realtime + State + AI/Infrastructure
P3 — Frontend
```

Each person owns a branch.

| Person | Branch | Primary Boundary |
|---|---|---|
| P1 | `backend-core` | Deterministic domain/matching engine |
| P2 | `backend-realtime-ai` | Firebase, request lifecycle, transactions, audit, reliability, optional AI |
| P3 | `frontend` | React application and all role interfaces |

---

# 11. P1 — Backend Core + Matching

## Branch

```text
backend-core
```

## Ownership

P1 owns the domain logic that answers:

> Given a case and the current hospital state, which hospitals are eligible and how are they ranked?

## Primary responsibilities

### Domain types

Create or own the shared/backend representation of:

```text
Hospital
Case
NeedProfile
MatchResult
CandidateScoreBreakdown
```

Do not create a competing schema from the definitions in `data-model.md`.

### Need-profile rules

Implement deterministic lookup rules.

Current prototype examples:

```text
cardiac
    → cardiologist
    → ECG
    → ICU

trauma
    → trauma team
    → ICU
    → O-

obstetric
    → OBGYN
    → maternity

pediatric
    → pediatrician
    → pediatric emergency
```

These are prototype rules, not clinical standards.

### Eligibility

Hard eligibility occurs **before** scoring.

A hospital that cannot satisfy a mandatory capability must not appear as a normal scored candidate merely because it is close.

### Distance

Implement the Haversine calculation using hospital and case coordinates.

### Scoring

Implement:

```text
capability
distance
load
freshness
final score
tie-breakers
```

### Ranking

Return deterministic ranked candidates.

Identical inputs must produce the same ranking.

### Mass casualty

Implement the deterministic batch-allocation behavior defined in `spec.md`.

The algorithm must account for:

```text
severity
constrained needs
hospital capacity
candidate limits
resource simulation
concentration penalty
```

### Tests

P1 owns tests for:

```text
need-profile mapping
eligibility
distance
scoring
tie-breaking
stale data
resource-aware ranking assumptions
mass-casualty allocation
edge cases
```

## P1 must NOT own

P1 should not become the owner of:

```text
React UI
Firestore listeners
request countdown UI
request persistence workflow
hospital authentication UI
admin dashboard UI
LLM provider integration
```

If those are needed for integration, expose clean functions/types for P2 and P3 rather than duplicating implementation.

---

# 12. P2 — Backend Realtime + State + AI/Infrastructure

## Branch

```text
backend-realtime-ai
```

## Ownership

P2 owns the server-side application boundary and the authoritative realtime lifecycle.

P2 answers:

> How is the ranked candidate turned into a safe, observable, auditable live request?

## Primary responsibilities

### Firebase initialization

Own:

```text
Firebase Admin SDK
Cloud Functions
Firestore access
server-side configuration
```

### Request lifecycle

Implement:

```text
create request
send request
pending
accept
reject
timeout
supersede
reroute
```

### Authoritative timeout

The server/backend is authoritative.

The client countdown is only a display.

Do not make a client timer the sole source of truth for timeout decisions.

### Transactions and resource holds

Use Firestore transactions for countable shared resources.

Examples:

```text
ICU bed
ventilator
blood unit
```

A successful acceptance must safely reserve/decrement the relevant resource.

Concurrent requests must not be allowed to double-claim the same capacity.

### Release behavior

P2 owns correct release behavior for:

```text
rejected requests
timed-out requests
superseded requests
failed/rolled-back holds
```

### Auto-rerouting

When the current request fails:

```text
reject
timeout
critical capability failure
```

the next candidate is calculated and attempted without requiring the ambulance user to restart the entire case.

Previously attempted hospitals must be excluded appropriately.

### Audit

Every meaningful state transition must produce an audit event.

At minimum, the system must preserve:

```text
request identity
event type
timestamp
decision-time snapshot/relevant state
```

### Reliability

Maintain the prototype reliability model:

```text
honored commitments
-------------------
accepted commitments
```

If there is no accepted history, represent the hospital as having no history rather than manufacturing a score.

### Seed data

P2 owns seed/demo data for approximately:

```text
6–10 fictional hospitals
3–4 case categories
different capability profiles
different load levels
different freshness states
```

### Realtime

Own backend-side state propagation so that:

```text
ambulance action
     ↓
Firestore/backend state
     ↓
hospital listener
     ↓
instant UI update
```

and similarly:

```text
hospital action
     ↓
Firestore/backend state
     ↓
ambulance/admin listeners
```

### Optional AI

AI is allowed only as an explanation layer.

Example:

```text
Structured score breakdown
        ↓
optional LLM
        ↓
human-readable explanation
```

AI must NOT become the authoritative matching/ranking engine.

A deterministic fallback must exist.

AI failure must not break routing.

## P2 must NOT own

P2 should not own:

```text
main frontend UI implementation
React page layout
primary map visual design
client-side duplicate matching algorithms
```

---

# 13. P3 — Frontend

## Branch

```text
frontend
```

## Ownership

P3 owns the complete React user-facing application.

The application is one frontend with role-oriented routes.

```text
/ambulance
/hospital/:hospitalId
/admin
```

## Primary responsibilities

### Application shell

Own:

```text
routing
layouts
navigation
responsive behavior
loading/error/empty states
shared UI components
```

### Ambulance experience

Implement:

```text
case intake
case category
severity
structured patient/case details
need-profile preview
Find Hospital / route action
request status
countdown display
accepted destination
reroute messaging
mass-casualty mode
```

The later mobile-demo document adds a compact phone experience. It should reuse the same `/ambulance` route and the same backend truth.

### Hospital experience

Implement:

```text
hospital identity
capability profile
incoming request queue
request details
countdown
Accept
Reject
resource/status visibility
reliability badge
```

### Admin experience

Implement:

```text
hospital overview/map
current status
reliability
request activity
audit trail
system-level visibility
```

### Realtime UI

P3 subscribes to backend/Firestore state.

The frontend should react to state rather than invent it.

For example:

```text
Firestore request.status = "accepted"
        ↓
frontend observes change
        ↓
ambulance UI shows Accepted
```

The frontend must not decide:

```text
"the timer visually reached zero, therefore backend status is timed_out"
```

That decision belongs to the authoritative backend.

### Map

Use Leaflet/OpenStreetMap or another compatible map implementation.

The map is a visualization layer.

The matching engine remains independent from the map provider.

### Tests

P3 owns:

```text
component tests
route tests
important interaction tests
loading/error/empty states
basic responsive behavior
realtime-state rendering
```

## P3 must NOT own

P3 should not independently implement:

```text
authoritative scoring
hospital eligibility
resource reservation
timeout truth
reliability computation
backend-only security rules
```

UI helper calculations are acceptable only when they are clearly presentational and do not become a second source of truth.

---

# 14. Cross-Team Shared Ownership

Some responsibilities cannot belong to only one developer.

## Shared contract review

All three developers must understand:

```text
data model
request state machine
API/realtime events
environment setup
branch workflow
demo scenarios
```

## Shared integration responsibility

P1:

```text
matching output must be consumable by P2
```

P2:

```text
backend state must be consumable by P3
```

P3:

```text
frontend must accurately represent P2's canonical state
```

## Shared testing

Before final merge, all three members should verify the principal vertical slices together.

---

# 15. Recommended Code Boundaries

Current implementation should generally follow the existing repository structure.

```text
frontend/
    src/
        components/
        pages/
        routes/
        services/
        hooks/
        types/
        utils/

functions/
    src/
        matching/
        routing/
        resources/
        audit/
        reliability/
        ai/
        services/
        types/
```

These are boundaries, not a requirement to create every directory immediately.

A developer should avoid placing logic in another owner's area merely because the file exists nearby.

---

# 16. Shared Types Strategy

The team must avoid this failure mode:

```text
P1 defines Request.status as:

"accepted"

P2 defines Request.status as:

"ACCEPTED"

P3 expects:

"confirmed"
```

Use one canonical representation.

Preferred approach:

```text
single source of truth
        ↓
shared domain types / contracts
        ↓
backend + frontend consume the same semantics
```

If physically sharing a TypeScript package is practical, do so.

If not, maintain deliberately synchronized contract types and document the source of truth.

The important rule is semantic identity, not a specific packaging mechanism.

---

# 17. API / Service Boundary

P3 should consume a stable service contract rather than reaching into backend internals.

Conceptually:

```text
Frontend
   │
   ├── createCase()
   ├── requestHospitalMatch()
   ├── getCurrentRequest()
   ├── acceptRequest()
   ├── rejectRequest()
   ├── subscribeToRequest()
   ├── subscribeToHospital()
   └── subscribeToAuditActivity()
```

The exact callable functions, HTTPS endpoints, Firestore listeners, payloads, status codes, and error contracts belong to:

```text
docs/api-contract.md
```

When an endpoint/contract changes:

```text
1. update api-contract.md
2. notify P1/P2/P3 as affected
3. update implementation
4. update consumers
5. run integration tests
```

Do not silently change payload shape.

---

# 18. Firestore Rules

Firestore is the shared state layer.

All developers must follow:

```text
docs/data-model.md
docs/spec.md
```

Important principle:

> Firestore stores shared state; it is not a reason to move domain decisions into arbitrary client code.

Transactions must be used where the operation depends on current shared capacity.

Examples:

```text
read ICU count
check availability
reserve/decrement
write resulting request/hold state
```

These must be safe against simultaneous requests.

---

# 19. Environment and Secrets

No secrets may enter Git.

Never commit:

```text
API keys
Firebase private credentials
service-account JSON
passwords
tokens
private URLs containing secrets
```

Tracked:

```text
.env.example
```

Ignored:

```text
.env
```

Use safe placeholders in `.env.example`.

If a new environment variable is introduced:

```text
1. add variable name to .env.example
2. document its purpose
3. add validation/default behavior
4. never insert the real secret
```

---

# 20. External Dependencies

Every external library/service must be intentionally chosen.

Examples:

```text
Firebase
Leaflet
OpenStreetMap
Lucide
React Router
LLM provider
Google Maps/OpenRouteService
```

Document major external dependencies and their purpose.

Avoid adding a live external service for a feature that can safely be demonstrated without it.

Especially for the live demo, prefer:

```text
deterministic local calculation
+
Firestore realtime state
```

over unnecessary third-party dependencies.

---

# 21. AI Policy

AI/LLM functionality is optional.

The system must work without it.

Allowed:

```text
structured match breakdown
        ↓
LLM
        ↓
plain-language explanation
```

Not allowed as authoritative behavior:

```text
case text
   ↓
LLM decides hospital
```

The matching result must remain deterministic and explainable.

Also:

```text
AI-generated code/content
```

must be disclosed according to the hackathon requirements, and every team member must understand the code they personally submit.

---

# 22. Git Branching Model

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

Diagram:

```text
                    main
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
 backend-core  backend-realtime-ai  frontend
        │            │            │
        └──────┬─────┴─────┬──────┘
               ▼           ▼
             PRs → review → main
```

## Rules

### `main`

```text
stable
demo-safe
integration target
```

Do not develop unfinished features directly on `main`.

### Developer branches

Each developer works only in their assigned branch unless explicitly coordinating an integration branch or temporary feature branch.

### Pull requests

Before merging:

```text
branch is pushed
tests pass
build passes
changes are understandable
no secrets
contract changes are documented
no unrelated files were modified
```

The repository owner/integration lead controls the merge into `main`.

---

# 23. Commit Rules

The hackathon requires meaningful commit history.

Target approximately:

```text
one meaningful commit every 1–2 hours
```

Each member must have at least:

```text
2 genuine, explainable commits
```

Avoid:

```text
"update"
"changes"
"final"
"stuff"
```

Prefer:

```text
feat(matching): add deterministic need profile rules
feat(requests): add transactional resource holds
feat(frontend): add hospital request queue
test(matching): cover stale hospital ranking
fix(routing): prevent reroute to attempted hospital
```

A commit should represent a coherent engineering step.

Do not create artificial commits solely to inflate history.

---

# 24. What Antigravity / AI Coding Agents May and May Not Do

AI coding agents may be used to accelerate implementation.

They must operate within the assigned branch boundary.

## Allowed

```text
inspect repository
read docs
implement assigned code
write tests
run builds
run tests
explain changes
```

## Not delegated to the coding agent

The repository owner should personally control:

```text
git commit
git push
branch creation
branch deletion
PR merge
main protection
```

Agents must not independently change another person's work boundary.

An agent should stop and ask/flag when:

```text
shared contract must change
data model must change
API contract must change
architecture must change
scope must expand
another branch's implementation must be modified
```

---

# 25. Integration Protocol

The team should integrate in small vertical slices rather than waiting until the end.

## Slice 1 — Baseline routing

```text
Ambulance creates case
        ↓
need profile
        ↓
matching
        ↓
request sent
        ↓
hospital receives it
        ↓
hospital accepts
        ↓
ambulance sees accepted state
```

This is the first mandatory end-to-end slice.

## Slice 2 — Failure path

```text
reject
   OR
timeout
   ↓
audit
   ↓
reroute
   ↓
next hospital
```

## Slice 3 — Resource safety

```text
two competing requests
        ↓
transaction
        ↓
no double allocation
```

## Slice 4 — Mass casualty

```text
incident group
    ↓
multiple cases
    ↓
batch allocation
    ↓
multiple hospitals
```

## Slice 5 — Stale data

```text
old hospital update
    ↓
freshness classification
    ↓
de-weight / unknown handling
```

## Slice 6 — Accountability

```text
request lifecycle
    ↓
audit history
    ↓
reliability view
```

Do not spend large amounts of time polishing pages while the first vertical slice is still broken.

---

# 26. Integration Order by Hour

## H0–H1 — Contract Alignment

All three:

```text
read frozen docs
confirm shared entities
confirm state machine
confirm API/realtime contract
confirm branch ownership
confirm local setup
```

Do not invent new schemas during this period.

## H1–H5 — Parallel Core Build

P1:

```text
matching domain
need rules
eligibility
scoring
tests
```

P2:

```text
Firebase
Firestore service layer
request state
transactions
audit foundation
```

P3:

```text
React routes
shared UI
ambulance shell
hospital shell
admin shell
```

## H5–H7 — First Integration

Target:

```text
Scenario A
```

A real case should move through:

```text
ambulance
→ backend
→ hospital
→ accept
→ ambulance
```

At this point, the team has a demonstrable base system.

## H7–H9 — Failure Handling

Build and integrate:

```text
reject
timeout
auto-reroute
holds
release behavior
```

## H9–H12 — Flagship Batch Flow

Build:

```text
mass-casualty distribution
```

Validate it end-to-end.

## H12–H13 — Resilience + Audit

Build/integrate:

```text
stale-data fallback
audit log
```

## H13–H15 — Finish Locked MVP

Complete remaining locked MVP items.

If the core scenarios are unstable, do not use this time for nonessential polish.

## H15–H16 — Rehearsal

Run all major scenarios using actual demo devices:

```text
A — clean match
B — reject/timeout + reroute
C — mass casualty
D — stale data
E — audit/reliability
```

## H16–H17 — Submission Engineering

Verify:

```text
README
architecture
API documentation
database documentation
setup instructions
AI disclosure
external dependency disclosure
security/secrets
build/test
```

## H17–H18 — Demo + Freeze

```text
record ≤5-minute demo
final smoke test
final Git review
freeze submission state
```

---

# 27. Definition of Done — P1

P1 is integration-ready when:

```text
[ ] deterministic need-profile rules exist
[ ] hard eligibility works
[ ] distance calculation works
[ ] capability scoring works
[ ] load factor works
[ ] freshness factor works
[ ] final score works
[ ] tie-breaking is deterministic
[ ] ranked candidate output is stable
[ ] mass-casualty allocator works
[ ] unit tests pass
[ ] public types/return shapes are documented
[ ] no Firebase/UI ownership has been accidentally absorbed
```

---

# 28. Definition of Done — P2

P2 is integration-ready when:

```text
[ ] Firebase/Admin initializes
[ ] Firestore service layer works
[ ] case/request writes work
[ ] request lifecycle is authoritative
[ ] server-side timeout logic is authoritative
[ ] accept/reject work
[ ] transactions protect shared capacity
[ ] holds can be released safely
[ ] reroute excludes attempted hospitals appropriately
[ ] audit events are written
[ ] reliability calculation exists
[ ] seed/demo data exists
[ ] realtime listeners receive state changes
[ ] deterministic fallback exists when AI is unavailable
[ ] tests/build pass
```

---

# 29. Definition of Done — P3

P3 is integration-ready when:

```text
[ ] React app builds
[ ] /ambulance exists
[ ] /hospital/:hospitalId exists
[ ] /admin exists
[ ] ambulance case intake works
[ ] need profile can be displayed
[ ] hospital request queue works
[ ] accept/reject controls work
[ ] countdown is displayed correctly
[ ] accepted/rerouted states render correctly
[ ] mass-casualty UI exists
[ ] admin status/audit view exists
[ ] realtime state changes update the UI
[ ] loading/error/empty states exist
[ ] responsive phone view works
[ ] tests/build pass
```

---

# 30. Cross-Team Definition of Done

The system is not considered integrated until:

```text
[ ] ambulance can create a real case
[ ] P1 matching result can be consumed by P2
[ ] P2 can create/send a request
[ ] hospital UI receives the request in realtime
[ ] hospital can accept/reject
[ ] backend changes state authoritatively
[ ] ambulance UI reflects the new state
[ ] rejected/timeout requests reroute automatically
[ ] resource holds are safe under concurrency
[ ] audit trail is generated
[ ] stale hospitals are handled according to spec
[ ] mass-casualty mode works
[ ] admin view reflects real backend data
[ ] no branch relies on private local-only data
[ ] no secrets are committed
[ ] build/test succeeds
[ ] another teammate can run the project from documented instructions
```

---

# 31. Change-Control Rules

The following changes must be treated as **shared decisions**:

```text
changing Firestore schema
changing request states
changing scoring formula
changing eligibility rules
changing timeout semantics
changing resource-hold behavior
changing API payloads
changing realtime event semantics
changing the primary database
changing authentication/authorization boundaries
adding a major external service
adding a major feature outside locked scope
```

Process:

```text
proposed change
      ↓
impact check
      ↓
team agreement
      ↓
update docs
      ↓
implement
      ↓
integration test
```

Never let code silently become the new specification.

---

# 32. Testing Philosophy

Testing should follow the architecture.

## Unit tests

Mainly owned by the component responsible for the logic.

```text
P1 → matching tests
P2 → backend state/resource/audit tests
P3 → UI/component interaction tests
```

## Integration tests

Owned jointly.

Minimum integration flows:

```text
case → match → request → accept
case → request → reject → reroute
case → request → timeout → reroute
two concurrent claims → one valid hold
mass casualty → distributed result
stale hospital → de-weighted result
```

## Manual demo validation

Run the real interface on the actual demo devices.

A passing unit-test suite is not enough for a realtime multi-device demo.

---

# 33. Performance and Simplicity Rules

Given the 18-hour window:

Prefer:

```text
simple
deterministic
explainable
testable
reproducible
```

Avoid:

```text
over-engineered microservices
unnecessary message brokers
multiple databases
complex ML pipelines
production-scale observability stacks
custom authentication frameworks
unnecessary third-party integrations
```

The project should demonstrate engineering depth through the coordination protocol and state safety, not infrastructure volume.

---

# 34. Scope Protection

## Locked MVP

The team must preserve:

```text
capability matching
accept/reject
timeout
automatic reroute
concurrency-safe holds
auditability
mass-casualty distribution
stale-data handling
human-confirmation framing
reliability/accountability
ambulance UI
hospital UI
admin UI
```

## Roadmap / explicitly not required in the 18-hour MVP

```text
adversarial gaming detection
full reservation-abuse / DoS protection
full scheme/eligibility verification
offline/low-connectivity synchronization
internal resource reallocation
family visibility link
```

The team should not accidentally spend core build time implementing roadmap items while locked MVP scenarios remain unstable.

---

# 35. Demo Scenarios Used for Integration

## Scenario A — Clean Match

```text
Cardiac case
   ↓
Need profile
   ↓
Rank hospitals
   ↓
Hospital receives request
   ↓
Accept
   ↓
Ambulance updates immediately
```

## Scenario B — Reject / Timeout

```text
Top hospital
   ↓
Reject or timeout
   ↓
Audit
   ↓
Automatic reroute
   ↓
Next hospital
```

## Scenario C — Mass Casualty

```text
4 patients / incident group
   ↓
batch allocation
   ↓
distributed across suitable hospitals
```

## Scenario D — Stale Data

```text
old hospital timestamp
   ↓
unknown/stale classification
   ↓
de-weighted candidate
```

## Scenario E — Audit + Reliability

```text
completed request lifecycle
   ↓
admin dashboard
   ↓
audit history + reliability
```

---

# 36. Demo Device Model

The intended demo can use:

```text
Device 1
    → Ambulance / phone

Device 2
    → Hospital reception

Device 3
    → Admin/oversight
```

All devices connect to the same backend.

The important live mechanic is:

```text
Device 1 action
    ↓
shared realtime state
    ↓
Device 2 reacts
    ↓
Device 1 reacts to response
```

No external telephony service is required for the core realtime alert mechanic.

---

# 37. Mobile Demo Integration Rule

The mobile-demo document is a **later-stage extension**, not the first implementation target.

When implemented, it must reuse:

```text
existing /ambulance route
existing case/request data
existing Firestore state
existing backend authorization
existing hospital destination
existing realtime state
```

Do not create a second mobile-only source of truth.

---

# 38. Branch Hygiene Checklist

Before every push:

```text
[ ] correct branch
[ ] only assigned work changed
[ ] no .env/secrets
[ ] no unrelated generated files
[ ] tests pass where applicable
[ ] build passes where applicable
[ ] contract changes documented
[ ] commit message meaningful
```

Before PR:

```text
[ ] branch up to date with main as appropriate
[ ] conflict risk checked
[ ] changed files reviewed
[ ] tests/build run
[ ] screenshots/demo notes added when useful
```

Before merge:

```text
[ ] no unresolved conflicts
[ ] no accidental scope expansion
[ ] shared contracts remain compatible
[ ] main remains demo-safe
```

---

# 39. Recommended Collaboration Pattern

During active development:

```text
Developer A
    ↓
works only in backend-core

Developer B
    ↓
works only in backend-realtime-ai

Developer C
    ↓
works only in frontend
```

Communication should happen through:

```text
shared docs
GitHub PR discussion
team chat
short contract decisions
```

Do not communicate critical schema/API changes only verbally.

Record them in the repository.

---

# 40. Integration Conflict Policy

When a merge conflict occurs, do not blindly choose:

```text
ours
```

or:

```text
theirs
```

Instead identify:

```text
which change owns the affected behavior?
```

Examples:

```text
matching.ts conflict
    → P1 owns domain rule

request lifecycle conflict
    → P2 owns backend state

React page conflict
    → P3 owns frontend presentation

shared contract conflict
    → all three review
```

If both branches legitimately changed a shared contract, reconcile the contract deliberately and update documentation.

---

# 41. Minimum Shared Vocabulary

Use these names consistently:

```text
case
need profile
hospital
capability
eligibility
candidate
match score
request
pending
accepted
rejected
timed out
superseded
hold
reroute
audit event
reliability
freshness
mass casualty
incident group
```

Avoid creating synonymous terms for the same concept.

Consistent terminology reduces integration bugs and makes the final demo easier to explain.

---

# 42. Final Team Map

```text
                            RAAHI
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
           P1              P2              P3
      Backend Core     Backend Realtime   Frontend
       + Matching       + State + AI
              │              │              │
              │              │              │
              ▼              ▼              ▼
         Domain Logic    Firebase/State   React UI
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                         Integration
                             │
                             ▼
                            main
```

---

# 43. Final Operating Rules

1. **`main` is always the stable integration branch.**

2. **Each developer works on their assigned branch.**

3. **The frozen docs define behavior; code does not silently redefine behavior.**

4. **P1 owns deterministic matching/domain calculations.**

5. **P2 owns authoritative backend state, transactions, realtime coordination, audit, reliability, and optional AI explanation.**

6. **P3 owns all user-facing React interfaces.**

7. **Frontend never becomes the authoritative source for routing, timeout, resource availability, or reliability.**

8. **Backend never duplicates major frontend presentation logic.**

9. **No developer independently changes shared contracts without communicating and documenting the change.**

10. **Technology substitutions are allowed only when integration behavior remains compatible.**

11. **Every team member must be able to explain the code they contribute.**

12. **Every meaningful commit should reflect genuine progress.**

13. **No secrets enter GitHub.**

14. **AI assistance is allowed, but significant AI-generated contribution must be disclosed according to the hackathon rules.**

15. **Core MVP stability takes priority over roadmap features and cosmetic polish.**

16. **The first major goal is a real end-to-end vertical slice, not three isolated piles of code.**

---

# 44. Immediate Next Action

Once this document is added to:

```text
docs/team-tech-stack-and-work-distribution.md
```

the team should:

```text
1. Pull the updated main branch.
2. Read this document together.
3. Confirm P1/P2/P3 ownership.
4. Confirm the API/data/state contracts.
5. Begin branch-specific implementation.
6. Integrate the first vertical slice as soon as possible.
```

The team should not begin by redesigning the architecture from scratch.

The objective is parallel development with controlled integration.
