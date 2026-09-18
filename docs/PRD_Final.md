# PRD — Capability-Match Ambulance–Hospital Coordination System

### CodeCraft Hackathon, Technofora '26 (ISA Students' Chapter, Nirma University)

**Track:** HealthTech — Accessible Care & Intelligent Patient Support
**Team size:** 3–5 members | **Build window:** ~18 hours | **Prize pool:** ₹15,000 + prizes
**Status:** 🔒 LOCKED SCOPE — final version, ready for build. This document supersedes `Project_Plan.md` and `Project_Plan_Old.md` entirely. It is the single source of truth for the build, the pitch, and the README. Nothing outside this file should be assumed.

**Judging weights (from official rulebook):**

| Criterion | Weight |
|---|---|
| Innovation & Originality — new angle, uniqueness | 25% |
| Technical Implementation — code complexity, live demo functionality, tech stack use | 30% |
| Impact & Viability — real-world problem, clear use case | 20% |
| Design & UX — intuitive, accessible, visually appealing | 15% |
| Live Pitch & Q&A — clarity of demo video, defending tech choices, git hygiene | 10% |

**Reading this table correctly:** technical implementation alone (30%) outweighs originality (25%), and outweighs impact (20%). A smaller feature set that works flawlessly live will beat a larger one that's 70% working. Every scoping decision in this document is made with that ordering in mind.

---

## Table of Contents

