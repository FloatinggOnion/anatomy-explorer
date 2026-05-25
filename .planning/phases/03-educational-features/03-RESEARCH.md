# Phase 3: Educational Features - Research

**Researched:** 2026-05-25
**Domain:** React Three Fiber — raycasting, drei Html, scene graph traversal, animated explode view, gesture detection
**Confidence:** HIGH

---

## Summary

Phase 3 adds four educational interaction features on top of the Phase 2 model viewer: a model gallery drawer (MDL-02), body part label overlays via pointing gesture (MDL-03), layer visibility toggles (MDL-04), and an animated explode view with gesture binding (MDL-05). All four features extend already-established patterns: the Zustand store, `modelGroupRef`, `SceneController.useFrame`, and `useGestureInterpreter`.

**Critical asset finding:** `body.glb` has a **single mesh named "Proxy"** with a skeleton-only armature hierarchy (20 joint nodes, no named mesh groups). `skeleton.glb` is also a single mesh ("SkeletonMesh"). Neither file has the named mesh groups required for layer toggles (MDL-04) or explode view per-group offsets (MDL-05). The only model with named groups is the **procedural skeleton** built in `SkeletonPreview.tsx` (skull, spine, ribcage, pelvis, left-arm, right-arm, left-leg, right-leg). This is not a blocker — layer toggles and explode view will work on the procedural skeleton and on any user-loaded GLB that happens to have named groups. The bundled GLBs simply have no groups to toggle; the Layers button will be disabled for them per decision D-14.

**Primary recommendation:** Implement all four features as composable additions to existing components. The pointing gesture raycast works by projecting MediaPipe landmark 8 coordinates from `handleResults` in `App.tsx` into Three.js NDC, then calling `raycaster.setFromCamera` on the R3F scene's camera and `intersectObjects` against `modelGroupRef.current`. Use drei `<Html center>` for label bubbles — it handles 3D-to-screen projection automatically each frame.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Model Gallery (MDL-02)**
- D-01: Gallery lives in a side drawer that overlays the AR canvas (canvas keeps running underneath). No push/resize of the Three.js viewport.
- D-02: Each drawer entry shows a pre-rendered PNG thumbnail + model name. Bundled models (skeleton, body) ship with PNGs in `public/models/`. User-loaded models fall back to a generic 3D box icon.
- D-03: Load file is moved INTO the drawer (a '+ Load file' entry at the bottom). Existing Load Model button is removed from the bottom toolbar.
- D-04: Selecting a model from the drawer immediately loads it and closes the drawer.
- D-05: Currently active model is visually highlighted in the drawer list.

**Body Part Labels (MDL-03)**
- D-06: Selection gesture: index finger extended + hold ~1 second (pointing gesture, not pinch). Raycasting from 2D screen position of index fingertip landmark.
- D-07: Label content: name + short description. Source is `src/data/anatomyLabels.ts` mapping mesh name → `{ name: string; description: string }`.
- D-08: Fallback for unknown mesh names: display prettified raw mesh name only. No error state.
- D-09: Label is rendered as HTML overlay anchored to selected mesh's 3D world position using drei's `<Html>` component.
- D-10: Only one body part selected at a time. Selecting another replaces label. Pointing elsewhere deselects.

**Layer Toggles (MDL-04)**
- D-11: Layers work on ANY model with named mesh groups — scan mesh children on load and auto-generate toggle chips. Procedural skeleton uses its named groups. User-loaded GLBs with named groups also get toggles.
- D-12: Layer toggle UI lives in the bottom toolbar: a 'Layers' button expands a row of toggle chips above the toolbar.
- D-13: All layers default to visible when a model loads. State resets on model switch.
- D-14: If a loaded model has no named mesh groups, the Layers button is hidden or disabled.

**Explode View (MDL-05)**
- D-15: Explode is a toggle button in the bottom toolbar. Binary: off = normal, on = parts separated.
- D-16: Works on any model with named mesh groups.
- D-17: Each mesh group moves outward from the model's bounding box center. Direction = normalize(groupCenter − modelCenter). Automatic, no per-model authoring needed.
- D-18: Transition animated using Three.js lerp in `useFrame`, ~0.5 seconds.
- D-19: Explode magnitude is a fixed multiplier (e.g. 1.5×). Claude decides exact value.

