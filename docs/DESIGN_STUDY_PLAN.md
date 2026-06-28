# Design Study Plan — Globe Integration, About Page, Photo Interaction

> **Branch:** `claude/portfolio-design-study-jsq6s7`  
> **Study date:** 2026-06-28  
> **Reference:** corentinbernadou.com  
> **Phase scope:** Feeds into Phase 4 (Navigation feel & polish)

This document records the findings from a multi-agent study of the reference site
and the current codebase, then translates them into a concrete implementation plan.
It is the authoritative design decision record for the three features: globe integration,
About page, and photo-on-globe interaction.

---

## Part 0 — Why the Reference Site Feels "Designed," Not Vibe-Coded

The short answer is **constraint as signal**. The reference site operates on three
colors, one typeface, and one accent hue. The discipline is visible — users can press
`Option + G` to reveal the underlying grid, and the 3D object sits on a grid cell just
like the text blocks do. Every addition is earned; there are no decorative gradients,
no box-shadows, no backdrop-blur, no chrome.

The six sharpest lessons for Jeffrey's portfolio:

1. **Match the WebGL clearColor to the page background.** The #1 reason 3D objects
   look "pasted in" is a mismatch between the canvas background and the HTML
   background. On the reference site the WebGL renderer clears to the same white as
   the surrounding page. Our sphere already does this (alpha: true, CSS body gradient
   shows through), but the CSS gradient is currently a static approximation that drifts
   on resize — see Part 1.

2. **One accent color, only for interactive state.** Jeffrey already has lime `#ebfc72`.
   A static screenshot of the portfolio should show almost no lime. Lime appears on
   hover, active tile, selected region — nowhere else.

3. **The 3D object is the environment, not the hero.** On the reference site, the cube
   enriches the space the typography lives in; the type dominates. Our sphere should
   feel like a *place* — the region labels, tile labels, and intro text should read
   cleanly even while the sphere is in motion.

4. **Cursor mass.** The reference site's navigation mask physically follows the cursor
   via GSAP, giving the UI weight. A targeted cursor state on our sphere (e.g., a
   crosshair or lime-dot that appears when hovering a tile) adds more "designed" signal
   than any visual effect on the tile itself.

5. **Transitions use `cubic-ease-out` (power3.out), not `ease-in-out`.** The sharp
   deceleration at the end makes motion feel weighted and physical. Fly-to-region,
   tile open/close, panel enter/leave should all use this curve.

6. **Typography is the hierarchy, not color.** The reference site never uses a colored
   background box behind text — text sits directly on the page's white, which happens
   to also be the 3D scene's background. No card panels with their own background
   color except for the detail panel (which intentionally switches to dark ink for
   readability).

---

## Part 1 — Globe Integration (Making the Sphere Feel Placed)

### Diagnosis

The codebase audit identified five specific reasons the globe feels "floating":

| Problem | Root cause |
|---|---|
| Sphere looks painted, not lit | `MeshStandardMaterial` has zero IBL contribution (no `scene.environment`) |
| CSS bloom drifts on resize | Bloom position is hardcoded `circle at 50% 42%` — not derived from camera projection |
| Globe has no ground connection | No contact shadow; it hovers with no physical anchor |
| Ambient + two PointLights overlap | AmbientLight at 1.2 provides fake bounce that IBL should provide — additive when both run |
| Tone mapping exposure | ACESFilmic at 1.0 crushes the dark terrain against the near-white page |

### 1A — Environment Map (IBL via PMREMGenerator)

**Why PMREMGenerator, not CubeCamera:** The globe has roughness 0.95 and metalness 0.0.
It is nearly a pure diffuse surface. It does not need to reflect moving scene objects —
it needs a plausible sense of "living inside a warm bright room." A static environment
map, computed once at startup, costs nothing per-frame.

**What environment to simulate:** The room is a warm studio cyclorama — brightest
directly behind/in front of the sphere, cool-faint overhead, warm floor. Four rows of
a tiny equirectangular `DataTexture` capture this; the PMREM convolution blends smoothly.

