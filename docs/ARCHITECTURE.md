# Architecture

How the site works today, and the data model that makes everything in
`VISION.md` and `FEATURE_MAP.md` achievable without rewrites.

---

## 1. Stack

| Concern   | Choice                          | Why                                                |
| --------- | ------------------------------- | -------------------------------------------------- |
| Rendering | **Three.js** (WebGL)            | Mature, well-documented 3D for the web             |
| Delivery  | ES modules + import map via CDN | Zero build step today; trivial to host as static   |
| Hosting   | Any static host (Pages/Netlify) | No server required for the current feature set     |
| Language  | Plain JS (ES2022+)              | Lowest friction; revisit TS at scale (`SCALING.md`)|

There is intentionally **no build step yet**. `SCALING.md` defines the trigger
for introducing one (bundler + local asset pipeline).

---

## 2. Current file layout

```
personal-website/
├── index.html          # Entry; import map + root canvas + overlay DOM
├── css/
│   └── style.css       # Theme tokens, panel, tooltip, intro overlay
├── js/
│   └── main.js         # ⚠️ Everything lives here today — to be split (see §6)
└── docs/               # The documents you are reading
```

> `main.js` is currently a single file and even contains a known cleanup TODO
> (the scene is built once, then re-grouped). The refactor in §6 is the first
> engineering task after these docs are agreed.

---

## 3. The central abstraction: the **Tile**

Everything the user can look at on the sphere is a **Tile** — a 2-D plane
positioned on the sphere's surface. This is the "2-D plane that can pick where it
exists on the sphere" you described. It is the single primitive the whole system
is built around.

A Tile is defined by **data**, rendered by a **renderer chosen from its `type`**,
and **positioned** by a coordinate on the sphere.

### 3.0 Tile render specification (the contract every builder must follow)

These rules are non-negotiable. Any Tile implementation that breaks them is wrong,
regardless of how good it looks locally.

**Orientation & attachment**
- A Tile's plane is always tangent to the sphere surface at its `{lat, lon}`.
  Its normal points *outward* from the sphere center — it lies flush on the globe,
  not floating in space.
- Tiles rotate with `sphereGroup`. They are children of the sphere group, so
  dragging the globe drags every tile with it — no independent transforms.
- Tiles do **not** billboard toward the camera. They are fixed to the surface.
  A tile on the far side tilts away and eventually becomes edge-on; this is
  intentional and sells the physicality of the globe.

**Scale & distance**
- `size: 1.0` corresponds to a plane of **0.28 sphere-radii** on each side
  (roughly 16° of arc at default radius). This is the canonical unit — don't
  hard-code pixel or world-unit values.
- Tiles do **not** scale with camera distance. The sphere radius and camera
  distance are coupled (see `SCALING.md §1`) so apparent tile size stays
  roughly constant as content grows.
- Tiles on the facing hemisphere appear at their authored `size`. Tiles past the
  90° limb are progressively culled (opacity → 0 over a 20° transition zone)
  so the sphere reads as a solid object, not a flat scattering of planes.

**Occlusion**
- Three.js depth testing handles tile-vs-tile occlusion automatically — nothing
  special required as long as tiles are in the same scene graph as the sphere.
- The inner solid sphere uses `depthWrite: true` with a slight negative Z offset
  so back-facing tiles are correctly hidden behind the globe body.

**Hover & selection states**
- **Idle:** border glow at 40% opacity in the tile's region color; thumbnail
  is full brightness.
- **Hover:** border glow pulses to 100%; thumbnail scales uniformly to 1.08×
  (CSS-style `scale`, done via mesh scale on the Three.js object, NOT by
  changing the plane geometry). A world-space label appears above the tile.
- **Active (clicked, panel open):** border stays at 100%; thumbnail desaturates
  slightly to signal that focus has moved to the panel.
- **Back-face / culled:** no interaction possible. Raycasting is skipped for
  tiles whose dot-product(normal, cameraDir) > 0 (facing away).

**Validation at build time**
The manifest loader must validate each tile entry before passing it to `Tile.js`.
Validation failures must be caught early — never let a bad entry reach the render
loop:

| Field      | Rule                                                         | On failure          |
| ---------- | ------------------------------------------------------------ | ------------------- |
| `id`       | unique string, no spaces                                     | throw (hard error)  |
| `region`   | must match an id in `REGIONS`                                | throw (hard error)  |
| `type`     | must exist in registry at load time                          | throw (hard error)  |
| `position` | lat ∈ [-90, 90], lon ∈ [-180, 180]; auto-scatter if omitted  | warn + auto-scatter |
| `size`     | positive number; defaults to 1.0 if omitted                  | warn + default      |
| `thumb`    | required for all types; string path or URL                   | warn + placeholder  |
| `title`    | required string                                              | throw (hard error)  |
| `caption`  | required string (can be empty `""` for Portraits if desired) | warn + empty string |

A **placeholder tile** (gray panel, "missing asset" label, no click action) is
the visual output of a warn-level failure. Hard errors abort the manifest load
and log a clear message — they must never cause an unhandled exception in the
render loop.

### 3.1 Content manifest (the source of truth)

All content lives in data, separate from render code. Proposed shape:

```js
// js/content/manifest.js  (or content.json at scale)
export const REGIONS = [
  { id: 'climbing', label: 'Climbing', color: '#ff8c42',
    center: { lat:  30, lon:    0 }, spread: 45 },
  { id: 'family',   label: 'Family',   color: '#ff6fae',
    center: { lat: -20, lon:   80 }, spread: 40 },
  { id: 'friends',  label: 'Friends',  color: '#7b61ff',
    center: { lat:  20, lon:  160 }, spread: 40 },
  { id: 'portraits',label: 'Portraits',color: '#00d4ff',
    center: { lat: -40, lon: -100 }, spread: 45 },
  { id: 'data',     label: 'Data Engineering', color: '#4ade80',
    center: { lat:  55, lon: -160 }, spread: 50 },
];

export const TILES = [
  {
    id: 'climb-001',
    region: 'climbing',
    type: 'image',                       // selects the renderer + opener
    position: { lat: 28, lon: 4 },       // explicit placement on the sphere
    size: 1.0,                           // relative scale of the plane
    thumb: 'assets/climbing/el-cap.jpg', // what shows on the sphere
    title: 'El Capitan, dawn',
    caption: 'First multi-pitch. Terrified, then hooked.',  // shown on hover
    full: 'assets/climbing/el-cap-full.jpg',                // shown on click
  },
  {
    id: 'data-essay-001',
    region: 'data',
    type: 'substack',
    position: { lat: 52, lon: -150 },
    size: 1.2,
    thumb: 'assets/data/essay-cover.jpg',
    title: 'Idempotent pipelines, in practice',
    caption: 'Why retries are a design problem, not an ops problem.',
    url: 'https://yourname.substack.com/p/idempotent-pipelines',
  },
  {
    id: 'data-pdf-001',
    region: 'data',
    type: 'pdf',
    position: { lat: 58, lon: -168 },
    size: 1.0,
    thumb: 'assets/data/whitepaper-cover.jpg',
    title: 'Warehouse modelling whitepaper',
    caption: 'A reference architecture I wrote up.',
    url: 'assets/data/warehouse-modelling.pdf',
  },
];
```

Adding content = appending an object here. That is the entire publishing flow
for now (`SCALING.md` describes how this graduates to JSON / a generator).

### 3.2 Content types (open set)

`type` is an open enum. Each type maps to two pluggable pieces:

| `type`     | On-sphere appearance       | What "click" opens                          |
| ---------- | -------------------------- | ------------------------------------------- |
| `image`    | Thumbnail on a plane       | Full-res lightbox + caption/story           |
| `pdf`      | Cover thumb + doc badge    | PDF viewer (embedded or new tab)            |
| `substack` | Cover thumb + ✍︎ badge      | Reader overlay (iframe embed) or new tab    |
| `link`     | Thumb + ↗ badge            | External navigation                         |
| *future*   | —                          | Register a new renderer + opener; no core   |
|            |                            | changes required                            |

Adding a new content type must mean **registering a handler**, never editing the
sphere or interaction code. This is the extensibility contract.

---

## 4. Coordinate system & placement