**Inspect Mode & Gesture Binding**
- D-20: Dedicated 'Inspect' toggle button in bottom toolbar.
- D-21: In Inspect mode only: spread fingers → explode ON; fist → explode OFF.
- D-22: Outside Inspect mode, spread/fist have no effect on explode.
- D-23: In Inspect mode, pinch+drag rotation still works normally.
- D-24: Inspect mode and Layers panel are independent.

### Claude's Discretion
- Exact explode multiplier/scale factor
- Animation easing curve for explode lerp (smooth deceleration preferred over linear)
- Drawer animation direction (left edge) and width
- Label bubble styling

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MDL-02 | User can browse and select different anatomy models from a gallery/menu | Side drawer component with Zustand `drawerOpen` state; `modelUrl` setter already in store; thumbnail PNG convention documented in UI-SPEC |
| MDL-03 | User can point index finger at body part, hold ~1 sec, see name/label overlay | MediaPipe landmark 8 NDC projection → `raycaster.setFromCamera` → `intersectObjects`; dwell timer via `useRef`; drei `<Html center>` for label anchoring |
| MDL-04 | User can toggle body system layers on/off | `group.traverse()` to collect named top-level groups on load; `visibleLayers` Set in Zustand; `visible` prop set in `useFrame` or effect |
| MDL-05 | User can explode model view to see internal structures | Per-group offset vectors from bounding box center; lerp in `useFrame`; `explodeActive` + `inspectMode` in Zustand; spread/fist gesture gated on `inspectMode` |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Model gallery drawer | Browser / Client (React DOM) | — | Pure UI overlay at z:10; no 3D involvement |
| Anatomy label bubble | R3F Scene (drei Html) | Browser / Client | Html component bridges 3D position to DOM layer; rendered inside R3F Canvas |
| Layer visibility toggle | R3F Scene (useFrame/effect) | Zustand store | `group.visible` is a Three.js property; must be set on 3D objects; Zustand holds which layers are visible |
| Explode view animation | R3F Scene (useFrame) | Zustand store | Per-frame lerp must run inside R3F render loop; `explodeActive` state from Zustand drives target positions |
| Pointing gesture detection | App.tsx / useGestureInterpreter | — | Landmark data arrives in `handleResults`; raycasting projection coordinated from outside R3F then passed in via ref (same pattern as GestureCommand) |
| Spread/fist gesture detection | useGestureInterpreter | Zustand (`inspectMode`) | Existing gesture hook; new code paths gated on `inspectMode` selector |
| Dwell timer (1-second hold) | useGestureInterpreter or App.tsx | — | Must persist across MediaPipe frames; ref-based timer, no React state |

---

## Standard Stack

### Core (all already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @react-three/drei | 10.7.7 | `<Html>` label anchoring, bounding box helpers | Already in project; `Html` is the canonical R3F DOM-in-3D primitive |
| three | 0.170.0 | `Raycaster`, `Box3`, `Vector3.lerp`, `Box3Helper` | Core math for raycasting and explode offset computation |
| zustand | 5.0.0 | Store new fields: `drawerOpen`, `inspectMode`, `explodeActive`, `visibleLayers`, `selectedMeshName`, `availableLayers` | Established pattern from Phase 2 |
| react | 19.0.0 | Gallery drawer as standard React component | UI overlay components |

### No New Dependencies Required
All Phase 3 features use libraries already installed. No `pnpm add` needed.

---

## Architecture Patterns

### System Architecture Diagram

```
MediaPipe frame arrives → handleResults() in App.tsx
        │
        ├─► interpret() in useGestureInterpreter
        │       ├─ existing: pinch/rotate/scale/pan → gestureCommandRef
        │       ├─ NEW: pointing detection → pointingRef (landmark 8 position)
        │       │        + dwell timer → fires selectedMeshName setter after 1s
        │       └─ NEW: spread/fist detection → if inspectMode → setExplodeActive()
        │
        └─► NDC projection of landmark 8 → raycasterCommandRef (or inline in useFrame)

R3F render loop (useFrame in SceneController or new ExplodeController)
        │
        ├─ reads explodeActive from Zustand
        ├─ lerps each named group position toward target (exploded / rest)
        └─ reads visibleLayers from Zustand → sets group.visible per layer name

drei <Html center> inside R3F Canvas
        └─ positioned at selectedMesh.getWorldPosition()
           renders label bubble (React DOM) projected to 3D anchor point

React DOM (z:10)
        ├─ ModelGalleryDrawer — overlays canvas, slides from left
        └─ BottomToolbar additions — Models, Layers, Explode, Inspect buttons
                                     + LayerChipRow expanding above toolbar
```

