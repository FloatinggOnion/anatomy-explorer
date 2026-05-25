# Phase 3: Educational Features - Pattern Map

**Mapped:** 2026-05-25
**Files analyzed:** 9 (3 new, 6 modified)
**Analogs found:** 9 / 9

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/store/appState.ts` | store | event-driven | `src/store/appState.ts` (self) | exact — extend existing |
| `src/components/ModelGalleryDrawer.tsx` | component | request-response | `src/components/BottomToolbar.tsx` | role-match (UI overlay, file I/O, Zustand) |
| `src/components/LabelBubble.tsx` | component | request-response | `src/components/HandStatusIndicator.tsx` | role-match (z:10 overlay, Zustand reader) |
| `src/components/LayerChipRow.tsx` | component | event-driven | `src/components/BottomToolbar.tsx` | role-match (toolbar UI, Zustand toggle) |
| `src/components/BottomToolbar.tsx` | component | event-driven | `src/components/BottomToolbar.tsx` (self) | exact — modify existing |
| `src/components/Canvas.tsx` | component | event-driven | `src/components/Canvas.tsx` (self) | exact — extend existing |
| `src/components/ModelViewer.tsx` | component | CRUD | `src/components/ModelViewer.tsx` (self) | exact — extend existing |
| `src/components/SceneController.tsx` | component | event-driven | `src/components/SceneController.tsx` (self) | exact — extend or sibling |
| `src/hooks/useGestureInterpreter.ts` | hook | event-driven | `src/hooks/useGestureInterpreter.ts` (self) | exact — add code paths |
| `src/data/anatomyLabels.ts` | utility | transform | `src/store/appState.ts` (type pattern) | partial — static record, no runtime analog |

---

## Pattern Assignments

### `src/store/appState.ts` (store extension)

**Analog:** `src/store/appState.ts` (self — extend in place)

**Existing store shape** (lines 1–59) — copy the `(set) => ({})` pattern verbatim:
```typescript
import { create } from 'zustand';

// Pattern: each field has a paired setter — (v) => set({ field: v })
export const useAppStore = create<AppState>((set) => ({
  modelUrl: null,
  setModelUrl: (url) => set({ modelUrl: url }),

  gestureActive: false,
  setGestureActive: (v) => set({ gestureActive: v }),
  // ...
}));
```

**Phase 3 fields to add** — append after Phase 2 block, same pattern:
```typescript
// Phase 3 fields
drawerOpen: boolean;
setDrawerOpen: (v: boolean) => void;

inspectMode: boolean;
setInspectMode: (v: boolean) => void;

explodeActive: boolean;
setExplodeActive: (v: boolean) => void;

visibleLayers: Set<string>;
setVisibleLayers: (v: Set<string>) => void;

availableLayers: string[];
setAvailableLayers: (names: string[]) => void;

selectedMeshName: string | null;
setSelectedMeshName: (name: string | null) => void;
```

**Implementation block** — same `(set) =>` closure pattern:
```typescript
drawerOpen: false,
setDrawerOpen: (v) => set({ drawerOpen: v }),

inspectMode: false,
setInspectMode: (v) => set({ inspectMode: v }),

explodeActive: false,
setExplodeActive: (v) => set({ explodeActive: v }),

visibleLayers: new Set<string>(),
setVisibleLayers: (v) => set({ visibleLayers: v }),

availableLayers: [],
setAvailableLayers: (names) => set({ availableLayers: names }),

