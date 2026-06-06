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

- [ ] Split `main.js` into the module map (core / tiles / interaction / ui)
- [ ] Remove the scene re-grouping cruft in current `main.js`
- [ ] Introduce `content/manifest.js` as the single source of truth
- [ ] Define `REGIONS` for the five real themes (Climbing, Family, Friends,
      Portraits, Data Engineering) with center + spread + color
- [ ] Drive existing nodes from the manifest (data, not hard-code)

## Phase 2 — The Tile primitive

> The "2-D plane placed anywhere on the sphere" becomes real.

- [ ] `Tile.js`: build a tangent plane at a `{lat, lon}` with a thumbnail texture
- [ ] Tiles billboard to the sphere normal; configurable `size`
- [ ] Region tinting (tile glow / border uses its region color)
- [ ] Lazy texture loading (don't load full-res until needed)
- [ ] **Dev placement mode**: drag a tile, read back its `{lat, lon}` to paste
- [ ] Auto-scatter helper: tiles without explicit `position` fill their region

## Phase 3 — Content types (polymorphism)

> One primitive, many contents. See `ARCHITECTURE.md` §3.2.

- [ ] `tiles/registry.js`: `type → { buildThumb, open }`
- [ ] `image` type: thumb on sphere → full-res lightbox with caption/story
- [ ] Hover reveals caption/backstory; click opens full view
- [ ] `pdf` type: cover thumb + badge → embedded viewer or new tab
- [ ] `substack` type: cover thumb + badge → reader overlay (iframe) or new tab
- [ ] `link` type: generic external link tile
- [ ] Graceful fallback for unknown/again-missing assets

## Phase 4 — Navigation feel & polish

> Make exploring genuinely fun.

- [ ] "Fly to region" — click a region label to smoothly orbit the camera there
- [ ] Subtle depth cues: tiles facing away dim / shrink; front tiles pop
- [ ] Region legend / compass so users know what directions hold what
- [ ] Loading state + first-visit hint ("drag to explore") that fades on input
- [ ] Reduced-motion + low-power fallbacks (respect `prefers-reduced-motion`)
- [ ] Mobile pass: tap = hover-preview, second tap = open; pinch handling

## Phase 5 — Scale & growth

> See `SCALING.md` for the detail behind these.

- [ ] Sphere radius/density auto-adjusts to tile count
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