**Files changed:**
- `js/core/sceneSetup.js` — add `_buildStudioEnvMap(renderer)`, assign to `scene.environment`
- `js/core/sphere.js` — add `envMapIntensity: 0.35` to `matSolid`

**Key code sketch (sceneSetup.js):**
```js
function _buildStudioEnvMap(renderer) {
  const W = 8, H = 4;
  const data = new Uint8Array(W * H * 3);
  // top → upper → equatorial bloom → floor
  const rows = [
    [0xe8, 0xea, 0xec],   // --room-top
    [0xf6, 0xf6, 0xf3],   // --room-light
    [0xff, 0xfc, 0xf8],   // bloom (warm white)
    [0xe4, 0xe0, 0xd8],   // --room-floor
  ];
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const i = (r * W + c) * 3;
      data[i] = rows[r][0]; data[i+1] = rows[r][1]; data[i+2] = rows[r][2];
    }
  }
  const tex = new THREE.DataTexture(data, W, H, THREE.RGBFormat);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const env = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose(); tex.dispose();
  return env;
}
// In buildScene(): scene.environment = _buildStudioEnvMap(renderer);
```

**Do NOT set `scene.background`** — the CSS body gradient must continue to show through
the alpha-transparent canvas.

**Calibration knobs:**
- `envMapIntensity` on `matSolid`: 0.25–0.5. Start at 0.35. Higher = more room warmth.
- `renderer.toneMappingExposure`: 0.88 (see §1D).
- `AmbientLight` intensity: drop from 1.2 → 0.6 once IBL is active (IBL replaces the
  fake bounce the ambient was approximating).

---

### 1B — CSS Bloom Synchronization

**The problem:** The bloom radial gradient is `circle at 50% 42%`. The globe projects
to viewport center (50%, 50%) on a typical aspect ratio. The 42% nudge was hand-tuned
and breaks on portrait phones where `updateCamera()` changes the camera Z significantly.

**The fix:** Project world origin (globe center) to viewport percent each frame. Write
to two CSS custom properties. The body gradient reads them.

**Files changed:**
- `js/core/sceneSetup.js` — export `syncBloom(camera)`, allocate `_globeNdc` at module
  level (no per-frame allocation)
- `css/style.css` — add `--bloom-x: 50%` and `--bloom-y: 42%` to `:root` as JS fallback;
  replace hardcoded `50% 42%` with `var(--bloom-x) var(--bloom-y)` in body gradient
- `js/main.js` — call `syncBloom(camera)` in `animate()`

**Code sketch:**
```js
// sceneSetup.js — module-level allocation
const _globeNdc = new THREE.Vector3();

export function syncBloom(camera) {
  _globeNdc.set(0, 0, 0);
  _globeNdc.project(camera);
  const x = (_globeNdc.x *  0.5 + 0.5) * 100;
  const y = (_globeNdc.y * -0.5 + 0.5) * 100;
  document.documentElement.style.setProperty('--bloom-x', `${x.toFixed(1)}%`);
  document.documentElement.style.setProperty('--bloom-y', `${y.toFixed(1)}%`);
}
```

**Performance:** `Vector3.project()` is one matrix multiply + divide — negligible.
Writing CSS custom properties triggers style recalc only when the values change. During
dragging, the globe rotates in place and the projected center barely moves, so recalcs
are rare. On resize it corrects within one frame.

---

### 1C — Contact Shadow

**Why CSS, not Three.js shadow plane:** `renderer.shadowMap.enabled` with PointLights
is expensive and produces hard shadow artifacts at globe scale. The design rules say
"flat and shadowless" — a soft CSS elliptical radial gradient reads as a ground contact
shadow without violating that constraint, because it belongs to the room, not to the globe.

**Files changed:**
- `index.html` — add `<div id="contact-shadow"></div>` before `<canvas id="globe">`
- `css/style.css` — add `#contact-shadow` rule
- `js/core/sceneSetup.js` — export `syncContactShadow(camera, sphereR)`
- `js/main.js` — call `syncContactShadow(camera, SPHERE_R)` in `animate()`