### Recommended Project Structure
```
src/
├─ components/
│   ├─ ModelGalleryDrawer.tsx   # NEW: side drawer, model list, + Load file
│   ├─ LabelBubble.tsx          # NEW: drei <Html> wrapper with styled content
│   ├─ LayerChipRow.tsx         # NEW: expandable chip row above toolbar
│   ├─ BottomToolbar.tsx        # MODIFIED: remove Load Model, add 4 buttons
│   ├─ Canvas.tsx               # MODIFIED: pass raycasterRef, new controller
│   ├─ ModelViewer.tsx          # MODIFIED: expose named group scan callback
│   ├─ SceneController.tsx      # MODIFIED or new ExplodeController alongside
│   └─ SkeletonPreview.tsx      # unchanged (already has named groups)
├─ hooks/
│   └─ useGestureInterpreter.ts # MODIFIED: pointing + spread/fist paths
├─ store/
│   └─ appState.ts              # MODIFIED: add 6 new fields
└─ data/
    └─ anatomyLabels.ts         # NEW: mesh name → { name, description }
```

### Pattern 1: Manual Raycasting from MediaPipe Landmark Coordinates

MediaPipe landmarks are normalized [0,1] in webcam space (not NDC). Conversion to Three.js NDC requires:

```typescript
// Source: threejs.org/docs/pages/Raycaster.html + R3F useThree docs
// Inside useFrame or a ref callback triggered by handleResults:

// landmark 8 from MediaPipe = { x: 0..1, y: 0..1 } (normalized, Y=0 is top)
// Three.js NDC: x in [-1,1], y in [-1,1] with Y=1 at top

function landmarkToNDC(lx: number, ly: number): THREE.Vector2 {
  return new THREE.Vector2(lx * 2 - 1, -(ly * 2 - 1));
}

// Inside a useFrame callback (e.g. in a new PointerRaycaster component):
useFrame(({ camera, scene }) => {
  const pointingPos = pointingNDCRef.current; // written by App.tsx when pointing
  if (!pointingPos) return;

  raycaster.setFromCamera(pointingPos, camera);
  const group = modelGroupRef.current;
  if (!group) return;

  const hits = raycaster.intersectObject(group, true); // recursive = true
  if (hits.length > 0) {
    const hitMesh = hits[0].object;
    // Walk up to find the named top-level group child
    const groupName = findNamedGroupAncestor(hitMesh, group);
    dwellRef.current.meshName = groupName;
  } else {
    dwellRef.current.meshName = null;
  }
});
```

**Key detail:** The raycasting must run inside `useFrame` (inside the R3F Canvas) so it has access to `camera` and `scene`. The pointing landmark position is passed in as a ref written from `App.tsx` — same pattern as `gestureCommandRef`.

**Finding named group ancestor:** A hit's `object` is a leaf mesh deep in the hierarchy. Walk `object.parent` until you reach a direct child of `modelGroupRef.current`:

```typescript
// Source: [ASSUMED] based on Three.js Object3D.parent traversal pattern
function findNamedGroupAncestor(
  obj: THREE.Object3D,
  root: THREE.Object3D,
): string | null {
  let current: THREE.Object3D | null = obj;
  while (current && current.parent !== root) {
    current = current.parent;
  }
  return current?.name || null;
}
```

### Pattern 2: drei `<Html center>` for Label Anchoring

The `<Html>` component from drei must be placed **inside** the R3F `<Canvas>`. It projects DOM content to follow a 3D world position each frame automatically. [VERIFIED: drei.docs.pmnd.rs/misc/html]

```typescript
// Source: drei.docs.pmnd.rs/misc/html
import { Html } from '@react-three/drei';

// Usage inside a component rendered within <Canvas>:
// position prop = 3D world coords of the selected mesh
{selectedMeshRef.current && (
  <Html
    center                    // applies -50%/-50% CSS transform (centered on anchor)
    position={meshWorldPos}   // THREE.Vector3 updated each frame via useFrame
    zIndexRange={[10, 0]}     // render above other HTML but below toolbar z:10
    style={{ pointerEvents: 'none' }}
  >
    <LabelBubbleContent name={labelName} description={labelDesc} />
  </Html>
)}
```

**Critical props:**
- `center`: centers the DOM node on the 3D anchor point (required per UI-SPEC offset design)
- `zIndexRange`: controls stacking; set below toolbar (z:10) to avoid blocking toolbar clicks
- `occlude`: optional — set to `[modelGroupRef]` to hide label when mesh faces away from camera
- `distanceFactor`: leave unset; we don't want distance-based scaling for labels
- `transform`: do NOT use — blurs on some devices and is unnecessary for flat label bubbles