selectedMeshName: null,
setSelectedMeshName: (name) => set({ selectedMeshName: name }),
```

---

### `src/components/ModelGalleryDrawer.tsx` (component, request-response)

**Analog:** `src/components/BottomToolbar.tsx`

**Imports pattern** (lines 1–3 of BottomToolbar):
```typescript
import { useRef, useState, useEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import { useAppStore } from '@/store/appState';
```

**Zustand selector pattern** (lines 9–14 of BottomToolbar):
```typescript
// Pick individual selectors — never subscribe to the whole store
const setModelUrl = useAppStore((s) => s.setModelUrl);
const setModelLoadError = useAppStore((s) => s.setModelLoadError);
const landmarksVisible = useAppStore((s) => s.landmarksVisible);
```

**File input + object URL lifecycle pattern** (lines 18–36 of BottomToolbar):
```typescript
const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  // CR-04: Clear useGLTF cache and revoke previous object URL
  const newUrl = URL.createObjectURL(file);
  if (prevObjectUrlRef.current) {
    useGLTF.clear(prevObjectUrlRef.current);
    URL.revokeObjectURL(prevObjectUrlRef.current);
  }
  prevObjectUrlRef.current = newUrl;

  setModelUrl(newUrl);
  setModelLoadError(null);
  setIsLoading(true);
  e.target.value = ''; // reset so same file can be reloaded
};
```

**Cleanup useEffect pattern** (lines 45–53 of BottomToolbar):
```typescript
// Revoke object URL on unmount to prevent memory leak (CR-01)
useEffect(() => {
  return () => {
    if (prevObjectUrlRef.current) {
      URL.revokeObjectURL(prevObjectUrlRef.current);
      prevObjectUrlRef.current = null;
    }
  };
}, []);
```

**z:10 overlay positioning pattern** (lines 117–130 of BottomToolbar):
```typescript
// All UI panels use fixed positioning at z:10 — never z:11+ to avoid toolbar overlap
style={{
  position: 'fixed',
  zIndex: 10,
  background: 'rgba(17, 24, 39, 0.7)',
  backdropFilter: 'blur(4px)',
}}
```

**Drawer-specific pattern** — slide from left edge, overlays canvas:
```typescript
// Drawer slides from left; canvas underneath keeps running (D-01)
// Width: 280px or 30vw — Claude's discretion
style={{
  position: 'fixed',
  top: 0,
  left: 0,
  bottom: 0,
  width: 280,
  zIndex: 10,
  transform: drawerOpen ? 'translateX(0)' : 'translateX(-100%)',
  transition: 'transform 0.25s ease-out',
  background: 'rgba(17, 24, 39, 0.92)',
  backdropFilter: 'blur(8px)',
}}
```

**Active model highlight pattern** (D-05):
```typescript
// Compare entry model identifier against current modelUrl from store
const modelUrl = useAppStore((s) => s.modelUrl);
const isActive = entry.url === modelUrl || (entry.url === null && modelUrl === null);
// Apply highlight via border or background tint
style={{ border: isActive ? '1px solid #2563EB' : '1px solid transparent' }}
```

---

### `src/components/LabelBubble.tsx` (component, request-response)

**Analog:** `src/components/HandStatusIndicator.tsx` (z:10 overlay) + drei `<Html>` (3D anchor)

**HandStatusIndicator overlay pattern** (full file):
```typescript
import { useAppStore } from '@/store/appState';

export function HandStatusIndicator() {
  const handDetected = useAppStore((s) => s.handDetected);
  // ...
  return (
    <div style={{ position: 'fixed', top: 8, right: 8, zIndex: 10, pointerEvents: 'none' }}>
      <div style={{ background: 'rgba(0,0,0,0.4)', padding: '4px 8px', borderRadius: 6 }}>
        {/* content */}
      </div>
    </div>
  );
}
```

**LabelBubble lives INSIDE the R3F Canvas** (not in App.tsx DOM) — uses drei Html:
```typescript
// src/components/LabelBubble.tsx
// Must be rendered as a child of <Canvas> (inside R3F tree)
import { Html } from '@react-three/drei';
import { useAppStore } from '@/store/appState';
import { anatomyLabels } from '@/data/anatomyLabels';

interface LabelBubbleProps {
  meshWorldPosition: THREE.Vector3;
}

