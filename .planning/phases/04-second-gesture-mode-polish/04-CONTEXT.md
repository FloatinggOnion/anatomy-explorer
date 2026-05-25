# Phase 4: Second Gesture Mode & Polish - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver a second gesture interaction mode (open hand wave) that coexists with the pinch+drag mode from Phase 2-3. Users toggle between modes via a toolbar button. Wave mode: swipe (hand movement) rotates the model, spread/fist (open/closed hand) zoom in/out with continuous control. Polish the app across visual effects, gesture responsiveness, and demo-ready UX for capstone delivery.

**Requirements:** GEST-03 (open hand wave mode), GEST-04 (gesture mode toggle)

**Success Criteria:**
1. User can swipe to rotate the model (hand position drives trackball rotation)
2. User can spread fingers to zoom in and close fist to zoom out with hybrid hold-based control
3. User can toggle between pinch+drag and open hand wave modes via a visible UI button
4. Both gesture modes work reliably without conflicting

</domain>

<decisions>
## Implementation Decisions

### Gesture Mode Toggle (GEST-04)
- **D-01:** A dedicated toggle button in the bottom toolbar switches between "Pinch+Drag Mode" and "Wave Mode". User explicitly chooses which mode is active.
- **D-02:** Active mode is visually indicated via button highlighting (active state styling — e.g., background color or shadow change). User sees at a glance which mode is currently active.
- **D-03:** Mode state is stored in Zustand store as `gestureMode: 'pinch' | 'wave'` alongside existing `inspectMode`.
- **D-04:** Toggling the mode button immediately switches the gesture interpreter's behavior. No debounce or mode-locking per gesture — explicit button press is the only way to change modes.

### Open Hand Wave Mode Rotation (GEST-03)
- **D-05:** Swipe gesture = hand position directly maps to trackball rotation (drag-like, same `useOrbitControls` logic as pinch+drag mode, but without requiring a pinch).
- **D-06:** When in wave mode and user shows an open hand (not pinching, not pointing), hand movement rotates the model. Hand position at time T maps to rotation amount (velocity-independent, position-based).
- **D-07:** No special "swipe detection" needed — hand movement is continuous and trackball rotation applies immediately to any hand position while in wave mode.
- **D-08:** Rotation sensitivity uses existing tunable threshold (`rotationSensitivity` from Leva), shared with pinch+drag mode.

### Open Hand Wave Mode Zoom (GEST-03)
- **D-09:** Spread fingers (all 4 non-thumb fingers extended wide) + hold = continuous zoom in. Zoom speed depends on how far apart fingers are (distance between fingertips — similar to two-hand pinch-to-scale but with one hand).
- **D-10:** Fist (all 4 non-thumb fingers curled) + hold = continuous zoom out. Zoom speed depends on spread distance in the same way.
- **D-11:** Two-hand spread zoom: distance between left and right hand fingertips (midpoint to midpoint) maps to zoom level, like pinch-to-scale. One or both hands can spread for zoom; either hand's spread distance is read when that hand is active.
- **D-12:** Zoom is continuous — user holds spread/fist and zoom accumulates over time. No discrete steps. Zoom speed is proportional to spread distance (wider spread = faster zoom).
- **D-13:** Zoom uses existing scale logic from Phase 2 (three.js scale property on the scene). No new zoom mechanism needed.

### Mode Isolation & Conflict Handling
- **D-14:** In wave mode, pinch+drag is completely disabled. A pinch gesture while in wave mode is ignored (no rotation, no scale). This prevents accidental mode conflicts.
- **D-15:** Pointing gesture (index extended, others curled) still works in both modes for body part selection (inherited from Phase 3). Pointing does not trigger rotation or zoom.
- **D-16:** Inspect mode (explode control via spread/fist) is mutually exclusive with wave mode. If user enables Inspect mode, the wave mode button is disabled/hidden. If user switches to wave mode, Inspect mode is auto-disabled and its button is hidden.
- **D-17:** Gesture reliability uses the same hysteresis thresholds as Phase 2-3 (PINCH_ENTER=0.07, PINCH_EXIT=0.10, DEAD_ZONE_PX=5, etc.). No mode-specific thresholds — both modes share the same tunable constants.

