---
phase: 02-3d-models-hand-tracking
plan: "04"
subsystem: gesture-control
tags: [gestures, mediapipe, three-js, r3f, zustand, leva]
dependency_graph:
  requires: [02-02, 02-03]
  provides: [gesture-pipeline, scene-control, pinch-rotate, two-hand-scale, momentum]
  affects: [src/App.tsx, src/components/Canvas.tsx, src/components/ModelViewer.tsx]
tech_stack:
  added: []
  patterns:
    - gestureCommandRef shared MutableRefObject for MediaPipe → R3F frame pipeline
    - useGestureInterpreter pure stateful function with hysteresis thresholds
    - SceneController R3F invisible component consuming gestureCommandRef in useFrame
    - modelGroupRef forwarded from Canvas → ModelViewer → GLBModel for transform targeting
    - Leva useControls for dev-only tunable gesture thresholds
key_files:
  created:
    - src/hooks/useGestureInterpreter.ts
    - src/components/SceneController.tsx
  modified:
    - src/components/Canvas.tsx
    - src/App.tsx
    - src/components/ModelViewer.tsx
decisions:
  - "Use gestureCommandRef MutableRefObject as zero-copy bridge between 30fps MediaPipe loop and 60fps R3F render loop — avoids React state overhead on every detection frame"
  - "SceneController clears gestureCommandRef after processing to prevent stale command replay across frames"
  - "modelGroupRef forwarded through ModelViewer to GLBModel so SceneController targets model geometry only, not the full Three.js scene root"
  - "Momentum deceleration uses wasRotatingRef to detect rotate→idle transition and start 0.92/frame decay loop"
  - "isPinching for LandmarkCanvas derived from raw PINCH_EXIT distance threshold rather than command type — shows highlight even during dead zone period"
metrics:
  duration: "~20 minutes"
  completed: "2026-05-25"
  tasks_completed: 2
  tasks_total: 2
  files_created: 2
  files_modified: 3
---

# Phase 2 Plan 04: Gesture Control Pipeline Summary

**One-liner:** Pinch+drag gesture pipeline connecting MediaPipe landmarks to Three.js scene transforms via a typed GestureCommand ref shared between a stateful interpreter hook and an R3F useFrame controller.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | useGestureInterpreter hook | 7ceaeb7 | src/hooks/useGestureInterpreter.ts |
| 2 | SceneController + App/Canvas wiring | 323ead7 | src/components/SceneController.tsx, Canvas.tsx, App.tsx, ModelViewer.tsx |

## What Was Built

### useGestureInterpreter (Task 1)

A pure stateful gesture state machine converting MediaPipe `NormalizedLandmark[][]` arrays to typed `GestureCommand` objects.

Key behaviors:
- **Hysteresis:** PINCH_ENTER (0.05) for entering pinch, PINCH_EXIT (0.08) for exiting — prevents flicker at the threshold boundary
- **Dead zone:** Single-hand rotate commands suppressed until hand moves >10px — eliminates micro-jitter on pinch start (D-19)
- **Two-hand pinch:** When both hands pinch simultaneously, computes pixel-space pinch centers; scale from `currentDist / prevDist` ratio
- **Pan disambiguation:** Midpoint velocity compared against scale magnitude; pan dominates when lateral movement exceeds scale * 200 (D-20)
- **Debounce:** `setGestureActive(false)` delayed 500ms after pinch release — prevents OrbitControls flickering on brief gesture gaps (D-25)
- **Leva panel:** `useControls('Gesture', ...)` exposes PINCH_ENTER, PINCH_EXIT, DEAD_ZONE_PX, rotationSensitivity, scaleSensitivity — tunable without code changes (D-22)

### SceneController (Task 2)

R3F invisible component (`return null`) operating in the useFrame loop. Reads `gestureCommandRef.current` each frame and applies:
- **rotate:** Trackball quaternion multiplication (qY × current × qX pattern)
- **scale:** Multiplicative accumulation clamped to [0.2, 5.0] (T-02-10 mitigation)
- **pan:** XY translation at 0.005 scale factor, Y inverted for screen-to-world mapping
- **Momentum:** After rotate pinch release, decelerates at 0.92/frame until speed < 0.0001 (T-02-11 mitigation); `wasRotatingRef` detects rotate→idle transition

