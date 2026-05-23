# Project Research Summary

**Project:** AR Anatomy Explorer
**Domain:** Web-based AR anatomy education with hand gesture interaction
**Researched:** 2026-05-23
**Confidence:** HIGH

## Executive Summary

AR Anatomy Explorer is a client-side web application that overlays interactive 3D anatomical models on a live webcam feed, controlled via hand gestures tracked by MediaPipe. The established way to build this is a layered DOM compositing approach: an HTML video element as the background, a transparent Three.js/R3F canvas for 3D rendering, and standard React DOM for the UI. This avoids the common trap of rendering the webcam as a Three.js texture, which burns GPU cycles and halves frame rates. The entire stack (React 19 + Vite + R3F + MediaPipe + Zustand + Tauri v2) is mature, well-documented, and all libraries are actively maintained with strong TypeScript support.

The recommended approach is to build two independent pipelines first -- the 3D model viewer with mouse controls and the hand tracking system with gesture classification -- then integrate them through a shared command interface. This decoupled architecture is the single most important design decision: it enables parallel development, testability without a camera, and graceful fallback to mouse input. The GestureInterpreter abstraction layer translates raw MediaPipe landmarks into semantic commands (rotate, scale, select) that the scene controller consumes identically regardless of input source.

The primary risks are performance degradation from three GPU-competing systems (webcam + MediaPipe + Three.js), hand tracking jitter making gestures unusable, and scope creep on a 1-week timeline. All three have well-known mitigations: DOM layer stacking instead of VideoTexture, rolling-average smoothing with gesture state machines using hysteresis, and a strict MVP definition (webcam + one model + pinch gesture + mouse fallback). The Tauri webcam permission issue on Windows is a demo-killer that must be addressed with a pre-permission screen on day one.

## Key Findings

### Recommended Stack

The stack centers on the pmndrs ecosystem (React Three Fiber, Drei, Zustand) which shares maintainers and is designed to work together. MediaPipe tasks-vision is the only serious option for browser-based hand tracking. Tauri v2 wraps the web app with minimal overhead. See `.planning/research/STACK.md` for full rationale and alternatives considered.

**Core technologies:**
- **Three.js + R3F + Drei**: 3D rendering with declarative React API -- largest ecosystem (1.8M+ weekly npm downloads), eliminates imperative boilerplate
- **@mediapipe/tasks-vision**: Hand landmark detection -- 21 landmarks per hand, runs client-side via WASM+WebGL, no competitor at this quality level for web
- **React 19 + Vite 6 + TypeScript**: UI framework and build tooling -- required by R3F, fast HMR, official Tauri integration
- **Zustand 5**: State management -- 1KB, zero boilerplate, same maintainers as R3F
- **Tauri v2**: Desktop wrapper -- project requirement, uses OS native webview, webcam works via standard getUserMedia
- **Tailwind CSS v4**: Styling -- zero-config with Vite, fastest option for rapid UI development

### Expected Features

See `.planning/research/FEATURES.md` for full competitive analysis against Visible Body, BioDigital, Zygote Body, and Complete Anatomy.

**Must have (table stakes):**
- 3D model rotate/zoom/pan with mouse/keyboard
- Webcam feed as live background (this IS the product)
- Body system layer toggles (skeletal, muscular, nervous, etc.)
- Structure labels on tap/click
- Model gallery to browse available models
- Smooth 60fps rendering
- Mouse/keyboard fallback controls (hand tracking will fail sometimes)

**Should have (differentiators):**
- Hand gesture control via webcam without headset -- genuinely novel for a web app, no competitor does this
- Dual gesture modes (pinch+drag precision vs. open hand casual)
- Explode view combined with gesture control
- Tauri desktop app from same codebase

**Defer (v2+):**
- Quiz/assessment mode, annotation tools, user accounts, comprehensive model library (thousands of structures), AI identification, multi-user/collaborative, mobile support, pathology models, voice commands

### Architecture Approach

The application uses DOM layer stacking (video at z:0, transparent R3F canvas at z:1, React UI at z:2) with a unidirectional data pipeline from webcam input through gesture classification to 3D scene manipulation. The critical architectural pattern is the Input Abstraction Layer: a GestureCommand interface that decouples MediaPipe output from Three.js transforms, enabling both gesture and mouse input through the same contract. Hand tracking runs at ~30fps independently while Three.js renders at 60fps, with interpolation preventing jitter. See `.planning/research/ARCHITECTURE.md` for component boundaries, data flow diagrams, and file structure.

**Major components:**
1. **WebcamProvider** -- getUserMedia lifecycle, shares video element with both display layer and hand tracker
2. **HandTracker + GestureInterpreter** -- MediaPipe detection loop producing raw landmarks, classified into semantic gesture commands (rotate/scale/select/idle)
3. **SceneController + ModelManager** -- Translates gesture commands into 3D transforms, manages model loading/caching/layer visibility
4. **R3F Scene** -- Three.js transparent canvas rendering anatomy models with proper lighting
5. **UIOverlay** -- Gallery, layer toggles, mode switcher, labels, gesture feedback indicator

