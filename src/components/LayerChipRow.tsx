// src/components/LayerChipRow.tsx
// Expandable chip row above toolbar — one chip per named model group for layer toggling.

import { useAppStore } from '@/store/appState';

// ── Helpers ───────────────────────────────────────────────────────────────────────────────────────

/** Prettify a layer name: replace hyphens with spaces, capitalize first letter of each word */
function prettifyLayerName(name: string): string {
  return name
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

// ── Component ─────────────────────────────────────────────────────────────────────────────────────

/**
 * LayerChipRow: renders chip buttons for each named group in availableLayers.
 * Chips toggle group visibility via visibleLayers/setVisibleLayers.
 * Returns null if no layers available (D-14).
 */
export function LayerChipRow() {
  const availableLayers = useAppStore((s) => s.availableLayers);
  const visibleLayers = useAppStore((s) => s.visibleLayers);
  const setVisibleLayers = useAppStore((s) => s.setVisibleLayers);

  // D-14: return null when no layers (button should already be disabled)
  if (availableLayers.length === 0) return null;

  function toggleLayer(name: string) {
    const next = new Set(visibleLayers);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    setVisibleLayers(next);
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 44,
        left: 0,
        right: 0,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        overflowX: 'auto',
        gap: 8,
        padding: '8px 16px',
        minHeight: 44,
        alignItems: 'center',
        background: 'rgba(17, 24, 39, 0.7)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {availableLayers.map((name) => {
        const active = visibleLayers.has(name);
        return (
          <button
            key={name}
            onClick={() => toggleLayer(name)}
            style={{
              height: 28,
              borderRadius: 16,
              fontSize: 12,
              fontWeight: 400,
              padding: '4px 8px',
              cursor: 'pointer',
              flexShrink: 0,
              ...(active
                ? {
                    background: '#2563EB',
                    color: '#ffffff',
                    border: 'none',
                  }
                : {
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: 'rgba(255, 255, 255, 0.6)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }),
            }}
          >
            {prettifyLayerName(name)}
          </button>
        );
      })}
    </div>
  );
}
