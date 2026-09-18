# API Contract — Capability-Match Ambulance–Hospital Coordination System

## 0. Document Control

| Field | Value |
|---|---|
| Document | `api-contract.md` |
| Project | Capability-Match Ambulance–Hospital Coordination System |
| Track | HealthTech — Accessible Care & Intelligent Patient Support |
| Primary runtime | React-based web interfaces + Firebase/Firestore realtime layer |
| Backend domain | Matching, routing, request lifecycle, resource holds, audit, reliability |
| Source of truth | `PRD_Final.md` |
| Companion documents | `architecture.md`, `data-model.md` |
| Purpose | Define the communication contract between frontend modules, backend logic, realtime state, and optional AI explanation |

---

# 1. Purpose

This document freezes the interfaces used by the three-person team so that work can proceed in parallel without one developer inventing incompatible request/response structures.

It defines:

- HTTP-style backend operations where a callable/service boundary is required.
- Firestore-backed realtime subscriptions.
- Command payloads.
- Response payloads.
- Error formats.
- Request state transitions.
- Event names.
- Idempotency expectations.
- Optimistic UI rules.
- Match-result structure.
- Hospital capability update structure.
- Mass-casualty batch interfaces.
- Audit access interfaces.
- Reliability access interfaces.
- Optional AI explanation interface.
- Frontend/backend ownership.
- Integration-test contracts.

The goal is that the frontend developer can build against this document while the two backend developers implement the underlying logic independently.

---

# 2. Contract Principles

## 2.1 API contract before implementation

Core field names, types, status values, and response shapes are frozen here.

Implementation details may change internally without changing the contract.

---

## 2.2 Firestore is the realtime source

The system uses Firestore realtime updates for state that must propagate between:

```text
Ambulance device
Hospital device
Admin dashboard
```

The PRD specifically identifies Firestore plus `onSnapshot` as the realtime mechanism.

The frontend should not repeatedly poll Firestore for request state unless a specific implementation problem requires a fallback.

---

## 2.3 Commands versus subscriptions

Separate:

```text
COMMAND
```

from:

```text
STATE SUBSCRIPTION
```

A command asks the system to do something.

A subscription observes what happened.

Example:

```text
Ambulance
   │
   │ create case
   ▼
Backend
   │
   ▼
Firestore
   │
   ├── Hospital listener updates
   └── Ambulance listener updates
```

The ambulance does not directly mutate the hospital screen.

---

## 2.4 Backend authority

The frontend must never be authoritative for:

- hospital matching,
- resource reservation,
- request state transitions,
- timeout resolution,
- rerouting,
- reliability calculation,
- audit events.

The frontend may request these operations.

The backend/domain layer validates and commits them.

---

# 3. Logical API Surface

The prototype can expose the following logical operations:

```text
CASE
POST   /api/cases
GET    /api/cases/:caseId

MATCH
POST   /api/cases/:caseId/match
POST   /api/cases/:caseId/mass-match

HOSPITALS
GET    /api/hospitals
GET    /api/hospitals/:hospitalId
PATCH  /api/hospitals/:hospitalId/capabilities

REQUESTS
GET    /api/cases/:caseId/requests
GET    /api/requests/:requestId
POST   /api/requests/:requestId/accept
POST   /api/requests/:requestId/reject
POST   /api/requests/:requestId/timeout

ADMIN
GET    /api/admin/audit
GET    /api/admin/reliability

AI / EXPLANATION
POST   /api/explanations/match
```

These are logical service boundaries.

The final implementation may use:

- Firebase callable functions,
- HTTP Cloud Functions,
- direct Firestore commands through a controlled service layer,

without changing the conceptual contract.

---

# 4. Authentication Assumption

The PRD allows seeded/demo hospital login without a full production authentication implementation.

Therefore the initial API contract supports a lightweight actor context:

```json
{
  "actor_type": "ambulance",
  "actor_id": "ambulance_demo_01"
}
```

or:

```json
{
  "actor_type": "hospital",
  "actor_id": "hospital_003_demo"
}
```

or:

```json
{
  "actor_type": "admin",
  "actor_id": "admin_demo_01"
}
```

A production authentication provider can replace this later without changing the business operation payloads.

---

# 5. Common Response Envelope

Where a callable/HTTP layer is used, successful responses should follow:

```json
{
  "success": true,
  "data": {},
  "error": null,
  "meta": {}
}
```

Example:

```json
{
  "success": true,
  "data": {
    "case_id": "case_001"
  },
  "error": null,
  "meta": {
    "request_id": "trace_123"
  }
}
```

---

# 6. Common Error Envelope

