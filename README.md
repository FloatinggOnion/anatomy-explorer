# AR Anatomy Explorer

A web-based and desktop anatomy education app that uses your device webcam as a live background and overlays interactive 3D anatomical models. Users manipulate models with mouse or hand gestures, rotating, scaling, and inspecting anatomy in real-time.

## Project Overview

**Core Value:** Learn anatomy by seeing, rotating, and inspecting 3D models using your hands in front of a webcam — making anatomy tangible without physical specimens.

**Platforms:**
- Web: Chrome, Firefox (via Vite dev server or static bundle)
- Desktop: Tauri app (Windows, macOS, Linux)

**Tech Stack:**
- **Frontend:** React 19, Vite, Tailwind CSS
- **3D Rendering:** Three.js via @react-three/fiber
- **State Management:** Zustand
- **Hand Tracking:** MediaPipe tasks-vision (Phase 2)
- **Desktop Wrapper:** Tauri v2
- **Package Manager:** pnpm

## Quick Start

### Prerequisites

- **pnpm** (required; no npm)
  ```bash
  npm install -g pnpm
  ```
- **Node.js** 18+
- **Rust** (for Tauri builds; installed via rustup)

### Web Development

Run the Vite dev server:

```bash
pnpm install   # First time only
pnpm dev
```

Then open your browser to **http://localhost:5173**

You should see:
1. Pre-permission screen with "Start Camera" button
2. Click button → browser asks for camera permission
3. Grant permission → live webcam feed appears
4. 3D skeleton model visible and auto-rotating in center
5. Click model → rotation pauses

### Web Production Build

```bash
pnpm build
```

Outputs optimized bundle to `dist/` folder (can be hosted on any static server).

### Tauri Desktop Development

Run the Tauri dev server (includes Vite in background):

```bash
pnpm tauri dev
```

A window titled "AR Anatomy Explorer" (1200×800) will launch with the same UI as web.

**Note:** This will prompt for camera permission on Windows (OS-level, not browser). Permission must be re-granted each app launch (unlike web browsers).

### Tauri Production Build

Build a distributable app (installer):

```bash
pnpm tauri build
```

Outputs to `src-tauri/target/release/bundle/`:
- **Windows:** `.msi` installer
- **macOS:** `.dmg` app bundle
- **Linux:** AppImage or deb package (depending on OS)

**Build time:** 1-2 minutes on first build, faster on subsequent builds.

## Architecture

### Single Codebase, Multiple Targets

- **`src/`** — React components (identical on web and Tauri)
- **`src-tauri/`** — Rust webview wrapper (only for desktop)
- **`dist/`** — Built output (used by both web and Tauri in production)

No platform-specific code in `src/`. Both web and Tauri use:
- Native `navigator.mediaDevices.getUserMedia()` for webcam
- Native WebGL for 3D rendering
- Same React component tree

### Layer Stacking

```
z:10  — UI overlays (menus, panels, etc.)
z:1   — R3F Canvas (3D skeleton model)
z:0   — Video background (webcam or checkerboard)
```

Configured in `src/index.css` and `src/components/WebcamProvider.tsx`.

## Features (Phase 1)

✓ Live webcam feed as background
✓ Pre-permission screen (explains camera access need upfront)
✓ 3D skeleton model with auto-rotation animation
✓ Click-to-pause skeleton rotation
✓ Mouse-only fallback (works even if camera denied)
✓ Checkerboard pattern fallback when camera unavailable
✓ Cross-browser support (Chrome, Firefox)
✓ Tauri desktop app (Windows, macOS, Linux)
✓ Smooth 60 FPS rendering
✓ Permission state persistence (web browsers)

## Testing

See **TESTING.md** for detailed manual test procedures covering:
- Chrome and Firefox web testing
- Tauri desktop app testing
- Permission grant/deny scenarios
- Performance benchmarks
- Known platform-specific behaviors

Quick test checklist:
- [ ] `pnpm dev` → Chrome → grant camera → see video + skeleton
- [ ] `pnpm dev` → Firefox → grant camera → see video + skeleton
- [ ] `pnpm tauri dev` → grant camera → see video + skeleton in window
- [ ] Deny camera → all platforms show checkerboard, skeleton still interactive

## Platform-Specific Notes

See **PLATFORM-NOTES.md** for detailed information on:
- Build configuration (web vs Tauri)
- CSP headers and WASM support
- Permission flow differences (browsers vs Windows)
- Debugging approaches per platform
- Performance characteristics
- Phase 2 readiness (hand tracking)

## Key Decisions (Phase 1)

1. **Single codebase:** No branching in React code; conditional imports only for Tauri APIs (not in Phase 1)
2. **Pre-permission screen:** Mitigates Windows WebView2 one-way door issue
3. **Minimal skeleton.glb:** Test geometry; real anatomy models deferred to Phase 2
4. **R3F over raw Three.js:** Declarative API faster for 1-week sprint
5. **Tailwind CSS:** Rapid UI development (zero-config with Vite)
6. **Zustand:** Minimal boilerplate state management

