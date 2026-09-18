# RAHI — MASTER FRONTEND BUILD PROMPT

**Capability-Match Ambulance ↔ Hospital Coordination System**
Single-source build specification for the entire frontend (Ambulance · Hospital · Admin · Mobile Ambulance View).

> **How to use this document.** Paste it in full into a coding agent (Claude Code, Cursor, etc.) as the build bible, or hand it to a human frontend developer. It merges the PRD, spec, architecture, data model, API contract, task list, mobile-demo spec and the hackathon rulebook + technical rules into one prompt.
>
> **Authority order — if two statements ever conflict, the earlier source wins:**
> `PRD_Final.md` → `spec.md` → `architecture.md` + `data-model.md` → `api-contract.md` → `tasks.md` / `plans.md` → this document's design sections.
>
> **Your job is 100% frontend.** Never implement matching logic, scoring, timeout decisions, resource holds, reliability math, or state transitions in the browser. You *consume and represent* backend state. Section C exists so you can render correctly — not so you can recompute.

---

# PART A — PROJECT CONTEXT (ground truth, do not deviate)

## A.1 What this is

**Rahi** — a hackathon build for **CodeCraft, Technofora '26** (ISA Students' Chapter, Nirma University), **HealthTech track**, ~18-hour build window, 3-person team.

Rahi is a **capability-match + confirmed-commitment routing engine** between ambulances and hospitals.

**It is explicitly NOT a bed-availability dashboard.** If your UI ends up looking like a bed-count screen, you have built the wrong product.

## A.2 The problem, precisely

Urgency assessment and capacity reality never talk to each other at the moment a decision must be made.

- **Demand side:** patients and families have no live visibility into which nearby facility can *actually* receive them right now — not "has a bed," but "has the specific team, stock and specialist this patient needs."
- **Supply side:** ambulances route on stale assumptions rather than current fact.
- **Root cause:** nobody jointly computes *"how urgent + what's needed"* against *"what's actually available"* as a single question. It is always two disconnected lookups.

**The documented failure this design must visibly solve:** Delhi's COVID-era bed-availability portal showed beds "available" at hospitals that then refused patients — because a number on a screen creates no obligation. People died as a result (a grandfather refused at 6 hospitals; ~1,100 "available" beds displayed at LNJP with none actually free; a pregnant woman refused by 8 hospitals over 12 hours).

**The lesson the UI must encode: a passive dashboard number is not enough. Only an explicit, timed Accept/Reject commitment counts as "available."** This is the single most important idea the interface has to make visually obvious.

## A.3 The mechanic the UI represents

1. **Capability profile, not a bed count** — each hospital publishes a structured profile: trauma team on shift (Y/N), ICU beds free, ventilators free, blood stock by type, specialists on call, ER load score (1–5), scheme-acceptance flag, `last_updated_at`.
2. **One joined query** — dispatcher answers a short tap-based case checklist → backend derives a deterministic need profile (rules table, no ML) → ranks hospitals by `capability% × distance × load × freshness` → and **must show its reasoning**: *"Hospital C — cardiologist on shift, ICU free, 6 min away"* beats *"Hospital A — nearest but no cardiologist."*
3. **Active commitment protocol (the core differentiator)** — the top-ranked hospital receives a structured request and must **Accept or Reject within a countdown** (implementation default: **30 seconds**). Accept = a real, held commitment (concurrency-safe hold). Reject or no response → **automatic reroute** to the next-best match, with no human restart.
4. **Mid-transit reroute** — if a hospital's capability collapses while a patient is en route, the accepted request is `superseded` and the system reroutes proactively instead of the ambulance discovering the mismatch on arrival.
5. **Mass-casualty distribution mode** — multiple patients sharing one `incident_group_id` are distributed across multiple hospitals by matching each patient's need to each hospital's distinct strength, instead of everyone defaulting to the biggest hospital. **This is the flagship demo moment.**
6. **Stale-data fallback** — if a hospital hasn't updated its profile inside the freshness window, its confidence drops (`fresh → stale → unknown`) and it is de-weighted in ranking rather than trusted.
7. **Reliability score** — accepted-and-honored vs. accepted-then-failed, accrued per hospital from the request history already being tracked.
8. **Audit trail** — every request, decision, and the data snapshot behind it is logged, timestamped, and forensically reviewable.

## A.4 The four surfaces (each has a different posture — never reuse one template)

| Surface | Route | Device | Posture |
|---|---|---|---|
| Ambulance / Dispatcher | `/ambulance`, `/ambulance/:caseId` | phone, portrait, held by presenter | urgent, tap-only, one decision per screen |
| Hospital Reception | `/hospital`, `/hospital/:hospitalId` | laptop, projected/mirrored | calm-until-alarmed, readable from several feet |
| Admin / Oversight | `/admin` | laptop or tablet | authority; map + reliability + audit |
| Family Visibility (stretch) | `/track/:caseId` | any phone | reassurance; plainest surface in the product |

## A.5 Explicitly out of scope — do not build UI for these

Scheme/eligibility matching UI, offline-first mode, internal hospital staff-reallocation UI, full governance dashboard, formal human-override/liability framework UI, hospital inventory management beyond the single capability-update form, patient medical records, billing, driver navigation/turn-by-turn.

State these as roadmap in the README and pitch. **Never half-build one.**

## A.6 Hackathon rules that constrain the frontend

From the CodeCraft rulebook and technical rules:

- **A working, user-accessible front end is mandatory.** Mockups, slides, or headless repos do not qualify. Core features shown in the pitch must be demonstrable live.
- **Judging weights:** Technical Implementation 30% · Innovation & Originality 25% · Impact & Viability 20% · **Design & UX 15%** · Live Pitch & Q&A + git discipline 10%.
- **Git:** one public repo; every member ≥2 meaningful commits; a meaningful commit every 1–2 hours; descriptive messages; no last-minute dump; frontend work lives on the `frontend` branch and merges to `main` only when `main` stays runnable.
- **Secrets:** no API keys, Firebase service credentials, tokens or passwords committed. Use `.env` + `.env.example`. Frontend Firebase web config goes in `.env` as `VITE_*` variables.
- **Deployment:** a working deploy link must stay reachable during evaluation (Firebase Hosting or Vercel), with demo credentials supplied if login exists.
- **Documentation:** `README.md` must cover problem, solution, features, stack, architecture, APIs, database, setup and run instructions. Frontend owner writes the frontend routes + API usage sections.
- **AI disclosure:** AI-assisted code must be disclosed in the PPT, and **every member must be able to explain the code they submit.** Do not generate code you cannot defend in Q&A.
- **Demo video ≤ 5 minutes**, submitted by 12:00 PM; top 6 teams face live technical Q&A.

## A.7 Non-negotiable demo constraints

- Demo runs **on real, separate physical devices simultaneously** over venue Wi-Fi — a phone (ambulance), a laptop (hospital reception), a laptop/tablet (admin). Not resized browser tabs.
- Realtime is **Firestore `onSnapshot`** — no second sync mechanism, no local cross-device simulation.
- Map is **Leaflet + OpenStreetMap tiles** — no key-gated map provider.
- **60fps target**, but every signature animation must have an instant-fallback state. The Accept/Reject/reroute mechanic must never visually fail even if polish does.
- `prefers-reduced-motion` respected. Any animation carrying information must have a non-animated text/badge equivalent beside it.
- Hospital Accept/Reject buttons must be operable and legible from several feet away on a projected screen.
- Hotspot fallback assumed; the UI must clearly say **"Reconnecting…"** rather than silently showing stale state.

---

# PART B — LOCKED STACK & APPLICATION STRUCTURE

## B.1 Stack (locked by spec.md §7)

```
React 18 + TypeScript + Vite
Tailwind CSS
React Router
Firebase Web SDK (Firestore, onSnapshot) — realtime source of truth
Firebase Callable/HTTP Functions — all commands
Leaflet + react-leaflet + OpenStreetMap tiles — admin map
Vitest — pure UI logic tests
Firebase Hosting (or Vercel) — deployment
```