### Polish Scope
- **D-18:** Visual effects: Add bloom or glow effects to selected body parts and critical UI elements (optional per Claude's judgment if time permits). Aim to make the 3D view more visually impressive for demo impact.
- **D-19:** Gesture feel & responsiveness: Tune rotation and zoom responsiveness (sensitivity constants) to feel smooth and predictable. Test with both gesture modes to ensure neither feels sluggish or over-sensitive. Momentum/ease on zoom deceleration is optional (Claude decides).
- **D-20:** Demo-ready UX: Ensure all error states, loading states, and fallback modes are polished. Permission flows, toast messages, and status indicators must look and feel professional. No rough edges during a live demo.
- **D-21:** Performance: Optimize bundle size and frame rate. Aim for consistent 60fps on demo hardware (e.g., modern laptop). Profile if frame rate drops during gesture heavy use.

### Claude's Discretion
- Exact zoom speed multiplier and easing curve for spread/fist zoom — tune for smooth, responsive feel.
- Button styling and animation for mode toggle (highlight color, transition speed, hover state).
- Visual effects implementation (bloom, bloom intensity, bloom threshold) — decide if time permits; demo works without them but looks better with them.
- Momentum/inertia decay on zoom release — smooth deceleration preferred if easily implementable.
- Performance optimization strategies — profile and choose between WebGL optimizations, bundle size reduction, or gesture throttling.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Requirements
- `.planning/ROADMAP.md` Phase 4 details — Goal, success criteria, dependencies
- `.planning/PROJECT.md` § Constraints — Timeline (<1 week), Windows dev environment, pnpm, Tauri

### Prior Phase Context (MANDATORY for implementation pattern understanding)
- `.planning/phases/03-educational-features/03-CONTEXT.md` — Inspect mode pattern (D-20–D-24), Zustand store extension, gesture gating
- `.planning/phases/02-3d-models-hand-tracking/02-CONTEXT.md` — Gesture architecture (D-17–D-26), OrbitControls integration, hand tracking setup, Leva tuning panel
- `.planning/phases/01-ar-canvas-platform-foundation/01-CONTEXT.md` — DOM layer stacking, component conventions

### Technology & Implementation References
- `CLAUDE.md` § Hand Tracking — MediaPipe landmark indices, finger detection logic (`isSpread()`, `isFist()` functions already exist in `useGestureInterpreter.ts`)
- `CLAUDE.md` § Recommended Stack — drei OrbitControls, Zustand store patterns, Leva debug controls
- `src/hooks/useGestureInterpreter.ts` — Already has `isSpread()` and `isFist()` detection; needs mode-aware branching (D-03, D-14–D-16)
- `src/store/appState.ts` — Zustand store needs new field `gestureMode: 'pinch' | 'wave'`
- `src/components/BottomToolbar.tsx` — Add gesture mode toggle button; hide wave button if Inspect mode is active (D-16)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/hooks/useGestureInterpreter.ts` — `isSpread()` and `isFist()` detection already implemented. Gesture interpreter skeleton for mode branching (D-03) is ready to extend.
- `src/components/Canvas.tsx` — OrbitControls already integrated for pinch+drag mode. Wave mode reuses the same OrbitControls instance, just without requiring a pinch (D-06, D-07).
- `src/store/appState.ts` — Zustand store ready for `gestureMode` field. Existing pattern: `setXxx` setters for each field.
- `src/components/BottomToolbar.tsx` — Established toolbar pattern with button styling and state. Add gesture mode toggle here.
- Leva debug panel (in `useGestureInterpreter`) — Already exposes `PINCH_ENTER`, `PINCH_EXIT`, `DEAD_ZONE_PX`, `rotationSensitivity`. Shared by both modes (D-17).

### Established Patterns
- Zustand store mutation pattern: Create setter function, call via `useAppStore.getState().setXxx()` or react hook `useAppStore(s => s.setXxx)`.
- DOM layer stacking: video (z:0) → landmark canvas (z:0.5) → R3F canvas (z:1) → UI overlays (z:10). Phase 4 toolbars and buttons live at z:10.
- Mode gating pattern (established in Phase 3 with `inspectMode`): In gesture interpreter, check `useAppStore.getState().gestureMode` and branch logic accordingly (D-03, D-14).
- Scene cloning via `useMemo` — already used for model loading, no changes needed.

### Integration Points
- `appState.ts` — Add `gestureMode: 'pinch' | 'wave'` field with setter.
- `useGestureInterpreter.ts` — Branch on `gestureMode` state:
  - In 'pinch' mode: existing logic (pinch detection drives rotation/scale).
  - In 'wave' mode: open-hand (non-pinch) hand movement drives rotation; spread/fist (via D-11 two-hand logic) drives zoom.
  - Shared: `isPointing()` works in both modes for body part selection (D-15).
- `BottomToolbar.tsx` — Add gesture mode toggle button (active state styling via D-02). Hide wave button if `inspectMode` is true (D-16).
- `Canvas.tsx` — No changes needed; OrbitControls work for both modes.

### Code Patterns to Preserve
- Hand tracking is always active; mode just changes how landmarks are interpreted.
- No new gesture detection functions needed — reuse `isSpread()`, `isFist()`, `isPointing()`.
- Gesture state machine in `useGestureInterpreter` continues to use ref-based tracking (no re-renders per frame).

</code_context>

<specifics>
## Specific Ideas

### Gesture Mode Button Styling
The gesture mode toggle button should visually stand out:
- Inactive state: gray or neutral background
- Active state: highlighted (e.g., colored background, shadow, or border emphasis)
- Hover state: subtle color shift
- Transition: smooth 200ms transition for visual feedback

### Inspect Mode & Wave Mode Exclusivity (D-16)
When `inspectMode === true`:
- Hide or disable the Wave Mode button
- If user is already in Wave Mode and toggles Inspect on, auto-switch to Pinch+Drag mode and show a toast: "Inspect mode activated. Switched to Pinch+Drag mode."

### Zoom Scaling Reference
Two-hand spread distance zoom (D-11):
- Measure distance between left-hand index fingertip (left[8]) and right-hand index fingertip (right[8])
- Use same scale multiplier as pinch-to-scale (e.g., `scaleFactor = distance / referenceDistance`)
- Clamp zoom to sensible bounds (e.g., 0.5x to 3.0x) to prevent infinite zoom

### Performance Profiling Targets
- Gesture interpreter should run at 30fps (Phase 2 existing setting) without blocking Three.js 60fps render
- Frame rate stability: maintain 60fps during active gesture (both modes)
- Bundle size: keep JS under 500KB gzipped (current: 308KB — room for polish effects)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. All decisions are locked for Phase 4.

</deferred>

---

*Phase: 4-Second Gesture Mode & Polish*
*Context gathered: 2026-05-25*
