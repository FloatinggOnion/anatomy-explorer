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

  // ── Recompute group data when model or multiplier changes ──────────────────────────────────────
  useEffect(() => {
    const group = modelGroupRef.current;
    if (!group || availableLayers.length === 0) {
      groupDataRef.current = [];
      return;
    }

    const modelBbox = new Box3().setFromObject(group);
    const modelCenter = modelBbox.getCenter(new Vector3());
    const boundingRadius = modelBbox.getSize(new Vector3()).length() / 2;

    const newData: GroupExplodeData[] = [];
    group.traverse((child: Object3D) => {
      if (!availableLayers.includes(child.name)) return;

      const groupCenter = new Vector3();
      new Box3().setFromObject(child).getCenter(groupCenter);

      // Direction from model center to group center (world space, but modelGroupRef is at origin)
      const direction = groupCenter.clone().sub(modelCenter).normalize();

      // Positions are in local space (child.position = local coords) — correct per Pitfall 5
      const restPos = child.position.clone();
      const explodedPos = restPos.clone().add(
        direction.multiplyScalar(boundingRadius * EXPLODE_MULTIPLIER),
      );

      newData.push({
        name: child.name,
        object: child,
        restPosition: restPos,
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