Allowed additions only if they cost near-zero build time: `clsx`, `date-fns` (or a 20-line relative-time util), `framer-motion` **only if** every animation still degrades to an instant state change. No component kit (no MUI/Chakra/AntD) — they will make the UI look generic and cost more time than they save.

## B.2 One app, role routes (spec.md §9)

```
/                      → role chooser (demo launcher)
/ambulance             → dispatcher home / new case
/ambulance/:caseId     → active case: matching → pending → outcome
/hospital              → hospital identity picker (demo)
/hospital/:hospitalId  → reception console
/admin                 → oversight dashboard
/track/:caseId         → family visibility (stretch)
```

One build, one deployment, one codebase — three distinct experiences.

## B.3 Directory layout

```
frontend/
├── src/
│   ├── app/
│   │   ├── App.tsx                 # router + providers
│   │   ├── routes.tsx
│   │   └── providers/              # FirebaseProvider, ActorProvider, ToastProvider
│   ├── pages/
│   │   ├── Landing/
│   │   ├── Ambulance/              # Home, NewCase, NeedProfile, Matching, Pending, Outcome, MassCasualty
│   │   ├── Hospital/               # Picker, Console, CapabilityForm, PrepChecklist
│   │   ├── Admin/                  # Dashboard, Map, Reliability, Activity, AuditLog
│   │   └── Track/                  # family view (stretch)
│   ├── components/
│   │   ├── primitives/             # Button, Card, Field, Toggle, Sheet, Toast
│   │   ├── domain/                 # CommitmentCircuit, Countdown, StatusBadge, FreshnessBadge,
│   │   │                           # MatchCard, NeedProfileChips, ScoreBreakdown, ReliabilityMeter,
│   │   │                           # HospitalCapabilityPanel, AuditTimeline, DistributionBoard
│   │   └── feedback/               # LoadingState, EmptyState, ErrorState, ConnectionBanner
│   ├── hooks/                      # useCaseRequests, useHospitalQueue, useHospital, useHospitals,
│   │                               # useAuditLog, useReliability, useServerCountdown, useConnectionState
│   ├── services/                   # api.ts (commands), firestore.ts (subscriptions), firebase.ts
│   ├── types/                      # domain.ts — mirrors backend shared types exactly
│   ├── utils/                      # time.ts, format.ts, motion.ts, geo.ts (display only)
│   └── styles/                     # tokens.css, index.css
├── public/
│   └── sounds/alert.mp3
└── .env.example
```

## B.4 Environment variables

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
VITE_API_BASE_URL=
VITE_REQUEST_TIMEOUT_SECONDS=30
VITE_DEMO_MODE=true
```

`.env` is git-ignored; `.env.example` is committed with empty values. Never inline a config value in source.

---

# PART C — DOMAIN CONTRACT (render against this; never recompute it)

## C.1 TypeScript domain types (`src/types/domain.ts`)

These must match the backend shared types field-for-field. If the backend changes a field, the contract change is announced and both sides update together (api-contract.md §58).

```ts
export type CaseCategory = 'cardiac' | 'trauma' | 'obstetric' | 'pediatric';
export type Severity = 'red' | 'yellow' | 'green';
export type RequestStatus = 'pending' | 'accepted' | 'rejected' | 'timed_out' | 'superseded';
export type Freshness = 'fresh' | 'stale' | 'unknown';
export type BloodType = 'O-' | 'O+' | 'A-' | 'A+' | 'B-' | 'B+' | 'AB-' | 'AB+';

export interface Hospital {
  id: string;
  name: string;
  lat: number;
  lng: number;
  trauma_team_on_shift: boolean;
  specialists_on_call: string[];          // e.g. ["cardiologist","orthopedist"]
  icu_beds_free: number;
  ventilators_free: number;
  blood_stock: Partial<Record<BloodType, number>>;
  er_load_score: number;                  // 1 (light) – 5 (overloaded), self-reported
  accepts_scheme_patients: boolean;
  last_updated_at: Timestamp;             // drives freshness
  reliability_score: number;              // 0–1, computed by backend
  contact_number?: string;                // used by the mobile "Contact hospital" action
}

export interface NeedProfile {
  specialists_needed: string[];
  capability_flags: string[];             // "ecg" | "icu" | "trauma_team" | "maternity" | "pediatric_emergency" | ...
  blood_type_needed: BloodType | null;
}

export interface Case {
  id: string;
  created_at: Timestamp;
  category: CaseCategory;
  severity: Severity;
  need_profile: NeedProfile;
  vitals_summary: string;
  onset_time: string;
  treatment_administered: string;
  patient_basic_info: { age: number; sex: 'male' | 'female' | 'other'; name?: string };
  incident_group_id: string | null;
  ambulance_location: { lat: number; lng: number };
}

export interface MatchScoreBreakdown {
  capability_match_pct: number;   // 0–100
  distance_km: number;
  distance_factor: number;        // 0–1
  load_factor: number;            // 0–1
  staleness_factor: number;       // 1.00 fresh | 0.85 stale | 0.70 unknown
  final_score: number;            // 0–100
}

export interface Request {
  id: string;
  case_id: string;
  hospital_id: string;
  status: RequestStatus;
  sent_at: Timestamp;
  expires_at: Timestamp;          // SERVER-authored; the only countdown source
  responded_at: Timestamp | null;
  attempt_number: number;
  match_score_breakdown: MatchScoreBreakdown;
  reason_shown_to_dispatcher: string;
  rejection_reason?: string;
}

export interface MatchResult {
  hospital_id: string;
  rank: number;
  capability_match_pct: number;
  distance_km: number;
  distance_factor: number;
  load_factor: number;
  staleness_factor: number;
  final_score: number;
  eligibility: { eligible: boolean; reason: string | null };
  freshness: { status: Freshness; last_updated_at: Timestamp };
  reasons: string[];              // ["Cardiologist available", "ICU capacity available", "Low ER load"]
}

export interface CaseRouting {
  status: 'idle' | 'matching' | 'pending' | 'accepted' | 'rerouting' | 'exhausted';
  active_request_id: string | null;
  attempt_number: number;
  accepted_hospital_id: string | null;
}

export interface AuditEvent {
  id: string;
  request_id: string | null;
  case_id: string;
  hospital_id: string | null;
  event_type: string;             // CASE_CREATED | NEED_PROFILE_GENERATED | MATCH_COMPUTED |
                                  // REQUEST_SENT | REQUEST_ACCEPTED | REQUEST_REJECTED |
                                  // REQUEST_TIMED_OUT | REQUEST_SUPERSEDED | REROUTE_TRIGGERED |
                                  // CAPABILITY_UPDATED | HOLD_CREATED | HOLD_RELEASED
  timestamp: Timestamp;
  actor_type: 'ambulance' | 'hospital' | 'admin' | 'system';
  snapshot_of_data_at_decision_time: Record<string, unknown>;
}

export interface ReliabilityRow {
  hospital_id: string;
  hospital_name: string;
  reliability_score: number;
  response_metrics: {
    accepted_count: number;
    successful_commitment_count: number;
    average_response_seconds: number;
  };
}

