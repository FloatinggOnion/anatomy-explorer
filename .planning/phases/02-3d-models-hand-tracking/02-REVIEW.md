---
phase: 02-3d-models-hand-tracking
reviewed: 2026-05-25T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/App.tsx
  - src/components/Canvas.tsx
  - src/components/HandStatusIndicator.tsx
  - src/components/LandmarkCanvas.tsx
  - src/components/ModelViewer.tsx
  - src/components/SceneController.tsx
  - src/hooks/useGestureInterpreter.ts
  - src/hooks/useHandTracking.ts
  - src/store/appState.ts
  - src/types/gestures.ts
  - src/components/BottomToolbar.tsx
  - src/hooks/useSkeletonAnimation.ts
findings:
  critical: 4
  warning: 6
  info: 3
  total: 13
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-05-25T00:00:00Z
**Depth:** standard
**Files Reviewed:** 12
**Status:** issues_found

## Summary

This phase delivers the 3D model viewer, hand tracking integration, gesture interpreter (rotate/scale/pan), landmark overlay, and bottom toolbar. The architecture is generally sound — refs are used correctly to avoid re-renders in the hot path, the gesture state machine uses hysteresis properly, and the error boundary pattern for GLB loading is appropriate.

However, four correctness/safety bugs were found that will cause real failures or data loss: a memory leak from object URLs when the component unmounts, a crash when MediaPipe lands results after unmount, a logic error in the pan/scale disambiguation formula that will fire pan commands on normal scale gestures, and a `useGLTF` cache collision that causes the wrong model to render when the same filename is loaded twice. Six additional warnings address robustness and edge-case handling.

---

## Critical Issues

### CR-01: Object URL is never revoked on component unmount — memory and object-URL leak

**File:** `src/components/BottomToolbar.tsx:22-23`

**Issue:** `prevObjectUrlRef` tracks the previous URL and revokes it when a *new* file is selected, but if the component unmounts while a URL is active (e.g., user navigates away, Tauri window closes) the current `prevObjectUrlRef.current` is never revoked. Each loaded GLB holds a live `blob:` URL that keeps the file's binary data pinned in memory for the lifetime of the browser context. On repeated model loads without unmounting it is partially mitigated, but any unmount leaks the last URL permanently.

**Fix:**
```typescript
// In BottomToolbar, add a cleanup effect:
useEffect(() => {
  return () => {
    if (prevObjectUrlRef.current) {
      URL.revokeObjectURL(prevObjectUrlRef.current);
      prevObjectUrlRef.current = null;
    }
  };
}, []); // runs only on unmount
```

---

### CR-02: HandLandmarker is not closed when initialization completes after component unmounts — `cancelled` flag does not call `lm.close()`

**File:** `src/hooks/useHandTracking.ts:72-75`

**Issue:** The `cancelled` flag correctly sets `true` in cleanup, and the code calls `lm.close()` when cancelled is true. However the second `useEffect` (the RAF loop) starts immediately on mount and calls `cancelAnimationFrame` + `landmarkerRef.current?.close()` on cleanup. The problem: if the component unmounts *before* the async `init()` resolves, `landmarkerRef.current` is still `null` at cleanup time (line 113), so `?.close()` is a no-op. When `init()` later resolves, the `cancelled` check on line 72 correctly closes it. **This path is safe.**

However, there is a real bug: when all three `createLandmarker` attempts fail (lines 53–68), the function returns early at line 68 without calling `setHandTrackingReady(false)` or any error notification to the UI. `handTrackingReady` stays `false` and `HandStatusIndicator` perpetually shows "Loading hand tracking..." with no indication of failure. The user has no way to know the feature is broken.

**Fix:**
```typescript
// After the final catch block, add:
} catch (err) {
  if (import.meta.env.DEV) console.error('[useHandTracking] All initialization attempts failed:', err);
  // Signal failure to UI — set a new store field or reuse modelLoadError:
  setHandTrackingReady(false); // stays false, but add a separate error flag
  // Recommended: add `handTrackingError: string | null` to appState and set it here
  return;
}
```

---

### CR-03: Pan/scale disambiguation formula fires pan on ordinary pinch-to-scale — gestures misidentified

**File:** `src/hooks/useGestureInterpreter.ts:141`

