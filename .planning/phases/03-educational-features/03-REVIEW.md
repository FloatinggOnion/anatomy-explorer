---
phase: 03-educational-features
reviewed: 2026-05-25T00:00:00Z
depth: standard
files_reviewed: 13
files_reviewed_list:
  - src/App.tsx
  - src/store/appState.ts
  - src/components/BottomToolbar.tsx
  - src/components/Canvas.tsx
  - src/components/ExplodeController.tsx
  - src/components/LabelBubble.tsx
  - src/components/LayerChipRow.tsx
  - src/components/ModelGalleryDrawer.tsx
  - src/components/ModelViewer.tsx
  - src/components/PointerRaycaster.tsx
  - src/data/anatomyLabels.ts
  - src/hooks/useGestureInterpreter.ts
  - scripts/generate-thumbnails.mjs
findings:
  critical: 3
  warning: 5
  info: 3
  total: 11
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-05-25T00:00:00Z
**Depth:** standard
**Files Reviewed:** 13
**Status:** issues_found

## Summary

This phase adds the educational features layer: explode/inspect modes, label bubbles, layer chip row, model gallery drawer with file upload, and the pointing-gesture raycast dwell system. The code is generally well-structured with clear separation of concerns across R3F controllers. Three blockers were found:

1. A stale-closure / call-count mismatch bug in `useGestureInterpreter` causes `setSelectedMeshName` to be listed as a `useCallback` dependency but is never called inside the callback — while `inspectMode` is read via `getState()` precisely to avoid being a dep. The dependency array is therefore inconsistent and includes a dead dep.
2. `LabelBubble` renders the `<Html>` component using `meshWorldPosRef.current` — a ref value captured at render time, not the up-to-date per-frame value written by `useFrame`. The label position will be frozen at the value from the last render, not tracking frame-by-frame model movement.
3. The `ModelGalleryDrawer` revokes the object URL in a `useEffect` cleanup that runs **when the component unmounts**. Because `drawerOpen=false` causes the component to return `null` early (line 90), the component unmounts when the drawer closes. This revokes the URL while the model is still displayed in the scene, which may cause the model to be lost or cause errors depending on whether the GLB has already been fully parsed.

Five warnings were found covering dwell dismissal gaps, layer-toggle logic that allows all layers hidden, missing `inspectMode` guard on explode buttons, missing `aria-label` on interactive divs, and the `any` typed `controlsRef`.

---

## Critical Issues

### CR-01: `LabelBubble` position is frozen — `useFrame` ref write is never reflected in JSX render

**File:** `src/components/LabelBubble.tsx:33-52`

**Issue:** `meshWorldPosRef` is a `useRef(new Vector3())`. `useFrame` writes to `meshWorldPosRef.current` each frame (line 38), but `useFrame` does **not** trigger a React re-render. The `<Html position={meshWorldPosRef.current}>` on line 52 reads the ref's value at render time only. After the component first mounts (or after `selectedMeshName` changes triggering a re-render), the `position` prop passed to `<Html>` is the Vector3 object **by reference**. Three.js `Html` from drei stores this as a prop — if it receives the same object identity each render it will not update.

More precisely: `meshWorldPosRef.current` is always the same `Vector3` instance. `useFrame` mutates it in-place each frame. The drei `Html` component internally reads `.x/.y/.z` from the position prop to compute the DOM element's CSS transform. Because it is the same object identity, drei's internal `useEffect`/dependency check may or may not re-run — this is an **undocumented implementation detail** of drei `Html`. In practice, with R3F's render loop, the label will snap to the mesh on first load but will not smoothly follow if the model is rotated (via OrbitControls or gesture) because React does not re-render `LabelBubble` while the model moves.

The correct pattern is to call `useFrame` to write to a ref and then either (a) force a React re-render via `useState`/`useReducer` at a controlled rate, or (b) use drei's `<Html>` with a group/mesh ref via the `transform` prop anchored inside the scene graph so Three.js positions it automatically.

**Fix:** Anchor `<Html>` as a child of a `<group>` positioned at the mesh's world position, updated imperatively via `useFrame` on a ref to that group, OR use a state update approach:

```tsx
// Option A: render Html inside a positioned group, update via group ref
const groupRef = useRef<THREE.Group>(null);

useFrame(() => {
  const group = modelGroupRef.current;
  if (!group || !selectedMeshName || !groupRef.current) return;
  const mesh = findMeshByName(group, selectedMeshName);
  if (mesh) {
    mesh.getWorldPosition(groupRef.current.position);
  }
});

// In JSX:
return (
  <group ref={groupRef}>
    <Html center zIndexRange={[9, 0]} style={{ pointerEvents: 'none' }}>
      {/* ... bubble content ... */}
    </Html>
  </group>
);
```

