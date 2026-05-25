// src/components/PointerRaycaster.tsx
// Invisible R3F controller: raycasts a cone of rays from pointingNDCRef each frame,
// uses accumulative dwell (hit-ratio over a sliding window) for robust selection.

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Raycaster, Vector2 } from 'three';
import type * as THREE from 'three';
import { useAppStore } from '@/store/appState';

// ── Config ───────────────────────────────────────────────────────────────────
const DWELL_MS = 300;         // Window length for hit-ratio accumulation
const HIT_RATIO = 0.35;       // 35% of samples in window must agree to select
const DISMISS_MS = 600;       // Must hover empty space this long to dismiss label
const RAY_SPREAD = 0.025;     // NDC offset for cone rays (~2.5% of screen)

// 9-ray pattern: center + 8 surrounding offsets (wider net for thin geometry)
const RAY_OFFSETS: [number, number][] = [
  [0, 0],
  [-RAY_SPREAD, 0],
  [RAY_SPREAD, 0],
  [0, -RAY_SPREAD],
  [0, RAY_SPREAD],
  [-RAY_SPREAD, -RAY_SPREAD],
  [RAY_SPREAD, -RAY_SPREAD],
  [-RAY_SPREAD, RAY_SPREAD],
  [RAY_SPREAD, RAY_SPREAD],
];

// ── Helper: walk parent chain to find first named ancestor ────────────────────
function findNamedAncestor(obj: THREE.Object3D, root: THREE.Object3D): string | null {
  let current: THREE.Object3D | null = obj;
  while (current && current !== root) {
    if (current.name && current.name.length > 0) return current.name;
    current = current.parent;
  }
  return null;
}

// ── Hit sample for sliding window ────────────────────────────────────────────
interface HitSample {
  time: number;
  name: string | null;
}

export interface PointerRaycasterProps {
  pointingNDCRef: React.MutableRefObject<Vector2 | null>;
  modelGroupRef: React.RefObject<THREE.Group | null>;
}

export function PointerRaycaster({ pointingNDCRef, modelGroupRef }: PointerRaycasterProps) {
  const raycaster = useRef(new Raycaster()).current;
  const tempNDC = useRef(new Vector2()).current;

  // Sliding window of recent hit samples
  const samplesRef = useRef<HitSample[]>([]);
  // Track what's currently selected to avoid redundant store writes
  const currentSelectionRef = useRef<string | null>(null);
  // Dismiss timer: sustained null hover before clearing label
  const dismissStartRef = useRef<number | null>(null);

  const setSelectedMeshName = useAppStore((s) => s.setSelectedMeshName);

  useFrame(({ camera }) => {
    const ndc = pointingNDCRef.current;
    const group = modelGroupRef.current;

    if (!group) return;

    if (!ndc) {
      samplesRef.current = [];
      dismissStartRef.current = null;
      return;
    }

    // ── Multi-ray cone: cast 9 rays, pick most common NAMED hit ──────────────
    // Ignore misses (null) — only vote among actual geometry hits.
    // This prevents thin geometry from being drowned out by empty-space misses.
    const hitCounts = new Map<string, number>();

    for (const [dx, dy] of RAY_OFFSETS) {
      tempNDC.set(ndc.x + dx, ndc.y + dy);
      raycaster.setFromCamera(tempNDC, camera);
      const hits = raycaster.intersectObject(group, true);
      const hitObj = hits.length > 0 ? hits[0].object : null;
      const name = hitObj ? findNamedAncestor(hitObj, group) : null;
      if (name !== null) {
        hitCounts.set(name, (hitCounts.get(name) ?? 0) + 1);
      }
    }

    // Best named hit (null only if ALL rays missed)
    let bestName: string | null = null;
    let bestCount = 0;
    for (const [name, count] of hitCounts) {
      if (count > bestCount) {
        bestName = name;
        bestCount = count;
      }
    }

    // ── Accumulative dwell: sliding window of hit samples ────────────────────
    const now = performance.now();
    const samples = samplesRef.current;
    samples.push({ time: now, name: bestName });

    // Trim samples older than window
    const cutoff = now - DWELL_MS;
    while (samples.length > 0 && samples[0].time < cutoff) {
      samples.shift();
    }

    // Count named hits in window (ignore nulls for selection)
    const windowCounts = new Map<string, number>();
    let namedTotal = 0;
    for (const s of samples) {
      if (s.name !== null) {
        windowCounts.set(s.name, (windowCounts.get(s.name) ?? 0) + 1);
        namedTotal++;
      }
    }

    // Find dominant named target
    let dominant: string | null = null;
    let dominantCount = 0;
    for (const [name, count] of windowCounts) {
      if (count > dominantCount) {
        dominant = name;
        dominantCount = count;
      }
    }

    // Select if dominant named target exceeds hit ratio of total samples
    const ratio = samples.length > 0 ? dominantCount / samples.length : 0;
    if (dominant !== null && ratio >= HIT_RATIO && dominant !== currentSelectionRef.current) {
      currentSelectionRef.current = dominant;
      setSelectedMeshName(dominant);
      dismissStartRef.current = null;
    }

    // ── Dismiss: sustained empty-space hover clears the label ────────────────
    if (namedTotal === 0) {
      // All samples in window are misses
      if (dismissStartRef.current === null) {
        dismissStartRef.current = now;
      } else if (now - dismissStartRef.current >= DISMISS_MS && currentSelectionRef.current !== null) {
        currentSelectionRef.current = null;
        setSelectedMeshName(null);
      }
    } else {
      dismissStartRef.current = null;
    }
  });

  return null;
}
