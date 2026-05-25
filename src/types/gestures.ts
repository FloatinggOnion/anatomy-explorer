// src/types/gestures.ts
// Gesture type contracts for Phase 2 hand tracking

export type GestureMode = 'idle' | 'pinching' | 'two-hand-pinch' | 'wave-rotate' | 'wave-zoom';

export interface GestureState {
  mode: GestureMode;
  pinchOrigin: { x: number; y: number } | null;
}

export type GestureCommand =
  | { type: 'idle' }
  | { type: 'rotate'; delta: { x: number; y: number } }
  | { type: 'scale'; factor: number }
  | { type: 'pan'; delta: { x: number; y: number } }
  | { type: 'wave-zoom'; direction: 'in' | 'out'; speed: number };
