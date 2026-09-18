# PLANS — Capability-Match Ambulance–Hospital Coordination System

## 0. Document Control

| Field | Value |
|---|---|
| Document | `plans.md` |
| Project | Capability-Match Ambulance–Hospital Coordination System |
| Track | HealthTech — Accessible Care & Intelligent Patient Support |
| Team | 3 members |
| Build window | Approximately 18 hours |
| Primary source | `PRD_Final.md` |
| Foundation documents | `architecture.md`, `data-model.md`, `api-contract.md`, `spec.md` |
| Status | Master execution plan |
| Purpose | Convert the frozen product/specification into an executable 3-person development plan |

---

# 1. Purpose of This Plan

This document is the team's operational playbook.

The earlier documents answer:

```text
What are we building?
How is it architected?
What data does it use?
How do components communicate?
What exact behavior is required?
```

This document answers:

```text
When do we build it?
Who builds it?
In what order?
What can be built in parallel?
What blocks what?
When do we integrate?
When do we merge?
How do we recover when something fails?
What must be working by each hour?
```

The plan is optimized for the actual constraints of the hackathon:

- 3-person team.
- Approximately 18 hours.
- One public GitHub repository.
- Stable `main`.
- Meaningful development history.
- Functional frontend is mandatory.
- Core demo functionality must work live.
- Judges may inspect individual contribution history and ask each member to explain their work.
- Significant AI-generated work must be disclosed.

The technical rules specifically require meaningful commits from each member, feature branches merged into stable `main`, reproducible documentation, and a functional MVP rather than a presentation-only prototype.

---

# 2. Source-of-Truth Hierarchy

The team must use this hierarchy:

```text
1. PRD_Final.md
        ↓
2. architecture.md
        ↓
3. data-model.md
        ↓
4. api-contract.md
        ↓
5. spec.md
        ↓
6. plans.md
        ↓
7. tasks.md
```

Higher-level documents take precedence over lower-level execution details.

## 2.1 PRD authority

`PRD_Final.md` is the product and scope authority.

It explicitly states that it supersedes both:

```text
Project_Plan.md
Project_Plan_Old.md
```

Therefore the old plan is historical context only.

Do not resurrect old scope decisions merely because an old plan contained them.

---

# 3. Planning Philosophy

The project must be developed as a series of **vertical slices**, not three isolated piles of code.

Bad approach:

```text
Backend finished
        ↓
Frontend finished
        ↓
Try integration at hour 15
```

Preferred approach:

```text
Small backend slice
        +
small frontend slice
        +
realtime connection
        ↓
working end-to-end flow
        ↓
expand feature
```

The first fully working slice should exist early.

---

# 4. Core Development Loop

Every feature follows:

```text
PLAN
 ↓
IMPLEMENT
 ↓
UNIT TEST
 ↓
LOCAL TEST
 ↓
INTEGRATE
 ↓
DEMO TEST
 ↓
COMMIT
 ↓
PUSH BRANCH
 ↓
PULL REQUEST
 ↓
REVIEW
 ↓
MERGE MAIN
```

No developer should spend several hours building a large feature without proving that its contract still integrates with the rest of the system.

---

# 5. Three-Person Team Model

The team has exactly three primary engineering roles.

## Person 1 — Backend Core + Matching

This person is not "AI person."

They own the deterministic domain logic.

Primary areas:

```text
need-profile rules
capability eligibility
distance calculation
hospital scoring
ranking
tie-breaking
mass-casualty distribution
matching tests
```

Primary branch:

```text
backend-core
```

---

## Person 2 — Backend Realtime + State + AI

This person is also a backend engineer.

Primary areas:

```text
Firebase
Firestore
Cloud Functions/service layer
request lifecycle
transactions
resource holds
rerouting
audit
reliability
seed data
AI explanation adapter
```

Primary branch:

```text
backend-realtime-ai
```

AI remains a secondary layer. It is not the authoritative routing engine.

---

## Person 3 — Frontend

This person owns the full frontend surface rather than only one screen.

Primary areas:

```text
Ambulance interface
Hospital interface
Admin interface
realtime subscriptions
service integration
responsive UI
loading/error/reconnect states
demo presentation polish
frontend tests
```

Primary branch:

```text
frontend
```

---

# 6. Everyone Must Contribute

The team must not allow one member to become a "support-only" person.

Each person must have:

```text
technical ownership
meaningful commits
explainable code
demonstrable functionality
```

The three roles are complementary, but all three are genuine software development roles.

---

# 7. Ownership Matrix

| Area | Person 1 | Person 2 | Person 3 |
|---|---|---|---|
| Firestore setup | consult | primary | consume |
| Data model | primary domain | primary infrastructure | consume |
| Need-profile rules | primary | integrate | display |
| Matching formula | primary | integrate | display |
| Hospital ranking | primary | integrate | display |
| Resource transactions | consult | primary | trigger via UI |
| Request lifecycle | consult | primary | display |
| Rerouting | logic input | primary orchestration | display |
| Audit | consult | primary | consume |
| Reliability | consult | primary | display |
| Mass casualty algorithm | primary | transaction/commit support | display |
| AI explanation | provide facts | primary | render |
| Ambulance UI | consult | API support | primary |
| Hospital UI | consult | API support | primary |
| Admin UI | consult | data support | primary |
| Seed data | capability design | implementation | verify visually |
| Unit tests | primary | primary | primary frontend tests |
| Integration tests | shared | shared | shared |
| README | shared | shared | shared |
| Architecture diagrams | shared | shared | shared |
| Demo rehearsal | shared | shared | shared |

---

# 8. Branch Strategy

The project uses:

```text
main
│
├── backend-core
├── backend-realtime-ai
└── frontend
```

This is deliberately simple because the team is learning collaborative Git during the hackathon.

---

# 9. Branch Responsibilities

## `main`

Represents:

```text
latest stable integrated project
```

Never use it as someone's personal development branch.

---

## `backend-core`

Owned primarily by Person 1.

Contains:

```text
matching logic
rules
scoring
mass-casualty logic
domain tests
```

---

## `backend-realtime-ai`

Owned primarily by Person 2.

Contains:

```text
Firestore integration
Cloud Functions/application services
request lifecycle
transactions
audit
reliability
AI adapter
seed infrastructure
```

---

## `frontend`

Owned primarily by Person 3.

Contains:

```text
React application
pages
components
hooks
frontend service layer
UI states
styles
```

---

# 10. Why Three Long-Lived Branches Instead of Many Feature Branches

The team does not yet need a large Git branching hierarchy.

With three members and an 18-hour build:

```text
one person
=
one primary working branch
```

is easier to understand.

If a particular feature creates significant parallel development or conflict, we may temporarily create a short-lived feature branch:

```text
backend-core
   ↓
feature/mass-casualty
```

But short-lived branches should return quickly to the owner's primary branch.

---

# 11. Git Rules

## Rule 1

Do not directly build feature work on `main`.

## Rule 2

Pull/rebase/merge from `main` regularly.

