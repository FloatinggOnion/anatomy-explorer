<!-- GSD:project-start source:PROJECT.md -->
## Project

**AR Anatomy Explorer**

A web-based anatomy education app that uses the device webcam as a live background and overlays interactive 3D anatomical models in a defined viewport area. Users manipulate models with hand gestures tracked via the webcam — rotating, scaling, and inspecting anatomy in real-time. The app runs in-browser and as a Tauri desktop app from the same codebase. Built as a final-year capstone project that doubles as a usable student learning tool and portfolio piece.

**Core Value:** Users can see, rotate, and inspect 3D anatomy models using their hands in front of a webcam — making anatomy tangible without physical specimens.

### Constraints

- **Timeline**: Under 1 week — must ship fast
- **Package manager**: pnpm only (no npm) if using TypeScript ecosystem
- **Desktop wrapper**: Tauri over Electron — smaller footprint
- **Tech stack**: No assumptions — research the best tools for the job
- **Platform**: Web browser (Chrome/Firefox) + Tauri desktop, same codebase
- **Assets**: Free/open 3D anatomy models only
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### 3D Rendering Engine
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Three.js | ^0.170.0 (latest r170+) | 3D scene rendering, model loading, camera controls | Largest ecosystem (1.8M+ weekly npm downloads vs Babylon's 11K), lighter bundle (~150KB min), excellent glTF/GLB support via GLTFLoader, massive community = more Stack Overflow answers for a 1-week sprint. R3F wraps it declaratively for React. |
| @react-three/fiber | ^9.0.0 | React renderer for Three.js | Declarative 3D scene graph in JSX. Same pmndrs ecosystem as Zustand. Pairs with React 19. Eliminates imperative Three.js boilerplate -- critical for 1-week timeline. |
| @react-three/drei | ^9.0.0 | Helper components for R3F | OrbitControls, useGLTF loader, Html overlays, Environment lighting -- saves days of custom code. |
### Hand Tracking
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @mediapipe/tasks-vision | ^0.10.35 | Hand landmark detection from webcam | Google's actively maintained hand tracking solution for web. Detects 21 hand landmarks per hand with x/y/z coordinates. Runs entirely client-side via WASM+WebGL. The newer `tasks-vision` API replaces the deprecated `@mediapipe/hands` package (last published 3 years ago). Supports both HandLandmarker (landmark positions) and GestureRecognizer (built-in gesture classification). |
- Pinch detection: Calculate 3D distance between thumb tip (landmark 4) and index fingertip (landmark 8). Distance < 0.05 = pinch.
- Open hand / fist: Count extended fingers using landmark y-coordinate comparisons.
- Two-hand tracking: Set `numHands: 2` in HandLandmarker config for two-hand pinch-to-scale.
- Frame rate: Use `VIDEO` running mode with `requestAnimationFrame` loop for real-time tracking.
### Webcam Access
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Native `navigator.mediaDevices.getUserMedia()` | Web API | Access webcam video stream | No library needed. Direct browser API gives a `<video>` element stream. MediaPipe's HandLandmarker accepts video elements directly. Adding react-webcam would be unnecessary abstraction -- you need the raw video element reference for both the background display and MediaPipe input. |
### UI Framework
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | ^19.0.0 | UI framework | Required by R3F. Mature ecosystem, TypeScript-first. React 19 is stable and R3F 9.x is built for it. |
| Vite | ^6.0.0 | Build tool and dev server | Fast HMR, first-class TypeScript support, official Tauri integration. Tauri docs recommend Vite specifically. |
| TypeScript | ^5.6.0 | Type safety | Project requirement. All recommended libraries have excellent TS support. |
| Tailwind CSS | ^4.0.0 | Utility-first styling | Fast UI development for panels, menus, overlays. v4 has zero-config setup with Vite. Ideal for 1-week timeline -- no CSS files to manage. |
### State Management
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zustand | ^5.0.0 | Global state (selected model, gesture mode, layer visibility, UI state) | Tiny (1KB), zero boilerplate, same pmndrs team as R3F. Perfect for sharing state between 3D scene and UI panels. No context providers needed. |
### Desktop Wrapper
| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tauri | v2 (stable) | Desktop app wrapper | Project requirement. 10x smaller than Electron, uses OS native webview. Webcam access works via standard `getUserMedia()` in Tauri's webview -- permission prompt triggers automatically. On macOS needs Info.plist camera entry; on Windows works out of the box. |
| @tauri-apps/cli | ^2.0.0 | Tauri build tooling | CLI for dev server, building, and bundling desktop app. |
| @tauri-apps/api | ^2.0.0 | JS API for Tauri features | Window management, filesystem access if needed for model caching. |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| leva | ^0.9.0 | Debug controls panel | Development only -- tune lighting, camera, gesture thresholds without code changes |
| @react-three/postprocessing | ^2.0.0 | Visual effects (bloom, SSAO) | Optional polish -- add after core features work. Bloom on selected body parts makes demos pop. |
## Alternatives Considered
| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| 3D Engine | Three.js (via R3F) | Babylon.js | Babylon is more batteries-included but has 160x fewer npm downloads. Smaller community = fewer answers when stuck. Heavier bundle. R3F's declarative model is faster to build with in React. |
| 3D Engine | Three.js (via R3F) | Raw Three.js (imperative) | Imperative Three.js requires managing scene lifecycle manually. R3F handles mount/unmount, resize, render loop automatically. 1-week timeline demands R3F's productivity. |
| Hand Tracking | MediaPipe tasks-vision | TensorFlow.js HandPose | TF.js HandPose model is older, less accurate, heavier bundle. MediaPipe is Google's current recommended solution and runs faster via WASM. |
| Hand Tracking | MediaPipe tasks-vision | @mediapipe/hands | Deprecated. Last published 3 years ago. tasks-vision is the replacement. |
| Webcam | Native getUserMedia | react-webcam | Adds unnecessary dependency. We need the raw video element for MediaPipe anyway. react-webcam's abstractions get in the way. |
| State | Zustand | Redux Toolkit | Massive overkill for this app's state complexity. Zustand does the same job in 1/10th the code. |
| State | Zustand | Jotai | Jotai is atomic (bottom-up) -- better for forms. Zustand's single-store model maps better to "current model, current mode, current layers" pattern. |
| Desktop | Tauri v2 | Electron | Project requirement to use Tauri. Also: Electron bundles Chromium (~150MB), Tauri uses OS webview (~600KB). |
| Build | Vite | Webpack | Slower dev server, more config. Vite is Tauri's recommended build tool. |
| CSS | Tailwind CSS v4 | CSS Modules / styled-components | Slower development velocity. Tailwind's utility classes are fastest for rapid UI. |
## 3D Model Assets
| Source | License | Format | Notes |
|--------|---------|--------|-------|
| AnatomyTOOL (Open3DModel) | GPL3 | GLB | Purpose-built anatomy education models. Download .glb directly. |
| Sketchfab | CC-BY / CC0 (filter) | glTF/GLB | Large selection. Filter by "downloadable" and Creative Commons. |
| TurboSquid | Free tier | glTF/GLB | 600+ free glTF models. Quality varies. |
## Project Initialization
# Create Tauri + React + TypeScript project
# Core 3D + hand tracking
# Styling
# Dev tools
# Tauri APIs (if needed for window/filesystem)
## Architecture Implications
- **Single codebase:** React app served by Vite in dev, bundled by Tauri for desktop. No conditional code needed -- same `getUserMedia()` works in both.
- **No backend:** All processing client-side. Models loaded from static assets or fetched from CDN.
- **Performance budget:** MediaPipe hand tracking + Three.js rendering both compete for GPU. Use `requestAnimationFrame` for both but throttle MediaPipe to 30fps if frame drops occur. Three.js can run at 60fps independently.
- **Bundle size:** Three.js tree-shakes well via R3F. MediaPipe loads WASM models on demand (~5MB runtime download, not in bundle). Total JS bundle should be under 500KB gzipped.
## Sources
- [Three.js releases](https://github.com/mrdoob/three.js/releases) -- version history
- [React Three Fiber docs](https://r3f.docs.pmnd.rs/) -- R3F 9.x documentation
- [MediaPipe Hand Landmarker Web Guide](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js) -- official Google docs
- [MediaPipe Gesture Recognizer Web Guide](https://developers.google.com/mediapipe/solutions/vision/gesture_recognizer/web_js) -- gesture classification
- [@mediapipe/tasks-vision on npm](https://www.npmjs.com/package/@mediapipe/tasks-vision) -- v0.10.35
- [Tauri v2 official docs](https://v2.tauri.app/) -- stable release
- [Tauri + Vite setup guide](https://v2.tauri.app/start/frontend/vite/) -- official integration
- [Zustand docs](https://zustand.docs.pmnd.rs/) -- v5 guide
- [Three.js vs Babylon.js comparison](https://blog.logrocket.com/three-js-vs-babylon-js/) -- ecosystem analysis
- [AnatomyTOOL Open3DModel](https://anatomytool.org/open3dmodel-create) -- free anatomy models
- [React Three Fiber anatomy model tutorial](https://www.wellally.tech/blog/react-three-fiber-3d-anatomy-model-fitness-app) -- R3F anatomy use case
- [Tauri webcam discussion](https://github.com/tauri-apps/tauri/discussions/7615) -- camera permissions in Tauri
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->



<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