export function LabelBubble({ meshWorldPosition }: LabelBubbleProps) {
  const selectedMeshName = useAppStore((s) => s.selectedMeshName);
  if (!selectedMeshName) return null;

  const label = anatomyLabels[selectedMeshName] ?? {
    name: prettifyMeshName(selectedMeshName), // D-08 fallback
    description: '',
  };

  return (
    <Html
      center                        // -50%/-50% CSS transform (Pattern 2 from RESEARCH.md)
      position={meshWorldPosition}
      zIndexRange={[9, 0]}          // below toolbar z:10 (Pitfall 4 from RESEARCH.md)
      style={{ pointerEvents: 'none' }}
    >
      {/* Styled bubble — match app aesthetic: dark glass, white text */}
      <div style={{
        background: 'rgba(17, 24, 39, 0.85)',
        backdropFilter: 'blur(6px)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: 8,
        padding: '8px 12px',
        color: '#ffffff',
        minWidth: 120,
        maxWidth: 220,
        fontSize: 13,
        whiteSpace: 'nowrap',
      }}>
        <div style={{ fontWeight: 600 }}>{label.name}</div>
        {label.description && (
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 }}>
            {label.description}
          </div>
        )}
      </div>
    </Html>
  );
}
```

**Prettify fallback** (D-08):
```typescript
function prettifyMeshName(raw: string): string {
  return raw.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
```

---

### `src/components/LayerChipRow.tsx` (component, event-driven)

**Analog:** `src/components/BottomToolbar.tsx` (toggle button pattern, lines 169–185)

**Toggle button pattern** (lines 169–185 of BottomToolbar):
```typescript
<button
  onClick={() => setLandmarksVisible(!landmarksVisible)}
  style={{
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    color: '#ffffff',
    borderRadius: 6,
    padding: '0 12px',
    height: 36,
    fontSize: 12,
    fontWeight: 400,
    cursor: 'pointer',
  }}
>
  {landmarksVisible ? 'Landmarks ON' : 'Landmarks OFF'}
</button>
```

**LayerChipRow pattern** — reads `availableLayers` + `visibleLayers` from store; renders chips:
```typescript
import { useAppStore } from '@/store/appState';

export function LayerChipRow() {
  const availableLayers = useAppStore((s) => s.availableLayers);
  const visibleLayers = useAppStore((s) => s.visibleLayers);
  const setVisibleLayers = useAppStore((s) => s.setVisibleLayers);

  if (availableLayers.length === 0) return null; // D-14

  const toggleLayer = (name: string) => {
    const next = new Set(visibleLayers);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setVisibleLayers(next);
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 44, // above toolbar height
      left: 0,
      right: 0,
      zIndex: 10,
      display: 'flex',
      gap: 6,
      padding: '6px 16px',
      background: 'rgba(17, 24, 39, 0.6)',
      backdropFilter: 'blur(4px)',
    }}>
      {availableLayers.map((name) => (
        <button
          key={name}
          onClick={() => toggleLayer(name)}
          style={{
            background: visibleLayers.has(name) ? '#2563EB' : 'transparent',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#ffffff',
            borderRadius: 16, // chip style
            padding: '2px 10px',
            fontSize: 11,
            cursor: 'pointer',
          }}
        >
          {prettifyLayerName(name)}
        </button>
      ))}
    </div>
  );
}
```

---

### `src/components/BottomToolbar.tsx` (component, event-driven — modify)

**Analog:** `src/components/BottomToolbar.tsx` (self)

**Button style pattern** — two variants used throughout (lines 141–157, 169–185):
```typescript
// Primary action button (filled blue)
style={{
  background: '#2563EB',
  color: '#ffffff',
  borderRadius: 6,
  padding: '0 12px',
  height: 36,
  fontSize: 12,
  fontWeight: 400,
  cursor: 'pointer',
  border: 'none',
}}

// Secondary toggle button (transparent + border)
style={{
  background: 'transparent',
  border: '1px solid rgba(255, 255, 255, 0.3)',
  color: '#ffffff',
  borderRadius: 6,
  padding: '0 12px',
  height: 36,
  fontSize: 12,
  cursor: 'pointer',
}}
```

**Divider pattern** (lines 159–165 of BottomToolbar):
```typescript
<div style={{ width: 1, height: 24, background: 'rgba(255, 255, 255, 0.2)' }} />
```

**Phase 3 modifications:**
- Remove: `Load Model` button and `<input type="file">` (moved to ModelGalleryDrawer)
- Add: `Models` button → `setDrawerOpen(true)` (uses `#2563EB` filled style)
- Add: `Layers` button → `setLayersOpen(!layersOpen)` (disabled when `availableLayers.length === 0`)
- Add: `Explode` toggle → `setExplodeActive(!explodeActive)` (active = filled blue)
- Add: `Inspect` toggle → `setInspectMode(!inspectMode)` (active = filled blue)
- Add: `LayerChipRow` rendered above toolbar when layers panel open

