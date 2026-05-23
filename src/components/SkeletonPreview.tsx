import { useRef } from 'react';
import type { Group } from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { useSkeletonAnimation } from '@/hooks/useSkeletonAnimation';

const TWO_PI = Math.PI * 2;

export function SkeletonPreview() {
  const groupRef = useRef<Group>(null);
  const { isAnimating, stopAnimation, rotationSpeed, rotationRef } = useSkeletonAnimation();

  // Load the skeleton model
  const skeleton = useGLTF('/models/skeleton.glb');

  // Animation loop
  useFrame(() => {
    if (isAnimating && groupRef.current && rotationRef.current) {
      rotationRef.current[1] = (rotationRef.current[1] + rotationSpeed) % TWO_PI;
      groupRef.current.rotation.y = rotationRef.current[1];
    }
  });

  return (
    <group
      ref={groupRef}
      onPointerDown={() => stopAnimation()}
      scale={1}
    >
      <primitive object={skeleton.scene} />
    </group>
  );
}
