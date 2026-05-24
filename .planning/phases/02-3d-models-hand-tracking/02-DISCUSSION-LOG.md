# Phase 2: 3D Models & Hand Tracking - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-24
**Phase:** 02-3D Models & Hand Tracking
**Areas discussed:** Anatomy model sourcing, Hand tracking feedback, Pinch-to-rotate feel, Mouse & gesture coexistence, UI controls layout, Webcam mirroring, Model lighting & environment

---

## Anatomy Model Sourcing

| Option | Description | Selected |
|--------|-------------|----------|
| Replace it entirely | Swap procedural skeleton for real GLB | |
| Keep both available | Procedural as fallback, GLBs alongside | |
| You decide | Claude picks | |

**User's choice:** Keep procedural skeleton as default, add ability to upload/load GLB models on top
**Notes:** User wants to be able to upload models but keep the procedural skeleton loaded as default

---

| Option | Description | Selected |
|--------|-------------|----------|
| File picker button | OS file picker for .glb/.gltf | ✓ |
| Drag-and-drop zone | Drag files onto viewport | |
| Both (picker + drag) | File picker + drag-and-drop | |

**User's choice:** File picker button

---

| Option | Description | Selected |
|--------|-------------|----------|
| Replace current | One model at a time, new replaces old | ✓ |
| Add to scene | Multiple models coexist | |
| You decide | Claude picks | |

**User's choice:** Replace current

---

| Option | Description | Selected |
|--------|-------------|----------|
| Bundle 1-2 models | Ship free anatomy GLBs as static assets | ✓ |
| Upload only | No bundled models | |
| You decide | Claude picks | |

**User's choice:** Bundle 1-2 models

---

| Option | Description | Selected |
|--------|-------------|----------|
| 5MB max | Strict limit for performance | |
| 20MB max | Generous limit | |
| No limit | Accept any file | ✓ |
| You decide | Claude picks | |

**User's choice:** No limit

---

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-fit (Recommended) | Bounding box center + scale to viewport | ✓ |
| Native size | Display at authored scale | |
| You decide | Claude picks | |

**User's choice:** Auto-fit

---

| Option | Description | Selected |
|--------|-------------|----------|
| Spinner overlay | Centered spinner during load | ✓ |
| Keep current model | Swap instantly when ready | |
| You decide | Claude picks | |

**User's choice:** Spinner overlay

---

| Option | Description | Selected |
|--------|-------------|----------|
| Toast error + keep current | Brief error, keep previous model | ✓ |
| Error state in viewport | Replace viewport with error | |
| You decide | Claude picks | |

**User's choice:** Toast error + keep current

---

## Hand Tracking Feedback

| Option | Description | Selected |
|--------|-------------|----------|
| Landmark debug overlay | Draw 21 landmarks on overlay | |
| Minimal status indicator | Small icon when hand detected | |
| Hand cursor/pointer | Virtual cursor following fingertip | |
| Landmarks + indicator | Both landmarks and status icon | ✓ |

**User's choice:** Landmarks + indicator

---

| Option | Description | Selected |
|--------|-------------|----------|
| Canvas over webcam feed | 2D HTML canvas between video and R3F | ✓ |
| Inside the R3F scene | 3D objects in Three.js scene | |
| You decide | Claude picks | |

**User's choice:** Canvas over webcam feed

---

| Option | Description | Selected |
|--------|-------------|----------|
| Colored dots + connectors | Classic MediaPipe style | |
| Minimal dots only | Just 21 dots, no lines | ✓ |
| Glowing/neon style | Dots with glow effect | |
| You decide | Claude picks | |

**User's choice:** Minimal dots only

---

| Option | Description | Selected |
|--------|-------------|----------|
| Highlight thumb+index | Change dot color on pinch | ✓ |
| Status text | "Pinching" label | |
| No extra cue | Model reaction is feedback | |
| You decide | Claude picks | |

**User's choice:** Highlight thumb+index

---

| Option | Description | Selected |
|--------|-------------|----------|
| Toggleable via UI button | Show/hide button, default visible | ✓ |
| Always visible | No toggle option | |
| You decide | Claude picks | |

**User's choice:** Toggleable via UI button

---

| Option | Description | Selected |
|--------|-------------|----------|
| Top-right corner | Hand icon with colored dot | ✓ |
| Bottom bar | Part of bottom controls | |
| Near the landmarks | Floating near detected hand | |
| You decide | Claude picks | |

**User's choice:** Top-right corner

---

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-start with camera | MediaPipe initializes with webcam | ✓ |
| Manual enable button | Separate button to start tracking | |
| You decide | Claude picks | |

**User's choice:** Auto-start with camera

---

| Option | Description | Selected |
|--------|-------------|----------|
| Two hands (Recommended) | Required for GEST-02 two-hand scale | ✓ |
| One hand first | Single hand, defer two-hand | |
| You decide | Claude picks | |

**User's choice:** Two hands

---

| Option | Description | Selected |
|--------|-------------|----------|
| Throttle to 30fps | Save GPU for Three.js | ✓ |
| Full frame rate | 60fps hand tracking | |
| You decide | Claude picks | |

