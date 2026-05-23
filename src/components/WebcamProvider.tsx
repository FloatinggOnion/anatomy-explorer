import { ReactNode, useMemo } from 'react';
import { useWebcam } from '@/hooks/useWebcam';
import { useAppStore } from '@/store/appState';
import { PrePermissionScreen } from './PrePermissionScreen';

interface WebcamProviderProps {
  children: ReactNode;
}

export function WebcamProvider({ children }: WebcamProviderProps) {
  const { videoRef, permissionState, startCamera } = useWebcam();
  const setVideoRef = useAppStore((state) => state.setVideoRef);

  // Store the ref in app state
  useMemo(() => {
    setVideoRef(videoRef);
  }, [videoRef, setVideoRef]);

  const isPermissionDenied = permissionState === 'denied';

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* z:0 — Video background or fallback checkerboard */}
      <video
        ref={videoRef}
        className={`absolute top-0 left-0 w-full h-full object-cover z-0 ${
          isPermissionDenied ? 'hidden' : ''
        }`}
        playsInline
        muted
      />

      {/* Checkerboard fallback when permission is denied */}
      {isPermissionDenied && (
        <div className="absolute top-0 left-0 w-full h-full z-0 bg-gradient-to-br from-gray-200 to-gray-300">
          <div className="w-full h-full" style={{
            backgroundImage: `linear-gradient(45deg, #e5e7eb 25%, #f3f4f6 25%, #f3f4f6 50%, #e5e7eb 50%, #e5e7eb 75%, #f3f4f6 75%, #f3f4f6)`,
            backgroundSize: '40px 40px',
          }} />
        </div>
      )}

      {/* Pre-permission screen overlay */}
      <PrePermissionScreen onStartCamera={startCamera} />

      {/* z:1 placeholder for Canvas (will be filled by App.tsx) */}
      {/* z:10 UI overlays */}
      {children}
    </div>
  );
}
