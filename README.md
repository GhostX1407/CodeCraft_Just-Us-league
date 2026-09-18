# Raahi — Capability-Match Ambulance–Hospital Coordination System

> **Hackathon:** CodeCraft / Technofora '26  
> **Track:** HealthTech — Accessible Care & Intelligent Patient Support  
> **Repository Status:** `Phase 1 — Foundation Initialized` (Scaffolding & Architecture Baseline)

---

## 1. Problem

Emergency medical transport frequently suffers from critical coordination gaps:
- **Blind Routing:** Ambulances transport patients to the nearest hospital without real-time verification that the facility currently possesses the specific required capabilities (e.g., specialized trauma surgeons on duty, free ICU beds, pediatric ventilators, blood bank reserves).
- **Secondary Inter-Hospital Transfers:** When a patient arrives at an incapable or overburdened emergency room, they must be stabilized and transferred again, losing crucial minutes during the "golden hour."
- **Passive Dashboard Limitations:** Traditional availability dashboards display static counts that are neither actively reserved nor committed, leading to simultaneous convergence of multiple ambulances on the same facility and race conditions on scarce emergency resources.

---

## 2. Solution

**Raahi** transforms emergency medical routing from a passive bed-monitoring model into an active, deterministic **capability-match and commitment protocol**:
1. **Deterministic Need Profiling:** Converts emergency patient assessments and vital signs into a structured clinical need profile.
2. **Capability-Based Matching:** Ranks candidate hospitals using verifiable constraints: capability match score, real-time emergency department load, distance/travel time, and telemetry data freshness.
3. **Active Commitment Handshake:** Dispatches a direct, time-bounded allocation request with an active countdown timer to the top-ranked hospital.
4. **Automated Dynamic Rerouting:** If the primary hospital rejects or fails to respond before the timeout, Raahi instantly and automatically fails over to the next optimal candidate.
5. **Atomic Resource Reservations:** Prevents duplicate allocation of contested emergency assets (ICU beds, surgical teams) via transactional state commits.
6. **End-to-End Auditability & Accountability:** Preserves an immutable historical trail of every routing decision, state transition, and response latency.

---

## 3. Current Repository State vs. Roadmap

| Area | Status | Description |
|---|---|---|
| **Documentation & Specification** | ✅ Complete | Full PRD, architectural diagrams, data model, API contracts, task board, and mobile spec in `docs/`. |
| **Project Scaffolding** | ✅ Complete | Monorepo layout with React/Vite frontend and Firebase Cloud Functions backend. |
| **Configuration & Environment** | ✅ Complete | `.env.example`, `.gitignore`, `firebase.json`, `firestore.rules`, and workspace configs. |
| **Deterministic Matching Engine** | ⏳ Planned (Phase 3) | Structured scoring and multi-criteria ranking algorithm. |
| **Firestore State Machine & Transactions** | ⏳ Planned (Phase 4, 7, 8) | Lifecycle states (`pending`, `accepted`, `rejected`, `timed_out`, `superseded`) & atomic holds. |
| **Role-Specific Web Interfaces** | ⏳ Planned (Phase 5, 6) | Dedicated Ambulance, Hospital Reception, and Admin/Oversight views. |
| **Mass-Casualty Incident Coordination** | ⏳ Planned (Phase 9) | Batch distribution algorithm across regional hospital networks. |
| **Audit Log & Reliability Engine** | ⏳ Planned (Phase 10) | Historical event timeline and hospital response fidelity tracking. |
| **Driver Mobile Demo Experience** | ⏳ Planned (Later Stage) | Lightweight driver navigation/status view specified in `docs/mobile-demo.md`. |

---

## 4. Architecture

```text
┌──────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                    │
│                                                          │
│   Ambulance UI        Hospital UI       Admin/Audit UI   │
│   (Triage/Intake)     (Accept/Reject)   (Live Oversight) │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│                 APPLICATION / DOMAIN LAYER               │
│                                                          │
│  • Case Intake & Structured Need Profiling               │
│  • Deterministic Capability Matching & Ranking Engine    │
│  • Time-Bounded Commitment State Machine                 │
│  • Automated Failover & Dynamic Rerouting Logic          │
│  • Concurrency-Safe Resource Inventory Holds             │
│  • Mass-Casualty Multi-Hospital Distributor              │
│  • Stale Data Degradation & Reliability Calculator       │
│  • Non-Authoritative AI Explanation Layer                │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│                 REALTIME / DATA LAYER                    │
│                                                          │
│  • Firebase Cloud Firestore (Shared Source of Truth)     │
│  • Realtime Push Synchronization (onSnapshot listeners) │
│  • ACID Transactional State Transitions                  │
└──────────────────────────────────────────────────────────┘
```

