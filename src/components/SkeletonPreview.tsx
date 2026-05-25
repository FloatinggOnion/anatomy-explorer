import { useRef } from 'react';
import type { Group } from 'three';
import type React from 'react';
import { useFrame } from '@react-three/fiber';
import { useSkeletonAnimation } from '@/hooks/useSkeletonAnimation';

const TWO_PI = Math.PI * 2;

// Shared bone material — ivory/cream colour
function BoneMesh({ args, position }: { args: [number, number, number]; position: [number, number, number] }) {
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color="#e8dcc8" roughness={0.6} metalness={0.05} />
    </mesh>
  );
}

// Procedural humanoid skeleton built from box/sphere primitives.
// Named groups (skull, spine, ribcage, arms, legs) map to Phase 3 layer toggles.
function ProceduralSkeleton() {
  return (
    <group>
      {/* Skull */}
      <group name="skull">
        <mesh position={[0, 1.55, 0]} castShadow>
          <sphereGeometry args={[0.18, 12, 10]} />
          <meshStandardMaterial color="#e8dcc8" roughness={0.6} metalness={0.05} />
        </mesh>
      </group>

      {/* Spine */}
      <group name="spine">
        <BoneMesh args={[0.07, 0.08, 0.07]} position={[0, 1.35, 0]} />
        <BoneMesh args={[0.07, 0.08, 0.07]} position={[0, 1.25, 0]} />
        <BoneMesh args={[0.07, 0.08, 0.07]} position={[0, 1.15, 0]} />
        <BoneMesh args={[0.07, 0.08, 0.07]} position={[0, 1.05, 0]} />
        <BoneMesh args={[0.07, 0.08, 0.07]} position={[0, 0.95, 0]} />
      </group>

      {/* Ribcage */}
      <group name="ribcage">
        <BoneMesh args={[0.38, 0.06, 0.22]} position={[0, 1.28, 0]} />
        <BoneMesh args={[0.40, 0.06, 0.23]} position={[0, 1.20, 0]} />
        <BoneMesh args={[0.42, 0.06, 0.24]} position={[0, 1.12, 0]} />
        <BoneMesh args={[0.40, 0.06, 0.23]} position={[0, 1.04, 0]} />
      </group>

      {/* Pelvis */}
      <group name="pelvis">
        <BoneMesh args={[0.36, 0.12, 0.20]} position={[0, 0.80, 0]} />
      </group>

      {/* Left arm */}
      <group name="left-arm">
        {/* Shoulder */}
        <mesh position={[0.28, 1.32, 0]} castShadow>
          <sphereGeometry args={[0.07, 8, 6]} />
          <meshStandardMaterial color="#e8dcc8" roughness={0.6} metalness={0.05} />
        </mesh>
        {/* Upper arm */}
        <BoneMesh args={[0.07, 0.32, 0.07]} position={[0.32, 1.12, 0]} />
        {/* Elbow */}
        <mesh position={[0.34, 0.94, 0]} castShadow>
          <sphereGeometry args={[0.055, 8, 6]} />
          <meshStandardMaterial color="#e8dcc8" roughness={0.6} metalness={0.05} />
        </mesh>
        {/* Forearm */}
        <BoneMesh args={[0.06, 0.28, 0.06]} position={[0.36, 0.76, 0]} />
        {/* Wrist/Hand */}
        <BoneMesh args={[0.08, 0.06, 0.05]} position={[0.38, 0.60, 0]} />
      </group>

      {/* Right arm */}
      <group name="right-arm">
        <mesh position={[-0.28, 1.32, 0]} castShadow>
          <sphereGeometry args={[0.07, 8, 6]} />
          <meshStandardMaterial color="#e8dcc8" roughness={0.6} metalness={0.05} />
        </mesh>
        <BoneMesh args={[0.07, 0.32, 0.07]} position={[-0.32, 1.12, 0]} />
        <mesh position={[-0.34, 0.94, 0]} castShadow>
          <sphereGeometry args={[0.055, 8, 6]} />
          <meshStandardMaterial color="#e8dcc8" roughness={0.6} metalness={0.05} />
        </mesh>
        <BoneMesh args={[0.06, 0.28, 0.06]} position={[-0.36, 0.76, 0]} />
        <BoneMesh args={[0.08, 0.06, 0.05]} position={[-0.38, 0.60, 0]} />
      </group>

      {/* Left leg */}
      <group name="left-leg">
        {/* Hip joint */}
        <mesh position={[0.14, 0.74, 0]} castShadow>
          <sphereGeometry args={[0.08, 8, 6]} />
          <meshStandardMaterial color="#e8dcc8" roughness={0.6} metalness={0.05} />
        </mesh>
        {/* Femur */}
        <BoneMesh args={[0.09, 0.40, 0.09]} position={[0.16, 0.50, 0]} />
        {/* Knee */}
        <mesh position={[0.17, 0.28, 0]} castShadow>
          <sphereGeometry args={[0.07, 8, 6]} />
          <meshStandardMaterial color="#e8dcc8" roughness={0.6} metalness={0.05} />
        </mesh>
        {/* Tibia */}
        <BoneMesh args={[0.07, 0.36, 0.07]} position={[0.17, 0.08, 0]} />
        {/* Foot */}
        <BoneMesh args={[0.07, 0.05, 0.16]} position={[0.17, -0.12, 0.04]} />
      </group>

      {/* Right leg */}
      <group name="right-leg">
        <mesh position={[-0.14, 0.74, 0]} castShadow>
          <sphereGeometry args={[0.08, 8, 6]} />
          <meshStandardMaterial color="#e8dcc8" roughness={0.6} metalness={0.05} />
        </mesh>
        <BoneMesh args={[0.09, 0.40, 0.09]} position={[-0.16, 0.50, 0]} />
        <mesh position={[-0.17, 0.28, 0]} castShadow>
          <sphereGeometry args={[0.07, 8, 6]} />
          <meshStandardMaterial color="#e8dcc8" roughness={0.6} metalness={0.05} />
        </mesh>
        <BoneMesh args={[0.07, 0.36, 0.07]} position={[-0.17, 0.08, 0]} />
        <BoneMesh args={[0.07, 0.05, 0.16]} position={[-0.17, -0.12, 0.04]} />
      </group>
    </group>
  );
}

interface SkeletonPreviewProps {
  modelGroupRef?: React.RefObject<Group | null>;
}

export function SkeletonPreview({ modelGroupRef }: SkeletonPreviewProps = {}) {
  const localGroupRef = useRef<Group>(null);
  const groupRef = (modelGroupRef ?? localGroupRef) as React.RefObject<Group>;
  const { isAnimating, stopAnimation, rotationSpeed, rotationRef } = useSkeletonAnimation();

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
      position={[0, -0.2, 0]}
    >
      <ProceduralSkeleton />
    </group>
  );
}
