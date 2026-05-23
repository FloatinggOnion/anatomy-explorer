# Phase 1 Testing Checklist

This document provides step-by-step instructions for testing the AR Anatomy Explorer application across web browsers (Chrome, Firefox) and the Tauri desktop app (Windows).

## Web Build (Chrome & Firefox)

### Setup
1. In the project root, run:
   ```bash
   pnpm dev
   ```
2. Open your browser to `http://localhost:5173`

### Test 1: Pre-permission Flow

- [ ] Page loads and shows **pre-permission screen** with explanation text
- [ ] Text reads: "This app needs camera access to show your webcam feed as the AR background"
- [ ] **"Start Camera" button** is visible and clickable (blue color, hover effect)
- [ ] Click "Start Camera" → browser permission prompt appears
- [ ] **Grant permission** → live webcam feed appears as background (fills viewport)
- [ ] Webcam feed is not inverted or rotated (correct orientation)

### Test 2: 3D Rendering (After Permission Grant)

- [ ] **Skeleton model** is visible in center of screen
- [ ] Model is properly **lit** (not pitch black, not overexposed)
- [ ] Model **auto-rotates smoothly** on page load
- [ ] **Click on model** → rotation stops immediately
- [ ] **Click on background** (not on model) → no effect (expected)
- [ ] Skeleton is the correct size relative to viewport (not too tiny, not oversized)

### Test 3: Permission Denial Case

- [ ] Clear browser site data:
  - **Chrome:** Settings > Privacy & security > Site settings > Camera > click URL > Clear
  - **Firefox:** about:preferences > Privacy & Security > Permissions > Camera, find site and remove
- [ ] Reload page → pre-permission screen shows again
- [ ] Click "Start Camera" → decline permission in browser prompt
- [ ] **Checkerboard pattern** appears instead of video feed
- [ ] **Skeleton model still visible and still interactive** (click to stop rotation)
- [ ] App remains fully usable in mouse-only mode (no console errors)

### Test 4: Permission Persistence

- [ ] Grant permission in Chrome
- [ ] Reload page (Cmd+R or Ctrl+R)
- [ ] **Webcam feed appears immediately** without showing pre-permission screen again
- [ ] Close and reopen the browser tab → repeat test
- [ ] Permission state is remembered across sessions ✓

### Test 5: Performance Check

- [ ] Open DevTools: **Chrome:** F12 → Performance tab; **Firefox:** F12 → Performance tab
- [ ] Record a 5-second performance clip while skeleton is rotating
- [ ] Check **FPS meter** (should show consistently >55 FPS)
- [ ] Look for **dropped frames or stuttering** → none should be present
- [ ] Memory usage should be stable (not climbing continuously)
- [ ] CPU usage should be reasonable (not pegged at 100%)

### Test 6: Cross-Browser Consistency

- [ ] **Run all above tests in Chrome**
- [ ] **Run all above tests in Firefox** (should be identical)
- [ ] If Firefox shows permission prompt differently → this is expected (not a bug)

### Test 7: Console Cleanliness

- [ ] Open DevTools Console (F12)
- [ ] Check for **errors** (red text) → none should appear
- [ ] Check for **warnings** (yellow text) → only third-party warnings acceptable
- [ ] **No warnings about deprecated APIs or failed resource loads**

## Tauri Desktop (Windows)

### Setup
1. On a Windows machine, in the project root, run:
   ```bash
   pnpm tauri dev
   ```
2. Wait 10-15 seconds for Tauri webview to launch
3. A window titled **"AR Anatomy Explorer"** should appear at 1200×800 pixels

### Test 1: Tauri Window Launch

- [ ] Window opens titled "AR Anatomy Explorer"
- [ ] Window is **resizable** (drag corners)
- [ ] Window can be **minimized, maximized, closed** normally
- [ ] Window size is approximately **1200×800 pixels**

### Test 2: Pre-permission Flow (Tauri)

- [ ] Pre-permission screen shows on app launch
- [ ] Same text, same button appearance as web version
- [ ] Click "Start Camera" → **native Windows permission prompt** appears
  - Prompt reads: "Allow [app name] to use your camera?"
- [ ] **Grant permission** → webcam feed appears
- [ ] **Deny permission** → checkerboard pattern appears

### Test 3: 3D Rendering (Tauri)

- [ ] All tests from "Web Build → Test 2" should pass identically
- [ ] Performance should match web build (>55 FPS)
- [ ] No visual differences from web version

### Test 4: Permission Behavior (Windows-Specific)

- [ ] After denying permission once, it is **difficult to re-grant without Windows Settings**
  - This is expected Windows WebView2 behavior (one-way door)
  - Users can re-enable in: **Settings > Privacy & security > Camera > Allow apps to use your camera**
- [ ] If permission is denied and you re-enable in Settings, restart the app
- [ ] App should now have camera access (Settings change takes effect on app restart)

### Test 5: Tauri Console Check

- [ ] In the terminal window running `pnpm tauri dev`, check for errors
- [ ] Should see messages like: `Webview instance loaded`
- [ ] **No red error output** in terminal

### Test 6: Production Build (Optional, Time Permitting)

1. Run:
   ```bash
   pnpm tauri build
   ```
2. Wait 1-2 minutes for build to complete
3. Look in `src-tauri/target/release/bundle/` for:
   - **Windows:** `msi/` folder with `.msi` installer
   - **Windows:** `nsis/` folder (alternative installer format)
4. Optionally run the `.msi` installer and test the installed app

## Known Limitations & Expected Behavior

### Windows WebView2 Permission Behavior
- Camera permission asked on **first launch only**
- Deny = permanent block (until re-enabled in Windows Settings)
- Different from web browsers (where permission can be toggled per-session)
- This is **not a bug** — it's by design in WebView2

### Browser Permission Dialogs
- Chrome: Shows a bar at the top of the page
- Firefox: Shows a popup in the center or corner
- Safari: Not tested (not in Phase 1 scope)
- These UI differences are **normal and expected**

### Checkerboard Pattern
- Appears when camera permission is denied
- 40×40 pixel grid pattern (light gray / white)
- Serves as visual feedback that camera is unavailable
- Model should still be interactive (click-to-pause works)

## Pass/Fail Criteria

### Plan 04 is COMPLETE when:
- [x] **Web (Chrome):** Pre-permission, permission flow, 3D rendering, performance all pass
- [x] **Web (Firefox):** Identical to Chrome (all tests pass)
- [x] **Tauri (Windows):** Window launches, permission flow works, rendering matches web
- [x] **No console errors** in any platform
- [x] **FPS > 55** on all platforms
- [x] **No platform-specific React code** in src/
- [x] **Documentation complete:** This file, PLATFORM-NOTES.md, README updated

### Plan 04 is BLOCKED if:
- [ ] App crashes or fails to load on any platform
- [ ] Console shows errors (excluding third-party)
- [ ] FPS drops below 30 consistently
- [ ] Permission flow doesn't work (camera never appears)
- [ ] Model doesn't render or is not interactive

## Testing Duration

- **Chrome tests:** 10-15 minutes
- **Firefox tests:** 10-15 minutes  
- **Tauri dev mode:** 10-15 minutes
- **Tauri production build (optional):** 2-3 minutes
- **Total:** ~40-60 minutes

---

After completing all tests, report results to verify Phase 1 is complete and ready for Phase 2.