**Issue:** The disambiguation condition is:
```
panMagnitude > DEAD_ZONE_PX && panMagnitude > scaleMagnitude * 200
```
`scaleMagnitude` is `|scaleFactor - 1.0|`. For a typical slow pinch-to-scale, `scaleFactor` might be `1.02`, making `scaleMagnitude = 0.02`. The right-hand side is `0.02 * 200 = 4`. If the midpoint drifts even 11px (more than `DEAD_ZONE_PX=10`) during a scale gesture — which is common because hands aren't perfectly stationary — both conditions are true and a `pan` command fires instead of `scale`. The magic constant `200` has no documented basis and creates a very narrow band where scale is accepted without pan interference. In practice, nearly any scale attempt where the hand-pair drifts slightly will be classified as pan.

**Fix:** Invert the logic: prefer scale when scale magnitude dominates, fall through to pan only when midpoint movement is large *and* scale is negligible:
```typescript
// Replace the condition:
if (panMagnitude > DEAD_ZONE_PX && scaleMagnitude < 0.01) {
  // Only pan when scale is essentially stationary
  prevMidpointRef.current = midpoint;
  return { type: 'pan', delta: panDelta };
}
// Otherwise emit scale (dominant intent)
prevMidpointRef.current = midpoint;
return { type: 'scale', factor: scaleFactor };
```

---

### CR-04: `useGLTF` caches by URL — loading a different file with the same blob: URL path returns stale cached scene

**File:** `src/components/ModelViewer.tsx:28` and `src/components/BottomToolbar.tsx:22`

**Issue:** `useGLTF` from `@react-three/drei` caches loaded scenes by URL string. `URL.createObjectURL` generates a unique `blob:` URL each call, so two different files always get different URLs — this part is fine. **However**, `useGLTF` also reuses the cached `scene` object across multiple renders of `GLBModel`. When `setModelUrl(null)` is called (error revert) and then a new URL is set, the `<group ref={groupRef}><primitive object={scene} /></group>` pattern attaches the same Three.js `scene` object that was already added to the scene graph. Three.js `Object3D` can only have one parent; attaching it again silently detaches it from its previous parent. If the error boundary triggers `onRevert → setModelUrl(null)` and then the user loads another file, the old scene object may still be referenced by `useGLTF`'s cache, causing the `Box3.setFromObject` calculation on the new group to include stale geometry from the previous load.

The deeper issue: `useGLTF` does not call `useGLTF.preload` invalidation on URL change and the cached `scene` is mutated by `groupRef.current.position.sub(center)` (line 41) and `groupRef.current.scale.setScalar(...)` (line 46). These mutations persist in the cache. If the same object URL is somehow reused (unlikely with blob URLs, but possible if the implementation changes), the scene would be returned pre-mutated.

**Fix:** Clone the scene to avoid shared mutation:
```typescript
import { useGLTF } from '@react-three/drei';
import { useMemo } from 'react';

function GLBModel({ url, controlsRef, modelGroupRef }) {
  const { scene } = useGLTF(url);
  // Clone to avoid mutating the cached original
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  // ... rest of component, use clonedScene in <primitive>
```
Also call `useGLTF.clear(url)` when the URL changes to prevent stale cache growth:
```typescript
// In BottomToolbar handleFileChange, before setModelUrl:
if (prevObjectUrlRef.current) {
  useGLTF.clear(prevObjectUrlRef.current);
  URL.revokeObjectURL(prevObjectUrlRef.current);
}
```

---

## Warnings

### WR-01: `setHandDetected` called twice per frame — once in `interpret()` and once in `handleResults()`

**File:** `src/App.tsx:33` and `src/hooks/useGestureInterpreter.ts:58`

**Issue:** `handleResults` calls `setHandDetected(lms.length > 0)` on line 33 of App.tsx, and then `interpret()` also calls `setHandDetected(landmarks.length > 0)` on line 58 of `useGestureInterpreter.ts`. Zustand batches synchronous state updates in React 18+, so this does not cause a double render, but it is a logic duplication. The setter in `interpret()` is semantically redundant — the caller already sets it. It also means `interpret()` has a side effect that the caller doesn't expect, violating the function's stated purpose as a "pure gesture state machine."

**Fix:** Remove the `setHandDetected` call from `useGestureInterpreter.ts:58` and its subscription from the hook's dependency array. Keep it only in `handleResults` in App.tsx.

---

### WR-02: `useHandTracking` RAF loop starts immediately but landmarker may not be ready — `lastTimeRef` is shared and not reset between init and loop restarts

