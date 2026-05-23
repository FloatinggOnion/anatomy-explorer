# Architecture Patterns

**Domain:** Web-based AR anatomy viewer with webcam hand tracking
**Researched:** 2026-05-23

## Recommended Architecture

The application is a **layered client-side pipeline** with four distinct layers stacked in the browser, each with clear responsibilities and a unidirectional data flow from camera input through to rendered output.

```
+------------------------------------------------------------------+
|                        UI Layer (React)                           |
|  Model Gallery | Layer Toggles | Mode Switcher | Labels/HUD      |
+------------------------------------------------------------------+
|                   Gesture Interpreter                             |
|  Raw landmarks -> Gesture state (pinch, swipe, fist, spread)     |
|  Gesture mode manager (pinch+drag vs open-hand)                  |
+------------------------------------------------------------------+
|               Hand Tracking Pipeline (MediaPipe)                  |
|  @mediapipe/tasks-vision HandLandmarker                           |
|  Runs per-frame on video element, outputs 21 landmarks x 2 hands |
+------------------------------------------------------------------+
|              3D Rendering Layer (React Three Fiber)               |
|  Three.js scene with transparent background                      |
|  glTF model loader, explode/layer controls, camera rig           |
+------------------------------------------------------------------+
|              Webcam Feed Layer (HTML5 Video)                      |
|  getUserMedia -> <video> element -> CSS background                |
+------------------------------------------------------------------+
|              DOM Compositing (CSS z-index stacking)               |
|  video (z:0) | R3F canvas alpha (z:1) | UI overlay (z:2)         |
+------------------------------------------------------------------+
```

### Visual Compositing Strategy

The webcam feed, 3D scene, and UI are NOT rendered in a single canvas. They use **DOM layer stacking**:

1. **Video element** -- full-viewport `<video>` from getUserMedia, positioned absolutely at z-index 0.
2. **R3F Canvas** -- Three.js WebGLRenderer with `{ alpha: true }` and `scene.background = null`, overlaid at z-index 1. The transparent background lets the video show through.
3. **UI overlay** -- standard React DOM elements (gallery, labels, toggles) at z-index 2 on top of everything.

This is simpler and more performant than rendering the video as a Three.js texture. The video element is hardware-accelerated by the browser, and CSS compositing handles the layering.

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **WebcamProvider** | getUserMedia, manages video stream lifecycle, provides `<video>` element ref | HandTracker (shares video element) |
| **HandTracker** | Runs MediaPipe HandLandmarker on each frame, emits raw landmark data (21 points x 2 hands) | GestureInterpreter (pushes landmarks) |
| **GestureInterpreter** | Classifies raw landmarks into semantic gestures (pinch, swipe, fist, spread), tracks gesture state over time, manages active gesture mode | SceneController (pushes gesture commands) |
| **SceneController** | Translates gesture commands into 3D transforms (rotate, scale, select), manages camera orbit | R3F Scene (applies transforms) |
| **ModelManager** | Loads/caches glTF models, manages active model state, handles layer visibility and explode transforms | R3F Scene (provides model data) |
| **R3F Scene** | Three.js scene with transparent canvas, renders anatomy model, lighting, handles orbit | DOM (renders to canvas element) |
| **UIOverlay** | React DOM layer for gallery, labels, toggles, mode switcher, gesture feedback indicator | GestureInterpreter (reads mode), ModelManager (selects models), SceneController (shows labels) |

### Data Flow

```
getUserMedia
    |
    v
<video> element (shared by WebcamProvider)
    |
    +---> Displayed as CSS background layer
    |
    +---> HandTracker reads frames via detectForVideo()
              |
              v
         Raw landmarks (21 points x 2 hands, 30fps)
              |
              v
         GestureInterpreter
           - Computes pinch distance (thumb tip to index tip)
           - Tracks hand center-of-mass delta between frames
           - Classifies: PINCH_DRAG | SWIPE | FIST | SPREAD | IDLE
           - Filters by active mode (pinch+drag vs open-hand)
              |
              v
         Gesture Commands
           { type: 'rotate', delta: {x, y} }
           { type: 'scale', factor: 1.05 }
           { type: 'select', point: {x, y} }
              |
              v
         SceneController
           - Applies rotation via OrbitControls or direct quaternion
           - Applies scale clamped to min/max
           - Raycasts for part selection on 'select' commands
              |
              v
         R3F Scene renders at 60fps via setAnimationLoop
```

