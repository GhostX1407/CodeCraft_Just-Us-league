# TASKS — Capability-Match Ambulance–Hospital Coordination System

## 0. Document Control

| Field | Value |
|---|---|
| Document | `tasks.md` |
| Project | Capability-Match Ambulance–Hospital Coordination System |
| Team | 3 members |
| Build window | ~18 hours |
| Primary source | `PRD_Final.md` |
| Planning source | `plans.md` |
| Specification source | `spec.md` |
| Data source | `data-model.md` |
| API source | `api-contract.md` |
| Architecture source | `architecture.md` |
| Status | Implementation task board |
| Purpose | Convert the approved architecture/specification/plan into atomic, assignable work |

---

# 1. How to Use This File

This is the team's executable checklist.

Each task has:

```text
ID
Phase
Owner
Branch
Priority
Depends On
Objective
Implementation
Files/Area
Validation
Definition of Done
Merge Condition
```

A task is complete only when its validation and definition-of-done conditions are satisfied.

Do not mark a task complete because code merely exists.

---

# 2. Team IDs

```text
P1 = Person 1 — Backend Core + Matching
P2 = Person 2 — Backend Realtime + State + AI
P3 = Person 3 — Frontend
ALL = All three members
```

Branches:

```text
main
backend-core
backend-realtime-ai
frontend
```

---

# 3. Priority Codes

```text
P0 = critical blocker / core system
P1 = mandatory MVP
P2 = important supporting feature
P3 = polish / optional
```

A P0 task blocks its dependent tasks.

---

# 4. Status Codes

Use:

```text
[ ] Not started
[~] In progress
[x] Done
[!] Blocked
[-] Deferred
```

Do not delete completed tasks.

The repository history should make development progression visible.

---

# 5. Golden Rules

```text
1. Never silently change a shared contract.
2. Never commit secrets.
3. Never push feature work directly to main.
4. Keep main stable.
5. Test before merge.
6. Integrate early.
7. Do not build roadmap features before the MVP is stable.
8. Every member must make meaningful contributions.
9. Every member must understand the code they submit.
10. If a task is blocked, report it instead of silently inventing a workaround.
```

---

# 6. Dependency Notation

Example:

```text
Depends On:
T-P2-006
```

means the task should normally not start until that prerequisite exists.

Some tasks may begin with mocked dependencies when explicitly stated.

---

# 7. Phase Map

```text
PHASE 0  Foundation
PHASE 1  Repository + Environment
PHASE 2  Data + Shared Types
PHASE 3  Core Matching Domain
PHASE 4  Firestore + Backend Services
PHASE 5  Frontend Shell
PHASE 6  First Vertical Slice
PHASE 7  Commitment Protocol
PHASE 8  Concurrency + Resource Safety
PHASE 9  Mass Casualty
PHASE 10 Stale Data + Audit + Reliability
PHASE 11 Admin + Mid-Transit Reroute
PHASE 12 AI Explanation
PHASE 13 Deployment
PHASE 14 Testing + Hardening
PHASE 15 Documentation + Demo
PHASE 16 Final Submission Freeze
```

---

# 8. Critical Path

The critical implementation path is:

```text
T-ALL-001
   ↓
Firebase
   ↓
Firestore
   ↓
matching
   ↓
request creation
   ↓
hospital realtime
   ↓
accept transaction
   ↓
ambulance realtime
   ↓
Scenario A
```

Only after Scenario A is stable should the team spend major time on:

```text
reject
timeout
reroute
concurrency
mass casualty
stale
audit
admin
mid-transit
AI polish
```

---

# 9. PHASE 0 — FOUNDATION AGREEMENT

## T-ALL-001 — Confirm document set

**Owner:** ALL  
**Branch:** all working branches  
**Priority:** P0  
**Depends On:** none

### Objective

Confirm that all three developers are working from the same six project-control documents.

### Required documents

```text
architecture.md
data-model.md
api-contract.md
spec.md
plans.md
tasks.md
```

### Validation

Each member confirms they have opened and understand:

```text
architecture
data model
API contract
specification
plan
task board
```

### Done when

All three explicitly agree that:

```text
PRD_Final.md
```

is the product/scope source of truth.

---

## T-ALL-002 — Confirm old plan is historical only

**Owner:** ALL  
**Priority:** P0

### Objective

Prevent accidental reintroduction of obsolete decisions from:

```text
Project_Plan.md
Project_Plan_Old.md
```

### Done when

Team agrees:

```text
old plans = historical context
PRD_Final.md = current product authority
```

---

## T-ALL-003 — Confirm three-person ownership

**Owner:** ALL  
**Priority:** P0

### Definition

```text
P1 → Backend Core + Matching
P2 → Backend Realtime + State + AI
P3 → Frontend
```

### Done when

Each person knows:

```text
primary branch
owned directories
primary milestones
```

---

## T-ALL-004 — Confirm MVP boundary

**Owner:** ALL  
**Priority:** P0

### Verify MVP

```text
capability matching
accept/reject
timeout
auto-reroute
concurrency-safe holds
audit
mass casualty
stale data
human confirmation
reliability/accountability
ambulance UI
hospital UI
admin UI
```

### Verify roadmap

```text
adversarial detection
full reservation abuse protection
full scheme verification
offline sync
internal reallocation
family visibility
```

### Done when

No developer assumes roadmap features are mandatory.

---

# 10. PHASE 1 — REPOSITORY AND ENVIRONMENT

## T-ALL-005 — Create public GitHub repository

**Owner:** ALL  
**Priority:** P0

### Objective

Create one repository for the project.

### Done when

Repository exists and all team members can access it.

---

## T-ALL-006 — Configure repository visibility

**Owner:** repository creator  
**Priority:** P0

### Objective

Ensure repository visibility matches hackathon requirements.

### Validation

```text
public repository
```

and organizer collaborator setup prepared where required.

---

## T-ALL-007 — Initialize main branch

**Owner:** repository creator  
**Branch:** main  
**Priority:** P0

### Commands

```bash
git init
git branch -M main
```

### Done when

Local repository has:

```text
main
```

as the stable base branch.

---

## T-ALL-008 — Create backend-core branch

**Owner:** P1  
**Branch:** backend-core  
**Priority:** P0

### Done when

```text
origin/backend-core
```

exists.

---

## T-ALL-009 — Create backend-realtime-ai branch

**Owner:** P2  
**Branch:** backend-realtime-ai  
**Priority:** P0

### Done when

```text
origin/backend-realtime-ai
```

exists.

---

## T-ALL-010 — Create frontend branch

**Owner:** P3  
**Branch:** frontend  
**Priority:** P0

### Done when

```text
origin/frontend
```

exists.

---

## T-ALL-011 — Add root .gitignore

**Owner:** P2  
**Branch:** backend-realtime-ai  
**Priority:** P0

### Required exclusions

```text
.env
node_modules
dist
build
.firebase
coverage
logs
service-account files
```

### Special requirement

Keep:

```text
.env.example
```

trackable.

### Validation

Create a test `.env` locally and verify:

```bash
git status
```

does not list it.

---

## T-ALL-012 — Add .env.example

**Owner:** P2  
**Branch:** backend-realtime-ai  
**Priority:** P0

### Include

Only variable names and safe placeholders.

Example:

```text
FIREBASE_PROJECT_ID=
AI_PROVIDER=
AI_API_KEY=
```

Do not insert real credentials.

---

## T-ALL-013 — Create documentation directory

**Owner:** P3  
**Branch:** frontend  
**Priority:** P1

### Directory

```text
docs/
```

### Include

```text
architecture.md
data-model.md
api-contract.md
spec.md
plans.md
tasks.md
```

Use copies of the approved documents.

---

## T-ALL-014 — Initialize README skeleton

**Owner:** P3  
**Branch:** frontend  
**Priority:** P1

### Sections

```text
Problem
Solution
Features
Architecture
Tech Stack
API
Database
Setup
Development
Deployment
Demo
AI Disclosure
Limitations
Roadmap
```

