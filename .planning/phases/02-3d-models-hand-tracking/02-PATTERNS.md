# Phase 2: 3D Models & Hand Tracking - Pattern Map

**Mapped:** 2026-05-24
**Files analyzed:** 10 new/modified files
**Analogs found:** 9 / 10

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/store/appState.ts` | store | CRUD | `src/store/appState.ts` (self — extend) | exact |
| `src/components/Canvas.tsx` | component | request-response | `src/components/Canvas.tsx` (self — extend) | exact |
| `src/components/ModelViewer.tsx` | component | file-I/O + request-response | `src/components/SkeletonPreview.tsx` | role-match |
| `src/components/LandmarkCanvas.tsx` | component | event-driven | `src/components/WebcamProvider.tsx` (DOM layer pattern) | partial |
| `src/components/HandStatusIndicator.tsx` | component | event-driven | `src/components/PrePermissionScreen.tsx` | role-match |
| `src/components/BottomToolbar.tsx` | component | request-response | `src/components/PrePermissionScreen.tsx` | role-match |
| `src/hooks/useHandTracking.ts` | hook | event-driven | `src/hooks/useWebcam.ts` | role-match |
| `src/hooks/useGestureInterpreter.ts` | hook | transform | `src/hooks/useSkeletonAnimation.ts` | role-match |
| `src/hooks/useSkeletonAnimation.ts` | hook | event-driven | `src/hooks/useSkeletonAnimation.ts` (self — modify) | exact |
| `src/types/gestures.ts` | utility | — | none | no analog |

---

## Pattern Assignments

### `src/store/appState.ts` (store, CRUD — extend existing)

**Analog:** `src/store/appState.ts` (lines 1–13 — self-extension)

**Existing imports pattern** (lines 1):
```typescript
import { create } from 'zustand';
```

**Existing store shape** (lines 3–13):
```typescript
export type PermissionState = 'granted' | 'denied' | 'pending' | 'unknown';

interface AppState {
  permissionState: PermissionState;
  setPermissionState: (state: PermissionState) => void;
}

export const useAppStore = create<AppState>((set) => ({
  permissionState: 'unknown',
  setPermissionState: (state: PermissionState) => set({ permissionState: state }),
}));
```

**Extension pattern — add these fields to the AppState interface and create() call:**
```typescript
// Phase 2 additions — append to AppState interface
modelUrl: string | null;          // null = show procedural skeleton
setModelUrl: (url: string | null) => void;

gestureActive: boolean;           // true = OrbitControls disabled (D-23)
setGestureActive: (v: boolean) => void;

landmarksVisible: boolean;        // D-12 toggle
setLandmarksVisible: (v: boolean) => void;

handDetected: boolean;            // D-10 status indicator
setHandDetected: (v: boolean) => void;

handTrackingReady: boolean;       // D-16 non-blocking WASM load
setHandTrackingReady: (v: boolean) => void;

modelLoadError: string | null;    // D-08 toast error message
setModelLoadError: (msg: string | null) => void;
```

**Each setter follows the identical pattern already established:**
```typescript
setModelUrl: (url) => set({ modelUrl: url }),
```

---

### `src/components/Canvas.tsx` (component, request-response — extend existing)

**Analog:** `src/components/Canvas.tsx` (self — lines 1–30)

**Existing full file** (lines 1–30):
```tsx
import { Suspense } from 'react';
import { Canvas as R3FCanvas } from '@react-three/fiber';
import { SkeletonPreview } from './SkeletonPreview';

function FallbackPlaceholder() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#888888" wireframe />
    </mesh>
  );
}

export function Canvas() {
  return (
    <R3FCanvas
      gl={{ alpha: true, antialias: true }}
      style={{ background: 'transparent' }}
      camera={{ position: [0, 0, 3], fov: 75 }}
      dpr={window.devicePixelRatio}
      performance={{ min: 0.5, max: 1 }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1.0} />

      <Suspense fallback={<FallbackPlaceholder />}>
        <SkeletonPreview />
      </Suspense>
    </R3FCanvas>
  );
}
```

**Extension: add OrbitControls inside R3FCanvas, swap SkeletonPreview for ModelViewer:**
```tsx
import { OrbitControls } from '@react-three/drei';
import { useAppStore } from '@/store/appState';
import { ModelViewer } from './ModelViewer';

// Inside Canvas() function body, before return:
const gestureActive = useAppStore((s) => s.gestureActive);
const controlsRef = useRef(null);