---

### CR-02: Object URL revoked on drawer close, not on model replacement — active model URL becomes invalid

**File:** `src/components/ModelGalleryDrawer.tsx:79-87, 90`

**Issue:** The component returns `null` when `drawerOpen` is false (line 90), which unmounts the component. The `useEffect` cleanup (lines 79-87) runs on unmount and calls `URL.revokeObjectURL(prevObjectUrlRef.current)`. This means: the moment the user closes the drawer after loading a custom GLB, the object URL backing that model is revoked.

Whether this causes a visible bug depends on timing: if `useGLTF` (and the underlying `three.js` loader) has fully loaded and decoded the GLB binary into GPU memory before the URL is revoked, the scene continues rendering. However:
- On slow connections or large files, the fetch may still be in-flight when the drawer closes, causing a network error mid-load.
- If the user later triggers a `useGLTF.clear()` + re-load (e.g. loading same file again) the URL is already revoked and the re-load will fail with a network error.
- The comment on line 42 says "CR-04: track previous object URL for cache clearing + revocation" — the intent is to revoke the *previous* URL when a new one is created, but the unmount cleanup indiscriminately revokes the *current active* URL.

**Fix:** Remove the unmount cleanup effect. Revocation of the current active URL should only happen when it is replaced by a new one (which already happens in `handleFileChange`, line 65-67), or when the entire app unmounts. The existing `handleFileChange` logic is already correct for the replacement case.

```tsx
// REMOVE this effect entirely:
// useEffect(() => {
//   return () => {
//     if (prevObjectUrlRef.current) {
//       URL.revokeObjectURL(prevObjectUrlRef.current);
//       prevObjectUrlRef.current = null;
//     }
//   };
// }, []);

// The revocation in handleFileChange (lines 64-67) is sufficient:
// if (prevObjectUrlRef.current) {
//   useGLTF.clear(prevObjectUrlRef.current);
//   URL.revokeObjectURL(prevObjectUrlRef.current);
// }
// prevObjectUrlRef.current = newUrl;
```

If a cleanup on true app-level unmount is needed, move the `useEffect` to a parent component that is never unmounted (e.g., `App.tsx`).

---

### CR-03: `setSelectedMeshName` is a dead dependency in `useGestureInterpreter`'s `useCallback`

**File:** `src/hooks/useGestureInterpreter.ts:71, 258`

**Issue:** `setSelectedMeshName` is subscribed from the store at line 71 and listed in the `useCallback` dependency array at line 258. However, `setSelectedMeshName` is **never called** inside the `interpret` callback. Searching the entire callback body (lines 89-256) confirms there is no call site. This is either dead code left from a refactor (the dismiss-on-pointing-at-empty-space logic that was moved to `PointerRaycaster`) or an error.

The risk: the dependency array comment (line 257) explicitly suppresses the exhaustive-deps ESLint rule. If a future developer adds a call to `setSelectedMeshName` inside `interpret`, the suppression comment will hide correctness issues. Additionally, holding a stale `setSelectedMeshName` in the dep array means `interpret` re-memoizes whenever `setSelectedMeshName` changes identity (Zustand guarantees stable identity for setters, so this is low practical risk, but it is still incorrect).

The dead refs `dwellStartRef`, `dwellMeshRef`, and `DWELL_MS` (lines 85-87, 261-264) further confirm this: the original dwell-dismiss plan was moved to `PointerRaycaster`, but `useGestureInterpreter` retains the dead state and dead dep.

**Fix:** Remove `setSelectedMeshName` from the `useCallback` dependency array and from the Zustand subscription. Remove the three dead refs (`dwellStartRef`, `dwellMeshRef`, `DWELL_MS`) and the `void` suppression statements.

```ts
// Remove line 71:
// const setSelectedMeshName = useAppStore((s) => s.setSelectedMeshName);

// Remove lines 85-87:
// const dwellStartRef = useRef<number | null>(null);
// const dwellMeshRef = useRef<string | null>(null);
// const DWELL_MS = 1000;

// Update dependency array (line 258):
[setGestureActive, setExplodeActive, PINCH_ENTER, PINCH_EXIT, DEAD_ZONE_PX, rotationSensitivity],

// Remove lines 261-264:
// void dwellStartRef;
// void dwellMeshRef;
// void DWELL_MS;
```

