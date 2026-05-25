---
phase: 02-3d-models-hand-tracking
verified: 2026-05-25T00:00:00Z
status: human_needed
score: 4/4 must-haves verified
overrides_applied: 0
re_verification: false
human_verification:
  - test: "Open pnpm dev in browser; hold hand in front of webcam and confirm dots appear within 5 seconds"
    expected: "21 white dots per hand track the hand in real-time; top-right indicator transitions from 'Loading hand tracking...' to 'Hand detected'"
    why_human: "MediaPipe WASM initialization and live webcam rendering cannot be verified programmatically without a running browser and physical webcam"
  - test: "Pinch thumb tip to index fingertip and drag left/right"
    expected: "3D model rotates trackball-style following hand movement; OrbitControls mouse input has no effect while pinching"
    why_human: "Gesture recognition requires a live webcam feed and physical gesture execution; cannot simulate MediaPipe landmark output without a running inference session"
  - test: "Pinch with both hands and move them apart, then together"
    expected: "Model scales up when hands move apart, scales down when hands move together; scale is clamped to the [0.2, 5.0] range"
    why_human: "Two-hand gesture requires two physical hands in the webcam frame; cannot programmatically verify the pinch-to-scale math produces visible results"
  - test: "Click Load Model button, select a .glb file; then select a deliberately invalid file (e.g. a .txt renamed .glb)"
    expected: "Valid GLB auto-fits to viewport and replaces skeleton; spinner appears briefly. Invalid file: red error toast appears at bottom-right with 'Could not load model' text; skeleton remains visible"
    why_human: "File dialog interaction, GLB parsing, and toast behavior require manual browser interaction"
  - test: "After pinch-drag rotation, release pinch and observe momentum"
    expected: "Model continues rotating for approximately 300ms then decelerates to a stop"
    why_human: "Timing and feel of momentum deceleration requires human observation to confirm the 0.92/frame decay matches the intended ~300ms feel"
---

# Phase 2: 3D Models & Hand Tracking — Verification Report