**Active-state toggle pattern** (new, no prior analog — derive from secondary button):
```typescript
// Active toggle = filled blue; inactive = transparent border
style={{
  background: isActive ? '#2563EB' : 'transparent',
  border: isActive ? 'none' : '1px solid rgba(255, 255, 255, 0.3)',
  color: '#ffffff',
  borderRadius: 6,
  padding: '0 12px',
  height: 36,
  fontSize: 12,
  cursor: 'pointer',
}}
```

---

### `src/components/Canvas.tsx` (component, event-driven — extend)

**Analog:** `src/components/Canvas.tsx` (self)

**Ref forwarding pattern** (lines 23–33 of Canvas.tsx):
```typescript
// modelGroupRef created here and forwarded down to writer (ModelViewer) and reader (SceneController)
const modelGroupRef = useRef<Group | null>(null);
const internalGestureCommandRef = useRef<GestureCommand | null>(null);
const gestureCommandRef = externalGestureCommandRef ?? internalGestureCommandRef;
```

**Phase 3: add `pointingNDCRef` using same forwarding pattern:**
```typescript
// Pointing NDC ref: App.tsx writes landmark 8 NDC; ExplodeController/PointerRaycaster reads
const internalPointingNDCRef = useRef<THREE.Vector2 | null>(null);
const pointingNDCRef = externalPointingNDCRef ?? internalPointingNDCRef;
```

**Component composition inside Canvas** (lines 55–75):
```typescript
// Pattern: invisible controller components receive refs; no JSX output
<SceneController gestureCommandRef={gestureCommandRef} modelGroupRef={modelGroupRef} />

// Phase 3: add alongside SceneController
<ExplodeController modelGroupRef={modelGroupRef} />
<PointerRaycaster pointingNDCRef={pointingNDCRef} modelGroupRef={modelGroupRef} />

// LabelBubble goes inside Suspense (needs model loaded for world position)
<Suspense fallback={<FallbackPlaceholder />}>
  <ModelViewer controlsRef={controlsRef} modelGroupRef={modelGroupRef} />
  <LabelBubble meshWorldPosition={selectedMeshWorldPos} />
</Suspense>
```

---

### `src/components/ModelViewer.tsx` (component, CRUD — extend)

**Analog:** `src/components/ModelViewer.tsx` (self)

**useLayoutEffect auto-fit pattern** (lines 36–58 of ModelViewer.tsx):
```typescript
// WR-06: useLayoutEffect guarantees ref is populated before paint
useLayoutEffect(() => {
  if (!groupRef.current) return;
  const box = new Box3().setFromObject(groupRef.current);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  groupRef.current.position.sub(center);
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 0) groupRef.current.scale.setScalar(2 / maxDim);
  if (controlsRef?.current) {
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update();
  }
}, [clonedScene, controlsRef]);
```

**Phase 3: add `onGroupsScanned` callback prop to GLBModel and SkeletonPreview:**
```typescript
// Call from the same useLayoutEffect (same timing guarantee)
useLayoutEffect(() => {
  if (!groupRef.current) return;
  // ... existing auto-fit code ...

  // NEW: scan and report named groups (D-11)
  const names = scanNamedGroups(groupRef.current);
  onGroupsScanned?.(names);
}, [clonedScene, controlsRef, onGroupsScanned]);

// Helper (place at module level):
function scanNamedGroups(group: THREE.Group): string[] {
  const names: string[] = [];
  group.traverse((child) => {
    if (child.parent === group && child.name) names.push(child.name);
    // Also check one level deeper for procedural skeleton (Pitfall 3 in RESEARCH.md):
    if (child.parent?.parent === group && child.name && !names.includes(child.parent.name || '')) {
      if (child.parent.name) names.push(child.parent.name);
    }
  });
  return [...new Set(names)]; // deduplicate
}
```

---

