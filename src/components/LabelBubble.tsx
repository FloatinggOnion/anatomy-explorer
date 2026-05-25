// src/components/LabelBubble.tsx
// Renders a drei Html label bubble anchored to the selected mesh's 3D world position.
// Must be rendered inside the R3F <Canvas> tree.

import { useRef } from 'react';
import { Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import type * as THREE from 'three';
import { useAppStore } from '@/store/appState';
import { anatomyLabels } from '@/data/anatomyLabels';

function prettifyMeshName(raw: string): string {
  return raw.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function findMeshByName(group: THREE.Group, name: string): THREE.Object3D | null {
  let found: THREE.Object3D | null = null;
  group.traverse((child) => {
    if (child.name === name) found = child;
  });
  return found;
}

export interface LabelBubbleProps {
  modelGroupRef: React.RefObject<THREE.Group | null>;
}

export function LabelBubble({ modelGroupRef }: LabelBubbleProps) {
  const selectedMeshName = useAppStore((s) => s.selectedMeshName);
  const meshWorldPosRef = useRef(new Vector3());

  useFrame(() => {
    const group = modelGroupRef.current;
    if (!group || !selectedMeshName) return;
    const mesh = findMeshByName(group, selectedMeshName);
    if (mesh) {
      mesh.getWorldPosition(meshWorldPosRef.current);
    }
  });

  if (!selectedMeshName) return null;

  const label = anatomyLabels[selectedMeshName] ?? {
    name: prettifyMeshName(selectedMeshName),
    description: '',
  };

  return (
    <Html
      center
      position={meshWorldPosRef.current}
      zIndexRange={[9, 0]}
      style={{ pointerEvents: 'none' }}
    >
      <div style={{ display: 'flex', flexDirection: 'row' }}>
        {/* Left pin bar */}
        <div
          style={{
            width: 6,
            background: '#2563EB',
            borderRadius: '3px 0 0 3px',
            alignSelf: 'stretch',
            marginRight: 10,
          }}
        />
        {/* Content */}
        <div
          style={{
            maxWidth: 240,
            background: 'rgba(17,24,39,0.85)',
            backdropFilter: 'blur(6px)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 8,
            padding: 12,
            position: 'relative',
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 600, color: '#ffffff' }}>
            {label.name}
          </div>
          {label.description && (
            <div
              style={{
                fontSize: 12,
                fontWeight: 400,
                color: 'rgba(255,255,255,0.8)',
                lineHeight: 1.5,
                marginTop: 4,
              }}
            >
              {label.description}
            </div>
          )}
          {/* Pointer arrow at bubble bottom-center */}
          <div
            style={{
              position: 'absolute',
              bottom: -8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 0,
              height: 0,
              borderLeft: '8px solid transparent',
              borderRight: '8px solid transparent',
              borderTop: '8px solid rgba(17,24,39,0.85)',
            }}
          />
        </div>
      </div>
    </Html>
  );
}
