# Platform-Specific Notes

This document explains platform differences, conditional code paths, and architecture decisions for cross-platform deployment.

## Architecture Overview

The AR Anatomy Explorer runs on **two platforms from a single React codebase:**

1. **Web browsers** (Chrome, Firefox) via Vite dev server or bundled HTML
2. **Tauri desktop app** (Windows, macOS, Linux) via Rust webview wrapper

**Key principle:** No platform-specific branching in React code. Both use identical `src/` components. Conditional imports (if needed) use compile-time `__TAURI_CORE__` detection, never at runtime.

## Code Paths

### React Code (`src/`)

All React components are platform-agnostic:
- `src/components/WebcamProvider.tsx` — Uses standard `navigator.mediaDevices.getUserMedia()`
- `src/components/SkeletonPreview.tsx` — Uses standard Three.js/WebGL APIs
- `src/components/Canvas.tsx` — Uses @react-three/fiber (platform-agnostic)
- `src/App.tsx` — No platform detection or conditional rendering

**Why:** `getUserMedia()` and WebGL work identically in Tauri webview and modern browsers. No special handling needed.

### Tauri Integration (`src-tauri/`)

Rust-side code handles platform differences:
- `src-tauri/src/main.rs` — Window setup, app lifecycle
- `src-tauri/tauri.conf.json` — Build config, CSP, permissions

**When would we need Tauri APIs in React?**
- Future: File storage for model cache (Phase 2?)
- Future: Window controls, custom menu bar (Phase 3?)
- **Phase 1:** We don't use any Tauri APIs — pure web-standard APIs

## Build Configuration

### Web Build (Vite)

```bash
pnpm build
```

- Entry point: `src/main.tsx`
- Output: `dist/` folder
- Result: Static HTML/JS/CSS bundle
- Can be served from any HTTP server or opened locally

**Dev server:**
```bash
pnpm dev
```
- Runs on `http://localhost:5173`
- Hot module reload (HMR) enabled
- TypeScript transpiled on-the-fly

### Tauri Build

**Development mode:**
```bash
pnpm tauri dev
```
- Starts Vite dev server in background
- Launches Tauri webview pointing to `http://localhost:5173`
- Hot reload works (changes update in app window)
- Terminal shows Rust errors and JS console output

**Production mode:**
```bash
pnpm tauri build
```
- Runs web build (`pnpm build`) first
- Points Tauri webview to bundled `dist/` folder
- Creates installer (`.msi` on Windows, `.dmg` on macOS, `.AppImage` on Linux)
- Located in `src-tauri/target/release/bundle/`

## CSP Headers (Content Security Policy)

### Tauri Configuration

CSP enforced via `src-tauri/tauri.conf.json`:

```json
"csp": {
  "default-src": ["'self'", "data:", "blob:"],
  "script-src": ["'self'"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:"],
  "connect-src": ["'self'", "http://localhost:5173"],
  "font-src": ["'self'"],
  "worker-src": ["'self'", "blob:"],
  "child-src": ["blob:"],
  "media-src": ["'self'", "blob:"]
}
```

**Key policy explanations:**
- **`data:` and `blob:`** in default-src: Required for MediaPipe WASM models (Phase 2)
- **`'unsafe-inline'` in style-src:** Required by Tailwind CSS (TailwindCSS v4 uses inline styles)
- **`worker-src: ['self', 'blob:]`:** MediaPipe spawns web workers from blob URLs
- **`http://localhost:5173` in connect-src:** Dev server HMR during `pnpm tauri dev`
- **`script-src: ['self']`:** Only Vite-bundled scripts allowed (no inline `<script>` tags)

### Browser Dev Server

When running `pnpm dev` in Chrome/Firefox:
- No CSP enforced (dev mode)
- All APIs fully accessible
- Looser restrictions help development

### Why This Matters

In Tauri production builds, if code tries to:
- Load scripts from external CDN → blocked (script-src violation)
- Use inline event handlers → blocked (script-src violation)
- Fetch from non-localhost URLs → blocked (connect-src violation)

Our code uses bundled scripts only, so no issues.

## Permission Flow

### Web Browsers (Chrome, Firefox)

1. **User sees:** Pre-permission screen on first load
2. **User clicks:** "Start Camera" button
3. **Browser shows:** Native permission prompt (slightly different per browser)
4. **User grants/denies:** State saved in browser (localStorage)
5. **Reload behavior:** If granted, video starts auto-playing without prompt
6. **Revoke behavior:** User can revoke in browser settings anytime
7. **Deny then grant:** User can revisit permission in browser settings to grant after initial deny

**Permission state stored in:** `localStorage` (key: `webcam_permission`)

### Tauri Desktop (Windows)

1. **User sees:** Pre-permission screen on app launch
2. **User clicks:** "Start Camera" button
3. **OS shows:** Windows native permission dialog ("Allow [app] to use your camera?")
4. **User grants/denies:** State managed by **Windows itself**, not the app
5. **Reload behavior:** Tauri does **not** remember permission state → permission prompt appears on every app launch (even if previously granted)
6. **Revoke behavior:** User must go to **Settings > Privacy & security > Camera > Allow apps to use your camera**
7. **Important:** Once denied, users must manually re-enable in Windows Settings (one-way door)