### Critical Pitfalls

See `.planning/research/PITFALLS.md` for all 13 pitfalls with detailed prevention strategies.

1. **GPU/CPU resource war** -- Webcam + MediaPipe + Three.js competing for GPU halves frame rates. Prevent by using HTML video element behind transparent canvas (not VideoTexture), constraining webcam to 640x480@30fps, throttling MediaPipe if needed.
2. **Tauri webcam permission is a one-way door** -- Clicking "Block" on Windows permanently blocks the camera with no re-prompt. Prevent with a pre-permission explanation screen and explicit "Start Camera" button. Consider browser as primary demo target.
3. **Hand tracking jitter** -- Raw landmarks jump several pixels between frames, causing model vibration. Prevent with 5-frame rolling average, gesture hysteresis (different thresholds for start vs. stop), and movement dead zones.
4. **Anatomy models too large for web** -- Raw models can be 50-200MB. Prevent by enforcing 5MB-per-model budget, using Draco compression and KTX2 textures, decimating polygons. Optimize BEFORE integration.
5. **Gesture conflicts** -- Every hand movement triggers something because there is no "mouse up" equivalent. Prevent with explicit idle state, 300ms activation delay, cooldown after mode switches, and visual gesture indicator.

## Implications for Roadmap

Based on combined research, the architecture has a clear dependency graph that dictates phase ordering. Phases 2 and 3 below can be developed in parallel, which is the key scheduling insight.

### Phase 1: Foundation -- Project Setup and AR Canvas

**Rationale:** Everything depends on the webcam+canvas layering and Tauri configuration. Getting this wrong forces a rewrite. Both ARCHITECTURE.md and PITFALLS.md identify this as the critical foundation.
**Delivers:** Tauri project scaffolded with Vite+React+TypeScript, webcam video displayed as background, transparent R3F canvas overlay rendering a test cube, pre-permission screen for camera access, Tauri running with correct CSP and camera permissions.
**Addresses:** Webcam feed as background, smooth rendering, Tauri desktop app setup
**Avoids:** Pitfall 1 (VideoTexture GPU waste), Pitfall 2 (Tauri permission one-way door), Pitfall 6 (permission on page load), Pitfall 10 (browser-only development)

### Phase 2: 3D Model Pipeline

**Rationale:** The 3D viewer with mouse controls is independently valuable and provides the fallback interaction path. Model optimization must happen before gallery features. Can be built in parallel with Phase 3.
**Delivers:** GLTFLoader loading optimized anatomy models, mouse/keyboard orbit controls, proper lighting setup, model catalog with 3-5 models, loading progress indicator.
**Addresses:** 3D model rendering, mouse/keyboard controls, model gallery foundation
**Avoids:** Pitfall 4 (oversized models), Pitfall 11 (flat lighting)

### Phase 3: Hand Tracking and Gesture System

**Rationale:** Can be developed independently of the 3D model pipeline using the test cube from Phase 1. The GestureInterpreter is the most architecturally significant custom component. Can be built in parallel with Phase 2.
**Delivers:** MediaPipe HandLandmarker running, GestureInterpreter classifying pinch/drag/idle, gesture command interface defined, smoothing and hysteresis implemented, debug overlay showing detected gestures.
**Addresses:** Hand tracking, pinch+drag gesture mode, gesture command abstraction
**Avoids:** Pitfall 3 (jitter), Pitfall 5 (gesture conflicts), Pitfall 12 (WASM bundling)

### Phase 4: Integration -- Gesture-Driven 3D Interaction

**Rationale:** Merges the two parallel workstreams through the GestureCommand interface. This produces the hero demo moment: pinch the air, watch the anatomy model rotate.
**Delivers:** SceneController wiring gesture commands to 3D transforms, gesture input driving model rotation/scale, mouse and gesture input unified through same interface, basic gesture feedback indicator.
**Addresses:** Connecting hand tracking to model manipulation, the core "wow moment"
**Avoids:** Anti-pattern 3 (raw landmarks as input)

### Phase 5: Educational Features

**Rationale:** All additive features that build on the integrated core. Each is independent and can be cut if time runs short. Priority order: layer toggles > labels > gallery UI > explode view.
**Delivers:** Layer toggle (show/hide body systems), labels on click with leader lines, model gallery/browser UI, explode view with animated transitions.
**Addresses:** Layer toggles, labels, model gallery, explode view
**Avoids:** Pitfall 8 (jarring transitions), Pitfall 9 (overlapping labels)

### Phase 6: Polish, Second Gesture Mode, and Demo Prep