**Getting mesh world position:** Use `mesh.getWorldPosition(targetVector3)` inside `useFrame` to update the anchor each frame as the model rotates.

**Performance:** `<Html>` triggers a DOM mutation each frame to update CSS transform. For a single label bubble this is acceptable. Do not render multiple `<Html>` simultaneously.

### Pattern 3: Scene Graph Traversal for Named Groups

When a model loads, scan its top-level direct children of `modelGroupRef.current` for named groups. This fires once per model load (in a `useEffect` or `useLayoutEffect` watching `modelUrl`):

```typescript
// Source: [ASSUMED] based on Three.js Object3D.traverse and .children patterns
import type * as THREE from 'three';

function scanNamedGroups(group: THREE.Group): string[] {
  const names: string[] = [];
  group.traverse((child) => {
    // Only collect direct named children with 'group' or named meshes
    if (child.parent === group && child.name && child.name.length > 0) {
      names.push(child.name);
    }
  });
  return names;
}

// Or simpler — only look at direct children:
function scanDirectNamedChildren(group: THREE.Group): string[] {
  return group.children
    .filter((c) => c.name && c.name.length > 0)
    .map((c) => c.name);
}
```

**Important:** For `SkeletonPreview`, the named groups (skull, spine, etc.) are children of the inner `<ProceduralSkeleton>` group, which itself is a child of the outer group with `ref={groupRef}`. The scan must traverse one level deeper for the procedural skeleton. Verify the hierarchy at runtime.

### Pattern 4: Explode View — Per-Frame Lerp

```typescript
// Source: [ASSUMED] — standard Three.js lerp in R3F useFrame pattern
// (confirmed Vector3.lerp exists in three 0.170.0 docs)

// Data computed ONCE when model loads or explode first activates:
type GroupExplodeData = {
  name: string;
  object: THREE.Object3D;
  restPosition: THREE.Vector3;     // original position (clone on load)
  explodedPosition: THREE.Vector3; // restPosition + offset * magnitude
};

// In useFrame:
useFrame((_, delta) => {
  const target = explodeActive ? 1.0 : 0.0;
  explodeProgressRef.current = THREE.MathUtils.lerp(
    explodeProgressRef.current,
    target,
    1 - Math.pow(0.02, delta), // exponential ease — independent of framerate
  );

  for (const data of groupDataRef.current) {
    data.object.position.lerpVectors(
      data.restPosition,
      data.explodedPosition,
      explodeProgressRef.current,
    );
  }
});
```

**Framerate-independent lerp:** `1 - Math.pow(factor, delta)` gives consistent easing regardless of frame rate. At 60fps this produces ~0.5s settle time with `factor = 0.02`. [ASSUMED — standard game-dev pattern]

**Offset computation:**
```typescript
// Compute exploded position for one named group
const modelCenter = new THREE.Vector3();
new THREE.Box3().setFromObject(modelGroupRef.current!).getCenter(modelCenter);

const groupCenter = new THREE.Vector3();
new THREE.Box3().setFromObject(groupObject).getCenter(groupCenter);

const direction = groupCenter.clone().sub(modelCenter).normalize();
const boundingRadius = new THREE.Box3()
  .setFromObject(modelGroupRef.current!)
  .getSize(new THREE.Vector3()).length() / 2;

const explodedPos = groupObject.position.clone()
  .add(direction.multiplyScalar(boundingRadius * EXPLODE_MULTIPLIER));
```

**Recommended EXPLODE_MULTIPLIER: 1.2** — sufficient separation for the procedural skeleton's compact size (~2 units after auto-fit). Expose as Leva constant for tuning.

### Pattern 5: Pointing + Dwell Detection

The pointing gesture is: index finger extended (landmark 8.y < landmark 6.y) + all other finger tips curled (tip.y > pip.y for fingers 2, 3, 4). The existing interpreter already tracks per-finger tip/pip indices implicitly for pinch; pointing is additive.