Errors should follow:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "REQUEST_ALREADY_RESOLVED",
    "message": "This request is no longer pending.",
    "details": {}
  },
  "meta": {
    "request_id": "trace_123"
  }
}
```

The frontend must use the stable:

```text
error.code
```

for programmatic behavior.

It must not parse human-readable `message` text to determine logic.

---

# 7. Error Code Vocabulary

Initial controlled vocabulary:

```text
INVALID_ARGUMENT
MISSING_FIELD
INVALID_ENUM
CASE_NOT_FOUND
HOSPITAL_NOT_FOUND
REQUEST_NOT_FOUND
REQUEST_ALREADY_RESOLVED
CASE_ALREADY_ACCEPTED
NO_ELIGIBLE_HOSPITAL
NO_AVAILABLE_CAPABILITY
CONCURRENCY_CONFLICT
REQUEST_EXPIRED
UNAUTHORIZED_ACTOR
FORBIDDEN_OPERATION
RATE_LIMITED
STALE_DATA
INVALID_STATE_TRANSITION
MASS_MATCH_FAILED
FIRESTORE_ERROR
INTERNAL_ERROR
AI_EXPLANATION_FAILED
```

The final implementation may add codes, but existing meanings must not be repurposed.

---

# 8. Case API

## 8.1 Create Case

### Operation

```text
POST /api/cases
```

### Purpose

Create a new emergency case from the ambulance/dispatcher interface.

### Request

```json
{
  "category": "cardiac",
  "severity": "red",

  "patient_basic_info": {
    "age": 61,
    "sex": "male"
  },

  "vitals_summary": "SpO2 91%, pulse 118",

  "onset_time": "25 minutes ago",

  "treatment_administered": "Oxygen started",

  "ambulance_location": {
    "lat": 21.1632,
    "lng": 72.8398
  },

  "incident_group_id": null,

  "actor": {
    "actor_type": "ambulance",
    "actor_id": "ambulance_demo_01"
  }
}
```

### Backend behavior

1. Validate input.
2. Create case ID.
3. Store creation timestamp.
4. Validate category.
5. Validate severity.
6. Validate patient fields.
7. Store ambulance location.
8. Generate the deterministic need profile from the rules table.
9. Write the case.
10. Write `CASE_CREATED` audit event.
11. Write `NEED_PROFILE_GENERATED` audit event.

### Response

```json
{
  "success": true,
  "data": {
    "case": {
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
      "patient_basic_info": {
        "age": 61,
        "sex": "male"
      },
      "vitals_summary": "SpO2 91%, pulse 118",
      "onset_time": "25 minutes ago",
      "treatment_administered": "Oxygen started",
      "incident_group_id": null,
      "ambulance_location": {
        "lat": 21.1632,
        "lng": 72.8398
      }
    }
  },
  "error": null,
  "meta": {}
}
```

---

# 9. Get Case

### Operation

```text
GET /api/cases/:caseId
```

### Response

Returns the canonical case document plus current routing summary.

Example:

```json
{
  "success": true,
  "data": {
    "case": {},
    "routing": {
      "status": "pending",
      "active_request_id": "request_003",
      "attempt_number": 3
    }
  },
  "error": null,
  "meta": {}
}
```

The frontend should prefer the live Firestore listener for realtime request state once the case exists.

---

# 10. Need-Profile Contract

The deterministic mapping returns:

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

This structure is shared by:

```text
Case screen
Matching engine
Hospital request card
Audit snapshot
AI explanation layer
```

The frontend must display the need profile without modifying its semantic content.

---

# 11. Match API

## 11.1 Single-Case Match

### Operation

```text
POST /api/cases/:caseId/match
```

### Purpose

Compute hospital rankings and initiate the request to the highest-ranked eligible candidate.

### Request

```json
{
  "actor": {
    "actor_type": "ambulance",
    "actor_id": "ambulance_demo_01"
  }
}
```

The case itself is already stored.

Do not resend the entire case unless an alternative transport mechanism is required.

### Backend behavior

1. Load case.
2. Verify case is routable.
3. Generate/read need profile.
4. Load eligible hospitals.
5. Determine data freshness.
6. Exclude hospitals that cannot satisfy mandatory capabilities.
7. Calculate distance.
8. Calculate capability match.
9. Calculate load factor.
10. Calculate freshness/staleness adjustment.
11. Calculate final score.
12. Rank candidates.
13. Create the first request.
14. Commit request atomically where resource state requires it.
15. Write audit events.

### Response

```json
{
  "success": true,
  "data": {
    "case_id": "case_001",
    "active_request": {
      "id": "request_001",
      "hospital_id": "hospital_003",
      "status": "pending",
      "sent_at": "Firestore Timestamp",
      "expires_at": "Firestore Timestamp",
      "attempt_number": 1,
      "match_score_breakdown": {
        "capability_match_pct": 100,
        "distance_km": 4.2,
        "distance_factor": 0.88,
        "load_factor": 0.8,
        "staleness_factor": 1.0,
        "final_score": 70.4
      },
      "reason_shown_to_dispatcher": "Hospital C — cardiologist on shift, ICU free, 6 min away"
    },

    "ranked_candidates": [
      {
        "hospital_id": "hospital_003",
        "rank": 1,
        "final_score": 70.4
      },
      {
        "hospital_id": "hospital_005",
        "rank": 2,
        "final_score": 62.1
      }
    ]
  },
  "error": null,
  "meta": {}
}
```

---

# 12. Match Result Object

The canonical match result:

```json
{
  "hospital_id": "hospital_003",
  "rank": 1,
  "capability_match_pct": 100,
  "distance_km": 4.2,
  "distance_factor": 0.88,
  "load_factor": 0.8,
  "staleness_factor": 1.0,
  "final_score": 70.4,
  "eligibility": {
    "eligible": true,
    "reason": null
  },
  "freshness": {
    "status": "fresh",
    "last_updated_at": "Firestore Timestamp"
  },
  "reasons": [
    "Cardiologist available",
    "ICU capacity available",
    "Low ER load"
  ]
}
```

The exact scoring formula is frozen in `spec.md`, not here.

---

# 13. Candidate Ranking Rules

The API contract assumes the matching engine produces a deterministic ordered list.

Required output property:

```text
rank 1
rank 2
rank 3
...
```

The list must be stable for equivalent input.

If two candidates receive exactly the same score, a deterministic tie-breaker must be defined in `spec.md`.

The frontend should not calculate or reorder ranked candidates.

---

# 14. Request Creation

Creating the first hospital request is part of the match operation.

The frontend should not:

```text
POST match
then independently POST request
```

unless implementation explicitly separates these operations.

Otherwise duplicate requests can occur.

Recommended flow:

```text
POST /cases/:caseId/match
       ↓
