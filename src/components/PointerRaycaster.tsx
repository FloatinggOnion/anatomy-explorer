// src/components/PointerRaycaster.tsx
// Invisible R3F controller: raycasts from pointingNDCRef each frame,
// calls setSelectedMeshName after DWELL_MS of pointing at the same mesh.
// Must be rendered inside <Canvas> so it has access to the camera in useFrame.

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Raycaster } from 'three';
import type { Vector2 } from 'three';
import type * as THREE from 'three';
import { useAppStore } from '@/store/appState';

// ── Helper: walk object.parent chain to find the first ancestor with a non-empty name ──────────
// Handles the two-level depth of SkeletonPreview:
//   modelGroupRef (outer) → ProceduralSkeleton (unnamed) → skull/spine/etc (named)
// Also works for single-mesh GLB models (Proxy, SkeletonMesh are the mesh names themselves).
function findNamedAncestor(obj: THREE.Object3D, root: THREE.Object3D): string | null {
  let current: THREE.Object3D | null = obj;
  while (current && current !== root) {
    if (current.name && current.name.length > 0) return current.name;
    current = current.parent;
  }
  return null;
}

export interface PointerRaycasterProps {
  pointingNDCRef: React.MutableRefObject<Vector2 | null>;
  modelGroupRef: React.RefObject<THREE.Group | null>;
}

export function PointerRaycaster({ pointingNDCRef, modelGroupRef }: PointerRaycasterProps) {
  // Stable raycaster instance — created once and reused each frame (avoids GC pressure)
  const raycaster = useRef(new Raycaster()).current;

  // Dwell timer state (refs, not React state — per-frame, no re-renders needed)
  const dwellStartRef = useRef<number | null>(null);
  const dwellMeshRef = useRef<string | null>(null);
  const DWELL_MS = 1000; // 1 second dwell per D-06

  const setSelectedMeshName = useAppStore((s) => s.setSelectedMeshName);

  useFrame(({ camera }) => {
    const ndc = pointingNDCRef.current;
    const group = modelGroupRef.current;

    // T-03-04 mitigation: early return when no pointing gesture — no raycasting needed
    if (!group) return;

    if (!ndc) {
      // No pointing gesture — reset dwell but do NOT clear selectedMeshName
      // (label stays until user actively points at empty space for DWELL_MS)
      dwellStartRef.current = null;
      dwellMeshRef.current = null;
      return;
    }

    raycaster.setFromCamera(ndc, camera);
    // recursive=true traverses all children of modelGroupRef (required for nested groups)
    const hits = raycaster.intersectObject(group, true);

    // Find the first named ancestor within modelGroupRef hierarchy
    const hitObject = hits.length > 0 ? hits[0].object : null;
    const meshName = hitObject ? findNamedAncestor(hitObject, group) : null;

    // Dwell logic (Pattern 5 from RESEARCH.md):
    // meshName===null means pointing at empty space → will dismiss after dwell
    if (meshName === dwellMeshRef.current) {
      if (dwellStartRef.current !== null) {
        if (performance.now() - dwellStartRef.current >= DWELL_MS) {
          // Dwell complete — update Zustand (null = dismiss, string = select)
          setSelectedMeshName(meshName);
          dwellStartRef.current = null; // reset to prevent re-firing every frame
        }
        // else: still accumulating dwell time
      } else {
        dwellStartRef.current = performance.now(); // start the timer
      }
    } else {
      // Target changed — reset timer with new target
      dwellMeshRef.current = meshName;
      dwellStartRef.current = performance.now();
    }
  });

  return null; // invisible controller — no 3D output
}