## Known Limitations

- **Windows WebView2 permissions:** Once denied, user must re-enable in Windows Settings (not in app)
- **CSP enforcement:** Tauri enforces strict CSP; only Vite-bundled scripts allowed (no external CDN)
- **Bundle size:** ~1.1MB JS (gzipped 308KB); monitor in Phase 4 polish
- **macOS Tauri:** Requires Xcode command-line tools; builds less frequently than Windows/Linux

## Next Steps (Phase 2)

- [ ] Integrate MediaPipe hand tracking (@mediapipe/tasks-vision)
- [ ] Implement hand gesture recognition (pinch, open hand, etc.)
- [ ] Source real anatomical GLB models
- [ ] Add layer visibility toggles (show/hide organs)
- [ ] Add gesture-based rotation/scaling
- [ ] Performance tuning if FPS drops

## Useful Commands

```bash
# Development
pnpm dev                    # Start web dev server
pnpm tauri dev             # Start Tauri dev app

# Building
pnpm build                  # Build web for production
pnpm tauri build           # Build Tauri app (creates installer)

# Code quality
pnpm tsc --noEmit         # Type-check without emitting
pnpm tauri info           # Show Tauri environment info

# Cleanup
rm -rf dist                # Remove web build
rm -rf src-tauri/target    # Remove Tauri build artifacts
pnpm install              # Re-install dependencies (if lock file changed)
```

## Troubleshooting

### `pnpm dev` fails to start
- **Cause:** Port 5173 already in use
- **Fix:** Kill process on port 5173 or change Vite port in `vite.config.ts`

### `pnpm tauri dev` fails with Rust error
- **Cause:** Rust toolchain not installed or version mismatch
- **Fix:** `rustup update` or `rustup install stable`

### Camera permission not working
- **Web:** Check browser privacy settings (Settings > Privacy > Camera)
- **Tauri:** Check Windows Settings > Privacy & security > Camera
- **Fallback:** Even if denied, app works in mouse-only mode (checkerboard background)

### CSP errors in console
- **Cause:** Code trying to load external resources
- **Fix:** Check `src-tauri/tauri.conf.json` CSP rules; bundle external assets with app

### Performance (FPS < 30)
- **Cause:** Complex 3D model or slow device
- **Fix:** Reduce model complexity; throttle animation frame rate
- **Phase 4:** Profile and optimize bundle size

## Project Structure

```
ar-project/
├── src/                          # React source code (platform-agnostic)
│   ├── components/
│   │   ├── Canvas.tsx            # R3F canvas wrapper
│   │   ├── SkeletonPreview.tsx   # 3D skeleton model
│   │   ├── WebcamProvider.tsx    # Webcam input + video element
│   │   └── PrePermissionScreen.tsx # Pre-permission UI
│   ├── hooks/
│   │   ├── useWebcam.ts          # Camera access lifecycle
│   │   └── useSkeletonAnimation.ts # Rotation state
│   ├── store/
│   │   └── appState.ts           # Zustand permission state
│   ├── App.tsx                   # Root component
│   └── main.tsx                  # Entry point
│
├── src-tauri/                    # Rust Tauri app
│   ├── src/
│   │   └── main.rs               # Tauri window setup
│   ├── tauri.conf.json           # Tauri config (CSP, permissions, build)
│   ├── Cargo.toml                # Rust dependencies
│   └── capabilities/
│       └── default.json          # Tauri permissions (v2)
│
├── public/                       # Static assets
│   └── models/
│       └── skeleton.glb          # 3D skeleton model
│
├── dist/                         # Built output (created by `pnpm build`)
├── TESTING.md                    # Manual test procedures
├── PLATFORM-NOTES.md             # Platform differences reference
├── package.json                  # Node.js dependencies
├── tsconfig.json                 # TypeScript config
└── vite.config.ts                # Vite build config
```

## IDE Setup

### VS Code

Recommended extensions:
- **Tauri** (official Tauri VSCode extension)
- **rust-analyzer** (Rust language support)
- **Prettier** (code formatting)
- **ESLint** (JavaScript linting, if configured)

### WebStorm / IntelliJ

Native Tauri/Rust support included. Just open `src-tauri/` as a project module.

## Resources

- [Tauri v2 Official Docs](https://v2.tauri.app/)
- [React Three Fiber](https://r3f.docs.pmnd.rs/)
- [Three.js Documentation](https://threejs.org/docs/)
- [Vite Guide](https://vitejs.dev/)
- [Zustand Store](https://zustand.docs.pmnd.rs/)
- [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/)

## Contributing

This is a capstone project. For questions or contributions:
1. Check existing issues/discussions
2. Test across all platforms before submitting changes
3. Update TESTING.md if test procedures change

## License

(Add license here once determined)

---

**Phase 1 Status:** ✓ Complete (Webcam + 3D Canvas + Cross-platform builds)
**Current Phase:** 02 (Hand Tracking & Gesture Recognition)

For detailed execution history, see `.planning/phases/01-ar-canvas-platform-foundation/`
