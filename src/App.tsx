import { WebcamProvider } from '@/components/WebcamProvider';
import { Canvas } from '@/components/Canvas';

export default function App() {
  return (
    <WebcamProvider>
      {/* z:0 — Video background (handled by WebcamProvider) */}

      {/* TODO Plan 02-03: <LandmarkCanvas /> — 2D hand landmark overlay, zIndex: 1, pointerEvents: none */}

      {/* z:2 — R3F Canvas with 3D skeleton/model, fixed to viewport so it always overlays */}
      {/* Note: bumped from z:1 to z:2 to accommodate LandmarkCanvas at z:1 (Phase 2 stack) */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 2, pointerEvents: 'auto' }}>
        <Canvas />
      </div>

      {/* z:10 — UI overlays */}
      {/* TODO Plan 02-03: <HandStatusIndicator /> — hand detection dot indicator, zIndex: 10 */}
      {/* TODO Plan 02-02: <BottomToolbar /> — model file picker + landmark toggle, zIndex: 10 */}
    </WebcamProvider>
  );
}