backend calculates
       ↓
backend creates first REQUEST
       ↓
returns active request
```

---

# 15. REQUEST Realtime Subscription

The request lifecycle is realtime.

Recommended Firestore subscription:

```text
requests
where case_id == currentCaseId
order by sent_at
```

The ambulance UI observes changes to:

```text
status
hospital_id
expires_at
attempt_number
reason_shown_to_dispatcher
match_score_breakdown
```

The frontend does not poll countdown seconds from Firestore.

---

# 16. Hospital Incoming Queue Subscription

Hospital UI subscribes to requests where:

```text
hospital_id == currentHospitalId
status == "pending"
```

Display:

```text
patient/case summary
need profile
severity
ETA
distance
countdown
reason
```

Hospital users must only receive requests addressed to their current hospital context.

---

# 17. Accept Request

### Operation

```text
POST /api/requests/:requestId/accept
```

### Request

```json
{
  "actor": {
    "actor_type": "hospital",
    "actor_id": "hospital_003_demo"
  }
}
```

### Backend validation

Verify:

1. Request exists.
2. Request is `pending`.
3. Current time is before expiration, unless timeout handling has already been resolved.
4. Actor belongs to the target hospital.
5. The case has not already been accepted elsewhere.
6. Required capability is still available.
7. Resource hold can be completed.
8. State transition is valid.

### Transaction

The acceptance path must be transaction-safe.

Conceptually:

```text
READ request
READ hospital
READ case/routing state

VERIFY all invariants

UPDATE request → accepted
UPDATE hospital capability → decremented/held
UPDATE case routing state
WRITE audit events

COMMIT
```

If the transaction cannot safely commit:

```text
return CONCURRENCY_CONFLICT
```

### Response

```json
{
  "success": true,
  "data": {
    "request": {
      "id": "request_003",
      "status": "accepted",
      "responded_at": "Firestore Timestamp"
    },

    "hospital": {
      "id": "hospital_003"
    },

    "resource_action": {
      "type": "held",
      "capabilities": [
        "icu"
      ]
    }
  },
  "error": null,
  "meta": {}
}
```

---

# 18. Reject Request

### Operation

```text
POST /api/requests/:requestId/reject
```

### Request

```json
{
  "reason_code": "CAPABILITY_UNAVAILABLE",
  "actor": {
    "actor_type": "hospital",
    "actor_id": "hospital_001_demo"
  }
}
```

The UI may display a small selectable rejection reason, but the system should not require a long free-text explanation during the demo.

### Backend behavior

1. Verify request is pending.
2. Verify hospital actor.
3. Verify case is not already accepted.
4. Change request to `rejected`.
5. Write audit event.
6. Trigger reroute to next candidate.
7. Return the new active request if one exists.

### Response

```json
{
  "success": true,
  "data": {
    "previous_request": {
      "id": "request_001",
      "status": "rejected"
    },

    "reroute": {
      "triggered": true,
      "new_request_id": "request_002",
      "next_hospital_id": "hospital_003"
    }
  },
  "error": null,
  "meta": {}
}
```

---

# 19. Timeout Request

### Operation

```text
POST /api/requests/:requestId/timeout
```

This is a logical operation.

The timeout may be triggered by:

- scheduled backend processing,
- client timer followed by a server verification,
- another backend event mechanism.

The client must never be considered authoritative merely because its local timer reached zero.

### Request

```json
{
  "actor": {
    "actor_type": "system",
    "actor_id": "timeout_worker"
  }
}
```

### Backend validation

The backend reads `expires_at`.

If current server time is still before expiration:

```text
REQUEST_NOT_YET_EXPIRED
```

If expired:

```text
pending → timed_out
```

Then reroute.

---

# 20. Automatic Reroute Contract

Reroute is a backend operation triggered by:

```text
rejected
timed_out
```

or a qualifying mid-transit capability failure.

Conceptual sequence:

```text
REQUEST_001
    ↓
rejected/timed_out
    ↓
REROUTE_TRIGGERED
    ↓
next-ranked candidate
    ↓
