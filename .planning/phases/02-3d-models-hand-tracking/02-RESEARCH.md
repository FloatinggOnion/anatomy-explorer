# Phase 2: 3D Models & Hand Tracking - Research

**Researched:** 2026-05-24
**Domain:** GLB model loading, OrbitControls, MediaPipe hand tracking, gesture state machine
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Anatomy Model Loading**
- D-01: Keep the procedural skeleton as the default loaded model.
- D-02: Add a "Load Model" file picker button for .glb/.gltf files. No drag-and-drop.
- D-03: Loading a new GLB replaces the current model — one model visible at a time.
- D-04: Bundle 1-2 pre-built free GLB anatomy models as static assets.
- D-05: No file size limit on uploaded GLB files.
- D-06: Auto-fit loaded models — calculate bounding box, center, and scale to fit viewport.
- D-07: Show a spinner overlay while a GLB model is being parsed and loaded.
- D-08: On load failure, show a toast error message and keep the previous model. Non-destructive.

**Hand Tracking Feedback**
- D-09: Draw hand landmarks as minimal dots on a 2D HTML canvas between video (z:0) and R3F canvas (z:1).
- D-10: Hand detection status indicator top-right — hand icon with green/gray dot.
- D-11: Pinch highlight — thumb tip and index fingertip dots turn green when pinch recognized.
- D-12: Landmarks toggleable via UI button (default: visible).
- D-13: Hand tracking auto-starts when webcam is active.
- D-14: Track two hands simultaneously (numHands: 2).
- D-15: Throttle MediaPipe to 30fps; Three.js renders at 60fps.
- D-16: MediaPipe WASM loading is non-blocking — "Loading hand tracking..." status while mouse controls work.

**Pinch-to-Rotate Feel**
- D-17: Single-hand pinch+drag = trackball-style rotation.
- D-18: Two-hand pinch-to-scale: distance between pinch points maps to model scale.
- D-19: Dead zone ~10px of hand movement before rotation kicks in after pinching.
- D-20: Two-hand panning: same-direction movement = pan; apart/together = scale.
- D-21: Pinch distance threshold 0.05 (MediaPipe default).
- D-22: Expose gesture sensitivity values in Leva debug panel (dev-only).

**Mouse & Gesture Coexistence**
- D-23: Auto-switch: hand pinch detected = OrbitControls disabled; no gesture = mouse re-enables.
- D-24: drei's OrbitControls for mouse — left-drag = rotate, scroll = zoom, right-drag = pan.
- D-25: 0.5-second debounce when transitioning back to mouse from gesture.
- D-26: No visible input mode indicator.

**Webcam Mirroring**
- D-27: Mirror webcam feed horizontally (selfie-style).

**Model Lighting**
- D-28: Keep current lighting (ambient + single directional light). Upgrades deferred to Phase 4.

**UI Controls Layout**
- D-29: Semi-transparent horizontal bar at the bottom of the viewport for Load Model, landmark toggle.

### Claude's Discretion
- Model momentum/inertia after releasing a pinch — choose between smooth deceleration and instant stop based on what feels best for anatomy inspection.

### Deferred Ideas (OUT OF SCOPE)
- None — lighting upgrades noted for Phase 4 polish.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CAM-03 | User can rotate, zoom, and pan 3D model using mouse/keyboard as baseline controls | drei OrbitControls — drop-in, no imperative Three.js code needed |
| MDL-01 | User can view 3D anatomy models loaded from GLB files | drei useGLTF + R3F Suspense pattern — verified via Context7 |
| GEST-01 | User's hand detected and tracked in real-time via webcam | @mediapipe/tasks-vision HandLandmarker VIDEO mode — verified |
| GEST-02 | User can pinch to grab, drag to rotate, two-hand pinch to scale | Custom gesture interpreter layer on top of HandLandmarker landmarks |
</phase_requirements>

---

## Summary

Phase 2 integrates three independently working subsystems — GLB model loading, mouse orbit controls, and MediaPipe hand tracking — and wires them together through a gesture interpreter layer. Phase 1 delivered the DOM layer stack (video z:0 → R3F canvas z:1 → UI z:10) and the procedural skeleton. Phase 2 extends that foundation without structural changes: it adds a landmark canvas at z:0.5, promotes the skeleton to a swappable model slot, adds OrbitControls to the R3F scene, and introduces a HandTracker + GestureInterpreter subsystem that feeds scene transforms.

The three main work streams can be built in sequence: (1) OrbitControls + GLB loading gives mouse-driven model interaction; (2) MediaPipe landmark detection + canvas overlay gives visible hand feedback; (3) the gesture interpreter bridges hand landmarks to the same scene transforms that OrbitControls uses. The auto-switch between mouse and gesture (D-23) is the final wiring step.

