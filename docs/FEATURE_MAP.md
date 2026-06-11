# Feature Map

Everything we want to build, grouped into phases. Each phase is shippable on its
own. Check items off as they land — this doubles as our accountability tracker.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done

---

## Phase 0 — Foundation ✅ (done)

- [x] Full-screen WebGL sphere (Three.js via CDN, no build step)
- [x] Drag-to-rotate with inertia + gentle idle auto-rotation (mouse & touch)
- [x] Placeholder interest nodes on the surface
- [x] Hover tooltip + click side panel
- [x] Starfield background, theme tokens, intro overlay

## Phase 1 — Real structure (the refactor)

> No new user-facing features. Makes everything after this possible.
> See `ARCHITECTURE.md` §5–6.

**Tasks**
- [x] Split `main.js` into the module map in this order (each step must leave the
      site working):
      1. Extract `core/coords.js` (pure math, no imports)
      2. Extract `core/sceneSetup.js` (renderer, camera, lights, starfield)
      3. Extract `interaction/controls.js` (drag, inertia, touch)
      4. Extract `interaction/picker.js` (raycasting, hover, click)
      5. Extract `ui/tooltip.js` and `ui/panel.js`
      6. `main.js` is now only wiring
- [x] Remove the scene re-grouping cruft in current `main.js`
- [x] Introduce `content/manifest.js` as the single source of truth
- [x] Define `REGIONS` for the five real themes (Climbing, Family, Friends,
      Portraits, Data Engineering) with center + spread + color
- [x] Drive existing nodes from the manifest (data, not hard-code)

**Exit criteria — Phase 1 is done when:**
- The site looks and behaves *exactly* as it did at end of Phase 0 (no regressions).
- `main.js` is ≤ 40 lines and contains only imports + wiring calls.
- Each module is describable in one sentence.
- Adding a new entry to the manifest makes a new node appear on the globe with
  zero changes to any other file.
- No import cycles (verify manually or with a cycle-check script).

---

## Phase 2 — The Tile primitive + type registry

> Phase 2 and 3 are merged because a Tile mesh without a type handler is an
> incomplete abstraction. The `image` handler ships alongside `Tile.js`.
> See `ARCHITECTURE.md` §3.0, §3.2.

**Tasks**
- [ ] `tiles/registry.js`: `type → { buildThumb, open }` — the registry exists
      before any handler; unknown types render the placeholder tile
- [x] `tiles/types/image.js`: the first real handler (thumb on sphere, lightbox
      on click, caption on hover) — ships alongside `Tile.js`. Full-screen
      lightbox lives in `ui/lightbox.js`; title/caption are optional (the photo
      shows regardless).
- [ ] `Tile.js`: tangent plane at `{lat, lon}`, textured from `buildThumb()`,
      conforms fully to the render spec in `ARCHITECTURE.md §3.0`
- [ ] Tiles attached to `sphereGroup`; rotate with the globe
- [ ] Back-face culling: tiles past the 90° limb fade out; no raycasting on them
- [ ] Region tinting (border glow uses region color from manifest)
- [ ] Hover state: scale 1.08×, border 100% opacity, world-space label
- [ ] Lazy thumbnail loading; placeholder tile shown while loading / on error
- [ ] Manifest validation (see `ARCHITECTURE.md §3.0` validation table) runs at
      load time; hard errors logged clearly; soft failures show placeholder
- [x] Auto-scatter helper: tiles without explicit `position` fill their region
      — placed as evenly spaced stops along a per-region spiral trail
      (`tiles/scatter.js`), with a dashed route line connecting them
      (`tiles/path.js`)
- [ ] **Dev placement mode**: drag a tile, copy `{lat, lon}` to clipboard

**Exit criteria — Phase 2 is done when:**
- All five regions are populated with at least one real `image` tile (actual
  photos, not placeholders).
- A tile with a broken `thumb` path shows the placeholder, not a console error
  and a black plane.
