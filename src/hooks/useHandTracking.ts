import { useEffect, useRef } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { useAppStore } from '@/store/appState';
import { useWebcamRef } from '@/context/WebcamRefContext';

const INTERVAL = 33; // ~30fps (D-15)

const LOCAL_WASM_PATH = '/mediapipe/wasm';
const CDN_WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const CDN_MODEL_PATH =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

async function createLandmarker(
  wasmPath: string,
  modelPath: string,
  delegate: 'GPU' | 'CPU',
): Promise<HandLandmarker> {
  const vision = await FilesetResolver.forVisionTasks(wasmPath);
  return HandLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: modelPath,
      delegate,
    },
    runningMode: 'VIDEO',
    numHands: 2, // D-14: support two-hand gestures
    minHandDetectionConfidence: 0.7,
    minHandPresenceConfidence: 0.7,
    minTrackingConfidence: 0.6,
  });
}

export function useHandTracking(onResults: (r: HandLandmarkerResult) => void): void {
  const landmarkerRef = useRef<HandLandmarker | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const onResultsRef = useRef(onResults);
  const videoRef = useWebcamRef();
  const setHandTrackingReady = useAppStore((s) => s.setHandTrackingReady);
  const setHandTrackingError = useAppStore((s) => s.setHandTrackingError);

  // Keep callback ref current without re-triggering effects
  onResultsRef.current = onResults;

  // Non-blocking initialization (D-16)
  // Skip local model path — hand_landmarker.task is not bundled in npm package.
  // Attempt 1: local WASM + CDN model + GPU
  // Fallback 1: CDN WASM + CDN model + GPU
  // Fallback 2: CDN WASM + CDN model + CPU
  useEffect(() => {
    let cancelled = false;

    async function init() {
      let lm: HandLandmarker | null = null;

      // Attempt local WASM with CDN model + GPU
      try {
        lm = await createLandmarker(LOCAL_WASM_PATH, CDN_MODEL_PATH, 'GPU');
        if (import.meta.env.DEV) console.log('[useHandTracking] Initialized: local WASM, CDN model, GPU');
      } catch {
        // Fallback: CDN WASM + CDN model + GPU
        try {
          lm = await createLandmarker(CDN_WASM_PATH, CDN_MODEL_PATH, 'GPU');
          if (import.meta.env.DEV) console.log('[useHandTracking] Initialized: CDN paths, GPU delegate');
        } catch {
          // Final fallback: CDN WASM + CDN model + CPU
          try {
            lm = await createLandmarker(CDN_WASM_PATH, CDN_MODEL_PATH, 'CPU');
            if (import.meta.env.DEV) console.log('[useHandTracking] Initialized: CDN paths, CPU delegate');
          } catch (err) {
            if (import.meta.env.DEV) console.error('[useHandTracking] All initialization attempts failed:', err);
            setHandTrackingError('Hand tracking failed to initialize. Check browser compatibility or network.');
            return;
          }
        }
      }

      if (cancelled) {
        lm.close();
        return;
      }

      landmarkerRef.current = lm;
      setHandTrackingReady(true);
    }

    init().catch((err) => {
      if (import.meta.env.DEV) console.error('[useHandTracking] init error:', err);
    });

    return () => {
      cancelled = true;
      if (landmarkerRef.current) {
        landmarkerRef.current.close();
        landmarkerRef.current = null;
      }
    };
  }, [setHandTrackingReady, setHandTrackingError]);

  // Throttled detection loop — stable callback via ref, no dependency on onResults
  useEffect(() => {
    lastTimeRef.current = 0;

    function loop() {
      const video = videoRef.current;
      const lm = landmarkerRef.current;

      if (video && lm && video.readyState >= 2) {
        const now = performance.now();
        if (now - lastTimeRef.current >= INTERVAL) {
          const results = lm.detectForVideo(video, now);
          onResultsRef.current(results);
          lastTimeRef.current = now;
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, [videoRef]);
}
