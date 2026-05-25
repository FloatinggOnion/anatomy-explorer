---
phase: 02-3d-models-hand-tracking
plan: "02"
subsystem: model-viewer
tags: [orbit-controls, glb-loader, toolbar, error-boundary, auto-fit]
dependency_graph:
  requires:
    - "src/store/appState.ts Phase 2 fields (modelUrl, gestureActive, landmarksVisible, modelLoadError)"
    - "@react-three/drei OrbitControls + useGLTF"
  provides:
    - "src/components/ModelViewer.tsx with GLBModel + ErrorBoundary + auto-fit"
    - "src/components/BottomToolbar.tsx with file picker + landmark toggle + spinner + error toast"
    - "src/components/Canvas.tsx with OrbitControls (enabled={!gestureActive})"
    - "src/hooks/useSkeletonAnimation.ts shouldAnimate gate (modelUrl === null && !gestureActive)"
  affects:
    - "02-03 (LandmarkCanvas, HandStatusIndicator — consumed alongside BottomToolbar in App.tsx)"
    - "02-04 (gesture controls set gestureActive=true to disable OrbitControls)"
tech_stack:
  added: []
  patterns:
    - "Box3 auto-fit: center at origin, scale.setScalar(2 / maxDim)"
    - "React class ErrorBoundary wrapping R3F Suspense for GLB parse errors (D-08)"
    - "Object URL lifecycle: createObjectURL + revokeObjectURL via prevObjectUrlRef (T-02-05)"
    - "OrbitControls ref forwarded from Canvas to ModelViewer for target.set(0,0,0) after auto-fit (Pitfall B)"
    - "Local isLoading state in BottomToolbar with 2s setTimeout spinner (D-07)"
key_files:
  created:
    - path: src/components/ModelViewer.tsx
      description: R3F component — GLBModel with auto-fit + ModelErrorBoundary + fallback to SkeletonPreview
    - path: src/components/BottomToolbar.tsx
      description: Fixed bottom overlay — Load Model file picker, Landmarks ON/OFF toggle, loading spinner, error toast
  modified:
    - path: src/components/Canvas.tsx
      description: Added OrbitControls (enabled={!gestureActive}), controlsRef, ModelViewer replacing SkeletonPreview
    - path: src/hooks/useSkeletonAnimation.ts
      description: Added shouldAnimate = isAnimating && modelUrl === null && !gestureActive (Pitfall F)
    - path: src/App.tsx
      description: Added BottomToolbar import and mount as sibling to R3F canvas div
    - path: src/index.css
      description: Added @keyframes mp-spin + .mp-spin class for loading spinner
decisions:
  - "ErrorBoundary uses class component (React requirement) with functional wrapper to access Zustand actions via store selectors — avoids getState() anti-pattern"
  - "Spinner uses local 2s setTimeout rather than store coupling — keeps BottomToolbar self-contained, sufficient for UX signal"
  - "Object URL revocation uses prevObjectUrlRef (not Zustand) to track current URL — avoids store serialization of blob URLs"
  - "GLBModelWithErrorBoundary functional wrapper provides clean separation between class boundary and Zustand hooks"
metrics:
  duration: "~4 minutes"
  completed: "2026-05-25"
  tasks_completed: 2
  files_created: 2
  files_modified: 4
---

# Phase 2 Plan 02: Mouse-Controlled GLB Model Viewer

**One-liner:** OrbitControls added to Canvas with gestureActive gate; ModelViewer renders any GLB auto-fit to 2-unit viewport scale with ErrorBoundary revert; BottomToolbar provides file picker + landmark toggle + loading spinner + non-destructive error toast.

## Tasks Completed

| Task | Commit | Key Output |
|------|--------|------------|
| Task 1: OrbitControls + ModelViewer + auto-rotation stop | c251608 | Canvas.tsx + ModelViewer.tsx + useSkeletonAnimation.ts |
| Task 2: BottomToolbar + App.tsx wiring | 8842d0e | BottomToolbar.tsx + App.tsx + index.css |

## What Was Built

- **OrbitControls**: Added to Canvas.tsx with `enabled={!gestureActive}`. Left-drag = rotate, scroll = zoom, right-drag = pan. `controlsRef` forwarded to ModelViewer so auto-fit can reset the orbit target after centering.
- **ModelViewer.tsx**: Renders `<SkeletonPreview />` when `modelUrl` is null; renders `GLBModel` wrapped in `ModelErrorBoundary` + `React.Suspense` when a URL is set. Auto-fit uses `Box3.setFromObject` to center the model at world origin and scale it to 2 units max dimension.
- **ModelErrorBoundary**: Class component that catches Three.js/R3F errors during GLB parse. On `componentDidCatch`: calls `setModelLoadError(...)` and `setModelUrl(null)` to revert to skeleton — implements D-08 non-destructive error handling and T-02-04 threat mitigation.
- **useSkeletonAnimation.ts**: Extended with `shouldAnimate = isAnimating && modelUrl === null && !gestureActive`. Skeleton auto-rotation stops immediately when a GLB loads or gesture mode is active (Pitfall F).
- **BottomToolbar.tsx**: Fixed overlay at bottom (rgba(17,24,39,0.7) + backdrop-blur). Contains Load Model button (blue-600), divider, Landmarks ON/OFF toggle. File picker creates object URL, revokes previous URL before each load (T-02-05 mitigation). Loading spinner (mp-spin CSS animation) shows for 2s after file select. Error toast at bottom-right (red-900/red-300) auto-dismisses after 5s.

## Deviations from Plan

None — plan executed exactly as written. All threat mitigations (T-02-04, T-02-05, T-02-06) implemented as specified.

## Threat Flags

No new trust boundaries introduced beyond those already in the plan's threat model. T-02-04 (ErrorBoundary), T-02-05 (object URL revocation), and T-02-06 (group wrapper for auto-fit) are all mitigated in the implementation.

## Self-Check: PASSED

- src/components/ModelViewer.tsx: FOUND
- src/components/BottomToolbar.tsx: FOUND
- src/components/Canvas.tsx (OrbitControls): FOUND
- src/hooks/useSkeletonAnimation.ts (shouldAnimate): FOUND
- src/App.tsx (BottomToolbar mount): FOUND
- src/index.css (mp-spin keyframes): FOUND
- pnpm tsc --noEmit: PASS (exit 0, no errors)
- Commits c251608 and 8842d0e: FOUND on worktree-agent-a12130ad