### `src/components/SceneController.tsx` (component, event-driven — extend or sibling)

**Analog:** `src/components/SceneController.tsx` (self)

**useFrame pattern — primary ref reads with early return** (lines 50–56 of SceneController.tsx):
```typescript
useFrame(() => {
  const group = modelGroupRef.current;
  if (!group) return;

  const cmd = gestureCommandRef.current;
  const isNewCmd = cmd !== lastAppliedRef.current;
  // ... rest of logic
});
```

**ExplodeController new component** — same `useFrame` + ref guard pattern:
```typescript
// src/components/ExplodeController.tsx (or extend SceneController)
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Box3, Vector3, MathUtils } from 'three';
import type * as THREE from 'three';
import { useAppStore } from '@/store/appState';
import { useControls } from 'leva'; // Pitfall 6: always at top level

interface ExplodeControllerProps {
  modelGroupRef: React.RefObject<THREE.Group | null>;
}

type GroupExplodeData = {
  name: string;
  object: THREE.Object3D;
  restPosition: THREE.Vector3;
  explodedPosition: THREE.Vector3;
};

export function ExplodeController({ modelGroupRef }: ExplodeControllerProps) {
  // Leva tuning constant (dev only — same Leva pattern as gesture controls)
  const { EXPLODE_MULTIPLIER } = useControls('Explode', {
    EXPLODE_MULTIPLIER: { value: 1.2, min: 0.5, max: 3.0, step: 0.1 },
  });

  const explodeActive = useAppStore((s) => s.explodeActive);
  const availableLayers = useAppStore((s) => s.availableLayers);
  const groupDataRef = useRef<GroupExplodeData[]>([]);
  const explodeProgressRef = useRef<number>(0);

  // Recompute rest/exploded positions when model or multiplier changes
  useEffect(() => {
    const group = modelGroupRef.current;
    if (!group || availableLayers.length === 0) { groupDataRef.current = []; return; }

    const modelCenter = new Vector3();
    new Box3().setFromObject(group).getCenter(modelCenter);

    const boundingRadius =
      new Box3().setFromObject(group).getSize(new Vector3()).length() / 2;

    groupDataRef.current = group.children
      .filter((c) => availableLayers.includes(c.name))
      .map((obj) => {
        const groupCenter = new Vector3();
        new Box3().setFromObject(obj).getCenter(groupCenter);
        const direction = groupCenter.clone().sub(modelCenter).normalize();
        return {
          name: obj.name,
          object: obj,
          restPosition: obj.position.clone(),
          explodedPosition: obj.position.clone()
            .add(direction.multiplyScalar(boundingRadius * EXPLODE_MULTIPLIER)),
        };
      });
  }, [modelGroupRef, availableLayers, EXPLODE_MULTIPLIER]);

  useFrame((_, delta) => {
    if (groupDataRef.current.length === 0) return;

    const target = explodeActive ? 1.0 : 0.0;
    // Framerate-independent exponential ease (Pattern 4 from RESEARCH.md)
    explodeProgressRef.current = MathUtils.lerp(
      explodeProgressRef.current,
      target,
      1 - Math.pow(0.02, delta),
    );

    for (const data of groupDataRef.current) {
      data.object.position.lerpVectors(
        data.restPosition,
        data.explodedPosition,
        explodeProgressRef.current,
      );
    }
  });

  return null; // same pattern as SceneController — no 3D output
}
```

**Layer visibility — useEffect not useFrame** (anti-pattern from RESEARCH.md):
```typescript
// Prefer useEffect watching visibleLayers over useFrame to avoid per-frame DOM writes
useEffect(() => {
  const group = modelGroupRef.current;
  if (!group) return;
  group.traverse((child) => {
    if (child.parent === group && child.name) {
      child.visible = visibleLayers.has(child.name);
    }
  });
}, [visibleLayers, modelGroupRef]);
```

---

### `src/hooks/useGestureInterpreter.ts` (hook, event-driven — extend)

**Analog:** `src/hooks/useGestureInterpreter.ts` (self)

