import { useState, useCallback, useRef } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import type { HandLandmarkerResult } from '@mediapipe/tasks-vision';
import type { GestureCommand } from '@/types/gestures';
import { WebcamProvider } from '@/components/WebcamProvider';
import { Canvas } from '@/components/Canvas';
import { BottomToolbar } from '@/components/BottomToolbar';
import { LandmarkCanvas } from '@/components/LandmarkCanvas';
import { HandStatusIndicator } from '@/components/HandStatusIndicator';
import { ModelGalleryDrawer } from '@/components/ModelGalleryDrawer';
import { useHandTracking } from '@/hooks/useHandTracking';
import { useGestureInterpreter } from '@/hooks/useGestureInterpreter';
import { useWebcamRef } from '@/context/WebcamRefContext';
import { useAppStore } from '@/store/appState';

function AppInner() {
  const [landmarks, setLandmarks] = useState<NormalizedLandmark[][]>([]);
  const [isPinching, setIsPinching] = useState<boolean>(false);
  const setHandDetected = useAppStore((s) => s.setHandDetected);

  // Gesture pipeline: ref shared between AppInner (writer) and Canvas/SceneController (reader)
  const gestureCommandRef = useRef<GestureCommand | null>(null);

  // useGestureInterpreter must be called inside WebcamProvider so Leva hook is in scope
  const { interpret, pointingNDCRef } = useGestureInterpreter();

  // videoRef for reading video dimensions when computing gesture pixel coordinates
  const videoRef = useWebcamRef();

  const handleResults = useCallback(
    (results: HandLandmarkerResult) => {
      const lms = results.landmarks ?? [];
      setLandmarks(lms);
      setHandDetected(lms.length > 0);

      // Get video dimensions for pixel-space dead zone calculation
      const video = videoRef.current;
      const w = video?.videoWidth ?? 640;
      const h = video?.videoHeight ?? 480;

      // Interpret landmarks into a typed GestureCommand
      const cmd = interpret(lms, w, h);
      gestureCommandRef.current = cmd;

      // Derive isPinching for LandmarkCanvas highlight (D-11: pinch dots turn blue when active)
      // Use the raw distance rather than gestureCommandRef.current.type so the highlight
      // reflects the actual pinch state (even during dead zone, we still show the highlight)
      if (lms.length > 0) {
        const thumbTip = lms[0][4];
        const indexTip = lms[0][8];
        const dist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
        setIsPinching(dist < 0.08); // PINCH_EXIT threshold — shows highlight while pinching
      } else {
        setIsPinching(false);
      }
    },
    [setHandDetected, interpret, videoRef],
  );

  useHandTracking(handleResults);

  return (
    <>
      {/* z:1 — 2D hand landmark overlay, pointerEvents:none */}
      <LandmarkCanvas landmarks={landmarks} isPinching={isPinching} />

      {/* z:2 — R3F Canvas with 3D skeleton/model, fixed to viewport so it always overlays */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'auto' }}>
        <Canvas gestureCommandRef={gestureCommandRef} pointingNDCRef={pointingNDCRef} />
      </div>

      {/* z:10 — UI overlays */}
      <HandStatusIndicator />
      <ModelGalleryDrawer />
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
