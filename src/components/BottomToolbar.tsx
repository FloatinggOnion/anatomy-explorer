import { useRef, useState, useEffect } from 'react';
import { useAppStore } from '@/store/appState';

export function BottomToolbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prevObjectUrlRef = useRef<string | null>(null);

  const setModelUrl = useAppStore((s) => s.setModelUrl);
  const setModelLoadError = useAppStore((s) => s.setModelLoadError);
  const landmarksVisible = useAppStore((s) => s.landmarksVisible);
  const setLandmarksVisible = useAppStore((s) => s.setLandmarksVisible);
  const modelLoadError = useAppStore((s) => s.modelLoadError);

  // Local loading state — best-effort 2s spinner after file selection (D-07)
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Revoke previous object URL to prevent memory leak (Pitfall D, T-02-05)
    const newUrl = URL.createObjectURL(file);
    if (prevObjectUrlRef.current) URL.revokeObjectURL(prevObjectUrlRef.current);
    prevObjectUrlRef.current = newUrl;

    setModelUrl(newUrl);
    setModelLoadError(null);
    setIsLoading(true);

    // Reset so same file can be reloaded
    e.target.value = '';
  };

  // Clear loading spinner after 2 seconds (best-effort — no store coupling needed)
  useEffect(() => {
    if (!isLoading) return;
    const timer = setTimeout(() => setIsLoading(false), 2000);
    return () => clearTimeout(timer);
  }, [isLoading]);

  // Revoke object URL on unmount to prevent memory leak (CR-01)
  useEffect(() => {
    return () => {
      if (prevObjectUrlRef.current) {
        URL.revokeObjectURL(prevObjectUrlRef.current);
        prevObjectUrlRef.current = null;
      }
    };
  }, []);

  // Auto-dismiss error toast after 5 seconds (D-08)
  useEffect(() => {
    if (!modelLoadError) return;
    const timer = setTimeout(() => setModelLoadError(null), 5000);
    return () => clearTimeout(timer);
  }, [modelLoadError, setModelLoadError]);

  return (
    <>
      {/* Loading spinner overlay */}
      {isLoading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10,
            background: 'rgba(17, 24, 39, 0.8)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
          }}
        >
          <div
            className="mp-spin"
            style={{
              width: 32,
              height: 32,
              border: '3px solid transparent',
              borderTop: '3px solid #2563EB',
              borderRadius: '50%',
            }}
          />
          <span style={{ fontSize: 20, color: '#ffffff' }}>Loading model...</span>
        </div>
      )}

      {/* Error toast — bottom-right, auto-dismisses after 5s (D-08) */}
      {modelLoadError && (
        <div
          style={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 20,
            background: '#7F1D1D',
            color: '#FCA5A5',
            padding: '12px 16px',
            borderRadius: 8,
            maxWidth: 320,
            fontSize: 14,
            whiteSpace: 'pre-line',
          }}
        >
          {modelLoadError}
          {'\n'}Your previous model is still active.
        </div>
      )}

      {/* Bottom toolbar bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 10,
          background: 'rgba(17, 24, 39, 0.7)',
          backdropFilter: 'blur(4px)',
          padding: '0 16px',
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        {/* Hidden file input — accepts GLB and GLTF files */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".glb,.gltf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        {/* Load Model button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          style={{
            background: '#2563EB',
            color: '#ffffff',
            borderRadius: 6,
            padding: '0 12px',
            height: 36,
            fontSize: 12,
            fontWeight: 400,
            cursor: 'pointer',
            border: 'none',
          }}
        >
          Load Model
        </button>

        {/* Vertical divider */}
        <div
          style={{
            width: 1,
            height: 24,
            background: 'rgba(255, 255, 255, 0.2)',
          }}
        />

        {/* Landmark toggle button */}
        <button
          onClick={() => setLandmarksVisible(!landmarksVisible)}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: '#ffffff',
            borderRadius: 6,
            padding: '0 12px',
            height: 36,
            fontSize: 12,
            fontWeight: 400,
            cursor: 'pointer',
          }}
        >
          {landmarksVisible ? 'Landmarks ON' : 'Landmarks OFF'}
        </button>
      </div>
    </>
  );
}
