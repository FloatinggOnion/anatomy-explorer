---
phase: "03"
plan: "03"
subsystem: educational-features
tags: [layers, explode-view, gesture-detection, inspect-mode, react-three-fiber]
dependency_graph:
  requires:
    - "03-01"
    - "03-02"
  provides:
    - layer-chip-row
    - explode-controller
    - spread-fist-gestures
  affects:
    - src/components/ExplodeController.tsx
    - src/components/LayerChipRow.tsx
    - src/components/ModelViewer.tsx
    - src/components/BottomToolbar.tsx
    - src/components/Canvas.tsx
    - src/hooks/useGestureInterpreter.ts
tech_stack:
  added: []
  patterns:
    - "useFrame lerp with Math.pow(0.02, delta) for framerate-independent explode animation"
    - "useEffect watching visibleLayers for layer visibility (not useFrame — T-03-06 mitigation)"
    - "useAppStore.getState() non-reactive read for inspectMode in gesture callback (A1 pattern)"
    - "scanNamedGroups traversal using group.traverse with Set deduplication"
key_files:
  created:
    - src/components/ExplodeController.tsx
    - src/components/LayerChipRow.tsx
  modified:
    - src/components/ModelViewer.tsx
    - src/components/BottomToolbar.tsx
    - src/components/Canvas.tsx
    - src/hooks/useGestureInterpreter.ts
decisions:
  - "Explode positions computed in local space using child.position.clone() (Pitfall 5: modelGroupRef at world origin after auto-fit)"
  - "Layer visibility via useEffect not useFrame — fires only on state change, O(n) traverse acceptable"
  - "inspectMode read via getState() in interpret() callback — avoids stale closure without adding reactive dep"
  - "EXPLODE_MULTIPLIER exposed via Leva dev panel at 1.2 default for demo tuning"
metrics:
  duration: "~15 minutes"
  completed: "2026-05-25T12:16:15Z"
  tasks_completed: 3
  files_modified: 6
---

# Phase 03 Plan 03: Layers + Explode + Inspect Gesture Slice Summary

Delivered the layers/explode/inspect gesture feature set: ExplodeController animates model parts outward using per-frame lerp, LayerChipRow renders toggle chips for named mesh groups, BottomToolbar enables the Layers button when groups exist, Canvas wires the onGroupsScanned callback to Zustand, and useGestureInterpreter detects spread/fist gestures gated on inspectMode.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add onGroupsScanned to ModelViewer and create ExplodeController | b059acb | src/components/ModelViewer.tsx, src/components/ExplodeController.tsx |
| 2 | Create LayerChipRow, enable Layers button, wire ExplodeController in Canvas | 4e283e7 | src/components/LayerChipRow.tsx, src/components/BottomToolbar.tsx, src/components/Canvas.tsx |
| 3 | Add spread/fist gesture detection to useGestureInterpreter | 6d9a9a7 | src/hooks/useGestureInterpreter.ts |

## What Was Built

**ExplodeController.tsx** — Invisible R3F component that:
- Computes GroupExplodeData on model load: derives rest/exploded positions using local-space child.position + world-space bounding box direction offset
- Animates explode progress via `MathUtils.lerp` with `1 - Math.pow(0.02, delta)` factor for framerate-independent smooth animation (~0.5s convergence)
- Controls layer visibility via `useEffect` watching `visibleLayers` — T-03-06 mitigation (not per-frame)
- Leva debug panel: EXPLODE_MULTIPLIER (default 1.2, range 0.5–3.0)
- T-03-05 mitigation: early return in useFrame when groupDataRef is empty

**LayerChipRow.tsx** — Fixed chip row above toolbar (bottom: 44px):
- Reads availableLayers + visibleLayers from Zustand
- Toggle chips: active = #2563EB fill, inactive = translucent with border
- prettifyLayerName: hyphens to spaces, title-case capitalization
- Returns null when no layers available (D-14)

**ModelViewer.tsx** — Already had onGroupsScanned wired (confirmed from wave 1/2):
- scanNamedGroups helper traverses all descendants, deduplicates via Set
- GLBModel fires callback in useLayoutEffect after auto-fit
- SkeletonPreview fires callback in empty-deps useLayoutEffect on mount

**BottomToolbar.tsx** — Already had Layers button functional (confirmed from wave 1/2):
- Disabled (opacity 0.4, cursor not-allowed) when availableLayers.length === 0
- Toggle layersOpen local state; accent border when open
- Renders LayerChipRow conditionally above toolbar bar

**Canvas.tsx** — Already had ExplodeController mounted and onGroupsScanned wired (confirmed):
- useCallback for onGroupsScanned: setAvailableLayers + setVisibleLayers(new Set(names))
- ExplodeController mounted alongside SceneController and PointerRaycaster

**useGestureInterpreter.ts** — New in this task:
- isSpread(): all 4 non-thumb fingers extended (tip y < PIP y for each)
- isFist(): all 4 non-thumb fingers curled (tip y > PIP y for each)
- setExplodeActive selector added at hook body top
- Spread/fist block placed before pinch detection; gated on `useAppStore.getState().inspectMode`
- setExplodeActive added to useCallback dependency array

## Verification Results

- `pnpm exec tsc --noEmit` exits 0
- `pnpm run build` exits 0 (1,483 kB JS, 431 kB gzip)
- All acceptance criteria met for all 3 tasks

## Deviations from Plan

None — plan executed exactly as written. Tasks 1 and 2 were fully implemented by prior wave agents (b059acb, 4e283e7); Task 3 had uncommitted changes that were committed as part of this execution.

## Known Stubs

None. All features are fully wired:
- Layer chips connected to visibleLayers Zustand state which controls ExplodeController useEffect
- Explode animation reads real group positions from Three.js scene graph
- Spread/fist gestures call setExplodeActive which drives ExplodeController useFrame

## Threat Surface Scan

No new threat surface introduced beyond what is documented in the plan's threat model (T-03-05, T-03-06, T-03-07 — all accepted or mitigated as specified).

## Self-Check: PASSED

Files verified present:
- src/components/ExplodeController.tsx: FOUND
- src/components/LayerChipRow.tsx: FOUND
- src/hooks/useGestureInterpreter.ts: FOUND

Commits verified:
- b059acb (Task 1): FOUND
- 4e283e7 (Task 2): FOUND
- 6d9a9a7 (Task 3): FOUND
