import { create } from 'zustand';

export type PermissionState = 'granted' | 'denied' | 'pending' | 'unknown';

interface AppState {
  permissionState: PermissionState;
  setPermissionState: (state: PermissionState) => void;
}

export const useAppStore = create<AppState>((set) => ({
  permissionState: 'unknown',
  setPermissionState: (state: PermissionState) => set({ permissionState: state }),
}));