### Pipeline Wiring (Task 2)

- `App.tsx`: `gestureCommandRef = useRef<GestureCommand | null>(null)` created at AppInner level; `interpret()` called inside `handleResults`; ref passed to `<Canvas gestureCommandRef={...} />`
- `Canvas.tsx`: Accepts optional `gestureCommandRef` prop; creates `modelGroupRef = useRef<Group | null>(null)`; includes `<SceneController gestureCommandRef={...} modelGroupRef={...} />`; `useEffect([gestureActive])` sets `controlsRef.current.enabled = !gestureActive` as Pitfall A / T-02-12 imperative fallback
- `ModelViewer.tsx`: Accepts optional `modelGroupRef` prop; forwards it through GLBModel (replaces local `useRef` with forwarded ref when provided)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing critical functionality] ModelViewer groupRef not forwarded**
- **Found during:** Task 2
- **Issue:** Plan specified SceneController receives `modelGroupRef` from Canvas, but the group `ref` lived inside `GLBModel` (a nested private component inside ModelViewer). No mechanism existed to pass it up.
- **Fix:** Added optional `modelGroupRef?: React.RefObject<Group | null>` prop to GLBModel, GLBModelWithErrorBoundary, and ModelViewer. When provided, replaces the local `useRef<Group>(null)`. Canvas creates the ref and passes it to both ModelViewer and SceneController.
- **Files modified:** src/components/ModelViewer.tsx
- **Commit:** 323ead7

**2. [Rule 2 - Momentum trigger gap] SceneController needed rotate→idle detection**
- **Found during:** Task 2 implementation review
- **Issue:** Plan showed momentum starting when gesture transitions idle but didn't specify the detection mechanism. Without it, momentum would never start.
- **Fix:** Added `wasRotatingRef = useRef<boolean>(false)` tracking. In useFrame: when `wasRotatingRef.current` is true and cmd is null/idle, start `isDeceleratingRef.current = true`. Reset on non-rotate commands.
- **Files modified:** src/components/SceneController.tsx
- **Commit:** 323ead7

**3. [Rule 1 - Clarification] isPinching uses PINCH_EXIT threshold, not cmd.type**
- **Found during:** Task 2 App.tsx update
- **Issue:** Plan's suggested isPinching formula `cmd.type !== 'idle' && dist < 0.08` had a logical issue — during the dead zone, cmd.type is 'idle' even while pinching, so the highlight would disappear during dead zone period.
- **Fix:** Derive isPinching purely from raw landmark distance < PINCH_EXIT (0.08), independent of command type. This ensures LandmarkCanvas highlight stays on continuously while user is pinching.
- **Files modified:** src/App.tsx
- **Commit:** 323ead7

## Known Stubs

None — all gesture behaviors are fully implemented with real MediaPipe landmark data.

## Threat Surface Scan

No new network endpoints, auth paths, or trust boundaries introduced. All threat model mitigations from plan were implemented:

| Threat | Mitigation Applied |
|--------|--------------------|
| T-02-10 (unbounded scale) | `Math.min(5.0, Math.max(0.2, ...))` in SceneController |
| T-02-11 (momentum loop) | `speed < 0.0001` exit condition; `isDeceleratingRef.current = false` |
| T-02-12 (OrbitControls not disabling) | `enabled={!gestureActive}` prop + imperative `useEffect` fallback |

## Self-Check: PASSED

- src/hooks/useGestureInterpreter.ts: FOUND
- src/components/SceneController.tsx: FOUND
- src/components/Canvas.tsx: FOUND (modified)
- src/App.tsx: FOUND (modified)
- src/components/ModelViewer.tsx: FOUND (modified)
- Commit 7ceaeb7: FOUND (useGestureInterpreter)
- Commit 323ead7: FOUND (SceneController + wiring)
- TypeScript: compiles cleanly (0 errors)