---

## Warnings

### WR-01: Pointing at empty space never dismisses the label — dwell null path has no effect

**File:** `src/components/PointerRaycaster.tsx:49-55, 67-72`

**Issue:** When `ndc` is null (no pointing gesture detected), the code resets the dwell timer refs but explicitly does NOT clear `selectedMeshName` (comment on line 51: "label stays until user actively points at empty space for DWELL_MS"). This is intended. However, when the user IS pointing but hits empty space (`meshName === null`), the dwell timer runs and calls `setSelectedMeshName(null)` after 1 second — this path IS implemented.

The gap is in the no-pointing-gesture path: if the user lowers their hand entirely, `ndc` becomes null, the dwell refs are reset, and the label persists forever. There is no code path that dismisses the label when the pointing gesture ends. The user is stuck with the label until they point at empty space for 1 second.

This is a UX correctness issue: the design intent (per D-06) says the label dismisses after dwell on empty space, but the "no hand" case silently bypasses that.

**Fix:** Add a timer in the `ndc === null` path to clear the selected mesh name after a grace period:

```ts
if (!ndc) {
  // Start dismiss timer if not already running
  if (dwellStartRef.current === null) {
    dwellStartRef.current = performance.now();
    dwellMeshRef.current = null;
  } else if (performance.now() - dwellStartRef.current >= DWELL_MS) {
    setSelectedMeshName(null);
    dwellStartRef.current = null;
  }
  return;
}
// Reset dismiss timer when pointing is active
dwellStartRef.current = null;
```

---

### WR-02: All layers can be toggled off simultaneously — model disappears with no recovery affordance

**File:** `src/components/LayerChipRow.tsx:30-38`

**Issue:** `toggleLayer` allows toggling any layer off independently. There is no guard preventing the user from deactivating all layers, which makes the model invisible. The `visibleLayers` set in Zustand will be empty, `ExplodeController`'s visibility effect will set all children to `visible=false`, and the user sees a blank canvas with no UI indication of what happened or how to recover.

**Fix:** Either prevent toggling the last visible layer off:

```ts
function toggleLayer(name: string) {
  const next = new Set(visibleLayers);
  if (next.has(name)) {
    if (next.size === 1) return; // prevent all-hidden state
    next.delete(name);
  } else {
    next.add(name);
  }
  setVisibleLayers(next);
}
```

Or add a "Reset layers" chip that calls `setVisibleLayers(new Set(availableLayers))`.

---

### WR-03: `controlsRef` typed as `React.RefObject<any>` across all call sites

**File:** `src/components/ModelViewer.tsx:35, 128, 153` and `src/components/Canvas.tsx:32`

**Issue:** `controlsRef` is typed as `React.RefObject<any>` in `GLBModel`, `GLBModelWithErrorBoundary`, and `ModelViewer`. The `controlsRef.current.target.set(...)` and `controlsRef.current.update()` calls (ModelViewer.tsx line 66-68) and the `(controlsRef.current as any).enabled = ...` cast (Canvas.tsx line 59) provide zero type safety. A rename, API change, or wrong ref passed would only fail at runtime.

**Fix:** Import and use the drei `OrbitControls` type:

```ts
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
// controlsRef: React.RefObject<OrbitControlsImpl | null>
```

This lets TypeScript verify `.target`, `.update()`, and `.enabled` exist.

---

### WR-04: `ExplodeController` recomputes explode positions while animation is mid-progress — causes position jump

**File:** `src/components/ExplodeController.tsx:52-88`

**Issue:** The `useEffect` that recomputes `groupDataRef.current` (lines 52-88) depends on `[availableLayers, EXPLODE_MULTIPLIER, modelGroupRef]`. When `EXPLODE_MULTIPLIER` changes via the Leva slider while the model is partially exploded (`explodeProgressRef.current` between 0 and 1), the effect recomputes `restPosition` from `child.position.clone()` (line 74). But `child.position` at that moment is the **animated intermediate position** (not the rest position), because `useFrame` has been mutating it. So the new `restPosition` is wrong — it is the current animated position, not the true rest.

This means: if a user drags the Leva multiplier slider while the explode is active (or partially animated), the rest positions are corrupted and the model geometry will drift permanently.

**Fix:** Store rest positions separately and immutably on first mount. Do not re-read `child.position` after the first scan:

```ts
// Separate effect: capture rest positions once on model load (availableLayers change)
// A second effect: update only explodedPosition when EXPLODE_MULTIPLIER changes,
// using the already-stored restPosition from groupDataRef, not child.position
useEffect(() => {
  // Only recompute if the layer set changed (new model loaded)
  // Keep restPosition from previous data if same layers, update only explodedPos
  ...
}, [availableLayers]); // NOT EXPLODE_MULTIPLIER

useEffect(() => {
  // Recompute explodedPosition from stored restPosition + new multiplier
  groupDataRef.current = groupDataRef.current.map((d) => ({
    ...d,
    explodedPosition: d.restPosition.clone().add(
      direction.multiplyScalar(boundingRadius * EXPLODE_MULTIPLIER)
    ),
  }));
}, [EXPLODE_MULTIPLIER]);
```

---

### WR-05: Explode and Inspect buttons in `BottomToolbar` have no dependency on `modelUrl` — active on skeleton

**File:** `src/components/BottomToolbar.tsx:155-193`

**Issue:** The Explode and Inspect toggle buttons are always enabled and clickable, even when the skeleton (procedural model) is active. The skeleton's `SkeletonPreview` component uses named groups (skull, spine, etc.) so layers do work, but the explode animation behavior with the procedural skeleton was not verified in this phase's code to be intentional — more importantly, enabling Inspect mode and pointing at the skeleton triggers the pointing-gesture label path, which may work or produce confusing UX depending on skeleton mesh naming.

The Layers button correctly disables itself when `availableLayers.length === 0` (line 129). Explode and Inspect should follow the same pattern when no model is loaded, OR at minimum their disabled state should be documented.

**Fix:** Disable Explode/Inspect when `availableLayers.length === 0` (which signals no named-group model is loaded), or add an explicit `modelUrl`-based guard matching the Layers button pattern.

---

## Info

### IN-01: `BottomToolbar` defines `Divider` as an inline component inside the render function

**File:** `src/components/BottomToolbar.tsx:28-37`

**Issue:** `Divider` is defined as a function component inside `BottomToolbar`'s function body. This means a new function identity is created on every render, causing React to unmount and remount the `<Divider />` elements on every parent re-render. While the actual DOM element is trivial (a single `<div>`), this is an anti-pattern that violates React's rules for component stability.

**Fix:** Move `Divider` outside the `BottomToolbar` function, or replace with a plain `<div>` inline since it has no props.

---

### IN-02: `scanNamedGroups` in `ModelViewer.tsx` collects all node names including the root group and camera nodes

**File:** `src/components/ModelViewer.tsx:9-15`

**Issue:** `scanNamedGroups` traverses the entire group tree and collects every node with a non-empty `child.name`. This includes the root group itself (which has name `""` typically but depends on the GLB), camera nodes, light nodes, and empty transform nodes baked into the GLB. These non-geometry names will appear as layer chips in the UI and as targets for the dwell raycaster, cluttering the layer list.

**Fix:** Filter to only nodes that have geometry, or filter by `child.type === 'Mesh'` or `child.type === 'Group'` based on the expected GLB structure:

```ts
function scanNamedGroups(group: Group): string[] {
  const names: string[] = [];
  group.traverse((child: Object3D) => {
    // Only collect named Groups (anatomy layers) and Meshes, not cameras/lights
    if (child.name && (child.type === 'Group' || child.type === 'Mesh')) {
      names.push(child.name);
    }
  });
  return [...new Set(names)];
}
```

---

### IN-03: `useGLTF.clear()` called inside an event handler — violates React hook rules in spirit

**File:** `src/components/ModelGalleryDrawer.tsx:65`

**Issue:** `useGLTF.clear(prevObjectUrlRef.current)` is called inside `handleFileChange` (an event handler, not a hook). `useGLTF.clear` is a static method on the hook object and is safe to call anywhere — this is not a React hook rule violation technically. However, it is worth noting that `useGLTF.clear` only clears the drei/three-stdlib GLTF cache for that URL; if other components hold a reference to the loaded scene object, those references remain live. The comment on line 40-41 states the intent correctly. This is informational only — the existing pattern is acceptable.

**Fix:** No code change required. Consider adding a brief comment clarifying that `useGLTF.clear` is a static cache utility, not a hook call, to prevent future confusion:

```ts
// useGLTF.clear is a static cache utility (not a hook) — safe to call in event handlers
useGLTF.clear(prevObjectUrlRef.current);
```

---

_Reviewed: 2026-05-25T00:00:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
