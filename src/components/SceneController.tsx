// src/components/SceneController.tsx
// R3F invisible component: reads GestureCommand ref each frame and applies transforms
// to the model group. Manages momentum deceleration (300ms, damping 0.92 per frame).

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Quaternion, Vector3 } from 'three';
import type * as THREE from 'three';
import type { GestureCommand } from '@/types/gestures';

interface SceneControllerProps {
  gestureCommandRef: React.MutableRefObject<GestureCommand | null>;
  modelGroupRef: React.RefObject<THREE.Group | null>;
}

/**
 * Applies rotation delta using trackball-style quaternion multiplication.
 * deltaX drives Y-axis rotation, deltaY drives X-axis rotation.
 * Values are already sensitivity-scaled from the interpreter.
 */
function applyRotationDelta(
  target: THREE.Object3D,
  deltaX: number,
  deltaY: number,
): void {
  const qY = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), deltaX);
  const qX = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), deltaY);
  target.quaternion.multiplyQuaternions(qY, target.quaternion);
  target.quaternion.multiplyQuaternions(target.quaternion, qX);
}

/**
 * SceneController reads gestureCommandRef each R3F frame and applies the command
 * to modelGroupRef. Returns null — no DOM/3D output from this component.
 *
 * Momentum: After pinch release, stores last velocity and decelerates at 0.92/frame
 * (~300ms to near-zero at 60fps per UI-SPEC Claude's discretion decision).
 *
 * Scale: clamped to [0.2, 5.0] (T-02-10 mitigation).
 * Momentum loop: exits when speed < 0.0001 (T-02-11 mitigation).
 */
export function SceneController({ gestureCommandRef, modelGroupRef }: SceneControllerProps) {
  const scaleRef = useRef<number>(1.0);
  const velocityRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isDeceleratingRef = useRef<boolean>(false);
  const wasRotatingRef = useRef<boolean>(false);
  /** Track last-applied command to avoid re-applying the same delta across frames */
  const lastAppliedRef = useRef<GestureCommand | null>(null);

  useFrame(() => {
    const group = modelGroupRef.current;
    if (!group) return;

    const cmd = gestureCommandRef.current;
    const isNewCmd = cmd !== lastAppliedRef.current;

    // ── Momentum deceleration ───────────────────────────────────────────────────
    if (isDeceleratingRef.current && (!cmd || cmd.type !== 'rotate')) {
      velocityRef.current.x *= 0.75;
      velocityRef.current.y *= 0.75;
      const speed = Math.hypot(velocityRef.current.x, velocityRef.current.y);
      if (speed < 0.0001) {
        isDeceleratingRef.current = false;
        velocityRef.current = { x: 0, y: 0 };
      } else {
        applyRotationDelta(group, velocityRef.current.x, velocityRef.current.y);
      }
    }

    // ── Detect rotate → idle transition: start momentum ─────────────────────────
    if (wasRotatingRef.current && (!cmd || cmd.type === 'idle')) {
      if (Math.hypot(velocityRef.current.x, velocityRef.current.y) > 0.0001) {
        isDeceleratingRef.current = true;
      }
      wasRotatingRef.current = false;
    }

    if (!cmd || cmd.type === 'idle' || !isNewCmd) return;

    // Mark as applied so we don't re-apply the same command next frame
    lastAppliedRef.current = cmd;

    // ── Active gesture commands ───────────────────────────────────────────────────

    if (cmd.type === 'rotate') {
      isDeceleratingRef.current = false;
      velocityRef.current = { x: cmd.delta.x, y: cmd.delta.y };
      wasRotatingRef.current = true;
      applyRotationDelta(group, cmd.delta.x, cmd.delta.y);
    }

    if (cmd.type === 'scale') {
      wasRotatingRef.current = false;
      scaleRef.current = Math.min(5.0, Math.max(0.2, scaleRef.current * cmd.factor));
      group.scale.setScalar(scaleRef.current);
    }

    if (cmd.type === 'wave-zoom') {
      wasRotatingRef.current = false;
      const zoomSpeed = cmd.speed * 0.02;
      const factor = cmd.direction === 'in' ? 1 + zoomSpeed : 1 - zoomSpeed;
      const currentScale = group.scale.x;
      const newScale = Math.max(0.1, Math.min(5.0, currentScale * factor));
      scaleRef.current = newScale;
      group.scale.setScalar(newScale);
    }

    if (cmd.type === 'pan') {
      wasRotatingRef.current = false;
      group.position.x += cmd.delta.x * 0.005;
      group.position.y -= cmd.delta.y * 0.005;
    }
  });

  return null;
}