REQUEST_002
```

The frontend should not calculate:

```text
which hospital is next
```

The backend returns the next request.

---

# 21. Reroute Response

```json
{
  "success": true,
  "data": {
    "reroute": {
      "trigger": "REQUEST_TIMED_OUT",

      "previous_request_id": "request_001",

      "new_request": {
        "id": "request_002",
        "hospital_id": "hospital_003",
        "status": "pending",
        "attempt_number": 2,
        "expires_at": "Firestore Timestamp",
        "reason_shown_to_dispatcher": "Hospital A did not respond — automatically rerouted to Hospital C"
      }
    }
  },
  "error": null,
  "meta": {}
}
```

---

# 22. Case-Level Routing State

Although request records remain the detailed routing history, the frontend needs a simple case-level summary.

Recommended structure:

```json
{
  "routing": {
    "status": "pending",
    "active_request_id": "request_002",
    "attempt_number": 2,
    "accepted_hospital_id": null
  }
}
```

Possible status values for this summary will be frozen in `spec.md`.

---

# 23. Hospital Capability Update

### Operation

```text
PATCH /api/hospitals/:hospitalId/capabilities
```

### Purpose

Allows hospital staff to update their current capability profile.

### Request

```json
{
  "trauma_team_on_shift": true,

  "specialists_on_call": [
    "cardiologist",
    "orthopedist"
  ],

  "icu_beds_free": 3,
  "ventilators_free": 2,

  "blood_stock": {
    "O-": 2,
    "O+": 12
  },

  "er_load_score": 3,

  "accepts_scheme_patients": true,

  "actor": {
    "actor_type": "hospital",
    "actor_id": "hospital_003_demo"
  }
}
```

The backend updates:

```text
last_updated_at = server timestamp
```

Do not allow the client to choose this timestamp arbitrarily.

### Response

Returns the canonical updated hospital document.

---

# 24. Mid-Transit Reroute

The PRD requires the demo to simulate a hospital capability becoming unavailable while an ambulance is en route.

Recommended operation:

```text
Hospital capability update
        ↓
backend detects affected active request
        ↓
active commitment invalidated/flagged
        ↓
reroute operation
        ↓
new hospital request
```

The exact qualifying conditions are frozen in `spec.md`.

The frontend sees this through Firestore realtime state.

---

# 25. Mass-Match API

### Operation

```text
POST /api/cases/:caseId/mass-match
```

The `caseId` may identify one case within an incident group.

Alternative implementation may accept the `incident_group_id` directly.

Preferred conceptual endpoint:

```text
POST /api/incidents/:incidentGroupId/match
```

If this form is used, the contract should retain the same internal distribution structure.

---

# 26. Mass-Casualty Request

```json
{
  "incident_group_id": "incident_001",

  "actor": {
    "actor_type": "ambulance",
    "actor_id": "ambulance_demo_01"
  }
}
```

### Response

```json
{
  "success": true,
  "data": {
    "incident_group_id": "incident_001",

    "distribution": [
      {
        "case_id": "case_101",
        "hospital_id": "hospital_002",
        "rank": 1,
        "score": 82.5
      },
      {
        "case_id": "case_102",
        "hospital_id": "hospital_004",
        "rank": 1,
        "score": 79.4
      },
      {
        "case_id": "case_103",
        "hospital_id": "hospital_002",
        "rank": 1,
        "score": 74.2
      },
      {
        "case_id": "case_104",
        "hospital_id": "hospital_006",
        "rank": 1,
        "score": 71.0
      }
    ],

    "requests_created": [
      "request_101",
      "request_102",
      "request_103",
      "request_104"
    ]
  },
  "error": null,
  "meta": {}
}
```

---

# 27. Mass-Casualty Contract Rules

The result must be group-aware.

The frontend must receive:

```text
case_id
hospital_id
score
```

for each assignment.

The backend is responsible for ensuring the overall distribution respects the resource constraints defined in `spec.md`.

The frontend must not independently assign patients to hospitals.

---

# 28. Hospital Read APIs

## List hospitals

```text
GET /api/hospitals
```

Optional filters:

```text
freshness
specialist
capability
```

The first prototype may simply retrieve all 6–10 seeded hospitals.

### Response

```json
{
  "success": true,
  "data": {
    "hospitals": [
      {
        "id": "hospital_001",
        "name": "CityCare General Hospital",
        "lat": 21.1702,
        "lng": 72.8311,
        "trauma_team_on_shift": true,
        "specialists_on_call": [
          "cardiologist"
        ],
        "icu_beds_free": 4,
        "ventilators_free": 2,
        "er_load_score": 2,
        "last_updated_at": "Firestore Timestamp",
        "reliability_score": 0.94
      }
    ]
  },
  "error": null,
  "meta": {}
}
```

---

# 29. Get Hospital

```text
GET /api/hospitals/:hospitalId
```

Returns the canonical hospital state.

The frontend should subscribe to the hospital document in realtime when continuous updates matter.

---

# 30. Request History API

```text
GET /api/cases/:caseId/requests
```

Response:

```json
{
  "success": true,
  "data": {
    "requests": [
      {
        "id": "request_001",
        "hospital_id": "hospital_001",
        "status": "timed_out",
        "attempt_number": 1,
        "sent_at": "Firestore Timestamp",
        "responded_at": "Firestore Timestamp",
        "reason_shown_to_dispatcher": "Hospital A did not respond"
      },
      {
        "id": "request_002",
        "hospital_id": "hospital_003",
        "status": "accepted",
        "attempt_number": 2,
        "sent_at": "Firestore Timestamp",
        "responded_at": "Firestore Timestamp"
      }
    ]
  },
  "error": null,
  "meta": {}
}
```

Order by:

```text sent_at ascending
```

for audit/replay display.

---

# 31. Request Detail API

```text
GET /api/requests/:requestId
```

Returns:

```text
request
case summary
hospital summary
match breakdown
status timestamps
```

The endpoint should not expose more patient information than necessary to the requesting interface.

---

# 32. Audit API

### Operation

```text
GET /api/admin/audit
```

Recommended query parameters:

```text
caseId
hospitalId
eventType
limit
```

Example:

```text
GET /api/admin/audit?caseId=case_001&limit=50
```

### Response

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "audit_001",
        "request_id": "request_001",
        "case_id": "case_001",
        "hospital_id": "hospital_001",
        "event_type": "REQUEST_SENT",
        "timestamp": "Firestore Timestamp",
        "actor_type": "system",
        "snapshot_of_data_at_decision_time": {}
      }
    ]
  },
  "error": null,
  "meta": {}
}
```