The biggest technical risks are landmark jitter (smoothing required before any rotation calculation), the OrbitControls enable/disable handoff (requires access to the controls ref from outside R3F), and GLB auto-fit (bounding box centering is non-trivial on models with non-zero origins). Each has a verified mitigation.

**Primary recommendation:** Build in this order — OrbitControls → GLB loader with auto-fit → MediaPipe landmark canvas → gesture interpreter → auto-switch handoff. Keep OrbitControls working throughout; gesture control replaces it conditionally, never permanently.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Mouse orbit controls | R3F Scene (Canvas.tsx) | — | OrbitControls is a Three.js camera manipulator; belongs inside the R3F Canvas |
| GLB model loading | R3F Scene (new ModelViewer component) | Zustand store (model URL state) | R3F Suspense + useGLTF owns async load; store tracks which URL is active |
| Auto-fit / bounding box | R3F Scene (useEffect after model loads) | — | Requires access to Three.js Object3D; must run inside R3F context |
| Hand landmark detection | Standalone hook (useHandTracking) | WebcamRefContext (video ref) | MediaPipe runs outside R3F; consumes same video element WebcamProvider manages |
| Landmark canvas rendering | New LandmarkCanvas component (z:0.5) | — | 2D canvas overlaid between video and R3F; belongs in DOM layer stack, not in R3F |
| Gesture classification | GestureInterpreter (pure function/hook) | — | Stateless classification from raw landmarks; no Three.js dependency |
| Gesture → scene transform | SceneController (useFrame hook inside R3F) | — | Must apply transforms inside R3F render loop via useFrame |
| OrbitControls enable/disable | Ref held in R3F, toggled by Zustand state | Zustand (gestureActive flag) | Pattern: `<OrbitControls enabled={!gestureActive} ref={controlsRef}/>` |
| Bottom toolbar UI | App.tsx DOM overlay (z:10) | — | Standard React; sits above all canvas layers |
| Load Model file picker | Bottom toolbar UI | — | `<input type="file" accept=".glb,.gltf">` triggered from toolbar button |

---

## Standard Stack

### Core (already installed in project)

| Library | Installed Version | Latest | Purpose |
|---------|-------------------|--------|---------|
| @react-three/fiber | 9.0.0 | 9.6.1 | R3F renderer — Canvas, useFrame, Suspense integration |
| @react-three/drei | 10.7.7 | 10.7.7 | OrbitControls, useGLTF, Html, Loader — no custom code needed |
| three | 0.170.0 | 0.184.0 | Three.js — Box3, Vector3, Object3D for bounding box math |
| zustand | 5.0.0 | 5.0.0 | Extend store with model URL, gestureActive, landmarksVisible |

[VERIFIED: npm view, 2026-05-24]

Note: `three` is at 0.170.0 installed vs 0.184.0 latest. **Do not upgrade** — R3F 9.0.0 pins its Three.js peer. Upgrading Three.js without upgrading R3F risks peer dep mismatches. `@react-three/fiber` 9.6.1 is available but 9.0.0 is installed; also safe to leave pinned for this phase.

### New Dependency: MediaPipe

| Library | Version | Purpose |
|---------|---------|---------|
| @mediapipe/tasks-vision | 0.10.35 | HandLandmarker — 21 landmarks per hand, VIDEO mode for rAF loop |

[VERIFIED: npm view @mediapipe/tasks-vision version → 0.10.35, 2026-05-24]

**Install:**
```bash
pnpm add @mediapipe/tasks-vision
```

### New Dependency: Leva (dev debug panel)

| Library | Version | Purpose |
|---------|---------|---------|
| leva | 0.10.1 (latest) | Expose gesture sensitivity values in dev-only panel (D-22) |

[VERIFIED: npm view leva version → 0.10.1, 2026-05-24]

**Install:**
```bash
pnpm add leva
```

### Already Available (no install needed)

- `drei OrbitControls` — part of @react-three/drei 10.7.7 [VERIFIED]
- `drei useGLTF` — part of @react-three/drei 10.7.7 [VERIFIED]
- `drei Loader` — progress indicator during GLTF load [VERIFIED]

---

## Architecture Patterns

### System Architecture Diagram