```typescript
// MediaPipe landmark indices (from CLAUDE.md):
// Thumb:  1(CMC) 2(MCP) 3(IP) 4(TIP)
// Index:  5(MCP) 6(PIP) 7(DIP) 8(TIP)
// Middle: 9(MCP) 10(PIP) 11(DIP) 12(TIP)
// Ring:   13(MCP) 14(PIP) 15(DIP) 16(TIP)
// Pinky:  17(MCP) 18(PIP) 19(DIP) 20(TIP)

function isPointing(hand: NormalizedLandmark[]): boolean {
  const indexExtended = hand[8].y < hand[6].y;  // index tip above PIP = extended
  const middleCurled  = hand[12].y > hand[10].y;
  const ringCurled    = hand[16].y > hand[14].y;
  const pinkyCurled   = hand[20].y > hand[18].y;
  return indexExtended && middleCurled && ringCurled && pinkyCurled;
}
```

**Dwell timer — ref-based (no React state):**

```typescript
// Inside interpret() or a separate useDwellTimer hook:
const dwellStartRef = useRef<number | null>(null);
const dwellMeshRef  = useRef<string | null>(null);
const DWELL_MS = 1000;

// Called each frame when pointing:
if (currentMeshName === dwellMeshRef.current) {
  if (dwellStartRef.current !== null &&
      performance.now() - dwellStartRef.current >= DWELL_MS) {
    setSelectedMeshName(currentMeshName); // Zustand setter — fires once
    dwellStartRef.current = null;         // reset so it doesn't re-fire
  } else if (dwellStartRef.current === null) {
    dwellStartRef.current = performance.now(); // start timer
  }
} else {
  // Mesh changed — reset timer
  dwellMeshRef.current = currentMeshName;
  dwellStartRef.current = currentMeshName ? performance.now() : null;
}
```

### Pattern 6: Spread / Fist Gesture Detection

```typescript
// Source: CONTEXT.md specifics + CLAUDE.md landmark reference
// Spread = all 5 fingertips above their PIP (all extended)
function isSpread(hand: NormalizedLandmark[]): boolean {
  return hand[8].y  < hand[6].y  &&  // index
         hand[12].y < hand[10].y &&  // middle
         hand[16].y < hand[14].y &&  // ring
         hand[20].y < hand[18].y;    // pinky
  // Thumb omitted — unreliable axis (thumb extends sideways, y-comparison unreliable)
}

// Fist = all 4 non-thumb fingertips below their PIP (all curled)
function isFist(hand: NormalizedLandmark[]): boolean {
  return hand[8].y  > hand[6].y  &&
         hand[12].y > hand[10].y &&
         hand[16].y > hand[14].y &&
         hand[20].y > hand[18].y;
}
```

**Gating pattern in `interpret()`:**
```typescript
const inspectMode = useAppStore.getState().inspectMode; // non-reactive read
if (inspectMode) {
  if (isSpread(hand0)) setExplodeActive(true);
  if (isFist(hand0))   setExplodeActive(false);
}
```

Use `useAppStore.getState()` (not a selector hook) inside `interpret()` to avoid hook rule violations. This is the established Zustand pattern for non-reactive reads inside callbacks. [ASSUMED — standard Zustand getState() pattern]

### Anti-Patterns to Avoid

- **Calling `raycaster.setFromCamera` outside `useFrame`:** The camera matrix is updated by R3F internally; calling it from `handleResults` (outside the render loop) may use a stale camera matrix. Pass the NDC coordinates into R3F via a ref and raycast inside `useFrame`.
- **Using `useState` for per-frame pointing data:** Will cause excessive re-renders (30-60 calls/sec). Use refs for all gesture/dwell state; only write to Zustand for discrete events (mesh selected, explode toggled).
- **Setting `group.visible` inside `useFrame` on every frame:** Cache the previous `visibleLayers` set and only update `group.visible` when the set changes (use a `useEffect` watching `visibleLayers`, not `useFrame`).
- **Placing `<Html>` outside `<Canvas>`:** The drei `Html` component must be a descendant of the R3F `Canvas` tree — it uses the internal fiber reconciler to project positions.
- **Computing explode offsets every frame:** Compute rest/exploded positions once when the model loads (or when `explodeActive` first changes) and store in a ref. `useFrame` only lerps between cached values.
- **Using `transform` prop on `<Html>`:** Causes blurriness on some devices; unnecessary for flat UI labels.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| DOM node projected to 3D world position | Custom CSS `top/left` calculation from camera projection | `drei <Html center>` | drei handles camera projection, resize, and per-frame update automatically; manual calculation requires reimplementing the same WebGL viewport math |
| Bounding box of 3D scene graph | Manual vertex iteration | `new THREE.Box3().setFromObject(group)` | Handles nested transforms, skinned meshes, and frustum culling correctly |
| Smooth positional animation | `setTimeout` step animation | `Vector3.lerpVectors` + framerate-independent delta in `useFrame` | Ties animation to render loop; delta-based easing is framerate-independent |
| Scene graph name traversal | Recursive custom tree walk | `Object3D.traverse(cb)` + `.children` array | Three.js built-in; handles all Object3D subtypes |