## Rule 3

Push meaningful work frequently.

## Rule 4

Use descriptive commit messages.

## Rule 5

Review before merging.

## Rule 6

Do not merge known broken code into `main`.

## Rule 7

Never commit secrets.

## Rule 8

Do not hide work until the last hour.

---

# 12. Initial Repository Setup Plan

The first repository commit should establish:

```text
README.md
.gitignore
.env.example
docs/
frontend/
functions/
scripts/
firebase.json
firestore.rules
firestore.indexes.json
```

Foundation documents:

```text
docs/architecture.md
docs/data-model.md
docs/api-contract.md
docs/spec.md
docs/plans.md
```

The team may keep the files in the repository root instead, but all six documents must remain discoverable and consistently named.

---

# 13. First Git Setup

One member creates the GitHub repository.

That member runs:

```bash
git init
git branch -M main
git add .
git commit -m "chore: initialize project foundation"
git remote add origin <REPO_URL>
git push -u origin main
```

Then the team creates:

```bash
git checkout -b backend-core
git push -u origin backend-core
```

and similarly:

```bash
git checkout -b backend-realtime-ai
git push -u origin backend-realtime-ai
```

and:

```bash
git checkout -b frontend
git push -u origin frontend
```

Only one person needs to create the initial branches; the other teammates can simply check them out.

---

# 14. First-Day Git Mental Model

Think:

```text
main
=
stable shared road

your branch
=
your personal working road

Pull Request
=
request to connect your road back to the stable road
```

The branch protects the stable version.

---

# 15. Daily/Hourly Git Cycle

Before starting substantial work:

```bash
git status
git pull origin main
```

After meaningful progress:

```bash
git add .
git commit -m "feat: ..."
git push
```

Before requesting a merge:

```bash
git fetch origin
git diff origin/main
```

Then create the GitHub Pull Request.

Exact conflict-resolution commands should be used only when a real conflict occurs.

---

# 16. Pull Request Rule

Every meaningful merged feature should have:

```text
branch
→ commit(s)
→ Pull Request
→ review
→ merge
```

The PR description should say:

```text
What changed?
Why?
How tested?
Any contract changes?
```

---

# 17. Shared Contract Rule

No branch may silently modify:

```text
data-model
API schema
request state
scoring formula
core status model
```

without updating the corresponding documentation.

Contract changes must be visible to all three developers.

---

# 18. Merge Frequency

The PRD/rules require frequent meaningful development activity.

Recommended pattern:

```text
every 1–2 hours:
meaningful commit from active developer
```

and:

```text
every major completed integration slice:
Pull Request → main
```

Do not create artificial commits.

---

# 19. Main Branch Health Rule

At all milestone checkpoints:

```text
main must be buildable
```

If a feature is half-done:

```text
keep it on the developer branch
```

Do not merge half-working functionality simply to create a commit.

---

# 20. Master 18-Hour Plan

The 18-hour build is divided into:

```text
PHASE 0 — Foundation
PHASE 1 — Core backend/frontend skeleton
PHASE 2 — First vertical slice
PHASE 3 — Commitment protocol
PHASE 4 — Concurrency + resource safety
PHASE 5 — Mass casualty
PHASE 6 — Stale data + accountability
PHASE 7 — Mid-transit + polish
PHASE 8 — Hardening
PHASE 9 — Submission
```

---

# 21. Phase 0 — Foundation

## Target window

```text
Hour 0–1
```

## All three together

Tasks:

```text
Create repository
Create branches
Verify project structure
Create Firebase project
Confirm documents
Confirm data model
Confirm API contract
Confirm spec
Create initial seed plan
```

No major feature development should start until the foundation is understood.

---

# 22. Hour 0–15 Minutes

### Goal

Repository and environment exist.

Person 1:

```text
verify repository
verify TypeScript/backend scaffold
```

Person 2:

```text
create/configure Firebase
verify Firestore
verify Functions environment
```

Person 3:

```text
create React/Vite frontend shell
verify local frontend run
```

All three make meaningful commits.

---

# 23. Hour 15–30 Minutes

### Goal

Common contract is translated into code structures.

Person 1:

```text
domain types
matching types
need-profile types
```

Person 2:

```text
Firestore config
backend service skeleton
request/realtime types
```

Person 3:

```text
route skeleton
shared TypeScript types
layout shell
```

---

# 24. Hour 30–60 Minutes

### Goal

Basic environment is executable.

Target:

```text
frontend runs
backend functions run
Firestore connection works
seed script can write at least one hospital
```

### Checkpoint

At Hour 1 the team must be able to say:

```text
The repository works.
Firebase works.
Frontend works.
The data model is represented.
Branches work.
```

---

# 25. Phase 1 — Backend and Frontend Skeleton

## Target window

```text
Hour 1–3
```

Parallel work begins.

---

# 26. Person 1 — Hour 1–3

Build:

```text
need-profile rules
capability matcher
distance calculation
scoring functions
ranking
```

Do not integrate deeply with Firestore yet.

Prefer pure functions.

Example conceptual pipeline:

```text
Case
 ↓
NeedProfile
 ↓
Hospital[]
 ↓
Eligibility
 ↓
ScoredHospital[]
 ↓
RankedHospital[]
```

---

# 27. Person 2 — Hour 1–3

Build:

```text
Firebase initialization
Firestore repository helpers
case persistence
request persistence
request service skeleton
audit service skeleton
```

Target:

```text
can create/read documents
```

Do not spend this time building every edge case.

---

# 28. Person 3 — Hour 1–3

Build:

```text
application shell
routing
ambulance screen
hospital screen
admin screen
design tokens/layout
```

Use mock objects temporarily.

The mock objects MUST reflect `data-model.md`.

Do not invent different field names.

---

# 29. Phase 1 Checkpoint

At Hour 3:

```text
Person 1:
matching works with hard-coded in-memory data

Person 2:
Firestore read/write works

Person 3:
three role interfaces render
```

---

# 30. Phase 2 — First Vertical Slice

## Target window

```text
Hour 3–5/6
```

This is the most important early milestone.

The goal is:

```text
one cardiac case
→ one need profile
→ one hospital match
→ one request
→ hospital realtime screen
→ accept
→ ambulance realtime success
```

---

# 31. Person 1 — Vertical Slice

Integrate matching against Firestore hospital data.

Deliver:

```text
get eligible hospitals
calculate score
rank candidates
return top candidate
```

Tests:

```text
cardiac case
different hospital capabilities
correct candidate ranking
```

---

# 32. Person 2 — Vertical Slice

Implement:

```text
create request
set pending
set expires_at
write audit
listen/realtime state
accept transaction
```

The acceptance transaction is the first major backend stateful milestone.

---

# 33. Person 3 — Vertical Slice

Build:

```text
case form
need profile screen
Find Best Hospital button
pending request screen
hospital incoming request card
Accept button
accepted result
```

The ambulance and hospital screens should work without refresh.

---

# 34. Hour 5–6 Integration Checkpoint

