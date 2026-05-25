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
  /** Track whether last frame had an active rotate command — used to trigger momentum */
  const wasRotatingRef = useRef<boolean>(false);

  useFrame(() => {
    const group = modelGroupRef.current;
    if (!group) return; // Model not yet loaded — skip frame (no fallback to scene root)

    const cmd = gestureCommandRef.current;

    // ── Momentum deceleration (T-02-11: loop exits cleanly) ──────────────────────
    // WR-04: Only apply momentum when no active rotate gesture — prevents double-rotation
    // on the first frame of a new pinch after momentum was active
    if (isDeceleratingRef.current && (!cmd || cmd.type !== 'rotate')) {
      velocityRef.current.x *= 0.92;
      velocityRef.current.y *= 0.92;
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

    if (!cmd || cmd.type === 'idle') return;

    // ── Active gesture commands ───────────────────────────────────────────────────

    if (cmd.type === 'rotate') {
      // Active gesture overrides momentum deceleration
      isDeceleratingRef.current = false;
      // Store velocity for momentum after release
      velocityRef.current = { x: cmd.delta.x, y: cmd.delta.y };
      wasRotatingRef.current = true;
      applyRotationDelta(group, cmd.delta.x, cmd.delta.y);
      // Consume command — interpreter emits fresh commands each detection frame
      gestureCommandRef.current = null;
    }

    if (cmd.type === 'scale') {
      wasRotatingRef.current = false;
      // T-02-10: clamp to [0.2, 5.0] — unbounded scale accumulation mitigated
      scaleRef.current = Math.min(5.0, Math.max(0.2, scaleRef.current * cmd.factor));
      group.scale.setScalar(scaleRef.current);
      gestureCommandRef.current = null;
    }

    if (cmd.type === 'pan') {
      wasRotatingRef.current = false;
      // Translate model in XY plane; invert Y because screen Y-down = world Y-up
      group.position.x += cmd.delta.x * 0.005;
      group.position.y -= cmd.delta.y * 0.005;
      gestureCommandRef.current = null;
    }
  });

  return null;
}