**Leva controls — top-level unconditional** (lines 27–38 of useGestureInterpreter.ts):
```typescript
// All useControls calls are at the top of the hook body, unconditionally
const { PINCH_ENTER, PINCH_EXIT, DEAD_ZONE_PX, rotationSensitivity } = useControls('Gesture', {
  PINCH_ENTER: { value: 0.07, min: 0.01, max: 0.15, step: 0.005 },
  // ...
});
```

**Non-reactive Zustand read inside interpret()** (lines 41–42, 113–114):
```typescript
// Stable Zustand setter refs — won't trigger re-renders inside useCallback
const setGestureActive = useAppStore((s) => s.setGestureActive);
// ...
setGestureActive(true); // called inside interpret() useCallback
```

**Phase 3: use `useAppStore.getState()` for non-reactive read inside callback** (Pattern 6 from RESEARCH.md):
```typescript
// Non-reactive read — correct for callback use, won't violate hooks rules
const inspectMode = useAppStore.getState().inspectMode;
if (inspectMode) {
  if (isSpread(hand0)) setExplodeActive(true);
  if (isFist(hand0))   setExplodeActive(false);
}
```

**Refs for per-frame mutable state** (lines 44–49 of useGestureInterpreter.ts):
```typescript
// Pattern: all per-frame state uses refs, not useState
const gestureStateRef = useRef<GestureState>({ mode: 'idle', pinchOrigin: null });
const isPinchingRef = useRef<boolean>(false);
const prevMidpointRef = useRef<{ x: number; y: number } | null>(null);
const gestureOffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
```

**Phase 3: add dwell timer refs following same pattern:**
```typescript
const dwellStartRef = useRef<number | null>(null);
const dwellMeshRef  = useRef<string | null>(null);
const DWELL_MS = 1000;
```

**useCallback dependency array** (lines 198–200 of useGestureInterpreter.ts):
```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
[setGestureActive, PINCH_ENTER, PINCH_EXIT, DEAD_ZONE_PX, rotationSensitivity],
```

**Phase 3 gesture detection helpers** — add above `interpret` in same file:
```typescript
// Pointing: index extended, other fingers curled (Pattern 5 from RESEARCH.md)
function isPointing(hand: NormalizedLandmark[]): boolean {
  return hand[8].y < hand[6].y   // index tip above PIP
    && hand[12].y > hand[10].y   // middle curled
    && hand[16].y > hand[14].y   // ring curled
    && hand[20].y > hand[18].y;  // pinky curled
}

// Spread: all 4 non-thumb fingers extended (Pattern 6 from RESEARCH.md)
function isSpread(hand: NormalizedLandmark[]): boolean {
  return hand[8].y < hand[6].y && hand[12].y < hand[10].y
      && hand[16].y < hand[14].y && hand[20].y < hand[18].y;
}

// Fist: all 4 non-thumb fingers curled
function isFist(hand: NormalizedLandmark[]): boolean {
  return hand[8].y > hand[6].y && hand[12].y > hand[10].y
      && hand[16].y > hand[14].y && hand[20].y > hand[18].y;
}
```

---

### `src/data/anatomyLabels.ts` (utility, transform)

**Analog:** `src/store/appState.ts` (typed export pattern — `export const` with explicit type annotation)

**Type annotation pattern** (line 4 of appState.ts):
```typescript
export type PermissionState = 'granted' | 'denied' | 'pending' | 'unknown';
```

**anatomyLabels.ts structure:**
```typescript
// src/data/anatomyLabels.ts
// Static lookup: mesh/group name → display label
// Covers procedural skeleton groups + bundled GLB mesh names (RESEARCH.md asset reality table)

export type AnatomyLabel = { name: string; description: string };

export const anatomyLabels: Record<string, AnatomyLabel> = {
  // Procedural skeleton named groups (SkeletonPreview.tsx lines 25–123)
  skull:       { name: 'Skull',      description: 'Bony structure encasing and protecting the brain.' },
  spine:       { name: 'Spine',      description: 'Vertebral column supporting the trunk and protecting the spinal cord.' },
  ribcage:     { name: 'Ribcage',    description: 'Twelve pairs of ribs protecting the heart and lungs.' },
  pelvis:      { name: 'Pelvis',     description: 'Basin-shaped bone supporting the spine and carrying the lower limbs.' },
  'left-arm':  { name: 'Left Arm',   description: 'Upper limb comprising humerus, radius, and ulna.' },
  'right-arm': { name: 'Right Arm',  description: 'Upper limb comprising humerus, radius, and ulna.' },
  'left-leg':  { name: 'Left Leg',   description: 'Lower limb comprising femur, tibia, and fibula.' },
  'right-leg': { name: 'Right Leg',  description: 'Lower limb comprising femur, tibia, and fibula.' },
  // Bundled GLB mesh names (RESEARCH.md: body.glb = "Proxy", skeleton.glb = "SkeletonMesh")
  Proxy:        { name: 'Human Body',  description: 'Full body anatomical model.' },
  SkeletonMesh: { name: 'Skeleton',    description: 'Full skeletal structure.' },
};
```