export interface Actor {
  actor_type: 'ambulance' | 'hospital' | 'admin';
  actor_id: string;   // e.g. "ambulance_demo_01" | "hospital_003_demo" | "admin_demo_01"
}
```

## C.2 Reference tables you render (backend owns the logic)

**Need profiles (deterministic rules table, spec.md §19):**

| Category | specialists_needed | capability_flags | blood_type_needed |
|---|---|---|---|
| cardiac | `["cardiologist"]` | `["ecg","icu"]` | `null` |
| trauma | `[]` | `["trauma_team","icu"]` | `"O-"` |
| obstetric | `["obgyn"]` | `["maternity"]` | `null` |
| pediatric | `["pediatrician"]` | `["pediatric_emergency"]` | `null` |

**Freshness (spec.md §28) — used for badges and for stale decay visuals:**

| Age of `last_updated_at` | Status | Factor |
|---|---|---|
| 0–10 min | `fresh` | 1.00 |
| >10–30 min | `stale` | 0.85 |
| >30 min | `unknown` | 0.70 |

**Final score (spec.md §29) — display only, never recompute for ranking:**

```
final_score = (capability_match_pct / 100) × distance_factor × load_factor × freshness_factor × 100
```

Round to 1 decimal for display. Show the factors as a breakdown so a judge can see the arithmetic.

**Timeout:** `REQUEST_TIMEOUT_SECONDS = 30` (configurable, imported once from config — never hard-coded in a component).

## C.3 Three rules that will get you failed in Q&A if broken

1. **Server time is authoritative.** The countdown renders `expires_at − serverNow`. When it hits zero the UI shows *"Awaiting hospital response…"* / *"No response — confirming with system"*, and waits for Firestore to say `timed_out`. **The frontend never declares a timeout.**
2. **No optimistic commitment.** Never render Accepted, Reserved, Held or Rerouted before the backend commits it. Accept click → button disabled + "Confirming…" → Firestore status becomes `accepted` → only then show the accepted state.
3. **No frontend decisions.** You never choose a hospital, reorder ranked candidates, compute reliability, decide eligibility, or assign patients in mass-casualty mode. If you need a number, it comes from the payload.

---

# PART D — DATA ACCESS LAYER

## D.1 Command layer (`src/services/api.ts`)

Every mutation is a command to the backend. Every call carries an `actor`. Every response uses the common envelope.

```ts
// Envelope
interface ApiOk<T>  { success: true;  data: T;    error: null; meta: Record<string, unknown> }
interface ApiErr    { success: false; data: null; error: { code: string; message: string; details?: unknown };
                      meta: Record<string, unknown> }
```

| Function | Operation | Returns |
|---|---|---|
| `createCase(input, actor)` | `POST /api/cases` | `{ case: Case }` — includes generated `need_profile` |
| `getCase(caseId)` | `GET /api/cases/:caseId` | `{ case: Case; routing: CaseRouting }` |
| `matchCase(caseId, actor)` | `POST /api/cases/:caseId/match` | `{ case_id, active_request: Request, ranked_candidates: {hospital_id, rank, final_score}[] }` |
| `massMatch(incidentGroupId, actor)` | `POST /api/incidents/:id/match` | `{ incident_group_id, distribution: {case_id, hospital_id, rank, score}[], requests_created: string[] }` |
| `acceptRequest(requestId, actor)` | `POST /api/requests/:id/accept` | committed request |
| `rejectRequest(requestId, reason, actor)` | `POST /api/requests/:id/reject` | `{ reroute: { trigger, previous_request_id, new_request } }` |
| `timeoutRequest(requestId)` | `POST /api/requests/:id/timeout` | reroute payload (backend-driven; UI may only *nudge*, never assert) |
| `listHospitals()` | `GET /api/hospitals` | `{ hospitals: Hospital[] }` |
| `getHospital(id)` | `GET /api/hospitals/:id` | `{ hospital: Hospital }` |
| `updateCapabilities(id, patch, actor)` | `PATCH /api/hospitals/:id/capabilities` | updated hospital (`last_updated_at` set server-side) |
| `getCaseRequests(caseId)` | `GET /api/cases/:caseId/requests` | `{ requests: Request[] }` |
| `getAudit(params)` | `GET /api/admin/audit?caseId&hospitalId&eventType&limit` | `{ events: AuditEvent[] }` |
| `getReliability()` | `GET /api/admin/reliability` | `{ hospitals: ReliabilityRow[] }` |
| `explainMatch(payload)` | `POST /api/explanations/match` | `{ explanation: string }`, `meta.ai_assisted` |

**Error handling rule:** branch on `error.code` only. Never parse `message`. Never surface a stack trace.

| `error.code` | UI response |
|---|---|
| `NO_ELIGIBLE_HOSPITAL` | Full-screen honest state: "No hospital currently meets this case's requirements." + Retry + Review needs |
| `CASE_ALREADY_ACCEPTED` | "This case was already accepted elsewhere." Refresh the request from Firestore. |
| `REQUEST_ALREADY_RESOLVED` | Dismiss the card with "Already resolved" — never an error toast on the hospital console |
| `REQUEST_EXPIRED` | "This request expired. The system is rerouting." |
| `NO_AVAILABLE_CAPABILITY` / `CONCURRENCY_CONFLICT` | "This case was already accepted or the required capacity is no longer available." |
| `RATE_LIMITED` | Disable the action for 3s with a quiet inline note |
| `AI_EXPLANATION_FAILED` | Silently fall back to the deterministic reason string. **Never block routing.** |
| `FIRESTORE_ERROR` / `INTERNAL_ERROR` | "Something went wrong. Retry." + retry button |

## D.2 Subscription layer (`src/services/firestore.ts` + hooks)

Realtime is read-only truth. Writes go through the command layer, never straight to Firestore.

| Hook | Query | Used by |
|---|---|---|
| `useCaseRequests(caseId)` | `requests where case_id == caseId orderBy sent_at` | Ambulance |
| `useCase(caseId)` | `cases/{caseId}` doc | Ambulance, Track |
| `useHospitalQueue(hospitalId)` | `requests where hospital_id == hospitalId and status == 'pending'` | Hospital |
| `useHospital(hospitalId)` | `hospitals/{hospitalId}` doc | Hospital, Ambulance destination panel |
| `useHospitals()` | `hospitals` collection | Admin map, Ambulance candidate list |
| `useActiveRequests()` | `requests where status == 'pending'` | Admin live activity |
| `useAuditLog(filters)` | `audit_log orderBy timestamp desc limit n` | Admin |
| `useIncidentCases(groupId)` | `cases where incident_group_id == groupId` | Mass-casualty board |

Every hook returns:

```ts
{ data, status: 'connecting' | 'live' | 'reconnecting' | 'error', error }
```

Rules:
- Unsubscribe on unmount. No leaked listeners (a leaked listener during the demo means a stale screen on stage).
- A request vanishing from the hospital queue is **not** a reason. Read its status to know whether it was accepted, rejected elsewhere, timed out or superseded.
- Never merge locally-invented state into subscription data.
- Show `ConnectionBanner` whenever status is `reconnecting` — the venue Wi-Fi will drop at least once.

## D.3 Countdown (`useServerCountdown`)

```ts
useServerCountdown(expiresAt: Timestamp) → {
  secondsRemaining: number;   // clamped at 0
  fraction: number;           // 1 → 0, drives the ring/bar
  expiredLocally: boolean;    // VISUAL ONLY — never triggers a state change
}
```

Compute a one-time `serverOffset = serverTimestampFromPayload − Date.now()` at load and apply it, so a drifting laptop clock doesn't desync the two demo devices. Tick with `requestAnimationFrame` for the ring, `setInterval(1000)` for the digits. Format `MM:SS`.

---

# PART E — FRONTEND STATE MACHINES (derive, never invent)

## E.1 Ambulance (api-contract.md §39)

```
NO_CASE
  → CASE_CREATED           (case exists, not yet matched — need profile shown)
  → MATCHING               (match command in flight)
  → PENDING                (active request, countdown running)
  → ACCEPTED               (terminal-happy; destination locked)
  → REJECTED_AND_REROUTING (transient, ~1.5s, then back to PENDING with attempt_number+1)
  → TIMED_OUT_AND_REROUTING(transient, then PENDING)
  → ROUTING_EXHAUSTED      (no candidates left — honest dead-end screen)
  → SUPERSEDED_REROUTING   (mid-transit: destination changed after acceptance)