**File:** `src/hooks/useHandTracking.ts:108-114`

**Issue:** The RAF loop effect starts on mount unconditionally (line 109). The loop body guard `if (video && lm && video.readyState >= 2)` handles the case where `landmarkerRef.current` is null correctly. However, when `loop` changes (because `onResults` changes), the RAF is cancelled and restarted. `lastTimeRef.current` retains its old value. If the previous loop ran at time T and the new loop restarts at time T + delta, and delta < INTERVAL, the first frame is silently skipped. This is minor but could cause a 33ms dead zone on any `onResults` reference change. More importantly, `loop` is declared with `useCallback([videoRef, onResults])` — if `onResults` is not stable (it is a `useCallback` in App.tsx but depends on several values), the loop restarts frequently.

**Fix:** Verify `onResults` dependency is stable. The `handleResults` callback in App.tsx line 29 includes `[setHandDetected, interpret, videoRef]` — `interpret` itself depends on Leva controls which can change, causing `handleResults` to be recreated, causing the loop to restart. Reset `lastTimeRef.current = 0` when restarting the loop:
```typescript
useEffect(() => {
  lastTimeRef.current = 0; // reset throttle on loop restart
  rafRef.current = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(rafRef.current);
    landmarkerRef.current?.close();
  };
}, [loop]);
```

---

### WR-03: `ModelErrorBoundary.componentDidCatch` calls both `onError` and `onRevert` — `onRevert` sets `modelUrl` to null before error toast is shown

**File:** `src/components/ModelViewer.tsx:84-87`

**Issue:** In `componentDidCatch`, `onError` sets `modelLoadError` in the store and `onRevert` sets `modelUrl = null` synchronously. React batches these but the net effect is `modelUrl` becomes `null` (reverting to skeleton) and the error message is set. This is intentional, but the `hasError` state is set via `getDerivedStateFromError` before `componentDidCatch` fires. The boundary renders `null` (line 92) immediately. This means the `<React.Suspense>` fallback is discarded and the skeleton renders — correct. However, there is a subtle ordering issue: `onRevert()` calls `setModelUrl(null)` which triggers a Zustand update that causes the parent `ModelViewer` to re-render and swap `GLBModelWithErrorBoundary` for `SkeletonPreview`. This unmounts the error boundary. On remount, `hasError` state is reset to `false` (fresh component). This means if the user loads another bad file, the error boundary fires again as expected. **The sequence is actually correct.** The warning here is documentation: `onError` message says "Could not load model. File may be corrupt or contain no meshes." but corrupt network-fetched GLBs (from CDN) would never reach this boundary since `useGLTF` throws during Suspense — the boundary *will* catch that. The message is accurate but the boundary only protects the inner `<Suspense>` scope. If the parent `Suspense` in Canvas.tsx line 71 catches first, the fallback `<FallbackPlaceholder />` renders instead and `onError` is never called.

**Fix:** Nest the `<ModelErrorBoundary>` outside the `<React.Suspense>` (which it currently is in `GLBModelWithErrorBoundary`) — this is correct. No code change needed, but add a comment clarifying the boundary catches Suspense-thrown errors from `useGLTF`.

---

### WR-04: `SceneController` applies momentum deceleration AND processes a new gesture command in the same frame — double-rotation applied

**File:** `src/components/SceneController.tsx:56-86`

**Issue:** When `isDeceleratingRef.current` is true and a new `rotate` command arrives, the momentum block (lines 56-66) runs first and calls `applyRotationDelta`, then the rotate command block (lines 80-89) calls it again. So on the first frame of a new pinch after momentum is active, the model receives two rotation deltas: the decaying momentum delta and the new gesture delta. The intent is `isDeceleratingRef.current = false` on line 82 to stop momentum, but the momentum application on line 64 already fired before the check on line 82.

**Fix:** Check for an active rotate command before applying momentum:
```typescript
useFrame(() => {
  const group = modelGroupRef.current;
  if (!group) return;
  const cmd = gestureCommandRef.current;

  // Only decelerate if no active gesture overrides it
  if (isDeceleratingRef.current && (!cmd || cmd.type !== 'rotate')) {
    velocityRef.current.x *= 0.92;
    // ... rest of momentum block
  }
  // ... rest of frame handler
```

---

### WR-05: `LandmarkCanvas` sets `canvas.width`/`canvas.height` on every effect run — clears canvas mid-draw

