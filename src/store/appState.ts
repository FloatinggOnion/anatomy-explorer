import { create } from 'zustand';

export type PermissionState = 'granted' | 'denied' | 'pending' | 'unknown';

interface AppState {
  // Phase 1 fields
  permissionState: PermissionState;
  setPermissionState: (state: PermissionState) => void;

  // Phase 2 fields
  modelUrl: string | null;          // null = show procedural skeleton (D-01)
  setModelUrl: (url: string | null) => void;

  gestureActive: boolean;           // true = OrbitControls disabled (D-23)
  setGestureActive: (v: boolean) => void;

  landmarksVisible: boolean;        // D-12 toggle
  setLandmarksVisible: (v: boolean) => void;

  handDetected: boolean;            // D-10 status indicator
  setHandDetected: (v: boolean) => void;

  handTrackingReady: boolean;       // D-16 non-blocking WASM load
  setHandTrackingReady: (v: boolean) => void;

  modelLoadError: string | null;    // D-08 toast error message
  setModelLoadError: (msg: string | null) => void;

  handTrackingError: string | null; // CR-02: surface init failure to UI
  setHandTrackingError: (msg: string | null) => void;

  // Phase 3 fields
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;

  inspectMode: boolean;
  setInspectMode: (v: boolean) => void;

  explodeActive: boolean;
  setExplodeActive: (v: boolean) => void;

  visibleLayers: Set<string>;
  setVisibleLayers: (v: Set<string>) => void;

  availableLayers: string[];
  setAvailableLayers: (names: string[]) => void;

  selectedMeshName: string | null;
  setSelectedMeshName: (name: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Phase 1
  permissionState: 'unknown',
  setPermissionState: (state: PermissionState) => set({ permissionState: state }),

  // Phase 2
  modelUrl: null,
  setModelUrl: (url) => set({ modelUrl: url }),

  gestureActive: false,
  setGestureActive: (v) => set({ gestureActive: v }),

  landmarksVisible: true,
  setLandmarksVisible: (v) => set({ landmarksVisible: v }),

  handDetected: false,
  setHandDetected: (v) => set({ handDetected: v }),

  handTrackingReady: false,
  setHandTrackingReady: (v) => set({ handTrackingReady: v }),

  modelLoadError: null,
  setModelLoadError: (msg) => set({ modelLoadError: msg }),

  handTrackingError: null,
  setHandTrackingError: (msg) => set({ handTrackingError: msg }),

  // Phase 3
  drawerOpen: false,
  setDrawerOpen: (v) => set({ drawerOpen: v }),

  inspectMode: false,
  setInspectMode: (v) => set({ inspectMode: v }),

  explodeActive: false,
  setExplodeActive: (v) => set({ explodeActive: v }),

  visibleLayers: new Set<string>(),
  setVisibleLayers: (v) => set({ visibleLayers: v }),

  availableLayers: [],
  setAvailableLayers: (names) => set({ availableLayers: names }),

  selectedMeshName: null,
  setSelectedMeshName: (name) => set({ selectedMeshName: name }),
}));
