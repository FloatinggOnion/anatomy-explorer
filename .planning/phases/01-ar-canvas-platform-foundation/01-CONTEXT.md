# Phase 1: AR Canvas & Platform Foundation - Context

**Gathered:** 2026-05-23
**Status:** Ready for planning

## Phase Boundary

Establish the critical foundation — webcam feed as live background, transparent 3D canvas overlay, working in both browser (Chrome/Firefox) and Tauri desktop app. Lock the DOM layer stacking architecture, pre-permission/error handling patterns, and build structure for shared web+Tauri codebase. This phase must get the architectural decisions right because they force rewrites if wrong downstream.

**Requirements:** CAM-01 (webcam feed), CAM-02 (3D overlay), PLAT-01 (Chrome/Firefox), PLAT-02 (Tauri desktop), PLAT-03 (pre-permission screen)

## Implementation Decisions

### Webcam Permission & Pre-Permission Screen
- **D-01:** Pre-permission screen appears behind a "Start Camera" button, not on app load. Allows user to see the UI first and understand what they're about to enable. Critical for Tauri Windows where permission denial is permanent (one-way door).
- **D-02:** App remains fully usable in mouse-only mode if camera permission is denied or revoked. No "camera required" gate. Fallback controls enable demo continuity if webcam fails.

### Webcam Display & Error Handling
- **D-03:** If camera is unavailable, denied, or permission revoked, display a checkerboard pattern as the background instead of a black box. Signals something is intentionally missing; familiar visual to 3D users.
- **D-04:** Webcam feed is rendered as an HTML `<video>` element behind the transparent R3F canvas (DOM layer stacking pattern). Never use Three.js VideoTexture — research confirms this halves frame rates due to GPU contention (Pitfalls.md § Pitfall 1).

### Test Object & Foundation "Wow" Moment
- **D-05:** Load a skeletal anatomy model preview instead of a simple cube. Provides immediate visual confirmation of the product's purpose — users see "this is an anatomy app" on first load. Raises the bar for Phase 1 (requires sourcing and optimizing at least one skeleton model) but strengthens the capstone demo narrative.
- **D-06:** Skeleton preview auto-rotates gently on load with smooth looping animation. Animation resets (stops) on any user mouse/gesture interaction. Creates an engaging foundation experience without requiring user action to see the model.

### Build Structure for Web + Tauri
- **D-07:** Single `src/` directory with conditional imports using `__TAURI_CORE__` feature detection and environment variables. Both web and Tauri builds share identical React/R3F code; Vite's build config handles branching at compile time. This minimizes code duplication and keeps a 1-week timeline tractable.
- **D-08:** Tauri native APIs (file I/O, shell, etc.) are imported only where needed inside `if (__TAURI_CORE__)` blocks. Web builds tree-shake these imports completely. React components remain platform-agnostic.

### Claude's Discretion
- **Build tool choice:** User trusted the architect to choose single-src conditional imports over separate entry points. Confirmed as the simplest, lowest-friction approach for rapid shipping.

## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap & Requirements
- `.planning/ROADMAP.md` Phase 1 details — Success criteria, dependencies, UI hints
- `.planning/REQUIREMENTS.md` — CAM-01, CAM-02, PLAT-01, PLAT-02, PLAT-03 (Phase 1 requirements)
- `.planning/PROJECT.md` § Constraints — Timeline (<1 week), pnpm, Tauri over Electron, Windows dev environment

### Research Findings (MANDATORY READS)
- `.planning/research/STACK.md` — React 19 + Vite + R3F + Zustand + Tauri v2. Specific rationale for each technology choice.
- `.planning/research/ARCHITECTURE.md` — DOM layer stacking pattern (video behind transparent canvas, not VideoTexture). Component boundaries and data flow.
- `.planning/research/PITFALLS.md` — Critical for Phase 1:
  - **Pitfall 1 (GPU/CPU resource war):** VideoTexture wastes GPU. Solution: HTML video element + transparent R3F canvas.
  - **Pitfall 2 (Tauri permission one-way door on Windows):** Solution: Pre-permission explanation screen + "Start Camera" button.
  - **Pitfall 10 (browser-only development):** Tauri issues surface late if not tested early. Solution: Set up Tauri project in Phase 1, test webcam access in Tauri desktop build from day one.

### Technology & Integration
- `.planning/research/FEATURES.md` — Table stakes vs. differentiators. Establishes that webcam background + 3D overlay is the absolute foundation of the product.

## Existing Code Insights

### Reusable Assets
- None yet — greenfield project. Phase 1 establishes the foundation; no prior phases to inherit from.

### Established Patterns
- Research findings establish patterns: DOM layer stacking for webcam, single-src conditional imports for web+Tauri, pre-permission flow for Tauri permission one-way door.

### Integration Points
- Phase 1 is the integration point for ALL subsequent phases. Everything depends on the webcam+canvas+Tauri setup. Get the architecture right; subsequent phases plug into it.

## Specific Ideas

### Skeletal Preview Sourcing
The skeleton model used as the Phase 1 test object must be:
1. Free/open license (aligns with PROJECT.md constraint)
2. Optimized to <5MB (per Pitfalls.md Pitfall 4 — web models budget)
3. Named mesh hierarchies for body systems — required for Phase 3 layer toggles to work
4. Web-compatible format (GLB/GLTF)

Sources to evaluate: AnatomyTOOL (GitHub), Sketchfab (open anatomy models), BioDigital models if available as exports. Phase 1 must validate that chosen model supports the layer toggle architecture.

### Tauri Configuration Details
- Windows-specific: Test WebView2 permission handling early. CSP header must allow MediaPipe WASM loading via Tauri's asset protocol (`asset://` for local files, proper CSP for WASM).
- Configuration items: `tauri.conf.json` must include camera permission, Vite environment variables for conditional builds, development server URL for HMR.

## Deferred Ideas

None — discussion stayed within phase scope. All ideas (error handling, animation, build structure) fit Phase 1's foundation mandate.

---

*Phase: 1-AR Canvas & Platform Foundation*
*Context gathered: 2026-05-23*
