import { ReactNode } from 'react';
import { useWebcam } from '@/hooks/useWebcam';
import { WebcamRefContext } from '@/context/WebcamRefContext';
import { PrePermissionScreen } from './PrePermissionScreen';

interface WebcamProviderProps {
  children: ReactNode;
}

export function WebcamProvider({ children }: WebcamProviderProps) {
  const { videoRef, permissionState, startCamera } = useWebcam();
  const isPermissionDenied = permissionState === 'denied';

  return (
    <WebcamRefContext.Provider value={videoRef}>
      {/* z:0 — Video background, fixed to viewport */}
      {!isPermissionDenied ? (
        <video
          ref={videoRef}
          style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', objectFit: 'cover', zIndex: 0 }}
          playsInline
          muted
        />
      ) : (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 0,
            backgroundImage: `linear-gradient(45deg, #e5e7eb 25%, #f3f4f6 25%, #f3f4f6 50%, #e5e7eb 50%, #e5e7eb 75%, #f3f4f6 75%, #f3f4f6)`,
            backgroundSize: '40px 40px',
          }}
        />
      )}

      {/* Pre-permission screen overlay (z:20) */}
      <PrePermissionScreen onStartCamera={startCamera} />

      {/* Canvas and UI children render above */}
      {children}
    </WebcamRefContext.Provider>
  );
}