**CSS rule:**
```css
#contact-shadow {
  position: fixed;
  left: var(--shadow-cx, 50%);
  top:  var(--shadow-cy, 60%);
  transform: translate(-50%, -50%);
  width:  var(--shadow-rw, 280px);
  height: var(--shadow-rh, 80px);
  border-radius: 50%;
  background: radial-gradient(
    ellipse at center,
    rgba(60, 50, 35, 0.16) 0%,
    rgba(60, 50, 35, 0.05) 55%,
    transparent 100%
  );
  pointer-events: none;
  z-index: -1;   /* behind transparent canvas; above body gradient */
}
```

**Calibration:** Opacity (`0.16` center), `rh` multiplier (~0.28 of screen radius),
and vertical offset from globe bottom are the three tuning numbers. Err on the side
of barely perceptible — too heavy contradicts the "floating in a studio" quality.

---

### 1D — Tone Mapping and Exposure

**Changes (both in sceneSetup.js):**
```js
renderer.toneMapping         = THREE.ACESFilmicToneMapping;  // keep — warm shoulder
renderer.toneMappingExposure = 0.88;   // was implicit 1.0 — opens dark terrain mid-tones
// AmbientLight: intensity 0.6 (was 1.2) — IBL takes over the bounce contribution
```

**Why keep ACESFilmic:** Its warm-highlight bias makes the globe feel like it's in a
warm-lit space. `THREE.NeutralToneMapping` is colder. `THREE.LinearToneMapping` would
blow out the near-white CSS room.

---

### 1E — No Fog

Adding `THREE.Fog` requires setting `scene.background` to the fog color, which would
replace the CSS gradient with a flat Three.js background — breaking the studio room.
The IBL from §1A provides the depth cue that fog would otherwise approximate (back
hemisphere picks up slightly less warm front-environment light → natural limb darkening).
Defer fog to Phase 6 if ever.

---

### 1F — main.js line budget

Current `main.js` is exactly 50 lines. After adding `syncBloom` and `syncContactShadow`
calls in `animate()`, plus one import line, it grows to ~53 lines. To stay compliant,
extract the `animate` closure into `js/core/loop.js`:

```js
// js/core/loop.js
export function startLoop(fn) {
  (function tick() { requestAnimationFrame(tick); fn(); }());
}
```

Then in `main.js`: `startLoop(() => { controls.tick(); ...; renderer.render(scene, camera); });`

This shaves ~3 lines from `main.js` and the loop factory is legitimately core behavior.

---

## Part 2 — About Page

### Design decisions

**Where it lives:** A full-screen overlay, z-index 50 (above lightbox at 40 when closed,
or the lightbox can yield — they are mutually exclusive). It is NOT a separate page route —
the sphere remains live and visible through a semi-transparent or blurred treatment on the
rest of the canvas. It feels like stepping into a room within the room.

**How it opens:** A new "About" link in the top nav (`#topnav`), left of the wordmark or
as a secondary element. Keyboard shortcut: `?` or `A`. The existing `#intro` intro text
fades on first drag — after that, the topnav is the persistent entry point.

**Animation:** Clip-path reveal from bottom — consistent with the "arrive with intention"
principle from the reference site. Not a generic fade.
```css
/* closed */
clip-path: inset(100% 0 0 0);
/* open */
clip-path: inset(0 0 0 0);
transition: clip-path 0.55s cubic-bezier(0.22, 1, 0.36, 1);
```
The cubic-bezier `(.22,1,.36,1)` is the same decelerating "physical weight" curve already
used in the existing panel animation — keeping motion consistent.

**Content source:** A new file `js/content/about.js` that exports an `ABOUT` object:
```js
export const ABOUT = {
  name:     'Jeffrey Morales',
  tagline:  'Climbing. Photography. Data.',
  bio:      [],   // array of short lines — Jeffrey fills in
  facts: [
    { label: 'Based',      value: '' },
    { label: 'Climbing',   value: '' },
    { label: 'Camera',     value: '' },
    { label: 'Stack',      value: '' },
  ],
  links: [
    { label: 'GitHub',   href: '' },
    { label: 'LinkedIn', href: '' },
    { label: 'Email',    href: '' },
  ],
  photo: '',   // path or URL to headshot — Jeffrey provides
};
```
Adding personal content = editing this one file. Zero code changes.