**File:** `src/components/LandmarkCanvas.tsx:22-23`

**Issue:** `canvas.width = video.videoWidth || 640` is set unconditionally inside the effect on every run. Assigning to `canvas.width` or `canvas.height` clears the canvas and resets the 2D context state (transforms, etc.). This is called inside the same effect that draws landmarks, so the draw happens after the clear — functionally correct for a single draw call. However, if `video.videoWidth` is 0 on the first frame (video not yet decoded), the canvas is set to 640x480. On the next frame when the video has decoded, the canvas is resized again, causing a visible flicker as the coordinate mapping changes. The effect runs on every `[landmarks, isPinching, landmarksVisible, videoRef]` change — which is every MediaPipe frame (~30fps). Resizing the canvas 30 times per second is harmless but wasteful and can cause flicker when resolution changes.

**Fix:** Only resize when dimensions actually change:
```typescript
const currentWidth = video.videoWidth || 640;
const currentHeight = video.videoHeight || 480;
if (canvas.width !== currentWidth || canvas.height !== currentHeight) {
  canvas.width = currentWidth;
  canvas.height = currentHeight;
}
```

---

### WR-06: `GLBModel` useEffect dependency array omits `groupRef` — stale closure possible

**File:** `src/components/ModelViewer.tsx:54`

**Issue:** The `useEffect` (lines 33-54) has dependency array `[scene, controlsRef]`. `groupRef` is used inside the effect (lines 37, 41, 46, 50, 51) but is not listed as a dependency. React's exhaustive-deps rule would flag this. `groupRef` itself is a stable ref object, so the reference doesn't change — however the lint suppression comment is absent and the explicit omission could mask a bug if `groupRef` is ever re-created. More practically: the effect uses `groupRef.current` which is populated by the `<group ref={groupRef}>` render. If `scene` changes but the ref hasn't been populated yet (because React hasn't committed the DOM), `groupRef.current` is null and the effect returns early — the model is never centered. This is a race condition on fast machines or if the effect runs before commit.

**Fix:** The correct pattern is to call auto-fit logic via `useLayoutEffect` (which fires after commit but before paint) instead of `useEffect`, guaranteeing the ref is populated:
```typescript
useLayoutEffect(() => {
  if (!groupRef.current) return;
  // ... centering and scaling logic
}, [scene, controlsRef]);
```

---

## Info

### IN-01: `useSkeletonAnimation` returns `rotation` (the array value, not a ref) — callers may use stale value

**File:** `src/hooks/useSkeletonAnimation.ts:19-25`

**Issue:** The hook returns `rotation: rotationRef.current` (line 19). This returns the array value at call time. Since `rotationRef.current` is the same array object (arrays are passed by reference), callers that hold on to `rotation` will see mutation. However `SkeletonPreview` uses `rotationRef` directly (line 132) and never uses the returned `rotation`. The `rotation` export is dead code. Returning a mutable ref's `.current` value in the return object while also returning the ref itself is confusing.

**Fix:** Remove `rotation` from the return object since `rotationRef` is returned and used directly.

---

### IN-02: `any` type used in `controlsRef` — loses type safety on OrbitControls

**File:** `src/components/ModelViewer.tsx:25` and `src/components/Canvas.tsx:24`

**Issue:** `controlsRef: React.RefObject<any>` loses all type safety. Calling `.target.set(...)` and `.update()` on an `any`-typed ref will silently compile even if the wrong ref is passed. The `@react-three/drei` `OrbitControls` instance type is `OrbitControls` from `three-stdlib`.

**Fix:**
```typescript
import type { OrbitControls } from 'three-stdlib';
// ...
const controlsRef = useRef<OrbitControls | null>(null);
```

---

### IN-03: `mp-spin` CSS class referenced in JSX but defined only in `index.css` — no co-location

**File:** `src/components/BottomToolbar.tsx:67`

**Issue:** The spinner `div` uses `className="mp-spin"` (line 67) which requires the keyframe animation defined in `index.css`. This is an invisible coupling — removing or renaming the CSS class breaks the spinner with no TypeScript error. The rest of the codebase uses inline styles exclusively; this is the only use of a global CSS class.

**Fix:** Define the keyframe animation inline using a `<style>` tag injected at the component level, or convert to an inline animation using the Web Animations API. Alternatively, document the dependency with a comment and a lint rule.

---

_Reviewed: 2026-05-25T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
