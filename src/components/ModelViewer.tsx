import React, { useRef, useLayoutEffect, useMemo } from 'react';
import type { Group } from 'three';
import { Box3, Vector3 } from 'three';
import { useGLTF } from '@react-three/drei';
import { useAppStore } from '@/store/appState';
import { SkeletonPreview } from './SkeletonPreview';

// Spinner fallback shown inside R3F Suspense while GLB parses
function LoadingSpinnerMesh() {
  return (
    <mesh>
      <boxGeometry args={[0.3, 0.3, 0.3]} />
      <meshBasicMaterial color="#2563EB" wireframe />
    </mesh>
  );
}

// Inner component: loads GLB via useGLTF and auto-fits to viewport
function GLBModel({
  url,
  controlsRef,
  modelGroupRef,
}: {
  url: string;
  controlsRef: React.RefObject<any>;
  modelGroupRef?: React.RefObject<Group | null>;
}) {
  const { scene } = useGLTF(url);
  // CR-04: Clone scene to avoid mutating the useGLTF-cached original
  const clonedScene = useMemo(() => scene.clone(true), [scene]);
  const localGroupRef = useRef<Group>(null);
  // Use the forwarded ref from Canvas/SceneController if provided, else local ref
  const groupRef = (modelGroupRef ?? localGroupRef) as React.RefObject<Group>;

  // WR-06: useLayoutEffect fires after commit but before paint, guaranteeing
  // groupRef is populated — avoids race condition with useEffect on fast machines
  useLayoutEffect(() => {
    if (!groupRef.current) return;

    const box = new Box3().setFromObject(groupRef.current);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());

    // Center model at world origin
    groupRef.current.position.sub(center);

    // Scale to fit ~2 units (viewport-friendly)
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
      groupRef.current.scale.setScalar(2 / maxDim);
    }

    // Reset OrbitControls target after centering (Pitfall B)
    if (controlsRef?.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [clonedScene, controlsRef]);

  return (
    <group ref={groupRef}>
      <primitive object={clonedScene} />
    </group>
  );
}

// Error boundary: catches corrupt/invalid GLBs and reverts to skeleton (D-08 non-destructive)
interface ErrorBoundaryProps {
  children: React.ReactNode;
  onError: (msg: string) => void;
  onRevert: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class ModelErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _info: React.ErrorInfo) {
    this.props.onError('Could not load model. File may be corrupt or contain no meshes.');
    this.props.onRevert();
  }

  render() {
    if (this.state.hasError) {
      // Revert already triggered; render nothing (skeleton shown by parent)
      return null;
    }
    return this.props.children;
  }
}

// Wrapper passes Zustand actions to the class error boundary
function GLBModelWithErrorBoundary({
  url,
  controlsRef,
  modelGroupRef,
}: {
  url: string;
  controlsRef: React.RefObject<any>;
  modelGroupRef?: React.RefObject<Group | null>;
}) {
  const setModelLoadError = useAppStore((s) => s.setModelLoadError);
  const setModelUrl = useAppStore((s) => s.setModelUrl);

  // WR-03: ModelErrorBoundary wraps Suspense so it catches both synchronous render
  // errors AND Suspense-thrown errors from useGLTF. If a parent Suspense in Canvas.tsx
  // catches first, this boundary's onError will not fire — by design.
  return (
    <ModelErrorBoundary
      onError={setModelLoadError}
      onRevert={() => setModelUrl(null)}
    >
      <React.Suspense fallback={<LoadingSpinnerMesh />}>
        <GLBModel url={url} controlsRef={controlsRef} modelGroupRef={modelGroupRef} />
      </React.Suspense>
    </ModelErrorBoundary>
  );
}

// Exported: renders SkeletonPreview when no model loaded, GLBModel when modelUrl is set
export function ModelViewer({
  controlsRef,
  modelGroupRef,
}: {
  controlsRef: React.RefObject<any>;
  modelGroupRef?: React.RefObject<Group | null>;
}) {
  const modelUrl = useAppStore((s) => s.modelUrl);

  if (modelUrl === null) {
    return <SkeletonPreview />;
  }

  return (
    <GLBModelWithErrorBoundary url={modelUrl} controlsRef={controlsRef} modelGroupRef={modelGroupRef} />
  );
}
