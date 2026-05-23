# Feature Landscape

**Domain:** Web-based AR anatomy education with hand gesture interaction
**Researched:** 2026-05-23

## Table Stakes

Features users expect from any 3D anatomy viewer. Missing any of these and the app feels like a tech demo, not a learning tool.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| 3D model rotate/zoom/pan | Every competitor does this. Visible Body, BioDigital, Zygote Body, Complete Anatomy all have it. Without it there is no product. | Low | Mouse/touch drag to rotate, scroll to zoom. This is the baseline interaction. |
| Body system layer toggles | Visible Body organizes by system (skeletal, muscular, vascular, nervous, skin). Zygote Body has a slider plus individual layer toggles. Users expect to peel back layers. | Medium | Need models with separated system meshes. Toggle visibility per system. |
| Structure labels on tap/click | All competitors show labels when a structure is selected. Complete Anatomy has 13,000+ labeled structures. At minimum, major structures need names. | Medium | Requires metadata per mesh/part. Leader lines from label to structure are standard. |
| Model gallery/browser | Users need to choose what to look at. Even Zygote Body (the simplest competitor) has a model selection interface. | Low | Grid or list of available models with thumbnails. |
| Webcam feed as background | This IS the AR differentiator. The whole pitch is "see anatomy overlaid on your real environment." Without it, it is just another 3D viewer. | Low | MediaPipe / getUserMedia provides the feed. Render as background plane behind 3D scene. |
| Smooth 60fps rendering | Users compare against polished native apps. Janky frame rates kill credibility, especially for a capstone demo. | Low | Three.js / WebGL handles this well on modern hardware. Keep draw calls reasonable. |
| Keyboard/mouse fallback controls | Hand tracking will fail sometimes (lighting, distance, occlusion). Users need a reliable fallback or they get stuck. | Low | Standard orbit controls as fallback. Always available. |

## Differentiators

Features that set this project apart from competitors. These are what make it a capstone-worthy portfolio piece, not just a Zygote Body clone.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Hand gesture control (no headset, no phone) | No competitor does webcam-based hand gesture control in-browser without a headset. BioDigital requires Meta Quest. Complete Anatomy uses phone AR with touch gestures. This project uses bare hands + webcam. That is genuinely novel for a web app. | High | MediaPipe Hands for tracking. Two modes: pinch+drag (precision) and open hand wave (casual). This is the hero feature for the capstone demo. |
| Dual gesture modes | Pinch+drag for precision manipulation vs. open hand wave for casual browsing. No competitor offers this choice. Demonstrates understanding of different interaction paradigms. | Medium | State machine switching between modes. Visual indicator of current mode. |
| Explode view | Zygote Body has this. Complete Anatomy has virtual dissection. But combining explode view with hand gesture control is unique. Users spread parts apart with their hands. | Medium | Animate parts outward from centroid. Configurable explosion radius. Works well as a demo moment. |
| Live AR overlay (browser, no app install) | Complete Anatomy requires a native app for AR. BioDigital XR requires a headset. This runs in a browser tab. Zero friction. | Low | Already table stakes for this specific app, but it is a differentiator vs. the broader market since no competitor does browser-based webcam AR for anatomy. |
| Tauri desktop app | Same codebase runs as a native desktop app. Shows cross-platform engineering skill. Slightly better webcam performance than browser. | Low | Tauri wraps the web app. Minimal extra work if the web version works. |

## Anti-Features

