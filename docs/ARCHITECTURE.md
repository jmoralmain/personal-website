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
- **Region helpers:** a tile may omit `position` and instead get auto-scattered
  within its region's `center ± spread`, so bulk-adding photos "just works" and
  can be fine-tuned later.

---

## 5. Runtime module map (target)

The system, once split out of `main.js`, is a few focused modules with one-way
dependencies (see `CLEAN_CODE.md` for the rules):

```
content/manifest.js     → pure data (REGIONS, TILES)
core/sceneSetup.js      → renderer, scene, camera, lights, starfield
core/sphere.js          → the globe group, wireframe shell, region tinting
core/coords.js          → latLonToVec3 + placement math (pure, testable)
tiles/Tile.js           → builds one tile mesh from a manifest entry
tiles/registry.js       → maps type → { buildThumb, open } handlers
tiles/types/image.js    → image handler         ┐
tiles/types/pdf.js      → pdf handler           ├ one file per content type
tiles/types/substack.js → substack handler      ┘
interaction/controls.js → drag, inertia, idle spin, touch
interaction/picker.js   → raycasting: hover (tooltip) + click (open)
ui/panel.js             → lightbox / reader overlay
ui/tooltip.js           → hover label
main.js                 → thin wiring: load manifest → build → start loop
```

**Dependency direction:** `content` and `core/coords` depend on nothing;
`tiles` depend on `core` + `content`; `interaction`/`ui` depend on `tiles`;
`main` depends on all. No cycles.

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
