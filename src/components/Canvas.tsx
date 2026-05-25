import { Suspense, useRef } from 'react';
import { Canvas as R3FCanvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useAppStore } from '@/store/appState';
import { ModelViewer } from './ModelViewer';

function FallbackPlaceholder() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#888888" wireframe />
    </mesh>
  );
}

export function Canvas() {
  const controlsRef = useRef(null);
  const gestureActive = useAppStore((s) => s.gestureActive);

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

      <OrbitControls
        ref={controlsRef}
        enabled={!gestureActive}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={1}
        maxDistance={10}
      />

      <Suspense fallback={<FallbackPlaceholder />}>
        <ModelViewer controlsRef={controlsRef} />
      </Suspense>
    </R3FCanvas>
  );
}
