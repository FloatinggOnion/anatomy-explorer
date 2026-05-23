import { WebcamProvider } from '@/components/WebcamProvider';
import { Canvas } from '@/components/Canvas';

export default function App() {
  return (
    <WebcamProvider>
      {/* z:0 — Video background (handled by WebcamProvider) */}

      {/* z:1 — R3F Canvas with 3D skeleton model */}
      <div className="absolute top-0 left-0 w-full h-full z-1 pointer-events-auto">
        <Canvas />
      </div>

      {/* z:10 — UI overlays (will be added as needed) */}
    </WebcamProvider>
  );
}