The three developers stop independent work.

All three perform the exact Scenario A flow.

Checklist:

```text
[ ] Case created
[ ] Need profile generated
[ ] Correct hospital ranked
[ ] Request appears on hospital device
[ ] Countdown visible
[ ] Accept works
[ ] Hospital resource changes
[ ] Ambulance updates automatically
[ ] Audit entry appears
```

If any item fails:

```text
STOP NEW FEATURES
FIX THIS FLOW
```

Do not move to mass-casualty until Scenario A is stable.

---

# 35. Phase 3 — Commitment Protocol

## Target window

```text
Hour 6–9
```

Build the differentiator:

```text
Reject
Timeout
Auto-reroute
Concurrency
Resource holds
```

---

# 36. Person 1 — Hour 6–9

Focus:

```text
current-state candidate recalculation
attempted-hospital exclusion
reroute ranking
resource-aware eligibility
```

Also add:

```text
concurrency-relevant domain checks
```

---

# 37. Person 2 — Hour 6–9

Focus:

```text
request state machine
reject transaction
timeout transaction
reroute service
hold service
duplicate action protection
```

Target behavior:

```text
pending
  ↓
rejected/timed_out
  ↓
new active request
```

---

# 38. Person 3 — Hour 6–9

Focus:

```text
countdown
reject control
reroute animation/state
retry/error states
request history indicator
```

Ambulance must visibly show:

```text
Hospital A did not respond
Automatically rerouting...
```

Then:

```text
Hospital C
Request pending
```

---

# 39. Phase 3 Checkpoint

By Hour 9:

```text
Scenario A works
Scenario B works
```

Where Scenario B includes at least one of:

```text
reject → reroute
```

and preferably both:

```text
reject → reroute
timeout → reroute
```

---

# 40. Concurrency Demo

After the ordinary acceptance path works, test:

```text
one ICU slot
two competing requests
```

Expected:

```text
only one consumes it
```

This should be a real backend transaction test, not a UI simulation.

---

# 41. Phase 4 — Mass Casualty

## Target window

```text
Hour 9–12
```

This is the flagship visual feature.

---

# 42. Person 1 — Mass Casualty Algorithm

Build:

```text
incident group loading
case prioritization
candidate generation
bounded assignment search
resource simulation
concentration penalty
final assignment
```

Target:

```text
4 cases
3+ hospitals
different needs
```

---

# 43. Person 2 — Mass Casualty Commit

Build:

```text
group match request
assignment persistence
transactional resource commit
incident audit events
```

Ensure the plan is revalidated before writes.

---

# 44. Person 3 — Mass Casualty UI

Build:

```text
Add patient
incident group
patient cards
distribution visualization
hospital assignment cards
```

Ideal visual:

```text
Patient 1 → Hospital A
Patient 2 → Hospital C
Patient 3 → Hospital A
Patient 4 → Hospital D
```

with visible reasons.

---

# 45. Mass-Casualty Checkpoint

By Hour 12:

```text
4 synthetic patients
→ one incident
→ joint distribution
→ multiple destinations
→ valid resource state
```

must work.

Do not spend the hour making the animation perfect while the backend assignment is unstable.

---

# 46. Phase 5 — Stale Data + Accountability

## Target window

```text
Hour 12–13.5
```

This is deliberately compact.

---

# 47. Person 1

Implement:

```text
freshness calculation
freshness factor
stale candidate behavior
```

Test:

```text
fresh
stale
unknown
```

---

# 48. Person 2

Implement:

```text
audit completeness
reliability update
admin queries
```

Ensure audit snapshots contain decision-time state.

---

# 49. Person 3

Implement:

```text
fresh/stale/unknown badges
admin map/list
audit log
reliability cards
```

---

# 50. Phase 6 — Mid-Transit Reroute

## Target window

```text
Hour 13–14
```

This is the dynamic demonstration.

---

# 51. Person 1

Define the invalidation condition using existing matching requirements.

Example:

```text
case needs trauma_team
hospital turns trauma_team_off
```

Then:

```text
hospital no longer satisfies hard capability
```

---

# 52. Person 2

Implement:

```text
detect/trigger invalidation
supersede request
release hold
recalculate
create next request
audit
```

---

# 53. Person 3

Show:

```text
Route Update
Hospital A can no longer receive this case
Searching...
Rerouted to Hospital C
```

All without refreshing the ambulance screen.

---

# 54. Phase 7 — Stabilization and Polish

## Target window

```text
Hour 14–15.5
```

This phase is not for inventing features.

Focus:

```text
bugs
integration
UX
error states
responsive layout
demo reliability
```

---

# 55. Feature Freeze Rule

At approximately Hour 15:

```text
NO NEW CORE FEATURES
```

unless a required MVP component is genuinely missing.

From this point forward:

```text
stabilize > expand
```

---

# 56. Priority Order for Remaining Time

If time is short:

```text
1. Fix core Scenario A
2. Fix Scenario B
3. Fix concurrency
4. Fix mass casualty
5. Fix stale data
6. Fix audit
7. Fix admin visual polish
8. AI polish
9. Map polish
10. cosmetic extras
```

---

# 57. Phase 8 — Full Rehearsal

## Target window

```text
Hour 15.5–16.5
```

No feature development unless rehearsal reveals a blocking defect.

---

# 58. Rehearsal 1 — Clean Run

Run:

```text
Scenario A
Scenario B
Scenario C
Scenario D
Scenario E
```

with:

```text
actual devices
actual deployment
actual network
```

where possible.

---

# 59. Rehearsal 2 — Failure Run

Intentionally test:

```text
hospital rejects
hospital times out
resource unavailable
AI unavailable
GPS denied
map unavailable
network reconnect
```

The team must know the fallback behavior.

---

# 60. Rehearsal 3 — Judge Questions

Each member explains:

```text
What did you build?
Why did you build it this way?
What happens when it fails?
What happens concurrently?
Where is data stored?
How is the decision calculated?
```

---

# 61. Phase 9 — Documentation

## Target window

```text
Hour 16.5–17.25
```

Documentation should already exist.

This phase verifies rather than writes from zero.

---

# 62. README Finalization

Verify README includes:

```text
problem
solution
features
stack
architecture
API
database
setup
environment
run commands
deployment
demo flow
limitations
AI disclosure
third-party components
```

---

# 63. Submission Documentation

Ensure the repository includes:

```text
architecture.md
data-model.md
api-contract.md
spec.md
plans.md
tasks.md
README.md
```

The hackathon technical rules explicitly require README coverage of architecture, APIs, database, setup, and running instructions.

---

# 64. AI Disclosure

Document significant AI assistance.

The project team should identify:

```text
AI-assisted code
AI-assisted documentation
AI explanation layer
```

and ensure every member understands the submitted code they contributed.

---

# 65. Phase 10 — Final Submission

## Target window

```text
Hour 17.25–18
```

Sequence:

```text
Final test
 ↓
Demo video
 ↓
README verification
 ↓
Git history verification
 ↓
Deployment verification
 ↓
Freeze main
```