Do not finalize wording yet.

---

## T-ALL-015 — Create frontend application scaffold

**Owner:** P3  
**Branch:** frontend  
**Priority:** P0

### Target

```text
React
TypeScript
Vite
```

### Done when

Local development server starts successfully.

---

## T-ALL-016 — Create backend/functions scaffold

**Owner:** P2  
**Branch:** backend-realtime-ai  
**Priority:** P0

### Target

```text
Firebase Functions
TypeScript
```

### Done when

Backend builds locally.

---

## T-ALL-017 — Initialize Firebase project configuration

**Owner:** P2  
**Branch:** backend-realtime-ai  
**Priority:** P0

### Configure

```text
Firebase project
Firestore
Functions
Hosting if used
```

### Done when

Firebase CLI can identify the target project.

---

## T-ALL-018 — Initialize Firestore configuration

**Owner:** P2  
**Priority:** P0

### Create

```text
firestore.rules
firestore.indexes.json
```

Do not write complex rules before the access model is tested.

---

## T-ALL-019 — Configure package scripts

**Owner:** P2 + P3  
**Priority:** P1

### Expected logical commands

```text
dev
build
test
lint
```

Final exact command names may differ.

### Done when

A new developer can understand the basic execution commands from package files.

---

## T-ALL-020 — Foundation commit

**Owner:** ALL  
**Priority:** P0

### Expected commit

```text
chore: initialize project foundation
```

### Done when

Initial repository foundation is pushed to `main`.

---

# 11. PHASE 2 — DATA MODEL AND SHARED TYPES

## T-P1-001 — Create Hospital Type

**Owner:** P1  
**Branch:** backend-core  
**Priority:** P0

### Required properties

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

### Validation

Type compiles.

---

## T-P1-002 — Create NeedProfile Type

**Owner:** P1  
**Priority:** P0

### Properties

```text
specialists_needed
capability_flags
blood_type_needed
```

---

## T-P1-003 — Create Case Type

**Owner:** P1  
**Priority:** P0

### Properties

Mirror `data-model.md`.

Include:

```text
routing summary if implementation uses it
ambulance location
```

---

## T-P1-004 — Create Request Type

**Owner:** P1  
**Priority:** P0

### Properties

Mirror `data-model.md`.

---

## T-P1-005 — Create MatchResult Type

**Owner:** P1  
**Priority:** P0

### Include

```text
hospital_id
rank
capability_match_pct
distance_km
distance_factor
load_factor
staleness_factor
final_score
eligibility
freshness
reasons
```

---

## T-P2-001 — Create AuditLog Type

**Owner:** P2  
**Branch:** backend-realtime-ai  
**Priority:** P0

### Include

```text
id
request_id
case_id
hospital_id
event_type
timestamp
actor_type
actor_id
snapshot
```

---

## T-P2-002 — Create Hold Type

**Owner:** P2  
**Priority:** P1

### Include

```text
request_id
case_id
created_at
status
resources
```

---

## T-P2-003 — Create RequestState Type

**Owner:** P2  
**Priority:** P0

Allowed:

```text
pending
accepted
rejected
timed_out
superseded
```

---

## T-P2-004 — Create CaseRoutingState Type

**Owner:** P2  
**Priority:** P0

Proposed:

```text
routing
accepted
exhausted
```

---

## T-P3-001 — Create frontend shared domain types

**Owner:** P3  
**Branch:** frontend  
**Priority:** P0

Use the exact domain contract.

---

## T-ALL-021 — Compare shared types

**Owner:** ALL  
**Priority:** P0

### Objective

Compare backend and frontend representations.

### Check

```text
field names
types
enums
nullability
timestamps
```

### Done when

No core domain field has inconsistent meanings.

---

## T-ALL-022 — Type contract smoke build

**Owner:** ALL  
**Priority:** P0

### Validation

```text
frontend build
backend build
```

must pass.

---

# 12. PHASE 3 — MATCHING DOMAIN

## T-P1-006 — Implement category enum

**Owner:** P1  
**Priority:** P0

Allowed:

```text
cardiac
trauma
obstetric
pediatric
```

---

## T-P1-007 — Implement severity enum

**Owner:** P1  
**Priority:** P0

Allowed:

```text
red
yellow
green
```

---

## T-P1-008 — Implement cardiac need rule

**Owner:** P1  
**Priority:** P0

Output:

```text
cardiologist
ecg
icu
```

---

## T-P1-009 — Implement trauma need rule

**Owner:** P1  
**Priority:** P0

Output:

```text
trauma_team
icu
O-
```

according to the approved prototype rules.

---

## T-P1-010 — Implement obstetric need rule

**Owner:** P1  
**Priority:** P0

Output:

```text
obgyn
maternity
```

---

## T-P1-011 — Implement pediatric need rule

**Owner:** P1  
**Priority:** P0

Output:

```text
pediatrician
pediatric_emergency
```

---

## T-P1-012 — Implement need-profile generator

**Owner:** P1  
**Priority:** P0

### Input

```text
category
severity
```

### Output

```text
NeedProfile
```

---

## T-P1-013 — Unit test need-profile rules

**Owner:** P1  
**Priority:** P0

### Tests

```text
cardiac
trauma
obstetric
pediatric
invalid category
```

---

## T-P1-014 — Implement Haversine calculation

**Owner:** P1  
**Priority:** P0

### Validation

```text
same coordinate → near zero
known coordinate pair → expected range
```

---

## T-P1-015 — Unit test Haversine

**Owner:** P1  
**Priority:** P0

Include:

```text
same point
nearby point
different city-scale points
```

---

## T-P1-016 — Implement eligibility gate

**Owner:** P1  
**Priority:** P0

Evaluate:

```text
required specialist
required capability
required blood
required countable resources
```

---

## T-P1-017 — Unit test eligibility

**Owner:** P1  
**Priority:** P0

Test positive and negative candidates.

---

## T-P1-018 — Implement capability match calculation

**Owner:** P1  
**Priority:** P0

Use approved group weighting from `spec.md`.

---

## T-P1-019 — Unit test capability percentage

**Owner:** P1  
**Priority:** P0

Test:

```text
100%
partial group
no requirements
multiple requirements
```

---

## T-P1-020 — Implement distance factor

**Owner:** P1  
**Priority:** P0

Use the exact formula from `spec.md`.

---

## T-P1-021 — Implement load factor

**Owner:** P1  
**Priority:** P0

Use:

```text
load score 1–5
```

with approved factor mapping.

---

## T-P1-022 — Implement freshness classification

**Owner:** P1  
**Priority:** P0

Return:

```text
fresh
stale
unknown
```

---

## T-P1-023 — Implement freshness factor

**Owner:** P1  
**Priority:** P0

Use approved factors.

---

## T-P1-024 — Implement final score

**Owner:** P1  
**Priority:** P0

Use:

```text
capability
× distance
× load
× freshness
× 100
```

---

## T-P1-025 — Unit test final score

**Owner:** P1  
**Priority:** P0

Use known deterministic fixtures.

---

## T-P1-026 — Implement tie-breaker

**Owner:** P1  
**Priority:** P1

Order:

```text
capability
freshness
distance
load
hospital_id
```

---

## T-P1-027 — Unit test tie-breaker

**Owner:** P1  
**Priority:** P1

Create exact ties and near-ties.

---

## T-P1-028 — Implement hospital ranking

**Owner:** P1  
**Priority:** P0

Pipeline:

```text
eligibility
→ scoring
→ sorting
→ tie-break
```

---

## T-P1-029 — Unit test hospital ranking

**Owner:** P1  
**Priority:** P0

Use minimum three hospitals with intentionally different capabilities.

---

## T-P1-030 — Implement attempted-hospital exclusion

**Owner:** P1  
**Priority:** P1

Input:

```text
already_attempted_hospital_ids
```

Output excludes them.

---

## T-P1-031 — Unit test reroute ranking

**Owner:** P1  
**Priority:** P1

Ensure previous candidates are excluded.

---