**Phase Goal:** Load and display 3D anatomy models (GLB) in the R3F canvas with OrbitControls for mouse interaction, and implement MediaPipe hand tracking with gesture-based model manipulation (pinch-to-rotate, two-hand pinch-to-scale).
**Verified:** 2026-05-25
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | User can view a 3D anatomy model loaded from a GLB file in the viewport | VERIFIED | `ModelViewer.tsx` — renders `<SkeletonPreview />` when `modelUrl` is null; renders `GLBModel` via `useGLTF(url)` when set. `BottomToolbar.tsx` provides the file picker that calls `setModelUrl(objectUrl)`. `public/models/body.glb` (valid 49KB glTF binary) is bundled. |
| 2 | User can rotate, zoom, and pan the model using mouse and keyboard controls | VERIFIED | `Canvas.tsx` — `<OrbitControls ref={controlsRef} enabled={!gestureActive} enablePan enableZoom enableRotate minDistance={1} maxDistance={10} />` is present inside the R3F canvas. `gestureActive` is wired from `useAppStore`. |
| 3 | User's hand is visibly tracked in real-time via the webcam (debug overlay or gesture indicator confirms detection) | VERIFIED | `useHandTracking.ts` runs a 30fps rAF loop calling `HandLandmarker.detectForVideo`. `LandmarkCanvas.tsx` draws 21 dots per hand on a fixed-position canvas at z:1, mirrored to match the video feed. `HandStatusIndicator.tsx` shows live detection state at top-right. |
| 4 | User can pinch to grab, drag to rotate, and two-hand pinch to scale the model | VERIFIED | `useGestureInterpreter.ts` — full state machine with PINCH_ENTER/PINCH_EXIT hysteresis, 10px dead zone, single-hand rotate, two-hand scale (distance ratio), two-hand pan disambiguation. `SceneController.tsx` applies `GestureCommand` objects in `useFrame` to `modelGroupRef`. Wiring: `App.tsx` → `interpret()` → `gestureCommandRef` → `Canvas.gestureCommandRef` → `SceneController`. |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/store/appState.ts` | Extended Zustand store with Phase 2 state | VERIFIED | All 6 Phase 2 fields present: `modelUrl`, `gestureActive`, `landmarksVisible`, `handDetected`, `handTrackingReady`, `modelLoadError`, each with a corresponding setter. Phase 1 fields untouched. |
| `src/types/gestures.ts` | GestureCommand, GestureState, GestureMode types | VERIFIED | Exports `GestureMode` ('idle' \| 'pinching' \| 'two-hand-pinch'), `GestureState` interface, `GestureCommand` discriminated union (idle/rotate/scale/pan). No implementation code. |
| `src/App.tsx` | Layer stack with z:0/1/2/10, all components mounted | VERIFIED | `AppInner` pattern: z:1 = `<LandmarkCanvas>`, z:2 = R3F canvas `<div>`, z:10 = `<HandStatusIndicator>` and `<BottomToolbar>`. `useHandTracking` and `useGestureInterpreter` called inside `AppInner` (within `WebcamProvider` context). |
| `public/mediapipe/wasm/` | Offline WASM assets (6 files) | VERIFIED | Directory contains 6 files: `vision_wasm_internal.js`, `vision_wasm_internal.wasm`, `vision_wasm_module_internal.js`, `vision_wasm_module_internal.wasm`, `vision_wasm_nosimd_internal.js`, `vision_wasm_nosimd_internal.wasm`. |
| `public/models/body.glb` | CC0 anatomy GLB > 10KB | VERIFIED | 49,116 bytes (49KB). `file` command confirms: "glTF binary model, version 2". Khronos RiggedFigure CC0 sample model. |
| `src/components/ModelViewer.tsx` | R3F component rendering GLB or SkeletonPreview | VERIFIED | Exports `ModelViewer`. Contains `GLBModel` (auto-fit via `Box3`), `ModelErrorBoundary` (class component catching parse errors, calls `setModelLoadError` + `setModelUrl(null)`), `GLBModelWithErrorBoundary` wrapper. `modelGroupRef` forwarded to GLBModel. |
| `src/components/BottomToolbar.tsx` | Fixed bottom overlay with file picker and landmark toggle | VERIFIED | Exports `BottomToolbar`. Contains hidden `<input type="file" accept=".glb,.gltf">`, Load Model button, landmark toggle, loading spinner (2s local state), error toast (5s auto-dismiss from `modelLoadError` store field). Object URL revocation via `prevObjectUrlRef`. |
| `src/components/Canvas.tsx` | R3F Canvas with OrbitControls and ModelViewer | VERIFIED | Exports `Canvas`. Contains `<OrbitControls>`, `<SceneController>`, `<ModelViewer>`. `gestureActive` read from store. Imperative `useEffect([gestureActive])` sets `controlsRef.current.enabled` as Pitfall A fallback. `modelGroupRef` created here and forwarded to both `ModelViewer` and `SceneController`. |
| `src/hooks/useHandTracking.ts` | MediaPipe HandLandmarker loop at 30fps | VERIFIED | Exports `useHandTracking(onResults)`. Three-tier initialization (local GPU → CDN GPU → CDN CPU). INTERVAL = 33ms throttle. `cancelAnimationFrame` + `landmarker.close()` cleanup. Reads `videoRef` from `useWebcamRef()`. Calls `setHandTrackingReady(true)` on success. |
| `src/components/LandmarkCanvas.tsx` | 2D canvas overlay at z:1 drawing hand landmark dots | VERIFIED | Exports `LandmarkCanvas`. Canvas pixel dims set to `video.videoWidth/Height`. Mirror transform applied. Dots: green-500 (#22C55E) for active pinch (landmarks 4+8), white semi-transparent otherwise. Respects `landmarksVisible` toggle. `pointerEvents: none`. |
| `src/components/HandStatusIndicator.tsx` | Top-right fixed indicator showing hand detection state | VERIFIED | Exports `HandStatusIndicator`. Three states: gray + "Loading hand tracking..." (`!handTrackingReady`), gray + "No hand detected", green + "Hand detected". Fixed top:8 right:8 z:10. |
| `src/hooks/useGestureInterpreter.ts` | Pure gesture state machine with hysteresis | VERIFIED | Exports `useGestureInterpreter`. Leva `useControls` with PINCH_ENTER, PINCH_EXIT, DEAD_ZONE_PX, rotationSensitivity, scaleSensitivity. State machine: hysteresis thresholds, dead zone, two-hand scale, pan disambiguation, 500ms gestureActive debounce. |
| `src/components/SceneController.tsx` | R3F component applying GestureCommands to modelGroupRef | VERIFIED | Exports `SceneController`. Reads `gestureCommandRef.current` in `useFrame`. Applies rotate (quaternion trackball), scale (clamped [0.2, 5.0]), pan (XY translation). Momentum deceleration: 0.92/frame decay, `wasRotatingRef` detects rotate→idle transition, exits at speed < 0.0001. Returns `null`. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/components/BottomToolbar.tsx` | `src/store/appState.ts` | `setModelUrl`, `setLandmarksVisible` | WIRED | Both selectors present and called: `setModelUrl(newUrl)` in `handleFileChange`, `setLandmarksVisible(!landmarksVisible)` in button onClick. |
| `src/components/Canvas.tsx` | `src/store/appState.ts` | `gestureActive` selector | WIRED | `const gestureActive = useAppStore((s) => s.gestureActive)` on line 25; used in `<OrbitControls enabled={!gestureActive}>` and `useEffect([gestureActive])`. |
| `src/components/ModelViewer.tsx` | `src/store/appState.ts` | `modelUrl` selector | WIRED | `const modelUrl = useAppStore((s) => s.modelUrl)` drives conditional rendering of `SkeletonPreview` vs `GLBModel`. |
| `src/hooks/useHandTracking.ts` | `src/store/appState.ts` | `setHandTrackingReady` | WIRED | `const setHandTrackingReady = useAppStore((s) => s.setHandTrackingReady)` called after successful MediaPipe init. |
| `src/components/LandmarkCanvas.tsx` | `src/context/WebcamRefContext.ts` | `useWebcamRef()` | WIRED | `const videoRef = useWebcamRef()` on line 13; used to read `video.videoWidth/Height` for canvas sizing. |
| `src/hooks/useHandTracking.ts` | `public/mediapipe/wasm/` | `FilesetResolver.forVisionTasks('/mediapipe/wasm')` | WIRED | `LOCAL_WASM_PATH = '/mediapipe/wasm'` passed to `FilesetResolver.forVisionTasks` on first init attempt. CDN fallback on failure. |
| `src/hooks/useGestureInterpreter.ts` | `src/store/appState.ts` | `setGestureActive`, `setHandDetected` | WIRED | Both selectors present; `setGestureActive(true)` on pinch start, `setTimeout(() => setGestureActive(false), 500)` on pinch release; `setHandDetected(landmarks.length > 0)` on every frame. |
| `src/components/SceneController.tsx` | `src/hooks/useGestureInterpreter.ts` | `gestureCommandRef` (MutableRefObject) | WIRED | `gestureCommandRef.current` read in `useFrame`; written by `interpret()` in `App.tsx` `handleResults` callback; passed from `AppInner` → `Canvas` prop → `SceneController` prop. |
| `src/App.tsx` | `src/hooks/useHandTracking.ts` | `useHandTracking(handleResults)` called in AppInner | WIRED | `useHandTracking(handleResults)` on line 59; `handleResults` calls `interpret()`, updates `gestureCommandRef.current`, `setLandmarks`, `setIsPinching`. |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `LandmarkCanvas.tsx` | `landmarks: NormalizedLandmark[][]` | `useHandTracking` → `handleResults` → `setLandmarks` in App.tsx | Yes — MediaPipe `detectForVideo` returns real hand landmark positions from webcam frames | FLOWING |
| `HandStatusIndicator.tsx` | `handDetected`, `handTrackingReady` | Zustand store; set by `useHandTracking` (ready) and `useGestureInterpreter` (detected) | Yes — driven by actual MediaPipe init completion and landmark detection | FLOWING |
| `ModelViewer.tsx` | `modelUrl: string \| null` | Zustand store; set by `BottomToolbar.handleFileChange` via `URL.createObjectURL(file)` | Yes — object URL points to user-selected file binary | FLOWING |
| `SceneController.tsx` | `gestureCommandRef.current` | `useGestureInterpreter.interpret()` called in `handleResults` callback | Yes — computed from real `NormalizedLandmark[][]` array; applies typed `GestureCommand` to `modelGroupRef` | FLOWING |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CAM-03 | 02-01, 02-02 | User can rotate, zoom, and pan using mouse/keyboard | SATISFIED | `OrbitControls` in `Canvas.tsx` with `enablePan`, `enableZoom`, `enableRotate` all true |
| MDL-01 | 02-01, 02-02 | User can view 3D anatomy models loaded from GLB files | SATISFIED | `ModelViewer.tsx` + `useGLTF` + `BottomToolbar` file picker; `public/models/body.glb` bundled |
| GEST-01 | 02-03 | User's hand is detected and tracked in real-time | SATISFIED | `useHandTracking` + `LandmarkCanvas` + `HandStatusIndicator` — full subsystem implemented |
| GEST-02 | 02-04 | User can pinch to grab, drag to rotate, two-hand pinch to scale | SATISFIED | `useGestureInterpreter` + `SceneController` — full gesture pipeline with hysteresis, dead zone, momentum |

