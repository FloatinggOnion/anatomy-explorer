// src/hooks/useGestureInterpreter.ts
// Pure gesture state machine: MediaPipe landmarks → GestureCommand with hysteresis and dead zone

import { useRef, useCallback } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { Vector2 } from 'three';
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
  /** NDC position of index fingertip when hover-selecting in inspect mode, null otherwise. */
  pointingNDCRef: React.MutableRefObject<Vector2 | null>;
}

// ── Gesture helper functions (module-level) ─────────────────────────────────────────────────────

/** Euclidean distance between two landmarks (works regardless of hand orientation) */
function dist(a: NormalizedLandmark, b: NormalizedLandmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, (a.z ?? 0) - (b.z ?? 0));
}

/** Finger is extended: tip is further from MCP base than the PIP joint is */
function fingerExtended(hand: NormalizedLandmark[], tip: number, pip: number, mcp: number): boolean {
  return dist(hand[tip], hand[mcp]) > dist(hand[pip], hand[mcp]);
}

/** Finger is curled: tip is closer to MCP base than the PIP joint is */
function fingerCurled(hand: NormalizedLandmark[], tip: number, pip: number, mcp: number): boolean {
  return dist(hand[tip], hand[mcp]) < dist(hand[pip], hand[mcp]);
}

/** Pointing: index extended, other 3 non-thumb fingers curled (orientation-independent) */
function isPointing(hand: NormalizedLandmark[]): boolean {
  return fingerExtended(hand, 8, 6, 5)    // index extended
    && fingerCurled(hand, 12, 10, 9)       // middle curled
    && fingerCurled(hand, 16, 14, 13)      // ring curled
    && fingerCurled(hand, 20, 18, 17);     // pinky curled
}

/** Spread: all 4 non-thumb fingers extended (orientation-independent) */
function isSpread(hand: NormalizedLandmark[]): boolean {
  return fingerExtended(hand, 8, 6, 5)
    && fingerExtended(hand, 12, 10, 9)
    && fingerExtended(hand, 16, 14, 13)
    && fingerExtended(hand, 20, 18, 17);
}

