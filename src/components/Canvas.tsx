import { Suspense } from 'react';
import { Canvas as R3FCanvas } from '@react-three/fiber';
import { SkeletonPreview } from './SkeletonPreview';

function FallbackPlaceholder() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#888888" wireframe />
    </mesh>
  );
}

export function Canvas() {
  return (
    <R3FCanvas
      style={{ background: 'transparent' }}
      camera={{ position: [0, 0, 3], fov: 75 }}
      dpr={window.devicePixelRatio}
      performance={{ min: 0.5, max: 1 }}
    >
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1.0} />

      <Suspense fallback={<FallbackPlaceholder />}>
        <SkeletonPreview />
      </Suspense>
    </R3FCanvas>
  );
}