```
User Input (hand / mouse)
         |
         +---> [Mouse]  OrbitControls (drei) ←── enabled={!gestureActive}
         |                    |
         |              camera transforms
         |
         +---> [Hand]   webcam <video> element (z:0, WebcamProvider)
                          |
                          +--> LandmarkCanvas (z:0.5) ← draws dots, 30fps
                          |
                          +--> useHandTracking hook
                                  |
                                  v
                          HandLandmarker.detectForVideo()   [30fps rAF loop]
                                  |
                                  v
                          GestureInterpreter (pure)
                          - pinch distance < 0.05?
                          - dead zone 10px?
                          - two-hand distance delta?
                                  |
                                  v
                          GestureCommand { rotate | scale | pan | idle }
                                  |
                                  v
                          useFrame (60fps, inside R3F)
                          SceneController reads gestureCommandRef
                                  |
                    +-------------+-------------+
                    |                           |
             rotate model                  scale model
             (quaternion delta)            (clamped factor)

                    R3F Canvas (z:1, transparent background)
                    └── ModelViewer
                         └── <primitive object={gltf.scene} />
                              ← auto-fit on load (bounding box)
                              ← Suspense spinner while loading

                    Bottom Toolbar (z:10)
                    └── [Load Model] [Hide Landmarks] [Hand status indicator]
```

### Recommended Project Structure Extensions

```
src/
├── components/
│   ├── Canvas.tsx              # EXTEND: add OrbitControls, swap SkeletonPreview → ModelViewer
│   ├── ModelViewer.tsx         # NEW: loads GLB via useGLTF, auto-fit, Suspense-compatible
│   ├── LandmarkCanvas.tsx      # NEW: 2D canvas overlay at z:0.5 for hand dots
│   ├── HandStatusIndicator.tsx # NEW: top-right green/gray dot indicator
│   ├── BottomToolbar.tsx       # NEW: Load Model button, landmark toggle
│   ├── SkeletonPreview.tsx     # KEEP: default model — wrapped by ModelViewer or rendered directly
│   ├── WebcamProvider.tsx      # NO CHANGE: provides video ref
│   └── PrePermissionScreen.tsx # NO CHANGE
├── hooks/
│   ├── useHandTracking.ts      # NEW: MediaPipe HandLandmarker loop, returns landmarks
│   ├── useGestureInterpreter.ts # NEW: landmarks → GestureCommand
│   ├── useSkeletonAnimation.ts # MODIFY: pause auto-rotation when gestureActive or model loaded
│   └── useWebcam.ts            # NO CHANGE
├── store/
│   └── appState.ts             # EXTEND: add modelUrl, gestureActive, landmarksVisible, handDetected
├── context/
│   └── WebcamRefContext.ts     # NO CHANGE
└── types/
    └── gestures.ts             # NEW: GestureCommand, HandLandmarks types
```

### Pattern 1: OrbitControls with External Enable/Disable

OrbitControls must be disabled when gesture input is active (D-23). The pattern is to hold a ref to the controls and read a Zustand flag.

```tsx
// Source: drei OrbitControls docs — enabled prop is reactive
import { OrbitControls } from '@react-three/drei';
import { useRef } from 'react';
import { useAppStore } from '@/store/appState';

function SceneControls() {
  const controlsRef = useRef(null);
  const gestureActive = useAppStore((s) => s.gestureActive);

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={!gestureActive}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={1}
      maxDistance={10}
    />
  );
}
```

[ASSUMED] — `enabled` prop reactivity on OrbitControls in drei 10.x behaves correctly with Zustand subscription. This is the documented pattern but needs a quick smoke test during Wave 0 since some drei versions have had reactivity quirks with this prop.

### Pattern 2: GLB Loading with Auto-Fit (useGLTF + bounding box)

```tsx
// Source: drei useGLTF docs + Three.js Box3 API
import { useGLTF } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import { Box3, Vector3 } from 'three';

function ModelViewer({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    const box = new Box3().setFromObject(groupRef.current);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());

    // Center the model
    groupRef.current.position.sub(center);

    // Scale to fit ~2 units tall (viewport-friendly)
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      const scale = 2 / maxDim;
      groupRef.current.scale.setScalar(scale);
    }
  }, [scene]);

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}
```

[VERIFIED: Three.js Box3 API — standard approach used widely in GLB loading contexts]

**Critical:** Clone the scene when loading multiple models or re-loading the same URL, to avoid Three.js shared geometry/material mutations. `useGLTF` caches by URL; if the same URL is loaded twice, the same scene graph is returned. Use `drei`'s `useGLTF.preload()` for bundled models.

### Pattern 3: File Picker for User GLB Upload

```tsx
// Source: standard DOM API — no library needed
function LoadModelButton() {
  const setModelUrl = useAppStore((s) => s.setModelUrl);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setModelUrl(url);
    // Revoke previous object URL to prevent memory leak
  };

  return (
    <>
      <input
        type="file"
        accept=".glb,.gltf"
        style={{ display: 'none' }}
        id="model-file-input"
        onChange={handleFileChange}
      />
      <label htmlFor="model-file-input">Load Model</label>
    </>
  );
}
```

Object URLs created with `URL.createObjectURL()` persist in memory until explicitly revoked. Track the current object URL in the store and call `URL.revokeObjectURL(prevUrl)` when replacing. [ASSUMED — memory leak risk from missed revocation; pattern is standard but easy to forget]

