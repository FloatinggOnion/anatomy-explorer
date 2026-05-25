import { useState } from 'react';
import { useAppStore } from '@/store/appState';

interface PrePermissionScreenProps {
  onStartCamera: () => void;
}

export function PrePermissionScreen({ onStartCamera }: PrePermissionScreenProps) {
  const permissionState = useAppStore((state) => state.permissionState);
  const [hovered, setHovered] = useState(false);

  if (permissionState === 'granted' || permissionState === 'pending') {
    return null;
  }

  const isDenied = permissionState === 'denied';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: '#111827',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{ textAlign: 'center', maxWidth: 448, padding: '0 24px' }}>
        <h1 style={{ fontSize: 36, fontWeight: 700, color: '#ffffff', marginBottom: 24 }}>
          AR Anatomy Explorer
        </h1>
        {isDenied ? (
          <p style={{ color: '#FCA5A5', marginBottom: 32, fontSize: 18, lineHeight: 1.6 }}>
            Camera access was denied. Check your browser's camera permissions and try again.
          </p>
        ) : (
          <p style={{ color: '#D1D5DB', marginBottom: 32, fontSize: 18, lineHeight: 1.6 }}>
            This app needs camera access to show your webcam feed as the AR background.
          </p>
        )}
        <button
          onClick={onStartCamera}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            background: hovered ? '#1D4ED8' : '#2563EB',
            color: '#ffffff',
            fontWeight: 700,
            padding: '12px 32px',
            borderRadius: 8,
            border: 'none',
            fontSize: 16,
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
        >
          {isDenied ? 'Try Again' : 'Start Camera'}
        </button>
      </div>
    </div>
  );
}