---

# 66. Final Git Freeze

The final state must be:

```text
origin/main
=
submitted project
```

Before submission:

```bash
git checkout main
git pull origin main
```

Then verify:

```text
build
test
deploy
demo
```

No important work should remain only on another branch.

---

# 67. Branch Merge Schedule

Suggested merge windows:

```text
Hour 1:
foundation branches established

Hour 5–6:
first backend/frontend vertical slice merged

Hour 8–9:
reroute/concurrency merge

Hour 11–12:
mass-casualty merge

Hour 13:
stale/audit merge

Hour 14–15:
mid-transit/admin merge

Hour 15.5+:
stabilization merges only
```

Do not interpret these as mandatory timestamps if the build progresses differently.

The key requirement is frequent integration.

---

# 68. Parallel Dependency Map

```text
                         DATA MODEL
                             │
                  ┌──────────┼──────────┐
                  ▼          ▼          ▼
             Matching    Firestore   Frontend
             Domain      Layer       Shell
                  │          │          │
                  └──────┬───┴──────────┘
                         ▼
                  FIRST VERTICAL SLICE
                         │
                         ▼
                 REQUEST LIFECYCLE
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
          Reject      Timeout     Accept
             │           │           │
             └───────────┼───────────┘
                         ▼
                      REROUTE
                         │
                         ▼
                    CONCURRENCY
                         │
                         ▼
                   MASS CASUALTY
                         │
             ┌───────────┼───────────┐
             ▼           ▼           ▼
          STALE       AUDIT      RELIABILITY
             │           │           │
             └───────────┼───────────┘
                         ▼
                    ADMIN VIEW
                         │
                         ▼
                  FULL REHEARSAL
```

---

# 69. Critical Path

The actual critical path is:

```text
Firebase
 ↓
Firestore model
 ↓
matching
 ↓
request creation
 ↓
realtime hospital update
 ↓
acceptance transaction
 ↓
ambulance realtime update
```

This must be completed before spending meaningful time on polish.

---

# 70. Secondary Path

After core acceptance works:

```text
reject
 ↓
timeout
 ↓
reroute
 ↓
concurrency
```

Then:

```text
mass casualty
```

Then:

```text
stale
audit
reliability
admin
mid-transit
```

---

# 71. What Can Be Built Independently

Person 1 can independently build:

```text
rules
distance
scoring
ranking
```

using mock hospital objects.

Person 2 can independently build:

```text
Firestore
request service
transaction
audit
```

using seeded/mock requests.

Person 3 can independently build:

```text
all screens
```

using mock API objects that exactly follow `api-contract.md`.

This is intentional.

---

# 72. What Must Not Be Built Independently

Do not independently invent:

```text
request status names
API payloads
data field names
scoring semantics
resource meanings
case categories
```

These are shared contracts.

---

# 73. Mock Data Rule for Frontend

Frontend mocks must be copied from:

```text
data-model.md
api-contract.md
spec.md
```

Example:

```json
{
  "id": "request_001",
  "status": "pending",
  "attempt_number": 1
}
```

not a custom mock such as:

```json
{
  "requestState": "waiting"
}
```

---

# 74. Backend Mock Rule

Backend tests may use:

```text
in-memory Hospital[]
Case
Request
```

but must return objects compatible with the final API contract.

---

# 75. Integration Contract Freeze

Before Hour 3:

```text
field names frozen
status names frozen
route shapes frozen
```

After Hour 3:

Only change them when there is a genuine blocker.

---

# 76. Architecture Change Policy

If someone says:

> "I think we should switch databases."

The immediate response is:

```text
Is the current design actually blocking the MVP?
```

If not:

```text
do not change
```

An 18-hour hackathon is not the time to repeatedly restart architecture.

---

# 77. Stack Change Policy

Likewise:

```text
React → another framework
Firebase → another backend
Firestore → another database
```

should only happen if the current stack demonstrably fails a core requirement.

The PRD intentionally selected Firebase/Firestore for realtime reliability and low operational overhead.

---

# 78. AI Scope Control

AI is a secondary workstream.

Do not allow:

```text
LLM integration
```

to block:

```text
routing
accept
reroute
```

AI should be implemented as:

```text
optional adapter
```

after deterministic routing exists.

---

# 79. Map Scope Control

The map is a visualization.

Do not allow:

```text
tile configuration
map API key
marker animation
```

to block:

```text
matching
```

Distance must continue to work with Haversine.

---

# 80. Authentication Scope Control

If authentication becomes a significant time sink:

```text
use seeded demo identities
```

provided the application still demonstrates clear role separation.

Do not spend several hours implementing production-grade identity management.

---

# 81. Deployment Scope Control

Preferred:

```text
Firebase frontend
Firebase Functions
Firestore
```

A Vercel frontend is an acceptable fallback if Firebase Hosting becomes problematic.

Do not maintain two production frontend stacks unnecessarily.

---

# 82. Hourly Team Sync

Every roughly 60–120 minutes:

Each person reports:

```text
DONE:
BLOCKED:
NEXT:
CONTRACT CHANGES:
```

The sync should take:

```text
5 minutes or less
```

unless there is a real architecture blocker.

---

# 83. Blocker Escalation

A developer is blocked when they cannot make meaningful progress because of:

```text
another subsystem
environment failure
contract ambiguity
tool failure
```

They should report immediately.

Do not silently work around a contract problem for three hours.

---

# 84. Blocker Categories

Use:

```text
P0 = demo/core system stopped
P1 = major feature blocked
P2 = secondary feature blocked
P3 = cosmetic
```

Examples:

```text
Firebase unavailable → P0
Mass-casualty visual broken → P1
AI wording ugly → P2
Border radius wrong → P3
```

---

# 85. P0 Response

For P0:

```text
stop new feature work
all three investigate
choose quickest stable path
document workaround
```

---

# 86. P1 Response

For P1:

```text
assign owner
continue independent work
set a short recovery deadline
```

Do not let one blocked person stop the other two.

---

# 87. P2/P3 Response

Defer until:

```text
core MVP stable
```

---

# 88. Timebox Rule

Any uncertain implementation should be timeboxed.

Examples:

```text
Trying new map package
Trying new AI provider
Debugging Firebase deployment
```

If it exceeds the agreed timebox:

```text
fallback
```

instead of endless debugging.

---

# 89. Fallback Hierarchy

Use:

```text
Preferred implementation
 ↓
simplified implementation
 ↓
deterministic local fallback
 ↓
roadmap/omit
```

Examples:

```text
AI API
 ↓
template explanation

Map API
 ↓
Leaflet/Haversine

GPS
 ↓
demo coordinate

3rd device
 ↓
admin tab
```

---

# 90. Feature Acceptance Criteria

A feature is not "done" because code exists.

It is done when:

```text
implemented
tested
integrated
documented
demoable
```

---

# 91. Definition of Done — Core Matching