**Key insight:** The hand tracking runs at ~30fps (limited by MediaPipe inference time) but the 3D scene renders at 60fps. The SceneController interpolates/smooths gesture deltas to avoid jitter. This decoupling is essential -- never tie the render loop to detection speed.

### Detailed Landmark-to-Gesture Pipeline

The GestureInterpreter is the most architecturally significant custom component. It bridges the gap between raw ML output and meaningful 3D interaction.

**Pinch detection:**
```
thumb_tip = landmarks[4]
index_tip = landmarks[8]
pinch_distance = euclidean(thumb_tip, index_tip)
is_pinching = pinch_distance < PINCH_THRESHOLD  // ~0.05 normalized
```

**Rotation from pinch-drag:**
```
if is_pinching:
    hand_center = average(landmarks[0..20])
    delta = hand_center - previous_hand_center
    emit { type: 'rotate', delta: { x: delta.x * SENSITIVITY, y: delta.y * SENSITIVITY } }
```

**Scale from two-hand pinch:**
```
if left_hand.is_pinching AND right_hand.is_pinching:
    distance = euclidean(left_hand.center, right_hand.center)
    scale_factor = distance / previous_distance
    emit { type: 'scale', factor: clamp(scale_factor, 0.95, 1.05) }
```

**Open-hand swipe:**
```
if fingers_extended >= 4:  // open hand
    hand_velocity = hand_center - previous_hand_center
    if magnitude(hand_velocity) > SWIPE_THRESHOLD:
        emit { type: 'rotate', delta: hand_velocity * SWIPE_SENSITIVITY }
```

## Patterns to Follow

### Pattern 1: Input Abstraction Layer
**What:** All gesture-to-action mapping goes through a unified command interface, never directly coupling MediaPipe output to Three.js transforms.
**When:** Always. This is the architectural keystone.
**Why:** Enables testing gesture logic without a camera, swapping input sources (mouse fallback, touch), and changing gesture mappings without touching 3D code.
**Example:**
```typescript
// Gesture command interface -- shared contract
interface GestureCommand {
  type: 'rotate' | 'scale' | 'select' | 'idle';
  delta?: { x: number; y: number };
  factor?: number;
  point?: { x: number; y: number };
}

// GestureInterpreter emits these
// SceneController consumes these
// MouseFallbackProvider can also emit these
```

### Pattern 2: Dual-Loop Architecture
**What:** Hand tracking and 3D rendering run on independent loops with shared state.
**When:** Always for webcam+3D applications.
**Why:** MediaPipe detection (~30fps, variable) must not block Three.js rendering (60fps, stable). Coupling them causes visible frame drops.
**Example:**
```typescript
// Hand tracking loop (runs independently)
async function trackHands() {
  const results = handLandmarker.detectForVideo(video, performance.now());
  gestureStateRef.current = interpretGestures(results);
  requestAnimationFrame(trackHands);
}

// R3F render loop (useFrame hook, 60fps)
useFrame(() => {
  const gesture = gestureStateRef.current;
  applyGestureToScene(gesture);
});
```

### Pattern 3: Model Conventions for Layering
**What:** Anatomy models must follow naming conventions in their glTF node hierarchy to enable layer toggling and part selection.
**When:** During model preparation/sourcing.
**Why:** Without consistent naming, layer toggle and labels require per-model custom code.
**Example:**
```
Model root
  +-- skeletal_group
  |     +-- skull
  |     +-- spine
  |     +-- ribcage
  +-- muscular_group
  |     +-- biceps
  |     +-- deltoid
  +-- nervous_group
        +-- brain
        +-- spinal_cord
```
Layer toggle = `scene.getObjectByName('muscular_group').visible = false`

