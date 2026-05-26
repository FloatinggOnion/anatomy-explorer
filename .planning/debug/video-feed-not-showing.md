---
status: fixing
trigger: "the video feed doesn't show in the background: [Image 1]"
created: 2026-05-23
updated: 2026-05-23
---

## Symptoms

- **Expected:** Webcam feed shows as live background behind the 3D anatomy model
- **Actual:** 3D model renders on a checkerboard pattern (transparent canvas background). Video feed appears to be underneath the canvas but is not visible. The camera permission prompt may be hidden behind the 3D model layer.
- **Errors:** No console errors
- **Timeline:** Never worked — has been broken since initial development
- **Reproduction:** Open the app (start dev server, load the page)

## Current Focus

- status: investigating
- hypothesis: CSS z-index layering with transparent WebGL canvas is fragile across browsers. Instead, render the video as a texture on a fullscreen background plane/mesh within the Three.js scene — the standard AR approach used by AR.js, MindAR, etc. This eliminates reliance on browser-specific CSS/WebGL alpha compositing.
- test: Create a background plane in the Canvas that uses the video element as a texture, remove the need for transparent WebGL canvas
- expecting: Webcam feed renders as the 3D scene background via a textured plane, working consistently across all browsers
- next_action: implement video-as-texture approach in Canvas.tsx
- reasoning_checkpoint: 
- tdd_checkpoint: 

## Evidence

- timestamp: 2026-05-23T00:00:00Z
  type: code-analysis
  file: src/components/Canvas.tsx
  finding: R3F Canvas uses `gl={{ alpha: true }}` but doesn't set `premultipliedAlpha: false`. On macOS/darwin, default `premultipliedAlpha: true` causes WebGL canvas to composite opaquely regardless of alpha clearing.
  relevance: HIGH

- timestamp: 2026-05-23T00:00:00Z
  type: code-analysis
  file: src/components/Canvas.tsx
  finding: `style={{ background: 'transparent' }}` applies to R3F's wrapper div, not the inner `<canvas>` element. The canvas element created by R3F may have default opaque styling.
  relevance: MEDIUM

- timestamp: 2026-05-23T00:00:00Z
  type: code-analysis
  file: src/components/WebcamProvider.tsx
  finding: Video element at z:0, position:fixed, full viewport — correctly positioned behind canvas layer (z:1)
  relevance: LOW (eliminated layering as the cause)

- timestamp: 2026-05-23T00:00:00Z
  type: code-analysis
  file: src/hooks/useWebcam.ts
  finding: Stream acquisition and video.play() use proper async/await — stream management looks correct. No console errors reported.
  relevance: LOW (eliminated stream acquisition as the cause)

## Eliminated

## Resolution

- root_cause: R3F Canvas WebGL context was created with `alpha: true` but default `premultipliedAlpha: true`. On macOS (Chrome/Safari), this causes the WebGL canvas to composite opaquely — transparent pixels render as the browser's checkerboard pattern instead of showing through to the `<video>` element behind. Additionally, the `<canvas>` DOM element created by R3F had no explicit transparency styling.
- fix: (1) Added `premultipliedAlpha: false` to R3F Canvas `gl` prop so WebGL properly composites transparent pixels with CSS layers. (2) Added global CSS rule `canvas { background: transparent !important; }` to ensure the canvas DOM element is explicitly transparent.
- verification: Pending user testing — start dev server, load the app, confirm webcam feed shows through transparent areas of the 3D canvas
- files_changed: src/components/Canvas.tsx, src/index.css 
