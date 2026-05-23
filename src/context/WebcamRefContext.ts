import { createContext, useContext, RefObject } from 'react';

export const WebcamRefContext = createContext<RefObject<HTMLVideoElement | null> | null>(null);

export function useWebcamRef(): RefObject<HTMLVideoElement | null> {
  const ref = useContext(WebcamRefContext);
  if (!ref) throw new Error('useWebcamRef must be used inside WebcamProvider');
  return ref;
}