Features to deliberately NOT build. Either out of scope for 1-week timeline, or actively harmful to the project.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Quiz/assessment mode | Zygote Body and Complete Anatomy have quizzes, but building a quiz engine is a rabbit hole (question banks, scoring, progress tracking). It does not demonstrate the AR/gesture skill the capstone is about. | Labels and layer toggles already support learning. Mention quiz mode as "future work" in the capstone report. |
| User accounts/authentication | Complete Anatomy and Visible Body have accounts for progress tracking. Adding auth means backend infrastructure, which violates the client-side-only constraint and eats days. | Ship as a standalone client-side app. No login required. |
| Annotation/drawing tools | Visible Body has 3D drawing tools, notes, and shareable annotations. Building a drawing system on top of 3D models is a multi-week feature. | Labels are sufficient for v1. Annotations are a natural v2 feature. |
| Comprehensive anatomy library (thousands of structures) | Complete Anatomy has 13,000+ structures. BioDigital has 700+ models. Sourcing, cleaning, and labeling that much content is impossible in a week. | Ship with 3-5 high-quality models (full body, heart, skull, spine, hand). Quality over quantity. |
| AI-powered identification | Some newer apps use AI to identify structures. This is a separate ML project. | Hand tracking IS the AI/ML component. That is enough technical depth. |
| Multi-user/collaborative AR | BioDigital and Complete Anatomy have classroom sharing. Networking adds complexity and requires a server. | Single-user experience. Keep it simple. |
| Mobile/touch support | The project targets desktop browsers + Tauri. Trying to make hand tracking work on mobile webcams adds device testing burden. | Desktop-first. Chrome/Firefox on desktop. Mention mobile as future work. |
| Pathology/disease models | BioDigital specializes in disease visualization (600+ conditions). This is content work, not engineering. | Focus on healthy anatomy. Pathology is a content expansion, not a v1 feature. |
| Voice commands | BioDigital XR has voice control. Adding speech recognition is another input pipeline to debug. | Hand gestures are the novel input. One novel input method is enough. |

## Feature Dependencies

```
Webcam feed (background) ──> Hand tracking (same camera stream)
                                │
                                ├──> Pinch+drag gesture mode
                                ├──> Open hand wave gesture mode
                                └──> Gesture mode toggle (requires both modes)

3D model rendering ──> Model gallery (need renderer before gallery)
       │
       ├──> Layer toggles (need model with system separation)
       ├──> Labels on tap (need raycasting on rendered model)
       └──> Explode view (need model with separable parts)

Layer toggles ──> require models with named/grouped meshes per body system
Labels ──> require metadata (name, description) per selectable structure
Explode view ──> requires models with individually movable parts
```

**Critical dependency:** Model asset quality determines what features actually work. If sourced models do not have meshes grouped by body system, layer toggles degrade to simple show/hide of individual parts. If parts are not individually named, labels become generic. Source models carefully.

## MVP Recommendation

**Build in this order (dependency-driven):**

1. **3D model rendering + webcam background** -- Foundation. Everything depends on this.
2. **Mouse/keyboard orbit controls** -- Immediate interactivity. Proves the 3D pipeline works.
3. **Hand tracking overlay** -- Get MediaPipe Hands running, show hand landmarks on screen. Proves the tracking pipeline works.
4. **Pinch+drag gesture mode** -- Connect hand tracking to model rotation. This is the hero feature.
5. **Model gallery** -- Let users switch between models.
6. **Labels on tap/click** -- Add educational value.
7. **Layer toggles** -- Show/hide body systems.
8. **Open hand wave gesture mode + mode toggle** -- Second gesture paradigm.
9. **Explode view** -- Polish feature for the demo.

**Defer to post-v1:** Quiz mode, annotations, AI identification, user accounts, pathology content, voice commands, mobile support.

**The demo sequence matters:** For the capstone presentation, the "wow moment" is: open browser, see webcam feed, pinch the air, watch an anatomy model rotate in response. Everything else supports that moment.

## Sources

- [Visible Body vs BioDigital comparison](https://www.visiblebody.com/blog/how-does-visible-body-courseware-compare-with-the-biodigital-human)
- [Visible Body vs Complete Anatomy comparison](https://www.visiblebody.com/blog/how-does-visible-body-courseware-compare-to-3d4medicals-complete-anatomy)
- [BioDigital Human platform](https://human.biodigital.com/)
- [Zygote Body 3D viewer](https://www.zygotebody.com/)
- [Complete Anatomy features](https://3d4medical.com/support/complete-anatomy/ar)
- [Anatomy.app learning platform](https://anatomy.app/)
- [Best anatomy apps 2026 (Voka)](https://voka.io/best-anatomy-apps/)
- [Medscape anatomy apps roundup](https://www.medscape.com/viewarticle/virtual-anatomy-apps-revolutionize-medical-education-look-8-2025a1000cu3)
- [PMC study on anatomy app evaluation](https://pmc.ncbi.nlm.nih.gov/articles/PMC11102696/)