---

# 33. Reliability API

```text
GET /api/admin/reliability
```

Response:

```json
{
  "success": true,
  "data": {
    "hospitals": [
      {
        "hospital_id": "hospital_003",
        "hospital_name": "CityCare General Hospital",
        "reliability_score": 0.94,
        "response_metrics": {
          "accepted_count": 16,
          "successful_commitment_count": 15,
          "average_response_seconds": 21
        }
      }
    ]
  },
  "error": null,
  "meta": {}
}
```

The exact calculation of `reliability_score` and metrics is defined in `spec.md`.

---

# 34. AI Explanation API

## 34.1 Purpose

AI is optional and must remain outside the authoritative matching path.

The AI endpoint takes structured facts and generates a readable explanation.

### Operation

```text
POST /api/explanations/match
```

### Request

```json
{
  "match": {
    "hospital_name": "Hospital C",
    "capability_match_pct": 100,
    "distance_km": 4.2,
    "load_factor": 0.8,
    "staleness_factor": 1.0
  },

  "available_capabilities": [
    "cardiologist",
    "icu",
    "ecg"
  ],

  "required_capabilities": [
    "cardiologist",
    "icu",
    "ecg"
  ]
}
```

### Response

```json
{
  "success": true,
  "data": {
    "explanation": "Hospital C matches all required capabilities, has ICU capacity, and is approximately 4.2 km away."
  },
  "error": null,
  "meta": {
    "ai_assisted": true
  }
}
```

---

# 35. AI Contract Rules

The AI layer must:

- receive structured facts;
- avoid inventing capabilities;
- avoid modifying numeric match scores;
- avoid selecting a hospital;
- avoid changing the need profile;
- avoid declaring a clinical diagnosis;
- return a readable explanation only.

If AI fails:

```text
core routing continues
```

The UI can fall back to a deterministic explanation template.

Therefore:

```text
AI_FAILURE ≠ ROUTING_FAILURE
```

---

# 36. Deterministic Explanation Fallback

A fallback explanation generator must exist.

Example:

```text
Hospital C — cardiologist on shift, ICU free, 6 min away.
```

This means the live demo does not depend on an LLM API being reachable.

---

# 37. Firestore Realtime Events

Recommended logical event names:

```text
case.created
case.need_profile_generated

request.created
request.pending
request.accepted
request.rejected
request.timed_out
request.superseded
request.rerouted

hospital.updated
hospital.resource_held
hospital.resource_released

audit.created

incident.distribution_created
```

These may be represented implicitly through Firestore document changes rather than as a separate event bus.

---

# 38. Event Payload

A logical realtime event can follow:

```json
{
  "type": "request.accepted",

  "timestamp": "Firestore Timestamp",

  "entity": {
    "type": "request",
    "id": "request_003"
  },

  "data": {
    "case_id": "case_001",
    "hospital_id": "hospital_003",
    "status": "accepted"
  }
}
```

If Firestore documents are consumed directly instead of being wrapped in explicit event objects, the same semantic information must remain available.

---

# 39. Frontend Realtime Contract — Ambulance

The ambulance frontend should be able to render these states:

```text
NO_CASE
CASE_CREATED
MATCHING
PENDING
ACCEPTED
REJECTED_AND_REROUTING
TIMED_OUT_AND_REROUTING
ROUTING_EXHAUSTED
```

The frontend state should be derived from authoritative backend data.

Avoid frontend-only states that contradict Firestore.

---

# 40. Frontend Realtime Contract — Hospital

Hospital UI should support:

```text
NO_PENDING_REQUESTS
REQUEST_RECEIVED
COUNTDOWN_ACTIVE
ACCEPTED
REJECTED
EXPIRED
```

A request disappearing from the pending queue is not itself sufficient to determine why.

Read its status.

---

# 41. Frontend Realtime Contract — Admin

