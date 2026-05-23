import { WebcamProvider } from '@/components/WebcamProvider';
import { Canvas } from '@/components/Canvas';

export default function App() {
  return (
    <WebcamProvider>
      {/* z:0 — Video background (handled by WebcamProvider) */}

      {/* z:1 — R3F Canvas with 3D skeleton model, fixed to viewport so it always overlays */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 1, pointerEvents: 'auto' }}>
        <Canvas />
      </div>

      {/* z:10 — UI overlays (will be added as needed) */}
    </WebcamProvider>
  );
}
