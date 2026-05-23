# Domain Pitfalls

**Domain:** Web-based AR anatomy education with hand gesture interaction
**Researched:** 2026-05-23

## Critical Pitfalls

Mistakes that cause rewrites, demo failures, or major issues.

### Pitfall 1: Webcam + 3D rendering + hand tracking competing for GPU/CPU

**What goes wrong:** Running MediaPipe hand tracking (WASM + WebGL inference), Three.js 3D rendering, and a live webcam VideoTexture simultaneously creates a resource war. Frame rates plummet from 60 FPS to 15-20 FPS, making the app feel broken. Three.js VideoTexture alone can halve FPS from 60 to 30, and adding MediaPipe inference on top compounds the problem.

**Why it happens:** VideoTexture uploads every webcam frame to the GPU as a texture (at 60 Hz even though the webcam runs at 30 Hz). MediaPipe runs a neural network on each frame. Three.js renders the 3D scene. All three compete for the same GPU and main thread.

**Consequences:** Laggy hand tracking, stuttering 3D models, dropped frames during the capstone demo. The app looks amateur instead of impressive.

**Prevention:**
- Display the webcam feed as a plain HTML `<video>` element behind a transparent Three.js `<canvas>`, NOT as a Three.js VideoTexture. This eliminates redundant GPU texture uploads entirely.
- Constrain webcam to 640x480 at 30 FPS max via `getUserMedia` constraints -- higher resolution does not improve MediaPipe accuracy but costs significantly more processing.
- Run MediaPipe at a lower frequency than the render loop (e.g., process every 2nd or 3rd frame) and interpolate hand positions between detections.
- Use MediaPipe's "Lite" model complexity for faster inference when accuracy is sufficient.
- Monitor FPS with a stats overlay during development (e.g., `stats.js`).

**Detection:** FPS counter drops below 30 during normal hand interaction. Fan noise / thermal throttling on the demo machine.

**Phase relevance:** Must be addressed in Phase 1 (core infrastructure). Getting the webcam-behind-canvas architecture right from the start prevents a rewrite.

---

### Pitfall 2: Tauri webcam permission is a one-way door

**What goes wrong:** In Tauri (WebView2 on Windows), if a user clicks "Block" on the camera permission prompt, there is no way to re-prompt. The camera is permanently blocked for that app instance. The user must manually delete the WebView2 Preferences file at `C:\Users\<user>\AppData\Local\<app>\EBWebView\Default\Preferences` with the app closed.

**Why it happens:** WebView2 persists permission decisions and has no API for Tauri to reset them. Unlike browsers, there is no address bar padlock icon to click to change permissions. Tauri does not yet expose WebView2's permission override APIs.

**Consequences:** During the capstone demo, if the examiner accidentally clicks "Block," the demo is dead. No recovery path without closing the app and deleting a hidden file.

**Prevention:**
- Show a custom pre-permission screen BEFORE calling `getUserMedia()` explaining what the camera is for and instructing the user to click "Allow." This primes the user and reduces accidental blocks.
- Use `navigator.permissions.query({name: 'camera'})` to check permission state before requesting. If `denied`, show clear instructions for recovery (with the exact file path on Windows).
- Consider making the web browser the primary demo target (not Tauri) since browsers have better permission reset UX. Use Tauri as a secondary distribution channel.
- Test the permission flow on the actual demo machine before the presentation.

**Detection:** `getUserMedia()` throws `NotAllowedError` and subsequent calls also fail.

**Phase relevance:** Must be addressed in Phase 1. The permission UX screen should be the first thing built after webcam integration.

---

### Pitfall 3: Hand tracking jitter makes gesture interaction unusable

**What goes wrong:** MediaPipe hand landmarks jump several pixels between frames even when the hand is stationary. When these raw coordinates directly control 3D model rotation/position, the model vibrates and shakes constantly. Users perceive the app as broken rather than recognizing it as a tracking limitation.

**Why it happens:** Neural network inference produces slightly different landmark positions frame-to-frame due to minor lighting changes, camera noise, and model quantization. The Lite model has higher jitter than the Full model.

**Consequences:** Models shake when the user tries to hold them still. Pinch detection flickers on/off. The "explode view" or layer toggles trigger accidentally from jitter.