- Adding an `image` tile to the manifest requires *only* adding the manifest
  entry and dropping the asset file — zero other changes.
- Back-facing tiles are invisible; front-facing tiles at the limb transition
  smoothly.
- Dev placement mode correctly logs `{lat, lon}` when a tile is dragged.
- ~60fps maintained with up to 30 tiles on a mid laptop.

---

## Phase 3 — Additional content types

> Extend the registry. Core and interaction code must not change.

**Tasks**
- [ ] `tiles/types/pdf.js`: cover thumb + doc badge → PDF viewer or new tab
- [ ] `tiles/types/substack.js`: cover thumb + ✍︎ badge → reader overlay or
      new tab (decision on embed vs. tab is a product call — document in VISION)
- [ ] `tiles/types/link.js`: generic external link with ↗ badge
- [ ] Graceful fallback for `type` values not in registry at runtime

**Exit criteria — Phase 3 is done when:**
- At least one real PDF tile and one real Substack tile exist in the manifest
  and open correctly.
- Adding either type requires *only* a registry entry + manifest update; no
  changes to `Tile.js`, `picker.js`, `controls.js`, or `panel.js`.
- An unknown `type` in the manifest logs a warning and shows the placeholder;
  it does not throw.

---

## Phase 4 — Navigation feel & polish

> Make exploring genuinely fun.

**Tasks**
- [x] **Surface view** — descend from the orbit view to the surface so you only
      see the region you're over; dragging travels across the surface (drag
      speed scales with altitude). Designed in `docs/SURFACE_VIEW_PLAN.md`,
      built in `interaction/flyTo.js`.
- [x] "Fly to region" — click a region button to smoothly rotate there and
      descend (`ui/regionNav.js` + `interaction/flyTo.js`)
- [ ] Subtle depth cues: tiles facing away dim / shrink; front tiles pop
- [x] Region legend / compass — region-jump bar (bottom-right) + a location
      label (`ui/coords.js`) that names the region in view, so you always know
      where you are and where to go
- [ ] Loading state + first-visit hint ("drag to explore") that fades on input
- [ ] Reduced-motion + low-power fallbacks (respect `prefers-reduced-motion`)
- [ ] Mobile pass: tap = hover-preview, second tap = open; pinch handling

**Exit criteria — Phase 4 is done when:**
- A first-time visitor on mobile understands the interaction within 5 seconds
  without being told.
- "Fly to region" animates smoothly at 60fps and lands in the correct region.
- `prefers-reduced-motion` completely disables inertia and auto-rotation.
- The site is usable (all content reachable) on a 375px wide viewport.

## Phase 5 — Scale & growth

> See `SCALING.md` for the detail behind these.

- [ ] Sphere radius/density auto-adjusts to tile count
- [x] Dynamic photo index: `scripts/refresh_r2_index.py` + the
      `Refresh R2 photo index` GitHub Action regenerate `r2-indexes/*/index.json`
      from the R2 bucket, so uploading a photo makes a tile appear with no file
      editing. Hand-written titles/captions are preserved across refreshes.
- [ ] Move manifest to JSON; consider a small generator for bulk photo import
- [ ] Texture atlas / compressed textures (KTX2) for many photos
- [ ] Introduce a build step (bundler) once CDN + single-file stops scaling
- [ ] Optional: image CDN / responsive thumbnails

## Phase 6 — Nice-to-haves (parking lot)

- [ ] Deep links (`?tile=climb-001`) so a specific item is shareable
- [ ] Search / filter by region or keyword
- [ ] Ambient audio toggle
- [ ] Analytics on what people explore
- [ ] "Latest" beacon that highlights newly added content

---

## Cross-cutting requirements (apply to every phase)

- Performance: stay at 60fps on a mid laptop with the current content volume.
- Accessibility: keyboard navigation path + reduced-motion respected.
- Authoring: adding content stays "edit the manifest", never "edit render code".
- Extensibility: a new content type = a new registry entry, nothing in core.
