# Phase 2: 3D Models & Hand Tracking - Context

**Gathered:** 2026-05-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the core interaction loop: users can load real anatomy GLB models into the viewport, manipulate them with mouse (OrbitControls), and use hand gestures (pinch+drag to rotate, two-hand pinch to scale, direction-based pan) tracked via MediaPipe through the webcam. The procedural skeleton from Phase 1 stays as the default model. This phase transforms the app from a static viewer into an interactive anatomy tool.

**Requirements:** CAM-03 (mouse controls), MDL-01 (GLB model loading), GEST-01 (hand detection), GEST-02 (pinch+drag gestures)

</domain>

<decisions>
## Implementation Decisions

### Anatomy Model Loading
- **D-01:** Keep the procedural skeleton as the default loaded model. It remains the always-available baseline that users see on first load.
- **D-02:** Add a "Load Model" file picker button that opens the OS file picker for .glb/.gltf files. No drag-and-drop for now.
- **D-03:** Loading a new GLB model replaces the current model — one model visible at a time.
- **D-04:** Bundle 1-2 pre-built free GLB anatomy models as static assets so the app has real 3D content out of the box for the capstone demo.
- **D-05:** No file size limit on uploaded GLB files. Accept any GLB the user provides.
- **D-06:** Auto-fit loaded models — calculate bounding box, center, and scale to fit the viewport. Every model looks good on first load.
- **D-07:** Show a spinner overlay while a GLB model is being parsed and loaded.
- **D-08:** On load failure (corrupt GLB, no meshes), show a toast error message and keep the previous model visible. Non-destructive.

### Hand Tracking Feedback
- **D-09:** Draw hand landmarks as minimal dots (no connecting lines) on a 2D HTML canvas layered between the webcam video and the R3F canvas. Standard MediaPipe rendering layer.
- **D-10:** Show a hand detection status indicator in the top-right corner — a hand icon with a colored dot (green = detected, gray = no hand).
- **D-11:** When a pinch is recognized, highlight the thumb tip and index fingertip dots in a different color (e.g. green) as visual confirmation.
- **D-12:** Landmarks are toggleable via a UI button (default: visible). Users can hide them for a cleaner view.
- **D-13:** Hand tracking auto-starts when the webcam is active. No separate "Enable Hand Tracking" step.
- **D-14:** Track two hands simultaneously (numHands: 2) — required for GEST-02's two-hand pinch-to-scale.
- **D-15:** Throttle MediaPipe to 30fps while Three.js renders at 60fps. Saves GPU headroom per architecture guidance.
- **D-16:** MediaPipe WASM loading (~5MB) is non-blocking — show "Loading hand tracking..." in the status area while mouse controls work immediately.

### Pinch-to-Rotate Feel
- **D-17:** Single-hand pinch+drag uses trackball-style rotation — hand movement maps to a virtual trackball around the model for natural 3D inspection.
- **D-18:** Two-hand pinch-to-scale: both hands pinch, then the distance between pinch points maps to model scale. Hands apart = bigger, hands together = smaller.
- **D-19:** Small dead zone (~10px of hand movement) before rotation kicks in after pinching. Prevents accidental micro-rotations from hand jitter.
- **D-20:** Two-hand panning: two hands moving in the same direction = pan. Two hands moving apart/together = scale. Direction-based disambiguation.
- **D-21:** Standard pinch distance threshold of 0.05 (MediaPipe recommended default).
- **D-22:** Expose gesture sensitivity values (pinch threshold, dead zone, rotation sensitivity, scale sensitivity) in a Leva debug panel. Dev-only, hidden in production.

### Mouse & Gesture Coexistence
- **D-23:** Auto-switch input mode: when a hand is detected and pinching, gesture controls take over and OrbitControls are disabled. When no hand gesture is active, mouse controls re-enable. No manual mode toggle.
- **D-24:** Use drei's OrbitControls for mouse input — left-drag = rotate, scroll = zoom, right-drag = pan.
- **D-25:** 0.5-second debounce when transitioning from gesture back to mouse controls. Prevents flicker from momentary hand tracking drops.
- **D-26:** No visible input mode indicator — the switch is invisible. The user feels the change but isn't explicitly told.

### Webcam Mirroring
- **D-27:** Mirror the webcam feed horizontally (selfie-style). Moving right hand right moves landmarks right on screen. Natural for gesture control.

