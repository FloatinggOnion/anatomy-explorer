import { useAppStore } from '@/store/appState';

interface PrePermissionScreenProps {
  onStartCamera: () => void;
}

export function PrePermissionScreen({ onStartCamera }: PrePermissionScreenProps) {
  const permissionState = useAppStore((state) => state.permissionState);

  if (permissionState === 'granted') {
    return null; // Hide when permission is granted
  }

  return (
    <div className="absolute top-0 left-0 w-full h-full z-20 bg-gray-900 flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <h1 className="text-4xl font-bold text-white mb-6">AR Anatomy Explorer</h1>
        <p className="text-gray-300 mb-8 text-lg">
          This app needs camera access to show your webcam feed as the AR background.
        </p>
        <button
          onClick={onStartCamera}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
        >
          Start Camera
        </button>
      </div>
    </div>
  );
}
