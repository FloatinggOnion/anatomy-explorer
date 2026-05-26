---
phase: 01-ar-canvas-platform-foundation
reviewed: 2026-05-23T00:00:00Z
depth: standard
files_reviewed: 12
files_reviewed_list:
  - src/App.tsx
  - src/main.tsx
  - src/store/appState.ts
  - src/config/environment.ts
  - src/utils/platform.ts
  - src/components/WebcamProvider.tsx
  - src/components/PrePermissionScreen.tsx
  - src/components/Canvas.tsx
  - src/components/SkeletonPreview.tsx
  - src/hooks/useWebcam.ts
  - src/hooks/useSkeletonAnimation.ts
  - vite.config.ts
  - tsconfig.json
  - index.html
  - src/index.css
  - package.json
  - src-tauri/tauri.conf.json
findings:
  critical: 4
  warning: 6
  info: 3
  total: 13
status: issues_found
---

# Phase 01: Code Review Report

**Reviewed:** 2026-05-23
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

The Phase 1 AR Anatomy Explorer implementation provides a functional foundation with React/R3F integration, webcam access, and Tauri desktop support. However, several critical issues must be addressed before production:

1. **Memory leak in webcam cleanup** — Missing cleanup of event listeners that will accumulate on component remounts
2. **Missing dependency array in useWebcam** — Recursive startCamera calls and dependency violations
3. **Type safety violations** — Explicit `any` types that circumvent strict TypeScript checking
4. **Race conditions in permission state** — Potential state inconsistency between hook and store
5. **Unsafe ref usage in animation loop** — Direct mutation of rotation array without state management

Additionally, there are medium-priority issues around error handling, state synchronization, and accessibility that should be addressed soon.

---

## Critical Issues

### CR-01: Memory Leak — Missing Cleanup of Video Element Event Listeners

**File:** `src/hooks/useWebcam.ts:28-47`

**Issue:**
The `startCamera()` function plays the video element (`videoRef.current.play()` at line 38) but never removes event listeners. In React's strict mode (enabled in main.tsx), components mount/unmount during development, and the hook may be called multiple times. Each call to `play()` on a `<video>` element that's already streaming will create internal listeners that are never cleaned up. Additionally, the hook doesn't remove the `srcObject` stream when the component unmounts.

**Severity:** BLOCKER — This causes memory leaks that grow with each user interaction in development and can accumulate in production if the component is ever remounted.

**Fix:**
Add a cleanup function in useEffect that stops the stream and removes any event listeners:

```typescript
useEffect(() => {
  return () => {
    // Cleanup on unmount
    stopCamera();
  };
}, []);

const startCamera = async () => {
  try {
    setPermissionState('pending');
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    });

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setPermissionState('granted');
      localStorage.setItem('webcam_permission', 'granted');
    }
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Camera access denied:', err.message);
    setPermissionState('denied');
    localStorage.setItem('webcam_permission', 'denied');
  }
};
```

---

### CR-02: Missing Dependency in useWebcam — Infinite Loop Risk

**File:** `src/hooks/useWebcam.ts:10-21`