**Prevention:**
- Apply a 5-frame rolling average to all 21 hand landmarks before using them for gesture calculation. Store last 5 positions in a circular buffer per landmark.
- Implement gesture state machines with hysteresis: a pinch starts when thumb-index distance drops below 30px but only ends when it exceeds 45px. This prevents flicker.
- Add a "dead zone" for rotation: ignore movement deltas smaller than a threshold (e.g., 3px) to prevent micro-jitters from spinning the model.
- Use `min_detection_confidence: 0.7` and `min_tracking_confidence: 0.6` as starting values, tuned during testing.
- Consider velocity-based adaptive smoothing: high smoothing when hand moves slowly, low smoothing when moving fast (to reduce perceived lag).

**Detection:** Model visibly vibrates when user holds hand still. Pinch gesture toggles rapidly on/off in debug logs.

**Phase relevance:** Address in Phase 2 (hand tracking integration). The smoothing and state machine layer sits between MediaPipe output and the 3D interaction layer.

---

### Pitfall 4: Anatomy models are too large for web delivery

**What goes wrong:** Detailed anatomy models (skeletal system, muscular system, organs) can be 50-200MB as raw glTF/GLB. Users wait 30+ seconds for initial load. The app appears frozen or broken. On slower connections, models never finish loading.

**Why it happens:** Anatomy models have high polygon counts (millions of triangles for detailed musculature), large textures (4K diffuse/normal maps per system), and multiple mesh groups. Free models from TurboSquid or Sketchfab are often designed for offline rendering, not web delivery.

**Consequences:** Terrible first impression. Users leave before the app loads. Capstone demo starts with an awkward loading wait.

**Prevention:**
- Budget: keep each model under 5MB compressed, total app under 20MB. This is achievable with optimization.
- Use `gltf-transform` or `gltf-pipeline` to apply Draco mesh compression (reduces geometry 40-80%) and compress textures to KTX2/Basis format (textures are 70-90% of file size).
- Reduce polygon count with mesh decimation tools (Blender Decimate modifier) -- web viewers do not need the same detail as offline renders.
- Resize textures to 1024x1024 max (512x512 for mobile). Anatomy labels do not require 4K textures.
- Implement a loading progress bar with percentage -- never show a blank screen during load.
- Load the default model first, lazy-load others from the gallery on demand.

**Detection:** Network tab shows GLB files > 10MB. Initial load takes > 5 seconds on a fast connection.

**Phase relevance:** Address before Phase 2 (model gallery). All models must be optimized before they are integrated.

---

### Pitfall 5: Gesture conflicts -- every hand movement triggers something

**What goes wrong:** With two gesture modes (pinch+drag and open hand wave), the system cannot distinguish intentional gestures from incidental hand movements. Opening your hand to start a wave gesture accidentally triggers zoom. Moving your hand into frame triggers rotation. Transitioning between gestures fires spurious events.

**Why it happens:** Continuous hand tracking means the system always sees the hand. There is no equivalent of "mouse button up" for hands -- the hand is always "there." Developers map too many movements to actions without defining a clear idle/neutral state.

**Consequences:** Users feel the app is out of control. Models spin wildly. Accidental zoom during a demo. Examiner cannot use the app reliably.

**Prevention:**
- Define an explicit "idle" hand state (e.g., relaxed open hand, fingers slightly curled) that triggers NOTHING. Only specific, deliberate gestures should activate.
- Require gesture "activation" before tracking begins: e.g., pinch must be held for 300ms before drag starts. Prevents accidental activations.
- Add a cooldown period (500ms) after mode switching before the new mode accepts gestures.
- Implement a "gesture confidence" threshold: only act on gestures where the classifier confidence exceeds 0.8.
- Display a small visual indicator showing the currently detected gesture state, so users get feedback and can learn what the system sees.
- Consider a "pause tracking" button/key as an escape hatch.

**Detection:** During user testing, the model moves when the user is not intending to interact. Users say "it keeps doing things I did not want."

**Phase relevance:** Address in Phase 2 (gesture system design). The gesture state machine architecture prevents this; retrofitting is painful.

## Moderate Pitfalls

### Pitfall 6: Webcam permission asked on page load

**What goes wrong:** Requesting camera access immediately when the page loads results in most users reflexively clicking "Block." Once blocked, recovery is difficult (especially in Tauri -- see Pitfall 2). The user has no context for why the camera is needed.