### Pattern 4: MediaPipe HandLandmarker Initialization (tasks-vision)

```typescript
// Source: Google MediaPipe tasks-vision official docs
// https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

async function initHandLandmarker(): Promise<HandLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
  );
  const handLandmarker = await HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numHands: 2,
    minHandDetectionConfidence: 0.7,
    minHandPresenceConfidence: 0.7,
    minTrackingConfidence: 0.6,
  });
  return handLandmarker;
}
```

[VERIFIED: Official Google MediaPipe tasks-vision v0.10.35 docs — this is the exact API]

**WASM loading note (D-16):** `FilesetResolver.forVisionTasks()` downloads ~5MB of WASM from jsdelivr CDN at runtime. This is intentionally non-blocking — do not await it before rendering the 3D scene. Set `handTrackingReady: false` in store, flip to `true` when the promise resolves.

**Tauri note:** The CDN URL works in Tauri's webview. Alternatively, copy WASM files to `public/mediapipe/` and use a relative path — more robust for offline/Tauri builds. The `locateFile` option in older APIs is replaced by the `wasm` path in `FilesetResolver`.

### Pattern 5: MediaPipe Detection Loop (30fps throttled)

```typescript
// Source: MediaPipe tasks-vision VIDEO mode pattern
// Matches D-15: 30fps MediaPipe, 60fps Three.js
let lastDetectionTime = 0;
const DETECTION_INTERVAL_MS = 33; // ~30fps

function detectionLoop(
  handLandmarker: HandLandmarker,
  video: HTMLVideoElement,
  onResults: (results: HandLandmarkerResult) => void
) {
  const now = performance.now();
  if (now - lastDetectionTime >= DETECTION_INTERVAL_MS) {
    if (video.readyState >= 2) { // HAVE_CURRENT_DATA
      const results = handLandmarker.detectForVideo(video, now);
      onResults(results);
      lastDetectionTime = now;
    }
  }
  requestAnimationFrame(() => detectionLoop(handLandmarker, video, onResults));
}
```

[VERIFIED: Official MediaPipe docs — detectForVideo takes timestamp in ms, VIDEO mode required for frame-by-frame]

### Pattern 6: Gesture State Machine with Hysteresis

Prevents pinch flicker (Pitfall 3). Uses separate enter/exit thresholds and dead zone (D-19, D-21).

```typescript
// Source: Architecture research (PITFALLS.md Pitfall 3) + D-19, D-21
const PINCH_ENTER_THRESHOLD = 0.05;  // D-21
const PINCH_EXIT_THRESHOLD = 0.08;   // hysteresis band ~60% larger
const DEAD_ZONE_PX = 10;             // D-19

interface GestureState {
  mode: 'idle' | 'pinching' | 'two-hand-pinch';
  pinchOriginScreen: { x: number; y: number } | null;
  accumulatedDelta: { x: number; y: number };
}

function interpretGestures(
  landmarks: NormalizedLandmark[][],
  prevState: GestureState,
  videoWidth: number,
  videoHeight: number
): { state: GestureState; command: GestureCommand } {
  const hands = landmarks; // up to 2 hands

  if (hands.length === 0) {
    return { state: { mode: 'idle', pinchOriginScreen: null, accumulatedDelta: {x:0,y:0} }, command: { type: 'idle' } };
  }

  // Single hand pinch detection
  const hand = hands[0];
  const thumbTip = hand[4];
  const indexTip = hand[8];
  const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);

  const wasPinching = prevState.mode === 'pinching';
  const threshold = wasPinching ? PINCH_EXIT_THRESHOLD : PINCH_ENTER_THRESHOLD;
  const isPinching = pinchDist < threshold;

  if (isPinching) {
    const handCenter = { x: hand[9].x * videoWidth, y: hand[9].y * videoHeight };
    if (!wasPinching) {
      // Pinch just started — establish origin
      return { state: { mode: 'pinching', pinchOriginScreen: handCenter, accumulatedDelta: {x:0,y:0} }, command: { type: 'idle' } };
    }
    // Already pinching — compute delta from origin
    const delta = { x: handCenter.x - prevState.pinchOriginScreen!.x, y: handCenter.y - prevState.pinchOriginScreen!.y };
    const magnitude = Math.hypot(delta.x, delta.y);
    if (magnitude < DEAD_ZONE_PX) {
      return { state: prevState, command: { type: 'idle' } }; // D-19: dead zone
    }
    return {
      state: { ...prevState, pinchOriginScreen: handCenter }, // update origin for incremental
      command: { type: 'rotate', delta }
    };
  }

  return { state: { mode: 'idle', pinchOriginScreen: null, accumulatedDelta: {x:0,y:0} }, command: { type: 'idle' } };
}
```

