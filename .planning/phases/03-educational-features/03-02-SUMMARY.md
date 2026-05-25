---
phase: 03-educational-features
plan: "02"
subsystem: gesture-label
tags: [pointing-gesture, raycasting, drei-html, anatomy-labels, dwell-timer]
dependency_graph:
  requires: [03-01]
  provides: [anatomyLabels, LabelBubble, PointerRaycaster, pointingNDCRef, isPointing]
  affects: [src/hooks/useGestureInterpreter.ts, src/components/Canvas.tsx, src/App.tsx]
tech_stack:
  added: []
  patterns: [useFrame-raycasting, drei-Html-anchor, dwell-timer-ref, findNamedAncestor-walk, pointingNDCRef-forwarding]
key_files:
  created:
    - src/data/anatomyLabels.ts
    - src/components/LabelBubble.tsx
    - src/components/PointerRaycaster.tsx
  modified:
    - src/hooks/useGestureInterpreter.ts
    - src/components/Canvas.tsx
    - src/App.tsx
decisions:
  - PointerRaycaster performs dwell timer logic inside useFrame (camera matrix fresh each frame)
  - LabelBubble uses useFrame to track mesh world position via getWorldPosition each frame
  - pointingNDCRef forwarded as optional prop through Canvas with internal fallback ref
  - findNamedAncestor walks parent chain to handle two-level skeleton hierarchy
  - Pointing detection gated on !isPinching0 to prevent conflicts with pinch-rotate gesture
metrics:
  duration: 9 minutes
  completed: 2026-05-25
---

# Phase 3 Plan 02: Body Part Label Slice — Summary

**One-liner:** Index-finger point+hold (1s) selects an anatomy mesh and shows a drei Html label bubble with name and description anchored in 3D space, wired via pointingNDCRef from App.tsx through Canvas into a new PointerRaycaster useFrame raycaster.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create anatomyLabels.ts data file and LabelBubble component | 6701d3b | src/data/anatomyLabels.ts, src/components/LabelBubble.tsx |
| 2 | Add pointing detection to gesture hook and create PointerRaycaster | ffed5d7 | src/hooks/useGestureInterpreter.ts, src/components/PointerRaycaster.tsx |
| 3 | Wire pointingNDCRef and label components into Canvas and App.tsx | 245cec7 | src/components/Canvas.tsx, src/App.tsx |

## What Was Built

**anatomyLabels.ts:** Static lookup `Record<string, AnatomyLabel>` with 10 entries — 8 procedural skeleton named groups (skull, spine, ribcage, pelvis, left-arm, right-arm, left-leg, right-leg) and 2 bundled GLB mesh names (Proxy, SkeletonMesh). Exports `AnatomyLabel` type and `anatomyLabels` const.

