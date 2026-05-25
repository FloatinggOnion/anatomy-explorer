# Phase 3: Educational Features - Context

**Gathered:** 2026-05-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Deliver the educational interaction layer: a side-drawer model gallery (skeleton, body, and user-loaded files), body part selection via index-finger point+hold with anatomy label overlays, layer toggles that show/hide named mesh groups, and an explode view that separates model parts outward from center with animated lerp. A new Inspect mode (toolbar toggle) scopes the spread-fingers/fist gesture to explode control without conflicting with Phase 4's planned wave mode gesture assignments.

**Requirements:** MDL-02 (model gallery), MDL-03 (body part labels), MDL-04 (layer toggles), MDL-05 (explode view)

</domain>

<decisions>
## Implementation Decisions

### Model Gallery (MDL-02)
- **D-01:** Gallery lives in a side drawer that overlays the AR canvas (canvas keeps running underneath with a semi-transparent backdrop). No push/resize of the Three.js viewport.
- **D-02:** Each drawer entry shows a pre-rendered PNG thumbnail + model name. Bundled models (skeleton, body) ship with PNGs in `public/models/`. User-loaded models fall back to a generic 3D box icon.
- **D-03:** Load file is moved INTO the drawer (a '+ Load file' entry at the bottom of the list). The existing Load Model button is removed from the bottom toolbar.
- **D-04:** Selecting a model from the drawer immediately loads it (replaces current model) and closes the drawer.
- **D-05:** Currently active model is visually highlighted in the drawer list.

### Body Part Labels (MDL-03)
- **D-06:** Selection gesture: index finger extended + hold ~1 second (pointing gesture, not pinch). Raycasting from the 2D screen position of the index fingertip landmark.
- **D-07:** Label content: name + short description. Source is a static TypeScript file `src/data/anatomyLabels.ts` mapping mesh name → `{ name: string; description: string }`.
- **D-08:** Fallback for unknown mesh names: display the prettified raw mesh name only (e.g., 'left-arm' → 'Left Arm'). No error state.
- **D-09:** Label is rendered as an HTML overlay anchored to the selected mesh's 3D world position using drei's `<Html>` component. Projects and follows the model in 3D space.
- **D-10:** Only one body part can be selected at a time. Selecting another part replaces the current label. Clicking/pointing elsewhere deselects.

### Layer Toggles (MDL-04)
- **D-11:** Layers work on ANY model with named mesh groups — scan mesh children on load and auto-generate toggle chips for each recognized group name. Procedural skeleton uses its existing named groups (skull, spine, ribcage, pelvis, left-arm, right-arm, left-leg, right-leg). User-loaded GLBs with named groups also get toggles.
- **D-12:** Layer toggle UI lives in the bottom toolbar: a 'Layers' button expands a row of toggle chips above the toolbar.
- **D-13:** All layers default to visible when a model loads. State resets on model switch.
- **D-14:** If a loaded model has no named mesh groups, the Layers button is hidden or disabled.