---

## Asset Reality: GLB Mesh Hierarchies

**This is the most important finding for planning.**

| Model | Named Mesh Groups | Layer Toggles Available | Explode Available | Notes |
|-------|------------------|------------------------|-------------------|-------|
| Procedural skeleton (SkeletonPreview.tsx) | 8 (skull, spine, ribcage, pelvis, left-arm, right-arm, left-leg, right-leg) | YES | YES | Groups are direct children of inner ProceduralSkeleton group |
| skeleton.glb | 0 — single mesh "SkeletonMesh" | NO (D-14 disables button) | NO | [VERIFIED: GLB JSON chunk parsed] |
| body.glb | 0 — single mesh "Proxy" with armature only | NO (D-14 disables button) | NO | [VERIFIED: GLB JSON chunk parsed] |
| User-loaded GLBs | Unknown — depends on authoring | If named groups exist: YES | If named groups exist: YES | Automatic scan handles this |

**Implication for MDL-03 (labels):** Since `body.glb` has only one mesh ("Proxy"), pointing at it will always return the same mesh name. The `anatomyLabels.ts` entry for "Proxy" can provide a generic description. Pointing at sub-parts of the body is not meaningful with this asset.

**Implication for MDL-04/MDL-05:** These features deliver full value on the procedural skeleton and any well-structured user-loaded GLB. For `body.glb` and `skeleton.glb`, the Layers button is disabled (D-14) and explode has no groups to separate — the toggle can be disabled for no-group models.

---

## Common Pitfalls

### Pitfall 1: Raycasting Outside the R3F Render Loop
**What goes wrong:** Calling `raycaster.setFromCamera` from `handleResults` (a React callback outside the R3F Canvas) produces incorrect rays because the camera's projection matrix is updated by R3F's internal loop, not synchronously.
**Why it happens:** R3F manages camera state internally; external code accessing `camera` from a ref will get the matrix from the last completed frame.
**How to avoid:** Write landmark 8 NDC coordinates to a `useRef` in `App.tsx`. Read and raycast inside `useFrame` in a `PointerRaycaster` component mounted inside `<Canvas>`.
**Warning signs:** Labels always appearing offset or at wrong positions; raycasting consistently misses visible geometry.

### Pitfall 2: Raycasting Against `scene.children` Instead of `modelGroupRef`
**What goes wrong:** `scene.children` includes lights, OrbitControls helpers, and other non-model objects. Raycasting against it can produce false hits.
**How to avoid:** Pass `modelGroupRef.current` directly: `raycaster.intersectObject(modelGroupRef.current, true)`.

### Pitfall 3: Procedural Skeleton Group Depth
**What goes wrong:** `scanDirectNamedChildren(modelGroupRef.current)` finds zero names on the procedural skeleton because the named groups are grandchildren (`modelGroupRef → outer group → ProceduralSkeleton group → skull group`).
**How to avoid:** Use `group.traverse()` with a depth-limited check, or look two levels deep. Verify at runtime with a `console.log` of the group hierarchy on first load.
**Warning signs:** Layers button disabled on the procedural skeleton despite visible named groups in `SkeletonPreview.tsx`.

### Pitfall 4: `<Html>` z-index Fighting with Toolbar
**What goes wrong:** Label bubbles appear on top of the bottom toolbar because `<Html>` default `zIndexRange` is `[16777271, 0]` — above everything.
**How to avoid:** Set `zIndexRange={[9, 0]}` to keep labels below the toolbar (`z: 10`). Per the UI-SPEC, `pointer-events: none` on the Html wrapper also prevents label from blocking toolbar clicks.

### Pitfall 5: Explode Position Computed in World Space vs. Local Space
**What goes wrong:** Computing `explodedPosition` using `group.getWorldPosition()` but setting `group.position` in local space produces offset explosions, especially after the model has been rotated.
**How to avoid:** Store both rest and exploded positions in the group's **local** coordinate space. Compute offsets before the model is auto-fit scaled (or convert world-space direction to local space using `modelGroup.worldToLocal`).

