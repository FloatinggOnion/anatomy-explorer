import { useAppStore } from '@/store/appState';

export function HandStatusIndicator() {
  const handDetected = useAppStore((s) => s.handDetected);
  const handTrackingReady = useAppStore((s) => s.handTrackingReady);
  const gestureMode = useAppStore((s) => s.gestureMode);

  const isLoading = !handTrackingReady;
  // Green-500 when hand detected, gray-500 when not (from UI-SPEC color table)
  const dotColor = handDetected ? '#22C55E' : '#6B7280';
  const label = isLoading
    ? 'Loading hand tracking...'
    : handDetected
      ? 'Hand detected'
      : 'No hand detected';

  // Gesture mode badge styling
  const modeBadgeBackground = gestureMode === 'wave' ? '#2563EB' : 'rgba(255,255,255,0.15)';
  const modeBadgeLabel = gestureMode === 'wave' ? 'Wave' : 'Pinch';

  return (
    <div
      style={{
        position: 'fixed',
        top: 8,
        right: 8,
        zIndex: 10,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          alignItems: 'flex-start',
          background: 'rgba(0,0,0,0.4)',
          padding: '4px 8px',
          borderRadius: 6,
        }}
      >
        {/* Hand detection status row */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            gap: 4,
            alignItems: 'center',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: dotColor,
            }}
          />
          <span
            style={{
              fontSize: 12,
              fontWeight: 400,
              color: 'white',
            }}
          >
            {label}
          </span>
        </div>

        {/* Gesture mode badge — only show when tracking is ready */}
        {handTrackingReady && (
          <div
            style={{
              background: modeBadgeBackground,
              color: 'white',
              fontSize: 11,
              fontWeight: 400,
              borderRadius: 4,
              padding: '2px 6px',
            }}
          >
            {modeBadgeLabel}
          </div>
        )}
      </div>
    </div>
  );
}