# 13. PHASE 4 — FIRESTORE AND BACKEND SERVICES

## T-P2-005 — Implement Firestore initialization

**Owner:** P2  
**Priority:** P0

Done when backend can connect to the intended Firestore project.

---

## T-P2-006 — Implement Hospital repository

**Owner:** P2  
**Priority:** P0

Operations:

```text
getHospital
listHospitals
updateHospital
```

---

## T-P2-007 — Implement Case repository

**Owner:** P2  
**Priority:** P0

Operations:

```text
createCase
getCase
updateCaseRouting
```

---

## T-P2-008 — Implement Request repository

**Owner:** P2  
**Priority:** P0

Operations:

```text
createRequest
getRequest
listCaseRequests
updateRequest
```

---

## T-P2-009 — Implement Audit repository

**Owner:** P2  
**Priority:** P0

Operation:

```text
appendAuditEvent
```

Must not expose a normal "edit audit event" method.

---

## T-P2-010 — Implement Hold repository

**Owner:** P2  
**Priority:** P1

Operations:

```text
createHold
getHold
releaseHold
```

---

## T-P2-011 — Implement server timestamp helpers

**Owner:** P2  
**Priority:** P0

Use Firestore/server time for critical timestamps.

---

## T-P2-012 — Implement case creation service

**Owner:** P2  
**Priority:** P0

Behavior:

```text
validate
create ID
timestamp
persist
audit
```

Need-profile generation may be called from Person 1's domain function.

---

## T-P2-013 — Integrate need-profile generation into case creation

**Owner:** P1 + P2  
**Priority:** P0

### Done when

A persisted case contains:

```text
category
severity
need_profile
```

---

## T-P2-014 — Implement hospital capability update service

**Owner:** P2  
**Priority:** P0

Must:

```text
validate
update fields
set last_updated_at
audit
```

---

## T-P2-015 — Implement request creation service

**Owner:** P2  
**Priority:** P0

Must initialize:

```text
pending
sent_at
expires_at
attempt_number
```

---

## T-P2-016 — Implement match service

**Owner:** P1 + P2  
**Priority:** P0

Architecture:

```text
load case
load hospitals
call P1 matching domain
persist active request
audit
return result
```

---

## T-P2-017 — Implement acceptance transaction

**Owner:** P2  
**Priority:** P0

Transaction must verify:

```text
request pending
case not already accepted
not expired
hospital eligible
resources available
```

Then atomically:

```text
request accepted
case accepted
resource decremented
hold created
audit
```

---

## T-P2-018 — Implement acceptance conflict handling

**Owner:** P2  
**Priority:** P0

Return stable error code:

```text
CONCURRENCY_CONFLICT
```

or the documented resource-related error.

---

## T-P2-019 — Implement rejection service

**Owner:** P2  
**Priority:** P0

Transition:

```text
pending → rejected
```

then reroute.

---

## T-P2-020 — Implement timeout service

**Owner:** P2  
**Priority:** P0

Verify server time.

Transition:

```text
pending → timed_out
```

then reroute.

---

## T-P2-021 — Implement reroute service

**Owner:** P2 + P1  
**Priority:** P0

Behavior:

```text
resolve old request
reload candidates
exclude attempted hospitals
recalculate
create next request
audit
```

---

## T-P2-022 — Implement active-request uniqueness check

**Owner:** P2  
**Priority:** P0

Invariant:

```text
case → at most one active pending request
```

---

## T-P2-023 — Implement case acceptance uniqueness

**Owner:** P2  
**Priority:** P0

Invariant:

```text
case → at most one active accepted commitment
```

---

## T-P2-024 — Implement resource release service

**Owner:** P2  
**Priority:** P1

Used for:

```text
mid-transit invalidation
```

and other defined release paths.

---

## T-P2-025 — Implement rate-limit gesture

**Owner:** P2  
**Priority:** P2

Basic cap on pending requests per requester.

Exact value comes from spec/config.

---

# 14. PHASE 5 — FRONTEND SHELL

## T-P3-001 — Create base application layout

**Owner:** P3  
**Priority:** P0

Include:

```text
header
navigation
main content
role-aware routing
```

---

## T-P3-002 — Create ambulance route

**Owner:** P3  
**Priority:** P0

```text
/ambulance
```

---

## T-P3-003 — Create hospital route

**Owner:** P3  
**Priority:** P0

```text
/hospital/:hospitalId
```

---

## T-P3-004 — Create admin route

**Owner:** P3  
**Priority:** P0

```text
/admin
```

---

## T-P3-005 — Create shared API service layer

**Owner:** P3  
**Priority:** P0

Create logical modules:

```text
caseService
requestService
hospitalService
adminService
```

---

## T-P3-006 — Create realtime hook layer

**Owner:** P3  
**Priority:** P0

Logical hooks:

```text
useCase
useCaseRequests
useHospital
useHospitalRequests
useAudit
```

---

## T-P3-007 — Create shared UI state components

**Owner:** P3  
**Priority:** P1

Components:

```text
Loading
Error
Reconnect
EmptyState
```

---

## T-P3-008 — Create status badge component

**Owner:** P3  
**Priority:** P1

Support:

```text
pending
accepted
rejected
timed_out
superseded
fresh
stale
unknown
```

---

## T-P3-009 — Create countdown component

**Owner:** P3  
**Priority:** P0

Input:

```text
expires_at
```

Output:

```text
MM:SS
```

Never determine authoritative timeout locally.

---

## T-P3-010 — Create match recommendation card

**Owner:** P3  
**Priority:** P0

Display:

```text
hospital
score
capability match
distance
ETA
load
freshness
reason
human confirmation
```

---

# 15. PHASE 6 — FIRST VERTICAL SLICE

## T-ALL-023 — Define Scenario A seed state

**Owner:** ALL  
**Priority:** P0

Ensure at least one hospital has:

```text
required cardiac specialist
ECG
ICU
fresh data
reasonable load
```

---

## T-P2-026 — Seed first hospital records

**Owner:** P2  
**Priority:** P0

Create minimum:

```text
3 hospitals
```

for initial testing.

---

## T-P3-011 — Build ambulance case form

**Owner:** P3  
**Priority:** P0

Fields:

```text
category
severity
patient age
patient sex
vitals
onset
treatment
location
```

---

## T-P3-012 — Add category buttons

**Owner:** P3  
**Priority:** P0

Use:

```text
Cardiac
Trauma
Obstetric
Pediatric
```

---

## T-P3-013 — Add severity control

**Owner:** P3  
**Priority:** P1

Allowed:

```text
red
yellow
green
```

---

## T-P3-014 — Build need-profile preview

**Owner:** P3  
**Priority:** P0

Display:

```text
specialists
capabilities
blood requirement
```

---

## T-P3-015 — Implement Create Case integration

**Owner:** P3 + P2  
**Priority:** P0

Flow:

```text
form
→ API
→ Firestore
→ returned case
```

---

## T-P3-016 — Build Find Best Hospital action

**Owner:** P3  
**Priority:** P0

Call:

```text
match API
```

---

## T-P3-017 — Build hospital pending request screen

**Owner:** P3  
**Priority:** P0

Must display:

```text
case need
severity
distance
ETA
countdown
Accept
Reject
```

---

## T-P3-018 — Build ambulance pending screen

**Owner:** P3  
**Priority:** P0

Observe realtime request.

---

## T-P2-027 — Add realtime listener for hospital requests

**Owner:** P2 + P3  
**Priority:** P0

Hospital receives request without refresh.

---

## T-P2-028 — Add realtime listener for ambulance request status

**Owner:** P2 + P3  
**Priority:** P0

Ambulance receives acceptance/rejection/reroute without refresh.

---

## T-ALL-024 — Run Scenario A

**Owner:** ALL  
**Priority:** P0

Exact flow:

```text
ambulance
→ cardiac
→ red
→ need profile
→ match
→ hospital request
→ accept
→ ambulance accepted
```

---

## T-ALL-025 — Fix all Scenario A blockers

