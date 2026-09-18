# Raahi — Later-Stage Mobile Demo Specification

## 1. Purpose

This document records a **later-stage demo requirement** for **Raahi**.

The mobile experience is **not a first-priority MVP feature**. The core desktop/web platform, backend, matching engine, hospital workflow, rerouting, concurrency safety, auditability, and other locked MVP capabilities must be completed and stable first.

After the main platform is working, this document defines the small mobile-facing experience we can add specifically for an **ambulance driver** so the final hackathon demo can be shown from a phone.

The objective is to demonstrate that Raahi can expose a **small, practical, driver-focused view** without turning the driver application into another full hospital/admin dashboard.

---

## 2. Product Name

**Project name:** Raahi

**Mobile demo name:** Raahi Ambulance View

The mobile view should use the same Raahi backend and realtime data as the main platform. It should not become a separate product or separate source of truth.

---

## 3. Priority

**Priority:** Later-stage / post-MVP polish

### Do not build this before the core flow is stable

The team should first complete and verify the critical Raahi workflow:

```text
Case Created
    ↓
Need Profile
    ↓
Hospital Matching
    ↓
Hospital Request
    ↓
Accept / Reject / Timeout
    ↓
Auto-Reroute when required
    ↓
Resource Hold
    ↓
Audit Log
```

Only after the above workflow is reliable should the team spend time on the mobile-specific demo experience.

### Scope-cut rule

If the team is running short on hackathon time, the mobile demo is one of the features that may be reduced or omitted without affecting the core Raahi MVP.

The mobile experience must never delay or destabilize:

- deterministic matching
- hospital commitment handling
- automatic rerouting
- concurrency-safe resource holds
- audit logging
- mass-casualty distribution
- stale-data fallback

---

## 4. Target User

The mobile interface is intended for the **ambulance driver / ambulance-side user**.

The driver's responsibility is intentionally narrow.

The driver should only see information needed to:

1. understand where the patient is being routed,
2. see the relevant hospital/resource availability information at a glance,
3. follow the current routing/acceptance status,
4. contact the relevant hospital,
5. access the minimal information needed to continue the transfer.

The driver should **not** be given access to internal hospital operations or administrative functions.

---

## 5. Core Design Principle

### "Only what the ambulance driver needs."

The mobile UI must be a **thin operational view**, not a compressed version of the entire Raahi dashboard.

Do not expose unnecessary hospital-management or administrative information.

The driver-facing experience should avoid:

- hospital staff controls
- editing hospital inventory
- admin analytics
- reliability-management controls
- audit-log management
- system configuration
- matching-rule configuration
- internal hospital notes
- backend/debug information
- unnecessary patient-management functionality

The driver's mobile screen should remain simple enough to understand while travelling and during a time-critical transfer.

---

## 6. Proposed Mobile Demo Screens

The mobile demo can be implemented as a small responsive section of the existing React application rather than a completely separate mobile application.

Suggested route:

```text
/ambulance
```

or, when a specific case is required:

```text
/ambulance/:caseId
```

### Screen A — Ambulance Home / Active Case

A compact dashboard showing the current case and routing status.

Example information:

```text
RAAHI
Ambulance View

CASE #R-1042
Status: Hospital Accepted

Destination
CityCare Hospital

Estimated Distance
6.2 km

Estimated Travel Time
~9 min

ICU Beds
4 available

Ventilators
2 available

Emergency Load
Moderate

[ CONTACT HOSPITAL ]
```

The exact information shown should depend on what is already available from the authoritative Raahi backend.

---

### Screen B — Hospital Availability / Destination Summary

A small card-based view showing only the vacancy/resource information relevant to the ambulance workflow.

Potential fields:

- hospital name
- distance
- ICU beds available
- ventilators available, when relevant
- relevant blood availability, when relevant
- emergency-load indicator
- current acceptance/routing status
- last-update/freshness indication where useful

Example:

```text
Destination Hospital

CityCare Hospital
6.2 km away

ICU Beds        4
Ventilators    2
Blood          O-
ER Load        Moderate
Data           Updated 2 min ago

Accepted for this case
```

Do not turn this into a complete hospital inventory screen.

---

### Screen C — Contact Hospital

The mobile demo should provide a direct way to contact the destination hospital.

Example:

```text
CityCare Hospital

Emergency Desk
+91 XXXXX XXXXX

[ CALL ]
```

On a real mobile device, this can use the browser's phone-link mechanism (for example, a `tel:` link) so the driver can initiate a call.

The contact information should come from the Raahi hospital record or configured demo data rather than being manually duplicated in the frontend.

---

### Screen D — Routing / Request Status

The driver should be able to see the current high-level state of the hospital request.

Possible states:

```text
Searching for Hospital
        ↓
Request Sent
        ↓
Awaiting Confirmation
        ↓
Hospital Accepted
```

or:

```text
Hospital Rejected
        ↓
Raahi is finding the next suitable hospital
        ↓
New Hospital Request Sent
```

The driver-facing wording should remain simple.

Internal request-state details, scoring breakdowns, audit events, and implementation details should stay outside the driver's view.

---

## 7. Realtime Requirement

The mobile demo should consume the **same realtime source of truth** as the main Raahi application.

Where appropriate, it should use the existing Firestore `onSnapshot` subscriptions already defined for the project rather than introducing a second synchronization mechanism.

For example:

```text
Hospital changes resource availability
        ↓
Firestore update
        ↓
onSnapshot
        ↓
Raahi backend / existing state
        ↓
Ambulance mobile view updates
```

This allows the demo to visually show the platform's realtime nature from a phone.

---

## 8. Driver-Facing Feature Boundary

### Allowed

The ambulance view may show:

- current case/routing status
- current destination hospital
- small availability summary
- relevant bed/resource counts
- approximate distance/ETA already produced by Raahi
- freshness indicator when relevant
- hospital contact information
- simple accepted/rejected/rerouting status
- essential transfer information already authorized for the ambulance workflow

### Not allowed in the driver view

The ambulance interface should not expose:

- hospital inventory editing
- accepting/rejecting requests
- hospital staff controls
- admin dashboard
- reliability-management controls
- audit-log inspection/editing
- matching-rule controls
- system configuration
- internal scoring configuration
- hospital-side operational notes
- unnecessary analytics

The backend may continue to calculate and store these things, but the driver UI should not expose them unless a later requirement explicitly adds them.

---

## 9. Relationship to the Existing Raahi Architecture

The mobile demo is a **frontend surface**, not a new architecture.

```text
                    RAAHI BACKEND
                         │
              ┌──────────┼──────────┐
              │          │          │
           Hospital   Admin     Ambulance
             Web       Web       Mobile
                                   │
                              Driver View
```

The ambulance mobile view should reuse:

- the existing Firebase/Firestore backend
- existing case/request data
- existing hospital data
- existing matching results
- existing request state machine
- existing realtime subscriptions where possible
- existing authentication/authorization model
- existing API/service contracts

Do not create duplicate ambulance-only backend logic simply to support the demo.

---

## 10. Responsive Design Requirement

The existing React frontend should be designed so the ambulance route works cleanly on a phone-sized viewport.

The target is a **mobile-first compact layout** for the ambulance route while the hospital/admin surfaces may continue to use desktop-oriented layouts.

The mobile UI should prioritize:

- large readable status text
- clear destination information
- large touch targets
- minimal scrolling
- high information density without clutter
- obvious call/contact action
- clear realtime status changes

Avoid adding a large navigation system or many screens.

---

## 11. Demo Scenario

The mobile view should support at least one clean hackathon demonstration.

### Recommended demo flow

```text
1. Create emergency case
        ↓
2. Raahi calculates suitable hospitals
        ↓
3. Hospital receives request
        ↓
4. Hospital accepts
        ↓
5. Ambulance phone immediately shows:
      - accepted status
      - destination hospital
      - bed/resource summary
      - distance/ETA
      - contact button
```

A second optional mobile demo can show:

```text
1. Hospital rejects / times out
        ↓
2. Raahi reroutes automatically
        ↓
3. Phone updates destination/status
        ↓
4. Driver sees the new hospital
```

This would demonstrate that the phone is consuming the same live routing state rather than displaying static mock data.

---

## 12. Vacancy and Bed Dashboard — Keep It Small

The phrase **"vacancy/bed dashboard"** for the mobile experience means a compact operational summary, not a full hospital dashboard.

Recommended example:

```text
CURRENT DESTINATION

CityCare Hospital

ICU Beds           4
Ventilators        2
Emergency Load     Moderate

Status: ACCEPTED
Updated: 2 min ago
```

Only show the resource categories that matter to the current case whenever practical.

For example:

- a cardiac case may emphasize ICU/ventilator availability;
- a trauma case may emphasize ICU/blood/trauma capability;
- another case may show only the relevant capability/resource subset.

The exact filtering should follow the authoritative case `need_profile` and the existing Raahi backend rules.

---

## 13. Contact Information

Hospital contact should be directly accessible from the mobile screen.

Recommended interaction:

```text
[ CONTACT HOSPITAL ]
          ↓
   Hospital contact card
          ↓
      [ CALL ]
```

The UI should avoid unnecessary communication features such as chat, social messaging, or broad contact directories unless they are explicitly added later.

The requirement is simply to provide the ambulance driver with the relevant hospital contact.

