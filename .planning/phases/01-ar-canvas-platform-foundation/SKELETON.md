# Phase 1 Walking Skeleton: AR Canvas & Platform Foundation

**Created:** 2026-05-23
**Status:** Architecture locked for subsequent phases
**Milestone:** v1.0 foundation

## Executive Summary

Phase 1 establishes the architectural foundation for AR Anatomy Explorer: a layered DOM compositing approach with live webcam feed as background, transparent R3F 3D canvas overlay, and React UI layer. The entire codebase (web + Tauri desktop) shares identical React and Three.js code, with platform-specific APIs isolated behind conditional imports. This skeleton locks four critical architectural decisions that would force rewrites if changed later.

## Architectural Decisions Locked in Phase 1

### 1. DOM Layer Stacking (Not VideoTexture)

**Decision:** Webcam feed rendered as HTML `<video>` element at z-index: 0 (background), Three.js/R3F transparent canvas at z:1 (3D overlay), React UI at z:10 (overlays). Never use Three.js VideoTexture.

**Rationale:**
- VideoTexture halves frame rates due to GPU contention between WebGL rendering and texture updates
- DOM layer stacking is the established pattern for AR applications with live backgrounds
- Tested and proven in Codrops tutorial and multiple three.js-handtracking implementations
- Enables graceful fallback (checkerboard pattern when camera unavailable)

**Files locked:**
- `src/components/WebcamProvider.tsx` — Manages video element lifecycle and z-index
- `src/App.tsx` — Defines z-index structure (video z:0, canvas z:1, UI z:10)
- `src/index.css` — CSS z-index utilities

**Downstream impact:** Phase 2 (hand tracking) and Phase 3 (educational features) assume video element is available via `useWebcam()` hook. Phase 3 DOM elements (labels, toggles) must remain above z:1 to avoid obscuring 3D content.

### 2. Pre-Permission Screen Behind Button (Tauri Windows Mitigation)

**Decision:** Pre-permission explanation screen appears only on "Start Camera" button click, not on app load. Browser permission prompt only appears after user explicitly clicks button.

**Rationale:**
- Windows Tauri WebView2: Clicking "Block" on permission prompt is permanent (one-way door) until user manually re-enables in Windows Settings
- Pre-permission explanation educates user BEFORE the one-way decision is made
- Button click gives user agency: they understand what they're enabling before the irreversible prompt appears
- Prevents demo failure due to accidental permission denial

**Files locked:**
- `src/components/PrePermissionScreen.tsx` — UI for explanation + "Start Camera" button
- `src/hooks/useWebcam.ts` — `startCamera()` function only calls `getUserMedia()` on explicit call, not on mount
- `src/store/appState.ts` — `permissionState: 'unknown' | 'pending' | 'granted' | 'denied'` to track flow

**Downstream impact:** Phase 2 and Phase 3 must not request camera permission on mount. All code must route permission requests through the established flow (click button → browser prompt → state update).

### 3. Single Src/ Directory with Conditional Imports (__TAURI_CORE__)

**Decision:** One `src/` directory shared between web and Tauri builds. Platform-specific code (Tauri APIs like file I/O, windowing) isolated inside `if (__TAURI_CORE__)` blocks. React components remain platform-agnostic.

**Rationale:**
- Eliminates code duplication and drift between web and desktop versions
- Vite's build system tree-shakes `__TAURI_CORE__` code blocks at compile time
- Web builds never include Tauri APIs; Tauri builds always have them
- Minimal friction for 1-week timeline; maintains single source of truth

**Files locked:**
- `src/config/environment.ts` — `IS_TAURI` and `IS_WEB` constants for runtime detection
- `src/utils/platform.ts` — `onlyTauri()` helper for safe conditional imports
- `vite.config.ts` — Tauri plugin properly defines `__TAURI_CORE__` at compile time
- `tauri.conf.json` — CSP allows MediaPipe WASM, blob worker threads

**Pattern for all subsequent phases:**
```typescript
// Good: Conditional import for Tauri-only API
if (__TAURI_CORE__) {
  const { path } = await import('@tauri-apps/api');
}

// Bad (tree-shaking fails in web build): Top-level import
import { path } from '@tauri-apps/api'; // ❌ Still in web bundle
```

**Downstream impact:** Phase 2-4 must follow this pattern strictly. Any new Tauri-specific feature (window management, file I/O, etc.) must use conditional imports. Violating this will inflate web bundle size unnecessarily.

### 4. Zustand Store for Cross-Layer State

**Decision:** Global Zustand store at `src/store/appState.ts` manages permission state, webcam reference, and other UI state that needs to be accessed from multiple components. No context providers or prop drilling.

