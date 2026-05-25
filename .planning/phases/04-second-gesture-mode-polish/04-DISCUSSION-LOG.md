# Phase 4: Second Gesture Mode & Polish - Discussion Log

**Date:** 2026-05-25  
**Participants:** Paul (user), Claude (builder)  
**Mode:** Standard discussion with --chain auto-advance

---

## Discussion Summary

Phase 4 adds a second gesture mode (open hand wave) alongside pinch+drag, with explicit mode toggling and polish for capstone demo. All major implementation decisions were captured through structured questioning.

---

## Decision Areas & Outcomes

### 1. Gesture Mode Toggle Mechanism
**Question:** How should users switch between pinch+drag and open hand wave?

**Options presented:**
- Button toggle (explicit user choice)
- Auto-detect by hand pose
- Mode-lock per gesture

**User selected:** **Button toggle** — Explicit, no ambiguity. User controls mode via toolbar button.

**Rationale noted:** Clear visual state, predictable behavior for demo.

---

### 2. Swipe Rotation Implementation
**Question:** How should swipes map to rotation?

**Options presented:**
- Hand velocity → rotation speed
- Swipe distance → rotation amount
- Hand position → trackball rotation (drag-like)

**User selected:** **Recommended approach (drag-like)** — Hand position directly maps to trackball rotation, reusing existing pinch+drag logic.

**Rationale noted:** Lowest risk (proven code path), consistent feel, no new gesture detection needed.

---

### 3. Zoom Gesture Feel
**Question:** How should spread/fist zoom work?

**Options presented:**
- Binary toggle (step in/out)
- Continuous (finger distance → zoom level)
- Hybrid (hold to zoom, speed depends on distance)

**User selected:** **Hybrid** — Hold spread to zoom in continuously; zoom speed proportional to spread distance. Same for fist/zoom-out.

**Rationale noted:** Balances precision with ease of use.

---

### 4. Two-Hand Zoom Behavior
**Question:** How should two-hand zoom work?

**Options presented:**
- Single hand only
- Both hands supported independently
- Two-hand pinch distance (like pinch-to-scale)

**User selected:** **Two-hand pinch distance** — Distance between spread hands determines zoom level, like pinch-to-scale but with open hands.

**Rationale noted:** Most powerful, consistent with existing scale gesture.

---

### 5. Visual Mode Indicator
**Question:** How does user know which mode is active?

**Options presented:**
- Highlighted button (active state)
- On-screen text label
- Hand pose indicator overlay

**User selected:** **Highlighted button (active state)** — Button styling shows active mode at a glance.

**Rationale noted:** Clean, familiar UI pattern.

---

### 6. Gesture Conflict Handling
**Question:** How should we handle gesture reliability?

**Options presented:**
- Same thresholds as Phase 2/3 (hysteresis + debounce)
- Mode-aware thresholds (stricter in active mode)
- Hand state locking (prevent mode thrashing)

**User selected:** **Same thresholds (Phase 2/3 pattern)** — Reuse existing `PINCH_ENTER`, `PINCH_EXIT`, `DEAD_ZONE_PX` constants. Both modes use the same tunable values.

**Rationale noted:** Minimal new code, proven reliability.

---

### 7. Pinch Behavior in Wave Mode
**Question:** Should pinch+drag still work in wave mode?

**Options presented:**
- Completely isolated (pinch disabled in wave mode)
- Pinch still allowed (secondary control)

**User selected:** **Completely isolated** — Pinch has no effect in wave mode. Clean separation, prevents accidental conflicts.

**Rationale noted:** Reduces cognitive load, clear mode semantics.

---

### 8. Inspect Mode Interaction
**Question:** How should Inspect mode (explode control) and Wave mode coexist?

**Options presented:**
- Wave mode takes priority (Inspect mode ignored)
- Gesture mode decides (Inspect only works in pinch+drag)
- Inspect and Wave are mutually exclusive

**User selected:** **Mutually exclusive** — If Inspect mode is on, Wave mode button is disabled. If user switches to Wave mode, Inspect mode auto-disables.

**Rationale noted:** Simplest, prevents gesture conflicts, clear mode switching rules.

---

### 9. Polish Scope
**Question:** What polish items are in scope?

**Options presented (multiSelect):**
- Visual effects (bloom, particles, lighting)
- Gesture feel & responsiveness (tuning, easing)
- Demo-ready UX (error handling, loading states, permission flows)
- Performance (frame rate, bundle size, memory)

**User selected:** **All four** — Visual effects, gesture feel & responsiveness, demo-ready UX, and performance.

**Rationale noted:** Capstone project requires both technical polish and visual impression.

---

## Key Decisions Locked for Planning

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Mode toggle | Button (explicit) | Clear, predictable, no ambiguity |
| Swipe rotation | Hand position → trackball | Reuses pinch+drag logic, low risk |
| Zoom gesture | Hybrid (hold, speed-based) | Balances precision and ease |
| Two-hand zoom | Spread distance (like pinch-to-scale) | Consistent, powerful |
| Mode indicator | Highlighted button | Familiar UI pattern |
| Gesture reliability | Phase 2/3 thresholds (shared) | Proven, minimal new code |
| Pinch in wave mode | Disabled (isolated) | Clean, prevents conflicts |
| Inspect ↔ Wave | Mutually exclusive | Clear semantics, prevents conflicts |
| Polish scope | Visual + gesture + UX + perf | Capstone-ready, all vectors |

---

## Integration Notes for Planning Phase

- **Store extension:** `gestureMode: 'pinch' | 'wave'` field needed in Zustand
- **Gesture interpreter:** Branch on `gestureMode` state; reuse `isSpread()`, `isFist()`, `isPointing()` functions (already exist)
- **UI:** Add gesture mode toggle button in BottomToolbar; hide if Inspect mode active
- **OrbitControls:** No changes; wave mode reuses same instance without requiring pinch
- **Inspect mode:** Auto-disable and hide Wave mode button when active
- **Polish:** Visual effects (bloom optional), tuning gesture responsiveness, error state polish, performance profiling

---

## Deferred Items

None — all Phase 4 scope items were discussed and locked.

---

*Log generated by claude-code discuss-phase workflow*
*Status: Ready for /gsd-plan-phase*