// Inside <R3FCanvas>:
<OrbitControls
  ref={controlsRef}
  enabled={!gestureActive}
  enablePan={true}
  enableZoom={true}
  enableRotate={true}
  minDistance={1}
  maxDistance={10}
/>
<Suspense fallback={<FallbackPlaceholder />}>
  <ModelViewer controlsRef={controlsRef} />
</Suspense>
```

**Note on controlsRef forwarding:** Pass `controlsRef` as a prop to ModelViewer so auto-fit can call `controlsRef.current.target.set(0,0,0)` after bounding box centering (Pitfall B in RESEARCH.md).

---

### `src/components/ModelViewer.tsx` (component, file-I/O + request-response — new)

**Analog:** `src/components/SkeletonPreview.tsx` (lines 1–10 — R3F component with useFrame + useRef pattern)

**Imports pattern from analog** (SkeletonPreview.tsx lines 1–4):
```typescript
import { useRef } from 'react';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { useSkeletonAnimation } from '@/hooks/useSkeletonAnimation';
```

**ModelViewer imports pattern (copy this structure):**
```typescript
import { useRef, useEffect } from 'react';
import type { Group } from 'three';
import { Box3, Vector3 } from 'three';
import { useGLTF } from '@react-three/drei';
import { useAppStore } from '@/store/appState';
import { SkeletonPreview } from './SkeletonPreview';
```

**Core pattern — useGLTF + auto-fit in useEffect:**
```tsx
function GLBModel({ url, controlsRef }: { url: string; controlsRef: React.RefObject<any> }) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;
    const box = new Box3().setFromObject(groupRef.current);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());

    // Center model at world origin
    groupRef.current.position.sub(center);

    // Scale to fit ~2 units (viewport-friendly)
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      groupRef.current.scale.setScalar(2 / maxDim);
    }

    // Reset OrbitControls target after centering (Pitfall B)
    if (controlsRef?.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [scene, controlsRef]);

  return (
    <group ref={groupRef}>
      <primitive object={scene} />
    </group>
  );
}

export function ModelViewer({ controlsRef }: { controlsRef: React.RefObject<any> }) {
  const modelUrl = useAppStore((s) => s.modelUrl);
  const modelLoadError = useAppStore((s) => s.modelLoadError);

  if (modelUrl === null) {
    return <SkeletonPreview />;   // D-01: procedural skeleton as default
  }

  return <GLBModel url={modelUrl} controlsRef={controlsRef} />;
}
```

**Error boundary pattern** — wrap GLBModel in an ErrorBoundary to implement D-08 (keep previous model on load failure).

---

### `src/components/LandmarkCanvas.tsx` (component, event-driven — new)

**Analog:** `src/components/WebcamProvider.tsx` (DOM layer stacking pattern, lines 19–22)

**DOM layer pattern from analog** (WebcamProvider.tsx lines 19–21):
```tsx
style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', objectFit: 'cover', zIndex: 0 }}
```

**Context consumption pattern from analog** (WebcamProvider.tsx lines 1–8):
```typescript
import { useWebcam } from '@/hooks/useWebcam';
import { WebcamRefContext } from '@/context/WebcamRefContext';
```

**LandmarkCanvas imports pattern (copy this structure):**
```typescript
import { useRef, useEffect } from 'react';
import { useWebcamRef } from '@/context/WebcamRefContext';
import { useAppStore } from '@/store/appState';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
```

**Core pattern — mirrored 2D canvas overlay:**
```tsx
export function LandmarkCanvas({ landmarks, isPinching }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useWebcamRef();       // same video ref WebcamProvider manages
  const landmarksVisible = useAppStore((s) => s.landmarksVisible);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    // Match canvas pixel dimensions to stream (Pitfall E)
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!landmarksVisible || !landmarks.length) return;

    // Mirror to match mirrored video (D-27)
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
  }, [landmarks, isPinching, landmarksVisible, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', inset: 0,
        width: '100vw', height: '100vh',
        zIndex: 1,                   // integer z-index (not 0.5 — see RESEARCH Open Question 1)
        pointerEvents: 'none',
      }}
    />
  );
}
```

---

### `src/components/HandStatusIndicator.tsx` (component, event-driven — new)

**Analog:** `src/components/PrePermissionScreen.tsx` (overlay component mounted in DOM layer stack)

**Pattern — reads from Zustand, renders fixed-position overlay:**
```tsx
import { useAppStore } from '@/store/appState';