**Owner:** ALL  
**Priority:** P0

Do not start major new features until Scenario A is stable.

---

## T-ALL-026 — Merge first vertical slice

**Owner:** ALL  
**Priority:** P0

Pull request target:

```text
main
```

### Merge requirements

```text
frontend builds
backend builds
Scenario A passes
no secrets
contract unchanged or documented
```

---

# 16. PHASE 7 — COMMITMENT PROTOCOL

## T-P3-019 — Build Reject UX

**Owner:** P3  
**Priority:** P0

Display:

```text
Reject
reason
submitting
rerouting
```

---

## T-P2-029 — Implement reject transaction

**Owner:** P2  
**Priority:** P0

Transition:

```text
pending → rejected
```

Write audit.

---

## T-P2-030 — Trigger reroute after rejection

**Owner:** P2  
**Priority:** P0

Do not require frontend restart.

---

## T-P1-032 — Ensure attempted hospital is excluded

**Owner:** P1  
**Priority:** P0

---

## T-P3-020 — Render reroute state

**Owner:** P3  
**Priority:** P0

Show:

```text
Hospital A rejected
Automatically rerouting...
```

---

## T-P3-021 — Render new active request

**Owner:** P3  
**Priority:** P0

Show:

```text
new hospital
new countdown
attempt number
reason
```

---

## T-ALL-027 — Run rejection scenario

**Owner:** ALL  
**Priority:** P0

Expected:

```text
request 1 rejected
request 2 created
ambulance updates
hospital 2 sees request
```

---

## T-P2-031 — Implement server-authoritative timeout

**Owner:** P2  
**Priority:** P0

---

## T-P3-022 — Add timeout visual handling

**Owner:** P3  
**Priority:** P0

At local zero:

```text
waiting for server confirmation
```

Then rely on backend status.

---

## T-P2-032 — Trigger reroute after timeout

**Owner:** P2  
**Priority:** P0

---

## T-ALL-028 — Run timeout scenario

**Owner:** ALL  
**Priority:** P0

---

## T-P2-033 — Add duplicate Accept protection

**Owner:** P2  
**Priority:** P0

Test:

```text
double click
retry after network delay
```

---

## T-P2-034 — Add duplicate Reject protection

**Owner:** P2  
**Priority:** P0

---

## T-P2-035 — Add reroute duplicate protection

**Owner:** P2  
**Priority:** P0

Ensure:

```text
one terminal request
→ one next active request
```

---

# 17. PHASE 8 — CONCURRENCY AND RESOURCE SAFETY

## T-P2-036 — Implement ICU hold logic

**Owner:** P2  
**Priority:** P0

---

## T-P2-037 — Implement ventilator hold logic

**Owner:** P2  
**Priority:** P1

---

## T-P2-038 — Implement blood hold logic

**Owner:** P2  
**Priority:** P1

---

## T-P2-039 — Validate countable resources before acceptance

**Owner:** P2  
**Priority:** P0

Never allow:

```text
negative capacity
```

---

## T-P1-033 — Make capability eligibility resource-aware

**Owner:** P1  
**Priority:** P0

The matching engine must consider current effective resource availability.

---

## T-P2-040 — Prevent double decrement

**Owner:** P2  
**Priority:** P0

One accepted request can consume a resource once.

---

## T-P2-041 — Implement hold release

**Owner:** P2  
**Priority:** P1

---

## T-P2-042 — Create concurrency test fixture

**Owner:** P2  
**Priority:** P0

Fixture:

```text
ICU = 1
2 requests
same hospital
```

---

## T-P2-043 — Run concurrent accept test

**Owner:** P2  
**Priority:** P0

Expected:

```text
one success
one conflict/failure
ICU = 0
```

---

## T-P2-044 — Test accept/timeout race

**Owner:** P2  
**Priority:** P0

Expected:

```text
one authoritative terminal outcome
```

---

## T-P2-045 — Test reject/timeout race

**Owner:** P2  
**Priority:** P0

Expected:

```text
one terminal transition
one reroute
```

---

## T-ALL-029 — Verify resource safety

**Owner:** ALL  
**Priority:** P0

Review transaction behavior and audit entries.

---

# 18. PHASE 9 — MASS CASUALTY

## T-P1-034 — Implement incident-group loading

**Owner:** P1  
**Priority:** P1

---

## T-P1-035 — Implement case prioritization

**Owner:** P1  
**Priority:** P1

Order:

```text
red
yellow
green
```

then:

```text
more constrained need profile
case_id
```

---

## T-P1-036 — Generate candidate list per case

**Owner:** P1  
**Priority:** P1

Target:

```text
top 5 or all eligible
```

---

## T-P1-037 — Implement resource simulation

**Owner:** P1  
**Priority:** P0

Before final assignment:

```text
simulate capacity usage
```

---

## T-P1-038 — Implement concentration penalty

**Owner:** P1  
**Priority:** P1

Use the approved prototype penalty from `spec.md`.

---

## T-P1-039 — Implement bounded assignment search

**Owner:** P1  
**Priority:** P0

Search:

```text
candidate assignments
```

while respecting:

```text
hard capability
resource constraints
```

---

## T-P1-040 — Unit test mass-casualty assignment

**Owner:** P1  
**Priority:** P0

Test:

```text
4 cases
3+ hospitals
different needs
```

---

## T-P2-046 — Implement incident match service

**Owner:** P2  
**Priority:** P0

Connect:

```text
incident group
→ P1 distribution plan
```

---

## T-P2-047 — Revalidate plan before commit

**Owner:** P2  
**Priority:** P0

Because live resources may have changed during planning.

---

## T-P2-048 — Persist mass-casualty requests

**Owner:** P2  
**Priority:** P0

One request per case.

---

## T-P2-049 — Write group audit events

**Owner:** P2  
**Priority:** P1

---

## T-P3-023 — Build mass-casualty toggle

**Owner:** P3  
**Priority:** P1

---

## T-P3-024 — Build add-patient interface

**Owner:** P3  
**Priority:** P1

Support four demo patients.

---

## T-P3-025 — Build patient cards

**Owner:** P3  
**Priority:** P1

Display:

```text
category
severity
need profile
```

---

## T-P3-026 — Build distribution visualization

**Owner:** P3  
**Priority:** P0

Display:

```text
patient → hospital
```

---

## T-ALL-030 — Prepare deterministic mass-casualty seed

**Owner:** ALL  
**Priority:** P0

The outcome must be deterministic enough to rehearse.

---

## T-ALL-031 — Run Scenario C

**Owner:** ALL  
**Priority:** P0

Four cases:

```text
cardiac
trauma
obstetric
pediatric
```

with one shared incident.

---

# 19. PHASE 10 — STALE DATA

## T-P1-041 — Implement freshness calculation

**Owner:** P1  
**Priority:** P0

Use approved thresholds.

---

## T-P1-042 — Apply freshness factor

**Owner:** P1  
**Priority:** P0

---

## T-P1-043 — Add freshness to match breakdown

**Owner:** P1  
**Priority:** P0

---

## T-P3-027 — Build freshness badge

**Owner:** P3  
**Priority:** P1

Show:

```text
Fresh
Stale
Unknown
```

---

## T-P3-028 — Display last updated time

**Owner:** P3  
**Priority:** P1

---

## T-P2-050 — Seed stale hospital

**Owner:** P2  
**Priority:** P0

Use old:

```text
last_updated_at
```

---

## T-ALL-032 — Run stale-data scenario

**Owner:** ALL  
**Priority:** P0

Confirm:

```text
stale/unknown state
reduced ranking factor
visible UI indication
```

---

# 20. PHASE 10B — AUDIT

## T-P2-051 — Define audit event constants

**Owner:** P2  
**Priority:** P0

Use approved vocabulary.

---

## T-P2-052 — Audit CASE_CREATED

**Owner:** P2  
**Priority:** P0

---

## T-P2-053 — Audit NEED_PROFILE_GENERATED

**Owner:** P2  
**Priority:** P0

---

