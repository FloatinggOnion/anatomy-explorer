---
phase: 02-3d-models-hand-tracking
fixed_at: 2026-05-25T00:00:00Z
review_path: .planning/phases/02-3d-models-hand-tracking/02-REVIEW.md
iteration: 1
findings_in_scope: 10
fixed: 10
skipped: 0
status: all_fixed
---

# Phase 02: Code Review Fix Report

**Fixed at:** 2026-05-25T00:00:00Z
**Source review:** .planning/phases/02-3d-models-hand-tracking/02-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 10
- Fixed: 10
- Skipped: 0

## Fixed Issues

### CR-01: Object URL is never revoked on component unmount

**Files modified:** `src/components/BottomToolbar.tsx`
**Commit:** 13dec85
**Applied fix:** Added a cleanup `useEffect` with empty dependency array that revokes `prevObjectUrlRef.current` on unmount, preventing the last blob URL from leaking when the component is destroyed.

### CR-02: HandLandmarker initialization failure not surfaced to UI

**Files modified:** `src/hooks/useHandTracking.ts`, `src/store/appState.ts`
**Commit:** 8bd6500
**Applied fix:** Added `handTrackingError: string | null` field and `setHandTrackingError` setter to the Zustand store. In the final catch block of `useHandTracking` init, the error is now set via `setHandTrackingError()` so the UI can display a failure message instead of perpetually showing "Loading hand tracking...".

### CR-03: Pan/scale disambiguation formula fires pan on ordinary pinch-to-scale

**Files modified:** `src/hooks/useGestureInterpreter.ts`
**Commit:** 33afa28
**Applied fix:** Replaced the flawed `panMagnitude > scaleMagnitude * 200` condition with `scaleMagnitude < 0.01`. Pan is now only emitted when scale is essentially stationary, preventing normal scale gestures from being misclassified as pan when the midpoint drifts slightly. Status: fixed: requires human verification (logic change).

### CR-04: useGLTF cache collision from shared scene mutation

**Files modified:** `src/components/ModelViewer.tsx`, `src/components/BottomToolbar.tsx`
**Commit:** f3dfb44
**Applied fix:** (1) Clone the scene via `useMemo(() => scene.clone(true), [scene])` in GLBModel so the cached original is never mutated by centering/scaling. (2) Call `useGLTF.clear(prevObjectUrlRef.current)` in BottomToolbar before revoking the old URL, preventing stale cache growth.

### WR-01: setHandDetected called twice per frame

**Files modified:** `src/hooks/useGestureInterpreter.ts`
**Commit:** e296ee0
**Applied fix:** Removed the `setHandDetected(landmarks.length > 0)` call from `interpret()` and its subscription from the hook's dependency array. The caller (`handleResults` in App.tsx) already sets this value, so the duplicate was a side effect that violated the function's stated purpose as a pure gesture state machine.

### WR-02: lastTimeRef not reset on loop restart

**Files modified:** `src/hooks/useHandTracking.ts`
**Commit:** 34d9474
**Applied fix:** Added `lastTimeRef.current = 0` at the start of the RAF loop effect body, so when the loop restarts (due to `onResults` reference change), the throttle timer is reset and the first frame is not silently skipped.

### WR-03: Error boundary scope unclear

**Files modified:** `src/components/ModelViewer.tsx`
**Commit:** ad3493e
**Applied fix:** Added a clarifying comment above the JSX return in `GLBModelWithErrorBoundary` explaining that the boundary wraps Suspense to catch both synchronous render errors and Suspense-thrown errors from useGLTF, and that a parent Suspense in Canvas.tsx may catch first by design.

### WR-04: Double-rotation when momentum active and new gesture arrives

**Files modified:** `src/components/SceneController.tsx`
**Commit:** 3787305
**Applied fix:** Added `(!cmd || cmd.type !== 'rotate')` guard to the momentum deceleration block, so momentum is not applied in the same frame as an active rotate gesture command. This prevents the double-rotation that occurred on the first frame of a new pinch after momentum was active. Status: fixed: requires human verification (logic change).

### WR-05: Canvas resized unconditionally on every effect run

**Files modified:** `src/components/LandmarkCanvas.tsx`
**Commit:** 0f90c77
**Applied fix:** Added dimension comparison before setting `canvas.width`/`canvas.height`. The canvas is only resized when the video resolution actually changes, avoiding unnecessary context resets and potential flicker at 30fps.

### WR-06: useEffect for auto-fit may race ref population

**Files modified:** `src/components/ModelViewer.tsx`
**Commit:** e6190f7
**Applied fix:** Changed `useEffect` to `useLayoutEffect` for the auto-fit centering/scaling logic in GLBModel. `useLayoutEffect` fires after DOM commit but before paint, guaranteeing `groupRef.current` is populated. Also removed the now-unused `useEffect` import to satisfy TypeScript.

---

_Fixed: 2026-05-25T00:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
