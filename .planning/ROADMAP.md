# Roadmap: AR Anatomy Explorer

## Overview

This roadmap delivers a web-based anatomy education app where users manipulate 3D anatomical models via hand gestures tracked through their webcam. The journey starts with the AR canvas foundation (webcam + transparent 3D overlay + Tauri), builds the core interaction loop (models + hand tracking + pinch gestures), layers on educational features (gallery, labels, layer toggles, explode view), and finishes with the second gesture mode and demo polish. Four phases, under one week.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3, 4): Planned milestone work
- Decimal phases (e.g., 2.1): Urgent insertions (marked with INSERTED)

- [x] **Phase 1: AR Canvas & Platform Foundation** - Webcam background, transparent 3D canvas overlay, Tauri desktop app, pre-permission screen
- [ ] **Phase 2: 3D Models & Hand Tracking** - Anatomy model loading with mouse controls, hand detection, and pinch+drag gesture interaction
- [ ] **Phase 3: Educational Features** - Model gallery, body part labels, layer toggles, and explode view
- [ ] **Phase 4: Second Gesture Mode & Polish** - Open hand wave mode, gesture mode toggle, and demo readiness

## Phase Details

### Phase 1: AR Canvas & Platform Foundation
**Goal**: Users see a working AR canvas -- live webcam feed behind a transparent 3D viewport -- running in both browser and Tauri desktop app
**Mode:** mvp
**Depends on**: Nothing (first phase)
**Requirements**: CAM-01, CAM-02, PLAT-01, PLAT-02, PLAT-03
**Success Criteria** (what must be TRUE):
  1. User sees their live webcam feed as the full background of the app
  2. User sees a 3D test object (skeleton model) floating over the webcam feed in the viewport area
  3. User sees a pre-permission screen explaining why webcam access is needed before the browser prompt appears
  4. App launches and runs in Chrome, Firefox, and as a Tauri desktop application from the same codebase
**Plans**: 4 plans
  - [x] 01-01-PLAN.md — Project scaffold with Tauri + React 19 + Vite + TypeScript + R3F + Zustand
  - [x] 01-02-PLAN.md — Webcam permission flow, pre-permission screen, checkerboard fallback
  - [x] 01-03-PLAN.md — R3F canvas overlay, skeleton preview model, auto-rotation animation
  - [x] 01-04-PLAN.md — Tauri desktop build, cross-browser testing (Chrome/Firefox), documentation
**UI hint**: yes

### Phase 2: 3D Models & Hand Tracking
**Goal**: Users can load real anatomy models and manipulate them -- by mouse or by pinching the air with their hands
**Mode:** mvp
**Depends on**: Phase 1
**Requirements**: CAM-03, MDL-01, GEST-01, GEST-02
**Success Criteria** (what must be TRUE):
  1. User can view a 3D anatomy model loaded from a GLB file in the viewport
  2. User can rotate, zoom, and pan the model using mouse and keyboard controls
  3. User's hand is visibly tracked in real-time via the webcam (debug overlay or gesture indicator confirms detection)
  4. User can pinch to grab, drag to rotate, and two-hand pinch to scale the model
**Plans**: 4 plans
  - [x] 02-01-PLAN.md — Install deps, extend Zustand store, gesture types, App.tsx layer stack, MediaPipe WASM offline assets
  - [ ] 02-02-PLAN.md — OrbitControls, GLB model loading with auto-fit, BottomToolbar, spinner, error toast
  - [ ] 02-03-PLAN.md — MediaPipe hand tracking hook, LandmarkCanvas, HandStatusIndicator
  - [ ] 02-04-PLAN.md — Gesture interpreter (pinch+drag, two-hand scale/pan), SceneController, OrbitControls auto-switch

### Phase 3: Educational Features
**Goal**: Users can browse anatomy models, inspect individual structures with labels, toggle body system layers, and explode models for internal inspection
**Mode:** mvp
**Depends on**: Phase 2
**Requirements**: MDL-02, MDL-03, MDL-04, MDL-05
**Success Criteria** (what must be TRUE):
  1. User can browse and select different anatomy models from a gallery or menu
  2. User can point at a body part to select it and see a label with its name and description
  3. User can toggle body system layers on and off (e.g., show only skeletal, hide muscular)
  4. User can trigger explode view to separate the model into its constituent parts for internal inspection
**Plans**: TBD
**UI hint**: yes

### Phase 4: Second Gesture Mode & Polish
**Goal**: Users have two distinct gesture interaction styles and the app is polished for capstone demo
**Mode:** mvp
**Depends on**: Phase 3
**Requirements**: GEST-03, GEST-04
**Success Criteria** (what must be TRUE):
  1. User can swipe to rotate, spread fingers to zoom in, and close fist to zoom out (open hand wave mode)
  2. User can toggle between pinch+drag and open hand wave gesture modes via a visible UI control
  3. Both gesture modes work reliably without conflicting with each other
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. AR Canvas & Platform Foundation | 4/4 | Planned | 2026-05-23 |
| 2. 3D Models & Hand Tracking | 0/4 | Not started | - |
| 3. Educational Features | 0/TBD | Not started | - |
| 4. Second Gesture Mode & Polish | 0/TBD | Not started | - |
