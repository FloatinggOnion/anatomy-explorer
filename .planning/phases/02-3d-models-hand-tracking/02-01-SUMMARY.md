---
phase: 02-3d-models-hand-tracking
plan: "01"
subsystem: foundation
tags: [dependencies, store, types, assets, mediapipe]
dependency_graph:
  requires: []
  provides:
    - "@mediapipe/tasks-vision installed and importable"
    - "leva installed and importable"
    - "src/types/gestures.ts with GestureMode, GestureState, GestureCommand"
    - "src/store/appState.ts extended with 6 Phase 2 fields"
    - "public/mediapipe/wasm/ with 6 offline WASM files"
    - "public/models/body.glb as second anatomy GLB"
    - "src/App.tsx Phase 2 layer stack (z:0/1/2/10)"
  affects:
    - "02-02 (BottomToolbar, ModelViewer — consume store + models)"
    - "02-03 (LandmarkCanvas, useHandTracking — consume WASM + store)"
tech_stack:
  added:
    - "@mediapipe/tasks-vision@0.10.35"
    - "leva@0.10.1"
  patterns:
    - "Zustand additive extension pattern"
    - "TypeScript discriminated union for GestureCommand"
key_files:
  created:
    - path: src/types/gestures.ts
      description: GestureMode, GestureState, GestureCommand type contracts
    - path: src/vite-env.d.ts
      description: Vite client types reference for import.meta.env
    - path: public/mediapipe/wasm/
      description: 6 offline WASM files for MediaPipe hand tracking
    - path: public/models/body.glb
      description: CC0 RiggedFigure anatomy GLB (49KB, Khronos Group)
  modified:
    - path: src/store/appState.ts
      description: Extended with 6 Phase 2 fields (modelUrl, gestureActive, landmarksVisible, handDetected, handTrackingReady, modelLoadError)
    - path: src/App.tsx
      description: R3F canvas bumped to zIndex 2; placeholder comments for LandmarkCanvas, HandStatusIndicator, BottomToolbar
    - path: package.json
      description: Added @mediapipe/tasks-vision and leva dependencies
decisions:
  - "Used worktree-local pnpm install (packages isolated from main repo)"
  - "hand_landmarker.task not bundled in npm package; useHandTracking will use CDN fallback at runtime"
  - "RiggedFigure.glb chosen as second model (CC0, Khronos glTF Sample Models, 49KB)"
metrics:
  duration: "~13 minutes"
  completed: "2026-05-25"
  tasks_completed: 2
  files_created: 4
  files_modified: 3
---

# Phase 2 Plan 01: Phase 2 Foundation — Dependencies, Store, Types, Assets

**One-liner:** MediaPipe tasks-vision + leva installed; Zustand store extended with 6 hand-tracking state fields; GestureCommand discriminated union defined; 6 offline WASM files and a second anatomy GLB staged for Plans 02-02 and 02-03.

## Tasks Completed

| Task | Commit | Key Output |
|------|--------|------------|
| Task 1: Install deps, extend store, gesture types | 7a78dfb | @mediapipe/tasks-vision@0.10.35, leva@0.10.1, src/types/gestures.ts, extended appState.ts |
| Task 2: Update App.tsx layer stack, stage MediaPipe WASM + model | eb31619 | public/mediapipe/wasm/ (6 files), public/models/body.glb (49KB CC0 GLB), App.tsx zIndex:2 |

## What Was Built

Phase 2 foundation enabling all downstream plans to run without package or asset setup:

- **Dependencies**: `@mediapipe/tasks-vision@0.10.35` and `leva@0.10.1` installed via pnpm
- **Gesture type contracts**: `src/types/gestures.ts` defines `GestureMode` ('idle' | 'pinching' | 'two-hand-pinch'), `GestureState` interface, and `GestureCommand` discriminated union (idle/rotate/scale/pan variants)
- **Extended Zustand store**: 6 new fields added to `src/store/appState.ts` — all Phase 2 components can read gestureActive, handDetected, handTrackingReady, landmarksVisible, modelLoadError, and modelUrl via `useAppStore` selectors
- **App.tsx Phase 2 layer stack**: R3F canvas bumped from zIndex:1 to zIndex:2; placeholder comments added for LandmarkCanvas (z:1), HandStatusIndicator (z:10), BottomToolbar (z:10)
- **MediaPipe offline assets**: 6 WASM files copied to `public/mediapipe/wasm/` — `useHandTracking` hook (Plan 02-03) can use `FilesetResolver.forVisionTasks('/mediapipe/wasm')` without network access
- **Second anatomy model**: `public/models/body.glb` (RiggedFigure, CC0 Khronos Group, 49KB GLB)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Added missing src/vite-env.d.ts for import.meta.env TypeScript support**
- **Found during:** Task 1 verification (pnpm tsc --noEmit)
- **Issue:** TypeScript error `Property 'env' does not exist on type 'ImportMeta'` in useWebcam.ts:33. The `vite-env.d.ts` file existed in the main repo as an untracked file but was not in the worktree's committed state.
- **Fix:** Created `src/vite-env.d.ts` with `/// <reference types="vite/client" />` in the worktree
- **Files modified:** src/vite-env.d.ts (created)
- **Commit:** 7a78dfb

**2. Worktree path drift — corrected**
- **Found during:** Task 1 initial execution
- **Issue:** Initial `pnpm add` and file writes used the main repo path (`/Users/paul/Documents/programming/ar-project/`) instead of the worktree path. An accidental commit was made to `main`, then reverted via `git reset --soft HEAD~1` + `git restore`.
- **Fix:** All subsequent operations correctly used worktree path (`/Users/paul/Documents/programming/ar-project/.claude/worktrees/agent-a8079d09/`). Main repo was restored to its previous state (22b12f2).
- **Impact:** No lasting effect on main; worktree has correct commits.

### Notes

- **hand_landmarker.task not in npm bundle**: The `.task` model file for hand detection is not bundled in `@mediapipe/tasks-vision` npm package. The `useHandTracking` hook (Plan 02-03) must download it from Google CDN (`https://storage.googleapis.com/mediapipe-models/...`) at runtime. This is expected per the plan's note on CDN fallback.
- **WASM files only offline**: The 6 WASM files that ARE copied locally are the main Tauri offline benefit — they are larger and must load first. The `.task` model (~9MB) downloading from CDN is acceptable per D-16 (non-blocking load with `handTrackingReady` state).

## Threat Flags

No new trust boundaries introduced by this plan. The MediaPipe CDN fallback for the `.task` model file is already addressed as T-02-03 (accepted) in the plan's threat model.

## Self-Check: PASSED

- src/types/gestures.ts: FOUND
- src/store/appState.ts (6 Phase 2 fields): FOUND
- src/App.tsx (zIndex:2): FOUND
- public/mediapipe/wasm/ (6 files): FOUND
- public/models/body.glb (49KB, valid glTF binary): FOUND
- pnpm tsc --noEmit: PASS (0 errors)
- Commits 7a78dfb and eb31619: FOUND on worktree-agent-a8079d09
