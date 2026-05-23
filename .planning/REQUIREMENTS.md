# Requirements: AR Anatomy Explorer

**Defined:** 2026-05-23
**Core Value:** Users can see, rotate, and inspect 3D anatomy models using their hands in front of a webcam -- making anatomy tangible without physical specimens.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Webcam & AR Canvas

- [ ] **CAM-01**: User sees live webcam feed as the background behind the 3D scene
- [ ] **CAM-02**: User sees 3D anatomy models rendered and floating over the camera feed in a defined viewport area
- [ ] **CAM-03**: User can rotate, zoom, and pan the 3D model using mouse/keyboard as baseline controls

### Hand Tracking & Gestures

- [ ] **GEST-01**: User's hand is detected and tracked in real-time via the webcam
- [ ] **GEST-02**: User can pinch to grab, drag to rotate, and two-hand pinch to scale the model (pinch+drag mode)
- [ ] **GEST-03**: User can swipe to rotate, spread fingers to zoom in, and close fist to zoom out (open hand wave mode)
- [ ] **GEST-04**: User can toggle between pinch+drag and open hand wave gesture modes via a UI control

### Anatomy Models & Education

- [ ] **MDL-01**: User can view 3D anatomy models loaded from GLB files
- [ ] **MDL-02**: User can browse and select different anatomy models from a gallery/menu
- [ ] **MDL-03**: User can point index finger at a body part and hold for ~1 second to select it, displaying its name and description as a label overlay
- [ ] **MDL-04**: User can toggle body system layers on/off (skeletal, muscular, nervous, etc.)
- [ ] **MDL-05**: User can explode the model view to see internal structures separated in space

### Platform & Desktop

- [ ] **PLAT-01**: App runs in Chrome and Firefox web browsers
- [ ] **PLAT-02**: App runs as a Tauri desktop application from the same codebase
- [ ] **PLAT-03**: User sees a pre-permission screen explaining webcam access before the browser permission prompt

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Assessment

- **QUIZ-01**: User can take quizzes overlaid on anatomy models
- **QUIZ-02**: User receives feedback on anatomy identification accuracy

### AI Features

- **AI-01**: AI-powered anatomy identification via computer vision pipeline
- **AI-02**: Voice commands for hands-free model navigation

### Collaboration

- **COLLAB-01**: User can save and share annotated anatomy views
- **COLLAB-02**: Multiple users can view the same model simultaneously

## Out of Scope

| Feature | Reason |
|---------|--------|
| iOS/mobile native app | Pivot away from Unity/ARKit -- web-first approach |
| Unity engine | Rebuilding on web stack for accessibility and speed |
| User accounts/authentication | Not needed for client-side anatomy viewer |
| Backend/server | Client-side only -- no data persistence needed |
| AR headset support | Desktop/browser focus -- no Meta Quest or HoloLens |
| Pathology/disease content | Educational anatomy only, not clinical |
| Video recording of sessions | Complexity vs value for 1-week timeline |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| CAM-01 | Phase 1 | Pending |
| CAM-02 | Phase 1 | Pending |
| CAM-03 | Phase 2 | Pending |
| GEST-01 | Phase 2 | Pending |
| GEST-02 | Phase 2 | Pending |
| GEST-03 | Phase 4 | Pending |
| GEST-04 | Phase 4 | Pending |
| MDL-01 | Phase 2 | Pending |
| MDL-02 | Phase 3 | Pending |
| MDL-03 | Phase 3 | Pending |
| MDL-04 | Phase 3 | Pending |
| MDL-05 | Phase 3 | Pending |
| PLAT-01 | Phase 1 | Pending |
| PLAT-02 | Phase 1 | Pending |
| PLAT-03 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 15 total
- Mapped to phases: 15
- Unmapped: 0

---
*Requirements defined: 2026-05-23*
*Last updated: 2026-05-23 after roadmap creation*