**Prevention:**
- Show a landing/welcome screen first explaining the app and why the camera is needed.
- Only call `getUserMedia()` after the user clicks an explicit "Start Camera" button.
- Use `navigator.permissions.query({name: 'camera'})` to check state and show appropriate UI for each state (prompt, granted, denied).
- If denied, show recovery instructions specific to the browser/platform.

**Phase relevance:** Phase 1 (app shell / onboarding UX).

---

### Pitfall 7: No fallback when hand tracking fails or is unavailable

**What goes wrong:** If the user's webcam is low quality, lighting is poor, or WebGL is unsupported, the entire app becomes unusable. There is no mouse/keyboard fallback.

**Prevention:**
- Always implement mouse/touch controls as the baseline interaction method FIRST. Hand tracking is an enhancement layer on top.
- If MediaPipe fails to initialize (WASM load failure, GPU not available), gracefully fall back to mouse controls with a notification.
- Provide a toggle button to switch between mouse and hand tracking modes.
- This also makes development faster -- you can build and test all 3D interactions with mouse before adding the hand tracking layer.

**Phase relevance:** Phase 1 (3D viewer with mouse controls should come BEFORE hand tracking in Phase 2).

---

### Pitfall 8: Explode view and layer toggle have no animation or spatial logic

**What goes wrong:** Toggling layers or exploding the model causes parts to appear/disappear instantly or fly to arbitrary positions. The user loses spatial context -- they cannot tell what moved where or how parts relate to each other.

**Prevention:**
- Animate transitions: parts should smoothly slide outward from center for explode, and fade in/out for layer toggles (200-400ms duration).
- Maintain consistent explode directions: each part moves along a vector from the model centroid outward. Store these vectors per part.
- Use opacity transitions for layer toggles rather than instant show/hide.
- Keep a "ghost" outline of hidden layers so users maintain spatial reference.

**Phase relevance:** Phase 3 (advanced features). Easy to add animation if the model part hierarchy is set up correctly in Phase 2.

---

### Pitfall 9: Labels and annotations obscure the model or each other

**What goes wrong:** Anatomy labels (name + description) are rendered as 3D text or HTML overlays that overlap each other, cover important parts of the model, or become unreadable when the model rotates.

**Prevention:**
- Use HTML/CSS overlays (not 3D text) positioned via Three.js `CSS2DRenderer` -- they are always legible, never distorted by perspective.
- Implement label collision avoidance: if two labels would overlap, offset one vertically.
- Show labels on hover/click only, not all at once. An "all labels" toggle can exist but should spread labels with leader lines.
- Labels should track their anchor point on the model but have a fixed screen-space size.

**Phase relevance:** Phase 3 (labels/annotations). Straightforward if using CSS2DRenderer from the start.

---

### Pitfall 10: Developing in browser, shipping in Tauri -- "works in Chrome, broken in Tauri"

**What goes wrong:** Features developed and tested exclusively in Chrome fail silently in Tauri's WebView2. Common differences: CSP restrictions, permission APIs, file:// protocol handling, CORS for local assets, missing Web APIs.

**Prevention:**
- Test in Tauri after every feature, not just at the end. Run `pnpm tauri dev` alongside browser dev.
- Serve assets through Tauri's asset protocol, not relative file paths.
- Set up CSP in `tauri.conf.json` early -- whitelist `blob:`, `data:`, and `mediastream:` for webcam.
- WebView2 on Windows uses Edge's rendering engine -- check Edge compatibility for any Web API you use (it generally matches Chrome, but permission behavior differs).

**Phase relevance:** Phase 1 (project setup). Configure Tauri from day 1, do not bolt it on at the end.

## Minor Pitfalls

### Pitfall 11: Lighting makes anatomy models look flat or plastic

**What goes wrong:** Default Three.js lighting (a single white directional light) makes organic anatomy models look artificial. Muscles look like plastic, bones look like clay.

**Prevention:**
- Use a combination of ambient light (low intensity, 0.3-0.4) + two directional lights at different angles + an optional hemisphere light for soft fill.
- Enable PBR materials if the model provides them (most anatomy GLBs do).
- Add a subtle environment map (HDRI) for realistic reflections on wet/glossy surfaces (e.g., organs).

**Phase relevance:** Phase 2 (3D model rendering polish).

---

### Pitfall 12: MediaPipe WASM/model files not bundled correctly