**Rationale:**
- Zustand is a single-store model (perfect for "current permission state", "current model loaded", etc.)
- Zero boilerplate: compare to Redux with actions/reducers/middleware
- Same pmndrs ecosystem as R3F and Drei (consistent patterns)
- Makes permission state accessible to hand tracking in Phase 2 without prop drilling through canvas components

**Files locked:**
- `src/store/appState.ts` — Single store definition with `permissionState`, `setPermissionState`, etc.
- All React components that read/write global state use `const permission = useAppState(s => s.permissionState);` pattern

**Store shape (extensible for future phases):**
```typescript
interface AppState {
  // Webcam
  permissionState: 'unknown' | 'pending' | 'granted' | 'denied';
  webcamError: string | null;
  videoRef: React.RefObject<HTMLVideoElement> | null;
  
  // Add to store as needed for Phase 2-3:
  // selectedModel: string | null;
  // modelLayerVisibility: Record<string, boolean>;
  // gestureMode: 'pinch+drag' | 'open-hand' | null;
  
  // Setters
  setPermissionState: (state: AppState['permissionState']) => void;
  setWebcamError: (error: string | null) => void;
  setVideoRef: (ref: React.RefObject<HTMLVideoElement>) => void;
}
```

**Downstream impact:** Phase 2 (hand tracking) will add gesture commands to this store. Phase 3 (model gallery) will add selected model. Store becomes the central hub for all feature state. Keep store shape focused (one concern per property).

---

## Technology Stack (Locked)

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| **Framework** | React | 19.0.0 | Required by R3F 9, modern APIs, TypeScript-first |
| **Build** | Vite | 6.0.0 | Fast HMR, Tauri integration, official recommendation |
| **3D Rendering** | Three.js + R3F + Drei | 0.170.0 + 9.0.0 + 9.0.0 | Declarative JSX, largest ecosystem, battle-tested patterns |
| **State** | Zustand | 5.0.0 | Minimal boilerplate, same ecosystem as R3F |
| **Styling** | Tailwind CSS | 4.0.0 | Zero-config with Vite, rapid UI development |
| **Desktop** | Tauri | v2 | Project requirement, lightweight, native webview |
| **Package Mgr** | pnpm | 8+ | Project requirement, lock file integrity |
| **Language** | TypeScript | 5.6.0 | Type safety, required by project, excellent IDE support |

**Breaking changes prohibited:** Switching from any of these to alternatives (e.g., Babylon.js, Redux, CSS Modules) in later phases requires architectural review and planning. These are not implementation details; they shape the entire codebase.

---

## File Structure (Established)

```
ar-project/
├── src/
│   ├── components/
│   │   ├── Canvas.tsx          # R3F canvas container
│   │   ├── SkeletonPreview.tsx   # 3D skeleton model + animation
│   │   ├── WebcamProvider.tsx    # Video element + z-index management
│   │   └── PrePermissionScreen.tsx
│   ├── hooks/
│   │   ├── useWebcam.ts        # getUserMedia + permission state
│   │   └── useSkeletonAnimation.ts
│   ├── store/
│   │   └── appState.ts         # Zustand store (global state)
│   ├── config/
│   │   └── environment.ts      # IS_TAURI, IS_WEB constants
│   ├── utils/
│   │   └── platform.ts         # onlyTauri() helper
│   ├── models/
│   │   └── skeleton.glb        # Optimized 3D model (≤5MB)
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css               # z-index utilities, checkerboard pattern
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json         # CSP, permissions, window config
│   └── src/
│       └── main.rs
├── vite.config.ts              # React + Tauri plugin
├── tsconfig.json               # Strict mode
├── package.json
├── pnpm-lock.yaml
├── TESTING.md                  # Manual test procedures
└── PLATFORM-NOTES.md           # Platform-specific behavior

To be created in Phase 2+:
├── src/components/
│   ├── ModelGallery.tsx        # Phase 3
│   ├── BodyPartLabel.tsx       # Phase 3
│   └── GestureIndicator.tsx    # Phase 2
├── src/hooks/
│   ├── useHandTracking.ts      # Phase 2
│   └── useGestureClassifier.ts # Phase 2
├── src/systems/
│   ├── HandTracker.ts          # Phase 2
│   └── GestureInterpreter.ts   # Phase 2
```

---

## Performance Budget

**Target:** 60fps rendering with webcam + 3D model + gesture tracking.

**Current Phase 1 (webcam + skeleton only):**
- Webcam: 30fps (throttled to reduce GPU contention)
- Three.js: 60fps (independent render loop)
- Memory: ~80MB initial, ~150MB with user gesture data
- Bundle size: ~500KB gzipped (React + R3F + Drei + Tailwind)