```

Derivation: read `case.routing` + the newest `request` from the subscription. Do not keep a parallel local copy of "what I think is happening."

## E.2 Hospital (api-contract.md §40)

```
NO_PENDING_REQUESTS   → calm default console, capability panel front and centre
REQUEST_RECEIVED      → alarm state: tone + visual flash
COUNTDOWN_ACTIVE      → Accept / Reject live, ring shrinking
SUBMITTING            → buttons disabled, "Confirming…"
ACCEPTED              → prep checklist, commitment confirmation
REJECTED              → card retires with "Rerouted by Rahi"
EXPIRED               → card retires with "No response — rerouted"
```

## E.3 Admin

```
CONNECTING → LIVE (always-on; no request/response screens)
```

Admin is observational. It never mutates state.

---

# PART F — DESIGN LAW

You are acting as an elite HealthTech product designer, frontend architect, interaction designer and UX researcher. Design & UX is 15% of the score and the reroute animation is what makes the pitch land — but nothing here may compromise Part C.

## F.1 The one rule everything serves

**Make the difference between "shown available" and "committed" impossible to miss.**

Evaluate every colour, motion and layout decision against that sentence. A beautiful UI that blurs this distinction has failed the brief. Concretely:

- Capability numbers read from a hospital profile (ICU 4, ventilators 2) are rendered as **reported figures with a timestamp** — muted, secondary, always paired with freshness.
- A committed acceptance is rendered as a **locked, solid, unmistakably different object** — different weight, different fill, different geometry from every "reported" number on screen.
- Anywhere both appear together, the visual gap between them must be obvious at a glance from across a room.

## F.2 Reject these patterns outright

- No sidebar + top navbar + stat-card grid + notification bell. That's the grammar of a passive dashboard; this product is not passive.
- No healthcare clichés: heartbeat line, medical cross, stethoscope, pill, ambulance emoji, caduceus. None of them represent what Rahi does.
- No purple-blue gradient wash, no glass-morphism, no giant glowing hero heading, no identical rounded cards with the same soft grey shadow, no decorative gradient blobs.
- No tracked-out ALL-CAPS eyebrow labels above every heading, no "A · B · C" middot meta strings, no "→" glued to button text.
- No generic warm-cream + terracotta studio palette and no near-black + acid-green palette. Both are current AI-design defaults.

## F.3 The product metaphor: **the commitment circuit**

The domain concept underneath Rahi isn't a body — it's a **signal that must close into a locked commitment, or it dies and re-routes**. Build the whole interaction language from that.

| Circuit state | Visual |
|---|---|
| Request in flight (`pending`) | A dotted, translucent, slowly-travelling line between case node and hospital node. Visibly *unresolved* — a circuit that hasn't closed. |
| **Accepted** | The line **snaps solid and locks.** This is the single most important micro-interaction in the product. It must feel like a physical click, not a colour swap: a solid fill sweeping along the line (180ms), a brief scale-settle on the hospital card (1.0 → 1.03 → 1.0, cubic-bezier(.2,.9,.2,1)), and a terminal "cap" drawn at each end. |
| **Rejected / timed out** | The line **fractures** — it breaks mid-span, the fragments fall away, and the *same* signal visibly re-travels to the next-ranked node. **Give this the most design budget of anything in the app.** It is the one thing no competitor's dashboard can show. |
| **Superseded** (mid-transit) | The existing locked circuit dissolves *without resetting the screen*, and a new one forms to the new hospital. The old line greys and thins out as the new one draws. |
| **Stale data** | The hospital node's outline gradually loses solidity as `last_updated_at` ages: solid (fresh) → dashed, 70% opacity (stale) → dotted, 45% opacity, desaturated (unknown). The system *reasoning about trust*, not just labelling it. |
| **Reliability** | A number that visibly ticks up or down the moment a request resolves. Never a static stat. |

Implement the circuit as one reusable component (`CommitmentCircuit`) driven purely by `status`, so every surface animates the same way from the same source of truth.

## F.4 Tokens (`src/styles/tokens.css`)

A deliberately clinical-instrument palette — cool slate ground, signal-grade accents, red held in reserve. Not a dashboard palette, not a "healthcare blue" palette.

```css
:root {
  /* ground */
  --ink-900:#0E1518;  /* deepest ground, hospital console */
  --ink-800:#151F24;
  --ink-700:#1C2A31;
  --ink-600:#2A3B44;
  --line-1:#33474F;   /* hairlines, circuit rails */
  --paper:#F2F4F3;    /* ambulance surfaces, family page */
  --paper-2:#E3E8E7;

  /* type */
  --text-hi:#F4F8F7;
  --text-mid:#A8B8BC;
  --text-low:#6E8288;

  /* signal */
  --signal:#3FD2C7;       /* pending / in-flight circuit — teal, not blue */
  --commit:#5BE38A;       /* ACCEPTED / locked commitment — the only green */
  --caution:#FFB23F;      /* reroute in progress, stale, degraded */
  --critical:#FF4D3D;     /* reserved: timed_out, rejected-critical, exhausted */
  --unknown:#7C8AA0;      /* unknown freshness, de-weighted */
  --severity-red:#E5484D;
  --severity-yellow:#E8B931;
  --severity-green:#43BA7F;
}
```

**Colour discipline (enforce this):** `--critical` red is spent *only* on `timed_out`, `rejected`, and `ROUTING_EXHAUSTED`. It is **not** used for generic "urgent" badges, not for severity red (that has its own token), not for delete buttons, not for borders. In mass-casualty mode nearly everything is urgent; if red is everywhere, the flagship beat loses all contrast.

`--commit` green appears on exactly one thing: a committed acceptance. Nothing else in the product is that green.

## F.5 Typography

Two families, clearly distinct, both Google-hosted with real fallbacks:

- **Instrument face — `IBM Plex Mono`** (fallback `ui-monospace, SFMono-Regular, monospace`): every number the system computed or measured — match score, capability %, distance, ETA, countdown, ICU/ventilator counts, timestamps, case IDs, audit event types. Tabular figures on (`font-variant-numeric: tabular-nums`) so countdowns don't jitter.
- **Human face — `Inter`** (fallback `system-ui, sans-serif`): hospital names, patient info, reasoning strings, buttons, all prose.

The split is semantic, not decorative: **mono = the machine measured it, sans = a human reads it.** Keeping that rule consistent is itself a design idea judges will notice.

Type scale (1.25): 12 / 14 / 16 / 20 / 25 / 31 / 39 / 49. Countdown digits on the hospital console are 64–96px because they must read from across a room. Line length ≤ 70 characters. Sentence case everywhere; no all-caps labels.

## F.6 Geometry and structure

Do not put `border-radius: 12px` on everything. Let the circuit motif inform shape:

- **Request cards are elongated, rail-connected forms** — a 2px vertical rail runs down the left edge of a request card and physically connects to the circuit line. A request is a *relationship* between a case and a hospital, not an isolated box.
- Radius scale by meaning: `0px` on data tables and audit rows (they're records), `4px` on panels, `999px` only on the countdown ring and status pills.
- Elevation carries commitment, not decoration: `pending` sits flat on the surface; `accepted` lifts with a hard, narrow shadow plus a solid 2px `--commit` rail; retired cards sink and desaturate.
- Hairlines (`--line-1`) instead of card-shadow separation in the admin dashboard — it should read as instrumentation, not marketing.

## F.7 Motion is state, never decoration

Every animation must be traceable to one state-machine event. If a motion doesn't map to a row in this table, cut it.

| Event | Motion |
|---|---|
| `REQUEST_SENT` | Signal travels outward from case node to hospital node (600ms, ease-out), dotted line begins its slow travel |
| `REQUEST_ACCEPTED` | Fill sweeps the line (180ms) → lock caps snap in (90ms) → card scale-settle → reliability meter ticks |
| `REQUEST_REJECTED` / `TIMED_OUT` | Line fractures mid-span (120ms), fragments drift and fade (200ms), signal re-travels to the next node (600ms) |
| `REQUEST_SUPERSEDED` | Old locked line greys, thins, dissolves while the new line draws — screen never resets |
| Mass-casualty resolve | Convergence → split distribution (Part I) |
| Audit opened | Timeline unspools downward from the resolved case — not a generic modal fade |
| Freshness decay | Node outline solidity decays with `last_updated_at`; re-solidifies on capability update |
| Reliability change | Digit rolls, meter animates ±, 400ms |

Budget: total signature animation time ≤ 1.2s per event. A judge waiting on an animation is a judge losing interest — and the demo clock is 5 minutes.

## F.8 Quiet Mode — scoped correctly

Do **not** apply ambient-motion damping to the Ambulance or Hospital surfaces; urgency cues must never be softened in an active dispatch tool. Quiet Mode belongs to the **Admin dashboard only**, for a reviewer scanning reliability during a calm period: damp ambient motion, mute secondary stats — but the map and any live pending request stay fully visible and fully animated regardless of mode.

## F.9 3D / heavy visuals

- **Build:** the 2.5D **capability-radiance** map on Admin — each hospital node carries a soft glow whose radius and intensity reflect its current match-worthiness for the active case (not a static pin). Cheap, legible from a distance, and it visualises the matching logic directly.
- **Skip entirely:** anatomical models, 3D vehicles, particle systems, WebGL scenes. They cost hours you don't have and read as decoration.

## F.10 Every component gets every state

Never design only the happy-path screenshot. Each component must handle:

`loading · empty · normal · selected · pending · accepted · rejected · timed_out · superseded · stale · unknown · disabled · error/offline`

---

# PART G — COMPONENT SPECIFICATION

Build these before any screen. Each one is independently demoable on a scratch route (`/dev/components`) — that also makes a clean, meaningful commit.

### G.1 `CommitmentCircuit`
```ts
{ from: {label, x?, y?}; to: {label, x?, y?}; status: RequestStatus | 'traveling';
  freshness?: Freshness; compact?: boolean }
