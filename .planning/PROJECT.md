# AR Anatomy Explorer

## What This Is

A web-based anatomy education app that uses the device webcam as a live background and overlays interactive 3D anatomical models in a defined viewport area. Users manipulate models with hand gestures tracked via the webcam — rotating, scaling, and inspecting anatomy in real-time. The app runs in-browser and as a Tauri desktop app from the same codebase. Built as a final-year capstone project that doubles as a usable student learning tool and portfolio piece.

## Core Value

Users can see, rotate, and inspect 3D anatomy models using their hands in front of a webcam — making anatomy tangible without physical specimens.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Webcam feed displayed as live background
- [ ] 3D anatomy models rendered and floating in a defined viewport area over the camera feed
- [ ] Hand tracking via webcam — detect hand position, gestures, and movement
- [ ] Pinch+drag gesture mode — pinch to grab, drag to rotate, two-hand pinch to scale
- [ ] Open hand wave gesture mode — swipe to rotate, spread fingers to zoom in, close fist to zoom out
- [ ] Toggle between the two gesture modes
- [ ] Model gallery/menu to browse and select different anatomy models
- [ ] Tap/select body parts to see labels with name and description
- [ ] Layer toggle — show/hide body systems (skeletal, muscular, nervous, etc.)
- [ ] Explode view — separate model into constituent parts for internal inspection
- [ ] Source free/open 3D anatomy models (glTF/GLB format)
- [ ] Runs in web browser (Chrome/Firefox)
- [ ] Runs as Tauri desktop app from the same codebase

### Out of Scope

- iOS/mobile native app — pivot away from Unity/ARKit pipeline
- Unity engine — rebuilding on web stack
- Quiz/assessment mode — future feature, not v1
- AI-powered anatomy identification — future feature
- AR laser engraver preview — explored but not in scope
- User accounts/authentication — not needed for v1
- Backend/server — client-side only

## Context

- Capstone project for final-year submission — must impress examiners in a live demo
- Should be polished enough for real anatomy students to learn from
- Portfolio showpiece — needs to look great and demonstrate technical depth
- Prior work: WebXR prototype was built with Three.js but deprioritized due to iOS WebKit restrictions. That constraint no longer applies since we're targeting desktop browsers
- Prior work: Unity/AR Foundation project had a black screen launch bug on device — motivating the pivot to web
- 3D anatomy models need to be sourced (free/open, web-compatible formats)
- Development on Windows — no Mac available

## Constraints

- **Timeline**: Under 1 week — must ship fast
- **Package manager**: pnpm only (no npm) if using TypeScript ecosystem
- **Desktop wrapper**: Tauri over Electron — smaller footprint
- **Tech stack**: No assumptions — research the best tools for the job
- **Platform**: Web browser (Chrome/Firefox) + Tauri desktop, same codebase
- **Assets**: Free/open 3D anatomy models only

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Web over iOS/Unity | Avoid sideloading, black screen bugs, and Mac dependency | — Pending |
| Tauri over Electron | Smaller footprint, user preference | — Pending |
| pnpm over npm | User preference for TypeScript projects | — Pending |
| Two gesture modes | Pinch+drag for precision, open hand wave for casual browsing | — Pending |
| Client-side only | No backend needed, simplifies architecture for 1-week timeline | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-23 after initialization*