**Layout (Swiss editorial, matches existing design language):**
```
┌─────────────────────────────────────────────────────┐
│  [×]                                                │
│                                                     │
│  JEFFREY MORALES         ┌──────────────────────┐  │
│  ─────────────────       │                      │  │
│  Climbing.               │   [headshot]         │  │
│  Photography.            │                      │  │
│  Data Engineering.       └──────────────────────┘  │
│                                                     │
│  Based in ____   ·   Open to ____                   │
│                                                     │
│  ──────────────────────────────────────────────     │
│                                                     │
│  Camera    ___________                              │
│  Stack     ___________                              │
│  Climbing  ___________                              │
│                                                     │
│  GitHub  ·  LinkedIn  ·  Email                      │
└─────────────────────────────────────────────────────┘
```

**Visual style:**
- Background: dark panel `var(--panel-bg)` = `rgba(19,20,14,0.96)` — same as the
  side panel, consistent ink/room contrast swap
- Name: Inter 400, large display scale (clamp(2rem, 6vw, 5rem)), tracking -0.03em
- Tagline: JetBrains Mono 300, 0.9rem, lime accent `var(--accent)`
- Fact labels: JetBrains Mono 300, muted `var(--ink-dim)` equivalent for dark panels
- Hairline separator: `1px solid rgba(255,255,255,0.1)` — same as existing panel borders
- Links: JetBrains Mono, underline on hover, no background treatment

**New files:**
- `js/content/about.js` — pure data (Jeffrey fills in)
- `js/ui/about.js` — DOM builder, `openAbout()`/`closeAbout()`, keyboard shortcut (`?`
  key preferred over `A` to avoid future navigation conflicts), close button; self-wires
  the `#about-trigger` click listener so `main.js` needs no additional wiring beyond one
  side-effect import.
- `js/ui/modalManager.js` — wraps `openAbout` and `openLightbox` to enforce mutual
  exclusion; neither `about.js` nor `lightbox.js` imports the other (no cycle).

**Changes to existing files:**
- `index.html` — add `<div id="about">` overlay and `#about-trigger` button in topnav
- `css/style.css` — add `#about` rules; `--z-about: 40` (shares modal layer; DOM order
  ensures about sits above lightbox if somehow both open, but JS prevents that)
- `js/main.js` — two side-effect imports: `import './ui/about.js'` and
  `import './ui/modalManager.js'`; stays ≤ 50 lines after loop extraction (see §1F)

**Headshot fallback (in `about.js` populate()):**
```js
document.getElementById('about-headshot').onerror = () => {
  document.getElementById('about-photo-col').style.display = 'none';
  document.getElementById('about-inner').style.gridTemplateColumns = '1fr';
};
```

---

## Part 3 — Photo-on-Globe Interaction ("Frame Mode")

### The reference interaction

On corentinbernadou.com, clicking a project tile rotates the 3D cube to face the project
image forward. The image appears *on the cube face*, not in a separate panel. The globe
equivalent: when you click an image tile, the sphere rotates that tile to face the camera
and descends to surface altitude, the tile expands into a large "frame" showing the full
photo prominently mounted on the globe surface, and other tiles dim. The panel opens as a
caption card with a "View full screen →" button for the lightbox. The globe remains live
and rotatable.

### Options considered

| Option | Description | Verdict |
|---|---|---|
| A | UV-project photo into sphere terrain texture | Globe uses tiled UVs (repeat 3,2) — patches duplicate. Distortion at high latitudes. Destructive texture edit. ❌ |
| B | Scale up existing tile only, no fly-to | At orbit altitude, tile lies flat at steep angle. No navigation cue. Giant tile + panel compete. ❌ |
| C + fly-to | Large surface-attached frame + globe rotates/descends to it | Correct — photo is on the sphere at eye level, with context. ✅ Recommended |
| D | CSS overlay zoom, globe dims behind | Breaks spatial illusion. 3D→2D sync breaks when globe rotates while "zoomed." Duplicates lightbox without improving it. ❌ |