### Pattern 4: Explode View via Directional Displacement
**What:** Calculate each part's offset from the model center, then animate parts outward along that vector.
**When:** User activates explode view.
**Why:** Simple, visually intuitive, works with any model without pre-authored animation data.
**Example:**
```typescript
function explode(group: THREE.Group, factor: number) {
  const center = new THREE.Vector3();
  const box = new THREE.Box3().setFromObject(group);
  box.getCenter(center);
  
  group.children.forEach(child => {
    const direction = child.position.clone().sub(center).normalize();
    child.position.add(direction.multiplyScalar(factor));
  });
}
```

## Anti-Patterns to Avoid

### Anti-Pattern 1: Video-as-Texture
**What:** Rendering the webcam feed as a Three.js texture on a plane inside the 3D scene.
**Why bad:** Burns GPU cycles re-uploading video frames every tick. Adds complexity (UV mapping, plane sizing). Makes the video subject to Three.js color management and tone mapping, causing color shifts. Harder to keep pixel-perfect with the viewport.
**Instead:** Use DOM layer stacking -- `<video>` element behind a transparent R3F canvas. Browser handles compositing efficiently via hardware-accelerated layers.

### Anti-Pattern 2: Tight-Coupling Detection to Rendering
**What:** Running MediaPipe detection inside the useFrame/render loop.
**Why bad:** Detection takes 15-30ms per frame. Blocking the render loop with detection drops frame rate from 60fps to ~30fps, causing visible judder in the 3D scene. Also makes the detection rate dependent on render performance.
**Instead:** Run detection in its own requestAnimationFrame loop (or even a Web Worker for the pre-processing). Share results via a ref or state atom that the render loop reads non-blockingly.

### Anti-Pattern 3: Raw Landmark Coordinates as Input
**What:** Passing raw (x, y, z) landmark arrays directly to the 3D transform logic.
**Why bad:** Creates brittle coupling between ML output format and 3D code. Every gesture change requires modifying 3D transform code. Makes it impossible to test gestures without a live camera. Blocks adding mouse/touch fallback inputs.
**Instead:** Use the gesture command abstraction layer (Pattern 1).

### Anti-Pattern 4: Single Monolithic Model File
**What:** Loading one massive GLB containing all anatomy systems as a single mesh.
**Why bad:** Cannot toggle layers. Cannot select individual parts. Cannot explode. Cannot progressively load. A 50MB+ file blocks initial render.
**Instead:** Either use a single GLB with well-structured node hierarchy (named groups per system), or split into multiple smaller GLBs loaded on demand.

## Module/File Structure

```
src/
  app/
    App.tsx                 # Root layout, DOM layer stacking
    main.tsx                # Entry point
  
  webcam/
    WebcamProvider.tsx       # getUserMedia, video element lifecycle
    useWebcam.ts            # Hook: video ref, stream state
  
  tracking/
    HandTracker.ts          # MediaPipe HandLandmarker wrapper
    useHandTracking.ts      # Hook: runs detection loop, returns landmarks
    types.ts                # HandLandmarks, Handedness types
  
  gestures/
    GestureInterpreter.ts   # Landmarks -> GestureCommand classification
    gestureModes.ts         # Pinch+drag mode vs open-hand mode logic
    types.ts                # GestureCommand, GestureMode types
    useGestures.ts          # Hook: composites tracking + interpretation
  
  scene/
    AnatomyScene.tsx        # R3F Canvas + scene setup (lights, camera)
    SceneController.tsx     # Consumes gesture commands, applies transforms
    ModelViewer.tsx          # Renders loaded glTF model
    ExplodeView.ts          # Explode/collapse animation logic
    useModelLayers.ts       # Hook: layer visibility toggling
  
  models/
    ModelManager.ts         # Model catalog, loading, caching
    useModelLoader.ts       # Hook: async glTF loading with suspense
    catalog.ts              # Static catalog of available models + metadata
  
  ui/
    Gallery.tsx             # Model selection grid
    LayerToggles.tsx        # System visibility checkboxes
    GestureModeSwitch.tsx   # Toggle pinch vs open-hand mode
    PartLabel.tsx           # Floating label on selected anatomy part
    GestureFeedback.tsx     # Visual indicator of detected gesture
    HelpOverlay.tsx         # Gesture tutorial/guide
  
  shared/
    types.ts                # Shared type definitions
    constants.ts            # Thresholds, sensitivity values
```