---

## 14. Authentication / Demo Access

The exact authentication flow for the mobile demo can reuse the project's existing authentication design.

For the hackathon demo, the team may use a controlled demo ambulance account/session if that is simpler and consistent with the security model.

Do not weaken backend authorization merely to make the mobile demo easier.

The mobile frontend must still receive only data the ambulance role is authorized to see.

---

## 15. Security / Privacy Boundary

The mobile demo is not a reason to expose the full patient record.

Only the minimum patient/case information necessary for the ambulance workflow should be displayed.

Avoid putting sensitive or unnecessary patient details directly on a public demo screen.

Do not hard-code:

- passwords
- API keys
- Firebase credentials that should remain private
- private hospital credentials
- real patient information
- real emergency contact information unless intentionally authorized for the demo

Use synthetic/demo data for the hackathon environment.

---

## 16. Implementation Notes

When this feature is eventually implemented:

### Frontend owner

**P3 — Frontend** owns the ambulance mobile UI.

P3 should reuse existing components and backend contracts rather than creating parallel application logic.

### Backend owners

**P1/P2 — Backend + AI/Realtime** should only make backend changes when required to support a clean, authorized ambulance-facing data contract.

Do not add backend complexity merely for visual polish.

### Suggested implementation sequence

```text
Core Raahi MVP stable
        ↓
Responsive /ambulance route
        ↓
Read current case + destination
        ↓
Subscribe to realtime request/hospital state
        ↓
Display compact bed/resource summary
        ↓
Display routing status
        ↓
Add hospital contact action
        ↓
Test phone viewport
        ↓
Run live demo rehearsal
```

---

## 17. Definition of Done

The mobile demo is complete when all of the following are true:

- Raahi has a usable `/ambulance` mobile route.
- The route works on a normal smartphone browser.
- The screen shows the current destination hospital.
- The screen shows a small relevant vacancy/bed/resource summary.
- The screen shows the current high-level routing/request status.
- The screen can reflect important realtime changes from the existing Raahi backend.
- The ambulance user can access the destination hospital contact.
- The driver UI contains no hospital-admin or admin-only controls.
- No separate source of truth is introduced for mobile data.
- No secrets or real patient data are hard-coded.
- The mobile flow can be demonstrated end-to-end using synthetic hackathon data.

---

## 18. Suggested Demo UI Structure

A compact single-page structure is sufficient:

```text
┌─────────────────────────────┐
│ RAAHI                       │
│ Ambulance                   │
├─────────────────────────────┤
│ CURRENT STATUS               │
│ ✓ Hospital Accepted          │
│                             │
│ DESTINATION                 │
│ CityCare Hospital            │
│ 6.2 km  •  ~9 min           │
│                             │
│ RESOURCES                   │
│ ICU Beds        4            │
│ Ventilators     2            │
│ Blood           O-           │
│ ER Load         Moderate     │
│ Updated         2 min ago    │
│                             │
│ [ CONTACT HOSPITAL ]         │
│                             │
│ Case: R-1042                 │
└─────────────────────────────┘
```

The actual visual design can be improved during frontend polish, but the information architecture should remain intentionally small.

---

## 19. What This Feature Is Supposed to Demonstrate

The mobile demo is primarily a **presentation and usability layer** for the Raahi platform.

It should help the final demo communicate that:

- Raahi is not limited to a desktop dashboard.
- An ambulance-side user can access the current routing decision from a phone.
- Hospital availability can be surfaced in a compact operational view.
- Changes made in the platform can propagate to the ambulance view in realtime.
- The driver receives useful information without being exposed to unnecessary internal hospital/admin functionality.
- The same Raahi platform can support multiple role-specific interfaces while keeping one backend source of truth.

---

## 20. Explicit Non-Goals for This Phase

This later-stage mobile feature does **not** require:

- a native Android application
- a native iOS application
- an app-store release
- a complete driver-management system
- navigation/GPS turn-by-turn routing
- ambulance fleet management
- driver analytics
- chat or messaging
- payments
- appointment booking
- full patient-record management
- hospital inventory editing
- a second matching engine
- a second backend
- a standalone mobile database

A responsive mobile web experience is sufficient for the hackathon demo.

---

## 21. Priority Statement

> **Raahi mobile ambulance view = later-stage demo enhancement, not core MVP scope.**

Build it only after the core Raahi platform is working reliably.

The ideal final result is a small phone dashboard that answers the ambulance driver's immediate questions:

```text
Where am I being sent?
Is the hospital accepting me?
What relevant capacity is available?
What is the current status?
How do I contact the hospital?
```

Everything beyond those questions belongs outside the ambulance-facing mobile scope unless explicitly approved as a later requirement.