## T-P2-054 — Audit MATCH_COMPUTED

**Owner:** P2  
**Priority:** P0

---

## T-P2-055 — Audit REQUEST_CREATED

**Owner:** P2  
**Priority:** P0

---

## T-P2-056 — Audit REQUEST_SENT

**Owner:** P2  
**Priority:** P0

---

## T-P2-057 — Audit acceptance

**Owner:** P2  
**Priority:** P0

---

## T-P2-058 — Audit rejection

**Owner:** P2  
**Priority:** P0

---

## T-P2-059 — Audit timeout

**Owner:** P2  
**Priority:** P0

---

## T-P2-060 — Audit reroute

**Owner:** P2  
**Priority:** P0

---

## T-P2-061 — Audit resource hold

**Owner:** P2  
**Priority:** P0

---

## T-P2-062 — Audit resource release

**Owner:** P2  
**Priority:** P1

---

## T-P2-063 — Store decision-time snapshots

**Owner:** P2  
**Priority:** P0

Snapshot:

```text
case
need
hospital capability
freshness
distance
load
score
```

---

## T-P2-064 — Enforce append-only audit behavior

**Owner:** P2  
**Priority:** P0

---

## T-P2-065 — Test audit completeness

**Owner:** P2  
**Priority:** P0

---

# 21. PHASE 10C — RELIABILITY

## T-P2-066 — Define reliability aggregate service

**Owner:** P2  
**Priority:** P1

Use approved:

```text
honored / accepted
```

definition.

---

## T-P2-067 — Handle no-history state

**Owner:** P2  
**Priority:** P1

Return:

```text
No history
```

instead of fabricated 0%.

---

## T-P2-068 — Seed reliability history

**Owner:** P2  
**Priority:** P1

Ensure visible hospitals have demonstrable history.

---

## T-P3-029 — Build reliability display

**Owner:** P3  
**Priority:** P1

Show:

```text
reliability %
response time
commitments
```

---

## T-ALL-033 — Verify reliability semantics

**Owner:** ALL  
**Priority:** P1

Make sure no screen describes reliability as:

```text
clinical quality
hospital quality
medical outcome score
```

---

# 22. PHASE 11 — ADMIN DASHBOARD

## T-P3-030 — Create admin dashboard layout

**Owner:** P3  
**Priority:** P1

---

## T-P3-031 — Build hospital network list

**Owner:** P3  
**Priority:** P1

---

## T-P3-032 — Add hospital capability summary

**Owner:** P3  
**Priority:** P1

---

## T-P3-033 — Add freshness indicators

**Owner:** P3  
**Priority:** P1

---

## T-P3-034 — Add reliability cards

**Owner:** P3  
**Priority:** P1

---

## T-P3-035 — Add request activity view

**Owner:** P3  
**Priority:** P1

---

## T-P3-036 — Add audit log table

**Owner:** P3  
**Priority:** P0

Columns:

```text
time
case
hospital
event
request
reason
```

---

## T-P3-037 — Add audit detail drawer

**Owner:** P3  
**Priority:** P1

Display decision snapshot.

---

## T-P2-069 — Implement admin audit query

**Owner:** P2  
**Priority:** P0

---

## T-P2-070 — Implement admin reliability query

**Owner:** P2  
**Priority:** P1

---

## T-P3-038 — Add map visualization

**Owner:** P3  
**Priority:** P1

Use hospital:

```text
lat/lng
freshness
capability
```

---

## T-P3-039 — Add ambulance marker

**Owner:** P3  
**Priority:** P2

If live GPS unavailable:

```text
demo coordinate
```

---

# 23. PHASE 11B — MID-TRANSIT REROUTE

## T-P1-044 — Define invalidation conditions

**Owner:** P1  
**Priority:** P0

Example:

```text
case requires trauma_team
hospital trauma_team_on_shift becomes false
```

---

## T-P2-071 — Detect active commitment invalidation

**Owner:** P2  
**Priority:** P0

---

## T-P2-072 — Supersede invalid request

**Owner:** P2  
**Priority:** P0

---

## T-P2-073 — Release invalidated hold

**Owner:** P2  
**Priority:** P0

---

## T-P2-074 — Recalculate next candidate

**Owner:** P2 + P1  
**Priority:** P0

---

## T-P2-075 — Create reroute request

**Owner:** P2  
**Priority:** P0

---

## T-P2-076 — Audit mid-transit invalidation

**Owner:** P2  
**Priority:** P0

---

## T-P3-040 — Build ambulance route-update alert

**Owner:** P3  
**Priority:** P0

---

## T-P3-041 — Build rerouted destination view

**Owner:** P3  
**Priority:** P0

---

## T-ALL-034 — Run mid-transit scenario

**Owner:** ALL  
**Priority:** P0

---

# 24. PHASE 12 — AI EXPLANATION

## T-P2-077 — Create ExplanationProvider interface

**Owner:** P2  
**Priority:** P2

Interface:

```text
generateMatchExplanation(matchFacts)
```

---

## T-P2-078 — Create deterministic explanation fallback

**Owner:** P2  
**Priority:** P1

Example:

```text
Hospital C — cardiologist available, ICU available,
4.2 km away, ER load 2/5.
```

---

## T-P2-079 — Integrate optional AI provider

**Owner:** P2  
**Priority:** P2

Only after:

```text
Scenario A
Scenario B
```

work reliably.

---

## T-P2-080 — Add AI constraints to prompt

**Owner:** P2  
**Priority:** P2

Prompt must say:

```text
Use only supplied facts.
Do not invent.
Do not change score.
Do not diagnose.
Do not select hospital.
```

---

## T-P2-081 — Handle AI provider failure

**Owner:** P2  
**Priority:** P1

Fallback automatically to deterministic explanation.

---

## T-P2-082 — Test AI fallback

**Owner:** P2  
**Priority:** P1

Force provider failure.

Expected:

```text
routing succeeds
fallback explanation displayed
```

---

## T-P3-042 — Render explanation source safely

**Owner:** P3  
**Priority:** P2

Do not expose internal prompt text.

---

# 25. PHASE 13 — DEPLOYMENT

## T-P2-083 — Deploy backend functions

**Owner:** P2  
**Priority:** P1

Verify:

```text
functions reachable
Firestore connected
```

---

## T-P3-043 — Deploy frontend

**Owner:** P3  
**Priority:** P1

Use:

```text
Firebase Hosting
```

unless the fallback deployment is required.

---

## T-ALL-035 — Verify deployed environment

**Owner:** ALL  
**Priority:** P0

Use a clean browser/device.

Test:

```text
ambulance
hospital
admin
```

---

## T-P2-084 — Configure production/demo Firestore rules

**Owner:** P2  
**Priority:** P0

Verify no unintended public writes.

---

## T-P2-085 — Verify no secrets in deployment config

**Owner:** P2  
**Priority:** P0

---

## T-P3-044 — Verify responsive production UI

**Owner:** P3  
**Priority:** P1

Test:

```text
phone
laptop
projected screen
```

---

# 26. PHASE 14 — TESTING AND HARDENING

## T-P1-045 — Complete matching unit suite

**Owner:** P1  
**Priority:** P0

Coverage:

```text
need profiles
eligibility
distance
capability
load
freshness
score
ranking
tie-breakers
reroute candidates
mass casualty
```

---

## T-P2-086 — Complete backend state-transition suite

**Owner:** P2  
**Priority:** P0

Coverage:

```text
pending
accepted
rejected
timed_out
superseded
```

---

## T-P2-087 — Complete transaction test suite

**Owner:** P2  
**Priority:** P0

Coverage:

```text
double accept
accept/timeout
reject/timeout
resource conflict
duplicate retry
```

---

## T-P2-088 — Complete audit test suite

**Owner:** P2  
**Priority:** P1

---

## T-P2-089 — Complete reliability test suite

**Owner:** P2  
**Priority:** P1

---

## T-P3-045 — Complete frontend smoke suite

**Owner:** P3  
**Priority:** P1

Coverage:

```text
ambulance flow
hospital flow
admin
countdown
reroute
error
reconnect
```

---

## T-P3-046 — Verify mobile layout

**Owner:** P3  
**Priority:** P1

---

## T-P3-047 — Verify projected hospital UI

**Owner:** P3  
**Priority:** P2

Large:

```text
Accept
Reject
countdown
need summary
```

---

## T-ALL-036 — Run complete Scenario A test

**Owner:** ALL  
**Priority:** P0

---

## T-ALL-037 — Run complete Scenario B test

**Owner:** ALL  
**Priority:** P0

---

## T-ALL-038 — Run complete Scenario C test

**Owner:** ALL  
**Priority:** P0

---

## T-ALL-039 — Run complete Scenario D test

**Owner:** ALL  
**Priority:** P0

---

## T-ALL-040 — Run complete Scenario E test

**Owner:** ALL  
**Priority:** P0

---

## T-ALL-041 — Test network reconnect

**Owner:** ALL  
**Priority:** P1

Procedure:

```text
disconnect one client
reconnect
verify state
```

---

## T-ALL-042 — Test GPS denial

**Owner:** ALL  
**Priority:** P2

Expected:

```text
demo coordinate
visible indication
```

---

## T-ALL-043 — Test map failure fallback

**Owner:** ALL  
**Priority:** P2

Matching must continue.

---

## T-ALL-044 — Test AI failure fallback

**Owner:** ALL  
**Priority:** P1

---

## T-ALL-045 — Test no-eligible-hospital state

**Owner:** ALL  
**Priority:** P1

Expected:

```text
case exhausted
no active request
audit event
```

---

## T-ALL-046 — Test duplicate Accept

**Owner:** ALL  
**Priority:** P0

---

## T-ALL-047 — Test duplicate Reject

**Owner:** ALL  
**Priority:** P0

---

## T-ALL-048 — Test duplicate reroute

**Owner:** ALL  
**Priority:** P0

---

## T-ALL-049 — Verify no negative resource state

**Owner:** ALL  
**Priority:** P0

---

# 27. PHASE 14B — SECURITY AND DATA HYGIENE

## T-ALL-050 — Search repository for secrets

**Owner:** ALL  
**Priority:** P0

Search:

```text
API_KEY
SECRET
PASSWORD
TOKEN
PRIVATE_KEY
```

Inspect results manually.

---

## T-ALL-051 — Verify .env ignored

**Owner:** ALL  
**Priority:** P0

---

## T-ALL-052 — Verify service-account files absent

**Owner:** ALL  
**Priority:** P0

---

## T-ALL-053 — Verify synthetic patient data

**Owner:** ALL  
**Priority:** P0

No real patient information.

---

## T-P2-090 — Review Firestore security rules

**Owner:** P2  
**Priority:** P0

---

## T-P2-091 — Verify backend-authoritative mutations

**Owner:** P2  
**Priority:** P0

Ensure browser cannot casually manufacture:

```text
accepted
resource hold
reliability update
audit event
```

---

# 28. PHASE 14C — PERFORMANCE AND STABILITY

## T-P1-046 — Measure match execution

**Owner:** P1  
**Priority:** P2

Target:

```text
comfortably sub-second for demo-sized dataset
```

---

## T-P2-092 — Review Firestore query count

**Owner:** P2  
**Priority:** P2

Avoid excessive duplicate reads.

---

## T-P3-048 — Review realtime subscriptions

**Owner:** P3  
**Priority:** P1

Ensure listeners are:

```text
created once
cleaned up
not duplicated
```

---

## T-ALL-054 — Run 10-case smoke test

**Owner:** ALL  
**Priority:** P2

Confirm the prototype remains stable beyond one case.

---

# 29. PHASE 15 — DOCUMENTATION

## T-P3-049 — Update README problem statement

**Owner:** P3  
**Priority:** P1

Must match PRD.

---

## T-P3-050 — Update README solution description

**Owner:** P3  
**Priority:** P1

Emphasize:

```text
capability matching
commitment
reroute
accountability
```

---

## T-P1-047 — Document matching formula

**Owner:** P1  
**Priority:** P1

Provide one worked example.

---

## T-P2-093 — Document Firestore architecture

**Owner:** P2  
**Priority:** P1

---

## T-P2-094 — Document transactions

**Owner:** P2  
**Priority:** P1

Explain:

```text
why transaction
what invariant it protects
```

---

## T-P2-095 — Document realtime behavior

**Owner:** P2  
**Priority:** P1

---

## T-P3-051 — Document frontend routes

**Owner:** P3  
**Priority:** P1

---

## T-P3-052 — Document API usage

**Owner:** P3  
**Priority:** P1

---

## T-P2-096 — Document environment setup

**Owner:** P2  
**Priority:** P1

---

## T-P2-097 — Document seed instructions

**Owner:** P2  
**Priority:** P1

---

## T-ALL-055 — Document AI usage

**Owner:** ALL  
**Priority:** P1

State:

```text
what AI assisted
what remains deterministic
what fallback exists
```

---

## T-ALL-056 — Document third-party libraries

**Owner:** ALL  
**Priority:** P1

At minimum:

```text
React
Firebase
Vite
Tailwind
Leaflet/OpenStreetMap if used
AI provider if used
other material dependencies
```

---

## T-ALL-057 — Document limitations

**Owner:** ALL  
**Priority:** P1

Include:

```text
synthetic data
prototype scoring
simplified capability rules
no offline mode
no full eligibility verification
no production clinical validation
```

---

## T-ALL-058 — Update roadmap

**Owner:** ALL  
**Priority:** P1

List deliberately deferred items.

---

# 30. PHASE 15B — DOCUMENT CONSISTENCY

## T-ALL-059 — Compare implementation vs data-model.md

**Owner:** ALL  
**Priority:** P0

Check:

```text
collections
fields
types
nullability
states
```

---

## T-ALL-060 — Compare implementation vs api-contract.md

**Owner:** ALL  
**Priority:** P0

Check:

```text
request payload
response
errors
state updates
```

---

## T-ALL-061 — Compare implementation vs spec.md

**Owner:** ALL  
**Priority:** P0

Check:

```text
timeout
score
freshness
resource behavior
AI boundary
mass casualty
```

---

## T-ALL-062 — Compare implementation vs architecture.md

**Owner:** ALL  
**Priority:** P0

Check component boundaries.

---

## T-ALL-063 — Record any deviations

**Owner:** ALL  
**Priority:** P0

If implementation differs from documentation:

```text
fix implementation
OR
update documentation
```

Do not leave ambiguity.

---

# 31. PHASE 15C — DEMO PREPARATION

## T-ALL-064 — Prepare Scenario A data

**Owner:** ALL  
**Priority:** P0

---

## T-ALL-065 — Prepare Scenario B data

**Owner:** ALL  
**Priority:** P0

---

## T-ALL-066 — Prepare Scenario C data

**Owner:** ALL  
**Priority:** P0

---

## T-ALL-067 — Prepare Scenario D data

**Owner:** ALL  
**Priority:** P0

---

## T-ALL-068 — Prepare Scenario E data

**Owner:** ALL  
**Priority:** P0

---

## T-P3-053 — Create demo navigation shortcuts

**Owner:** P3  
**Priority:** P2

Make it fast to switch:

```text
ambulance
hospital
admin
```

---

## T-P3-054 — Make Accept/Reject visually prominent

**Owner:** P3  
**Priority:** P1

---

## T-P3-055 — Make stale state visible

**Owner:** P3  
**Priority:** P1

---

## T-P3-056 — Make reroute visually obvious

**Owner:** P3  
**Priority:** P0

---

## T-P3-057 — Make mass-casualty distribution visually obvious

**Owner:** P3  
**Priority:** P0

---

## T-ALL-069 — Assign demo devices

**Owner:** ALL  
**Priority:** P0

```text
Device 1 = ambulance
Device 2 = hospital
Device 3 = admin
```

---

## T-ALL-070 — Assign narrator