Admin dashboard observes:

```text
hospital state
request state
audit events
reliability
```

The admin screen should update without requiring a page refresh.

---

# 42. Optimistic UI Rules

Do not optimistically show:

```text
Accepted
Reserved
Rerouted
```

before the backend commits the corresponding state.

Accept button behavior:

```text
click ACCEPT
    ↓
button disabled
    ↓
backend transaction
    ↓
realtime state becomes accepted
    ↓
show confirmed acceptance
```

This prevents the UI from visually claiming a commitment before it exists.

---

# 43. Idempotency

Operations that mutate state must be safe against duplicate user actions.

Example:

A hospital user double-clicks Accept.

The system must not:

```text
decrement ICU twice
```

The first valid transition:

```text
pending → accepted
```

wins.

The second sees:

```text
REQUEST_ALREADY_RESOLVED
```

or an equivalent idempotent success if the same request was already accepted by the same actor.

The exact implementation behavior should be finalized in `spec.md`.

---

# 44. Timeout Race Condition

Potential race:

```text
Hospital clicks ACCEPT
```

at almost exactly:

```text
expires_at
```

The system must use server-authoritative state.

Possible outcomes:

```text
transaction commits acceptance before expiration
```

or:

```text
request already timed out
```

The client timestamp is not authoritative.

---

# 45. Reroute Race Condition

Potential race:

```text
Hospital A rejects
```

while another process simultaneously tries to:

```text
timeout Hospital A
```

Only one terminal request transition should be committed.

The other operation must detect the resolved state and avoid creating duplicate reroutes.

Invariant:

```text
one request
→ one terminal state
→ at most one next active request
```

---

# 46. Case Acceptance Invariant

Once a case is accepted:

```text
CASE already accepted
```

should prevent another hospital from accepting a competing request for the same case.

Therefore the acceptance transaction must check case routing state in addition to request state.

---

# 47. Resource Invariant

On successful resource-consuming acceptance:

```text
available resource decreases exactly once.
```

On rejected or timed-out request:

```text
no resource should be consumed
```

unless a prior temporary hold existed and must be released.

The final hold lifecycle will be defined in `spec.md`.

---

# 48. Stale-Data Contract

The backend exposes freshness information:

```json
{
  "freshness": {
    "status": "stale",
    "age_seconds": 1870,
    "last_updated_at": "Firestore Timestamp"
  }
}
```

Potential statuses:

```text
fresh
stale
unknown
```

The exact threshold is frozen in `spec.md`.

---

# 49. Stale-Data Behavior

A stale hospital may still appear in the result set depending on implementation.

The backend must communicate that:

```text
the data is stale
```

and apply the defined scoring adjustment.

The frontend must not silently render stale data as fully current.

Recommended UI:

```text
STATUS UNKNOWN
Last updated 31 min ago
```

---

# 50. Rate-Limiting Contract

The PRD requires a basic reservation-abuse mitigation gesture.

The backend should reject excessive pending requests from the same requester identity.

Error:

```text
RATE_LIMITED
```

Example:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many pending requests for this requester.",
    "details": {
      "pending_count": 5
    }
  },
  "meta": {}
}
```

The exact limit belongs in `spec.md`.

---

# 51. API and Firestore Responsibility Boundary

Use the following rule:

```text
Frontend
  ↓
business command
  ↓
backend/service
  ↓
Firestore transaction/read/write
  ↓
realtime state
  ↓
all subscribed frontends
```

Do not allow the ambulance frontend to directly write:

```text
hospital.icu_beds_free
```

Do not allow the hospital frontend to directly write:

```text
request.status = accepted
```

unless the Firestore security model and transaction path explicitly make that a controlled operation.

Preferred pattern:

```text
hospital UI
   ↓
accept command
   ↓
backend transaction
   ↓
Firestore
```

---

# 52. Frontend Ownership Contract

Person 3 is responsible for:

```text
rendering
navigation
forms
local UI state
subscriptions
loading states
error states
responsive layout
```

Person 3 is not responsible for deciding:

```text
which hospital wins
whether a resource is really available
whether timeout occurred on the server
how reliability is calculated
```

---

# 53. Backend Core Ownership Contract

Person 1 owns:

```text
need profile rules
matching
candidate ranking
distance calculation
score breakdown
mass-casualty optimization logic
```

Person 1 provides stable functions/services such as:

```text
generateNeedProfile()
calculateDistance()
calculateCapabilityMatch()
calculateHospitalScore()
rankHospitals()
generateDistributionPlan()
```

Exact function signatures are implementation details, but their inputs/outputs must map to this document.

---

# 54. Backend Realtime/AI Ownership Contract

Person 2 owns:

```text
Firestore integration
realtime synchronization
request lifecycle
transactions
resource state changes
audit events
reliability updates
AI explanation integration
seed data
```

Example service responsibilities:

```text
createCase()
createRequest()
acceptRequest()
rejectRequest()
timeoutRequest()
rerouteCase()
updateHospitalCapabilities()
writeAuditEvent()
calculate/updateReliability()
generateExplanation()
```

---

# 55. Frontend-to-Backend Integration Rule

The frontend should consume a stable service module rather than scattering Firestore/API calls across UI components.

Recommended:

```text
frontend/
  services/
    caseService
    requestService
    hospitalService
    adminService
