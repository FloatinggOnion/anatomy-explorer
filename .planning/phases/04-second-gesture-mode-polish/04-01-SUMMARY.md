---
phase: 04-second-gesture-mode-polish
plan: 01
subsystem: gesture-system-types
tags:
  - zustand-store
  - gesture-types
  - type-contracts
dependency_graph:
  requires: []
  provides:
    - gestureMode field and setter for Plans 02-03
    - wave-rotate and wave-zoom internal gesture states
  affects:
    - src/hooks/useGestureInterpreter.ts (will read gestureMode to branch logic)
    - src/components/BottomToolbar.tsx (will toggle gestureMode)
tech_stack:
  added: []
  patterns:
    - Zustand store field/setter convention
    - TypeScript union type extension for gesture states
key_files:
  created: []
  modified:
    - src/store/appState.ts
    - src/types/gestures.ts
decisions: []
metrics:
  duration_minutes: 5
  completed_date: 2026-05-25
  tasks_completed: 2/2
  files_modified: 2
---

# Phase 4 Plan 01: Add gestureMode Field and Extend Gesture Types

**Summary:** Established Zustand store contract and gesture type system for Phase 4 gesture mode switching.

## Overview

Added `gestureMode: 'pinch' | 'wave'` field and `setGestureMode` setter to the Zustand app state store, enabling Plans 02–03 to read and toggle between gesture interaction modes. Extended the `GestureMode` and `GestureCommand` type contracts in the gesture type system to support wave mode internal states (`wave-rotate`, `wave-zoom`).

## What Was Built

### Task 1: Zustand Store Extension
- **File:** `src/store/appState.ts`
- **Changes:**
  - Added Phase 4 fields block to `AppState` interface with `gestureMode: 'pinch' | 'wave'` field
  - Added `setGestureMode: (mode: 'pinch' | 'wave') => void` setter function
  - Implemented default value `gestureMode: 'pinch'` to preserve existing behavior
  - Implemented setter using standard Zustand pattern: `(mode) => set({ gestureMode: mode })`
  - No modifications to existing Phase 1–3 fields

### Task 2: Gesture Type Extension
- **File:** `src/types/gestures.ts`
- **Changes:**
  - Extended `GestureMode` union type from 3 to 5 members: `'idle' | 'pinching' | 'two-hand-pinch' | 'wave-rotate' | 'wave-zoom'`
  - Added new `GestureCommand` variant: `{ type: 'wave-zoom'; direction: 'in' | 'out'; speed: number }`
  - Wave-zoom direction: 'in' for spread gesture, 'out' for fist gesture
  - Speed parameter: normalized 0.0–1.0 representing spread distance intensity
  - No modifications to existing gesture state interface or command variants

## Verification

✓ TypeScript compilation passed (`pnpm tsc --noEmit`)
✓ Zustand store syntax valid (no runtime errors on load)
✓ Gesture type union expanded without breaking existing code
✓ All type contracts preserve backward compatibility

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Commit | Message |
|--------|---------|
| cfafb42 | feat(04-01): add gestureMode field to Zustand store and extend gesture types |

## Integration Points for Plans 02–03

- **Plan 02** (BottomToolbar button): Will read `useAppStore((s) => s.gestureMode)` to display active mode, call `useAppStore.getState().setGestureMode()` on button click
- **Plan 03** (useGestureInterpreter logic): Will read `useAppStore.getState().gestureMode` in gesture detection branch; emit 'wave-rotate' and 'wave-zoom' mode values to gesture state machine; dispatch 'wave-zoom' commands to SceneController

## Known Stubs

None.

## Threat Flags

None — no new security surface introduced (internal state store, no external input).

## Next Steps

Plans 02 and 03 can now execute in parallel, both depending on the gestureMode contract established here.