**Permission state stored in:** Windows OS (not accessible to app)

**Implications for Phase 2 (hand tracking):**
- Test both grant and deny scenarios
- Test on Windows Settings changes
- Ensure graceful fallback when camera unavailable

### macOS & Linux (Tauri)

Similar to Windows, but:
- **macOS:** System permission dialog, state managed by macOS (not remembered by app)
- **Linux:** Depends on desktop environment; may not have permission prompts

## Device Access

### Webcam (`getUserMedia`)

**Web browsers:**
```javascript
navigator.mediaDevices.getUserMedia({
  video: { facingMode: 'user', width: 1280, height: 720 },
  audio: false
})
```

**Tauri webview:**
- Same API, same constraints
- WebView2 on Windows supports `getUserMedia` natively
- Triggers OS permission prompt automatically

**Both platforms:** Returns `<video>` element stream that can be:
- Displayed in `<video>` tag (WebcamProvider does this)
- Passed to MediaPipe HandLandmarker (Phase 2)
- Passed to TensorFlow.js (alternative, not planned)

## Performance Characteristics

### Three.js Rendering

**Web build:**
- 60 FPS target
- GPU acceleration via WebGL
- Three.js uses `requestAnimationFrame` for smooth animation

**Tauri build:**
- Same Three.js code, same performance
- Tauri webview uses Chromium rendering (on Windows)
- Graphics performance identical to Chrome

### MediaPipe Hand Tracking (Phase 2)

**Video running mode:** `VIDEO` (real-time processing)
- Runs at ~30 FPS (can be throttled lower if needed)
- Runs in separate web worker (doesn't block UI)
- Works identically in web and Tauri

**Both platforms:** Same hand landmark output format

## Known Issues & Workarounds

### Windows WebView2 Camera Permission One-Way Door

**Issue:** Once user denies camera access, they cannot re-grant from app UI.

**Why:** WebView2 caches permission decision until user manually changes it in Windows Settings.

**Mitigation (already implemented):** Pre-permission screen (D-01) explains camera need upfront, reducing accidental denials.

**If user denies:**
1. They must go to **Settings > Privacy & security > Camera**
2. Toggle "Allow apps to use your camera" or add app to allowlist
3. Restart the app
4. Permission prompt will appear again

### CSP and WASM

**Issue:** MediaPipe WASM models loaded from blob URLs might be blocked by strict CSP.

**Mitigation:** CSP configured with `worker-src: ['self', 'blob:']` and `child-src: ['blob:']`

**If WASM fails to load:**
- Check DevTools console for CSP violation
- Verify tauri.conf.json has correct CSP settings
- WASM models are ~5MB download at runtime (not bundled)

### Large Bundle Size

**Current:** 1.1MB JS (gzipped 308KB)

**Issue:** Three.js + R3F are not tiny libraries.

**Mitigation:** Dynamic imports in future phases (lazy-load models, gesture recognition)

**Phase 1:** Bundle size acceptable. Monitor in Phase 4 (polish).

## Debugging

### Web Build

**DevTools available:** Yes (F12 in any browser)
- Inspect DOM, network, console, performance
- Set breakpoints in JS code
- Profile CPU and memory

**Vite dev server logs:** Terminal shows build errors, HMR updates

### Tauri Build

**DevTools available:** No (disabled in production)

**Dev mode (`pnpm tauri dev`) console:**
- Terminal output shows Rust println! logs
- JS console output (console.log, console.error)
- Errors appear immediately

**Debugging approach:**
1. Add `console.log()` in React code
2. Watch terminal running `pnpm tauri dev`
3. Errors and logs appear in real-time

**Production debugging:**
- Create logs to file (Phase 2?)
- Use Tauri's logging plugin (optional)

## Testing Across Platforms

### Manual Testing

See `TESTING.md` for detailed checklists. Key differences:

| Aspect | Web (Chrome/Firefox) | Tauri (Windows) |
|--------|---------------------|-----------------|
| Permission prompt | Browser native | Windows native |
| Permission persistence | Browser memory | Windows OS |
| Re-enable after deny | Browser settings | Windows settings |
| Dev tools | Available (F12) | Available (tauri dev console) |
| Hot reload | Yes (Vite HMR) | Yes (Tauri HMR) |
| Bundle size | ~300KB gzipped | ~300KB + Tauri ~10MB |

### CI/CD (Future)

**Current:** No CI/CD pipeline

**Planned (Phase 4?):**
- GitHub Actions to build web for Chrome/Firefox
- GitHub Actions to build Tauri on Windows runner
- Upload artifacts (bundles, installers)
- Run automated screenshot tests

## Summary for Phase 2

When integrating hand tracking (Phase 2):

1. **MediaPipe WASM:** Will load correctly in both platforms (CSP allows it)
2. **Webcam stream:** Already available from Phase 1 (WebcamProvider)
3. **Real-time processing:** Web Worker setup will work on both platforms
4. **Hand landmarks:** Output format is identical on both platforms

No special Phase 2 code needed for cross-platform support.

---

For deployment questions or cross-platform issues, refer to:
- [Tauri v2 official docs](https://v2.tauri.app/)
- [Vite configuration](https://vitejs.dev/config/)
- [MediaPipe hand tracking guide](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/)
