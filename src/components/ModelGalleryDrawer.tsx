import { useRef, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { useAppStore } from '@/store/appState';

interface ModelEntry {
  url: string | null;
  label: string;
  thumb: string;
}

// Bundled model entries — null url = procedural skeleton (D-01)
const MODELS: ModelEntry[] = [
  { url: null,               label: 'Skeleton', thumb: '/models/skeleton-thumb.png' },
  { url: '/models/body.glb', label: 'Body',     thumb: '/models/body-thumb.png' },
];

/** Reset all phase-3 state that depends on the loaded model (D-13) */
function useResetPhase3State() {
  const setAvailableLayers  = useAppStore((s) => s.setAvailableLayers);
  const setVisibleLayers    = useAppStore((s) => s.setVisibleLayers);
  const setExplodeActive    = useAppStore((s) => s.setExplodeActive);
  const setSelectedMeshName = useAppStore((s) => s.setSelectedMeshName);

  return () => {
    setAvailableLayers([]);
    setVisibleLayers(new Set());
    setExplodeActive(false);
    setSelectedMeshName(null);
  };
}

export function ModelGalleryDrawer() {
  const drawerOpen      = useAppStore((s) => s.drawerOpen);
  const setDrawerOpen   = useAppStore((s) => s.setDrawerOpen);
  const modelUrl        = useAppStore((s) => s.modelUrl);
  const setModelUrl     = useAppStore((s) => s.setModelUrl);
  const setModelLoadError = useAppStore((s) => s.setModelLoadError);

  const resetPhase3State = useResetPhase3State();

  // CR-04: track previous object URL for cache clearing + revocation
  const prevObjectUrlRef = useRef<string | null>(null);

  // Hidden file input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hover state for list items
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Handle selecting a bundled model (D-04: reset phase 3 state on model change)
  const handleSelectModel = (entry: ModelEntry) => {
    setModelUrl(entry.url);
    resetPhase3State();
    setDrawerOpen(false);
  };

  // Handle file picker — CR-04 object URL lifecycle
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // CR-04: Clear useGLTF cache and revoke previous object URL to prevent stale cache + memory leak
    const newUrl = URL.createObjectURL(file);
    if (prevObjectUrlRef.current) {
      useGLTF.clear(prevObjectUrlRef.current);
      URL.revokeObjectURL(prevObjectUrlRef.current);
    }
    prevObjectUrlRef.current = newUrl;

    setModelUrl(newUrl);
    setModelLoadError(null);
    resetPhase3State();
    setDrawerOpen(false);

    // Reset so same file can be reloaded
    e.target.value = '';
  };

  // CR-02 fix: Do NOT revoke URL on unmount — the drawer unmounts on every close
  // (drawerOpen=false → return null below), and the active model may still reference
  // the object URL. handleFileChange already revokes the previous URL on replacement.

  // Render nothing when drawer is closed
  if (!drawerOpen) return null;

  return (
    <>
      {/* Backdrop — closes drawer on click */}
      <div
        aria-label="Close model gallery"
        onClick={() => setDrawerOpen(false)}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 10,
          background: 'rgba(0, 0, 0, 0.4)',
          cursor: 'pointer',
        }}
      />

      {/* Drawer panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          bottom: 0,
          width: 280,
          zIndex: 10,
          transform: 'translateX(0)',
          transition: 'transform 0.25s ease-out',
          background: 'rgba(17, 24, 39, 0.92)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          flexDirection: 'column',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: 16,
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: 16,
            fontWeight: 600,
            color: '#ffffff',
            flexShrink: 0,
          }}
        >
          Select Model
        </div>

        {/* Model list */}
        <div style={{ flexGrow: 1 }}>
          {MODELS.map((entry, idx) => {
            // Active highlight: for skeleton (url=null) match when modelUrl is null;
            // for GLBs match when entry.url === modelUrl
            const isActive = entry.url === null
              ? modelUrl === null
              : entry.url === modelUrl;
            const isHovered = hoveredIndex === idx;

            return (
              <div
                key={entry.label}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectModel(entry)}
                onKeyDown={(e) => e.key === 'Enter' && handleSelectModel(entry)}
                onMouseEnter={() => setHoveredIndex(idx)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 16px',
                  cursor: 'pointer',
                  borderLeft: isActive ? '3px solid #2563EB' : '3px solid transparent',
                  background: isActive
                    ? 'rgba(37, 99, 235, 0.15)'
                    : isHovered
                    ? 'rgba(255, 255, 255, 0.08)'
                    : 'transparent',
                  transition: 'background 0.15s ease',
                  userSelect: 'none',
                  minHeight: 48,
                }}
              >
                <img
                  src={entry.thumb}
                  alt={entry.label}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 6,
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: 14, fontWeight: 400, color: '#ffffff' }}>
                  {entry.label}
                </span>
              </div>
            );
          })}

          {/* Separator */}
          <div
            style={{
              height: 1,
              background: 'rgba(255, 255, 255, 0.1)',
              margin: '8px 0',
            }}
          />

          {/* "+ Load file" entry */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            onMouseEnter={() => setHoveredIndex(MODELS.length)}
            onMouseLeave={() => setHoveredIndex(null)}
            style={{
              padding: '12px 16px',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 400,
              color: 'rgba(255, 255, 255, 0.7)',
              background: hoveredIndex === MODELS.length
                ? 'rgba(255, 255, 255, 0.08)'
                : 'transparent',
              transition: 'background 0.15s ease',
              userSelect: 'none',
              minHeight: 48,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            + Load file
          </div>
        </div>
      </div>

      {/* Hidden file input — accepts GLB and GLTF files */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".glb,.gltf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </>
  );
}