**Constraints for future phases:**
- Model files: ≤5MB each (Draco compression, texture optimization)
- MediaPipe WASM: ~5MB download on first load (cached after)
- Gesture state history: Keep rolling window of ~30 frames (1 second at 30fps)
- Do not add features that require >2 models loaded simultaneously

**Monitoring:** Use browser DevTools Performance > FPS meter and Memory tabs regularly. If FPS drops below 30, throttle MediaPipe or reduce model resolution.

---

## Testing Strategy

**Phase 1 testing:**
1. **Functionality:** Manual tests on Chrome, Firefox, Tauri desktop (see TESTING.md)
2. **Performance:** FPS meter in DevTools, memory profiling
3. **Permission flow:** Test grant, deny, revoke (on web only)
4. **Cross-platform:** Visual + behavioral parity between web and Tauri

**Pattern for future phases:**
- Unit tests for business logic (gesture classification, model selection)
- Integration tests for component interaction
- E2E tests for user flows (load model → rotate → select part → see label)
- Manual performance testing before each phase completion

---

## Security Posture

**CSP headers (locked in tauri.conf.json):**
```
default-src: 'self', data:, blob:
script-src: 'self' (no eval, no inline scripts)
style-src: 'self', 'unsafe-inline' (required by Tailwind)
worker-src: 'self', blob: (required by MediaPipe Phase 2)
```

**Threat mitigations:**
- No user input in Phase 1 (no forms, no text fields) — add validation when input appears in Phase 2
- No backend communication (client-side only) — no authentication needed for v1
- No localStorage secrets (permission state is not sensitive)
- Tauri allowlist is minimal (window management only) — prevent privilege escalation

**Future phases:** Before adding features like user accounts, model persistence, or sharing, review threat model and update CSP as needed.

---

## Integration Points for Phase 2

Phase 2 (3D Models + Hand Tracking) depends on these Phase 1 contracts:

1. **Webcam reference:** Phase 2 hand tracking will access `appState.videoRef.current` to feed frames to MediaPipe
2. **Permission state:** Hand tracking only starts if `permissionState === 'granted'`
3. **Canvas structure:** Phase 2 adds GestureIndicator overlay above z:1 canvas, below z:10 UI
4. **Zustand store:** Phase 2 will extend store with `gestures`, `selectedModel`, `modelLayerVisibility` properties
5. **Conditional imports:** Phase 2 may use `if (__TAURI_CORE__)` for Tauri-specific performance optimizations

**Non-negotiable:** Do not change z-index structure, permission flow, or Zustand store architecture in Phase 2. These decisions cascade through Phase 3-4.

---

## Known Limitations & Deferred Items

| Item | Status | Reason |
|------|--------|--------|
| Open hand gesture mode | Phase 4 | Lower priority, pinch+drag sufficient for Phase 1-3 |
| Model asset pipeline (3D tools) | Phase 2 | Not needed for skeleton preview |
| Quiz/assessment | Phase 5+ | Out of v1 scope |
| User accounts | Phase 6+ | Not needed for client-side app |
| Mobile/iOS support | Phase 5+ | Focus on desktop/browser first |

---

## Rollback Procedures (If Needed)

If Phase 1 completion reveals a critical issue, rollback is handled per component:

| Component | Rollback To |
|-----------|------------|
| Webcam permission flow | Remove "Start Camera" button, request permission on mount (trade: worse UX on Windows) |
| DOM layer stacking | Switch to VideoTexture (trade: 50% FPS drop, must reoptimize rendering) |
| Zustand store | Switch to Context API (trade: more boilerplate, same functionality) |
| Conditional imports | Create separate entry points (trade: code duplication, larger bundle) |

**Recommendation:** Do not rollback architectural decisions. If an issue arises, fix within the established pattern. Contact planning team if a pattern truly doesn't work.

---

## Next Steps

Phase 1 is complete when all 4 PLAN files (01-01 through 01-04) are executed and verified:

1. **01-01-PLAN:** Project scaffold, dependencies installed, Tauri baseline configured
2. **01-02-PLAN:** Webcam permission flow, pre-permission screen, checkerboard fallback
3. **01-03-PLAN:** R3F canvas, skeleton model, auto-rotation animation
4. **01-04-PLAN:** Cross-platform testing (web + Tauri), documentation, git commit

**Success criteria:** All Phase 1 requirements from ROADMAP met, no technical debt from architectural shortcuts, ready for Phase 2.

**Phase 2 starts:** After Phase 1 complete and this SKELETON.md reviewed by development team.

---

*Skeleton created: 2026-05-23*
*Architecture locked: Ready for implementation*
*Walkthrough: Walking skeleton approach establishes foundation, phase 2 builds models+tracking on this base*
