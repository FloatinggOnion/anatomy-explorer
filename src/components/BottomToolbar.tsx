import { useState, useEffect } from 'react';
import { useAppStore } from '@/store/appState';
import { LayerChipRow } from './LayerChipRow';

export function BottomToolbar() {
  const setDrawerOpen     = useAppStore((s) => s.setDrawerOpen);
  const setModelLoadError = useAppStore((s) => s.setModelLoadError);
  const landmarksVisible  = useAppStore((s) => s.landmarksVisible);
  const setLandmarksVisible = useAppStore((s) => s.setLandmarksVisible);
  const modelLoadError    = useAppStore((s) => s.modelLoadError);
  const explodeActive     = useAppStore((s) => s.explodeActive);
  const setExplodeActive  = useAppStore((s) => s.setExplodeActive);
  const inspectMode       = useAppStore((s) => s.inspectMode);
  const setInspectMode    = useAppStore((s) => s.setInspectMode);
  const availableLayers   = useAppStore((s) => s.availableLayers);

  // Local state: whether the layer chip row is expanded
  const [layersOpen, setLayersOpen] = useState(false);

  // Auto-dismiss error toast after 5 seconds (D-08)
  useEffect(() => {
    if (!modelLoadError) return;
    const timer = setTimeout(() => setModelLoadError(null), 5000);
    return () => clearTimeout(timer);
  }, [modelLoadError, setModelLoadError]);

  // Divider helper
  const Divider = () => (
    <div
      style={{
        width: 1,
        height: 24,
        background: 'rgba(255, 255, 255, 0.2)',
        flexShrink: 0,
      }}
    />
  );

  return (
    <>
      {/* Layer chip row — positioned above toolbar, visible when layersOpen and layers exist */}
      {layersOpen && availableLayers.length > 0 && <LayerChipRow />}

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
        {/* 1. Models button — accent fill, opens model gallery drawer */}
        <button
          onClick={() => setDrawerOpen(true)}
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
            flexShrink: 0,
          }}
        >
          Models
        </button>

        {/* 2. Divider */}
        <Divider />

        {/* 3. Landmarks toggle — ghost style, unchanged from Phase 2 */}
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
            flexShrink: 0,
          }}
        >
          {landmarksVisible ? 'Landmarks ON' : 'Landmarks OFF'}
        </button>

        {/* 4. Divider */}
        <Divider />

        {/* 5. Layers button — enabled when named groups exist; disabled otherwise (D-14) */}
        <button
          disabled={availableLayers.length === 0}
          aria-disabled={availableLayers.length === 0}
          onClick={availableLayers.length > 0 ? () => setLayersOpen(!layersOpen) : undefined}
          style={{
            background: 'transparent',
            border: layersOpen && availableLayers.length > 0
              ? '1px solid #2563EB'
              : '1px solid rgba(255, 255, 255, 0.3)',
            color: '#ffffff',
            borderRadius: 6,
            padding: '0 12px',
            height: 36,
            fontSize: 12,
            fontWeight: 400,
            cursor: availableLayers.length === 0 ? 'not-allowed' : 'pointer',
            opacity: availableLayers.length === 0 ? 0.4 : 1,
            flexShrink: 0,
          }}
        >
          Layers
        </button>

        {/* 6. Divider */}
        <Divider />

        {/* 7. Explode toggle — accent fill when active, ghost when inactive */}
        <button
          onClick={() => setExplodeActive(!explodeActive)}
          style={{
            background: explodeActive ? '#2563EB' : 'transparent',
            border: explodeActive ? 'none' : '1px solid rgba(255, 255, 255, 0.3)',
            color: '#ffffff',
            borderRadius: 6,
            padding: '0 12px',
            height: 36,
            fontSize: 12,
            fontWeight: 400,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Explode
        </button>

        {/* 8. Divider */}
        <Divider />

        {/* 9. Inspect toggle — accent fill when active, ghost when inactive */}
        <button
          onClick={() => setInspectMode(!inspectMode)}
          style={{
            background: inspectMode ? '#2563EB' : 'transparent',
            border: inspectMode ? 'none' : '1px solid rgba(255, 255, 255, 0.3)',
            color: '#ffffff',
            borderRadius: 6,
            padding: '0 12px',
            height: 36,
            fontSize: 12,
            fontWeight: 400,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          Inspect
        </button>
      </div>
    </>
  );
}