**Recommended: Option C + fly-to = "Frame Mode"**

When a photo tile is clicked:
1. `tiles/types/image.js` handler fires (existing registry pattern, unchanged).
2. Handler calls `enterFrame(tileGroup, data, tileObjects, flyTo)` from `js/ui/frameMode.js`
   instead of calling `openLightbox` directly. (This follows the existing precedent where
   `tiles/types/image.js` already imports `ui/lightbox.js`.)
3. `enterFrame`:
   - Calls `flyTo.flyToRegion({ center: { lat: data.lat, lon: data.lon } })` — globe
     rotates and descends to surface, placing the tile in front of the camera.
   - Loads the full-resolution photo into the tile's existing `material.map` canvas
     (no new Three.js objects; same canvas-based texture swap already used for thumbnails).
   - Sets `tileGroup.userData.isFramed = true` — `tickTile()` lerps scale toward 3.2×.
   - Sets `userData.isDimmed = true` on all other tiles — `tickTile()` dims their opacity.
   - Calls `openPanel({ title, body: caption, onFullscreen: () => openLightbox(...), onClose: exitFrame })`.
4. Globe can still be dragged while framed — tile moves with it (it is a child of
   `sphereGroup`). This is correct: the photo is a surface element, not a DOM overlay.
5. Exit Frame Mode when: panel × is clicked, Escape, background click, different tile
   clicked, orbit button clicked.

**Two-stage hierarchy:** orbit → Frame Mode (spatial, photo on sphere) → lightbox
(full-screen inspect). "View full screen →" is the bridge.

### State additions

New state this feature adds — all write-allocated once, no per-frame allocation:

| Location | State | Type |
|---|---|---|
| `tileGroup.userData.isFramed` | boolean per tile | Set by `frameMode.js` |
| `tileGroup.userData.isDimmed` | boolean per tile | Set by `frameMode.js` on all non-active tiles |
| `js/ui/frameMode.js` module scope | `activeTile` (THREE.Group ref or null) | |
| `js/ui/frameMode.js` module scope | `_scratchCanvas` 512×384 HTMLCanvasElement | Allocated once for full-res draw |

### Changes to `Tile.js` (tickTile hot path)

Add two constants at module scope (no allocations):
```js
const DIM_OPACITY    = 0.28;
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
```

Update the scale lerp:
```js
// was: const s = tileGroup.userData.isHovered ? 1.08 : 1.0;
const s = tileGroup.userData.isFramed  ? 3.2
         : tileGroup.userData.isHovered ? 1.08
         : 1.0;
const lerpSpeed = prefersReduced ? 1 : (tileGroup.userData.isFramed ? 0.09 : 0.12);
tileGroup.scale.lerp(_targetScale.set(s, s, s), lerpSpeed);
```

Add dimming to the opacity section:
```js
const baseOpacity = tileGroup.userData.isDimmed ? DIM_OPACITY : 1;
tileMesh.material.opacity = baseOpacity * alpha;
```

### Changes to `panel.js`

Extend `openPanel` to accept `onFullscreen` and `onClose` callbacks:
```js
let _onClose = null;
export function openPanel({ icon, title, body, onFullscreen, onClose }) {
  _onClose = onClose ?? null;
  // ... existing DOM writes ...
  const fsBtn = document.getElementById('panel-fullscreen');
  if (onFullscreen) { fsBtn.onclick = onFullscreen; fsBtn.classList.remove('hidden'); }
  else { fsBtn.classList.add('hidden'); }
  panel.classList.remove('hidden');
}
// Close button: calls _onClose first so Frame Mode can clean up, then hides panel
closeBtn.addEventListener('click', () => { _onClose?.(); closePanel(); });
```

Add to `index.html` inside `#panel`:
```html
<button id="panel-fullscreen" class="hidden">View full screen →</button>
```

### Changes to `picker.js`