---

## Shared Patterns

### z:10 UI Overlay Positioning
**Source:** `src/components/BottomToolbar.tsx` (lines 117–130) and `src/components/HandStatusIndicator.tsx` (lines 19–24)
**Apply to:** `ModelGalleryDrawer.tsx`, `LayerChipRow.tsx`, all new toolbar additions
```typescript
style={{
  position: 'fixed',
  zIndex: 10,
  background: 'rgba(17, 24, 39, 0.7)',
  backdropFilter: 'blur(4px)',
}}
// pointerEvents: 'none' for read-only indicators; 'auto' for interactive panels
```

### Zustand Selector Pattern
**Source:** `src/components/BottomToolbar.tsx` (lines 9–14) and `src/hooks/useGestureInterpreter.ts` (line 41)
**Apply to:** All new components and the gesture hook extension
```typescript
// Always pick individual fields — never subscribe to whole store object
const fieldValue = useAppStore((s) => s.fieldValue);
const setter = useAppStore((s) => s.setter);

// Non-reactive read inside callbacks (not at hook call site):
const value = useAppStore.getState().value;
```

### Refs for Per-Frame Mutable Data
**Source:** `src/hooks/useGestureInterpreter.ts` (lines 44–49) and `src/components/SceneController.tsx` (lines 43–48)
**Apply to:** `useGestureInterpreter.ts` additions (dwell timer, pointing NDC), `ExplodeController.tsx` (progress ref)
```typescript
// Rule: per-frame mutable state → useRef; discrete events → Zustand setter
const someRef = useRef<SomeType>(initialValue);
// Write: someRef.current = newValue;
// Only call Zustand setter for discrete state transitions (selection, toggle)
```

### useFrame Guard Pattern
**Source:** `src/components/SceneController.tsx` (lines 50–54)
**Apply to:** `ExplodeController.tsx`, `PointerRaycaster.tsx` (new components)
```typescript
useFrame((state, delta) => {
  const group = modelGroupRef.current;
  if (!group) return; // always guard refs before use
  // ...
});
return null; // invisible controller components return null
```

### useLayoutEffect for Post-Mount Operations
**Source:** `src/components/ModelViewer.tsx` (lines 37–58, WR-06 comment)
**Apply to:** `ModelViewer.tsx` `onGroupsScanned` callback timing
```typescript
// useLayoutEffect guarantees groupRef is populated — use for any post-mount ref reads
useLayoutEffect(() => {
  if (!groupRef.current) return;
  // safe to read groupRef.current here
}, [dependency]);
```

### Leva Debug Controls — Top-Level Unconditional
**Source:** `src/hooks/useGestureInterpreter.ts` (lines 27–38)
**Apply to:** `ExplodeController.tsx` (EXPLODE_MULTIPLIER)
```typescript
// Must be at top level of component/hook body — no conditionals (Pitfall 6 in RESEARCH.md)
const { MY_CONSTANT } = useControls('GroupName', {
  MY_CONSTANT: { value: 1.2, min: 0.5, max: 3.0, step: 0.1 },
});
```

---

## No Analog Found

All files have close analogs. No entries.

---

## Metadata

**Analog search scope:** `src/components/`, `src/hooks/`, `src/store/`
**Files scanned:** 8 source files read directly
**Pattern extraction date:** 2026-05-25
