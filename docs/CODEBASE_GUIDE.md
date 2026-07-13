# Codebase Guide: main.js and the Module System

How `main.js` works, what each module feeds into it, and how the
structure scales as the portfolio grows.

---

## The core idea

`main.js` does not contain any logic. It is a **wiring file** — its only
job is to call the right functions in the right order, connect their outputs
together, and start the animation loop. Every real concern (rendering,
content, interaction, UI) lives in a focused module that `main.js` reaches
for. This means you can read `main.js` and understand the whole system in
under a minute, then follow any import to find the detail.

---

## What main.js does, line by line

```js
// 1. Imports — pull in exactly what's needed from each module layer
import { buildScene }      from './core/sceneSetup.js';
import { buildSphere }     from './core/sphere.js';
import { attachControls }  from './interaction/controls.js';
import { attachPicker }    from './interaction/picker.js';
import { attachFlyTo }     from './interaction/flyTo.js';
import { tickTile }        from './tiles/Tile.js';
import { loadRegionTiles } from './tiles/loadTiles.js';
import { attachRegionNav } from './ui/regionNav.js';
import { tickCoords }      from './ui/coords.js';
import { REGIONS, TILES }  from './content/manifest.js';

// 2. Bootstrap — build the environment (renderer, scene, camera)
const canvas = document.getElementById('globe');
const { renderer, scene, camera } = buildScene(canvas);

// 3. Build the globe — the sphere group that rotates when dragged
const { sphereGroup } = buildSphere();
scene.add(sphereGroup);

// 4. Load content — tiles stream in from the R2 indexes asynchronously
const regionMap = Object.fromEntries(REGIONS.map(r => [r.id, r]));
const tileObjects = [];
loadRegionTiles(REGIONS, TILES, regionMap).then(/* add to sphereGroup */);

// 5. Wire navigation — altitude model, region jump bar, drag controls, picking
const flyTo = attachFlyTo(sphereGroup, camera);
const nav   = attachRegionNav(REGIONS, { onJump, onOrbit });
const controls = attachControls(canvas, sphereGroup, onDragStart, flyTo.getAltitude);
attachPicker(canvas, camera, [], tileObjects, controls);

// 6. Animate — the loop that runs every frame (~60fps)
(function animate() {
  requestAnimationFrame(animate);
  controls.tick();                 // inertia / auto-spin
  flyTo.tick();                    // fly-to-region + altitude animation
  tickCoords(sphereGroup);         // location label (region in view)
  tileObjects.forEach(tile => tickTile(tile, camera));  // limb fade, hover
  renderer.render(scene, camera);
}());
```

Six steps. No logic of its own — just orchestration. (Abridged — see the
real `js/main.js`; it stays ≤ 50 lines.)

---

## The module map

```
content/manifest.js          ← pure data; no imports except comments
       │
       ▼
core/coords.js               ← pure math (lat/lon ↔ 3D point / rotation)
core/sceneSetup.js           ← renderer, camera, lights
core/sphere.js               ← the globe mesh (bare terrain body)
core/nodes.js                ← builds dot/ring meshes from manifest data
       │                        (imports coords.js and sphere.js)
       ▼
tiles/…                      ← Tile primitive, type registry, loader, scatter
       │
       ▼
interaction/controls.js      ← drag, touch, inertia, idle auto-spin
interaction/picker.js        ← raycasting: hover tooltip + click panel
interaction/flyTo.js         ← altitude model: fly-to-region, descend/orbit
       │                        (picker imports ui/tooltip.js and ui/panel.js)
       ▼
ui/tooltip.js                ← show/hide the hover label
ui/panel.js                  ← open/close the detail panel
ui/lightbox.js               ← full-screen photo view
ui/regionNav.js              ← region jump bar + return-to-orbit button
ui/coords.js                 ← location label (names the region in view)
       │
       ▼
main.js                      ← wires all of the above together
```