```

Components call service functions.

They do not individually invent Firestore query semantics.

---

# 56. Naming Conventions

Use `snake_case` for persisted API/data fields:

```text
hospital_id
case_id
incident_group_id
last_updated_at
request_id
```

Use stable enum values:

```text
pending
accepted
rejected
timed_out
superseded
```

Use camelCase only if a framework/service convention requires it consistently at a transport boundary.

Do not mix:

```text
hospital_id
hospitalId
HospitalID
```

within the same API layer.

---

# 57. Versioning

The hackathon prototype does not require public API versioning.

For internal stability, use:

```text
/api/
```

rather than adding `/v7`, `/v12`, etc.

If a breaking schema change becomes necessary:

1. update `data-model.md`;
2. update `api-contract.md`;
3. update `spec.md`;
4. update affected frontend/backend code;
5. test;
6. merge together as one coordinated change.

---

# 58. Contract Change Protocol

Never silently change a core contract.

Example:

Current:

```text
icu_beds_free: integer
```

Proposed:

```text
icu_beds_free: object
```

That is a contract-breaking change.

The developer must update documentation and notify the rest of the team before implementing it.

---

# 59. Loading States

Every frontend operation must account for:

```text
idle
loading
success
error
```

For realtime data:

```text
connecting
live
reconnecting
error
```

Important demo case:

If the venue network briefly drops, the UI should communicate reconnecting rather than displaying old information as if it were current.

---

# 60. API Failure UX

Examples:

### Match failure

```text
Unable to calculate a match.
Retry
```

### Hospital request failure

```text
Request could not be sent.
Retry
```

### Accept conflict

```text
This case was already accepted or the required capacity is no longer available.
```

### Realtime connection failure

```text
Connection interrupted.
Reconnecting...
```

The UI should never expose raw stack traces.

---

# 61. Demo Fallback Philosophy

The live demo should be resilient.

For externally optional services:

```text
AI unavailable
→ deterministic explanation

Map API unavailable
→ stored hospital coordinates + Haversine

Primary venue Wi-Fi unavailable
→ phone hotspot

Third device unavailable
→ admin screen accessible from a tab
```

This is consistent with the PRD's emphasis on avoiding unnecessary live-demo dependencies.

---

# 62. Scenario A Integration Contract

For a clean cardiac case:

### Step 1

```text
POST /api/cases
```

### Step 2

Frontend receives:

```text
case + need_profile
```

### Step 3

```text
POST /api/cases/:caseId/match
```

### Step 4

Backend creates:

```text
REQUEST_001
```

### Step 5

Hospital listener receives:

```text
pending request
```

### Step 6

Hospital:

```text
POST /api/requests/request_001/accept
```

### Step 7

Realtime updates:

```text
request.status = accepted
```

### Step 8

Ambulance UI displays:

```text
Accepted
Hospital name
Reason
ETA
```

---

# 63. Scenario B Integration Contract

```text
Match
 ↓
Request A pending
 ↓
Hospital rejects OR server timeout
 ↓
request A terminal
 ↓
backend creates Request B
 ↓
ambulance observes active request change
 ↓
hospital B observes new request
```

No frontend manual restart is required.

---

# 64. Scenario C Integration Contract

```text
Create 4 cases
 ↓
same incident_group_id
 ↓
POST incident-group match
 ↓
distribution plan
 ↓
individual requests
 ↓