[ASSUMED] — The exact pinch hysteresis values (0.05 / 0.08) are starting points from architecture research. Leva panel (D-22) must expose these for tuning.

### Pattern 7: Landmark Canvas (mirrored 2D overlay)

```tsx
// Matches D-09, D-11, D-27
function LandmarkCanvas({ landmarks, videoRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    const ctx = canvas.getContext('2d')!;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Mirror transform to match mirrored video (D-27)
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    for (const hand of landmarks) {
      hand.forEach((lm, i) => {
        const isPinchPoint = i === 4 || i === 8;
        ctx.beginPath();
        ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 5, 0, Math.PI * 2);
        ctx.fillStyle = isPinchPoint && isPinching ? '#00ff00' : '#ffffff'; // D-11
        ctx.fill();
      });
    }

    ctx.restore();
  }, [landmarks, isPinching]);

  return (
    <canvas
      ref={canvasRef}
      width={videoRef.current?.videoWidth ?? 640}
      height={videoRef.current?.videoHeight ?? 480}
      style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: 0.5, pointerEvents: 'none' }}
    />
  );
}
```

[ASSUMED] — CSS `zIndex: 0.5` between integer z-indices (0 and 1) may not be supported in all browsers. A safer approach is `zIndex: 1` with `pointerEvents: 'none'` and ensuring the R3F canvas also has `pointerEvents: 'none'` while the landmark canvas is behind it. Verify during Wave 0.

### Pattern 8: Zustand Store Extension

```typescript
// src/store/appState.ts — extend existing store
interface AppState {
  // Phase 1 (existing)
  permissionState: PermissionState;
  setPermissionState: (state: PermissionState) => void;

  // Phase 2 additions
  modelUrl: string | null;          // null = show procedural skeleton
  setModelUrl: (url: string | null) => void;

  gestureActive: boolean;           // true = OrbitControls disabled
  setGestureActive: (v: boolean) => void;

  landmarksVisible: boolean;        // D-12 toggle
  setLandmarksVisible: (v: boolean) => void;

  handDetected: boolean;            // D-10 status indicator
  setHandDetected: (v: boolean) => void;

  handTrackingReady: boolean;       // D-16 non-blocking load
  setHandTrackingReady: (v: boolean) => void;

  modelLoadError: string | null;    // D-08 toast error
  setModelLoadError: (msg: string | null) => void;
}
```

### Anti-Patterns to Avoid

- **Running detectForVideo inside useFrame:** Blocks the 60fps render loop with 15-30ms inference. Always run on a separate rAF loop. (ARCHITECTURE.md Anti-Pattern 2)
- **CSS zIndex 0.5 for landmark canvas:** Non-integer z-index values can have inconsistent cross-browser behavior. Use z:1 with pointerEvents:none and careful ordering instead.
- **Using VideoTexture for webcam:** Already established as forbidden in Phase 1. Do not introduce it in any model loading code either.
- **Not cloning GLTF scenes:** `useGLTF` caches the same object reference. Mutating position/scale on the loaded scene persists across "reloads" of the same URL.
- **OrbitControls with hard-coded `enabled={false}`:** Must be reactive — reads from Zustand not a static prop. Static false breaks the mouse fallback permanently.
- **Calling `URL.revokeObjectURL` immediately after setting state:** React state updates are async; revoke the *previous* URL only after the new model has successfully loaded.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mouse orbit controls | Custom quaternion drag handler | `drei <OrbitControls>` | Handles edge cases: gimbal lock, zoom limits, pan sensitivity, touch, inertia |
| GLB loading + progress | Manual fetch + GLTFLoader | `drei useGLTF` + `<Suspense>` | Caching, error boundary integration, Draco decoder support built in |
| Bounding box fit | Custom AABB algorithm | `THREE.Box3().setFromObject()` | One-liner from Three.js core; handles nested groups and transforms |
| Landmark smoothing | Manual rolling average array | 5-frame circular buffer (simple JS) | Acceptable hand-roll: it's 10 lines; no library justified for this |
| Gesture threshold tuning | Hardcoded constants | `leva` debug panel | Hot-reload value changes during dev without code changes |
| Loading spinner | Custom CSS animation | `drei <Loader>` or simple CSS | drei Loader matches R3F Suspense lifecycle automatically |

**Key insight:** OrbitControls and useGLTF are the most complex pieces in this phase. Both have subtle edge cases (gimbal lock, model centering, Draco support) that drei solves. Do not replace them with custom implementations under any timeline pressure.

---

## Common Pitfalls

### Pitfall A: OrbitControls Reactivity to `enabled` Prop