export function HandStatusIndicator() {
  const handDetected = useAppStore((s) => s.handDetected);
  const handTrackingReady = useAppStore((s) => s.handTrackingReady);

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 10, pointerEvents: 'none' }}>
      {/* Hand icon + colored dot (D-10) */}
      <span style={{ fontSize: 24 }}>✋</span>
      <span style={{
        display: 'inline-block', width: 10, height: 10,
        borderRadius: '50%',
        backgroundColor: handDetected ? '#22c55e' : '#6b7280',  // green / gray
        marginLeft: 4,
      }} />
      {!handTrackingReady && (
        <span style={{ fontSize: 12, marginLeft: 8, color: '#9ca3af' }}>
          Loading hand tracking...
        </span>
      )}
    </div>
  );
}
```

---

### `src/components/BottomToolbar.tsx` (component, request-response — new)

**Analog:** `src/components/PrePermissionScreen.tsx` (fixed-position overlay with button that triggers a callback)

**Fixed overlay + Zustand action pattern from analog** (WebcamProvider.tsx line 39):
```tsx
<PrePermissionScreen onStartCamera={startCamera} />
```

**BottomToolbar imports pattern:**
```typescript
import { useRef } from 'react';
import { useAppStore } from '@/store/appState';
```

**Core pattern — file picker + Zustand actions:**
```tsx
export function BottomToolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const setModelUrl = useAppStore((s) => s.setModelUrl);
  const landmarksVisible = useAppStore((s) => s.landmarksVisible);
  const setLandmarksVisible = useAppStore((s) => s.setLandmarksVisible);
  const prevObjectUrlRef = useRef<string | null>(null);  // track for revocation (Pitfall D)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Revoke previous object URL only after new one is set (D-08, Pitfall D)
    const newUrl = URL.createObjectURL(file);
    if (prevObjectUrlRef.current) URL.revokeObjectURL(prevObjectUrlRef.current);
    prevObjectUrlRef.current = newUrl;
    setModelUrl(newUrl);
    e.target.value = '';   // reset so same file can be reloaded
  };

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0,
      zIndex: 10,
      background: 'rgba(0,0,0,0.5)',
      padding: '12px 16px',
      display: 'flex', gap: 12, alignItems: 'center',
    }}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.gltf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <button onClick={() => fileInputRef.current?.click()}>Load Model</button>
      <button onClick={() => setLandmarksVisible(!landmarksVisible)}>
        {landmarksVisible ? 'Hide Landmarks' : 'Show Landmarks'}
      </button>
    </div>
  );
}
```

---

### `src/hooks/useHandTracking.ts` (hook, event-driven — new)

**Analog:** `src/hooks/useWebcam.ts` (async initialization + cleanup pattern, lines 1–59)

**useWebcam async init + cleanup pattern** (useWebcam.ts lines 1–59):
```typescript
import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/appState';

// Pattern: useRef for mutable values, useCallback for stable fn refs,
// useEffect for side-effect lifecycle with cleanup return
export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement>(null);
  // ...
  useEffect(() => {
    return () => stopCamera();   // cleanup on unmount
  }, [stopCamera]);

  return { videoRef, permissionState, startCamera, stopCamera };
}
```

**useWebcam store access pattern** (useWebcam.ts lines 7–8):
```typescript
const permissionState = useAppStore((state) => state.permissionState);
const setPermissionState = useAppStore((state) => state.setPermissionState);
```

**useHandTracking imports pattern (copy this structure):**
```typescript
import { useEffect, useRef, useCallback } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { useAppStore } from '@/store/appState';
import { useWebcamRef } from '@/context/WebcamRefContext';
```

**Core pattern — async init + throttled rAF loop + cleanup:**
```typescript
export function useHandTracking(onResults: (r: HandLandmarkerResult) => void) {
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const INTERVAL = 33; // ~30fps (D-15)
  const videoRef = useWebcamRef();
  const setHandTrackingReady = useAppStore((s) => s.setHandTrackingReady);

  // Non-blocking init (D-16)
  useEffect(() => {
    let cancelled = false;
    async function init() {
      const vision = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
      if (cancelled) return;
      const lm = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: '/mediapipe/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,           // D-14
        minHandDetectionConfidence: 0.7,
        minHandPresenceConfidence: 0.7,
        minTrackingConfidence: 0.6,
      });
      if (cancelled) { lm.close(); return; }
      landmarkerRef.current = lm;
      setHandTrackingReady(true);
    }
    init().catch(console.error);
    return () => { cancelled = true; };
  }, [setHandTrackingReady]);

  // Throttled detection loop
  const loop = useCallback(() => {
    const video = videoRef.current;
    const lm = landmarkerRef.current;
    if (video && lm && video.readyState >= 2) {
      const now = performance.now();
      if (now - lastTimeRef.current >= INTERVAL) {
        const results = lm.detectForVideo(video, now);
        onResults(results);
        lastTimeRef.current = now;
      }
    }
    rafRef.current = requestAnimationFrame(loop);
  }, [videoRef, onResults]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
      landmarkerRef.current?.close();
    };
  }, [loop]);
}
```

---

### `src/hooks/useGestureInterpreter.ts` (hook, transform — new)

**Analog:** `src/hooks/useSkeletonAnimation.ts` (pure stateful hook returning values + actions, lines 1–19)

**useSkeletonAnimation pattern** (lines 1–19):
```typescript
import { useRef, useState, useCallback } from 'react';

