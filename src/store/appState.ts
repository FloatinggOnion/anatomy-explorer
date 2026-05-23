import { RefObject } from 'react';
import { create } from 'zustand';

export type PermissionState = 'granted' | 'denied' | 'pending' | 'unknown';

interface AppState {
  permissionState: PermissionState;
  setPermissionState: (state: PermissionState) => void;
  videoRef: RefObject<HTMLVideoElement | null> | null;
  setVideoRef: (ref: RefObject<HTMLVideoElement | null>) => void;
}

export const useAppStore = create<AppState>((set) => ({
  permissionState: 'unknown',
  setPermissionState: (state: PermissionState) => set({ permissionState: state }),
  videoRef: null,
  setVideoRef: (ref: RefObject<HTMLVideoElement | null>) => set({ videoRef: ref }),
}));