**What goes wrong:** Changing `enabled` prop on `<OrbitControls>` may not immediately stop mouse event propagation if the controls internally cache their enabled state on mount.
**Why it happens:** Some drei versions update the underlying Three.js controls only on the next frame after React prop change.
**How to avoid:** Test the auto-switch (D-23) immediately in Wave 0 smoke test. If `enabled` prop lag is visible, supplement with `controls.enabled = false` imperatively via the ref: `controlsRef.current.enabled = false`.
**Warning signs:** Mouse still rotates model 1-2 frames after hand pinch is detected.

### Pitfall B: GLB Auto-Fit on Models with Non-Zero Origins

**What goes wrong:** Many anatomy GLBs have their origin at the floor (feet), not the centroid. Centering via `sub(center)` still leaves the model appearing off-center visually because the camera orbits around world origin (0,0,0), not the mesh centroid.
**Why it happens:** Box3 center is geometric centroid of the bounding box, not the mesh's local origin.
**How to avoid:** After centering and scaling, also reset the OrbitControls target: `controlsRef.current.target.set(0, 0, 0)`. Call `controls.update()` after target change.
**Warning signs:** Model appears low or high in frame after loading; orbit feels off-axis.

### Pitfall C: MediaPipe CDN Dependency in Tauri

**What goes wrong:** MediaPipe WASM and model file load from jsdelivr CDN. In a Tauri desktop build, if the machine is offline or the CDN is blocked, hand tracking silently fails.
**Why it happens:** MediaPipe v0.10.35 uses CDN-hosted assets by default.
**How to avoid:** For the capstone demo, copy WASM files to `public/mediapipe/wasm/` and the `.task` model file to `public/mediapipe/`. Update `FilesetResolver.forVisionTasks()` to point to `/mediapipe/wasm`. This makes the Tauri build fully offline. Budget: ~6MB of static assets in `public/`.
**Warning signs:** Hand tracking status stays "Loading..." indefinitely in Tauri build; works fine in browser dev.

### Pitfall D: Object URL Memory Leak from Model Loading

**What goes wrong:** Each time a user loads a GLB file, `URL.createObjectURL(file)` creates a persistent memory allocation. Without `URL.revokeObjectURL()`, loading 10 models wastes ~10x the RAM of each model.
**Why it happens:** Object URLs are not garbage collected until explicitly revoked or the page unloads.
**How to avoid:** Store the current object URL in a ref (not Zustand — no need to re-render on URL change). Before setting a new URL, revoke the previous one. Only revoke *after* the new model successfully loads (non-destructive per D-08).
**Warning signs:** Memory usage climbs steadily in DevTools Memory tab as user loads multiple models.

### Pitfall E: Landmark Canvas Dimensions Out of Sync with Video

**What goes wrong:** The landmark canvas is drawn at the wrong scale because its pixel dimensions don't match the video's actual stream resolution.
**Why it happens:** `video.videoWidth`/`videoHeight` are the stream dimensions (e.g., 640x480), but the video element is CSS-scaled to fill `100vw × 100vh`. The canvas must use stream dimensions for drawing and CSS scaling for display.
**How to avoid:** Set `canvas.width = video.videoWidth` and `canvas.height = video.videoHeight` (stream resolution). Use CSS `width: 100vw; height: 100vh; object-fit: cover` for display scaling — same as the `<video>` element.
**Warning signs:** Landmarks appear offset from the actual hand position, especially on non-16:9 screens.

### Pitfall F: Auto-Rotation Conflicts with OrbitControls

**What goes wrong:** The existing `useSkeletonAnimation.ts` auto-rotates the skeleton via `useFrame`. When a real model loads, the auto-rotation continues, fighting with OrbitControls and gesture input.
**How to avoid:** Add a condition to `useSkeletonAnimation` — only rotate when `modelUrl === null` (procedural skeleton active) AND `!gestureActive`. Stop rotation as soon as a real model loads or user interacts.
**Warning signs:** Loaded model spins slowly even when user is trying to hold it still.

---

## Runtime State Inventory

Step 2.5 SKIPPED — this is a greenfield feature addition phase, not a rename/refactor/migration phase.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| pnpm | Package install | ✓ | (project standard) | — |
| @mediapipe/tasks-vision | GEST-01, GEST-02 | not yet installed | 0.10.35 on npm | — (no fallback; required) |
| leva | D-22 debug panel | not yet installed | 0.10.1 on npm | Hardcode constants during dev |
| drei OrbitControls | CAM-03 | ✓ (in @react-three/drei 10.7.7) | 10.7.7 | — |
| drei useGLTF | MDL-01 | ✓ (in @react-three/drei 10.7.7) | 10.7.7 | — |
| Vite dev server | Build | ✓ | (project standard) | — |
| Tauri webview | Platform testing | ✓ | v2 (project standard) | Browser dev acceptable during dev |

[VERIFIED: package.json inspection, npm view, 2026-05-24]