**User's choice:** Throttle to 30fps

---

| Option | Description | Selected |
|--------|-------------|----------|
| Loading indicator + mouse only | Non-blocking WASM load | ✓ |
| Block until ready | Wait for WASM before app | |
| You decide | Claude picks | |

**User's choice:** Loading indicator + mouse only

---

## Pinch-to-Rotate Feel

| Option | Description | Selected |
|--------|-------------|----------|
| Direct mapping | 1:1 hand-to-rotation | |
| Trackball style | Virtual trackball around model | ✓ |
| Horizontal only | Y-axis rotation only | |
| You decide | Claude picks | |

**User's choice:** Trackball style

---

| Option | Description | Selected |
|--------|-------------|----------|
| Pinch distance = scale | Hands apart/together controls scale | ✓ |
| Pinch + spread fingers | Fingers spread on one hand | |
| You decide | Claude picks | |

**User's choice:** Pinch distance = scale

---

| Option | Description | Selected |
|--------|-------------|----------|
| Small dead zone (Recommended) | ~10px before rotation starts | ✓ |
| No dead zone | Immediate rotation | |
| You decide | Claude picks | |

**User's choice:** Small dead zone

---

| Option | Description | Selected |
|--------|-------------|----------|
| Smooth deceleration | Momentum after release | |
| Instant stop | Stop immediately | |
| You decide | Claude picks | ✓ |

**User's choice:** You decide (Claude's discretion)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Rotation + scale only | No panning via gesture | |
| Add panning gesture | Two-hand same-direction = pan | ✓ |
| You decide | Claude picks | |

**User's choice:** Add panning gesture

---

| Option | Description | Selected |
|--------|-------------|----------|
| Direction-based | Same direction = pan, apart/together = scale | ✓ |
| Dominant hand decides | One hand anchors, other decides | |
| You decide | Claude picks | |

**User's choice:** Direction-based

---

| Option | Description | Selected |
|--------|-------------|----------|
| Tight (0.03) | Very close threshold | |
| Standard (0.05) | MediaPipe recommended | ✓ |
| Loose (0.08) | Easy to trigger | |
| You decide | Claude picks | |

**User's choice:** Standard (0.05)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, via Leva | Debug panel for gesture tuning | ✓ |
| Hardcoded constants | Constants in code | |
| You decide | Claude picks | |

**User's choice:** Yes, via Leva

---

## Mouse & Gesture Coexistence

| Option | Description | Selected |
|--------|-------------|----------|
| Both active simultaneously | No mode switching | |
| Auto-switch on input | Gesture takes over when pinching | ✓ |
| Manual toggle | UI button to switch modes | |
| You decide | Claude picks | |

**User's choice:** Auto-switch on input

---

| Option | Description | Selected |
|--------|-------------|----------|
| OrbitControls (Recommended) | drei standard 3D controls | ✓ |
| TrackballControls | Free-axis rotation | |
| You decide | Claude picks | |

**User's choice:** OrbitControls

---

| Option | Description | Selected |
|--------|-------------|----------|
| Instant switch | Immediate re-enable | |
| Debounced (0.5s delay) | Wait before re-enabling mouse | ✓ |
| You decide | Claude picks | |

**User's choice:** Debounced (0.5s delay)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Show in status area | Display Mouse/Gesture label | |
| No indicator | Invisible switch | ✓ |
| You decide | Claude picks | |

**User's choice:** No indicator

---

## UI Controls Layout

| Option | Description | Selected |
|--------|-------------|----------|
| Floating toolbar (top) | Semi-transparent bar at top | |
| Side panel (right) | Collapsible right panel | |
| Bottom bar | Fixed bar at bottom | |
| Minimal floating buttons | Scattered edge buttons | |

**User's choice:** Semi-transparent horizontal bar at the bottom of the viewport
**Notes:** User specified bottom placement for the semi-transparent bar

---

| Option | Description | Selected |
|--------|-------------|----------|
| Always visible | Bar always shown | ✓ |
| Auto-hide on idle | Fades out after inactivity | |
| You decide | Claude picks | |

**User's choice:** Always visible

---

## Webcam Mirroring

| Option | Description | Selected |
|--------|-------------|----------|
| Mirrored (Recommended) | Selfie-style horizontal flip | ✓ |
| Non-mirrored | Raw camera feed | |
| You decide | Claude picks | |

**User's choice:** Mirrored

---

## Model Lighting & Environment

| Option | Description | Selected |
|--------|-------------|----------|
| HDRI environment map | Studio lighting with reflections | |
| Improved three-point lights | Fill + rim lights | |
| Keep current lighting | Ambient + directional | ✓ |
| You decide | Claude picks | |

**User's choice:** Keep current lighting

---

## Claude's Discretion

- Model momentum/inertia after releasing a pinch (smooth deceleration vs instant stop)

## Deferred Ideas

- Lighting upgrades (HDRI, environment maps) — deferred to Phase 4 polish

---

*Phase: 02-3D Models & Hand Tracking*
*Discussion date: 2026-05-24*