**Owner:** ALL  
**Priority:** P1

---

## T-ALL-071 — Assign device operators

**Owner:** ALL  
**Priority:** P1

---

# 32. PHASE 15D — DEMO REHEARSAL

## T-ALL-072 — Rehearse Scenario A

**Owner:** ALL  
**Priority:** P0

Run without slides.

---

## T-ALL-073 — Rehearse Scenario B rejection

**Owner:** ALL  
**Priority:** P0

---

## T-ALL-074 — Rehearse Scenario B timeout

**Owner:** ALL  
**Priority:** P0

---

## T-ALL-075 — Rehearse Scenario C

**Owner:** ALL  
**Priority:** P0

---

## T-ALL-076 — Rehearse Scenario D

**Owner:** ALL  
**Priority:** P0

---

## T-ALL-077 — Rehearse Scenario E

**Owner:** ALL  
**Priority:** P0

---

## T-ALL-078 — Rehearse full five-scenario run

**Owner:** ALL  
**Priority:** P0

No manual database edits during the run.

---

## T-ALL-079 — Rehearse on backup network

**Owner:** ALL  
**Priority:** P1

Test:

```text
phone hotspot
```

---

## T-ALL-080 — Rehearse from final deployment URL

**Owner:** ALL  
**Priority:** P0

---

# 33. PHASE 15E — JUDGE Q&A PREPARATION

## T-ALL-081 — Prepare architecture explanation

**Owner:** ALL  
**Priority:** P1

Explain:

```text
frontend
backend
Firestore
realtime
matching
```

---

## T-P1-048 — Prepare matching explanation

**Owner:** P1  
**Priority:** P1

Explain:

```text
eligibility
capability match
distance
load
freshness
score
```

---

## T-P2-098 — Prepare transaction explanation

**Owner:** P2  
**Priority:** P1

Explain double-booking prevention.

---

## T-P2-099 — Prepare realtime explanation

**Owner:** P2  
**Priority:** P1

Explain:

```text
onSnapshot
```

and cross-device propagation.

---

## T-P2-100 — Prepare AI explanation

**Owner:** P2  
**Priority:** P2

Explain:

```text
AI does not decide routing.
```

---

## T-P3-058 — Prepare frontend explanation

**Owner:** P3  
**Priority:** P1

Explain:

```text
role routes
realtime hooks
responsive UI
```

---

## T-ALL-082 — Prepare limitation answer

**Owner:** ALL  
**Priority:** P1

Know exactly what is:

```text
prototype
simulated
future work
```

---

## T-ALL-083 — Prepare "why not bed dashboard" answer

**Owner:** ALL  
**Priority:** P1

Answer technically:

```text
passive availability
vs
active commitment protocol
```

---

# 34. PHASE 16 — FINAL GIT AND SUBMISSION FREEZE

## T-ALL-084 — Merge all accepted feature branches

**Owner:** ALL  
**Priority:** P0

Before final freeze:

```text
backend-core → main
backend-realtime-ai → main
frontend → main
```

only after testing.

---

## T-ALL-085 — Pull latest main

**Owner:** ALL  
**Priority:** P0

---

## T-ALL-086 — Run production build

**Owner:** ALL  
**Priority:** P0

---

## T-ALL-087 — Run final unit tests

**Owner:** ALL  
**Priority:** P0

---

## T-ALL-088 — Run final integration tests

**Owner:** ALL  
**Priority:** P0

---

## T-ALL-089 — Run final five-scenario demo

**Owner:** ALL  
**Priority:** P0

---

## T-ALL-090 — Inspect Git graph

**Owner:** ALL  
**Priority:** P0

Command:

```bash
git log --oneline --graph --all
```

Verify:

```text
meaningful commits
all members
feature branches
merge history
```

---

## T-ALL-091 — Verify every member has meaningful commits

**Owner:** ALL  
**Priority:** P0

The hackathon minimum is two meaningful contributions/member.

Target naturally exceeds this through normal work.

---

## T-ALL-092 — Verify no secret commit

**Owner:** ALL  
**Priority:** P0

Check history as well as current files.

---

## T-ALL-093 — Verify README

**Owner:** ALL  
**Priority:** P0

---

## T-ALL-094 — Verify documentation files

**Owner:** ALL  
**Priority:** P1

Required:

```text
architecture.md
data-model.md
api-contract.md
spec.md
plans.md
tasks.md
```

---

## T-ALL-095 — Verify deployment link

**Owner:** ALL  
**Priority:** P0

Open in clean browser.

---

## T-ALL-096 — Verify demo credentials if applicable

**Owner:** ALL  
**Priority:** P1

---

## T-ALL-097 — Verify organizer access/collaboration

**Owner:** ALL  
**Priority:** P0

---

## T-ALL-098 — Final compliance checklist

**Owner:** ALL  
**Priority:** P0

Verify:

```text
public repository
meaningful commits
2+ contributions each
stable main
README
functional MVP
deployment
no secrets
AI disclosure
third-party disclosure
demo video
```

---

## T-ALL-099 — Record final demo video

**Owner:** ALL  
**Priority:** P0

Maximum:

```text
5 minutes
```

Target the concise five-scenario structure.

---

## T-ALL-100 — Verify final video playback

**Owner:** ALL  
**Priority:** P0

Test:

```text
file opens
audio works
video plays
correct version shown
under 5 minutes
```

---

## T-ALL-101 — Freeze main

**Owner:** ALL  
**Priority:** P0

Final state:

```text
origin/main
=
submitted project
```

---

# 35. POST-FREEZE RULE

After final repository freeze:

```text
do not modify main
```

unless organizers explicitly permit changes.

---

# 36. TASK EXECUTION ORDER

The strict dependency order is:

```text
T-ALL-001
T-ALL-003
T-ALL-005
T-ALL-007
T-ALL-008
T-ALL-009
T-ALL-010
T-ALL-011
T-ALL-012
T-ALL-015
T-ALL-016
T-ALL-017
T-ALL-018
T-ALL-020
        ↓
shared types
        ↓
matching domain
        ↓
Firestore services
        ↓
frontend shell
        ↓
Scenario A
        ↓
Scenario B
        ↓
concurrency
        ↓
mass casualty
        ↓
stale/audit
        ↓
admin
        ↓
mid-transit
        ↓
AI
        ↓
deployment
        ↓
hardening
        ↓
documentation
        ↓
demo
        ↓
freeze
```

---

# 37. PARALLEL WORK MAP

## P1 can work independently on:

```text
need rules
distance
eligibility
capability scoring
load factor
freshness
ranking
mass-casualty algorithm
```

using in-memory fixtures.

## P2 can work independently on:

```text
Firebase
Firestore
repositories
request lifecycle
transactions
audit
reliability
seed data
```

using mock requests/cases where necessary.

## P3 can work independently on:

```text
all three interfaces
loading states
status components
countdown
mock service integration
responsive layout
```

using contract-compliant mock data.

---

# 38. FIRST 3-HOUR TASK SELECTION

During the first three hours:

### P1

```text
T-P1-001
T-P1-002
T-P1-003
T-P1-004
T-P1-005
T-P1-006
T-P1-007
T-P1-008
T-P1-009
T-P1-010
T-P1-011
T-P1-012
T-P1-013
T-P1-014
T-P1-015
T-P1-016
```

### P2

```text
T-T-ALL environment tasks
T-P2-001
T-P2-002
T-P2-003
T-P2-004
T-P2-005
T-P2-006
T-P2-007
T-P2-008
```

### P3

```text
T-ALL-013
T-ALL-014
T-ALL-015
T-P3-001
T-P3-002
T-P3-003
T-P3-004
T-P3-005
T-P3-006
T-P3-007
```

---

# 39. FIRST VERTICAL-SLICE TASK SET

These are the most important tasks immediately after scaffolding:

```text
T-P1-018
T-P1-020
T-P1-021
T-P1-022
T-P1-023
T-P1-024
T-P1-028

T-P2-012
T-P2-013
T-P2-014
T-P2-015
T-P2-016
T-P2-017

T-P3-011
T-P3-014
T-P3-015
T-P3-016
T-P3-017
T-P3-018
```