Arrows mean "depends on." The key rule: **arrows only point downward**.
No module imports from a layer above it. `content` and `coords` import
nothing from this codebase at all. This means you can change any module
without risking a surprise effect on a module it doesn't know about.

---

## Each module explained

### `content/manifest.js` — the source of truth

**What it is:** A plain data file. Two exported arrays — `REGIONS` and
`NODES` — that define everything on the sphere.

**What feeds into it:** Nothing. It is the starting point. Humans edit
it; code reads it.

**What it feeds:** `main.js` imports it directly and passes it to
`buildNodes`. In Phase 2 it will also feed the Tile builder. In Phase 5
it will graduate to a JSON file so non-developers can edit it without
touching code.

**How to use it today:** To add a new region anchor, append one object to
`NODES`. The sphere updates automatically on the next page load. No other
file changes.

---

### `core/coords.js` — coordinate math

**What it is:** One exported function, `latLonToVec3(lat, lon, r)`.
Converts a geographic position (degrees latitude and longitude) to an
`(x, y, z)` point on a sphere of radius `r`.

**What feeds into it:** Nothing from this codebase — only `three` for
the `Vector3` type.

**What it feeds:** `core/nodes.js` uses it to place each node on the
sphere surface. `core/sphere.js` will use it indirectly for Tile placement
in Phase 2. It is the one function that all positioning on the globe
depends on — if the coordinate math ever needs to change (e.g. to support
a different projection), this is the only file to touch.

---

### `core/sceneSetup.js` — the rendering environment

**What it is:** Exports `buildScene(canvas)`. Creates the WebGL renderer,
the Three.js scene, the camera, the two colored point lights, and the
starfield. Also owns the window resize handler.

**What feeds into it:** `main.js` passes the canvas element.

**What it feeds:** Returns `{ renderer, scene, camera }` to `main.js`,
which passes `scene` and `camera` onward to the sphere builder and the
picker.

**How it scales:** Right now the lights are hard-coded. In Phase 4 this
module will gain a `setRegionLight(regionId)` function that `main.js` can
call when the camera orbits near a region, tinting the ambient light to
that region's accent color (see `DESIGN.md §4.1`).

---

### `core/sphere.js` — the globe body

**What it is:** Exports `buildSphere()` and the constant `SPHERE_R`.
Builds a `THREE.Group` containing the solid terrain sphere (procedural
moss-and-earth grain texture). The terrain is bare — the survey graticule
was removed so photos and trails are the only marks on the ground.

**What feeds into it:** `main.js` calls it with no arguments.

**What it feeds:**
- Returns `{ sphereGroup }` to `main.js`.
- `sphereGroup` is added to the scene and passed to `attachControls` and
  `attachFlyTo` — everything that must rotate with the globe is added
  as a child of this group.
- `SPHERE_R` is imported by `core/nodes.js`, `tiles/Tile.js`, and
  `interaction/flyTo.js` to position things relative to the surface.

**How it scales:** In Phase 5, `buildSphere` will accept a `radius`
argument (computed from tile count) instead of always using `SPHERE_R = 1`.
The camera distance in `sceneSetup.js` will scale in tandem to keep the
sphere framed the same way regardless of size.

---

### `core/nodes.js` — content onto the globe

**What it is:** Exports `buildNodes(sphereGroup, nodes, regionMap)`.
Reads the manifest node list, converts each entry's `{lat, lon}` to a
3D position, creates the glowing dot and ring meshes, colors them with
their region's accent, and adds them as children of `sphereGroup`.

**What feeds into it:**
- `manifest.js` (the node data, passed via `main.js`)
- `core/coords.js` (for position calculation)
- `core/sphere.js` (for `SPHERE_R`, to place nodes 0.04 units above
  the surface)

**What it feeds:** Returns `nodeObjects` — an array of
`{ mesh, ring, data, pulseOffset }` — to `main.js`, which passes it to
both `attachPicker` and the animate loop.

