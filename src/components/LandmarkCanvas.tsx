import { useRef, useEffect } from 'react';
import type { NormalizedLandmark } from '@mediapipe/tasks-vision';
import { useWebcamRef } from '@/context/WebcamRefContext';
import { useAppStore } from '@/store/appState';

interface LandmarkCanvasProps {
  landmarks: NormalizedLandmark[][];
  isPinching: boolean;
}

export function LandmarkCanvas({ landmarks, isPinching }: LandmarkCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useWebcamRef();
  const landmarksVisible = useAppStore((s) => s.landmarksVisible);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    // Match canvas pixel dimensions to the stream resolution (Pitfall E)
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!landmarksVisible || landmarks.length === 0) return;

    // Mirror transform to match the mirrored video feed (D-27)
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    for (const hand of landmarks) {
      hand.forEach((lm, i) => {
        // Landmark 4 = thumb tip, 8 = index fingertip (D-11 pinch points)
        const isPinchPoint = i === 4 || i === 8;
        ctx.beginPath();
        ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 4, 0, Math.PI * 2);
        // Active pinch: green-500 (#22C55E). Otherwise: white semi-transparent (D-09: dots only, no lines)
        ctx.fillStyle = isPinchPoint && isPinching ? '#22C55E' : 'rgba(255,255,255,0.7)';
        ctx.fill();
      });
    }

    ctx.restore();
  }, [landmarks, isPinching, landmarksVisible, videoRef]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 1, // Integer z-index: video:0, landmark:1, R3F:2, UI:10
        pointerEvents: 'none',
        objectFit: 'cover',
      }}
    />
  );
}
