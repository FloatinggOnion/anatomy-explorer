import React, { Suspense, useRef, useEffect } from 'react';
import { Canvas as R3FCanvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { Group } from 'three';
import { Vector2 } from 'three';
import { useAppStore } from '@/store/appState';
import type { GestureCommand } from '@/types/gestures';
import { ModelViewer } from './ModelViewer';
import { SceneController } from './SceneController';
import { PointerRaycaster } from './PointerRaycaster';
import { LabelBubble } from './LabelBubble';

interface CanvasProps {
  gestureCommandRef?: React.MutableRefObject<GestureCommand | null>;
  pointingNDCRef?: React.MutableRefObject<Vector2 | null>;
}

function FallbackPlaceholder() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#888888" wireframe />
    </mesh>
  );
}

export function Canvas({
  gestureCommandRef: externalGestureCommandRef,
  pointingNDCRef: externalPointingNDCRef,
}: CanvasProps) {
  const controlsRef = useRef(null);
  const gestureActive = useAppStore((s) => s.gestureActive);

  // Internal fallback ref — used when Canvas is rendered standalone (no App wiring)
  const internalGestureCommandRef = useRef<GestureCommand | null>(null);
  const gestureCommandRef = externalGestureCommandRef ?? internalGestureCommandRef;

  // Internal fallback for pointingNDCRef — used when Canvas is rendered standalone
  const internalPointingNDCRef = useRef<Vector2 | null>(null);
  const pointingNDCRef = externalPointingNDCRef ?? internalPointingNDCRef;

  // modelGroupRef is created here and forwarded to both ModelViewer (writes)
  // and SceneController/PointerRaycaster/LabelBubble (reads)
  const modelGroupRef = useRef<Group | null>(null);

  // Pitfall A mitigation (T-02-12): imperative fallback ensures OrbitControls disables
  // even if the enabled prop change does not propagate within the same render cycle.
  useEffect(() => {
    if (controlsRef.current) {
      (controlsRef.current as any).enabled = !gestureActive;
    }
  }, [gestureActive]);

  return (
    <R3FCanvas
      gl={{ alpha: true, antialias: true }}
      style={{ background: 'transparent' }}
      camera={{ position: [0, 0, 3], fov: 75 }}
      dpr={window.devicePixelRatio}
      performance={{ min: 0.5, max: 1 }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1.0} />

      {/* T-02-12: enabled prop disables mouse input when gesture is active (D-23) */}
      <OrbitControls
        ref={controlsRef}
        enabled={!gestureActive}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={1}
        maxDistance={10}
      />

      {/* SceneController: applies GestureCommands to modelGroupRef each frame */}
      <SceneController
        gestureCommandRef={gestureCommandRef}
        modelGroupRef={modelGroupRef}
      />

      {/* PointerRaycaster: raycasts from pointing gesture NDC; sets selectedMeshName after dwell */}
      <PointerRaycaster
        pointingNDCRef={pointingNDCRef}
        modelGroupRef={modelGroupRef}
      />

      <Suspense fallback={<FallbackPlaceholder />}>
        <ModelViewer controlsRef={controlsRef} modelGroupRef={modelGroupRef} />
        {/* LabelBubble: anchored drei Html label for selected anatomy part */}
        <LabelBubble modelGroupRef={modelGroupRef} />
      </Suspense>
    </R3FCanvas>
  );
}