## Scalability Considerations

| Concern | MVP (1 user, 3 models) | Growth (10 models, polish) | Future (quiz mode, mobile) |
|---------|------------------------|---------------------------|---------------------------|
| Model loading | Preload all GLBs at startup | Lazy-load from catalog, show skeleton placeholder | CDN-hosted models, progressive loading |
| Hand tracking perf | Single detection loop on main thread | Tune detection frequency (skip frames if needed) | Offload to Web Worker if supported |
| Gesture accuracy | Basic threshold-based classification | Add temporal smoothing (rolling average over 3-5 frames) | ML-based gesture classifier |
| Layer toggling | Name-based node traversal | Pre-index nodes at load time into a layer map | Per-model metadata file with part descriptions |
| Tauri compat | Same web code, basic window setup | Tauri-specific file access for bundled models | Offline model cache, native menu integration |

## Build Order (Dependency Chain)

This is the critical architectural dependency graph that should inform phase structure:

```
Phase 1: Foundation (no dependencies)
  WebcamProvider -> can demo camera feed immediately
  R3F Canvas with transparent background -> can demo 3D cube over video
  These two combined = the "wow moment" proof of concept

Phase 2: Model Loading (depends on Phase 1 canvas)
  GLTFLoader integration -> load and display one anatomy model
  Basic mouse/keyboard orbit controls -> interact without hand tracking
  This is the fallback input path and proves the 3D pipeline works

Phase 3: Hand Tracking (depends on Phase 1 webcam)
  MediaPipe HandLandmarker setup -> show landmarks on screen
  GestureInterpreter -> classify gestures, show debug overlay
  Can develop and test independently of Phase 2

Phase 4: Integration (depends on Phases 2 + 3)
  SceneController wiring -> gesture commands drive model transforms
  Replace/augment mouse controls with gesture input

Phase 5: Features (depends on Phase 4)
  Layer toggle, explode view, labels, gallery
  These are all additive -- each can be built independently

Phase 6: Polish + Tauri (depends on Phase 5)
  Gesture feedback indicators, help overlay
  Tauri wrapper, model bundling
```

**Key dependency insight:** Phases 2 and 3 can be developed in parallel. The gesture system and the 3D model system should be kept separate until Phase 4 integration. This is why the input abstraction layer (Pattern 1) is architecturally essential -- it defines the contract between the two parallel workstreams before they merge.

## Sources

- [Three.js setAnimationLoop docs](https://threejs.org/docs/#api/en/renderers/WebGLRenderer.setAnimationLoop)
- [React Three Fiber introduction](https://r3f.docs.pmnd.rs/getting-started/your-first-scene)
- [MediaPipe Hand Landmarker web guide](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js)
- [@mediapipe/tasks-vision npm](https://www.npmjs.com/package/@mediapipe/tasks-vision)
- [Three.js + MediaPipe hand tracking tutorial (Codrops)](https://tympanus.net/codrops/2024/10/24/creating-a-3d-hand-controller-using-a-webcam-with-mediapipe-and-three-js/)
- [threejs-handtracking-101 (GitHub)](https://github.com/collidingScopes/threejs-handtracking-101)
- [glTF model explosion (Three.js)](https://github.com/MidhunSureshR/ModelExplosion)
- [Exploded view with React Three Fiber (DevDojo)](https://devdojo.com/post/axiome/exploded-view-of-a-3d-model-using-react-three-fiber)
- [Webcam as background (Three.js forum)](https://discourse.threejs.org/t/add-video-from-webcam-as-background-to-entire-scene/10277)
- [MediaPipe Hands research paper](https://arxiv.org/abs/2006.10214)
- [3D anatomy with R3F (WellAlly)](https://www.wellally.tech/blog/react-three-fiber-3d-anatomy-model-fitness-app)
- [GLTFLoader docs](https://threejs.org/docs/#examples/en/loaders/GLTFLoader)