/** Fist: all 4 non-thumb fingers curled (orientation-independent) */
function isFist(hand: NormalizedLandmark[]): boolean {
  return fingerCurled(hand, 8, 6, 5)
    && fingerCurled(hand, 12, 10, 9)
    && fingerCurled(hand, 16, 14, 13)
    && fingerCurled(hand, 20, 18, 17);
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
    PINCH_ENTER: { value: 0.07, min: 0.01, max: 0.15, step: 0.005 },
    PINCH_EXIT: { value: 0.10, min: 0.02, max: 0.20, step: 0.005 },
    DEAD_ZONE_PX: { value: 5, min: 0, max: 30, step: 1 },
    rotationSensitivity: { value: 0.04, min: 0.001, max: 0.1, step: 0.001 },
    scaleSensitivity: { value: 1.0, min: 0.5, max: 3.0, step: 0.1 },
  });

  // Stable Zustand setter refs — won't trigger re-renders inside useCallback
  const setGestureActive = useAppStore((s) => s.setGestureActive);
  const setExplodeActive = useAppStore((s) => s.setExplodeActive);

  // Internal state tracked via refs — no state updates needed (avoids re-renders on every frame)
  const gestureStateRef = useRef<GestureState>({ mode: 'idle', pinchOrigin: null });
  const isPinchingRef = useRef<boolean>(false);
  /** Previous two-hand midpoint for pan detection (D-20) */
  const prevMidpointRef = useRef<{ x: number; y: number } | null>(null);
  /** Debounce timer for gestureActive(false) — D-25 */
  const gestureOffTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** NDC position of index finger tip in inspect mode (written here, read in PointerRaycaster) */
  const pointingNDCRef = useRef<Vector2 | null>(null);
  /** Smoothed NDC for jitter reduction — exponential moving average */
  const smoothNDCRef = useRef<{ x: number; y: number } | null>(null);
  const NDC_SMOOTH = 0.35; // blend factor: 0 = fully smoothed, 1 = raw (0.35 = responsive but stable)

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
        pointingNDCRef.current = null;
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

      // ── Inspect mode: read once for explode gestures ─────────────────────────────
      const inspectMode = useAppStore.getState().inspectMode;
      const gestureMode = useAppStore.getState().gestureMode;

      // ── Selection raycaster: always active via two methods ───────────────────────
      // 1. Pointing gesture (index up, others curled) — works in any mode
      // 2. Open-hand hover — works when inspect mode is on
      // Smoothed via EMA to reduce jitter that resets the dwell timer downstream.
      const shouldRaycast = !isPinching0 && (isPointing(hand0) || inspectMode);
      if (shouldRaycast) {
        const rawX = -(hand0[8].x * 2 - 1);  // Mirror X to match CSS scaleX(-1) selfie view
        const rawY = -(hand0[8].y * 2 - 1);

        if (smoothNDCRef.current) {
          smoothNDCRef.current.x += (rawX - smoothNDCRef.current.x) * NDC_SMOOTH;
          smoothNDCRef.current.y += (rawY - smoothNDCRef.current.y) * NDC_SMOOTH;
        } else {
          smoothNDCRef.current = { x: rawX, y: rawY };
        }

        pointingNDCRef.current = new Vector2(smoothNDCRef.current.x, smoothNDCRef.current.y);
      } else {
        pointingNDCRef.current = null;
        smoothNDCRef.current = null;
      }

      // ── Wave mode branch (D-05 to D-15) ───────────────────────────────────────────
      if (gestureMode === 'wave') {
        // D-15: Pointing passthrough — compute pointingNDC but return idle
        if (isPointing(hand0)) {
          // Already computed pointingNDCRef above; just return idle to skip all other gestures
          gestureStateRef.current = { mode: 'idle', pinchOrigin: null };
          isPinchingRef.current = false;
          prevMidpointRef.current = null;
          return { type: 'idle' };
        }

        // Helper: compute average spread distance between adjacent fingertips
        const computeSpreadDist = (hand: NormalizedLandmark[]): number => {
          return (
            dist(hand[8], hand[12]) +
            dist(hand[12], hand[16]) +
            dist(hand[16], hand[20])
          ) / 3;
        };
        const MIN_SPREAD_THRESHOLD = 0.04; // Minimum normalized distance to trigger intentional spread

        // D-11: Two-hand spread zoom
        if (landmarks.length >= 2 && isSpread(hand0) && isSpread(landmarks[1])) {
          const spreadDist0 = computeSpreadDist(hand0);
          const spreadDist1 = computeSpreadDist(landmarks[1]);
          // Only trigger two-hand zoom if both hands are intentionally spread apart
          if (spreadDist0 > MIN_SPREAD_THRESHOLD && spreadDist1 > MIN_SPREAD_THRESHOLD) {
            const distance = dist(hand0[8], landmarks[1][8]);
            const speed = Math.min(distance * 2, 1.0);
            gestureStateRef.current = { mode: 'wave-zoom', pinchOrigin: null };
            isPinchingRef.current = false;
            if (gestureOffTimerRef.current) clearTimeout(gestureOffTimerRef.current);
            setGestureActive(true);
            return { type: 'wave-zoom', direction: 'in', speed };
          }
        }

        // D-09: Single-hand spread zoom in
        if (isSpread(hand0)) {
          const avgDist = computeSpreadDist(hand0);
          // Only trigger zoom if fingers are intentionally spread apart
          if (avgDist > MIN_SPREAD_THRESHOLD) {
            const speed = Math.min(avgDist * 4, 1.0);
            gestureStateRef.current = { mode: 'wave-zoom', pinchOrigin: null };
            isPinchingRef.current = false;
            if (gestureOffTimerRef.current) clearTimeout(gestureOffTimerRef.current);
            setGestureActive(true);
            return { type: 'wave-zoom', direction: 'in', speed };
          }
        }

        // D-10: Fist zoom out
        if (isFist(hand0)) {
          gestureStateRef.current = { mode: 'wave-zoom', pinchOrigin: null };
          isPinchingRef.current = false;
          if (gestureOffTimerRef.current) clearTimeout(gestureOffTimerRef.current);
          setGestureActive(true);
          return { type: 'wave-zoom', direction: 'out', speed: 0.5 };
        }

        // D-05 to D-07: Open-hand rotation (trackball via hand center)
        const handCenter = {
          x: hand0[9].x * videoWidth,
          y: hand0[9].y * videoHeight,
        };

        if (gestureStateRef.current.mode !== 'wave-rotate') {
          // First frame of wave rotation — store origin and return idle
          gestureStateRef.current = { mode: 'wave-rotate', pinchOrigin: handCenter };
          isPinchingRef.current = false;
          if (gestureOffTimerRef.current) clearTimeout(gestureOffTimerRef.current);
          setGestureActive(true);
          return { type: 'idle' };
        }

        // Subsequent frames — compute delta and apply rotation
        const origin = gestureStateRef.current.pinchOrigin!;
        const delta = { x: handCenter.x - origin.x, y: handCenter.y - origin.y };
        const magnitude = Math.hypot(delta.x, delta.y);

        // Dead zone: swallow micro-jitter (D-19, same threshold as pinch)
        if (magnitude < DEAD_ZONE_PX) return { type: 'idle' };

        // Trackball: update origin incrementally
        gestureStateRef.current.pinchOrigin = handCenter;
        isPinchingRef.current = false;

        return {
          type: 'rotate',
          delta: {
            x: delta.x * rotationSensitivity,
            y: delta.y * rotationSensitivity,
          },
        };
      }

      // ── Spread/fist gesture: explode control gated on inspectMode (D-22) ─────────
      if (inspectMode) {
        if (isSpread(hand0)) setExplodeActive(true);
        if (isFist(hand0))   setExplodeActive(false);
      }

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
    [setGestureActive, setExplodeActive, PINCH_ENTER, PINCH_EXIT, DEAD_ZONE_PX, rotationSensitivity],
  );

  return { interpret, isPinchingRef, pointingNDCRef };
}
