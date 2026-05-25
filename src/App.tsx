import { useState, useCallback } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import { WebcamProvider } from '@/components/WebcamProvider';
import { Canvas } from '@/components/Canvas';
import { BottomToolbar } from '@/components/BottomToolbar';
import { LandmarkCanvas } from '@/components/LandmarkCanvas';
import { HandStatusIndicator } from '@/components/HandStatusIndicator';
import { useHandTracking } from '@/hooks/useHandTracking';
import { useAppStore } from '@/store/appState';

function AppInner() {
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[][]>([]);
  const [isPinching, setIsPinching] = useState<boolean>(false);
  const setHandDetected = useAppStore((s) => s.setHandDetected);

  const handleResults = useCallback(
    (results: HandLandmarkerResult) => {
      const lms = results.landmarks ?? [];
      setLandmarks(lms);
      setHandDetected(lms.length > 0);
      // isPinching placeholder — Plan 02-04 replaces this with real gesture detection
      setIsPinching(false);
    },
    [setHandDetected],
  );

  useHandTracking(handleResults);

  return (
    <>
      {/* z:1 — 2D hand landmark overlay, pointerEvents:none */}
      <LandmarkCanvas landmarks={landmarks} isPinching={isPinching} />

      {/* z:2 — R3F Canvas with 3D skeleton/model, fixed to viewport so it always overlays */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'auto' }}>
        <Canvas />
      </div>

      {/* z:10 — UI overlays */}
      <HandStatusIndicator />
      <BottomToolbar />
    </>
  );
}

export default function App() {
  return (
    <WebcamProvider>
      {/* z:0 — Video background (handled by WebcamProvider) */}
      <AppInner />
    </WebcamProvider>
  );
}
