import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/appState';

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const permissionState = useAppStore((state) => state.permissionState);
  const setPermissionState = useAppStore((state) => state.setPermissionState);
  const setVideoRef = useAppStore((state) => state.setVideoRef);

  // Restore permission state from localStorage on mount
  useEffect(() => {
    const savedPermission = localStorage.getItem('webcam_permission') as any;
    if (savedPermission && ['granted', 'denied'].includes(savedPermission)) {
      setPermissionState(savedPermission);
      if (savedPermission === 'granted') {
        startCamera();
      }
    } else {
      setPermissionState('unknown');
    }
  }, []);

  // Set video ref in store
  useEffect(() => {
    setVideoRef(videoRef);
  }, [setVideoRef]);

  const startCamera = async () => {
    try {
      setPermissionState('pending');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setPermissionState('granted');
        localStorage.setItem('webcam_permission', 'granted');
      }
    } catch (error: any) {
      console.error('Camera access denied:', error);
      setPermissionState('denied');
      localStorage.setItem('webcam_permission', 'denied');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  return {
    videoRef,
    permissionState,
    startCamera,
    stopCamera,
  };
}
