// src/hooks/useGestureInterpreter.ts
// Pure gesture state machine: MediaPipe landmarks → GestureCommand with hysteresis and dead zone

import { useRef, useCallback } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { useControls } from 'leva';
import type { GestureCommand, GestureState } from '@/types/gestures';
import { useAppStore } from '@/store/appState';

interface GestureInterpreterReturn {
  /** Call on every MediaPipe results frame. Returns the current GestureCommand. */
  interpret: (
    landmarks: NormalizedLandmark[][],
    videoWidth: number,
    videoHeight: number,
  ) => GestureCommand;
  /** Ref-based isPinching — not reactive. Use the returned command type for reactive pinch UI. */
  isPinchingRef: React.MutableRefObject<boolean>;
}

export function useGestureInterpreter(): GestureInterpreterReturn {
  // Leva debug controls (D-22) — in production leva is a no-op so this is always safe to call
  const {
    PINCH_ENTER,
    PINCH_EXIT,
    DEAD_ZONE_PX,
    rotationSensitivity,
    // scaleSensitivity is exposed in Leva for future use; currently scale factor comes from
    // pinch distance ratio directly, so it is not applied as a multiplier here.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    scaleSensitivity: _scaleSensitivity,
  } = useControls('Gesture', {
    PINCH_ENTER: { value: 0.05, min: 0.01, max: 0.15, step: 0.005 },
    PINCH_EXIT: { value: 0.08, min: 0.02, max: 0.20, step: 0.005 },
    DEAD_ZONE_PX: { value: 10, min: 0, max: 30, step: 1 },
    rotationSensitivity: { value: 0.01, min: 0.001, max: 0.05, step: 0.001 },
    scaleSensitivity: { value: 1.0, min: 0.5, max: 3.0, step: 0.1 },
  });

  // Stable Zustand setter refs — won't trigger re-renders inside useCallback
  const setGestureActive = useAppStore((s) => s.setGestureActive);

  // Internal state tracked via refs — no state updates needed (avoids re-renders on every frame)
  const gestureStateRef = useRef<GestureState>({ mode: 'idle', pinchOrigin: null });
  const isPinchingRef = useRef<boolean>(false);
  /** Previous two-hand midpoint for pan detection (D-20) */
  const prevMidpointRef = useRef<{ x: number; y: number } | null>(null);
  /** Debounce timer for gestureActive(false) — D-25 */
  const gestureOffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const interpret = useCallback(
    (
      landmarks: NormalizedLandmark[][],
      videoWidth: number,
      videoHeight: number,
    ): GestureCommand => {
      // WR-01: setHandDetected removed — caller (App.tsx handleResults) already sets it

      // ── No hands visible ────────────────────────────────────────────────────────
      if (landmarks.length === 0) {
        gestureStateRef.current = { mode: 'idle', pinchOrigin: null };
        isPinchingRef.current = false;
        prevMidpointRef.current = null;
        if (gestureOffTimerRef.current) clearTimeout(gestureOffTimerRef.current);
        gestureOffTimerRef.current = setTimeout(() => setGestureActive(false), 500); // D-25
        return { type: 'idle' };
      }

      // ── Shared threshold (hysteresis prevents flicker) ───────────────────────────
      const wasPinching =
        gestureStateRef.current.mode === 'pinching' ||
        gestureStateRef.current.mode === 'two-hand-pinch';
      const threshold = wasPinching ? PINCH_EXIT : PINCH_ENTER;

      // ── Single-hand pinch detection (hand 0) ─────────────────────────────────────
      const hand0 = landmarks[0];
      const thumbTip0 = hand0[4];
      const indexTip0 = hand0[8];
      const pinchDist0 = Math.hypot(thumbTip0.x - indexTip0.x, thumbTip0.y - indexTip0.y);
      const isPinching0 = pinchDist0 < threshold;

      // ── Two-hand gesture detection ────────────────────────────────────────────────
      if (landmarks.length >= 2 && isPinching0) {
        const hand1 = landmarks[1];
        const thumbTip1 = hand1[4];
        const indexTip1 = hand1[8];
        const pinchDist1 = Math.hypot(thumbTip1.x - indexTip1.x, thumbTip1.y - indexTip1.y);
        const isPinching1 = pinchDist1 < threshold;

        if (isPinching1) {
          // Both hands pinching — compute pixel-space pinch centers
          const pinchCenter0 = {
            x: ((thumbTip0.x + indexTip0.x) / 2) * videoWidth,
            y: ((thumbTip0.y + indexTip0.y) / 2) * videoHeight,
          };
          const pinchCenter1 = {
            x: ((thumbTip1.x + indexTip1.x) / 2) * videoWidth,
            y: ((thumbTip1.y + indexTip1.y) / 2) * videoHeight,
          };
          const currentDist = Math.hypot(
            pinchCenter0.x - pinchCenter1.x,
            pinchCenter0.y - pinchCenter1.y,
          );

          if (gestureStateRef.current.mode !== 'two-hand-pinch') {
            // Just entered two-hand mode — store initial distance; skip first frame
            gestureStateRef.current = {
              mode: 'two-hand-pinch',
              pinchOrigin: { x: currentDist, y: 0 },
            };
            prevMidpointRef.current = null; // reset to avoid spurious pan on entry
            isPinchingRef.current = true;
            if (gestureOffTimerRef.current) clearTimeout(gestureOffTimerRef.current);
            setGestureActive(true);
            return { type: 'idle' };
          }

          const prevDist = gestureStateRef.current.pinchOrigin!.x;
          const scaleFactor = currentDist / Math.max(prevDist, 1);

          // Update stored distance for next frame
          gestureStateRef.current.pinchOrigin = { x: currentDist, y: 0 };
          isPinchingRef.current = true;

          const midpoint = {
            x: (pinchCenter0.x + pinchCenter1.x) / 2,
            y: (pinchCenter0.y + pinchCenter1.y) / 2,
          };

          // Pan vs scale disambiguation (D-20):
          // If midpoint moved more than dead zone AND more than scale-derived movement → pan
          if (prevMidpointRef.current !== null) {
            const panDelta = {
              x: midpoint.x - prevMidpointRef.current.x,
              y: midpoint.y - prevMidpointRef.current.y,
            };
            const panMagnitude = Math.hypot(panDelta.x, panDelta.y);
            const scaleMagnitude = Math.abs(scaleFactor - 1.0);

            // CR-03: Only emit pan when scale is essentially stationary — prevents
            // misclassifying scale gestures as pan when midpoint drifts slightly
            if (panMagnitude > DEAD_ZONE_PX && scaleMagnitude < 0.01) {
              prevMidpointRef.current = midpoint;
              return { type: 'pan', delta: panDelta };
            }
          }

          prevMidpointRef.current = midpoint;
          return { type: 'scale', factor: scaleFactor };
        }
      }

      // ── Single-hand pinch rotate ──────────────────────────────────────────────────
      if (isPinching0) {
        // Use landmark 9 (middle finger MCP) as hand center — stable across pinch gestures
        const handCenter = {
          x: hand0[9].x * videoWidth,
          y: hand0[9].y * videoHeight,
        };

        if (gestureStateRef.current.mode !== 'pinching') {
          // Pinch just started
          gestureStateRef.current = { mode: 'pinching', pinchOrigin: handCenter };
          isPinchingRef.current = true;
          if (gestureOffTimerRef.current) clearTimeout(gestureOffTimerRef.current);
          setGestureActive(true);
          return { type: 'idle' };
        }

        const origin = gestureStateRef.current.pinchOrigin!;
        const delta = { x: handCenter.x - origin.x, y: handCenter.y - origin.y };
        const magnitude = Math.hypot(delta.x, delta.y);

        // Dead zone: swallow micro-jitter on pinch start (D-19)
        if (magnitude < DEAD_ZONE_PX) return { type: 'idle' };

        // Trackball: update origin incrementally so delta is always relative to last frame
        gestureStateRef.current.pinchOrigin = handCenter;
        isPinchingRef.current = true;

        return {
          type: 'rotate',
          delta: {
            x: delta.x * rotationSensitivity,
            y: delta.y * rotationSensitivity,
          },
        };
      }

      // ── Pinch released (was pinching, now not) ────────────────────────────────────
      gestureStateRef.current = { mode: 'idle', pinchOrigin: null };
      isPinchingRef.current = false;
      prevMidpointRef.current = null;
      if (gestureOffTimerRef.current) clearTimeout(gestureOffTimerRef.current);
      gestureOffTimerRef.current = setTimeout(() => setGestureActive(false), 500); // D-25
      return { type: 'idle' };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [setGestureActive, PINCH_ENTER, PINCH_EXIT, DEAD_ZONE_PX, rotationSensitivity],
  );

  return { interpret, isPinchingRef };
}
