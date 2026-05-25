# Phase 3: Educational Features - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-25
**Phase:** 3-Educational Features
**Areas discussed:** Model gallery, Body part label data, Layer toggle scope, Explode view mechanics

---

## Model Gallery

| Option | Description | Selected |
|--------|-------------|----------|
| Side drawer | Slides over canvas with semi-transparent backdrop | ✓ |
| Bottom sheet / toolbar row | Model icons inline in toolbar | |
| Modal / overlay grid | Centered modal with model grid | |

**User's choice:** Side drawer (overlay, canvas keeps running)

| Option | Description | Selected |
|--------|-------------|----------|
| Name + thumbnail | Pre-rendered PNG + name | ✓ |
| Name only | Text labels only | |
| Name + description | Name and short text, no thumbnail | |

**User's choice:** Name + thumbnail (pre-rendered PNG screenshots)

| Option | Description | Selected |
|--------|-------------|----------|
| Move Load file into drawer | Remove toolbar button, add drawer entry | ✓ |
| Keep in toolbar too | Two entry points | |

**User's choice:** Move Load file into drawer

| Option | Description | Selected |
|--------|-------------|----------|
| Overlay | Drawer over canvas, canvas keeps running | ✓ |
| Push layout | Canvas resizes to accommodate drawer | |

**User's choice:** Overlay — no resize/reflow logic needed

---

## Body Part Labels

| Option | Description | Selected |
|--------|-------------|----------|
| Name only | Prettified mesh name, no extra data | |
| Name + short description | JSON lookup file per mesh name | ✓ |
| Name + description + fun fact | Three fields per mesh | |

**User's choice:** Name + short description from `src/data/anatomyLabels.ts`

| Option | Description | Selected |
|--------|-------------|----------|
| JSON file in src/ | Static TS file, ships in bundle | ✓ |
| Embedded in GLB userData | Data in GLB extras fields | |
| Fetched from remote API | Runtime API call | |

**User's choice:** Static JSON/TS file

| Option | Description | Selected |
|--------|-------------|----------|
| Show mesh name only | Prettified raw name as fallback | ✓ |
| Show 'Unknown structure' | Placeholder message | |
| Don't show a label | Suppress label for unknown meshes | |

**User's choice:** Show prettified mesh name as fallback

| Option | Description | Selected |
|--------|-------------|----------|
| HTML overlay (drei Html) | Anchored to 3D mesh position, projects with model | ✓ |
| Fixed HUD label | Panel in corner, not spatially anchored | |

**User's choice:** drei `<Html>` anchored to mesh 3D position

---

## Layer Toggle Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Procedural skeleton only | Only named groups in SkeletonPreview | |
| Any model with named meshes | Auto-scan on load, generate toggles dynamically | ✓ |
| All models, always visible | Toggles always shown even if no effect | |

**User's choice:** Any model with named meshes (auto-scan on load)

| Option | Description | Selected |
|--------|-------------|----------|
| Existing named groups | skull, spine, ribcage, pelvis, arms, legs | ✓ |
| Higher-level categories | Head, Torso, Upper Limbs, Lower Limbs | |
| Claude decides | Let planner choose | |

**User's choice:** Use existing named groups as-is

| Option | Description | Selected |
|--------|-------------|----------|
| Bottom toolbar | Layers button expands chip row above toolbar | ✓ |
| Side panel | Separate panel surface | |
| Inside model drawer | Layers appear below selected model in drawer | |

**User's choice:** Bottom toolbar, expanding chip row

| Option | Description | Selected |
|--------|-------------|----------|
| All layers visible on load | Reset to all-on at every model switch | ✓ |
| Restore previous state | Apply previous model's layer state to new model | |

**User's choice:** All layers visible on load (reset on model switch)

---

## Explode View Mechanics

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle button | Binary on/off in toolbar | ✓ |
| Slider | Continuous explode amount | |

**User's choice:** Toggle button

| Option | Description | Selected |
|--------|-------------|----------|
| Any model with named mesh groups | Same scope as layers | ✓ |
| Procedural skeleton only | Simpler, known groups only | |

**User's choice:** Any model with named mesh groups

| Option | Description | Selected |
|--------|-------------|----------|
| Away from bounding box center | Auto-computed from groupCenter − modelCenter | ✓ |
| Predefined offsets per part | Hand-authored per mesh | |

**User's choice:** Automatic outward from bounding box center

| Option | Description | Selected |
|--------|-------------|----------|
| Animated (lerp) | ~0.5s smooth slide via useFrame | ✓ |
| Instant | Snap to exploded positions | |

**User's choice:** Animated lerp

---

## Explode Gesture & Inspect Mode

*User raised this during discussion — not in original gray area list.*

| Option | Description | Selected |
|--------|-------------|----------|
| Spread fingers triggers explode | Single-hand open = explode on | ✓ |
| Two-hand spread | Both hands apart triggers explode | |
| No gesture — toolbar only | Avoids gesture complexity | |

**User's choice:** Spread fingers = explode ON, fist = explode OFF

**Conflict noted:** Phase 4 (GEST-03) assigns spread fingers = zoom in, fist = zoom out in wave mode.

| Option | Description | Selected |
|--------|-------------|----------|
| Inspect mode (dedicated toggle) | Spread/fist only active in Inspect mode; wave mode unaffected | ✓ |
| Explode gesture overrides wave zoom | Spread always = explode | |
| Drop the gesture — toolbar only | Avoid conflict entirely | |

**User's choice:** Inspect mode toggle in toolbar gates the spread/fist → explode binding

| Option | Description | Selected |
|--------|-------------|----------|
| Button in bottom toolbar | Explicit Inspect toggle button | ✓ |
| Auto on body part selection | Inspect mode activates automatically | |

**User's choice:** Explicit toolbar button

| Option | Description | Selected |
|--------|-------------|----------|
| Only explode gesture activates in Inspect mode | Pinch+drag rotation unchanged | ✓ |
| Pinch+drag disabled in Inspect mode | Navigation locked during inspection | |
| Claude decides | Let executor choose | |

**User's choice:** Only the spread/fist gesture binding changes; everything else continues normally

---

## Claude's Discretion

- Exact explode multiplier/scale factor
- Animation easing curve (smooth deceleration preferred)
- Drawer slide direction and width
- Label bubble styling (background, typography, pin indicator)

## Deferred Ideas

None.