export function useSkeletonAnimation() {
  const rotationRef = useRef<[number, number, number]>([0, 0, 0]);
  const [isAnimating, setIsAnimating] = useState(true);

  const stopAnimation = useCallback(() => {
    setIsAnimating(false);
  }, []);

  return { rotation: rotationRef.current, isAnimating, stopAnimation, rotationSpeed, rotationRef };
}
```

**useGestureInterpreter imports pattern:**
```typescript
import { useRef, useCallback } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { GestureCommand, GestureState } from '@/types/gestures';
import { useAppStore } from '@/store/appState';
```

**Core pattern — pure gesture state machine, returns interpret function:**
```typescript
const PINCH_ENTER = 0.05;   // D-21
const PINCH_EXIT = 0.08;    // hysteresis band
const DEAD_ZONE_PX = 10;    // D-19

export function useGestureInterpreter() {
  const gestureStateRef = useRef<GestureState>({ mode: 'idle', pinchOrigin: null });
  const setGestureActive = useAppStore((s) => s.setGestureActive);
  const setHandDetected = useAppStore((s) => s.setHandDetected);

  const interpret = useCallback((
    landmarks: NormalizedLandmark[][],
    videoWidth: number,
    videoHeight: number
  ): GestureCommand => {
    setHandDetected(landmarks.length > 0);
    if (landmarks.length === 0) {
      gestureStateRef.current = { mode: 'idle', pinchOrigin: null };
      setGestureActive(false);
      return { type: 'idle' };
    }
    // ... pinch detection logic (see RESEARCH Pattern 6)
    // Returns { type: 'rotate' | 'scale' | 'pan' | 'idle', delta?, factor? }
  }, [setGestureActive, setHandDetected]);

  return { interpret };
}
```

---

### `src/hooks/useSkeletonAnimation.ts` (hook — modify existing)

**Analog:** Self — `src/hooks/useSkeletonAnimation.ts` (lines 1–19, full file)

**Existing full file** (lines 1–19):
```typescript
import { useRef, useState, useCallback } from 'react';

export function useSkeletonAnimation() {
  const rotationRef = useRef<[number, number, number]>([0, 0, 0]);
  const [isAnimating, setIsAnimating] = useState(true);
  const rotationSpeed = 0.003;

  const stopAnimation = useCallback(() => {
    setIsAnimating(false);
  }, []);

  return { rotation: rotationRef.current, isAnimating, stopAnimation, rotationSpeed, rotationRef };
}
```

**Modification: add Zustand condition so auto-rotation pauses when a real model is loaded or gesture is active (Pitfall F):**
```typescript
import { useAppStore } from '@/store/appState';

// Inside useSkeletonAnimation():
const modelUrl = useAppStore((s) => s.modelUrl);
const gestureActive = useAppStore((s) => s.gestureActive);

// Derive effective isAnimating — auto-rotation only when on procedural skeleton, no gesture
const shouldAnimate = isAnimating && modelUrl === null && !gestureActive;

return { ..., isAnimating: shouldAnimate, ... };
```

**In SkeletonPreview.tsx useFrame — gate the rotation on `isAnimating` (already done); no other change needed.**

---

### `src/types/gestures.ts` (utility — new, no analog)

No existing type file to copy from. Define clean TypeScript discriminated union:

```typescript
// src/types/gestures.ts
export type GestureMode = 'idle' | 'pinching' | 'two-hand-pinch';