```
Renders inline SVG. Drives every state in F.3. `prefers-reduced-motion` → instant state change plus a text label (`In flight` / `Locked` / `Broken`). Must work at 320px width (mobile inline) and full-panel width (admin).

### G.2 `Countdown`
```ts
{ expiresAt: Timestamp; size: 'sm' | 'lg' | 'stage'; variant: 'ring' | 'bar' }
```
Ring for hospital console (`stage` = 220px), bar for ambulance. Digits `MM:SS`, tabular. Ring depletes counter-clockwise. At ≤10s the ring shifts to `--caution` and the digits gain weight — **not** a flashing red panel. At 0 it holds "0:00" and switches the label to "Awaiting system confirmation." It never fires a state change.

### G.3 `StatusBadge`
Supports `pending · accepted · rejected · timed_out · superseded · fresh · stale · unknown`. Each state has a distinct shape as well as a distinct colour, so the badge survives greyscale, projection and colour-blind viewing. Text label always present — never colour alone.

### G.4 `FreshnessBadge`
```ts
{ lastUpdatedAt: Timestamp }  →  "Updated 2 min ago" + fresh|stale|unknown treatment
```
Outline solidity matches F.3 (solid / dashed / dotted). On `unknown`, adds the plain sentence: *"Status unknown — de-prioritised in ranking."* That sentence is doing the real work of Scenario D; don't hide it behind an icon.

### G.5 `MatchCard` (ambulance's primary object)
Displays: hospital name · rank · final score · capability match % · distance km · ETA · ER load · freshness · reasoning string · the human-confirmation line.

**Mandatory line on every match result (spec.md §46):**
> **Recommended — human confirmation required.** Hospital staff must explicitly accept this request.

Rahi never says "the patient must go to Hospital X." Leaving this line out is a factual misrepresentation of the system and a Q&A liability.

### G.6 `ScoreBreakdown`
An expandable strip showing the arithmetic:
```
capability 100%  ×  distance 0.88  ×  load 0.80  ×  freshness 1.00  =  70.4
```
Rendered in the mono face, with the multiplication visible. This single component is how you answer "how did you rank these?" in Q&A without opening the code.

### G.7 `NeedProfileChips`
Renders `specialists_needed`, `capability_flags`, `blood_type_needed` as three visually distinct chip groups. Display only — the frontend must never modify the semantic content of a need profile. When a hospital satisfies a chip, the chip gets a satisfied treatment; unsatisfied chips stay hollow. That instantly explains a capability percentage.

### G.8 `HospitalCapabilityPanel`
Trauma team · specialists on call · ICU free · ventilators free · blood stock by type · ER load 1–5 · scheme flag · last updated. Numbers in mono, always adjacent to their freshness. In editable mode (hospital console) it becomes the capability update form: steppers and toggles only, **no free text**, one "Update status" button, optimistic-free (wait for the server write, then re-render from the snapshot).

### G.9 `ReliabilityMeter`
```ts
{ score: number; metrics?: ReliabilityRow['response_metrics']; animateOnChange?: true }
```
A segmented meter plus the raw fraction (`15/16 honoured`). Ticks visibly when a request resolves. Tooltip states plainly: *"Accepted-and-honoured ÷ total accepted."* Do not invent a grade or a letter rating.

### G.10 `RequestCard` (hospital console)
Severity stripe · category · patient age/sex · vitals summary · onset · treatment given · need profile chips · distance/ETA · reasoning · countdown ring · **Accept / Reject**.

Accept and Reject are minimum **72px tall**, side by side, with ≥24px of separation so a panicked tap can't hit the wrong one. Accept is filled `--commit`; Reject is outlined, never filled red. Both disable immediately on click and show "Confirming…" until Firestore confirms.

### G.11 `AuditTimeline`
Vertical forensic trail, newest at top, rows at radius 0. Each row: timestamp (mono) · event type · actor · hospital. Click expands the `snapshot_of_data_at_decision_time` as formatted JSON in a drawer — **the snapshot is the point**: it proves the decision is reviewable against the data as it was, not as it is now. Never a raw table dump with no context.

### G.12 `DistributionBoard` (mass-casualty)
See Part I.2.

### G.13 Feedback set
`LoadingState` (skeletons matching final layout, never a spinner alone) · `EmptyState` (an invitation to act, e.g. "No active case. Start a new case to begin routing.") · `ErrorState` (what happened + what to do + retry) · `ConnectionBanner` (fixed, non-blocking: "Connection interrupted. Reconnecting…").

Copy rule: errors don't apologise and are never vague. "Unable to calculate a match. Retry." not "Oops! Something went wrong 😔".

---

# PART H — SCREEN SPECIFICATIONS

## H.1 Ambulance / Dispatcher (phone, portrait, `/ambulance`)

Posture: urgent. One decision per screen. **Tap-only — no free-text typing anywhere in the demo path** (typing on stage is slow and error-prone). Single-hand reachable: primary action always in the bottom third, minimum 56px targets.

**H.1.1 Home**
- One dominant action: **New case**.
- Secondary: **Mass-casualty incident** (reachable from home, one tap).
- Active case, if any, appears as a live strip at the top with its current routing status; tapping resumes it.
- Connection state pill (live / reconnecting).

**H.1.2 Case intake** (one screen, scrollable, or two steps — no more)
- Category: four large tap tiles — cardiac · trauma · obstetric · pediatric. Each tile carries a plain sub-label of what it will request (e.g. "cardiologist, ECG, ICU"), so the audience understands the rules table before you explain it.
- Severity: three-segment control red / yellow / green, auto-suggested from category, editable. Label it **"Prototype urgency — not a clinical triage category"** (spec.md §20). Keep that line visible; it is an honesty requirement, not a disclaimer to bury.
- Patient: age stepper, sex segmented control.
- Vitals / onset / treatment: chip presets ("SpO2 91%, pulse 118", "25 minutes ago", "Oxygen started") with an optional keyboard fallback hidden behind "Other". Presets exist for demo speed and are seeded, not fabricated data.
- Location: browser geolocation with a seeded fallback coordinate and a visible source note ("Using device location" / "Using demo location").

**H.1.3 Need-profile preview** — the pitch moment before matching
Show the generated `need_profile` as chips with the heading *"This case needs:"* and the sub-line *"Generated from a deterministic rules table — no model, no guesswork."* Primary action: **Find best hospital**.

**H.1.4 Matching**
A short, honest working state that names the steps the backend is actually performing: eligibility gate → capability match → distance → load → freshness → rank. Steps illuminate as the response resolves. Do not fake progress beats longer than the real call; if the response lands in 300ms, show the completed sequence and move on.

**H.1.5 Pending (the two-device beat)**
- `MatchCard` for the requested hospital at attempt `n`.
- `CommitmentCircuit` in flight between "This case" and the hospital.
- `Countdown` bar synced to `expires_at` — the same clock the hospital console is showing.
- A quiet, collapsed list of ranked candidates 2..n, labelled "Next in line if this hospital doesn't respond." This makes the reroute predictable *before* it happens, which makes it read as engineering rather than luck.
- Attempt indicator: "Attempt 2 of ranked list."

**H.1.6 Outcome**
- **Accepted:** circuit locks, card fills `--commit`, the reasoning string is the largest text on screen ("Hospital C — cardiologist on shift, ICU free, 6 min away"), destination summary (distance, ETA, ICU free, ventilators, ER load, freshness), and **Contact hospital** (`tel:` link from `hospital.contact_number`).
- **Rerouting:** amber, circuit fractures, and the transition is narrated on screen as it happens: *"Hospital A did not respond — automatically rerouted to Hospital C."* No manual restart button. **Never offer a "try again" affordance here** — the absence of a human restart *is* the feature.
- **Exhausted:** honest dead-end. "No remaining hospital meets this case's requirements." Show what was tried, with each rejection reason. Do not invent a hopeful path.

**H.1.7 Mass-casualty mode** — see Part I.2.

**H.1.8 Mid-transit reroute** (Scenario, architecture.md §12)
While `accepted`, if the request becomes `superseded`, the screen must alert without a full reset: a priority banner (*"Destination changed — CityCare can no longer receive this patient"*), the old circuit dissolving, the new destination card arriving beneath, and a one-line reason. The driver should never have to re-enter anything.

## H.2 Hospital Reception (laptop, projected, `/hospital/:hospitalId`)

Posture: calm until alarmed. This screen is looked at from several feet away.

**H.2.1 Identity + calm default**
Hospital name and ID visible at all times (a projected screen must never be ambiguous about which hospital it is). Default state: the capability panel is the main object, plus reliability, plus "No incoming requests." Genuinely quiet — dark ground, low motion.

**H.2.2 Incoming request (the alarm)**
The instant a `pending` request lands via `onSnapshot`:
- Audible tone (`/sounds/alert.mp3`, short, non-musical, single hit). Must be unlocked by a prior user gesture — add a "Enable sound" control on the identity screen and verify it during rehearsal, because browsers block autoplay.
- Full-width takeover card with a severity stripe, the countdown ring at `stage` size, and the structured handoff data (this is the answer to the handoff-information-loss problem: the hospital sees vitals, onset and treatment given *before* the ambulance arrives).
- Accept / Reject per G.10.
- Queue: if more than one request is pending (mass-casualty), stack them with the nearest expiry on top; each keeps its own countdown.

**H.2.3 Post-decision**
- **Accept →** commitment confirmation + **incoming-case prep checklist** derived from the need profile ("Prepare: cardiology bay · ECG · 1 ICU bed"). The checklist is the visual payoff of a commitment and takes ten minutes to build — build it.
- **Reject →** reason selection (capacity full · specialist unavailable · equipment unavailable · other), then the card retires with "Rerouted by Rahi."
- **Expired →** card retires with "No response — rerouted." Not an error, not red-screen shaming; it is a system behaving correctly.

**H.2.4 Capability update**
The editable `HospitalCapabilityPanel`. Used live in the demo to trigger the mid-transit reroute and to re-freshen a stale hospital. After a successful write, `last_updated_at` visibly resets and the freshness badge re-solidifies — that is the stale-data story running backwards, and it's a satisfying five seconds of demo.

## H.3 Admin / Oversight (`/admin`)

Posture: authority. This is the screen judges watch longest. Layout: a dominant map, a right rail of live routing activity, a bottom drawer for audit.

**H.3.1 Capability-radiance map**
Leaflet + OSM tiles, dark tile styling to match the console. Each hospital is a node, not a pin:
- Radiance radius/intensity = current match-worthiness for the active case (from `final_score` when a case is active; from capability breadth when idle).
- Outline solidity = freshness (F.3).
- A live `CommitmentCircuit` line is drawn from the ambulance marker to the currently-requested hospital, animating through pending → accepted/fractured → rerouted.
- Ambulance marker moves only if real location updates exist. **Do not fake movement.**

**H.3.2 Live routing activity rail**
Every `pending` request across the system, with case, hospital, attempt number and countdown. During mass-casualty this rail is four simultaneous countdowns — a strong, honest visual.

**H.3.3 Hospital network table**
Name · capability summary · freshness · reliability meter · ER load. Hairline rows, mono figures, no card grid.

**H.3.4 Reliability**
`ReliabilityMeter` per hospital plus `accepted_count`, `successful_commitment_count`, `average_response_seconds`. Ticks live when a request resolves during the demo.

**H.3.5 Audit drawer**
`AuditTimeline` filtered by case, hospital or event type, with the snapshot drawer. The closing beat of the pitch opens this on the case just demoed.

## H.4 Mobile Ambulance View — "Rahi Ambulance View" (post-MVP, `/ambulance/:caseId` responsive)

Priority: **later-stage polish.** Do not start it until Scenarios A–E are stable. It may be cut entirely without harming the MVP.

Principle: **"only what the ambulance driver needs."** A thin operational view, not a compressed dashboard.

Allowed: current routing status · destination hospital · small availability summary (ICU, ventilators, relevant blood, ER load) · distance/ETA already produced by Rahi · freshness · hospital contact (`tel:`) · simple accepted/rejected/rerouting status.

Not allowed: inventory editing · accepting or rejecting requests · admin analytics · audit management · scoring breakdowns · matching configuration · internal hospital notes · debug output.

Driver-facing wording is plain: `Searching for hospital → Request sent → Awaiting confirmation → Hospital accepted`, or `Hospital rejected → Rahi is finding the next suitable hospital → New request sent`. Internal state names never appear here.

It consumes the same Firestore subscriptions. It is never a second source of truth.

## H.5 Family Visibility (stretch, `/track/:caseId`)

Deliberately the plainest surface in the product — light ground, one line of status, no jargon, no component reused from the other three surfaces:

> Patient R-1042 is being taken to CityCare General Hospital. The hospital has confirmed it can receive this patient. Estimated arrival: 9 minutes.

No scores, no capability tables, no map chrome, no patient identifying data beyond the case ID.

---

# PART I — SIGNATURE EXPERIENCES (where the design budget goes)

## I.1 The reroute fracture — the differentiator beat

This is the animation that proves the thesis: a number on a screen creates no obligation, but a timed commitment does, and when it fails the system heals itself.

Sequence, driven entirely by Firestore state changes:

1. `pending` — dotted circuit travelling toward Hospital A. Countdown bar draining on the phone, ring draining on the projected console.
2. Hospital A rejects, or the countdown reaches zero and the backend writes `timed_out`.
3. The line **fractures mid-span** (120ms). Fragments drift apart and fade (200ms). Hospital A's card desaturates and sinks.
4. Simultaneously, the ranked-candidates rail promotes rank 2 into the primary slot (300ms, motion carries the card upward — the audience sees *where the next hospital came from*).
5. The same signal re-travels to Hospital C (600ms) and a new `pending` circuit begins with `attempt_number: 2`.
6. On-screen narration line updates: *"Hospital A did not respond — automatically rerouted to Hospital C."*

Total: under 1.3s. No human action anywhere in that sequence. Rehearse both the explicit-reject and the let-it-expire variants; the pitch script uses both.

Reduced-motion fallback: the card swaps instantly and the narration line plus a `StatusBadge` change carry the full meaning.

## I.2 Mass-casualty distribution — the flagship

**Intake:** from the ambulance home screen, "Mass-casualty incident" opens a board where 4 patients are added as compact cards (category + severity + age, tap-only, ~6 seconds each). All share one `incident_group_id`. A "Distribute all" action calls `massMatch`.

**The distribution visualisation (`DistributionBoard`):**

1. **Converge** — the four patient markers move toward a shared decision point at the centre. (400ms)
2. **Hold** — a brief beat at the decision point while the backend response is awaited. If the response is already in, hold ~250ms anyway; this pause is what makes the split legible.
3. **Split** — the four markers travel outward to their assigned hospital nodes, each trailing a one-line reason: *"O-neg surplus" · "trauma team free" · "6 min, cardiologist on shift" · "paediatric emergency capacity."* Stagger by 120ms so the audience can follow all four. (700ms)
4. **Resolve** — each assignment becomes its own `pending` circuit with its own countdown; the hospital consoles light up in parallel.

**Before/after comparison (build if time allows — it is the highest-value optional item in the entire product):** a split view. Left: what naive nearest-hospital routing would do — all four markers converging on one hospital, that hospital's node visibly overloading (ER load saturating, ICU count hitting zero, two patients left unplaceable). Right: Rahi's actual distribution across three hospitals. This single visual proves the value proposition with no narration.

The left side must be labelled honestly as a **simulated comparison** ("nearest-hospital routing, for comparison") — do not present it as measured data.

Focus behaviour during mass-casualty: focus follows the *active unresolved decision*. As each patient's assignment resolves, focus hands off to the next unresolved patient, so the audience tracks four simultaneous decisions instead of being flooded by them. The frontend never assigns a patient to a hospital — it only renders the distribution the backend returned.

## I.3 Stale-data decay — the engineering-maturity beat

One seeded hospital has a deliberately old `last_updated_at`. On both the ranked list and the map, its node must *visibly* carry lower confidence:

- Outline decays solid → dashed → dotted, opacity 100% → 70% → 45%, with progressive desaturation.
- `FreshnessBadge` reads "Updated 47 min ago" and the plain sentence "Status unknown — de-prioritised in ranking."
- `ScoreBreakdown` shows `freshness 0.70` in the arithmetic, so the audience sees the de-weighting rather than being told about it.

This is graceful degradation, not an error state: the hospital is still listed, still eligible if it satisfies hard requirements, just trusted less. Do not render it in `--critical` red.

## I.4 Audit reveal — the closing beat

Opening audit for the demoed case unspools the timeline downward from the resolved case (staggered 40ms rows). Each row is a real event with a real timestamp. Expanding one shows the data snapshot at decision time. The message to judges: *every routing decision here is reconstructable after the fact.* Keep it forensic and plain — no charts, no gauges, no celebratory styling.

## I.5 Accept lock — the micro-interaction everything hinges on

Fill sweep (180ms) → lock caps (90ms) → card settle → reliability tick. On the hospital console it must feel like a switch being thrown. Test it on the actual projector: at distance, the difference between "pending" and "accepted" must be readable in under half a second by someone who has never seen the product.

---

# PART J — QUALITY FLOOR

## J.1 Accessibility

- Keyboard reachable: every action, with a visible focus ring (2px, `--signal`, 2px offset). The hospital console must be operable with `Tab` + `Enter` alone in case the trackpad misbehaves on stage.
- Colour is never the only carrier: every status has a text label and a distinct shape.
- Contrast ≥ 4.5:1 for text, ≥ 3:1 for meaningful graphics. Verify the projected console specifically — projectors crush contrast.
- `aria-live="assertive"` on the incoming request region (hospital) and `aria-live="polite"` on the routing status line (ambulance), so state changes are announced.
- Countdown announces at 30s, 10s and 0 only — not every second.
- `prefers-reduced-motion: reduce` → all signature animations become instant state changes with their text equivalents intact. Nothing informational is lost.
- Touch targets ≥ 44px anywhere, ≥ 72px for Accept/Reject.

## J.2 Performance

- 60fps target. Animate `transform` and `opacity` only. No animated `width`, `height`, `top`, `box-shadow` or `filter` on any per-frame path.
- SVG circuit lines use `stroke-dashoffset`; keep node counts small (≤10 hospitals).
- Leaflet: no re-creating markers each render; memoise the hospital layer and update via refs.
- No listener leaks. Verify with a mounted/unmounted count in dev.
- Route-level code splitting so the phone loads `/ambulance` fast on venue Wi-Fi.
- Preload the alert sound and the two fonts; `font-display: swap`.

## J.3 Device matrix (design natively per device, not one stretched layout)

| Device | Surface | Must hold |
|---|---|---|
| Phone 390×844 portrait | Ambulance | single-hand reach, thumb-zone primaries, no horizontal scroll, no keyboard on the demo path |
| Laptop 1366×768 projected | Hospital | countdown and Accept/Reject legible from 3m; nothing important below the fold |
| Laptop/tablet 1280–1920 | Admin | map dominant; audit drawer doesn't cover the map when open |
| Any phone | Track / Ambulance View | loads on a cold cache in under 3s |

Test on the real devices you will demo with. A resized browser tab is not a test.

## J.4 Connectivity and failure UX

Every operation carries `idle · loading · success · error`. Every subscription carries `connecting · live · reconnecting · error`.

**If the network drops, the UI must say so rather than showing old data as if it were current.** `ConnectionBanner` appears within 2s of a dropped listener, and any live figure older than the drop is visually de-emphasised until the listener recovers.

Failure copy (use verbatim):
- Match failure → "Unable to calculate a match. Retry."
- Request send failure → "Request could not be sent. Retry."
- Accept conflict → "This case was already accepted or the required capacity is no longer available."
- Connection → "Connection interrupted. Reconnecting…"
- AI explanation failure → no message at all; silently use the deterministic reason string.

## J.5 Honesty requirements (these are Q&A survival, not decoration)

Keep these strings in the UI. Judges will ask about exactly these boundaries:

- Every match result: **"Recommended — human confirmation required."**
- Severity control: **"Prototype urgency — not a clinical triage category."**
- AI-written explanations: a small **"Plain-language summary"** marker where AI phrasing is used, with the deterministic reason always available. AI never selects a hospital, never changes a score, never declares a diagnosis.
- The naive-routing comparison panel: **"Simulated comparison."**
- Demo data: the landing page states that hospitals are seeded demo records.

---

# PART K — COPY DECK

Plain verbs, sentence case, active voice, no filler, no emoji. Same action keeps the same name through the whole flow.

| Context | String |
|---|---|
| Ambulance home, empty | "No active case. Start a new case to begin routing." |
| Category screen | "What kind of emergency is this?" |
| Need profile | "This case needs:" / "Generated from a deterministic rules table — no model, no guesswork." |
| Match CTA | "Find best hospital" |
| Matching | "Checking which hospitals can actually receive this patient." |
| Pending | "Request sent to {hospital}. Awaiting their confirmation." |
| Ranked rail | "Next in line if this hospital doesn't respond." |
| Accepted | "{hospital} has committed to receive this patient." + reason string |
| Rerouting | "{hospital} did not respond — automatically rerouted to {next}." |
| Rejected | "{hospital} declined: {reason}. Rerouting now." |
| Exhausted | "No remaining hospital meets this case's requirements." |
| Superseded | "Destination changed — {hospital} can no longer receive this patient." |
| Hospital idle | "No incoming requests." |
| Hospital alarm | "Incoming patient — respond within {seconds}s" |
| Accept button | "Accept patient" |
| Reject button | "Cannot accept" |
| Post-accept | "Committed. Prepare: {capability list}" |
| Hospital expired | "No response — rerouted by Rahi." |
| Capability form | "Update status" → on success "Status updated" |
| Stale hospital | "Status unknown — de-prioritised in ranking." |
| Admin empty audit | "No events recorded yet." |
| Family page | "Patient {caseId} is being taken to {hospital}. The hospital has confirmed it can receive this patient. Estimated arrival: {eta}." |

---

# PART L — BUILD ORDER

Work on the `frontend` branch. **One meaningful, descriptive commit per numbered step** — this satisfies the 1–2 hour commit rule and the "no last-minute dump" rule, and it gives you a git history that survives inspection. Never commit `.env`.

Each step must produce something inspectable before you move on.

1. **Scaffold.** Vite + React + TS + Tailwind, router with all six routes rendering placeholder pages, `tokens.css`, both fonts, `.env.example`. → commit `chore(frontend): scaffold app shell and routes`
2. **Domain types.** `types/domain.ts` mirroring the backend shared types exactly. Compare field-by-field with the backend owner before proceeding; a mismatch found now costs minutes, found at hour 12 it costs the demo. → commit
3. **Services.** `firebase.ts`, `firestore.ts` subscriptions, `api.ts` commands with the envelope and the `error.code` switch. Connection-state tracking. → commit
4. **Feedback + primitives.** Loading/Empty/Error/ConnectionBanner, Button, Card, Field, Toggle, Sheet, Toast. → commit
5. **Domain components.** `StatusBadge`, `FreshnessBadge`, `Countdown`, `CommitmentCircuit`, `ScoreBreakdown`, `NeedProfileChips`, `MatchCard`, `RequestCard`, `HospitalCapabilityPanel`, `ReliabilityMeter` — all demoable on `/dev/components` with every state from F.10. → commit per cluster
6. **Scenario A, ambulance half.** Intake → need profile → match → pending, wired to real backend state. → commit
7. **Scenario A, hospital half.** Console, queue subscription, alarm, Accept. Verify on two physical devices that Accept on device 2 resolves device 1's countdown live. **Do not proceed until this is stable.** → commit
8. **Scenario B.** Reject UX with reason, timeout handling, the fracture animation, candidate promotion, attempt indicator. → commit
9. **Scenario C.** Mass-casualty intake board, `massMatch` wiring, `DistributionBoard` convergence/split. Budget the most remaining time here. Add the before/after comparison only once the base distribution is solid. → commit
10. **Scenario D.** Freshness badges, stale decay on list and map, freshness inside the score breakdown. → commit
11. **Scenario E.** Admin dashboard: Leaflet map with capability radiance, activity rail, hospital table, reliability meters, audit timeline + snapshot drawer. → commit
12. **Mid-transit reroute** on the ambulance surface (superseded banner, dissolve-and-redraw). → commit
13. **Polish + safety.** Reduced-motion fallbacks, keyboard paths, contrast check on the projector, connection banner, error copy, sound-unlock control. → commit
14. **Stretch, in this order if time remains:** prep checklist → Rahi Ambulance View mobile polish → family visibility page → before/after comparison (if not already built).
15. **Deploy** to Firebase Hosting/Vercel, verify the live URL on all three demo devices over the venue network, and record the fallback plan (hotspot). → commit
16. **Docs.** README sections you own: frontend routes, API usage, run instructions, AI-assistance disclosure. → commit

**Merge rule:** `main` must always be runnable. Merge the vertical slice at step 7, then after 9 and after 11. Do not hold a 14-hour branch.

---

# PART M — DEMO ALIGNMENT

Build so that no scenario is UI-incomplete on demo day. Three devices, one Firestore backend, hotspot standing by.

| Time | Beat | UI must support |
|---|---|---|
| 0:00–0:30 | Hook: Delhi's bed-count portal didn't stop people dying — a number creates no obligation | Landing / admin map idle |
| 0:30–1:15 | **Scenario A** — clean single match | Intake, need-profile preview, ranked result, live countdown across two devices, commitment lock |
| 1:15–2:00 | **Scenario B** — reject/timeout → auto-reroute | Fracture, candidate promotion, re-travel, narration line, no human restart |
| 2:00–3:00 | **Scenario C** — mass-casualty distribution | Four-patient intake, convergence/split, four parallel countdowns, ideally before/after |
| 3:00–3:30 | **Scenario D** — stale-data fallback | Decayed node, "status unknown — de-prioritised", 0.70 visible in the breakdown |
| 3:30–4:00 | **Scenario E** — audit + reliability reveal | Timeline unspool, snapshot drawer, reliability ticks |
| 4:00–4:45 | "What we deliberately did not build, and why" | Nothing on screen — but nothing half-built either (A.5) |
| 4:45–5:00 | Impact close | Optionally the family visibility page |

**Rehearsal checklist:** run all five scenarios end-to-end on the real devices, on the venue network if possible; rehearse both reject *and* expire variants of Scenario B; verify the alert sound plays after a page reload; verify the app recovers from a deliberate Wi-Fi drop mid-countdown; verify demo seed data resets cleanly between runs.

---

# PART N — DEFINITION OF DONE

## N.1 Functional

- [ ] All six routes load and are reachable from the landing page
- [ ] Case creation works tap-only, end to end, with no keyboard on the demo path
- [ ] Need profile is displayed exactly as returned, never modified client-side
- [ ] Match result shows hospital, score, capability %, distance, ETA, load, freshness, reasoning
- [ ] Every match result carries "Recommended — human confirmation required"
- [ ] Countdown derives from `expires_at` with a server offset; the frontend never declares a timeout
- [ ] Accept on device 2 resolves device 1's pending state live, with no refresh
- [ ] No optimistic Accepted / Reserved / Rerouted anywhere
- [ ] Reject and timeout both produce a visible automatic reroute with no human restart
- [ ] Mass-casualty distributes 4 cases across multiple hospitals and renders the distribution the backend returned
- [ ] Stale hospital visibly decays and shows its de-weighting in the score breakdown
- [ ] Admin map, reliability and audit timeline update live without refresh
- [ ] Every error path branches on `error.code`; no raw errors ever reach the user
- [ ] Connection drop shows "Reconnecting…" instead of presenting stale data as current

## N.2 Design

- [ ] "Shown available" vs "committed" is unmistakable on every surface (F.1)
- [ ] `--critical` red appears only on timed_out, rejected and exhausted
- [ ] `--commit` green appears only on a committed acceptance
- [ ] Mono/sans split follows the machine-measured vs human-read rule consistently
- [ ] Every component has all states from F.10 implemented, not just the happy path
- [ ] Each of the four surfaces has its own posture — no shared template
- [ ] Every animation maps to a row in F.7; anything else was cut
- [ ] The fracture and the distribution split are recognisably *this product's* signatures

## N.3 Quality

- [ ] `prefers-reduced-motion` verified on every signature animation
- [ ] Keyboard-only path through the hospital console verified
- [ ] Contrast verified on the actual projector
- [ ] 60fps on the demo devices; no layout-thrashing animations
- [ ] No listener leaks on route change
- [ ] Tested on the real phone, real laptop, real projector, real network

## N.4 Compliance

- [ ] No secrets, keys or credentials committed; `.env.example` present
- [ ] Meaningful descriptive commits spread across the build window
- [ ] `main` runnable at every merge
- [ ] README covers routes, API usage, setup and run
- [ ] External libraries and OSM tiles credited
- [ ] AI assistance disclosed in the PPT
- [ ] Deployed link live and reachable during evaluation
- [ ] You can explain, line by line, the countdown, the subscription layer and the circuit component — because you will be asked

## N.5 Final anti-generic pass

Before calling anything finished, check: does any screen look like a template someone could swap another healthtech demo into? If a screenshot of your Accept moment could belong to any other project, the design law in Part F has not been applied. The commitment circuit locking, fracturing and re-travelling is the thing that must be unmistakably Rahi.

---

**End of prompt.** Part A is ground truth for context and constraints. Parts C–E are the contract you render against and must never violate. Parts F–I are the design law. Parts L–N are how you get it built, demoed and defended.
