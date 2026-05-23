# Phase 1: AR Canvas & Platform Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-23
**Phase:** 1-AR Canvas & Platform Foundation
**Areas discussed:** Pre-permission screen, Webcam error handling, Test object, Build structure

---

## Pre-Permission Screen

| Option | Description | Selected |
|--------|-------------|----------|
| Always on app load | User sees it immediately before any UI renders | |
| Behind 'Start Camera' button | User sees app UI first, then clicks button to trigger permission | ✓ |
| On first gesture | User sees app UI, permission prompt appears when they first try to gesture | |

**User's choice:** Behind 'Start Camera' button
**Notes:** Makes sense for Tauri Windows where permission is a one-way door. Allows user to see the product first, make an informed choice, reduces accidental denials.

---

## Webcam Fallback Mode

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, mouse only | User can browse models and rotate with mouse/keyboard even if camera is off or denied | ✓ |
| No, camera required | App shows 'camera required' message if permission denied; no mouse-only mode | |

**User's choice:** Yes, mouse only
**Notes:** Enables graceful degradation. Critical for demo resilience if camera fails or permission is denied mid-demo.

---

## Webcam Display When Unavailable

| Option | Description | Selected |
|--------|-------------|----------|
| Show camera feed, fallback to black/placeholder | Always render a video element; if camera denied or unavailable, show black box. UI indicates 'camera off' | |
| Show camera only if permission granted | If camera denied, don't render video element at all — just show 3D scene on solid background | |
| Show whatever is available | If camera available, show it. If denied, show checkerboard pattern or blur. Each is a design choice. | ✓ |

**User's choice:** Show whatever is available
**Notes:** Flexibility is good. Branches to next question about specific visual.

---

## No-Camera Visual Appearance

| Option | Description | Selected |
|--------|-------------|----------|
| Checkerboard pattern | Classic 'no texture' visual — signals something is missing | ✓ |
| Blurred/darkened background | Subtle — looks like a failed camera capture | |
| Solid color with UI hint | Solid dark gray/black with 'Camera Off' badge, or 'Click to Enable Camera' button | |

**User's choice:** Checkerboard pattern
**Notes:** Familiar to 3D developers. Clear visual signal that something is intentionally absent, not just a dark screen.

---

## Test Object Choice

| Option | Description | Selected |
|--------|-------------|----------|
| Simple cube | Minimal — 20 lines of code. Proves rendering works. Pure PoC. | |
| Cube with basic skull hint | Simple cube but textured/colored to vaguely suggest anatomy. 'Preview of coming attractions' | |
| Skeletal preview | Load one small anatomy model as the placeholder. Immediate 'wow' — users see the thing they'll be learning from. | ✓ |

**User's choice:** Skeletal preview
**Notes:** Raises the bar for Phase 1 (requires sourcing and optimizing at least one skeleton model) but creates a stronger "wow" moment for capstone demo. Immediately communicates product purpose.

---

## Test Object Animation

| Option | Description | Selected |
|--------|-------------|----------|
| Static | Skeleton sits there. User can rotate it with mouse once Phase 2 ships. | |
| Gentle rotate | Auto-rotate on load to show it off. Resets if user touches it. | ✓ |
| Let me explain | I have a specific animation in mind | |

**User's choice:** Gentle rotate
**Notes:** Auto-rotation with reset on interaction. Engages the user without requiring action. Resets allow user to explore with mouse controls when ready.

---

## Build Structure for Web + Tauri

| Option | Description | Selected |
|--------|-------------|----------|
| Single src/, conditional imports | One React app. Use process.env or feature flags to load Tauri APIs conditionally. Vite handles build differences. | — |
| Shared src/, separate entry points | src/ is shared, but web and Tauri have different main.tsx / index.html entries. Vite's config branches at build time. | — |
| Let me explain | I have a specific structure in mind | — |

**User's choice:** "choose the best one"
**Notes:** User deferred to Claude's judgment. Single src/ with conditional imports was selected as the simplest, lowest-friction approach for a 1-week timeline.

---

## Claude's Discretion

- **Build structure:** User said "choose the best one." Selected **Single src/, conditional imports** as the simplest option for rapid shipping. Both web and Tauri builds share identical React/R3F code; Vite's build config handles branching at compile time.

## Deferred Ideas

None — all discussion stayed within Phase 1's scope. Permission/error handling, animation, and build structure all directly enable the foundation phase's goal.

---

*Phase 1 discussion completed: 2026-05-23*