### Pitfall 6: Leva `useControls` Called Conditionally
**What goes wrong:** Adding Leva controls for the explode multiplier inside a conditional expression breaks the hooks rule.
**How to avoid:** All `useControls` calls must be at the top level of a component or hook, unconditionally — same pattern as existing gesture controls in `useGestureInterpreter`.

---

## Code Examples

### Landmark → NDC Conversion
```typescript
// Source: threejs.org/docs/pages/Raycaster.html (setFromCamera NDC requirement)
// MediaPipe normalized [0,1] → Three.js NDC [-1,1] (Y flipped)
function landmarkToNDC(landmark: NormalizedLandmark): THREE.Vector2 {
  return new THREE.Vector2(
    landmark.x * 2 - 1,
    -(landmark.y * 2 - 1),
  );
}
```

### Raycasting Inside useFrame
```typescript
// Source: [ASSUMED] — canonical R3F useFrame + Three.js Raycaster pattern
const raycaster = new THREE.Raycaster();

useFrame(({ camera }) => {
  const ndc = pointingNDCRef.current;
  const group = modelGroupRef.current;
  if (!ndc || !group) return;

  raycaster.setFromCamera(ndc, camera);
  const hits = raycaster.intersectObject(group, true);
  // hits[0].object = deepest intersected mesh
});
```

### Zustand Store Extension (appState.ts additions)
```typescript
// New fields for Phase 3:
drawerOpen: boolean;
setDrawerOpen: (v: boolean) => void;

inspectMode: boolean;
setInspectMode: (v: boolean) => void;

explodeActive: boolean;
setExplodeActive: (v: boolean) => void;

visibleLayers: Set<string>;          // group names that are visible
setVisibleLayers: (v: Set<string>) => void;

availableLayers: string[];           // group names scanned from current model
setAvailableLayers: (names: string[]) => void;

selectedMeshName: string | null;     // mesh name for label display
setSelectedMeshName: (name: string | null) => void;
```