### Explode View (MDL-05)
- **D-15:** Explode is a toggle button in the bottom toolbar. Binary: off = normal, on = parts separated.
- **D-16:** Works on any model with named mesh groups (same rule as layers).
- **D-17:** Each mesh group moves outward from the model's bounding box center. Direction = normalize(groupCenter − modelCenter). Automatic, no per-model authoring needed.
- **D-18:** Transition is animated using Three.js lerp in `useFrame`, ~0.5 seconds. Parts smoothly slide to exploded positions and back.
- **D-19:** Explode magnitude is a fixed multiplier (e.g. 1.5× the model's bounding radius). Claude decides the exact value based on what looks good for the bundled models.

### Inspect Mode & Gesture Binding
- **D-20:** A dedicated 'Inspect' toggle button in the bottom toolbar activates Inspect mode.
- **D-21:** In Inspect mode only: spread fingers (all 5 fingers extended wide) → triggers explode ON; fist (all fingers curled) → triggers explode OFF.
- **D-22:** Outside Inspect mode, spread/fist gestures have no effect on explode — preserving Phase 4's assignment of those gestures to zoom in/out in the open hand wave mode.
- **D-23:** In Inspect mode, pinch+drag rotation still works normally. Only the spread/fist interpretation is added; no other controls change.
- **D-24:** Inspect mode and the Layers panel are independent. Either can be active without the other.

### Claude's Discretion
- Exact explode multiplier/scale factor — choose based on what looks good with skeleton.glb and body.glb.
- Animation easing curve for explode lerp — smooth deceleration preferred over linear.
- Drawer animation (slide direction: left edge, right edge) and width — choose what fits the existing layout.
- Label bubble styling (background, typography, arrow/pin indicator) — match the existing app aesthetic.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Requirements
- `.planning/ROADMAP.md` Phase 3 details — Goal, success criteria, dependencies
- `.planning/REQUIREMENTS.md` — MDL-02, MDL-03, MDL-04, MDL-05 (Phase 3 requirements)
- `.planning/PROJECT.md` § Constraints — Timeline (<1 week), pnpm, Tauri, Windows dev environment

### Prior Phase Context
- `.planning/phases/02-3d-models-hand-tracking/02-CONTEXT.md` — Model loading pattern (D-01–D-08), gesture architecture (D-17–D-26), DOM layer stacking, Zustand store extension pattern
- `.planning/phases/01-ar-canvas-platform-foundation/01-CONTEXT.md` — DOM layer stacking (z:0/1/10), component conventions

### Technology References
- `CLAUDE.md` § Hand Tracking — MediaPipe landmark indices (index fingertip = landmark 8), finger extension detection via y-coordinate comparison, pointing gesture logic
- `CLAUDE.md` § Recommended Stack — drei `<Html>` for 3D-anchored overlays, `useGLTF`, Zustand v5 patterns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/components/SkeletonPreview.tsx` — Procedural skeleton with named groups (skull, spine, ribcage, pelvis, left-arm, right-arm, left-leg, right-leg). Layer toggles map directly to these groups. Explode view iterates these same groups.
- `src/components/ModelViewer.tsx` — GLB loading with auto-fit and scene cloning (`useMemo(() => scene.clone(true), [scene])`). Phase 3 extends this to expose mesh group refs for layer toggling and explode.
- `src/components/BottomToolbar.tsx` — Existing bottom toolbar with Load Model and landmark toggle. Phase 3 adds: Models drawer button, Layers button (expanding chip row), Explode toggle, Inspect mode toggle. Remove existing Load Model button.
- `src/store/appState.ts` — Zustand store. Needs new fields: `drawerOpen`, `inspectMode`, `explodeActive`, `visibleLayers` (Set of group names), `selectedMeshName`.
- `src/components/Canvas.tsx` — R3F Canvas, owns `modelGroupRef` forwarded to ModelViewer and SceneController. Phase 3 components (explode, layer toggle) need access to this ref.

### Established Patterns
- DOM layer stacking: video (z:0) → landmark canvas (z:0.5) → R3F canvas (z:1) → UI overlays (z:10). Drawer and label overlays live at z:10.
- Scene cloning via `useMemo` to avoid mutating useGLTF cache (CR-04 pattern from Phase 2).
- AppInner pattern: hooks requiring WebcamRefContext must be inside the WebcamProvider boundary.
- Leva debug panel for tuning constants (dev only, hidden in production).

### Integration Points
- `Canvas.tsx` — Add explode/layer logic inside the R3F scene (or a new SceneController extension). The `modelGroupRef` written by ModelViewer is the entry point for iterating mesh groups.
- `appState.ts` — Extend store with gallery/inspect/explode/layer state.
- `BottomToolbar.tsx` — Add 3 new buttons (Models, Layers, Inspect), remove Load Model button.
- `useGestureInterpreter.ts` — Add spread-fingers and fist detection paths, gated on `inspectMode` from Zustand store.
- `App.tsx` — Add drawer component at z:10 overlay layer (alongside HandStatusIndicator, LandmarkCanvas).

</code_context>

<specifics>
## Specific Ideas

### Anatomy Label Data File
`src/data/anatomyLabels.ts` should cover at minimum:
- Procedural skeleton named groups: skull, spine, ribcage, pelvis, left-arm, right-arm, left-leg, right-leg
- Any named meshes in the bundled body.glb (researcher should inspect mesh hierarchy)
- Format: `Record<string, { name: string; description: string }>`

### Pointing Gesture Detection
- MediaPipe landmark 8 = index fingertip, landmark 6 = index PIP, landmark 5 = index MCP
- Pointing = index finger extended (tip.y < pip.y) + other fingers curled (tip.y > pip.y for each)
- Hold threshold: ~1 second of continuous pointing at the same mesh before label appears
- Raycasting: project landmark 8 screen coordinates into Three.js raycaster, intersect against model meshes

### Spread / Fist Gesture Detection (Inspect mode)
- Spread = all 5 fingertips extended (tip.y < pip.y for all fingers)
- Fist = all 5 fingertips curled (tip.y > pip.y for all fingers)
- Only acted on when `inspectMode === true` in Zustand store

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope. Gesture assignments for zoom (spread/fist in wave mode) are preserved for Phase 4 via the Inspect mode gating in D-22.

</deferred>

---

*Phase: 3-Educational Features*
*Context gathered: 2026-05-25*
