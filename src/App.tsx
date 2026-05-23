import { WebcamProvider } from '@/components/WebcamProvider';

export default function App() {
  return (
    <WebcamProvider>
      {/* z:0 — Video background (handled by WebcamProvider) */}
      {/* z:1 — Canvas overlay (will be added in Plan 03) */}
      <div className="absolute top-0 left-0 w-full h-full z-1 flex items-center justify-center pointer-events-none">
        <div className="text-white text-center pt-12">
          <h1 className="text-4xl font-bold">3D Canvas</h1>
          <p className="text-lg mt-2">(will be added in Plan 03)</p>
        </div>
      </div>
      {/* z:10 — UI overlays (will be added as needed) */}
    </WebcamProvider>
  );
}
