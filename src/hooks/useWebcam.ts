import { useCallback, useEffect, useRef } from 'react';
import { useAppStore } from '@/store/appState';


export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const permissionState = useAppStore((state) => state.permissionState);
  const setPermissionState = useAppStore((state) => state.setPermissionState);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    try {
      setPermissionState('pending');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setPermissionState('granted');
        localStorage.setItem('webcam_permission', 'granted');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Camera error';
      if (import.meta.env.DEV) console.error('Camera access denied:', message);
      // Remove any saved grant so the next reload shows the pre-permission screen
      // instead of permanently showing the checkerboard with no retry path.
      localStorage.removeItem('webcam_permission');
      setPermissionState('denied');
    }
  }, [setPermissionState]);

  // Restore permission state on mount — only auto-start if previously granted.
  // Never restore 'denied' from storage: always show the pre-permission screen
  // so the user has a path to retry (e.g. after revoking and re-granting in browser settings).
  useEffect(() => {
    const saved = localStorage.getItem('webcam_permission');
    if (saved === 'granted') {
      startCamera();
    } else {
      setPermissionState('unknown');
    }
  }, [startCamera, setPermissionState]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  return { videoRef, permissionState, startCamera, stopCamera };
}