export interface GestureState {
  mode: GestureMode;
  pinchOrigin: { x: number; y: number } | null;
}

export type GestureCommand =
  | { type: 'idle' }
  | { type: 'rotate'; delta: { x: number; y: number } }
  | { type: 'scale'; factor: number }
  | { type: 'pan'; delta: { x: number; y: number } };
```

---

### `src/App.tsx` (component, request-response — modify existing)

**Analog:** `src/App.tsx` (self — lines 1–17, full file)

**Existing full file** (lines 1–17):
```tsx
import { WebcamProvider } from '@/components/WebcamProvider';
import { Canvas } from '@/components/Canvas';

export default function App() {
  return (
    <WebcamProvider>
      {/* z:0 — Video background (handled by WebcamProvider) */}

      {/* z:1 — R3F Canvas with 3D skeleton model, fixed to viewport so it always overlays */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'auto' }}>
        <Canvas />
      </div>

      {/* z:10 — UI overlays (will be added as needed) */}
    </WebcamProvider>
  );
}
```

**Extension — add LandmarkCanvas, shift R3F to z:2, add toolbar and status indicator (RESEARCH App.tsx Layer Stack Extension):**
```tsx
// z:0  — video (WebcamProvider)
// z:1  — LandmarkCanvas (pointerEvents:none)
// z:2  — R3F Canvas (pointerEvents:auto)
// z:10 — HandStatusIndicator, BottomToolbar
```

**Note:** The existing z:1 for R3F canvas must shift to z:2 to make room for LandmarkCanvas at z:1. This is a breaking change to the existing App.tsx comment and style value — update both.

---

## Shared Patterns

### Import Alias
**Source:** `src/hooks/useWebcam.ts` (line 2), `src/components/WebcamProvider.tsx` (lines 3–5)
**Apply to:** All new files
```typescript
import { useAppStore } from '@/store/appState';
import { useWebcamRef } from '@/context/WebcamRefContext';
import { SomeComponent } from '@/components/SomeComponent';
```
All imports use `@/` alias (project-configured Vite path alias). Never use relative `../../` paths.

### Zustand Selector Pattern
**Source:** `src/hooks/useWebcam.ts` (lines 7–8)
**Apply to:** All hooks and components reading from store
```typescript
// Separate selector per value — never destructure the whole store
const permissionState = useAppStore((state) => state.permissionState);
const setPermissionState = useAppStore((state) => state.setPermissionState);
```

### Fixed Viewport Layer Pattern
**Source:** `src/components/WebcamProvider.tsx` (line 19), `src/App.tsx` (line 10)
**Apply to:** LandmarkCanvas, HandStatusIndicator, BottomToolbar
```tsx
style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', zIndex: N }}
```

### Hook Cleanup Pattern (rAF + async)
**Source:** `src/hooks/useWebcam.ts` (lines 54–56)
**Apply to:** `useHandTracking.ts`
```typescript
useEffect(() => {
  return () => stopCamera();   // cleanup fn always returned from useEffect
}, [stopCamera]);
```

### Context Error Guard
**Source:** `src/context/WebcamRefContext.ts` (lines 5–8)
**Apply to:** Any new context consumers
```typescript
export function useWebcamRef(): RefObject<HTMLVideoElement | null> {
  const ref = useContext(WebcamRefContext);
  if (!ref) throw new Error('useWebcamRef must be used inside WebcamProvider');
  return ref;
}
```

### Dev-Only Logging
**Source:** `src/hooks/useWebcam.ts` (line 33)
**Apply to:** `useHandTracking.ts` error paths
```typescript
if (import.meta.env.DEV) console.error('Camera access denied:', message);
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `src/types/gestures.ts` | types | — | No existing type files in `src/types/` for domain types |

---

## Metadata

**Analog search scope:** `src/components/`, `src/hooks/`, `src/store/`, `src/context/`, `src/types/`
**Files scanned:** 8 source files read in full
**Pattern extraction date:** 2026-05-24

**Key architectural constraint (from RESEARCH.md Anti-Patterns):**
- Do NOT run MediaPipe `detectForVideo` inside `useFrame` — separate rAF loop at 30fps only
- Do NOT use CSS `zIndex: 0.5` — use integer z-indices (0, 1, 2, 10)
- Do NOT introduce VideoTexture — HTML video element stays as-is from Phase 1