Add an `onBackgroundClick` option to `attachPicker`. When a click hits no tiles, call it:
```js
export function attachPicker(canvas, camera, nodes, tiles, controls, { onBackgroundClick } = {}) {
  // ... existing click handler ...
  // else branch (no hits):
  onBackgroundClick?.();
}
```

Wired from `main.js`:
```js
import { exitFrame } from './ui/frameMode.js';
const picker = attachPicker(canvas, camera, [], tileObjects, controls, {
  onBackgroundClick: exitFrame,
});
```

### Files changed (Part 3)

| File | Action |
|---|---|
| `js/ui/frameMode.js` | **Create** — `enterFrame`, `exitFrame`, full-res canvas swap |
| `js/tiles/Tile.js` | **Modify** — isFramed/isDimmed reads, DIM_OPACITY, prefersReduced, lerpSpeed |
| `js/tiles/types/image.js` | **Modify** — `open()` calls `enterFrame` instead of `openLightbox` directly |
| `js/ui/panel.js` | **Modify** — `onFullscreen` button + `onClose` callback |
| `js/interaction/picker.js` | **Modify** — `onBackgroundClick` callback option |
| `index.html` | **Modify** — add `#panel-fullscreen` button |
| `css/style.css` | **Modify** — `#panel-fullscreen` button styles |
| `js/main.js` | **Modify** — import `exitFrame`, pass `onBackgroundClick` to `attachPicker` |

### Known weak points

1. **Fly-to duck-typing:** `flyTo.flyToRegion({ center: { lat, lon } })` is called with
   a synthetic object. Verify `flyTo.js` only accesses `.center.lat` and `.center.lon`
   before using this call contract.
2. **Drag while framed:** the 3.2× tile sweeps across the viewport when the globe is
   dragged in Frame Mode. This is architecturally correct (surface element, not DOM
   overlay) but can feel disorienting. Document that Frame Mode is designed to be exited
   before navigating to a new area, or dampen drag velocity slightly while active.
3. **In-flight photo loads:** if the user clicks a second tile before the full-res image
   for the first has loaded, `_scratchCanvas` is overwritten. The `activeTile` guard
   (`if (!activeTile) return`) prevents stale application, but the download still
   completes. Acceptable at current content scale.
4. **Orbit button exit:** the "Back to globe" orbit button should call `exitFrame()`.
   Wire this in `main.js` via the existing `onOrbit` callback passed to `attachRegionNav`.

---

## Part 4 — Design Polish (Cursor and Transitions)

These are small but high-signal changes for the "designed vs vibe-coded" gap.

### 4A — Custom cursor state on tiles

When hovering a tile: cursor becomes a `crosshair` (already partially done via CSS).
When hovering the framed tile in Frame Mode: cursor becomes `zoom-in`.
Escape / background click: cursor returns to `default`.

Implemented by setting `document.body.style.cursor` in `frameMode.js` enter/exit,
and a CSS rule for tile hover: `canvas { cursor: crosshair; }` during Frame Mode.

### 4B — Transition curve audit

The existing panel transition uses `cubic-bezier(.22,1,.36,1)` — correct.
Audit all other transitions in `style.css` for `ease-in-out` and replace with
`cubic-bezier(.22,1,.36,1)`. Linear and `ease-in-out` both read as cheap. The
deceleration curve is what makes motion feel weighted and physical.

### 4C — Topnav About button

The `[about]` button sits beneath the wordmark as a small mono label (compact, left-
aligned). Style: JetBrains Mono 300, `var(--fs-label)` size, `var(--ink-dim)` until
hover where it transitions to `var(--accent)`. No background, no border, no underline.
The brand block becomes a two-line unit: `Jeffrey Morales` + `about` below it.

The button wires its own click listener inside `about.js` so `main.js` needs no change
for this specific wiring (the button is an element the module owns).

---

## Implementation Order

The phases below minimize visual regression risk. Each step is independently reviewable.
Steps 1–5 can ship as one PR (globe integration). Steps 6–8 as a second PR (About page).
Steps 9–14 as a third PR (Frame Mode). Confirm with Jeffrey before starting each PR.