```text
[ ] Need profile generated
[ ] Candidate eligibility works
[ ] Distance works
[ ] Load factor works
[ ] Freshness works
[ ] Final score works
[ ] Deterministic ranking
[ ] Tests pass
[ ] API returns contract-compliant data
```

---

# 92. Definition of Done — Request Lifecycle

```text
[ ] Create
[ ] Pending
[ ] Countdown
[ ] Accept
[ ] Reject
[ ] Timeout
[ ] Reroute
[ ] Supersede
[ ] Audit
[ ] Duplicate-action protection
```

---

# 93. Definition of Done — Concurrency

```text
[ ] Firestore transaction
[ ] One resource cannot be double-consumed
[ ] Double Accept tested
[ ] Negative resource prevented
[ ] Conflict surfaced
```

---

# 94. Definition of Done — Mass Casualty

```text
[ ] Incident group
[ ] 4 cases
[ ] Different needs
[ ] Candidate lists
[ ] Joint assignment
[ ] Capacity constraints
[ ] Distribution displayed
[ ] Requests committed
```

---

# 95. Definition of Done — Stale Data

```text
[ ] Fresh classification
[ ] Stale classification
[ ] Unknown classification
[ ] Score adjustment
[ ] UI label
[ ] Audit snapshot
```

---

# 96. Definition of Done — Accountability

```text
[ ] Audit events
[ ] Decision snapshots
[ ] Reliability data
[ ] Admin view
[ ] Historical request chain
```

---

# 97. Definition of Done — Frontend

```text
[ ] Ambulance flow
[ ] Hospital flow
[ ] Admin flow
[ ] Realtime
[ ] Countdown
[ ] Accept/reject
[ ] Reroute
[ ] Responsive
[ ] Error/loading states
```

---

# 98. Definition of Done — AI

```text
[ ] Optional adapter
[ ] Structured inputs only
[ ] Cannot alter routing
[ ] Fallback works
[ ] Disclosure documented
```

---

# 99. Demo Scenario Plan

The PRD defines five core scenarios.

Use these exact conceptual stories.

---

# 100. Scenario A — Clean Single-Case Match

### Duration target

```text
~30–45 seconds
```

### Flow

```text
Ambulance
→ Cardiac
→ Red
→ Need profile
→ Find hospital
→ Hospital receives request
→ Accept
→ Ambulance updates
```

### Point demonstrated

```text
capability matching + realtime commitment
```

---

# 101. Scenario B — Reject / Timeout / Auto-Reroute

### Duration target

```text
~30–45 seconds
```

### Flow

```text
Request H1
→ H1 rejects/times out
→ H1 marked failed attempt
→ next candidate recalculated
→ H2 request
→ H2 accepts
```

### Point demonstrated

```text
active commitment protocol
```

---

# 102. Scenario C — Mass Casualty

### Duration target

```text
~45–60 seconds
```

### Flow

```text
4 patients
→ same incident
→ jointly assigned
→ 3+ hospitals
```

### Point demonstrated

```text
network load distribution
```

---

# 103. Scenario D — Stale Data

### Duration target

```text
~20–30 seconds
```

### Flow

```text
Hospital H8
→ stale timestamp
→ freshness warning
→ reduced ranking confidence
```

### Point demonstrated

```text
graceful degradation
```

---

# 104. Scenario E — Audit / Reliability

### Duration target

```text
~15–20 seconds
```

### Flow

```text
admin
→ audit trail
→ hospital reliability
→ historical request chain
```

### Point demonstrated

```text
accountability
```

---

# 105. Live Device Arrangement

Recommended:

```text
Device 1 = ambulance phone
Device 2 = hospital laptop
Device 3 = admin laptop/tablet
```

If third device unavailable:

```text
Device 2 = Hospital/Admin tabs
```

---

# 106. Presentation Role Plan

The team must assign before final rehearsal:

```text
Narrator
Ambulance operator
Hospital operator
```

One person may perform two roles if necessary.

The narrator should not simultaneously operate a complicated UI action during the most important technical moments.

---

# 107. Technical Demonstration Order

Show:

```text
Problem
 ↓
Case
 ↓
Need
 ↓
Match
 ↓
Commitment
 ↓
Failure
 ↓
Reroute
 ↓
Mass casualty
 ↓
Accountability
```

This mirrors the actual product architecture.

---

# 108. Testing Schedule

Do not leave all testing to Hour 16.

Testing happens continuously.

---

# 109. Unit Testing Window

Person 1:

```text
Hour 1–5
```

Person 2:

```text
Hour 2–9
```

Person 3:

```text
Hour 3–12
```

---

# 110. Integration Testing Window

Begin:

```text
Hour 5
```

Repeat after every major merge.

---

# 111. Smoke Test

At each main merge:

```text
start frontend
load Firebase
open ambulance
open hospital
open admin
```

Then verify the basic application still starts.

---

# 112. Regression Rule

When fixing:

```text
acceptance
```

rerun:

```text
acceptance
reject
timeout
reroute
```

because shared request-state code can affect all of them.

---

# 113. Main Branch Recovery

If a merge unexpectedly breaks `main`:

```text
STOP
```

Do not immediately pile another feature on top.

Identify:

```text
bad commit
contract break
environment issue
```

Fix or revert.

---

# 114. Revert Policy

A bad feature can be reverted if necessary.

A stable `main` is more valuable than preserving every attempted implementation.

---

# 115. Emergency Scope Reduction

If by Hour 10 the build is significantly behind, prioritize:

```text
1. Scenario A
2. Scenario B
3. Concurrency
4. Scenario C
5. Scenario D
6. Scenario E
```

Simplify:

```text
admin visual depth
AI
map
advanced reliability display
```

before breaking the core protocol.

---

# 116. Emergency Fallback

Absolute minimum viable technical story:

```text
Need
→ Capability match
→ Request
→ Hospital accepts/rejects
→ Automatic reroute
```

This is the fallback core.

However, the team should continue toward the locked MVP whenever the build remains on schedule.

---

# 117. No Scope Creep

Do not add:

```text
real hospital APIs
WhatsApp bot
SMS system
telephony
complex ML triage
full patient records
full authentication platform
```

unless the core MVP is complete and stable.

The PRD explicitly identifies some of these ideas as risk or roadmap territory.

---

# 118. Prompt-Orchestration Planning

Once implementation begins through an AI coding assistant, use a controlled prompt sequence.

Each prompt should contain:

```text
Context
Objective
Files to inspect
Files allowed to change
Exact requirements
Constraints
Tests
Expected report
```

The AI coding assistant should not be asked:

```text
"Build the whole project."
```

---

# 119. AI Coding Prompt Sequence

Recommended future prompt waves:

```text
Prompt 1:
Repository + Firebase foundation

Prompt 2:
Backend matching domain

Prompt 3:
Firestore request lifecycle

Prompt 4:
Ambulance UI

Prompt 5:
Hospital UI

Prompt 6:
First realtime integration

Prompt 7:
Reject/timeout/reroute

Prompt 8:
Concurrency

Prompt 9:
Mass casualty

Prompt 10:
Stale data/audit

Prompt 11:
Admin/reliability

Prompt 12:
Mid-transit reroute

Prompt 13:
Testing/hardening

Prompt 14:
Documentation/deployment
```

