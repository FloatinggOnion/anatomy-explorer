# AR Anatomy Explorer

## What This Is

A web-based anatomy education app that uses the device webcam as a live background and overlays interactive 3D anatomical models in a defined viewport area. Users manipulate models with hand gestures tracked via the webcam — rotating, scaling, and inspecting anatomy in real-time. The app runs in-browser and as a Tauri desktop app from the same codebase. Built as a final-year capstone project that doubles as a usable student learning tool and portfolio piece.

## Core Value

Users can see, rotate, and inspect 3D anatomy models using their hands in front of a webcam — making anatomy tangible without physical specimens.

## Requirements

### Validated

- ✓ Webcam feed displayed as live background — Phase 1
- ✓ 3D anatomy models rendered and floating in a defined viewport area over the camera feed — Phase 2 (GLB loading, auto-fit, OrbitControls)
- ✓ Hand tracking via webcam — detect hand position, gestures, and movement — Phase 2 (MediaPipe HandLandmarker, 21 landmarks, 30fps)
- ✓ Pinch+drag gesture mode — pinch to grab, drag to rotate, two-hand pinch to scale — Phase 2 (hysteresis, dead zone, momentum)
- ✓ Source free/open 3D anatomy models (glTF/GLB format) — Phase 2 (skeleton.glb + body.glb bundled, file picker for user models)
- ✓ Runs in web browser (Chrome/Firefox) — Phase 1

### Active

- [ ] Open hand wave gesture mode — swipe to rotate, spread fingers to zoom in, close fist to zoom out
- [ ] Toggle between the two gesture modes
- [ ] Model gallery/menu to browse and select different anatomy models
- [ ] Tap/select body parts to see labels with name and description
- [ ] Layer toggle — show/hide body systems (skeletal, muscular, nervous, etc.)
- [ ] Explode view — separate model into constituent parts for internal inspection
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
| Web over iOS/Unity | Avoid sideloading, black screen bugs, and Mac dependency | ✓ Validated — Phase 1+2 |
| Tauri over Electron | Smaller footprint, user preference | ✓ Validated — Phase 1 |
| pnpm over npm | User preference for TypeScript projects | ✓ Validated — Phase 1 |
| Two gesture modes | Pinch+drag for precision, open hand wave for casual browsing | Pinch+drag shipped Phase 2; wave mode deferred |
| Client-side only | No backend needed, simplifies architecture for 1-week timeline | ✓ Validated — Phases 1+2 |
| MediaPipe tasks-vision for hand tracking | Google's maintained WASM solution, 21 landmarks, client-side | ✓ Validated — Phase 2 |
| Three-tier MediaPipe fallback | Local GPU → CDN GPU → CDN CPU for robustness | ✓ Validated — Phase 2 |
| Gesture hysteresis thresholds | PINCH_ENTER=0.05, PINCH_EXIT=0.08, 10px dead zone, 500ms debounce | Tunable via Leva — Phase 2 |

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
*Last updated: 2026-05-25 after Phase 2 transition*