**How it scales:** In Phase 2 this module is joined (or replaced) by
`tiles/Tile.js`, which builds full 2-D texture planes instead of dots.
The interface stays the same — `main.js` will still receive an array of
objects it passes to the picker and the animate loop. The node dot format
stays for region anchors; Tiles are the new format for photo/essay content.

---

### `interaction/controls.js` — drag and movement

**What it is:** Exports
`attachControls(canvas, sphereGroup, onDragStart, getAltitude)`.
Listens for mouse and touch drag events on the canvas, rotates `sphereGroup`
in real time, and manages inertia (the sphere coasts after release) and idle
auto-spin (when nothing has been touched for a moment). Drag speed scales
with altitude (slower near the surface, so a drag travels a believable
distance) and auto-spin is disabled at the surface. Respects
`prefers-reduced-motion`.

**What feeds into it:** `main.js` passes the canvas element, the
`sphereGroup`, a callback that fades the intro overlay (and cancels any
fly-to animation) on first drag, and `flyTo.getAltitude`.

**What it feeds:** Returns a `state` object with:
- `state.isDragging` — read by `picker.js` to set the right cursor
- `state.tick()` — called by `main.js` every frame to apply inertia /
  auto-spin

Nothing else in the codebase touches rotation directly — all globe movement
goes through this module.

**How it scales:** Fly-to-region landed in Phase 4 as its own module,
`interaction/flyTo.js` (not inside controls): it owns the altitude scalar,
animates rotation + descent on a region jump, and exposes `getAltitude` for
controls to read. The drag logic here stayed unchanged apart from the
altitude scaling.

---

### `interaction/picker.js` — hover and click

**What it is:** Exports `attachPicker(canvas, camera, nodeObjects, controls)`.
On every `mousemove`, casts a ray from the camera through the cursor and
checks if it hits any node mesh. If it does: shows the tooltip and
highlights the node in its hover color. On `click`, opens the detail panel.
On miss: resets the previous hover and hides the tooltip.

**What feeds into it:**
- `main.js` passes the camera, the `nodeObjects` array, and `controls`
  (for the `isDragging` cursor check)
- `ui/tooltip.js` — to show/hide the hover label
- `ui/panel.js` — to open the detail panel on click

**What it feeds:** Nothing is returned — it registers event listeners and
drives the UI modules as a side effect.

**How it scales:** In Phase 2, `nodeObjects` will include Tile meshes
alongside node dots. `picker.js` does not need to change — it works with
any array of objects that have `{ mesh, data }`. The click handler will
call `registry[data.type].open(data)` instead of always calling
`openPanel` directly, routing different content types to different openers.

---

### `ui/tooltip.js` — hover label

**What it is:** Two functions — `showTooltip(text, x, y)` and
`hideTooltip()`. Finds the `#tooltip` DOM element and toggles its content,
position, and visibility class.

**What feeds into it:** `picker.js` calls both functions.

**What it feeds:** The DOM.

