import { useRef, useState, useCallback } from 'react';

export function useSkeletonAnimation() {
  const rotationRef = useRef<[number, number, number]>([0, 0, 0]);
  const [isAnimating, setIsAnimating] = useState(true);
  const rotationSpeed = 0.003;

  const stopAnimation = useCallback(() => {
    setIsAnimating(false);
  }, []);

  return {
    rotation: rotationRef.current,
    isAnimating,
    stopAnimation,
    rotationSpeed,
    rotationRef,
  };
}
