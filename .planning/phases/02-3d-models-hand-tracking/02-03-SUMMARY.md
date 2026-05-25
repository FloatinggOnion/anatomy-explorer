---
phase: 02-3d-models-hand-tracking
plan: "03"
subsystem: hand-tracking
tags: [mediapipe, landmark-detection, canvas-overlay, hand-status, gest-01]
dependency_graph:
  requires: [02-01]
  provides: [hand-tracking-subsystem, landmark-overlay, hand-status-indicator]
  affects: [src/App.tsx, src/hooks/useHandTracking.ts, src/components/LandmarkCanvas.tsx, src/components/HandStatusIndicator.tsx]
tech_stack:
  added: ["@mediapipe/tasks-vision (HandLandmarker, FilesetResolver)"]
  patterns: ["rAF throttled loop at 30fps", "three-tier fallback init (local GPU → CDN GPU → CDN CPU)", "mirrored 2D canvas overlay", "AppInner pattern for hook context inside WebcamProvider"]
key_files:
  created:
    - src/hooks/useHandTracking.ts
    - src/components/LandmarkCanvas.tsx
    - src/components/HandStatusIndicator.tsx
  modified:
    - src/App.tsx
decisions:
  - "AppInner pattern: useHandTracking requires WebcamRefContext, so the hook and state are placed in a child component (AppInner) inside WebcamProvider rather than in App directly"
  - "Three-tier MediaPipe init: local WASM+model+GPU → CDN+GPU → CDN+CPU — matches threat model T-02-09 CPU fallback"
  - "isPinching is false placeholder in this plan — Plan 02-04 wires real gesture detection"
  - "Dot radius: 4px per plan spec (PATTERNS.md shows 5px; plan spec overrides with 4px)"
metrics:
  duration: "3m 13s"
  completed: "2026-05-25"
  tasks_completed: 2
  files_created: 3
  files_modified: 1
---

# Phase 2 Plan 03: MediaPipe Hand Tracking Subsystem Summary

**One-liner:** 30fps MediaPipe HandLandmarker loop with mirrored 2D dot overlay, live hand-detection status indicator, and three-tier CDN fallback initialization.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | useHandTracking hook | dd178e6 | src/hooks/useHandTracking.ts |
| 2 | LandmarkCanvas + HandStatusIndicator + App.tsx wiring | be4c475 | src/components/LandmarkCanvas.tsx, src/components/HandStatusIndicator.tsx, src/App.tsx |

## What Was Built

### useHandTracking hook (`src/hooks/useHandTracking.ts`)

MediaPipe HandLandmarker integration running in a separate rAF loop at ~30fps (33ms throttle), independent of the R3F render loop (Anti-Pattern 1 avoidance). Initialization is non-blocking (D-16): the hook starts the rAF loop immediately and initializes MediaPipe asynchronously in the background.

Three-tier initialization fallback:
1. Local WASM + local model + GPU delegate (primary — uses `public/mediapipe/`)
2. CDN WASM + CDN model + GPU delegate (when local files absent)
3. CDN WASM + CDN model + CPU delegate (GPU unavailable in Tauri WebView2 — T-02-09)

Cleanup: cancels rAF and calls `landmarker.close()` on unmount (T-02-08 mitigation). Uses a `cancelled` flag to prevent stale async references from completing after unmount.

### LandmarkCanvas (`src/components/LandmarkCanvas.tsx`)

Fixed-position `<canvas>` at z:1 (integer stack: video:0, landmark:1, R3F:2, UI:10). Draws 21 landmark dots per hand with:
- Canvas pixel dimensions set to `video.videoWidth/Height` (Pitfall E mitigation — matches stream resolution not CSS size)
- Horizontal mirror transform (`translate + scale(-1,1)`) matching the mirrored video feed (D-27)
- Dot color: green-500 `#22C55E` for active pinch points (landmarks 4+8), white semi-transparent `rgba(255,255,255,0.7)` otherwise (D-11)
- No connecting lines (D-09)
- Respects `landmarksVisible` store toggle (D-12)

### HandStatusIndicator (`src/components/HandStatusIndicator.tsx`)

Fixed top-right indicator at z:10. Three states:
- Loading (`!handTrackingReady`): gray dot + "Loading hand tracking..."
- No hand (`handTrackingReady && !handDetected`): gray dot + "No hand detected"
- Hand detected (`handDetected`): green-500 dot + "Hand detected"

### App.tsx changes

Introduced `AppInner` component to place `useHandTracking` inside `WebcamProvider` context boundary (the hook calls `useWebcamRef()` which requires `WebcamRefContext`). `AppInner` owns `landmarks` and `isPinching` state, passes them to `LandmarkCanvas`.

Layer stack (committed resolution from RESEARCH.md Open Questions #1):
- `z:0` — video background (WebcamProvider)
- `z:1` — LandmarkCanvas (pointerEvents:none)
- `z:2` — R3F canvas wrapper (pointerEvents:auto)
- `z:10` — HandStatusIndicator, BottomToolbar

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| `isPinching = false` | src/App.tsx | handleResults callback | Plan 02-04 replaces with real pinch distance calculation from landmarks 4+8. LandmarkCanvas draws dots correctly; pinch highlight color (green) will never activate until 02-04. |

## Threat Surface Scan

No new trust boundaries introduced beyond those in the plan's threat model. The three-tier MediaPipe init fallback accesses two CDN endpoints (`cdn.jsdelivr.net`, `storage.googleapis.com`) — consistent with T-02-07 (accepted: public WASM binary, no user data transmitted). Local `public/mediapipe/` is the primary path.

## Self-Check: PASSED

| Item | Result |
|------|--------|
| src/hooks/useHandTracking.ts exists | FOUND |
| src/components/LandmarkCanvas.tsx exists | FOUND |
| src/components/HandStatusIndicator.tsx exists | FOUND |
| commit dd178e6 exists | FOUND |
| commit be4c475 exists | FOUND |
| pnpm tsc --noEmit exits 0 | PASSED |