Each prompt will be issued only after the previous step is inspected.

---

# 120. AI Coding Assistant Stop Condition

An AI coding assistant should stop after completing its requested scope and report:

```text
Files changed
Implementation summary
Tests run
Tests passed/failed
Known issues
Contract changes
Next dependency
```

This makes the assistant an implementation tool rather than an autonomous architect.

---

# 121. AI Coding Assistant Rules

It must not:

```text
change the architecture without instruction
change the data model silently
change the scoring formula silently
introduce new dependencies without reporting them
remove tests to make them pass
commit secrets
rewrite unrelated files
```

---

# 122. AI Output Review

The human owner must understand the resulting code.

Before merging:

```text
read important changed files
run tests
explain design
check contract
```

The hackathon rules explicitly state that team members must be able to explain submitted AI-assisted code.

---

# 123. Documentation as an Engineering Artifact

The six planning/spec files are not decorative.

They prevent:

```text
scope drift
schema drift
API drift
ownership ambiguity
Git chaos
```

Any important implementation decision should have one obvious documentation home.

---

# 124. Where Different Decisions Live

## `architecture.md`

```text
components
system boundaries
technology relationships
data flow
deployment
```

## `data-model.md`

```text
entities
fields
collections
types
ownership
snapshots
```

## `api-contract.md`

```text
commands
responses
errors
realtime contracts
```

## `spec.md`

```text
exact behavior
algorithms
thresholds
invariants
testing expectations
```

## `plans.md`

```text
sequence
time
dependencies
integration
team coordination
```

## `tasks.md`

```text
individual actionable work items
```

---

# 125. Documentation Change Rule

If an implementation question is answered by a document:

```text
do not answer it differently in code
```

unless the documentation is updated.

---

# 126. Risk Register

## Risk 1 — Firebase instability

Mitigation:

```text
hotspot backup
reconnect handling
early deployment test
```

---

# 127. Risk 2 — Integration delay

Mitigation:

```text
first vertical slice by Hour 5–6
```

---

# 128. Risk 3 — Backend/frontend contract drift

Mitigation:

```text
api-contract.md
shared types
PR review
```

---

# 129. Risk 4 — Overengineering

Mitigation:

```text
simple stack
bounded dataset
pure matching functions
single frontend
managed realtime
```

---

# 130. Risk 5 — AI consumes time

Mitigation:

```text
AI after core MVP
deterministic fallback
```

---

# 131. Risk 6 — Map API problems

Mitigation:

```text
Haversine
simple map
```

---

# 132. Risk 7 — One teammate becomes blocked

Mitigation:

```text
independent work packages
mock data
hourly sync
```

---

# 133. Risk 8 — Main branch instability

Mitigation:

```text
PR review
smoke test
no direct feature push
```

---

# 134. Risk 9 — Git confusion

Mitigation:

```text
three main working branches only
simple commands
merge frequently
```

---

# 135. Risk 10 — Last-minute demo failure

Mitigation:

```text
full-device rehearsal
backup hotspot
backup screen
deterministic seed data
record before final hour where practical
```

---

# 136. Risk 11 — Judge challenges AI

Mitigation:

```text
deterministic matching
AI only explains
```

---

# 137. Risk 12 — Judge asks individual contribution

Mitigation:

```text
each member owns a clearly explainable module
```

The technical rules specifically permit individual contribution inspection.

---

# 138. Risk 13 — Team overbuilds

Mitigation:

At every phase ask:

```text
Does this improve Scenario A/B/C/D/E?
```

If not:

```text
defer
```

---

# 139. Risk 14 — Data inconsistency

Mitigation:

```text
Firestore transactions
snapshot audit
shared types
single source of truth
```

---

# 140. Risk 15 — Time lost on environment

Mitigation:

Environment work must happen in:

```text
Hour 0–1
```

not Hour 15.

---

# 141. Milestone Table

| Milestone | Target | Required result |
|---|---:|---|
| M0 | Hour 1 | Repo + Firebase + branches + skeleton |
| M1 | Hour 3 | Matching + Firestore + frontend shells |
| M2 | Hour 5–6 | Single-case realtime acceptance |
| M3 | Hour 8–9 | Reject/timeout/reroute |
| M4 | Hour 9 | Concurrency-safe resource flow |
| M5 | Hour 11–12 | Mass casualty |
| M6 | Hour 13 | Stale + audit |
| M7 | Hour 14 | Mid-transit reroute |
| M8 | Hour 15.5 | Functional freeze |
| M9 | Hour 16.5 | Full rehearsal |
| M10 | Hour 17.25 | Documentation/submission ready |
| M11 | Hour 18 | Frozen final repository |

---

# 142. Milestone Gate Rules

The team cannot proceed to a later milestone if the current milestone contains a P0 blocker.

Example:

```text
M2 broken
```

means:

```text
do not spend two hours polishing admin animations.
```

---

# 143. M0 Gate

Required:

```text
GitHub repository
branches
Firebase
frontend
backend
docs
```

---

# 144. M1 Gate

Required:

```text
matching works
Firestore works
role routes work
```

---

# 145. M2 Gate

Required:

```text
full Scenario A
```

---

# 146. M3 Gate

Required:

```text
rejection
timeout
reroute
```

---

# 147. M4 Gate

Required:

```text
transactional resource safety
```

---

# 148. M5 Gate

Required:

```text
four patient mass-casualty flow
```

---

# 149. M6 Gate

Required:

```text
stale
audit
```

---

# 150. M7 Gate

Required:

```text
mid-transit reroute
```

---

# 151. M8 Gate

Required:

```text
core feature complete
```

From here onward:

```text
no broad architecture changes
```

---

# 152. M9 Gate

Required:

```text
five demo scenarios rehearsed
```

---

# 153. M10 Gate

Required:

```text
README
docs
AI disclosure
deployment
```

---

# 154. M11 Gate

Required:

```text
main stable
submission assets ready
repository frozen
```

---

# 155. Team Communication Protocol

Use one shared team chat/channel.

For every important blocker, write:

```text
[BLOCKER]
Area:
Person:
Impact:
What was tried:
Needed from:
```

Do not bury a P0 issue in casual messages.

---

# 156. Code Review Protocol

Reviews should focus on:

```text
correctness
contract
security
test coverage
unintended side effects
```

not on unnecessary stylistic arguments.

---

# 157. No Review Paralysis

A review should be fast.

The goal is:

```text
catch dangerous mistakes
```

not:

```text
debate variable names for 40 minutes
```

---

# 158. Shared Type Protocol

If changing a shared type:

```text
notify other two developers
```

then:

```text
update documentation
update consumers
run build/tests
merge together
```

---

# 159. Database Change Protocol

If changing Firestore structure:

```text
update data-model.md
update seed
update backend
update frontend consumers
test
```

---

# 160. API Change Protocol

If changing an endpoint:

```text
update api-contract.md
update backend
update frontend
update tests
```

No silent breaking changes.

---

# 161. Spec Change Protocol

If changing:

```text
formula
threshold
state
invariant
```

update:

```text
spec.md
```

before merging the implementation.

---

# 162. Scope Change Protocol

If someone proposes a new feature:

```text
write it down
estimate time
identify blocked features
decide at checkpoint
```

Do not add features impulsively.

---

# 163. Demo Data Design Plan

The seed set should be intentionally constructed to demonstrate:

```text
different capabilities
different distances
different ER loads
different freshness
different reliability
```

The demo must make the matching engine's decisions visually obvious.

---

# 164. Hospital Seed Planning

Target:

```text
8 fictional hospitals
```

Each should differ enough to make scenarios deterministic.

---

# 165. Scenario-Specific Seed Design

## Scenario A

Ensure one hospital has:

```text
full cardiac capability
reasonable distance
reasonable load
fresh data
```

---

# 166. Scenario B

Ensure:

```text
Hospital A ranks first
Hospital A rejects/times out
Hospital C ranks next
```

---

# 167. Scenario C

Ensure:

```text
different patients need different capabilities
```

so joint distribution produces multiple destinations.

---

# 168. Scenario D

Ensure:

```text
H8 stale
```

and that the stale signal is visible.

---

# 169. Scenario E

Ensure:

```text
request history
accept/reject
timestamps
reliability
```

already exist before the final demo.

---

# 170. Seed Repeatability

Seed data must not depend on:

```text
randomness
current judge location
live third-party hospital APIs
```

unless deliberately testing live integrations.

---

# 171. Deployment Plan

Primary:

```text
Firebase Hosting
Firestore
Cloud Functions
```

Fallback:

```text
Vercel frontend
Firebase backend
```

---

# 172. Deployment Timing

Do not wait until Hour 17 to deploy.

First deployment target:

```text
Hour 7–9
```

Then repeat after major backend changes.

---

# 173. Why Early Deployment Matters

It detects:

```text
environment differences
functions configuration errors
Firestore rules problems
frontend build errors
CORS/config issues
```

while there is still time to fix them.

---

# 174. Demo URL Stability

Once a stable deployment exists:

```text
do not repeatedly replace the deployment address
```

Use one stable URL for rehearsal and submission.

---

# 175. Environment Configuration

Maintain:

```text
.env.example
```

with all required variables documented.

Actual:

```text
.env
```

remains local/untracked.

---

# 176. Firebase Configuration Ownership

Person 2 owns the primary Firebase configuration.

Person 1 must understand:

```text
collection names
backend service boundaries
```

Person 3 must understand:

```text
public client config
realtime subscriptions
```

---

# 177. Frontend Build Strategy

One React application.

Role routes:

```text
/ambulance
/hospital/:hospitalId
/admin
```

This minimizes deployment and dependency duplication.

---

# 178. UI Development Strategy

Person 3 should first build:

```text
functional layout
```

then:

```text
data integration
```

then:

```text
visual polish
```

Do not spend 90 minutes perfecting a static card before its data path exists.

---

# 179. Backend Development Strategy

Person 1 should first build:

```text
pure functions
```

then:

```text
service integration
```

then:

```text
performance/edge cases
```

---

# 180. Realtime Development Strategy

Person 2 should first prove:

```text
one write
→ one listener
→ one visible update
```

before implementing every edge case.

---

# 181. AI Development Strategy

Person 2 should first implement:

```text
ExplanationProvider interface
```

then:

```text
deterministic fallback
```

then optional:

```text
LLM provider
```

This means AI never becomes a hard dependency.

---

# 182. Admin Development Strategy

Admin UI is built after:

```text
audit
reliability
hospital
request
```

exist.

Do not build an elaborate admin interface against nonexistent data.

---

# 183. Test Data Strategy

Use at least:

```text
cardiac case
trauma case
obstetric case
pediatric case
```

and:

```text
one stale hospital
one high-load hospital
one strong cardiac hospital
one strong trauma hospital
one strong obstetric hospital
one strong pediatric hospital
```

---

# 184. Unit-to-Demo Traceability

Every demo scenario should map to automated tests.

```text
Scenario A
→ case creation
→ match
→ request
→ accept
```

```text
Scenario B
→ reject/timeout
→ reroute
```

```text
Scenario C
→ distribution
```

```text
Scenario D
→ freshness
```

```text
Scenario E
→ audit/reliability
```

---

# 185. Testing Before Merge

Developer should be able to state:

```text
I changed X.
I ran Y.
Y passed.
```

No:

```text
"I think it works."
```

---

# 186. End-to-End Smoke Test Script

```text
1. Open ambulance
2. Open hospital
3. Open admin
4. Create cardiac case
5. Confirm need profile
6. Match
7. Observe hospital request
8. Accept
9. Confirm ambulance state
10. Confirm resource
11. Confirm audit
```

---

# 187. Reroute Smoke Test

```text
1. New case
2. Match H1
3. Reject H1
4. Observe reroute
5. Accept H2
6. Confirm history
7. Confirm audit
```

---

# 188. Timeout Smoke Test

```text
1. New case
2. Match H1
3. Do not respond
4. Wait
5. Confirm timeout
6. Confirm reroute
7. Accept H2
```

For development, timeout duration may be temporarily lowered.

---

# 189. Concurrency Smoke Test

```text
1. Set ICU = 1
2. Create two eligible requests
3. Accept both nearly simultaneously
4. Verify only one succeeds
5. Verify ICU = 0
```

---

# 190. Mass-Casualty Smoke Test

```text
1. Create incident
2. Add 4 cases
3. Match group
4. Review assignments
5. Commit
6. Verify capacity
```

---

# 191. Stale Smoke Test

```text
1. Set last_updated_at old
2. Run match
3. Verify status
4. Verify factor
5. Verify UI badge
```

---

# 192. Mid-Transit Smoke Test

```text
1. Accept trauma case
2. Hospital turns trauma team off
3. Trigger invalidation
4. Verify hold release
5. Verify reroute
6. Verify ambulance alert
```

---

# 193. Documentation Smoke Test

New machine should be able to follow:

```text
README
→ install
→ configure
→ seed
→ run
```

The project should not depend on undocumented local settings.

---

# 194. Final Git Audit

Before submission:

```text
git log --oneline --graph --all
```

Review:

```text
meaningful commits
all three members
feature branches
merges
no obvious final-dump pattern
```

---

# 195. Contribution Audit

Each member must have:

```text
at least 2 meaningful contributions
```

Recommended practical target:

```text
many meaningful commits
```

rather than exactly two.

---

# 196. Commit Quality

Good:

```text
feat: implement Firestore request lifecycle
fix: prevent duplicate resource decrement
test: add timeout reroute scenario
docs: update deployment instructions
```

Bad:

```text
final
done
update
test
abc
```

---

# 197. Final Security Audit

Search for:

```text
API_KEY
SECRET
PASSWORD
TOKEN
PRIVATE_KEY
```

and inspect suspicious files.

Also verify:

```text
.env not tracked
service-account file not tracked
```

---

# 198. Final Dependency Audit

Review:

```text
package.json
functions/package.json
frontend/package.json
```

Remove unused dependencies where safe.

Document external libraries.

---

# 199. Final Build Audit

Run:

```text
frontend build
backend build
unit tests
integration tests
```

The exact commands are determined by the final project scripts.

---

# 200. Final Deployment Audit

Verify from a clean browser/device:

```text
application loads
Firebase connects
case creation works
realtime works
admin works
```

---

# 201. Final Demo Audit

Run:

```text
A → B → C → D → E
```

twice.

The second run should use no hidden manual fixes.

---

# 202. Final Presentation Audit

The team must explain:

```text
Problem
Architecture
Technology
Implementation
Demo
Results
Limitations
```

and answer:

```text
Why Firebase?
Why Firestore transaction?
Why deterministic matching?
Why not LLM routing?
Why capability instead of bed count?
How does reroute work?
How does mass casualty work?
How do you stop double-booking?
How do you handle stale data?
How is accountability implemented?
```

---

# 203. Project Success Definition

The project is successful from an engineering standpoint when:

```text
one case can be routed end-to-end
a hospital can explicitly commit
a failed commitment automatically reroutes
capacity cannot be double-consumed
mass casualty is jointly distributed
stale data is recognized
the complete decision history is visible
all three interfaces receive realtime updates
```

---

# 204. Project Success Definition for Team Workflow

The team workflow is successful when:

```text
all three developers work in parallel
no developer waits unnecessarily
main stays stable
contracts remain consistent
commits are meaningful
integration happens early
demo is reproducible
```

---

# 205. Final Team Calendar in One View

```text
H0
Foundation

H1
Architecture/data/Firebase/frontend skeleton

H2
Matching + Firestore + UI

H3
Vertical slice

H4
Vertical slice

H5
Scenario A

H6
Scenario B begins

H7
Reject/timeout

H8
Reroute + transaction

H9
Concurrency + mass casualty begins

H10
Mass casualty

H11
Mass casualty

H12
Stale + audit

H13
Reliability + admin

H14
Mid-transit reroute

H15
Polish/fix

H16
Rehearsal

H17
Documentation + video

H18
Freeze/submission
```

This is a planning baseline, not a promise that every phase takes exactly one hour.

---

# 206. Team Operating Rule

When deciding what to work on next:

```text
Ask:
"What is the next thing that makes the live system more complete?"
```

not:

```text
"What is the coolest thing we can add?"
```

---

# 207. Engineering Priority Ladder

Always prioritize in this order:

```text
CORRECTNESS
    ↓
REALTIME RELIABILITY
    ↓
CORE DEMO FUNCTIONALITY
    ↓
DATA CONSISTENCY
    ↓
TESTING
    ↓
UX POLISH
    ↓
AI/MAP EXTRAS
```

---

# 208. Decision Log

Any major implementation decision made during the build should be recorded briefly:

```text
Date/time
Decision
Reason
Affected documents
Affected code
Owner
```

This prevents the team from later arguing about which behavior was intended.

---

# 209. Example Decision Log Entry

```text
Decision:
Use 30-second demo request timeout.

Reason:
PRD leaves duration open; 30 seconds is easier to demonstrate live.

Affected:
spec.md
backend request service
hospital countdown UI

Owner:
Person 2
```

---

# 210. Example Scope Decision Entry

```text
Decision:
Do not implement SMS/telephony.

Reason:
Realtime push notification is already sufficient and avoids external verification/network risk.

Affected:
demo
README
presentation

Owner:
Team
```

---

# 211. Documentation Ownership During Build

Person 1:

```text
technical algorithm sections
```

Person 2:

```text
backend/Firebase/deployment sections
```

Person 3:

```text
UI/demo screenshots/UX sections
```

All three review the final README together.

---

# 212. Final Repository Shape

```text
project-root/
│
├── frontend/
├── functions/
├── scripts/
│
├── docs/
│   ├── architecture.md
│   ├── data-model.md
│   ├── api-contract.md
│   ├── spec.md
│   ├── plans.md
│   └── tasks.md
│
├── README.md
├── .gitignore
├── .env.example
├── firebase.json
├── firestore.rules
├── firestore.indexes.json
└── package.json
```

---

# 213. Final Branch Shape

```text
                    main
                     │
          ┌──────────┼──────────┐
          │          │          │
          ▼          ▼          ▼
 backend-core   backend-     frontend
                realtime-ai
          │          │          │
          │          │          │
          └───── Pull Requests ─┘
                     │
                     ▼
                    main
```

---

# 214. Final Execution Model

The team follows:

```text
DOCUMENT
   ↓
PLAN
   ↓
TASK
   ↓
IMPLEMENT
   ↓
TEST
   ↓
INTEGRATE
   ↓
MERGE
   ↓
DEMO
```

The project is not considered complete at "code written."

It is complete at:

```text
code
+
tests
+
integration
+
documentation
+
deployment
+
demo
```

---

# 215. Handoff to `tasks.md`

`tasks.md` must convert this plan into atomic work items.

Every task should have:

```text
Task ID
Phase
Owner
Branch
Description
Prerequisites
Files/area
Expected result
Testing
Merge condition
Priority
```

Tasks should be small enough that a developer can complete and commit them without ambiguity.

---

# 216. Task Granularity Rule

Bad task:

```text
Build backend
```

Good task:

```text
T-P1-003
Implement deterministic cardiac need-profile mapping.

Owner:
Person 1

Branch:
backend-core

Input:
case.category = cardiac

Output:
NeedProfile with cardiologist + ecg + icu

Test:
cardiac mapping unit test

Done when:
tests pass and function matches spec.md
```

---

# 217. Task Dependency Rule

Each task should identify:

```text
depends on
unblocks
```

Example:

```text
Firestore request model
    ↓
request creation service
    ↓
hospital listener
    ↓
accept transaction
    ↓
ambulance result
```

---

# 218. The Next Document

The next document is:

```text
tasks.md
```

It should not merely repeat this plan.

It should be the team's executable checklist.

The final relationship will be:

```text
PRD
 ↓
Architecture
 ↓
Data Model
 ↓
API Contract
 ↓
Specification
 ↓
Plans
 ↓
Tasks
 ↓
Implementation
```

---

# 219. Final Planning Principle

Do not let three developers build three separate applications.

Build:

```text
ONE SYSTEM
```

through three parallel ownership lanes:

```text
Person 1
Deterministic intelligence

Person 2
Realtime state + infrastructure + AI explanation

Person 3
Human-facing experience
```

and integrate continuously through:

```text
shared contracts
Firestore
stable main
small vertical slices
frequent meaningful commits
```

That is the operating model for the entire hackathon build.