Positions are authored as `{ lat, lon }` in degrees and converted to a 3-D point
on the sphere via the existing `latLonToVec3(lat, lon, r)` helper. Tiles are
**billboarded toward the surface normal** (the plane lies tangent to the sphere)
so they read as "stuck onto" the globe.

To make placement easy (your "ability to pick where it exists"):

- **Phase 2:** a dev-only *placement mode* — drag a tile across the surface and
  it prints/copies the resulting `{ lat, lon }` for pasting into the manifest.
- **Region helpers:** a tile may omit `position` and instead get auto-placed
  along its region's **trail** — even stops on a spiral winding out from the
  region center, spaced a constant interval apart so density stays right at any
  photo count (few photos huddle near the center; more extend the trail, capped
  at the region's `spread`). Bulk-adding photos "just works" and can be
  fine-tuned later. A faded dashed "Survey Line" trail (`tiles/path.js`) connects
  the stops in order, with upright blaze markers standing on it (`tiles/blaze.js`)
  — giving the surface view a marked path to follow. `tiles/scatter.js`
  exports the measured radius (`regionSpreads`) of each trail, which
  `tiles/regionVis.js` uses to draw a proportionally sized territory cap (faint
  accent tint) and boundary ring — so a region with a handful of photos is a
  small territory, while a dense region fills more of the globe.

---

## 5. Runtime module map (target)

The system, once split out of `main.js`, is a few focused modules with one-way
dependencies (see `CLEAN_CODE.md` for the rules):

```
content/manifest.js     → pure data (REGIONS, TILES)
core/theme.js           → the WebGL color palette (leaf; mirrors :root tokens)
core/coords.js          → latLonToVec3 + placement math (pure, testable)
core/sceneSetup.js      → renderer, scene, camera, lights (golden-hour rig)
core/sphere.js          → the globe group, terrain texture
tiles/Tile.js           → builds one tile mesh from a manifest entry
tiles/scatter.js        → trail placement: jittered Archimedean spiral per region
tiles/path.js           → dashed "Survey Line" trail through each region's stops
tiles/blaze.js          → upright blaze markers on the trail; hover lights one lime
tiles/regionVis.js      → Voronoi cells + boundary lines covering the full globe
tiles/loadTiles.js      → load → scatter → build tiles + paths + blazes + visuals
tiles/registry.js       → maps type → { buildThumb, open } handlers
tiles/types/image.js    → image handler         ┐
tiles/types/pdf.js      → pdf handler           ├ one file per content type
tiles/types/substack.js → substack handler      ┘
interaction/controls.js → drag, inertia, idle spin, touch (altitude-scaled)
interaction/picker.js   → raycasting: hover (tooltip + lights blaze) + click (open)
interaction/flyTo.js    → altitude model: fly-to-region, descend/orbit camera
ui/lightbox.js          → full-screen photo view
ui/panel.js             → region detail overlay
ui/tooltip.js           → hover label
ui/regionNav.js         → region jump bar + return-to-orbit (from manifest)
ui/coords.js            → location label (names the region in view)
main.js                 → thin wiring: load manifest → build → start loop
```

**Dependency direction:** `content`, `core/coords`, and `core/theme` depend on
nothing; `tiles` depend on `core` + `content`; `interaction`/`ui` depend on
`tiles`; `main` depends on all. No cycles.

> `core/theme.js` and `core/coords.js` are **foundational leaves** (no project
> imports of their own), so any layer may import them — they carry shared
> data (palette, math) the way `content/manifest.js` carries shared content.

---

## 6. First engineering task (post-docs)

Before adding features, do the **non-functional refactor**:

1. Extract the modules in §5 out of `main.js` with no behaviour change.
2. Delete the known scene re-grouping cruft in the current `main.js`.
3. Introduce `content/manifest.js` and drive the existing nodes from it.

This is the foundation every phase in `FEATURE_MAP.md` builds on.

---

## 7. Data flow (one frame / one interaction)

```
manifest ──load──▶ Tile builder ──▶ sphereGroup (meshes)
                                        │
mouse drag ──▶ controls ──▶ rotate sphereGroup
mouse move ──▶ picker ──raycast──▶ hover? ──▶ tooltip.show(tile.caption)
click       ──▶ picker ──raycast──▶ hit?   ──▶ registry[type].open(tile)
```