**Issue:**
The first `useEffect` (lines 11-21) calls `startCamera()` but `startCamera` is not defined yet and is not in the dependency array. More critically, line 16 calls `startCamera()` inside the effect but `startCamera` is defined after the hook returns (line 28). This creates:
1. Reference before definition (startCamera is called before it's declared)
2. Missing dependency — if the logic changes, this effect won't re-run when dependencies change
3. Potential violation of "Rules of Hooks" — the effect should list all dependencies

In the current code, this works due to hoisting, but it's fragile and violates React best practices.

**Severity:** BLOCKER — This is a violation of React's Rules of Hooks and will break if refactored.

**Fix:**
Reorder the hook to define `startCamera` before using it, and include it in the dependency array:

```typescript
export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const permissionState = useAppStore((state) => state.permissionState);
  const setPermissionState = useAppStore((state) => state.setPermissionState);
  const setVideoRef = useAppStore((state) => state.setVideoRef);

  const startCamera = useCallback(async () => {
    try {
      setPermissionState('pending');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setPermissionState('granted');
        localStorage.setItem('webcam_permission', 'granted');
      }
    } catch (error: unknown) {
      const err = error as Error;
      console.error('Camera access denied:', err.message);
      setPermissionState('denied');
      localStorage.setItem('webcam_permission', 'denied');
    }
  }, [setPermissionState]);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  // Restore permission state from localStorage on mount
  useEffect(() => {
    const savedPermission = localStorage.getItem('webcam_permission') as PermissionState | null;
    if (savedPermission && ['granted', 'denied'].includes(savedPermission)) {
      setPermissionState(savedPermission);
      if (savedPermission === 'granted') {
        startCamera();
      }
    } else {
      setPermissionState('unknown');
    }
  }, [startCamera, setPermissionState]);

  // Set video ref in store
  useEffect(() => {
    setVideoRef(videoRef);
  }, [setVideoRef]);

  return {
    videoRef,
    permissionState,
    startCamera,
    stopCamera,
  };
}
```

---

### CR-03: Type Safety Violation — Unsafe `any` Types Bypass TypeScript Protection

**File:** `src/hooks/useWebcam.ts:12` and `src/hooks/useWebcam.ts:42`

**Issue:**
Line 12 casts `localStorage.getItem('webcam_permission')` to `any`, eliminating type checking. This should be typed as `string | null` and validated. Similarly, line 42 casts the error to `any` instead of using proper error type narrowing.

Line 7 in `src/components/SkeletonPreview.tsx`: `const groupRef = useRef<any>(null)` uses `any` instead of the proper Three.js `Group` type from three.js.

These violate the strict TypeScript configuration (line 24 of tsconfig.json: `"strict": true`).

**Severity:** BLOCKER — Allows runtime errors that TypeScript should catch. For example, if a malformed permission value is stored in localStorage, the code will accept it and pass it to `setPermissionState`, potentially creating an invalid state.

**Fix:**

For useWebcam.ts:
```typescript
const savedPermission = localStorage.getItem('webcam_permission');
if (savedPermission && ['granted', 'denied'].includes(savedPermission)) {
  setPermissionState(savedPermission as PermissionState);
  // ...
}
```

And for error handling:
```typescript
} catch (error) {
  const err = error instanceof Error ? error : new Error('Unknown error');
  console.error('Camera access denied:', err.message);
  setPermissionState('denied');
  localStorage.setItem('webcam_permission', 'denied');
}
```

For SkeletonPreview.tsx:
```typescript
import { Group } from 'three';

const groupRef = useRef<Group>(null);
```

---

### CR-04: Zustand Store Mutation — State Stored by Reference, Not Value

**File:** `src/store/appState.ts:9` and `src/components/WebcamProvider.tsx:12-17`

**Issue:**
The store stores `videoRef: RefObject<HTMLVideoElement | null>` directly. React refs are mutable objects. When `setVideoRef(videoRef)` is called in `WebcamProvider.tsx:16`, it stores a reference to the same object. Later, if the ref's `.current` property changes (which it will when the video element mounts), the store observes the mutation but doesn't trigger a re-render because Zustand's default shallow equality check sees the same ref object.

More critically, storing refs in Zustand is an anti-pattern. Refs should not be shared via state management — they should be passed directly through the component tree or accessed via a React context that doesn't trigger re-renders.

**Severity:** BLOCKER — While this may work for the current use case, it violates React's mental model and can cause bugs if other components try to consume `videoRef` from the store (they won't re-render when the video element mounts/unmounts).

**Fix:**
Remove `videoRef` from Zustand store entirely. Instead, use React Context:

```typescript
// hooks/useWebcamRef.ts
import { createContext, useContext, RefObject } from 'react';

const WebcamRefContext = createContext<RefObject<HTMLVideoElement | null> | null>(null);

export function useWebcamRef() {
  const ref = useContext(WebcamRefContext);
  if (!ref) {
    throw new Error('useWebcamRef must be used within WebcamProvider');
  }
  return ref;
}

export { WebcamRefContext };
```

Then update `WebcamProvider.tsx`:
```typescript
import { WebcamRefContext } from '@/hooks/useWebcamRef';

export function WebcamProvider({ children }: WebcamProviderProps) {
  const { videoRef, permissionState, startCamera } = useWebcam();
  
  return (
    <WebcamRefContext.Provider value={videoRef}>
      <div className="relative w-full h-screen overflow-hidden">
        {/* ... rest of component */}
      </div>
    </WebcamRefContext.Provider>
  );
}
```

And update `appState.ts`:
```typescript
export interface AppState {
  permissionState: PermissionState;
  setPermissionState: (state: PermissionState) => void;
}

export const useAppStore = create<AppState>((set) => ({
  permissionState: 'unknown',
  setPermissionState: (state: PermissionState) => set({ permissionState: state }),
}));
```

---

## Warnings

### WR-01: Race Condition — Permission State Not Synchronized Between Hook and Store

**File:** `src/hooks/useWebcam.ts:6-7` and `src/components/WebcamProvider.tsx:11`

**Issue:**
`useWebcam()` hook reads `permissionState` from the store (line 6) but also has its own local state management via `setPermissionState`. The hook initializes the state from localStorage (line 14), sets it to 'pending' (line 30), then 'granted'/'denied' (lines 39, 44). However, the hook doesn't return the updated `permissionState` from the store — it returns the initial read value. This creates a timing issue:

1. Initial render: permissionState is 'unknown'
2. useEffect runs, sets permissionState to 'pending', then 'granted'
3. But the hook returns the stale value