**What goes wrong:** MediaPipe requires downloading its WASM binary and model files at runtime. If these are not served correctly (wrong MIME type, CORS issues, wrong path), hand tracking silently fails with no error message.

**Prevention:**
- Copy MediaPipe's WASM files to your `public/` directory and reference them with an explicit `locateFile` callback or `baseUrl` configuration.
- Verify the files are served with correct MIME types (`application/wasm` for `.wasm`).
- Add explicit error handling around MediaPipe initialization with user-facing error messages.
- In Tauri, ensure the WASM files are included in the bundle and served via the asset protocol.

**Phase relevance:** Phase 2 (hand tracking setup). Easy fix if caught early, baffling if discovered late.

---

### Pitfall 13: Building too many features instead of polishing core interactions

**What goes wrong:** Under a 1-week timeline, trying to implement all features (two gesture modes, gallery, labels, layer toggle, explode view) results in everything being half-finished. The demo shows many broken features instead of a few polished ones.

**Prevention:**
- Define a strict MVP: webcam background + one model + one gesture mode (pinch+drag) + mouse fallback. This alone is impressive if polished.
- Add features only after the core loop is smooth and reliable. Layer toggle and explode view are stretch goals.
- The second gesture mode (open hand wave) is the lowest priority -- pinch+drag is more reliable and intuitive.
- Budget: 3 days for core (webcam + 3D + hand tracking + one gesture mode), 2 days for polish and additional features, 1 day for demo prep and buffer.

**Phase relevance:** All phases. The roadmap must enforce ruthless prioritization.

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Project setup / scaffolding | Tauri + webcam permissions not tested early (#2, #10) | Configure Tauri on day 1, test camera in Tauri immediately |
| Webcam integration | Permission UX kills first impression (#6) | Pre-permission screen, delayed getUserMedia call |
| 3D model loading | Models too large, long load times (#4) | Optimize all models before integration, enforce 5MB budget |
| Hand tracking integration | Jitter makes interaction unusable (#3) | Rolling average + gesture state machine with hysteresis |
| Gesture system | Gesture conflicts, accidental triggers (#5) | Explicit idle state, activation thresholds, cooldown timers |
| Performance tuning | Triple resource competition (#1) | HTML video element behind canvas, not VideoTexture |
| Labels / annotations | Overlapping, unreadable labels (#9) | CSS2DRenderer, show-on-click, collision avoidance |
| Explode view / layers | Jarring transitions, lost spatial context (#8) | Animated transitions, directional explode vectors |
| Final polish / demo prep | Too many half-finished features (#13) | Strict MVP scope, cut second gesture mode if behind |

## Sources

- [5 Things I Wish I Knew Before Using MediaPipe](https://dev.to/trojanmocx/5-things-i-wish-i-knew-before-using-mediapipe-for-hand-gesture-recognition-41gb) - MediaPipe gesture recognition pitfalls
- [Three.js VideoTexture low framerate](https://discourse.threejs.org/t/videotexture-low-framerate/24159) - VideoTexture performance issues
- [Three.js VideoTexture updating at 60-90fps](https://github.com/mrdoob/three.js/issues/13379) - VideoTexture frame sync issues
- [Tauri camera permission blocked issue #5042](https://github.com/tauri-apps/tauri/issues/5042) - Permission persistence bug
- [Tauri macOS camera permission issue #11951](https://github.com/tauri-apps/tauri/issues/11951) - macOS double prompt
- [Combating False Positives in Gesture Recognition](https://medium.com/@leeor.langer/combating-false-positives-in-gesture-recognition-e727932b41b1) - False positive mitigation
- [MediaPipe jitter smoothing issue #3354](https://github.com/google/mediapipe/issues/3354) - Landmark jitter discussion
- [Kalman Filtering for MediaPipe Gesture Tracking](https://dl.acm.org/doi/10.1145/3703187.3703295) - Smoothing approaches
- [3D Optimization: 26MB to 560KB](https://echobind.com/post/3D-Optimization-for-Web-26mb-down-to-560kb) - Model optimization case study
- [Draco Compression for GLB](https://www.automapki.com/news/the-power-of-draco-compression-in-gltf-and-glb-file-formats.html) - Draco compression guide
- [getUserMedia best practices](https://medium.com/joinglimpse/how-to-build-beautiful-camera-microphone-permission-checking-for-websites-e6a08415fa76) - Permission UX patterns
- [MDN getUserMedia](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia) - Official API docs