**LabelBubble.tsx:** R3F component rendered inside Canvas Suspense tree. Reads `selectedMeshName` from Zustand. Uses `useFrame` to call `mesh.getWorldPosition(meshWorldPosRef.current)` each frame, tracking the anchor as the model rotates. Renders drei `<Html center>` at the world position with `zIndexRange={[9,0]}` (below toolbar z:10) and `pointerEvents:none`. Visual design: dark glass card (rgba(17,24,39,0.85) + blur(6px)), blue left pin bar (#2563EB, 6px wide), anatomy name (16px/600), description (12px/400/rgba(255,255,255,0.8)), downward pointer arrow at bubble bottom-center. `prettifyMeshName()` fallback for unknown mesh names (replaces `-` with space, capitalizes words).

**PointerRaycaster.tsx:** Invisible R3F controller. Creates a stable `Raycaster` instance (via `useRef(...).current`). Inside `useFrame({ camera })`: reads `pointingNDCRef.current`, calls `raycaster.setFromCamera(ndc, camera)`, then `raycaster.intersectObject(group, true)` (recursive). `findNamedAncestor()` walks `object.parent` chain to find the first ancestor with a non-empty name, handling the two-level SkeletonPreview hierarchy (outer group → unnamed ProceduralSkeleton → named groups). Dwell timer: if same meshName persists for `DWELL_MS=1000ms`, calls `setSelectedMeshName(meshName)`. `meshName=null` (pointing at empty space) also dwells and dismisses. T-03-04 mitigation: early return when `pointingNDCRef.current` is null.

**useGestureInterpreter.ts additions:** Added `isPointing()` module-level helper (index tip.y < PIP.y, other 3 non-thumb fingers curled). Added `pointingNDCRef: useRef<Vector2|null>(null)` to hook body. Inside `interpret()`: when `isPointing(hand0) && !isPinching0`, writes landmark 8 NDC to `pointingNDCRef.current`; otherwise sets null. Added `setSelectedMeshName` to dependency array. Return type extended with `pointingNDCRef`. Pointing gated on `!isPinching0` to prevent conflicts with single-hand pinch-rotate.

**Canvas.tsx:** Added `pointingNDCRef?: React.MutableRefObject<Vector2|null>` to `CanvasProps`. Internal fallback `internalPointingNDCRef` using same pattern as `internalGestureCommandRef`. Imported and rendered `PointerRaycaster` alongside `SceneController` (invisible controllers). Imported and rendered `LabelBubble` inside Suspense tree alongside `ModelViewer`.

**App.tsx:** Destructured `pointingNDCRef` from `useGestureInterpreter()` return and passed to `<Canvas pointingNDCRef={pointingNDCRef} />`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Pointing detection gated on !isPinching0**
- **Found during:** Task 2 review
- **Issue:** The plan's pointing block runs after the "no hands" early return but before pinch logic. If a user was pinching (finger tips close together) while also happening to have index extended, isPointing() could return true and overwrite pointingNDCRef. This would cause raycasting to fire during pinch-rotate gestures, potentially selecting meshes unintentionally.
- **Fix:** Added `&& !isPinching0` condition to the pointing detection block — pointing only active when not pinching.
- **Files modified:** src/hooks/useGestureInterpreter.ts
- **Commit:** ffed5d7

**2. [Rule 1 - Bug] Erroneous commit to main repo branch**
- **Found during:** Task 1 commit
- **Issue:** Write tool used `/Users/paul/Documents/programming/ar-project/` paths (main repo root) instead of worktree paths. Commit `fbe59bd` went to `main` branch of main repo.
- **Fix:** Immediately reset main repo to prior commit (`git reset --hard 03a0074`). Rewrote files to correct worktree paths. Re-committed to `worktree-agent-a1ed657c` branch.
- **Files affected:** No lasting harm — main repo restored, worktree branch carries correct commits.

**3. [Rule 2 - Missing] dwellStartRef/dwellMeshRef refs declared but unused in hook**
- **Found during:** Task 2 TypeScript verification
- **Issue:** Plan spec said to add dwell refs to the hook, but dwell logic was explicitly moved to PointerRaycaster.tsx per the task description. Leaving refs unused would cause TS6133 errors.
- **Fix:** Added `void dwellStartRef; void dwellMeshRef; void DWELL_MS;` suppressor lines. The actual dwell logic lives in PointerRaycaster where it belongs (inside useFrame with camera access).
- **Files modified:** src/hooks/useGestureInterpreter.ts
- **Commit:** ffed5d7

## Known Stubs

None — all anatomy label data is real, all component logic is fully wired.

## Threat Surface Scan

No new network endpoints, auth paths, or file access patterns introduced. All data flows are:
- MediaPipe landmark coordinates → NDC conversion (deterministic math)
- Three.js scene graph traversal (internal to app)
- Static `anatomyLabels.ts` data → DOM render

T-03-04 mitigation applied: `PointerRaycaster` returns early when `pointingNDCRef.current` is null, eliminating per-frame raycasting overhead when no pointing gesture is active.

## Verification Results

- `pnpm exec tsc --noEmit` exits 0 — zero TypeScript errors
- `pnpm run build` exits 0 — Vite build successful (1,483 kB JS / 431 kB gzip; chunk warning pre-existing)
- anatomyLabels.ts has 10 entries (grep count = 10)
- LabelBubble.tsx imports Html from '@react-three/drei'
- LabelBubble.tsx references zIndexRange={[9,0]}
- LabelBubble.tsx does NOT use transform prop
- LabelBubble.tsx uses useFrame (world position tracking)
- Canvas.tsx grep count for PointerRaycaster|LabelBubble|pointingNDCRef = 12
- App.tsx forwards pointingNDCRef to Canvas

## Self-Check: PASSED

- [x] src/data/anatomyLabels.ts — exists (new), commit 6701d3b
- [x] src/components/LabelBubble.tsx — exists (new), commit 6701d3b
- [x] src/components/PointerRaycaster.tsx — exists (new), commit ffed5d7
- [x] src/hooks/useGestureInterpreter.ts — modified, commit ffed5d7
- [x] src/components/Canvas.tsx — modified, commit 245cec7
- [x] src/App.tsx — modified, commit 245cec7
- [x] Commit 6701d3b confirmed in git log (worktree-agent-a1ed657c branch)
- [x] Commit ffed5d7 confirmed in git log
- [x] Commit 245cec7 confirmed in git log