| Step | Feature | Files | Risk |
|---|---|---|---|
| 1 | Exposure (0.88) + ambient intensity (0.6→1.2) | sceneSetup.js | Minimal |
| 2 | Studio environment map via PMREMGenerator | sceneSetup.js, sphere.js | Low |
| 3 | Bloom sync (CSS var + `syncBloom`) | sceneSetup.js, style.css, main.js | Low |
| 4 | Contact shadow | index.html, style.css, sceneSetup.js, main.js | Low |
| 5 | `core/loop.js` extraction (keep main.js ≤ 50 lines) | main.js, new core/loop.js | Low |
| 6 | About data file + UI module + keyboard shortcut | new content/about.js, new ui/about.js | Medium |
| 7 | About page HTML + CSS | index.html, style.css | Low |
| 8 | `modalManager.js` (about ↔ lightbox mutual exclusion) | new ui/modalManager.js, main.js | Low |
| 9 | `frameMode.js` skeleton + `enterFrame`/`exitFrame` | new ui/frameMode.js | Medium |
| 10 | `Tile.js` — isFramed/isDimmed reads + DIM_OPACITY + lerpSpeed | tiles/Tile.js | Low |
| 11 | `image.js` open() → enterFrame instead of openLightbox | tiles/types/image.js | Low |
| 12 | `panel.js` — onFullscreen button + onClose callback | ui/panel.js, index.html | Low |
| 13 | `picker.js` — onBackgroundClick callback; wire exitFrame | interaction/picker.js, main.js | Low |
| 14 | Orbit button → exitFrame; transition curve audit | main.js, style.css | Low |

## Complete File Reference

| File | Status | What changes |
|---|---|---|
| `js/core/sceneSetup.js` | Modify | PMREMGenerator env map, syncBloom, syncContactShadow, exposure 0.88, ambient 0.6 |
| `js/core/sphere.js` | Modify | `envMapIntensity: 0.35` on matSolid |
| `js/core/loop.js` | **Create** | `startLoop(fn)` helper to budget main.js |
| `js/main.js` | Modify | Import loop.js; import about.js + modalManager.js (side-effect); wire exitFrame |
| `js/content/about.js` | **Create** | Pure data — Jeffrey fills in |
| `js/ui/about.js` | **Create** | DOM builder, openAbout/closeAbout, keyboard shortcut, self-wires trigger button |
| `js/ui/modalManager.js` | **Create** | Mutual exclusion wrapper: about ↔ lightbox |
| `js/ui/frameMode.js` | **Create** | enterFrame, exitFrame, _scratchCanvas full-res swap |
| `js/ui/panel.js` | Modify | onFullscreen button + onClose callback |
| `js/tiles/Tile.js` | Modify | isFramed/isDimmed reads, DIM_OPACITY const, prefersReduced check, lerpSpeed |
| `js/tiles/types/image.js` | Modify | open() → enterFrame instead of openLightbox directly |
| `js/interaction/picker.js` | Modify | onBackgroundClick callback option |
| `index.html` | Modify | #contact-shadow div; #about overlay + #about-trigger; #panel-fullscreen button |
| `css/style.css` | Modify | #contact-shadow; --bloom-x/y vars; #about rules; #panel-fullscreen; curve audit |

---

## Open Questions for Jeffrey

Before building, confirm:

1. **About page headshot:** Do you have a photo you want to use, or should the layout
   work without one initially?
2. **About content:** The `ABOUT` data structure is ready — fill in bio lines, fact
   values, and links when ready. The module renders whatever is there.
3. **Hero tile vs lightbox:** The plan puts single-click → hero tile, double-click →
   lightbox. Is that the right hierarchy, or do you prefer a button on the hero state
   that opens lightbox?
4. **About trigger:** "About" link in topnav, or elsewhere (e.g., the intro text, a
   dedicated intro button)?
5. **Phase confirmation:** Steps 1–5 are globe integration (Phase 4). Steps 6–7 are
   the About page. Steps 8–10 are the photo interaction. Should we build them
   together or in sequence?