multiple hospital screens update
```

The UI should animate/display distribution from the backend result, not fake assignments locally.

---

# 65. Scenario D Integration Contract

Seed:

```text
Hospital H8
last_updated_at = old
```

Match request.

Backend returns:

```text
freshness.status = stale
```

and applies stale-data rule.

Frontend displays:

```text
Status unknown / stale
```

and explains that the system did not treat the data as equally trustworthy.

---

# 66. Scenario E Integration Contract

After demo routing completes:

```text
GET /api/admin/audit
GET /api/admin/reliability
```

or realtime Firestore subscriptions.

Admin UI renders:

```text
request
hospital
decision
timestamp
reason
response time
reliability
```

---

# 67. Testing Contract

Each operation should have at least one happy-path test and one failure-path test.

Minimum:

```text
create case
generate need profile
match hospital
accept request
reject request
timeout request
reroute
resource hold
concurrency conflict
stale data
mass casualty
audit write
reliability update
AI fallback
```

---

# 68. Contract-Level Acceptance Tests

## Test 1 — Case Creation

Given valid cardiac input:

```text
case created
need profile exists
```

## Test 2 — Matching

Given known hospital seed data:

```text
ranked candidates returned
top candidate deterministic
score breakdown present
```

## Test 3 — Acceptance

Given a pending valid request:

```text
request → accepted
resource decremented/held
audit created
```

## Test 4 — Rejection

Given pending request:

```text
request → rejected
next request created
```

## Test 5 — Timeout

Given expired request:

```text
request → timed_out
next request created
```

## Test 6 — Double Acceptance

Given two competing accept attempts:

```text
only one commits
resource is not double-consumed
```

## Test 7 — Mass Casualty

Given four cases in one incident:

```text
distribution returned
```

## Test 8 — Stale Hospital

Given old `last_updated_at`:

```text
freshness != fresh
```

## Test 9 — Audit

Given request transition:

```text
audit event exists
snapshot exists
```

## Test 10 — AI Failure

Given unavailable AI service:

```text
routing still succeeds
deterministic explanation shown
```

---

# 69. Git/Branch Integration Ownership

### Person 1 branch

```text
backend-core
```

Expected contract deliverables:

```text
matching functions
rules table
distance/scoring
mass-casualty logic
unit tests
```

### Person 2 branch

```text
backend-realtime-ai
```

Expected contract deliverables:

```text
Firestore integration
request lifecycle
transactions
audit
reliability
seed data
AI explanation adapter
```

### Person 3 branch

```text
frontend
```

Expected contract deliverables:

```text
ambulance UI
hospital UI
admin UI
service integration
realtime subscriptions
UX states
```

---

# 70. Merge Rule

A branch can be merged only when:

```text
contract respected
tests pass
no secrets
no unrelated breaking changes
frontend can still build
```

The `main` branch represents the stable integrated project.

This aligns with the hackathon's technical rule requiring feature work to be merged into a stable `main`.

---

# 71. Anti-Drift Checklist

Before merging any API-related change:

```text
[ ] Field names match data-model.md
[ ] Types match data-model.md
[ ] Enum matches data-model.md
[ ] State transition is allowed
[ ] Error code is documented
[ ] Frontend consumer updated if necessary
[ ] Tests updated
[ ] Audit behavior considered
[ ] Realtime behavior considered
```

---

# 72. What `spec.md` Must Freeze Next

This document intentionally leaves the following decisions for `spec.md`:

1. Exact match-score equation.
2. Exact distance-factor formula.
3. Exact ER-load-factor formula.
4. Exact staleness threshold.
5. Exact request countdown duration.
6. Exact resource-hold semantics.
7. Exact resource-consumption rules per capability.
8. Exact case-level status enumeration.
9. Exact retry/reroute termination condition.
10. Exact mass-casualty optimization method.
11. Exact reliability calculation.
12. Exact timeout mechanism.
13. Exact rate-limit values.
14. Exact security-rule policy.
15. Exact demo authentication strategy.
16. Exact ETA calculation.
17. Exact AI model/provider, if any.
18. Exact AI prompt/output constraints.
19. Exact Firestore query/index plan.
20. Exact seed dataset.
21. Exact testing thresholds.
22. Exact deployment structure.

---

# 73. Contract Freeze Rule

Once `spec.md` is approved:

```text
architecture.md
       +
data-model.md
       +
api-contract.md
       +
spec.md
       ↓
implementation baseline
```

After that point, developers should build against the documents rather than repeatedly redesigning the system during implementation.

If a genuine implementation blocker appears, document the change first, then modify the affected contracts, then code.

---

# 74. Final Contract Map

```text
                         ┌──────────────────────┐
                         │      Ambulance       │
                         │        React         │
                         └──────────┬───────────┘
                                    │
                         case/match commands
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │   Backend Services   │
                         │                      │
                         │  Case                │
                         │  Matching            │
                         │  Request lifecycle   │
                         │  Transactions        │
                         │  Audit               │
                         │  Reliability         │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │      Firestore       │
                         │                      │
                         │ hospitals            │
                         │ cases                │
                         │ requests             │
                         │ audit_logs           │
                         └───────┬───────┬──────┘
                                 │       │
                        realtime │       │ realtime
                                 │       │
                 ┌───────────────┘       └────────────────┐
                 ▼                                        ▼
       ┌──────────────────┐                     ┌──────────────────┐
       │  Hospital React  │                     │    Admin React   │
       │                  │                     │                  │
       │ request queue    │                     │ live hospitals   │
       │ countdown        │                     │ reliability      │
       │ accept/reject    │                     │ audit trail      │
       │ capabilities     │                     │ map              │
       └──────────────────┘                     └──────────────────┘

                         Optional
                            │
                            ▼
                 ┌──────────────────────┐
                 │   AI Explanation     │
                 │   non-authoritative  │
                 └──────────────────────┘
```

The invariant throughout the project is:

```text
Frontend asks.
Backend decides.
Firestore records.
Realtime listeners synchronize.
Audit records explain.
AI may phrase — never decide.
```

---

# 75. Definition of Done for `api-contract.md`

This document is implementation-ready when the team can answer all of these without guessing:

- How is a case created?
- How is a need profile returned?
- How is matching triggered?
- What does a match result contain?
- How is a request created?
- How does a hospital accept?
- How does a hospital reject?
- Who determines timeout?
- How does rerouting occur?
- How is resource concurrency protected?
- How does mass casualty invoke distribution?
- How does hospital capability update?
- How do all three interfaces receive realtime changes?
- How does the admin dashboard obtain audit/reliability data?
- What happens if AI is unavailable?
- What happens if the network drops?
- Which developer owns each service boundary?
- Which fields are authoritative?
- What happens during race conditions?
- Which decisions still need to be frozen in `spec.md`?