No orphaned requirements: all four Phase 2 requirements (CAM-03, MDL-01, GEST-01, GEST-02) are claimed by plans and fully implemented.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | No TBD/FIXME/XXX/TODO/HACK/PLACEHOLDER markers found in any src/ file | — | — |

Scanned all modified Phase 2 files. No debt markers, no hardcoded empty return values in rendering paths, no stub implementations found. The `isPinching = false` placeholder documented in the 02-03 SUMMARY is correctly replaced in 02-04 — `App.tsx` now computes real pinch distance from landmark 4+8.

**Plan vs D-11 color inconsistency (informational, not a blocker):** Plan 02-04 Task 2 acceptance criteria states "pinch highlight dots turn blue (#2563EB) when pinching." The implementation uses green-500 (#22C55E), which is consistent with D-11 in the context document, the UI-SPEC, and the plan's own interface block. The task acceptance criterion contained a copy-paste error (blue is the Load Model button color). The implementation correctly follows the design spec.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| TypeScript compiles cleanly | `pnpm tsc --noEmit` | Exit code 0, no output | PASS |
| `@mediapipe/tasks-vision` importable | `node -e "require('./node_modules/@mediapipe/tasks-vision/package.json')"` | OK | PASS |
| `leva` importable | `node -e "require('./node_modules/leva/package.json')"` | OK | PASS |
| MediaPipe WASM files present | `ls public/mediapipe/wasm/` | 6 files (js + wasm pairs) | PASS |
| `body.glb` is a real GLB binary | `file public/models/body.glb` | "glTF binary model, version 2, length 50116 bytes" | PASS |
| `mp-spin` CSS animation declared | `grep mp-spin src/index.css` | `@keyframes mp-spin` + `.mp-spin` class found | PASS |

Step 7b: Live gesture and rendering behaviors (MediaPipe inference, OrbitControls mouse interaction, real-time canvas drawing) cannot be verified without a running browser with webcam access. These are routed to Human Verification Required below.

### Human Verification Required

#### 1. Hand Landmark Dots Visible in Real-Time

**Test:** Open `pnpm dev` in Chrome. Allow webcam. Hold one hand in front of the camera.
**Expected:** Within 5 seconds, 21 white dots appear on screen tracking the hand. Top-right indicator transitions from "Loading hand tracking..." to "Hand detected". Moving hand to the right moves dots to the right (mirrored feed confirmation).
**Why human:** MediaPipe WASM initialization and webcam frame processing require a running browser with physical webcam input. Cannot simulate MediaPipe inference in the build environment.

#### 2. OrbitControls Mouse Interaction

**Test:** Open `pnpm dev`. Left-drag on the skeleton model. Scroll to zoom. Right-drag to pan.
**Expected:** Model responds to all three mouse interactions. Skeleton auto-rotation stops when mouse is used to interact.
**Why human:** OrbitControls mouse/scroll event handling requires a running browser; cannot verify DOM event processing statically.

#### 3. Single-Hand Pinch Rotation with Dead Zone

**Test:** In browser with webcam, slowly bring thumb and index finger together until the top-right indicator does not change (confirm pinch is engaged by observing if LandmarkCanvas shows active-green dots on landmarks 4+8), then drag the hand left and right.
**Expected:** Model rotates when hand moves more than ~10px from pinch origin. Small jitter at pinch start does not cause rotation (dead zone). Mouse OrbitControls has no effect while pinching.
**Why human:** Requires physical hand and webcam; dead zone feel must be subjectively confirmed.

#### 4. Two-Hand Pinch-to-Scale

**Test:** Bring both hands into the webcam frame. Pinch both hands. Move hands apart and then together.
**Expected:** Model scales up as hands separate, scales down as hands approach. Scale does not exceed visible limits (min/max clamping at 0.2–5.0).
**Why human:** Two-hand gesture requires two physical hands and a running MediaPipe session.

#### 5. Load Model File Picker and Error Handling

**Test:** Click "Load Model" button. Select a valid .glb file. Then repeat with a .txt file renamed to .glb.
**Expected:** Valid GLB: spinner appears briefly, model loads centered and scaled to fill viewport, skeleton is replaced. Invalid file: error toast appears at bottom-right ("Could not load model. File may be corrupt..."), skeleton remains visible. Toast auto-dismisses after 5 seconds.
**Why human:** Requires browser file dialog interaction and runtime GLB parsing via Three.js GLTFLoader.

#### 6. Momentum Deceleration After Pinch Release

**Test:** Pinch and drag the model in a quick arc gesture, then release the pinch.
**Expected:** Model continues rotating in the same direction, decelerating smoothly and stopping within approximately 300ms. No abrupt stop on pinch release.
**Why human:** Momentum timing and feel are subjective and require physical gesture execution with a running R3F frame loop.

### Gaps Summary

No gaps found. All 4 roadmap success criteria are verified against codebase evidence. All 12 required artifacts exist, are substantive (not stubs), and are fully wired. All 4 requirement IDs (CAM-03, MDL-01, GEST-01, GEST-02) are satisfied by the implementation. The `isPinching` placeholder from plan 02-03 is correctly replaced in plan 02-04.

The `human_needed` status reflects that 6 behaviors require a running browser with a physical webcam to confirm end-to-end. The automated evidence (TypeScript, file existence, structural code analysis) is complete and passes.

---

_Verified: 2026-05-25_
_Verifier: Claude (gsd-verifier)_