**Rationale:** Only attempt after core is solid. The second gesture mode (open hand wave) is explicitly the lowest priority feature. Demo preparation is essential for a capstone.
**Delivers:** Open hand wave gesture mode + mode toggle, gesture tutorial/help overlay, final Tauri packaging, demo script and rehearsal.
**Addresses:** Dual gesture modes, Tauri packaging, demo readiness
**Avoids:** Pitfall 13 (too many half-finished features)

### Phase Ordering Rationale

- Phase 1 first because DOM layer stacking architecture and Tauri config are one-way decisions that force rewrites if wrong
- Phases 2 and 3 can run in parallel because the Input Abstraction Layer (GestureCommand interface) defines their contract before they merge
- Phase 4 is the integration point and produces the demo-worthy milestone
- Phase 5 features are all additive and independently droppable -- ordered by educational value
- Phase 6 is explicitly stretch goals plus essential demo prep -- cut the second gesture mode before cutting demo rehearsal time
- Budget recommendation from PITFALLS.md: 3 days for Phases 1-4, 2 days for Phase 5, 1 day for Phase 6

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3 (Hand Tracking + Gestures):** MediaPipe WASM bundling in Tauri needs validation. Smoothing algorithm parameters (rolling average window size, hysteresis thresholds) need tuning with real hardware. The gesture state machine design is the most novel code in the project.
- **Phase 5 (Labels):** CSS2DRenderer vs. Drei Html component -- need to verify which integrates better with R3F's render loop. Label collision avoidance algorithm needs research.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Tauri+Vite+React scaffolding is well-documented with official templates. getUserMedia is a standard Web API.
- **Phase 2 (3D Models):** R3F model loading with useGLTF is extensively documented. Drei's OrbitControls is drop-in.
- **Phase 4 (Integration):** Straightforward wiring once the command interface is defined. Standard React state/ref patterns.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies are market leaders with official docs, active maintenance, and large communities. Verified via npm downloads and GitHub activity. |
| Features | HIGH | Competitive analysis against 6+ named competitors. Clear differentiation from Visible Body, BioDigital, Zygote Body, Complete Anatomy. Feature priorities well-grounded. |
| Architecture | HIGH | DOM layer stacking and dual-loop patterns are well-documented with multiple tutorials and reference implementations (Codrops tutorial, threejs-handtracking-101 repo). |
| Pitfalls | HIGH | Every pitfall sourced from real developer experiences, GitHub issues, and forum discussions. Performance pitfall backed by Three.js issue tracker data. |

**Overall confidence:** HIGH

### Gaps to Address

- **Model asset quality is unknown:** Layer toggles, labels, and explode view all depend on models having properly named/grouped mesh hierarchies. AnatomyTOOL models need to be downloaded and inspected before committing to the feature set. If models are single-mesh blobs, layer toggling degrades significantly.
- **MediaPipe WASM in Tauri:** While getUserMedia works in Tauri's webview, MediaPipe's WASM loading via Tauri's asset protocol has not been explicitly validated. Test this in Phase 1, not Phase 3.
- **Gesture tuning constants:** Pinch threshold (~0.05), dead zone size (~3px), smoothing window (5 frames), hysteresis gap (30px start / 45px end) are starting values from community recommendations. They will need tuning on the actual demo hardware.
- **Windows-specific Tauri behavior:** Development is on Windows. WebView2 permission persistence and CSP behavior may differ from macOS documentation. Test early.

## Sources

### Primary (HIGH confidence)
- [MediaPipe Hand Landmarker Web Guide](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js)
- [React Three Fiber docs](https://r3f.docs.pmnd.rs/)
- [Tauri v2 official docs](https://v2.tauri.app/)
- [Three.js documentation and releases](https://threejs.org/docs/)
- [Zustand v5 docs](https://zustand.docs.pmnd.rs/)
- [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

### Secondary (MEDIUM confidence)
- [Three.js + MediaPipe hand tracking tutorial (Codrops)](https://tympanus.net/codrops/2024/10/24/creating-a-3d-hand-controller-using-a-webcam-with-mediapipe-and-three-js/)
- [R3F anatomy model tutorial (WellAlly)](https://www.wellally.tech/blog/react-three-fiber-3d-anatomy-model-fitness-app)
- [3D Optimization: 26MB to 560KB (Echobind)](https://echobind.com/post/3D-Optimization-for-Web-26mb-down-to-560kb)
- [Visible Body vs BioDigital comparison](https://www.visiblebody.com/blog/how-does-visible-body-courseware-compare-with-the-biodigital-human)
- [Combating False Positives in Gesture Recognition](https://medium.com/@leeor.langer/combating-false-positives-in-gesture-recognition-e727932b41b1)

### Tertiary (LOW confidence)
- [Tauri camera permission issue #5042](https://github.com/tauri-apps/tauri/issues/5042) -- Windows-specific, may be resolved in Tauri v2
- [MediaPipe jitter smoothing issue #3354](https://github.com/google/mediapipe/issues/3354) -- community workarounds, not official guidance

---
*Research completed: 2026-05-23*
*Ready for roadmap: yes*