---

## 5. Technology Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Leaflet / React-Leaflet
- **Backend / Domain Engine:** Node.js, TypeScript, Firebase Cloud Functions (v2)
- **Database & Realtime State:** Google Cloud Firestore
- **Authentication & Security:** Role-based actor context, Firestore Security Rules
- **Testing:** Vitest, Firebase Emulator Suite
- **Hosting:** Firebase Hosting

---

## 6. Monorepo Structure

```text
raahi/
├── docs/                      # Authoritative engineering documentation
│   ├── PRD_Final.md           # Master product requirements (Source of Truth)
│   ├── architecture.md        # System architecture and layer boundaries
│   ├── data-model.md          # Firestore schema and document definitions
│   ├── api-contract.md        # API interfaces, commands, and subscriptions
│   ├── spec.md                # Implementation specification & formulas
│   ├── plans.md               # 3-person development plan & schedule
│   ├── tasks.md               # Granular task checklist & definitions of done
│   └── mobile-demo.md         # Later-stage mobile driver view specification
├── frontend/                  # Single-page web application (React + Vite)
│   ├── src/
│   │   ├── app/               # Core application routing & layout
│   │   ├── components/        # Reusable UI component library
│   │   ├── pages/             # Ambulance, Hospital, and Admin route views
│   │   ├── hooks/             # Custom React hooks (realtime Firestore listeners)
│   │   ├── services/          # Client-side API and Firebase services
│   │   ├── types/             # Domain TypeScript interfaces (frontend)
│   │   ├── utils/             # Presentation formatting and coordinate helpers
│   │   └── styles/            # Tailwind CSS style declarations
│   ├── package.json
│   └── vite.config.ts
├── functions/                 # Backend Cloud Functions & Domain Engine
│   ├── src/
│   │   ├── api/               # HTTP / Callable function endpoints
│   │   ├── domain/            # Core business models & entities
│   │   ├── matching/          # Deterministic capability scoring engine
│   │   ├── routing/           # Request lifecycle & timeout/reroute engine
│   │   ├── resources/         # Atomic resource reservation & hold logic
│   │   ├── audit/             # Immutable audit trail recording
│   │   ├── reliability/       # Hospital reliability & response tracking
│   │   ├── ai/                # Non-authoritative explanation generator
│   │   ├── data/              # Firestore access layer
│   │   ├── utils/             # Geolocation, Haversine, and shared helpers
│   │   └── types/             # Shared TypeScript type definitions
│   ├── package.json
│   └── tsconfig.json
├── scripts/                   # Tooling and operational scripts
│   └── seed/                  # Hospital capability and scenario seed scripts
├── firebase.json              # Firebase services & emulator configuration
├── firestore.rules            # Firestore security rules
├── firestore.indexes.json     # Firestore query compound indexes
├── .firebaserc                # Firebase project targets
├── .env.example               # Environment variable template
├── .gitignore                 # Version control exclusions
└── README.md                  # Project documentation & execution guide
```

---

## 7. Database & Collections

The data layer is built on four core top-level Firestore collections:

1. **`/hospitals`**: Hospital capability profiles, trauma levels, live resource counts (ICU beds, ventilators, blood stock), ER load scores, and freshness timestamps (`last_updated_at`).
2. **`/cases`**: Emergency patient cases containing triage category, severity level, structured need profile, geolocation coordinates, and routing status.
3. **`/requests`**: Active hospital allocation requests containing lifecycle state (`pending`, `accepted`, `rejected`, `timed_out`, `superseded`), timeout timestamp (`expires_at`), and match score breakdown.
4. **`/audit_logs`**: Immutable, append-only historical log entries documenting every routing decision, state transition, and snapshot of hospital status at decision time.

---

## 8. API & Coordination Contract

Raahi separates asynchronous command invocations from realtime state subscriptions:

- **Commands:**
  - `POST /api/cases`: Create emergency case and generate need profile.
  - `POST /api/cases/:caseId/match`: Run deterministic capability matching and emit allocation request.
  - `POST /api/requests/:requestId/accept`: Hospital accepts request (commits resource hold atomically).
  - `POST /api/requests/:requestId/reject`: Hospital declines request (triggers immediate reroute).
  - `POST /api/requests/:requestId/timeout`: Server/timer resolves expired request and auto-reroutes.
  - `PATCH /api/hospitals/:hospitalId/capabilities`: Hospital updates live capability availability.
  - `POST /api/cases/:caseId/mass-match`: Mass-casualty joint optimization and multi-hospital distribution.
- **Subscriptions:**
  - Clients subscribe directly to Firestore document listeners (`onSnapshot`) for real-time synchronization between ambulance, hospital, and admin interfaces.

---

## 9. Setup & Development

### Prerequisites
- Node.js (v18+ recommended)
- npm (v9+ recommended)
- Firebase CLI (`npm install -g firebase-tools`)

### Initializing Environment
1. Clone the repository.
2. Copy `.env.example` to `.env.local` (or configure frontend/backend environment files):
   ```bash
   cp .env.example .env.local
   ```
3. Install dependencies from the repository root:
   ```bash
   npm install
   ```

### Running Locally
- **Start Frontend Dev Server:**
  ```bash
  npm run dev
  ```
- **Start Backend TypeScript Watch:**
  ```bash
  npm run dev:functions
  ```
- **Build All Workspaces:**
  ```bash
  npm run build
  ```
- **Run Unit Tests:**
  ```bash
  npm run test
  ```

---

## 10. Deployment

- **Frontend:** Hosted on Firebase Hosting (distributed from `frontend/dist`).
- **Backend:** Deployed to Firebase Cloud Functions (Node.js runtime).
- **Deploy Command:**
  ```bash
  firebase deploy
  ```

---

## 11. Demonstration Scenarios

The system is designed to demonstrate three primary clinical workflows during judging:
1. **Scenario A — Single Acute Match & Instant Acceptance:** A severe cardiac trauma case is triaged; Raahi computes hospital scores, requests Hospital A, Hospital A accepts within countdown, and ICU inventory decreases atomically.
2. **Scenario B — Rejection / Timeout with Dynamic Auto-Reroute:** Hospital A rejects or times out; Raahi automatically reroutes to Hospital B without manual dispatcher intervention; audit log captures the latency.
3. **Scenario C — Mass Casualty Incident:** An incident with multiple victims is processed simultaneously; Raahi distributes patients across balanced regional facilities to prevent hospital saturation.

---

## 12. AI Disclosure & Governance

- **Deterministic Core:** All patient need-profile generation, hospital matching, scoring, timeout handling, rerouting, and resource allocation logic are 100% deterministic and rule-based.
- **Non-Authoritative AI Layer:** Optional LLM integrations (e.g., Gemini) are strictly restricted to synthesizing natural language explanations of the deterministic scores ("Why this hospital") and assisting in medical report formatting. AI output never overrides clinical rules or ranking calculations.

---

## 13. Limitations

- **Prototype Scope:** Designed for an 18-hour hackathon environment utilizing simulated traffic/distance calculations (Haversine formula).
- **Authentication:** Uses lightweight role-based actor profiles for prototype demonstration rather than hospital enterprise SSO/EHR integration.
- **Non-Clinical Device:** Raahi is an operational decision-support and dispatch coordination prototype; human medical direction remains authoritative.

---

## 14. Development Roadmap

- [x] Phase 1: Repository foundation, monorepo scaffolding, and documentation baseline.
- [ ] Phase 2: Shared TypeScript data models and domain contracts.
- [ ] Phase 3: Deterministic capability matching engine.
- [ ] Phase 4: Firestore database integration and backend services.
- [ ] Phase 5: Role-based frontend application shell.
- [ ] Phase 6: Vertical slice integration (Scenario A).
- [ ] Phase 7: Time-bounded commitment protocol & state machine.
- [ ] Phase 8: Concurrency safety & atomic resource holds.
- [ ] Phase 9: Mass-casualty optimization & multi-case distribution.
- [ ] Phase 10: Stale-data degradation, audit trail, and reliability metrics.
- [ ] Phase 11: Admin live oversight and mid-transit rerouting.
- [ ] Phase 12: Natural language explanation layer.
- [ ] Phase 13: End-to-end hardening, testing, and deployment.