**Missing dependencies with no fallback:**
- `@mediapipe/tasks-vision` — required for GEST-01, GEST-02. Must install before gesture work begins.

**Missing dependencies with fallback:**
- `leva` — helpful for D-22 but gesture sensitivity can be hardcoded during initial dev.

---

## Bundled Anatomy Model Research

The CONTEXT.md (D-04) requires 1-2 free GLB anatomy models bundled as static assets. Research findings:

| Source | Model | License | File Size | Named Hierarchy | Notes |
|--------|-------|---------|-----------|-----------------|-------|
| Sketchfab | Human Skeleton (various CC0) | CC0/CC-BY | Varies 1-20MB | Sometimes | Filter: downloadable + CC0. Quality varies. |
| AnatomyTOOL / Open3DModel | Skeletal system | GPL3 | Unknown | Yes (purpose-built) | GPL3 may affect distribution — check terms |
| KenHub (educational) | Skeleton | CC-BY-NC | Unknown | Unknown | NC license restricts demo distribution |
| free3d.com | Various anatomy | Free for personal | Varies | Varies | License unclear for capstone/academic use |

[ASSUMED] — Specific model availability, exact file sizes, and license details require manual verification by downloading and inspecting. The research has identified sources but cannot confirm a specific recommended model without manual download+inspection.

**Recommendation for D-04:** During Wave 0, download 2-3 candidate models from Sketchfab (CC0 filter), measure file size, check mesh hierarchy naming, and pick the best two. Target under 5MB each (Pitfall 4 from Phase 1 research). If raw models are too large, run `gltf-transform optimize` (already identified in PITFALLS.md) to compress them before bundling.

**Optimization command (if needed):**
```bash
npx gltf-transform optimize input.glb output-optimized.glb --texture-compress webp
```

---

## Code Examples

### Extending Zustand Store (additive, backward-compatible)
```typescript
// src/store/appState.ts
export const useAppStore = create<AppState>((set) => ({
  // Phase 1 (unchanged)
  permissionState: 'unknown',
  setPermissionState: (state) => set({ permissionState: state }),
  // Phase 2
  modelUrl: null,
  setModelUrl: (url) => set({ modelUrl: url }),
  gestureActive: false,
  setGestureActive: (v) => set({ gestureActive: v }),
  landmarksVisible: true,
  setLandmarksVisible: (v) => set({ landmarksVisible: v }),
  handDetected: false,
  setHandDetected: (v) => set({ handDetected: v }),
  handTrackingReady: false,
  setHandTrackingReady: (v) => set({ handTrackingReady: v }),
  modelLoadError: null,
  setModelLoadError: (msg) => set({ modelLoadError: msg }),
}));
```

### App.tsx Layer Stack Extension
```tsx
// App.tsx — add LandmarkCanvas at z:0.5 (actually z:1 with pointer-events:none)
// and Bottom Toolbar at z:10
export default function App() {
  return (
    <WebcamProvider>
      {/* z:0 — Video background (WebcamProvider) */}

      {/* z:1 — Landmark canvas (pointer-events:none, visually between video and 3D) */}
      <LandmarkCanvas style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'none' }} />

      {/* z:2 — R3F Canvas with 3D model */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'auto' }}>
        <Canvas />
      </div>

      {/* z:10 — UI overlays */}
      <HandStatusIndicator />
      <BottomToolbar />
    </WebcamProvider>
  );
}
```

Note: z-index values shift from Phase 1 (video:0, R3F:1, UI:10) to (video:0, landmarks:1, R3F:2, UI:10). This is a breaking change to the existing App.tsx — must update existing z-index assignments.

### Debounced Gesture-to-Mouse Handoff (D-25)
```typescript
// 0.5s debounce when returning to mouse mode
let gestureOffTimer: ReturnType<typeof setTimeout> | null = null;

function handleGestureResults(hasActiveGesture: boolean) {
  if (hasActiveGesture) {
    if (gestureOffTimer) clearTimeout(gestureOffTimer);
    setGestureActive(true);
  } else {
    if (gestureOffTimer) clearTimeout(gestureOffTimer);
    gestureOffTimer = setTimeout(() => setGestureActive(false), 500); // D-25
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@mediapipe/hands` (npm) | `@mediapipe/tasks-vision` HandLandmarker | ~2022 | Old package deprecated; use tasks-vision exclusively |
| OrbitControls from `three/examples` | `@react-three/drei` OrbitControls | R3F ecosystem matured | No manual import path; drei wraps and manages lifecycle |
| Manual GLTFLoader + useEffect | `drei useGLTF` + React Suspense | R3F/drei v9+ | Cleaner async model loading with automatic suspense fallback |
| Non-normalized landmark coords | Normalized 0-1 coordinates | MediaPipe tasks-vision | All x,y are 0-1 relative to video frame; multiply by videoWidth/Height for px |