**How it scales:** This module is complete as-is. In Phase 4 it may grow
a region-color tint (border color matching the hovered node's region) but
the interface stays the same.

---

### `ui/panel.js` — detail panel

**What it is:** Two exports — `openPanel({ icon, title, body })` and
`closePanel()`. Populates the `#panel` DOM element and toggles its
`hidden` class (which CSS animates as a slide + fade). `closePanel` is
also wired to the close button internally.

**What feeds into it:** `picker.js` calls `openPanel` on click.

**What it feeds:** The DOM.

**How it scales:** This is currently a generic text panel. In Phase 2/3
it becomes a **dispatcher**: instead of always rendering `{ icon, title,
body }`, it will call `registry[data.type].open(data)` and let the type
handler decide what the panel shows — a lightbox for images, an embedded
reader for Substack essays, a PDF viewer for documents.

---

## How a single interaction flows through the system

To make this concrete: here is what happens from the moment you click a
node to the moment the panel is visible.

```
1. User clicks on the canvas
   └─ window 'click' listener in picker.js fires

2. picker.js calls pick(e.clientX, e.clientY)
   └─ sets mouse vector from screen coords
   └─ raycaster.setFromCamera(mouse, camera)   ← camera from sceneSetup.js
   └─ raycaster.intersectObjects(meshes)        ← meshes built by nodes.js

3. Hit found — nodeObjects.find() matches mesh to its nodeObject
   └─ nodeObject.data comes from manifest.js (icon, title, body, etc.)

4. picker.js calls openPanel(node.data)
   └─ panel.js populates #panel DOM elements
   └─ panel.classList.remove('hidden')
   └─ CSS (style.css) animates opacity + translateX into view
```

Five files touched. Each one only does its part.

---

## How this scales over time

### Adding content (now through Phase 5)

| Stage       | What you do                                         | What changes in code |
| ----------- | --------------------------------------------------- | -------------------- |
| Now         | Add an entry to `NODES` in `manifest.js`            | Nothing              |
| Phase 2     | Add a Tile entry (image/pdf/substack) to `manifest.js` | Nothing             |
| Phase 5     | Drop a photo in `assets/climbing/`; run a generator | Generator writes `content.json`; nothing manual |

Adding content never touches any module other than the manifest. That is
the contract the whole system is built to uphold.

### Adding a new content type (Phase 2/3)

A new type (e.g. `video`) requires:
1. A new file `tiles/types/video.js` exporting `{ buildThumb, open }`
2. One line in `tiles/registry.js` registering it
3. Entries in `manifest.js` with `type: 'video'`

`main.js`, `picker.js`, `controls.js`, `sphere.js` — none of them change.

### Adding a new interactive behaviour (Phase 4 — done, as built)

"Fly to region" + surface descent landed as:
1. `interaction/flyTo.js` — owns the altitude scalar and the rotation/descent
   animation (`flyToRegion(region, tiles)` — descends onto the photo nearest
   the region's photo cluster, falling back to the region center when no photos
   have loaded; `toOrbit()`, `getAltitude()`)
2. `ui/regionNav.js` — builds the jump buttons from `REGIONS` and calls back
   into `main.js`'s wiring
3. `main.js` — connects the two and adds `flyTo.tick()` to the animate loop

Content, the picker, and the UI panels were untouched.

### Growing the sphere (Phase 5)

When tile count gets dense:
1. `sphere.js` accepts `radius` as an argument (currently always `1`)
2. `main.js` computes `radius` from `NODES.length + TILES.length`
3. `sceneSetup.js` adjusts `camera.position.z` in proportion

Three files, no logic changes in any other module.

### Introducing a build step (Phase 5)

When the CDN import map stops being enough (more npm deps, asset hashing,
TypeScript):
1. Add `vite.config.js` at the repo root
2. The import map in `index.html` is replaced by Vite's module resolution
3. Every `.js` file stays exactly as-is — they are already standard ES
   modules and require no changes for Vite to bundle them

The module structure was designed to be bundler-agnostic from day one.

---

## Reading guide: where to go for what

| I want to...                              | Start here                     |
| ----------------------------------------- | ------------------------------ |
| Add a new region or move a node           | `content/manifest.js`          |
| Change how nodes look on the sphere       | `core/nodes.js`                |
| Change the sphere size or terrain         | `core/sphere.js`               |
| Change lighting, camera, or the night sky | `core/sceneSetup.js`           |
| Change drag feel, inertia, auto-spin      | `interaction/controls.js`      |
| Change descend/orbit or fly-to-region     | `interaction/flyTo.js`         |
| Change the region jump bar or location label | `ui/regionNav.js` / `ui/coords.js` |
| Change what happens on hover or click     | `interaction/picker.js`        |
| Change the tooltip appearance/position    | `ui/tooltip.js` + `css/style.css` |
| Change the panel layout or animation      | `ui/panel.js` + `css/style.css`   |
| Change colors, type, spacing tokens       | `css/style.css` `:root`        |
| Understand the full visual design intent  | `docs/DESIGN.md`               |
| Understand what gets built next           | `docs/FEATURE_MAP.md`          |
