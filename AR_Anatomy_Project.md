# AR Anatomy Education App — Project Details

## Overview

An augmented reality anatomy education application developed as a final-year capstone project. The app allows users to visualize and interact with 3D human anatomy models overlaid on the real world via their device camera, providing an immersive learning experience for students.

---

## Goals & Objectives

- Build an AR-based anatomy learning tool accessible on mobile (iOS-first)
- Enable users to place, rotate, and inspect 3D anatomical models in real space
- Serve as a practical alternative or supplement to physical anatomy labs
- Demonstrate full-stack AR development capability as a capstone deliverable

---

## Tech Stack

| Layer | Technology |
|---|---|
| Primary Framework | Unity (AR Foundation) |
| AR Tracking | ARKit (iOS) via AR Foundation |
| Target Device | iPhone 15 Pro Max |
| Build Pipeline | Unity Cloud Build (no Mac required) |
| Sideloading | AltStore |
| Prototype (deprioritized) | Three.js / WebXR |

---

## Architecture

### Current Build Path: Unity + AR Foundation

- **AR Foundation** abstracts ARKit on iOS, providing plane detection, image tracking, and world anchoring
- **Unity Cloud Build** handles iOS compilation remotely, removing the macOS/Xcode dependency
- **AltStore** used to sideload the `.ipa` onto the iPhone 15 Pro Max without a paid Apple Developer account

### Prototype Path: WebXR (Deprioritized)

- A working WebXR prototype was built using **Three.js**
- Deprioritized due to **iOS WebKit restrictions** blocking immersive AR sessions in Safari
- Retained as a fallback or demo reference

---

## 3D Assets

- Anatomical models sourced and integrated into Unity scenes
- Models support rotation and scale interaction for inspection from multiple angles

---

## Known Issues / Technical Blockers

| Issue | Status | Notes |
|---|---|---|
| Black screen on launch (Unity build) | Unresolved | Occurs on device after sideloading; likely a camera permissions or ARSession init issue |
| iOS WebKit AR limitations | Workaround applied | Switched to Unity/ARKit pipeline |

---

## Development Environment

- **OS:** Windows (no Mac available)
- **IDE:** Unity Editor (Windows)
- **Build:** Unity Cloud Build → `.ipa` → AltStore sideload
- **Version Control:** *(add repo link here)*

---

## Milestones

- [x] Project concept defined — AR anatomy education
- [x] WebXR prototype built (Three.js)
- [x] Unity project initialized with AR Foundation
- [x] Unity Cloud Build pipeline configured
- [x] AltStore sideloading tested on iPhone 15 Pro Max
- [ ] Black screen launch bug resolved
- [ ] Core anatomy model interaction (rotate, scale, label)
- [ ] UI/UX refinement
- [ ] Final capstone submission

---

## Possible Extensions / Future Features

- Body system filtering (skeletal, muscular, nervous, etc.)
- Tap-to-label interaction for anatomy structures
- Quiz/assessment mode overlaid on models
- AR laser engraver preview tool (explored as pivot direction)
- AI-powered anatomy identification via computer vision pipeline

---

## References & Resources

- [Unity AR Foundation Docs](https://docs.unity3d.com/Packages/com.unity.xr.arfoundation@latest)
- [AltStore](https://altstore.io/)
- [Unity Cloud Build](https://unity.com/solutions/ci-cd)
- [Apple ARKit](https://developer.apple.com/augmented-reality/arkit/)

---

*Last updated: May 2026*
