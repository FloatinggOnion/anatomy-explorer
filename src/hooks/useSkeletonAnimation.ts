import { useRef, useState, useCallback } from 'react';
import { useAppStore } from '@/store/appState';

export function useSkeletonAnimation() {
  const rotationRef = useRef<[number, number, number]>([0, 0, 0]);
  const [isAnimating, setIsAnimating] = useState(true);
  const rotationSpeed = 0.003;

  const modelUrl = useAppStore((s) => s.modelUrl);
  const gestureActive = useAppStore((s) => s.gestureActive);

  const stopAnimation = useCallback(() => {
    setIsAnimating(false);
  }, []);

  // Auto-rotation only when on procedural skeleton and no gesture active (Pitfall F)
  const shouldAnimate = isAnimating && modelUrl === null && !gestureActive;

  return {
    rotation: rotationRef.current,
    isAnimating: shouldAnimate,
    stopAnimation,
    rotationSpeed,
    rotationRef,
  };
}