**Deprecated/outdated:**
- `@mediapipe/hands`: Last published 3 years ago. Do not use. [VERIFIED: npm view]
- `drei useLoader(GLTFLoader, url)`: Still works but `useGLTF` is the idiomatic drei wrapper. [ASSUMED]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `enabled` prop on drei OrbitControls is fully reactive to Zustand state changes without frame lag | Pattern 1: OrbitControls | Mouse controls may not disable cleanly on pinch start; fix: imperatively set via ref |
| A2 | CSS zIndex 0.5 between layers is reliable cross-browser for landmark canvas | Pattern 7: Landmark Canvas | Landmark canvas may stack incorrectly; fix: shift to integer z-indices (recommended in code example above) |
| A3 | `URL.createObjectURL` object URLs are the correct approach for user-loaded GLB files | Pattern 3: File Picker | Three.js or useGLTF may not handle blob: URLs — test in Wave 0 |
| A4 | Specific free anatomy GLB models meeting all criteria (CC0, <5MB, named hierarchy) are available on Sketchfab | Bundled Model Research | Must manually verify; plan should include a Wave 0 task to download and validate candidates |
| A5 | Pinch hysteresis thresholds (0.05 enter, 0.08 exit) and dead zone (10px) will feel natural without major tuning | Pattern 6: Gesture State Machine | May need adjustment; Leva panel (D-22) is the mitigation |
| A6 | drei `useGLTF` caching by URL causes scene mutation side-effects if the same URL is reloaded | Pattern 2: GLB Loading | If wrong, no action needed; if right, must clone scene before mutation |

---

## Open Questions (RESOLVED)

1. **Non-integer z-index for landmark canvas** (RESOLVED)
   - Decision: Use integer z-index stack — video:0, landmark canvas:1 (pointerEvents:none), R3F canvas:2, UI:10.
   - Rationale: Non-integer z-index values have inconsistent behavior in Chromium-based browsers and are unreliable in WebView2 (Tauri/Windows). Integer stack is safe across all targets.
   - Impact: App.tsx R3F canvas wrapper shifts from zIndex:1 to zIndex:2. Plans 02-01 and 02-03 updated to reflect this.

2. **MediaPipe GPU delegate in Tauri WebView2 (Windows)** (RESOLVED)
   - Decision: Initialize with delegate: 'GPU'; catch any HandLandmarker.createFromOptions exception and retry with delegate: 'CPU'. Log which delegate succeeded in DEV mode.
   - Rationale: WebView2 supports WebGL and GPU delegate typically works; CPU fallback handles edge cases without impacting the core feature.
   - Impact: useHandTracking.ts implements this try/catch pattern (Plan 02-03 Task 1).

3. **Procedural skeleton auto-rotation stop condition** (RESOLVED)
   - Decision: Add isActive flag to useSkeletonAnimation. Set isActive = false when modelUrl !== null (real model loaded) OR gestureActive becomes true. Halting the useFrame update is sufficient — no rotation state reset needed because OrbitControls and SceneController manage their own transform state independently.
   - Impact: useSkeletonAnimation.ts modified in Plan 02-02 to read modelUrl and gestureActive from the Zustand store.

---

## Sources

### Primary (HIGH confidence)
- `@react-three/drei` npm 10.7.7 — OrbitControls, useGLTF, Loader verified via package.json
- `@mediapipe/tasks-vision` v0.10.35 — HandLandmarker VIDEO mode API [CITED: ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js]
- `three` 0.170.0 — Box3, Vector3 bounding box API [CITED: threejs.org/docs]
- `.planning/research/PITFALLS.md` — Phase 1 pitfall research (jitter, WASM loading, VideoTexture)
- `.planning/research/ARCHITECTURE.md` — Dual-loop, gesture command abstraction, component boundaries

### Secondary (MEDIUM confidence)
- `.planning/research/STACK.md` — Technology choices validated in Phase 1
- Phase 1 codebase inspection — confirmed existing DOM layer stack, Zustand store shape, component file locations

### Tertiary (LOW confidence / ASSUMED)
- Bundled anatomy model availability — requires manual download+validation during Wave 0
- Gesture threshold values (0.05 pinch, 10px dead zone) — starting values from architecture research, need tuning

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified via npm view and package.json; drei APIs confirmed
- Architecture: HIGH — patterns derived from Phase 1 research + codebase inspection; few novel assumptions
- MediaPipe integration: HIGH — official Google docs verified for tasks-vision 0.10.35
- Gesture thresholds: LOW — starting values only; Leva panel is the mitigation
- Bundled model assets: LOW — sources identified but specific models need manual validation

**Research date:** 2026-05-24
**Valid until:** 2026-06-07 (stable ecosystem; MediaPipe API unlikely to change in 2 weeks)