Then:

```text
T-ALL-024
T-ALL-025
T-ALL-026
```

---

# 40. STOP CONDITIONS

The team must stop adding new features when:

```text
Scenario A works
Scenario B works
concurrency works
mass casualty works
stale works
audit works
```

After that:

```text
polish
rehearsal
documentation
```

---

# 41. EMERGENCY STOP CONDITIONS

Stop feature expansion immediately if:

```text
main is broken
Firebase deployment is broken
realtime synchronization is unreliable
acceptance is double-consuming resources
reroute is creating duplicates
Scenario A cannot complete
```

---

# 42. EMERGENCY SCOPE CUT ORDER

If behind schedule:

```text
1. Reduce admin sophistication
2. Disable AI
3. Simplify map
4. Simplify reliability visualization
5. Simplify stale-data UI
6. Simplify mass-casualty animation
```

Do not remove the core:

```text
matching
commitment
reroute
resource safety
audit
```

---

# 43. DAILY TASK REPORT FORMAT

Each developer reports:

```text
Completed:
T-XXXX

In progress:
T-XXXX

Blocked:
T-XXXX

Needs:
P1/P2/P3

Contract change:
yes/no
```

---

# 44. TASK CARD TEMPLATE FOR NEW TASKS

Any newly discovered necessary task should be added using:

```text
## T-NEW-XXX — Task Name

Owner:
Branch:
Priority:
Depends On:

Objective:

Implementation:

Files/Area:

Validation:

Definition of Done:

Merge Condition:
```

Do not add undocumented ad-hoc work and later claim it as a planned feature.

---

# 45. TASK DEFINITION OF DONE

A task is complete when:

```text
implementation exists
+
tests/validation completed
+
contract respected
+
no secrets
+
code understandable to owner
+
branch contains meaningful commit
```

For user-facing features:

```text
+
demoed
```

---

# 46. TASK MERGE CHECKLIST

Before creating a Pull Request:

```text
[ ] Task objective met
[ ] Validation run
[ ] Build passes
[ ] Tests pass
[ ] Contract respected
[ ] No secrets
[ ] No unrelated changes
[ ] README/docs updated if necessary
[ ] Commit message descriptive
```

---

# 47. MAIN MERGE CHECKLIST

Before merge:

```text
[ ] branch pushed
[ ] PR created
[ ] changed files reviewed
[ ] tests passed
[ ] integration smoke test passed
[ ] no contract drift
[ ] main remains stable
```

---

# 48. TASK TRACEABILITY

Core PRD feature → task groups:

| PRD Feature | Task Group |
|---|---|
| Hospital capability profiles | P2-006, P2-014, P3-030–034 |
| Need profile | P1-006–013 |
| Matching | P1-014–031, P2-016 |
| Why hospital | P3-010, P3-016 |
| Accept/reject | P2-017–020, P3-019 |
| Timeout | P2-031–032, P3-022 |
| Auto-reroute | P1-030–031, P2-021–023, P3-020–021 |
| Concurrency | P2-033–045 |
| Audit | P2-051–065 |
| Mass casualty | P1-034–040, P2-046–049, P3-023–026 |
| Stale data | P1-041–043, P2-050, P3-027–028 |
| Reliability | P2-066–068, P3-029 |
| Admin dashboard | P2-069–070, P3-030–039 |
| Mid-transit reroute | P1-044, P2-071–076, P3-040–041 |
| AI explanation | P2-077–082, P3-042 |
| Deployment | P2-083–085, P3-043–044 |
| Testing | P1-045+, P2-086+, P3-045+, ALL-036+ |
| Documentation | ALL/P1/P2/P3 Phase 15 tasks |
| Final submission | ALL-084–101 |

---

# 49. CONTRIBUTION TRACEABILITY

## Person 1

Primary explainable contribution:

```text
deterministic intelligence layer
```

Evidence:

```text
matching commits
tests
mass-casualty logic
```

---

## Person 2

Primary explainable contribution:

```text
realtime transaction/state infrastructure
```

Evidence:

```text
Firestore
transactions
request lifecycle
audit
reliability
AI adapter
```

---

## Person 3

Primary explainable contribution:

```text
multi-interface frontend
```

Evidence:

```text
ambulance flow
hospital flow
admin flow
realtime UI
responsive design
```

---

# 50. EXPECTED MINIMUM CONTRIBUTION DISTRIBUTION

The three members should naturally accumulate meaningful work above the hackathon minimum.

Avoid:

```text
P1 = 30 commits
P2 = 30 commits
P3 = 2 tiny commits
```

Instead target a visibly balanced contribution history.

---

# 51. DEMO FEATURE OWNERSHIP

## Scenario A

```text
P1 = scoring
P2 = request/realtime
P3 = interface
```

## Scenario B

```text
P1 = candidate/ranking
P2 = lifecycle/reroute
P3 = reroute UI
```

## Scenario C

```text
P1 = optimization
P2 = commit/persistence
P3 = visualization
```

## Scenario D

```text
P1 = freshness
P2 = seed
P3 = freshness UI
```

## Scenario E

```text
P2 = audit/reliability
P3 = dashboard
P1 = explain score
```

This ensures the demo naturally showcases contributions from all three.

---

# 52. HACKATHON COMPLIANCE TASK MAP

Required:

```text
Public repository
→ T-ALL-005 / 006

Meaningful commits
→ all task commits

2+ contributions each
→ contribution traceability

Stable main
→ branch/PR tasks

README
→ Phase 15

Working prototype
→ Scenario A–E

Reproducibility
→ documentation

No secrets
→ T-ALL-050–052

AI disclosure
→ T-ALL-055

Third-party disclosure
→ T-ALL-056

Deployment
→ T-P2-083 / T-P3-043

≤5-minute demo video
→ T-ALL-099–100
```

---

# 53. FINAL RELEASE CHECKLIST

Before submission, all of the following must be checked:

```text
PRODUCT
[ ] Scenario A works
[ ] Scenario B works
[ ] Scenario C works
[ ] Scenario D works
[ ] Scenario E works

BACKEND
[ ] matching
[ ] request lifecycle
[ ] transaction
[ ] reroute
[ ] audit
[ ] reliability

FRONTEND
[ ] ambulance
[ ] hospital
[ ] admin
[ ] realtime
[ ] responsive

DATA
[ ] synthetic
[ ] seeded
[ ] stale hospital
[ ] deterministic demo states

SECURITY
[ ] no secrets
[ ] rules verified
[ ] .env ignored

GIT
[ ] branches
[ ] meaningful commits
[ ] all contributors
[ ] main stable

DOCS
[ ] README
[ ] architecture
[ ] data model
[ ] API contract
[ ] spec
[ ] plans
[ ] tasks

DEPLOYMENT
[ ] live link
[ ] clean-browser test
[ ] backup network

DEMO
[ ] devices assigned
[ ] script rehearsed
[ ] five scenarios rehearsed
[ ] video <= 5 min

SUBMISSION
[ ] repo submitted
[ ] video submitted
[ ] PPT ready
[ ] credentials ready if needed
[ ] final main frozen
```

---

# 54. FINAL RULE

When uncertain about what to do next, choose the **earliest incomplete task on the critical path** before starting a lower-priority task.

In practice:

```text
broken Scenario A
    >
perfect admin animations

broken reroute
    >
AI explanation polish

broken concurrency
    >
map styling
```

The objective is a complete, stable, explainable system rather than a large collection of partially finished features.

---

# 55. End of Task Board

The full implementation should now proceed through:

```text
tasks.md
   ↓
developer-owned work
   ↓
tests
   ↓
Pull Requests
   ↓
main
   ↓
integration
   ↓
rehearsal
   ↓
submission
```

No coding assistant should be given the entire task board as an instruction to "build everything."

Use individual task cards or small task batches so every change remains reviewable, testable, and attributable to the correct team member.