WebcamProvider reads from the hook (line 11) but then tries to set it in the store again (line 12), creating redundancy.

**Severity:** WARNING — May cause UI to show incorrect permission state briefly during camera startup.

**Fix:**
Refactor to use a single source of truth. Either:
1. Remove store dependency and use only local state in the hook, OR
2. Remove local state from the hook and use only store state

Option 2 is cleaner:

```typescript
export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const permissionState = useAppStore((state) => state.permissionState);
  const setPermissionState = useAppStore((state) => state.setPermissionState);

  useEffect(() => {
    const startCamera = async () => {
      // ... startCamera implementation
    };

    const savedPermission = localStorage.getItem('webcam_permission') as PermissionState | null;
    if (savedPermission && ['granted', 'denied'].includes(savedPermission)) {
      setPermissionState(savedPermission);
      if (savedPermission === 'granted') {
        startCamera();
      }
    } else {
      setPermissionState('unknown');
    }
  }, [setPermissionState]);

  // ... rest of hook
}
```

---

### WR-02: No Error Handling for Model Loading Failure

**File:** `src/components/SkeletonPreview.tsx:11`

**Issue:**
The `useGLTF('/models/skeleton.glb')` call on line 11 can fail if:
1. The model file doesn't exist
2. The file is not a valid GLB/GLTF format
3. Network error (if loaded from CDN)

The code provides a `<Suspense fallback>` for loading states, but no error boundary or try-catch for actual failures. If the model fails to load, the entire 3D scene will be blank with no user feedback.

**Severity:** WARNING — Users won't understand why the 3D model isn't showing.

**Fix:**
Add an error boundary and error state to the component:

```typescript
import { Suspense, useState } from 'react';
import { useGLTF } from '@react-three/drei';

function SkeletonPreview() {
  const [error, setError] = useState<string | null>(null);
  const groupRef = useRef<Group>(null);

  let skeleton;
  try {
    skeleton = useGLTF('/models/skeleton.glb');
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to load model';
    setError(errorMsg);
    return null;
  }

  if (error) {
    return (
      <Html position={[0, 0, 0]}>
        <div className="text-red-500 text-sm">Failed to load skeleton model</div>
      </Html>
    );
  }

  // ... rest of component
}
```

Or use Drei's error handling wrapper if available.

---

### WR-03: Missing Null Safety in Animation Loop

**File:** `src/components/SkeletonPreview.tsx:14-19`

**Issue:**
The `useFrame` callback (lines 14-19) checks `if (isAnimating && groupRef.current && rotationRef?.current)` but:
1. Uses optional chaining `rotationRef?.current` inconsistently (should use `rotationRef.current` since rotationRef is never null from the hook)
2. Mutates `rotationRef.current[1]` directly without bounds checking — the rotation value will grow unbounded to infinity over time
3. No throttling or frame-rate limiting — runs every frame, which could be 60+ fps

The unbounded rotation will eventually cause precision issues and unexpected behavior.

**Severity:** WARNING — Rotation accumulation over long sessions could cause floating-point precision issues.

**Fix:**
Add bounds checking:

```typescript
useFrame(() => {
  if (isAnimating && groupRef.current && rotationRef.current) {
    rotationRef.current[1] += rotationSpeed;
    // Normalize rotation to prevent floating-point overflow
    if (rotationRef.current[1] > Math.PI * 2) {
      rotationRef.current[1] -= Math.PI * 2;
    }
    groupRef.current.rotation.y = rotationRef.current[1];
  }
});
```

---

### WR-04: Missing stopAnimation Resume Mechanism

**File:** `src/hooks/useSkeletonAnimation.ts:8-10`

**Issue:**
The `stopAnimation()` callback sets `isAnimating` to `false` but there's no way to resume animation. Once a user clicks the model, it stops animating forever. This is likely unintended — users may want to resume animation after interaction.

**Severity:** WARNING — UX issue: animation cannot be resumed.

**Fix:**
Add a `startAnimation` callback:

```typescript
const startAnimation = useCallback(() => {
  setIsAnimating(true);
}, []);

const stopAnimation = useCallback(() => {
  setIsAnimating(false);
}, []);

return {
  rotation: rotationRef.current,
  isAnimating,
  stopAnimation,
  startAnimation,
  rotationSpeed,
  rotationRef,
};
```

---

### WR-05: useMemo Used Incorrectly for Side Effects

**File:** `src/components/WebcamProvider.tsx:15-17`

**Issue:**
Lines 15-17 use `useMemo` to call `setVideoRef(videoRef)`:

```typescript
useMemo(() => {
  setVideoRef(videoRef);
}, [videoRef, setVideoRef]);
```

`useMemo` is for caching expensive computations, not for running side effects. This should be `useEffect`. While this works, it violates React conventions and could be optimized away by the runtime or dev tools.

