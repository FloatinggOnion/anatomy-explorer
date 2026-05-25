// src/components/ExplodeController.tsx
// R3F invisible component: animates explode/rest lerp in useFrame; controls layer visibility via useEffect.

import { useRef, useEffect } from 'react';
import type React from 'react';
import { useFrame } from '@react-three/fiber';
import { Box3, Vector3, MathUtils } from 'three';
import type { Object3D } from 'three';
import { useControls } from 'leva';
import { useAppStore } from '@/store/appState';

// ── Types ─────────────────────────────────────────────────────────────────────────────────────────

type GroupExplodeData = {
  name: string;
  object: Object3D;
  restPosition: Vector3;
  explodedPosition: Vector3;
};

// ── Props ─────────────────────────────────────────────────────────────────────────────────────────

interface ExplodeControllerProps {
  modelGroupRef: React.RefObject<import('three').Group | null>;
}

// ── Component ─────────────────────────────────────────────────────────────────────────────────────

/**
 * ExplodeController: invisible R3F controller that:
 * 1. Animates model parts outward/inward (explode/rest) via per-frame lerp in useFrame
 * 2. Controls per-group visibility via useEffect watching visibleLayers
 *
 * T-03-05 mitigation: early return when groupDataRef.current.length === 0
 */
export function ExplodeController({ modelGroupRef }: ExplodeControllerProps) {
  // Leva debug control (D-19) — unconditional per RESEARCH.md Pitfall 6
  const { EXPLODE_MULTIPLIER } = useControls('Explode', {
    EXPLODE_MULTIPLIER: { value: 1.2, min: 0.5, max: 3.0, step: 0.1 },
  });

  // Zustand selectors
  const explodeActive = useAppStore((s) => s.explodeActive);
  const availableLayers = useAppStore((s) => s.availableLayers);
  const visibleLayers = useAppStore((s) => s.visibleLayers);

  // Explode data and animation progress
  const groupDataRef = useRef<GroupExplodeData[]>([]);
  const explodeProgressRef = useRef<number>(0);

  // Cached directions per child — computed once when layers change, reused when multiplier changes
  const directionsRef = useRef<Map<string, { restPos: Vector3; direction: Vector3 }>>(new Map());

  // ── Scan rest positions when model/layers change (NOT when multiplier changes) ────────────────
  useEffect(() => {
    const group = modelGroupRef.current;
    directionsRef.current.clear();
    if (!group || availableLayers.length === 0) {
      groupDataRef.current = [];
      return;
    }

    const modelBbox = new Box3().setFromObject(group);
    const modelCenter = modelBbox.getCenter(new Vector3());

    group.traverse((child: Object3D) => {
      if (!availableLayers.includes(child.name)) return;
      const groupCenter = new Vector3();
      new Box3().setFromObject(child).getCenter(groupCenter);
      const direction = groupCenter.clone().sub(modelCenter).normalize();
      // WR-04 fix: clone the CURRENT position as rest — this effect only fires
      // when availableLayers changes (model load/switch), when position is at rest
      directionsRef.current.set(child.name, {
        restPos: child.position.clone(),
        direction,
      });
    });
  }, [availableLayers, modelGroupRef]);

  // ── Recompute exploded positions when multiplier OR directions change ──────────────────────────
  useEffect(() => {
    const group = modelGroupRef.current;
    if (!group || directionsRef.current.size === 0) {
      groupDataRef.current = [];
      return;
    }

    const modelBbox = new Box3().setFromObject(group);
    const boundingRadius = modelBbox.getSize(new Vector3()).length() / 2;

    const newData: GroupExplodeData[] = [];
    group.traverse((child: Object3D) => {
      const cached = directionsRef.current.get(child.name);
      if (!cached) return;

      const explodedPos = cached.restPos.clone().add(
        cached.direction.clone().multiplyScalar(boundingRadius * EXPLODE_MULTIPLIER),
      );

      newData.push({
        name: child.name,
        object: child,
        restPosition: cached.restPos,
        explodedPosition: explodedPos,
      });
    });

    groupDataRef.current = newData;
  }, [availableLayers, EXPLODE_MULTIPLIER, modelGroupRef]);

  // ── Layer visibility effect (T-03-06: fires only on visibleLayers change, not per frame) ───────
  useEffect(() => {
    const group = modelGroupRef.current;
    if (!group) return;
    group.traverse((child: Object3D) => {
      if (child.name && availableLayers.includes(child.name)) {
        child.visible = visibleLayers.has(child.name);
      }
    });
  }, [visibleLayers, availableLayers, modelGroupRef]);

  // ── Per-frame lerp animation ──────────────────────────────────────────────────────────────────
  useFrame((_, delta) => {
    // T-03-05: early return when no group data
    if (groupDataRef.current.length === 0) return;

    const target = explodeActive ? 1.0 : 0.0;
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

  return null;
}