### Anatomy Labels Data Shape
```typescript
// src/data/anatomyLabels.ts
export const anatomyLabels: Record<string, { name: string; description: string }> = {
  skull:      { name: 'Skull',      description: 'Bony structure encasing and protecting the brain' },
  spine:      { name: 'Spine',      description: 'Vertebral column supporting the trunk and protecting the spinal cord' },
  ribcage:    { name: 'Ribcage',    description: 'Twelve pairs of ribs protecting the heart and lungs' },
  pelvis:     { name: 'Pelvis',     description: 'Basin-shaped bone supporting the spine and carrying the lower limbs' },
  'left-arm': { name: 'Left Arm',   description: 'Upper limb comprising humerus, radius, and ulna' },
  'right-arm':{ name: 'Right Arm',  description: 'Upper limb comprising humerus, radius, and ulna' },
  'left-leg': { name: 'Left Leg',   description: 'Lower limb comprising femur, tibia, and fibula' },
  'right-leg':{ name: 'Right Leg',  description: 'Lower limb comprising femur, tibia, and fibula' },
  Proxy:      { name: 'Human Body', description: 'Full body anatomical model' },
  // Add body.glb-specific entries after scanning at execution time
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `@mediapipe/hands` (deprecated) | `@mediapipe/tasks-vision` HandLandmarker | ~2022 | Already using tasks-vision; no change needed |
| drei `Html` with `transform` for 3D labels | drei `Html center` without transform for flat UI labels | Always best practice | `transform: false` avoids blurriness on high-DPI displays |
| Imperative Three.js `scene.traverse` | R3F declarative + `group.traverse()` for imperative needs | N/A | Phase 3 needs imperative scan on load; `traverse` is appropriate here |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `useAppStore.getState()` is safe to call inside `interpret()` callback (non-reactive Zustand read) | Pattern 6 | Low — this is the standard Zustand pattern for callbacks; if wrong, move `inspectMode` read to a ref updated in App.tsx |
| A2 | Framerate-independent lerp formula `1 - Math.pow(0.02, delta)` produces ~0.5s settle | Pattern 4 | Low — if timing is wrong, tune the base (0.02); visual inspection during execution is sufficient |
| A3 | `findNamedGroupAncestor` walking `object.parent` chain finds correct group boundary | Pattern 1 | Medium — depends on exact clone depth in `scene.clone(true)`. Verify hierarchy at execution. |
| A4 | Procedural skeleton named groups are two levels deep from `modelGroupRef` (outer group → ProceduralSkeleton group → skull group) | Pitfall 3 | Medium — scan at execution time to confirm depth. The fix is trivial (change scan depth) |
| A5 | `<Html center>` zIndexRange `[9, 0]` keeps labels below toolbar at z:10 | Pattern 2 | Low — drei's zIndexRange maps directly to CSS z-index on the wrapper div |

---

## Open Questions

1. **Does `body.glb` have additional named sub-meshes not visible in the top-level JSON?**
   - What we know: The GLB JSON chunk shows 1 mesh ("Proxy") and 21 bone nodes. None of the bone nodes have associated meshes (only node[1] = "Proxy" has `mesh: 0`).
   - What's unclear: Whether the single Proxy mesh has morph targets or material groups that could serve as "layers."
   - Recommendation: Treat body.glb as a single-mesh model. Layers/explode disabled for it per D-14/D-16.

2. **Should ModelViewer expose a callback for when named groups are scanned?**
   - What we know: `ModelViewer` currently renders `SkeletonPreview` or `GLBModel`. The layer scan needs to happen after the model mounts and `modelGroupRef` is populated.
   - What's unclear: Whether to scan inside `ModelViewer` (close to the data) or in a separate component reading `modelGroupRef`.
   - Recommendation: Add an `onGroupsScanned(names: string[])` callback prop to `ModelViewer`/`GLBModel`. Call it from `useLayoutEffect` (same hook used for auto-fit). This follows the established `useLayoutEffect` pattern.

3. **Does the raycasting need to account for the model's auto-fit scale transform?**
   - What we know: After load, `modelGroupRef.current` has `scale` applied via `useLayoutEffect`. Raycasting with `intersectObject(group, true)` traverses the group including its transform, so the scaled geometry is correctly tested.
   - Recommendation: No special handling needed — Three.js raycasting respects world transforms by default.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 3 is purely code changes with no new external dependencies. All required tools (pnpm, node, vite, tauri) were verified operational in Phase 2.

---

## Security Domain

This phase adds no authentication, no user data persistence, no network requests, and no new input surfaces. The only new input is a file picker for user-loaded GLBs (already present from Phase 2 BottomToolbar). Applicable ASVS categories:

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | N/A — client-side only app |
| V3 Session Management | No | N/A |
| V4 Access Control | No | N/A |
| V5 Input Validation | Existing | GLB file validated by Three.js GLTFLoader + existing ModelErrorBoundary |
| V6 Cryptography | No | N/A |

No new security surface is introduced. The existing `ModelErrorBoundary` already handles corrupt/invalid GLB inputs.

---

## Sources

### Primary (HIGH confidence)
- drei.docs.pmnd.rs/misc/html — `<Html>` component props, occlude, center, zIndexRange [VERIFIED via WebFetch]
- threejs.org/docs/pages/Raycaster.html — `setFromCamera`, `intersectObject`, `intersectObjects` signatures [VERIFIED via WebFetch]
- GLB JSON chunk direct parse — body.glb and skeleton.glb mesh hierarchies [VERIFIED via Bash node script]
- src/components/SkeletonPreview.tsx — procedural skeleton named group names [VERIFIED via file read]
- src/hooks/useGestureInterpreter.ts — existing gesture hook structure and landmark indices [VERIFIED via file read]
- r3f.docs.pmnd.rs/api/hooks — `useThree` return type including `camera`, `raycaster`, `pointer` [VERIFIED via WebFetch]

### Secondary (MEDIUM confidence)
- CONTEXT.md decisions D-01 through D-24 [from project file]
- UI-SPEC.md complete design contract [from project file]
- CLAUDE.md § Hand Tracking — MediaPipe landmark indices [from project file]

### Tertiary (LOW confidence, marked [ASSUMED])
- Framerate-independent lerp formula for explode animation timing
- `useAppStore.getState()` pattern inside gesture interpreter callback
- Explode offset computation in local vs world space guidance

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already installed and verified in package.json
- Asset hierarchy: HIGH — directly parsed GLB binary JSON chunk
- Raycasting pattern: HIGH — verified Three.js Raycaster API and R3F useThree docs
- drei Html: HIGH — verified from official drei docs
- Gesture detection: MEDIUM — landmark indices from CLAUDE.md; y-comparison logic from existing code patterns
- Explode animation: MEDIUM — Three.js lerp API verified; timing constants assumed

**Research date:** 2026-05-25
**Valid until:** 2026-06-25 (stable libraries — drei, three, mediapipe — unlikely to change)