**Severity:** WARNING — Anti-pattern that could break in future React versions.

**Fix:**
```typescript
useEffect(() => {
  setVideoRef(videoRef);
}, [videoRef, setVideoRef]);
```

---

### WR-06: Missing CSP Directive for WASM and MediaPipe

**File:** `src-tauri/tauri.conf.json:25-33`

**Issue:**
The CSP (Content Security Policy) doesn't include directives for WebAssembly (WASM), which MediaPipe's hand tracking depends on. The current config has `"script-src": ["'self'"]` which doesn't explicitly allow WASM execution. MediaPipe loads WASM modules at runtime from `blob:` URLs, but the `script-src` doesn't allow this.

Additionally, `worker-src` is set to `["'self'", "blob:"]` but there's no explicit `wasm-unsafe-eval` or `script-src` blob: permission, which could cause MediaPipe workers to fail.

**Severity:** WARNING — MediaPipe hand tracking may fail in production builds due to CSP violations.

**Fix:**
Update tauri.conf.json:

```json
"security": {
  "csp": {
    "default-src": ["'self'", "data:", "blob:"],
    "script-src": ["'self'", "blob:"],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    "connect-src": ["'self'", "http://localhost:5173"],
    "font-src": ["'self'"],
    "worker-src": ["'self'", "blob:"],
    "child-src": ["blob:"],
    "media-src": ["'self'", "blob:"]
  }
}
```

---

## Info Items

### IN-01: Debug Console.error in Production Code

**File:** `src/hooks/useWebcam.ts:43`

**Issue:**
The line `console.error('Camera access denied:', error);` logs to the browser console during error handling. While useful for debugging, this should either:
1. Be removed for production
2. Use a proper logging system that can be controlled by environment

**Severity:** INFO — Low priority, but should be cleaned up before production release.

**Fix:**
```typescript
catch (error) {
  const err = error instanceof Error ? error : new Error('Unknown error');
  // Only log in development
  if (import.meta.env.DEV) {
    console.error('Camera access denied:', err.message);
  }
  setPermissionState('denied');
  localStorage.setItem('webcam_permission', 'denied');
}
```

---

### IN-02: Missing Tailwind CSS Configuration

**File:** No tailwind.config.js or tailwind.config.ts file found

**Issue:**
The project uses Tailwind CSS v4 but has no `tailwind.config.ts` or `tailwind.config.js`. Tailwind v4 supports zero-config mode with Vite, but having an explicit config allows for future customization (e.g., custom colors, theming). The current setup works but is not future-proof.

**Severity:** INFO — Non-blocking; Tailwind v4 auto-detects. Add config when customization is needed.

**Fix:**
Create `tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
} satisfies Config;
```

---

### IN-03: Redundant Store State Setter Call

**File:** `src/hooks/useWebcam.ts:8` and `src/components/WebcamProvider.tsx:12-17`

**Issue:**
The `useWebcam()` hook already sets the permission state in Zustand (line 8 extracts `setPermissionState`). Then `WebcamProvider` reads this hook and redundantly calls `setVideoRef` via useMemo. This is code duplication.

However, this is a lower priority than CR-04 because it's less likely to cause bugs.

**Severity:** INFO — Code quality. Once CR-04 is fixed (remove videoRef from store), this issue resolves itself.

**Fix:**
Remove the videoRef store logic entirely (addressed in CR-04).

---

## Positive Findings

### Well-Implemented Features

1. **Platform Abstraction (src/utils/platform.ts)** — The `onlyTauri` and `onlyTauriAsync` helpers properly abstract platform-specific code and allow tree-shaking of Tauri imports from the web bundle. Well-documented with clear usage examples.

2. **Proper Tauri Integration (vite.config.ts, tsconfig.json)** — The Vite configuration correctly handles Tauri dev/build workflow with proper port locking, HMR configuration, and ignored watch paths. TypeScript strict mode is enabled correctly.

3. **React 19 + R3F Setup** — The Canvas component properly uses Suspense with a fallback placeholder and sets up ambient + directional lighting. The performance config (`performance={{ min: 0.5, max: 1 }}`) is sensible.

4. **Webcam Permission Flow** — The WebcamProvider + PrePermissionScreen pattern cleanly separates permission UI from data logic. Permission state persists to localStorage.

5. **Strict TypeScript Configuration (tsconfig.json)** — Most of the codebase respects strict mode (`noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`). The type violations found are exceptions, not the norm.

---

## Summary by Severity

| Severity | Count | Issue |
|----------|-------|-------|
| BLOCKER | 4 | Memory leak, missing deps, type safety, state anti-pattern |
| WARNING | 6 | Race condition, error handling, animation state, CSP, misc |
| INFO | 3 | Console logging, Tailwind config, redundancy |
| **Total** | **13** | |

---

_Reviewed: 2026-05-23_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