### Model Lighting
- **D-28:** Keep current lighting setup (ambient + single directional light). Lighting upgrades deferred to Phase 4 polish.

### UI Controls Layout
- **D-29:** Semi-transparent horizontal bar at the bottom of the viewport, always visible. Contains the Load Model button, landmark toggle, and other Phase 2 controls.

### Claude's Discretion
- Model momentum/inertia after releasing a pinch — Claude will choose between smooth deceleration and instant stop based on what feels best for anatomy inspection.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Requirements
- `.planning/ROADMAP.md` Phase 2 details — Success criteria, dependencies
- `.planning/REQUIREMENTS.md` — CAM-03, MDL-01, GEST-01, GEST-02 (Phase 2 requirements)
- `.planning/PROJECT.md` § Constraints — Timeline (<1 week), pnpm, Tauri, Windows dev environment

### Prior Phase Context
- `.planning/phases/01-ar-canvas-platform-foundation/01-CONTEXT.md` — DOM layer stacking pattern (D-04), procedural skeleton (D-05/D-06), build structure (D-07/D-08)

### Research Findings (MANDATORY READS)
- `.planning/research/STACK.md` — Technology choices (R3F, Zustand, MediaPipe tasks-vision)
- `.planning/research/ARCHITECTURE.md` — DOM layer stacking, component boundaries
- `.planning/research/PITFALLS.md` — Critical:
  - **Pitfall 1:** VideoTexture GPU contention — use HTML video + transparent canvas (already implemented)
  - **Pitfall 4:** Web model size budget — relevant for bundled GLB asset selection
  - **Pitfall 5:** MediaPipe WASM loading and performance considerations

### Technology References
- `CLAUDE.md` § Hand Tracking — MediaPipe tasks-vision v0.10.35, landmark indices, pinch detection formula, frame rate guidance
- `CLAUDE.md` § Recommended Stack — drei (OrbitControls, useGLTF), Leva debug controls, Zustand state management

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/SkeletonPreview.tsx` — Procedural skeleton with named groups (skull, spine, ribcage, pelvis, arms, legs). Will serve as default model. Named groups prepare for Phase 3 layer toggles.
- `src/components/Canvas.tsx` — R3F Canvas with transparent background, Suspense fallback. Will be extended with OrbitControls and model loading.
- `src/store/appState.ts` — Zustand store with permission state. Will be extended with model state, gesture state, and hand tracking state.
- `src/components/WebcamProvider.tsx` — Webcam access and video element. MediaPipe will consume the same video element.
- `src/hooks/useSkeletonAnimation.ts` — Auto-rotation hook. Auto-rotation should stop when a real model is loaded or user interacts.

### Established Patterns
- DOM layer stacking: video (z:0) → R3F canvas (z:1) → UI overlays (z:10). The landmark canvas goes at z:0.5 (between video and R3F).
- React Context for webcam ref sharing (`src/context/WebcamRefContext.ts`)
- Fixed positioning for viewport-spanning layers (`App.tsx` inline styles)

### Integration Points
- `App.tsx` z-index layers — landmark canvas inserts between video and R3F canvas
- `Canvas.tsx` — add OrbitControls, swap SkeletonPreview for a model loader component
- `appState.ts` — extend with `currentModel`, `gestureState`, `handTrackingEnabled`, `landmarksVisible`
- Bottom toolbar inserts at z:10 overlay layer in App.tsx

</code_context>

<specifics>
## Specific Ideas

### Bundled Anatomy Models
Research should identify 1-2 free/open GLB anatomy models suitable for bundling. Requirements:
1. Free/open license (CC0 or CC-BY compatible)
2. Web-optimized file size
3. Named mesh hierarchies preferred (prepares for Phase 3 layer toggles)
4. GLB format (single file, no external textures)

Sources to evaluate: AnatomyTOOL (GitHub), Sketchfab (CC0/CC-BY filter), free anatomy model repositories.

### Landmark Canvas Architecture
The 2D canvas for drawing hand landmarks needs to:
1. Match the webcam video dimensions exactly
2. Be mirrored to match the mirrored video feed
3. Clear and redraw on each MediaPipe frame (30fps)
4. Support per-landmark color changes (for pinch highlighting)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. Lighting upgrades noted for Phase 4 polish.

</deferred>

---

*Phase: 2-3D Models & Hand Tracking*
*Context gathered: 2026-05-24*