1. [Event & Compliance Context](#1-event--compliance-context)
2. [Scope Decision](#2-scope-decision)
3. [The Core Problem](#3-the-core-problem)
4. [Full Problem Inventory (15 Sub-Problems)](#4-full-problem-inventory-15-sub-problems)
5. [Research Grounding](#5-research-grounding)
6. [Competitive Landscape](#6-competitive-landscape)
7. [Our Core Idea](#7-our-core-idea)
8. [MVP / Stretch / Roadmap Triage](#8-mvp--stretch--roadmap-triage)
9. [Feature List](#9-feature-list)
10. [Data Model](#10-data-model)
11. [Core Workflow / State Machine](#11-core-workflow--state-machine)
12. [Tech Stack (Locked)](#12-tech-stack-locked)
13. [Demo Scenarios (Scripted)](#13-demo-scenarios-scripted)
14. [Live Demo Plan — "Phone as Ambulance"](#14-live-demo-plan--phone-as-ambulance)
15. [Minute-by-Minute Pitch Script](#15-minute-by-minute-pitch-script)
16. [Team Roles & Hour-by-Hour Build Timeline](#16-team-roles--hour-by-hour-build-timeline)
17. [Hackathon Submission Compliance Checklist](#17-hackathon-submission-compliance-checklist)
18. [Risks & Mitigations](#18-risks--mitigations)
19. [Adjacent Ideas Considered (Reference Only)](#19-adjacent-ideas-considered-reference-only)
20. [Open Decisions for the Team](#20-open-decisions-for-the-team)
21. [Appendix — Decision Trail](#21-appendix--decision-trail)

---

## 1. Event & Compliance Context

**Event:** Technofora '26 Hackathon (CodeCraft), hosted by the International Society of Automation (ISA) Students' Chapter, Nirma University — a national-level innovation challenge across AgriTech, HealthTech, GreenTech, PropTech, FinTech, and SmartCityTech.

**Track chosen:** HealthTech — Accessible Care & Intelligent Patient Support.

**Mandatory project requirement (from rulebook):** every submission must include a working, user-accessible front end — pure back-end scripts, terminal-only tools, or headless repos do not qualify on their own. Our project is inherently multi-interface (ambulance app + hospital app + admin dashboard), which satisfies this comfortably and gives more visual surface area on stage than a single-screen app would.

**Technical rules that govern the entire build (from the Technical Rules Briefing), summarized:**
- One public GitHub repo; organizers added as collaborators.
- Every commit meaningful; every member ≥2 genuine commits; roughly one commit every 1–2 hours; no last-minute single-commit dump — judges inspect git history directly.
- Feature branches for major work, merged into a stable `main`.
- `README.md` must cover: problem statement, proposed solution, features, tech stack, system architecture, APIs, database, setup instructions, how to run.
- A functional prototype/MVP is required — a mockup or slides alone do not qualify; core features shown in the presentation must be demonstrable live.
- Reproducible on another machine: install commands, dependencies, environment setup, run/build commands.
- All external APIs, libraries, datasets, and frameworks disclosed in documentation; teams responsible for complying with their licenses/terms.
- No secrets in source or GitHub — API keys, passwords, credentials, tokens strictly prohibited in the repo; use `.env` + `.env.example`.
- Significant AI-generated code/content must be disclosed in the presentation; AI output must never be presented as entirely original work; every member must be able to explain the code they personally submit.
- No plagiarism; original vs. third-party components must be clearly identified.
- Repository is frozen at the submission deadline; post-deadline changes are not considered unless explicitly permitted.
- Final submission bundle: GitHub repo link, README.md, presentation/PPT, demo/deployment link where applicable, documentation, demo credentials if login is required.
- Final demo video submitted via the provided Google Drive link, **strictly ≤ 5 minutes**, must clearly demonstrate the final working project and its core functionality.
- Judges may inspect commit history, documentation, the deployed app, source code, and individual contributions; each member may be asked to explain and demonstrate their specific portion — an unexplainable claimed contribution may not be counted.
- Path to winning: submission deadline → judges shortlist Top 6 → face-to-face live demo + technical Q&A → judges select Top 3 winners.

**Why this shapes our team split:** because any member can individually be asked to explain and demo *their own* contributed portion, Section 16 deliberately assigns one clearly separable, explainable module per person — never a blurry "frontend person" / "backend person" split.

---

## 2. Scope Decision

We are building **Ambulance ↔ Hospital coordination and resource management only.** The earlier "which PHC should a patient self-triage to" recommendation angle was considered and explicitly descoped early in planning — it should not resurface mid-build under time pressure.

**Locked build scope: the full system.** Every item below is treated as MVP, not stretch, for this build:
- Capability-matching engine (not a raw bed count)
- Accept / Reject / Timeout → automatic reroute protocol
- Concurrency-safe holds (no two requesters can double-book the same resource)
- Full audit log (forensic trail of every decision)
- Mass-casualty batch distribution mode
- Stale-data fallback (graceful degradation when a hospital hasn't reported recently)
- Explicit human-confirmation framing in the UI (liability boundary)
- Public accountability / reliability dashboard

**True roadmap items** (not built — stated explicitly in the pitch, PPT, and README as deliberate future work, never silently dropped): adversarial gaming detection, full reservation-abuse protection beyond a basic rate-limit gesture, scheme/eligibility verification beyond a single boolean flag, offline/low-connectivity sync for ambulances, internal hospital resource reallocation before arrival, and a family-visibility link.

---

## 3. The Core Problem

> **The central failure: urgency assessment and real facility capability never get evaluated as a single, joined question at the moment a routing decision has to be made.**

### 3.1 Two symmetric failure modes

**Demand side** — a person or ambulance deciding what to do: acting correctly requires knowing *both* how serious the situation is *and* which nearby facility can actually receive and treat it right now. That second piece — real, current facility capability — is invisible at decision time. The result is that people either default to "go to the biggest hospital just in case" (overloading it), or go somewhere that turns out unable to help.

**Supply side** — a patient already being moved through the system: urgency has already been roughly assessed, but there is no live, trustworthy read of which facility can take *this specific case* right now. Not "is there a bed" — is there a working trauma team, blood stock, a specialist on shift, a free ventilator, lined up with what this patient needs at this exact moment. Ambulances end up routing on stale assumptions ("that hospital usually has capacity"), not current fact.

**Why "hospitals should just publish bed counts" doesn't fix this:** a generic bed number doesn't tell you whether the *specific* capability a case needs is available. The system must compute "how urgent + what's needed" and "what's actually available and appropriate" as **one joined query** — not two sequential, disconnected lookups. That sequencing gap is precisely where time, patients, and capacity get wasted today.

### 3.2 Who bears the cost

- **Patients/families** — either overwhelm the "obvious" big hospital, or arrive somewhere that can't actually help.
- **Paramedics** — lose the golden hour driving toward a facility that turns out to be unable to receive the patient.
- **Hospitals/PHCs** — get flooded with cases they can't handle, while genuinely available capacity elsewhere sits idle and invisible.
- **The system as a whole** — has no shared, current picture of what the network needs right now versus what it can actually deliver right now; only fragments, held by different people, none of whom can see each other's fragment at decision time.

---

## 4. Full Problem Inventory (15 Sub-Problems)

Once the core gap in Section 3 is actually designed around, it fractures into fifteen distinct sub-problems, organized by *where in the system* each failure happens (not yet by what we build — that triage is Section 8):

1. **Core Coordination Gap** — urgency and real-time capability are assessed separately and never joined at the moment of a routing decision, whether ambulance→hospital, hospital→hospital transfer, or a blood/specialist request.
2. **Trust Problem** — capacity data is self-reported, and self-reporting fails exactly during a crisis (no time to update a dashboard) or when a facility has an incentive to misreport.
3. **Concurrency Problem** — the same "available" resource can be shown to multiple simultaneous requesters; nothing treats capacity as live, contested inventory that must be held/reserved, the way flights or tickets are.
4. **Adversarial Problem** — bad actors have real incentives to game the system: false "full" reports, or gaming a reliability mechanism once one exists.
5. **Reservation-Abuse Problem** — once holds/reservations exist, someone could spam fake requests to lock up capacity network-wide — a life-critical denial-of-service risk.
6. **Accountability Problem** — no durable record of what data existed, what was decided, and why, when a routing decision goes wrong.
7. **Trust-Collapse Problem** — during a true mass-casualty event, reliability signals can degrade network-wide simultaneously; the system needs defined behavior for when its own inputs become uniformly unreliable.
8. **Batch/Surge Problem** — single-case matching breaks down in mass-casualty events; independent, locally-optimal choices by each ambulance collide on the same "best" hospital.
9. **Family/Patient Visibility Problem** — families have no visibility into where a diverted or transferred patient ended up.
10. **Eligibility/Access Problem** — a facility can be physically capable but practically inaccessible (scheme empanelment, e.g. Ayushman Bharat; payment ability) — invisible to a capacity dashboard.
11. **Connectivity Problem** — field systems, especially rural ambulances, can't assume reliable connectivity to query a live engine.
12. **Handoff Information-Loss Problem** — critical context (vitals trend, onset time, what was administered) is typically lost in a rushed verbal handoff.
13. **Internal Reallocation Problem** — hospitals only react once a patient physically arrives; there's no mechanism to proactively reallocate staff/ORs based on predictable incoming load.
14. **Systemic Blind-Spot / Governance Problem** — no one has an aggregate view of chronically overloaded or misreporting facilities; every failure is a one-off, not a tracked pattern.
15. **Liability/Human-Override Problem** — no explicit boundary between "this is a system suggestion" and "a human confirmed this," in a life-or-death context.

We cannot build all 15 in 18 hours — attempting to would guarantee nothing works fully, which is the single biggest risk given that technical implementation/live demo is worth 30% of the score. Section 8 is an honest, explicit triage across all 15. **This triage table is itself a pitch asset** — showing judges we identified 15 real sub-problems and made a deliberate, reasoned scoping call is a stronger signal of technical maturity than silently ignoring the ones we skipped.

---

## 5. Research Grounding

*(Why this angle — not a generic bed-count dashboard — and why it's correct.)*

- India has an estimated 70,000+ hospitals with no unified real-time bed-tracking system; roughly **30% of trauma deaths in India are linked to delayed ambulance services, inadequate bed management, and poor inter-hospital transfer protocols.**
- India's public hospital bed density is roughly 0.6 beds per 1,000 population, with public health spending around 1.84% of GDP — meaning the realistic fix is about *coordination and utilization*, not just adding physical beds, which is slow and expensive.
- **Karnataka's 108 ambulance service was specifically given access to hospital bed-availability data during COVID (2020)** precisely because private ambulances had no visibility into which hospitals had oxygen/COVID beds — direct evidence this exact coordination gap is recognized at the government level, not just a hackathon hypothesis.
- **Critical counter-finding — passive dashboards demonstrably fail, with documented deaths.** Delhi ran a government bed-availability portal during COVID, updated roughly twice daily, showing live bed counts:
  - A Delhi University student's grandfather was **refused admission at six government hospitals in a row**, despite the app showing beds available at all of them; he died before a court hearing.
  - **Lakhjeet Singh's family saw 1,100 "available" beds listed for LNJP hospital** on the app; on arrival, staff said there were none. He died on arrival.
  - **Neelam, eight months pregnant, was refused by 8 hospitals over 12 hours and died in the ambulance** — a widely cited case in Indian healthcare policy discussion.
  - The Health Ministry's own review concluded that beds **"were not located as per the hospitals' requirement at a given point in time"** — a bed showing "free" on a dashboard does not mean staff, oxygen, or a doctor are actually available to use it right now.
  - Separately, Gujarat High Court reviewed an earlier centralized bed-controller attempt, and the Chief Justice called it "such a big failure," for the same underlying reason.

**The single finding that shapes the entire design:** the failure mode isn't a lack of data — Delhi had real-time-ish data. The failure mode is that **a displayed number creates no obligation.** A hospital can show "available" and still turn someone away, and nothing in the system catches or corrects that in the moment it matters.

---

## 6. Competitive Landscape

We specifically checked whether "ambulance routing + live hospital bed dashboard" has already been built as a hackathon project — this is an intuitive idea many teams reach for independently. It has, repeatedly:

- **MEDISIGHT** (Nagpur hackathon) — live bed tracking on a city map, green/yellow/red hospital status, "smart ambulance routing," surge alerts.
- **MediCure** — OPD queues, bed availability, admin dashboards for bed occupancy, framed around "poor emergency coordination... no centralized system for hospital transfers or load balancing."
- **Medicate** — unified bed/OPD booking, inter-hospital transfers, "real-time bed management system," unified doctor dashboard.

**The pattern across all three:** every one is a **passive, read-only information display** — a hospital's status is a number or color anyone can look at, and nothing requires the hospital to actually commit to it. This is architecturally identical to Delhi's COVID bed app, which failed with documented deaths (Section 5). If we build this version, a well-informed judge can reasonably ask "hasn't this exact approach already failed at national scale?" — and we would have no good answer.

**This is the single most important strategic decision in this document:** we are not building a bed-count dashboard. We are building an **active commitment/handshake protocol.**

---

## 7. Our Core Idea

> A capability-matching engine for ambulance-to-hospital routing that replaces passive "available" displays with an **active accept/reject commitment protocol** — so a hospital's status is never just a number someone can act on unilaterally, it's a live, held, accountable reservation.

### 7.1 How the design directly answers the research findings

| Real-world failure | How our design specifically prevents it |
|---|---|
| Bed shown "available," patient still refused on arrival (LNJP) | Hospital must actively **Accept** a specific request within a countdown before it counts as a valid match — no unilateral action on a passive number. |
| 8 hospitals, 12 hours, sequential manual retries (Neelam) | On reject/timeout, the system **automatically re-sends** to the next best-matched hospital — no manual restart from zero. |
| "Beds not located as per requirement" (bed count ≠ usable capacity) | Matching runs against a **capability profile** (trauma team, specialist on-call, blood stock, ventilators, ER load) — not a bed number — computed jointly against the case's actual need. |
| No accountability trail when something goes wrong (#6) | Every request, response, and reasoning is logged with a timestamp — a durable, inspectable audit trail. |
| Same resource shown to multiple simultaneous requesters (#3) | Accepting a request **holds/decrements** that resource immediately; concurrency-safe. |
| Mass-casualty convergence on one "best" hospital (#8) | Batch mode distributes N patients across hospitals by best-fit, not independent convergence. |
| Confidently trusting stale data (#7) | Hospitals with no recent update are flagged "unknown" and de-weighted toward distance-only ranking. |
| No liability boundary (#15) | Every recommendation is UI-labeled "Recommended — human must confirm"; a human always makes the final action. |
| Reservation spam / DoS (#5) | Basic rate-limit: cap pending requests per requester ID. |
| Systemic blind spots (#14) | Aggregate reliability/response-time dashboard, reusing audit-log data. |

### 7.2 Why this is genuinely defensible in Q&A

Every competing project we found reduces to one sentence: "shows hospital status on a map." Ours cannot be reduced to that sentence — describing it requires describing the **commitment protocol**, which is exactly the part that prevents the documented real-world failure. This gives a specific, well-researched answer to "how is this different from X" — points under both Innovation (25%) and the tech-defense portion of Pitch & Q&A (10%).

---

## 8. MVP / Stretch / Roadmap Triage

Honest, explicit triage against all 15 sub-problems from Section 4, given the 18-hour build window and the **locked full-scope decision** from Section 2 (everything below marked MVP is being built, not treated as optional):

| # | Problem | Decision | Why |
|---|---|---|---|
| 1 | Core coordination gap | **MVP — the entire reason the project exists** | Foundational. |
| 2 | Trust (self-reporting fails under pressure) | **MVP, solved structurally** | The accept/reject handshake itself is the fix — falls out of the core design, no separate feature needed. |
| 3 | Concurrency | **MVP** | Accepting a request decrements/holds that capability slot immediately; demoable by two near-simultaneous requests. |
| 4 | Adversarial gaming | **Roadmap, stated explicitly** | Needs anomaly detection and cross-referencing against real admission records — out of scope for 18 hours. |
| 5 | Reservation-abuse / DoS | **Basic gesture in MVP + Roadmap for the rest** | Simple rate-limit (max N pending requests per requester ID) built; full protection is roadmap. |
| 6 | Accountability / audit trail | **MVP** | A log table (request, response, reasoning, timestamps) — cheap to build, high pitch value. |
| 7 | Total trust collapse (mass event) | **MVP** | Stale-data fallback: no update within a defined window → "unknown," de-weighted toward distance-only. |
| 8 | Batch/surge — mass-casualty distribution | **MVP — flagship demo feature** | The single best live "wow" moment; direct visual differentiator. |
| 9 | Family/patient visibility | **Roadmap (was previously stretch)** | Descoped from this build's MVP to protect the core protocol's build time; stated as future work. |
| 10 | Eligibility/access | **Minor MVP gesture + Roadmap for the rest** | One boolean field (`accepts_scheme_patients`) in the data model; full verification is roadmap. |
| 11 | Connectivity resilience | **Roadmap — design-aware, not built** | State explicitly in README/pitch as an architecture consideration (e.g., local queue + retry-on-reconnect). |
| 12 | Handoff information loss | **MVP, solved as a side effect** | The structured request payload already needed for matching *is* the structured handoff — just don't discard it; display it on the hospital's acceptance screen. |
| 13 | Internal reallocation | **Roadmap** | Descoped from this build's MVP; stated as future work in README/pitch. |
| 14 | Systemic blind spot / governance | **MVP** | Admin/oversight dashboard — reuses data already logged for #6; high pitch value, low marginal effort. |
| 15 | Liability / human-override boundary | **MVP, mostly a UI/copy decision** | Every recommendation explicitly labeled "Recommended — human must confirm"; costs almost nothing to implement, closes an important ethical gap. |

**Net MVP, in plain terms:** capability-matching engine + accept/reject/timeout/auto-reroute protocol + concurrency-safe holds + full audit log + mass-casualty batch mode + stale-data fallback + explicit human-confirmation framing + public accountability dashboard.

**True roadmap (explicitly named in pitch/README, never silently dropped):** adversarial gaming detection, full reservation-abuse protection beyond the rate-limit gesture, scheme/eligibility verification beyond the boolean flag, offline/connectivity sync, internal resource reallocation, family visibility link.

---

## 9. Feature List

### 9.1 Ambulance / Dispatcher App (the "phone as ambulance" interface)
- Structured case-intake: tap-based category selection, not free text, for demo speed and reliability — e.g. "Chest pain + breathing difficulty," "Trauma — road accident," "Obstetric emergency," "Pediatric — high fever/seizure."
- Auto-generated **need profile** from the case category via a rules-table lookup (category → required capabilities, e.g. cardiac → cardiologist + ECG + ICU bed).
- Live geolocation (browser Geolocation API) for distance calculation.
- "Find Best Hospital" action → triggers the matching engine.
- Live status view of the outgoing request: Pending (with countdown) → Accepted / Rejected / Timed out → Auto-rerouted, with a visible reason shown at every step.
- Mass-casualty mode toggle: add multiple patients from one incident, get a distribution plan across hospitals instead of one hospital for everyone.
- Displays the structured handoff summary sent to the accepting hospital (solves handoff information-loss, Problem #12, as a side effect).

### 9.2 Hospital Reception App
- Seeded login for 6–10 hospitals (no real auth needed for the demo).
- Capability profile editor: trauma team on shift (Y/N), specialists on-call, ICU/ventilator slots free, blood stock by type, current ER load (1–5 self-reported score), accepts-scheme-patients (Y/N).
- Incoming request queue: need profile, severity, ETA, distance, large Accept/Reject buttons, visible countdown timer.
- On Accept: the relevant capability is held/decremented immediately (concurrency-safe); an auto-generated "incoming case" prep checklist appears.
- Visible reliability badge (e.g. "94% reliable") computed from accumulated accept/fail history.

### 9.3 Matching Engine (core logic, not a screen)
- Match score = capability-match % × distance factor × current-load factor.
- Ranks hospitals for a given case's need profile; sends the top-ranked hospital a request.
- On reject/timeout, automatically sends to the next-ranked hospital — repeats until accepted or the list is exhausted.
- Concurrency-safe holds: committing a slot decrements it from the pool immediately, so a second simultaneous request sees the updated number.
- Stale-data fallback: no update within a defined window → status "unknown," de-weighted toward distance-only ranking.
- Rate-limit gesture: caps pending requests per requester ID.

### 9.4 Admin / Oversight Dashboard (MVP — locked in scope, not stretch)
- Map view of all hospitals with live capability status.
- Aggregate reliability / response-time stats per hospital.
- Full audit-log view: every request, hospital, response, timestamp, and reasoning — the "forensic trail."

### 9.5 Explicitly out of scope (stated in README/pitch as roadmap, never silently dropped)
Adversarial-gaming detection · full reservation-abuse protection beyond the rate-limit gesture · scheme/eligibility verification beyond the boolean flag · offline/low-connectivity sync for ambulances · internal hospital resource reallocation before arrival · family visibility link.

---

## 10. Data Model

```
HOSPITAL
- id, name, lat, lng
- trauma_team_on_shift: bool
- specialists_on_call: [string]          // e.g. ["cardiologist","orthopedist"]
- icu_beds_free: int
- ventilators_free: int
- blood_stock: { "O-": int, "O+": int, "A+": int, ... }
- er_load_score: int (1-5, self-reported)
- accepts_scheme_patients: bool
- last_updated_at: timestamp             // drives the stale-data fallback
- reliability_score: float (computed)    // accepted-and-honored / total-accepted

CASE
- id, created_at
- category: enum ["cardiac","trauma","obstetric","pediatric", ...]
- severity: enum ["red","yellow","green"]
- need_profile: { specialists_needed: [], capability_flags: [], blood_type_needed: string|null }
- vitals_summary: string                 // structured handoff info (Problem #12)
- onset_time, treatment_administered: string
- patient_basic_info: { age, sex, name(optional) }
- incident_group_id: nullable            // links multiple patients from one mass-casualty event (Problem #8)

REQUEST
- id, case_id, hospital_id
- status: enum ["pending","accepted","rejected","timed_out","superseded"]
- sent_at, responded_at
- match_score_breakdown: { capability_match_pct, distance_km, load_factor }
- reason_shown_to_dispatcher: string     // "Accepted — cardiologist on shift, ICU free, 6 min away"

AUDIT_LOG
- id, request_id, event_type, timestamp, snapshot_of_data_at_decision_time  // Problem #6
```

---

## 11. Core Workflow / State Machine

```
CASE CREATED (ambulance app)
      │
      ▼
NEED PROFILE GENERATED (rules-table lookup)
      │
      ▼
MATCH ENGINE RANKS HOSPITALS (capability % × distance × load, stale data de-weighted)
      │
      ▼
REQUEST SENT to top-ranked hospital ──────► status: PENDING (countdown starts)
      │                                            │
      │                                 ┌──────────┼───────────┐
      │                                 ▼          ▼           ▼
      │                            ACCEPTED    REJECTED    TIMED OUT
      │                                 │          │           │
      │                                 ▼          └─────┬─────┘
      │                     Capability held/decremented  │
      │                     Incoming-case checklist shown│
      │                     Reliability score updated    ▼
      │                                          Auto re-send to
      │                                          next-ranked hospital
      │                                          (repeat until accepted
      │                                           or list exhausted)
      ▼
AUDIT LOG entry written at every transition (Problem #6)
```

**Mass-casualty variant:** multiple `CASE` records share an `incident_group_id`; the matching engine solves for the group jointly — distributing across distinct hospitals by best-fit — instead of every case independently converging on the single top-ranked hospital. This is Problem #8, the flagship demo feature.

---

## 12. Tech Stack (Locked)

**Realtime layer: Firebase (Firestore + `onSnapshot` listeners).**

Reasoning, specific to an 18-hour hackathon build:
- Zero server to stand up, deploy, or babysit during the live demo — no separate WebSocket process that can crash mid-pitch.
- Client SDKs (web + React Native) handle reconnection automatically over flaky venue Wi-Fi — the single biggest live-demo risk identified in planning.
- `onSnapshot` listeners give push-style realtime updates (ambulance sends a request → hospital screen updates instantly) with almost no boilerplate — exactly the phone-to-phone mechanic the demo depends on.
- Firestore's free tier comfortably covers a hackathon's read/write volume.
- Seeding demo data (6–10 hospitals) is a five-minute job directly in the Firebase console — no migration scripts needed.
- Concurrency-safe holds (Section 9.3) map cleanly onto Firestore transactions (`runTransaction`), the standard way to prevent two simultaneous requests from double-claiming the same capability slot.

**Trade-off to state honestly in the README:** Firestore is a managed NoSQL store, so the relational-style joins in the data model (Section 10) are handled in application code, not the database — an acceptable trade at this scale and time budget.

**Rest of the stack:**
- **Frontend:** React (web) for the Hospital Reception app and Admin Dashboard. A lightweight, responsive web app (not a full native build) for the Ambulance app — faster to build than native, and it only needs to run well in a phone browser for the "phone as ambulance" demo.
- **Backend logic** (matching engine, rules-table lookup, scoring): a thin Node.js layer, or Firebase Cloud Functions — keep this simple and explainable, since judges may ask about it directly (technical implementation is 30% of the score).
- **Maps/distance:** Google Maps or OpenRouteService API where a live map visual is wanted; otherwise a straightforward haversine-distance calculation on lat/lng to avoid API-key/quota risk during the live demo.
- **Hosting:** Firebase Hosting or Vercel, for a quick and reliable deployment ahead of the demo.
- **AI/LLM use (optional, disclose per rulebook):** may be used to turn the raw match-score breakdown into a plain-language reasoning string (e.g. "Accepted — cardiologist on shift, ICU free, 6 min away"), or to speed up documentation writing. Keep the actual ranking/matching logic transparent, deterministic code — not an LLM black box — since any member may be asked to explain exactly how a specific match was computed.

---

## 13. Demo Scenarios (Scripted)

Use these as literal scripts for both internal rehearsal and the live pitch — rehearse **all** of them, not just the happy path.

**Scenario A — Clean single-case match (baseline, ~30 sec).** Cardiac case entered on the ambulance phone → need profile auto-generates (cardiologist, ECG, ICU) → matching engine ranks hospitals → top hospital's reception screen lights up with the incoming request and countdown → hospital taps Accept → ambulance screen instantly shows "Accepted — Hospital B, cardiologist on shift, ICU free, 6 min away," reasoning visible.

**Scenario B — Reject/timeout → auto-reroute (~30–40 sec, the single most important beat).** The first-ranked hospital either explicitly rejects or lets the countdown expire (rehearse both) → system automatically re-sends to the next-ranked hospital with no manual restart → ambulance screen shows the transition live ("Hospital A did not respond — automatically rerouted to Hospital C"). This is the direct, visible answer to the Neelam/LNJP failure mode from Section 5.

**Scenario C — Mass casualty, batch distribution (flagship "wow" moment, ~45–60 sec).** Add 4 patients from one incident with varying severity/needs → toggle mass-casualty mode → all 4 are distributed across 3 different hospitals based on best-fit capability, instead of everyone converging on the single "best" hospital. Contrast visually against what naive nearest-hospital routing would have done — a simple before/after or two-column comparison works well here.

**Scenario D — Stale-data fallback (~20–30 sec, shows engineering maturity).** One seeded hospital is deliberately not updated recently (pre-set `last_updated_at` far in the past) → matching engine visibly flags it "status unknown, de-prioritized" instead of confidently trusting old data — graceful degradation rather than confidently-wrong output.

**Scenario E — Audit trail + reliability dashboard reveal (~15–20 sec, closes the pitch).** Pull up the admin dashboard's audit log and reliability scores for the case just demoed — directly answers "what happens when something goes wrong and you need to know why."

---

## 14. Live Demo Plan — "Phone as Ambulance"

### 14.1 Concept
Instead of presenting from slides or a single laptop screen, physically use **one phone as the ambulance dispatcher device** and a **separate device as a hospital's reception screen**, both connected to the same live backend. This makes the "live, working, real-time" claim tangible to judges instead of merely asserted — an action on one device instantly causes a reaction on a completely separate device.

### 14.2 Devices / roles
- **Device 1 (phone):** Ambulance/Dispatcher app — held by the presenter walking through the case-intake flow.
- **Device 2 (laptop, screen-mirrored/projected if possible):** Hospital Reception app — showing the incoming request queue, countdown, and Accept/Reject buttons, operated live by a teammate acting as hospital staff.
- **Device 3 (laptop or tablet):** Admin/Oversight dashboard — the live map, reliability scores, and audit log, for the closing beat.
- All three connect to the same Firestore backend over venue Wi-Fi, with a phone hotspot as backup (see Section 18).

### 14.3 Screen-by-screen flow (ambulance phone)
1. Home screen: "New Case" button.
2. Case intake: tap-based category selection (not typing, for speed and demo smoothness); severity indicator auto-suggested, editable.
3. "Need profile" preview screen — narrate: "this is where urgency and need get turned into a structured query, not just a symptom description."
4. "Find Best Hospital" → loading state → result screen showing the matched hospital, distance, and a live countdown synced with Device 2.
5. Outcome screen: Accepted (green, reasoning shown) or Rerouted (amber, showing the automatic re-send happening) — narrate this as the core differentiator moment.
6. Mass-casualty toggle, accessible from the home screen, for Scenario C.

### 14.4 Hospital reception screen (Device 2)
- Large, high-contrast incoming-request card with countdown timer, patient need summary (the structured handoff data), distance/ETA.
- Oversized Accept/Reject buttons, deliberately large for visibility on a projected screen from a few feet away.
- On Accept: the "incoming case" checklist appears as a visual payoff.

### 14.5 "Contacting hospitals" — realism for the live alert
The guaranteed core mechanic: Firestore's realtime listener firing an **audible alert tone + visual flash** on Device 2 the instant a request is sent — no external telephony API needed, no added live-demo risk. (A real phone call/SMS trigger via a telephony API, or a `wa.me` WhatsApp click-to-chat link, were considered as optional realism upgrades, but are explicitly **not** attempted unless the core MVP is fully working with hours to spare — telephony account verification and network dependency at a venue are unnecessary risk for a live demo.)

---

## 15. Minute-by-Minute Pitch Script

Fits inside the 5-minute submission video and the live pitch:

| Time | Beat |
|---|---|
| 0:00–0:30 | One-line pitch + research hook: "Delhi already tried a live bed-count app during COVID. People still died, because a number on a screen doesn't obligate anyone. Here's what we built instead." |
| 0:30–1:15 | Scenario A — clean single-case match, narrated live across two devices. |
| 1:15–2:00 | Scenario B — reject/timeout → automatic reroute, the core differentiator beat. |
| 2:00–3:00 | Scenario C — mass-casualty batch distribution, the flagship visual. |
| 3:00–3:30 | Scenario D — stale-data fallback (shows engineering maturity, not just happy-path polish). |
| 3:30–4:00 | Scenario E — audit trail / admin dashboard reveal. |
| 4:00–4:45 | Explicitly name 2–3 of the 15 problems deliberately **not** built and why (Section 8) — signals maturity and honesty rather than overclaiming. |
| 4:45–5:00 | Close: impact framing tied back to the ~30%-trauma-death statistic and the specific documented failure cases from Section 5. |

---

## 16. Team Roles & Hour-by-Hour Build Timeline

Each role is scoped so one person owns a clearly separable, individually-explainable module — required because the rulebook allows judges to ask any member to explain and demo their own contribution.

| Role | Owns |
|---|---|
| **A — Matching Engine** | Ranking algorithm, need-profile lookup table, concurrency-safe holds, stale-data fallback, rate-limit gesture. Core logic, no UI. |
| **B — Ambulance App** | Case-intake flow, need-profile preview, outcome/reroute screens, mass-casualty toggle. Frontend, Device 1. |
| **C — Hospital App** | Capability profile editor, incoming-request queue, accept/reject + countdown, reliability badge. Frontend, Device 2. |
| **D — Backend/Realtime + Admin Dashboard** | Firestore data layer, transaction logic, audit log, admin/oversight view, seed data for 6–10 hospitals across 3–4 case categories. Backend + Device 3. |
| **E (5th member, if available) — Docs, Demo, QA** | README, architecture diagram, commit-hygiene tracking, seeded scenarios rehearsed end-to-end, pitch script, submission video editing. |

**Suggested hour-by-hour shape (adjust to actual start time):**

| Hours | Focus |
|---|---|
| 0–1 | Finalize data model/schema together (Section 10); agree on API contracts between the three apps; set up repo + branches; seed hospital/case data. |
| 1–5 | Parallel build of core MVP pieces — matching engine, ambulance case-intake, hospital request queue, backend state machine. Commit at least every 1–2 hours per rulebook. |
| 5–7 | First end-to-end integration test — Scenario A working across real devices. |
| 7–9 | Build reject/timeout/auto-reroute (Scenario B) and concurrency-safe holds. |
| 9–12 | Build mass-casualty batch mode (Scenario C) — the flagship feature; give it real time. |
| 12–13 | Build stale-data fallback (Scenario D) and audit log (Scenario E groundwork). |
| 13–15 | Admin dashboard polish and any remaining locked-scope items; cut ruthlessly toward the roadmap items in Section 8 if behind schedule rather than leaving core scenarios shaky. |
| 15–16 | Full rehearsal of all 5 demo scenarios end-to-end, on the actual demo devices, ideally at the actual venue Wi-Fi. |
| 16–17 | README, architecture diagram, disclosed AI-usage note, submission checklist pass (Section 17). |
| 17–18 | Record the ≤5-minute demo video, buffer for last-minute fixes, freeze the repo. |

**Data seeding:** 6–10 fictional hospitals for one city, covering 3–4 case types (trauma, cardiac, maternity, pediatric), each with a visibly different capability set — that variety is what makes the matching logic look genuinely smart on stage instead of trivial.

---

## 17. Hackathon Submission Compliance Checklist

- [ ] One public GitHub repo created; organizers added as collaborators.
- [ ] Commit history shows regular, meaningful commits (roughly every 1–2 hrs) from every member — no single last-minute dump; judges inspect git history.
- [ ] Every member has ≥2 genuine, explainable commits.
- [ ] Feature branches used and merged into a stable `main`.
- [ ] `README.md` covers: problem statement, proposed solution, features, tech stack, system architecture, APIs, database, setup instructions, how to run.
- [ ] Working prototype/MVP demonstrable live — not just slides or a mockup.
- [ ] Reproducible on another machine — install/env/run instructions provided.
- [ ] All external APIs/libraries/datasets/frameworks disclosed in documentation.
- [ ] No secrets/API keys committed; `.env` + `.env.example` provided where applicable.
- [ ] AI-assisted code/content disclosed in the presentation/PPT; not presented as entirely original work.
- [ ] Every member can personally explain and demo the portion they built.
- [ ] Original vs. third-party components clearly identified in docs.
- [ ] Demo video recorded, ≤5 minutes, clearly shows the final working product and core functionality, submitted via the provided Google Drive link by the deadline.
- [ ] Repository frozen at the submission deadline; no post-deadline changes unless explicitly permitted.
- [ ] Presentation/PPT covers Problem → Architecture → Technology → Implementation → Demo → Results, ready for technical Q&A on architecture, algorithms, database, APIs, security, scalability, and individual contributions.

---

## 18. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Venue Wi-Fi flakiness breaks the live phone-to-phone demo | Firebase SDK auto-reconnects; carry a phone hotspot as backup; rehearse on the actual venue network if possible before the pitch. |
| Judge asks "why not just show bed counts like other projects" | Sections 5–6 exist specifically to answer this with researched, cited evidence — rehearse this answer explicitly. |
| Team over-scopes and nothing fully works | Full scope is locked (Section 2), but if hour 8–10 shows the build is behind, cut in this order: admin-dashboard depth → stale-data-fallback polish → mass-casualty mode — never cut the accept/reject/reroute core, since that is the entire differentiator. |
| A member can't explain their portion under Q&A | Each role (Section 16) is one person's clear ownership; do a mutual explain-back rehearsal in the last hour. |
| Demo only rehearsed on the happy path | Rehearse Scenario B and D as thoroughly as Scenario A — these are what most clearly answer "why is this different from a dashboard." |
| Optional telephony/SMS realism upgrade eats build time or fails live | Explicitly not attempted unless the MVP is fully working with hours to spare; the guaranteed push-alert mechanic (Section 14.5) is always the fallback presented instead. |

---

## 19. Adjacent Ideas Considered (Reference Only)

Not in current build scope — kept for reference in case of a scope pivot, or as talking points showing breadth of consideration.

**Directly adjacent (same problem space, narrower or differently shaped):**
- **Inter-hospital transfer coordinator** — same capability-matching engine, but hospital-to-hospital instead of ambulance-to-hospital (a stabilized patient needing a capability the current hospital lacks, e.g. neurosurgery). A good fallback if the full ambulance-side scope proves too large.
- **Blood-availability mesh** — a narrower single-capability slice of the same idea: real-time blood-type stock sharing across hospitals with instant nearest-surplus lookup during a shortage.
- **Golden-hour ETA-vs-capability tradeoff visualizer** — explicitly shows the tradeoff between a nearer hospital without the right capability versus a farther one with it, with a reasoned recommendation — could be folded into the existing match-score reasoning display rather than built separately.

**Other domain ideas discussed earlier in planning, abandoned in favor of this project (listed only for completeness):** FinTech (gig-worker income-proof aggregator, pre-submission insurance-claim rejection risk checker, subscription dark-pattern protection); other HealthTech (B2B insurer pre-authorization drafting, remote-caregiver dashboard, adverse-drug-reaction reporting assistant, cross-specialist medication interaction checker); SmartCity (crowdsourced water-supply predictor, municipal complaint accountability dashboard, voice-first civic complaint reporting); AgriTech (store-vs-sell financial advisor, farmer-collective bulk-stock dashboard); GreenTech (informal e-waste collection matcher, hyperlocal reuse/repair marketplace); PropTech (landlord-side management tool, rental-agreement clause-risk checker).

---

## 20. Open Decisions for the Team

1. Is a confident 3rd device available for the admin dashboard during the live pitch, or should that be folded into Device 2 as a tab-switch instead?
2. Which teammate narrates live in front of judges versus operates a device — assign explicitly before rehearsal, not on the day.
3. Confirm: skip the optional telephony/SMS realism upgrade entirely and commit fully to the push-alert mechanic, using any spare time on rehearsal instead (current recommendation: yes, skip it).
4. Who owns rehearsing Scenario D and E specifically — these are the ones most likely to be skipped under time pressure but are what most clearly answers "why is this different from a dashboard."

---

## 21. Appendix — Decision Trail

For full transparency on how this plan was reached — useful if handing this document to a new teammate, mentor, or AI assistant with zero prior context:

1. **Initial brainstorming** across all six hackathon tracks after reading both hackathon PDFs in full; first pass produced fairly generic ideas.
2. **Feedback that ideas felt generic**, prompting deeper research grounded in real business/organizational/consumer data, with explicit techniques (flip the persona, move earlier in the problem timeline) for finding fresher angles.
3. **Second, deeper round of ideas** across FinTech, HealthTech, PropTech, GreenTech, SmartCity, and AgriTech, each grounded in a specific researched statistic or regulatory fact.
4. **A teammate's independent idea shared** — a hospital/ambulance coordination concept centered on the "urgency and capability are never jointly evaluated" insight, with explicit direction to focus on hospital/ambulance coordination specifically, not the earlier patient-facing PHC-recommendation framing.
5. **First analysis pass:** validated the core insight, flagged that a naive "bed-count dashboard" is a very common hackathon pattern, and proposed refining toward capability-matching as the differentiator.
6. **Explicit re-analysis against the web**, given concern the idea might already be "done." Research surfaced three directly comparable existing hackathon projects (MEDISIGHT, MediCure, Medicate — all passive dashboards), confirming the concern for the naive version — and then surfaced the pivotal finding: Delhi's real-world COVID-era bed-availability app **failed with documented deaths**, specifically because a displayed "available" status created no accountability. This directly motivated the pivot from passive display to an active accept/reject commitment protocol with automatic reroute-on-failure and a reliability/accountability layer.
7. **A teammate's second, structured write-up** decomposed the single core gap into the 15 sub-problems in Section 4.
8. **This document** consolidates everything into one complete, locked plan: full problem statement, research grounding, competitive landscape, the refined solution and why it's defensible, an explicit MVP/Roadmap triage against all 15 sub-problems, full feature list and data model, workflow, rehearsed demo scenarios, the "phone as ambulance" live demo plan, tech stack, team roles, hour-by-hour timeline, full hackathon-rulebook compliance checklist, and risk mitigations. **Full system scope is locked** — the admin dashboard, stale-data fallback, and mass-casualty mode are all MVP, not stretch; only items with no realistic 18-hour path (adversarial-gaming detection, full DoS protection, scheme verification, offline sync, internal reallocation, family visibility) remain explicit roadmap items to be named honestly in the pitch.
