# Technology Stack

**Project:** AR Anatomy Explorer
**Researched:** 2026-05-23

## Recommended Stack

### 3D Rendering Engine

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Three.js | ^0.170.0 (latest r170+) | 3D scene rendering, model loading, camera controls | Largest ecosystem (1.8M+ weekly npm downloads vs Babylon's 11K), lighter bundle (~150KB min), excellent glTF/GLB support via GLTFLoader, massive community = more Stack Overflow answers for a 1-week sprint. R3F wraps it declaratively for React. |
| @react-three/fiber | ^9.0.0 | React renderer for Three.js | Declarative 3D scene graph in JSX. Same pmndrs ecosystem as Zustand. Pairs with React 19. Eliminates imperative Three.js boilerplate -- critical for 1-week timeline. |
| @react-three/drei | ^9.0.0 | Helper components for R3F | OrbitControls, useGLTF loader, Html overlays, Environment lighting -- saves days of custom code. |

**Confidence:** HIGH -- Three.js + R3F is the dominant web 3D stack. Verified via npm downloads, GitHub stars, and ecosystem breadth.

### Hand Tracking

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @mediapipe/tasks-vision | ^0.10.35 | Hand landmark detection from webcam | Google's actively maintained hand tracking solution for web. Detects 21 hand landmarks per hand with x/y/z coordinates. Runs entirely client-side via WASM+WebGL. The newer `tasks-vision` API replaces the deprecated `@mediapipe/hands` package (last published 3 years ago). Supports both HandLandmarker (landmark positions) and GestureRecognizer (built-in gesture classification). |

**Confidence:** HIGH -- MediaPipe is the standard for browser-based hand tracking. No serious competitor exists at this quality level for web.

**Gesture Implementation Notes:**
- Pinch detection: Calculate 3D distance between thumb tip (landmark 4) and index fingertip (landmark 8). Distance < 0.05 = pinch.
- Open hand / fist: Count extended fingers using landmark y-coordinate comparisons.
- Two-hand tracking: Set `numHands: 2` in HandLandmarker config for two-hand pinch-to-scale.
- Frame rate: Use `VIDEO` running mode with `requestAnimationFrame` loop for real-time tracking.

### Webcam Access

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Native `navigator.mediaDevices.getUserMedia()` | Web API | Access webcam video stream | No library needed. Direct browser API gives a `<video>` element stream. MediaPipe's HandLandmarker accepts video elements directly. Adding react-webcam would be unnecessary abstraction -- you need the raw video element reference for both the background display and MediaPipe input. |

**Confidence:** HIGH -- Standard Web API, works in all target browsers and Tauri's webview.

### UI Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | ^19.0.0 | UI framework | Required by R3F. Mature ecosystem, TypeScript-first. React 19 is stable and R3F 9.x is built for it. |
| Vite | ^6.0.0 | Build tool and dev server | Fast HMR, first-class TypeScript support, official Tauri integration. Tauri docs recommend Vite specifically. |
| TypeScript | ^5.6.0 | Type safety | Project requirement. All recommended libraries have excellent TS support. |
| Tailwind CSS | ^4.0.0 | Utility-first styling | Fast UI development for panels, menus, overlays. v4 has zero-config setup with Vite. Ideal for 1-week timeline -- no CSS files to manage. |

**Confidence:** HIGH -- React + Vite + TypeScript is the standard modern frontend stack.

### State Management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Zustand | ^5.0.0 | Global state (selected model, gesture mode, layer visibility, UI state) | Tiny (1KB), zero boilerplate, same pmndrs team as R3F. Perfect for sharing state between 3D scene and UI panels. No context providers needed. |

**Confidence:** HIGH -- Zustand is the de facto state management for R3F projects. Same maintainers.

### Desktop Wrapper

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tauri | v2 (stable) | Desktop app wrapper | Project requirement. 10x smaller than Electron, uses OS native webview. Webcam access works via standard `getUserMedia()` in Tauri's webview -- permission prompt triggers automatically. On macOS needs Info.plist camera entry; on Windows works out of the box. |
| @tauri-apps/cli | ^2.0.0 | Tauri build tooling | CLI for dev server, building, and bundling desktop app. |
| @tauri-apps/api | ^2.0.0 | JS API for Tauri features | Window management, filesystem access if needed for model caching. |

**Confidence:** HIGH -- Tauri v2 is stable and production-ready. Webcam works via standard web APIs.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| leva | ^0.9.0 | Debug controls panel | Development only -- tune lighting, camera, gesture thresholds without code changes |
| @react-three/postprocessing | ^2.0.0 | Visual effects (bloom, SSAO) | Optional polish -- add after core features work. Bloom on selected body parts makes demos pop. |

**Confidence:** MEDIUM -- These are nice-to-haves. Include only if time permits in week 1.

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

**Recommendation:** Start with AnatomyTOOL models -- they are educational-grade and already in GLB format. Supplement with Sketchfab CC0 models for variety.

## Project Initialization

```bash
# Create Tauri + React + TypeScript project
pnpm create tauri-app@latest ar-anatomy-explorer --template react-ts

# Core 3D + hand tracking
pnpm add three @react-three/fiber @react-three/drei @mediapipe/tasks-vision zustand

# Styling
pnpm add tailwindcss @tailwindcss/vite

# Dev tools
pnpm add -D @types/three leva

# Tauri APIs (if needed for window/filesystem)
pnpm add @tauri-apps/api
```

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
