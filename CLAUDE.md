# Claude Rules — Personal Portfolio

This file tells Claude what this project is, how the owner thinks about
it, and the non-negotiable rules for every change made here. Read this
before touching any file.

---

## What this project is

A personal portfolio for **Jeffrey Moral** — not a traditional page you scroll,
but a 3D sphere you explore by dragging with the mouse. Different directions
on the sphere are different parts of Jeffrey's life. Content (photos, essays,
documents) floats on the surface as tiles you discover, hover to preview, and
click to open.

The five regions are: **Climbing · Family · Friends · Portraits · Data Engineering**

The experience should feel like a *place*, not a list. The interaction — drag,
discover, lean in — is part of the personality being presented.

---

## How Jeffrey thinks about this project

**Content first, always.** Jeffrey is a climber, a photographer, a data engineer.
The portfolio should feel alive with that — photos from real trips, real
portraits, real essays. The technology is in service of that, never the point.

**Explore, don't scroll.** The sphere is the UX. When a feature conflicts with
the navigation feeling good, the navigation wins.

**Growing world.** This portfolio should expand naturally as Jeffrey's life does.
Adding a new climbing trip or a new essay should be trivial — data entry, not
engineering. Never design in a way that makes adding content require code changes.

**Polymorphic content.** Photos are just the start. PDFs, Substack essays, future
formats — they all use the same Tile primitive, just different type handlers.
Design every abstraction to accommodate this from the start.

**Critique and iterate.** Jeffrey wants Claude to grade its own work, find
weaknesses, and improve them — not just produce output and move on. When
something is planned, review it critically before building it.

**Documentation is code.** Every architectural decision, design choice, and
scaling strategy is written down in `docs/`. When behaviour changes, the docs
change in the same commit.

---

## The technical rules (non-negotiable)

### Content is always data
- All content lives in `js/content/manifest.js` (graduating to JSON in Phase 5).
- Publishing a photo or essay = adding an entry to the manifest. Zero other files.
- If adding content requires touching render code, the design is wrong.

### One primitive: the Tile
- Every piece of content on the sphere is a Tile — a 2-D plane at a `{lat, lon}`.
- New content types extend via `tiles/registry.js` (type → handler).
- No `if (type === ...)` outside the registry. Ever.

### One-way dependencies
Follow the module map in `docs/ARCHITECTURE.md §5` strictly:
```
content/  →  (nothing)
core/     →  (nothing from this project)
tiles/    →  core/ + content/
interaction/ + ui/  →  tiles/
main.js   →  all of the above
```
No import cycles. Verify manually when adding a module.

### main.js stays thin
`main.js` is wiring only: import → build → wire → animate loop.
No logic, no constants, no decisions. ≤ 50 lines. If it grows, something
belongs in a module.

### No per-frame allocations
`animate()` and mouse/touch handlers are hot paths. No `new` inside them.
Allocate geometry, materials, vectors, and mesh lists once at setup; reuse
every frame.

### Degrade gracefully, specifically
Every failure mode has a defined output in `docs/CLEAN_CODE.md`. "Graceful
degradation" is not a feeling — it is the exact visual output and console
prefix in that table. Implement the table, not a vibe.

### Verify before shipping
Run `verify/index.html` after any significant change. All checks must be
green before pushing. If a check is wrong, fix the check AND document why.

---

## Design rules

All from `docs/DESIGN.md` — these are the short versions. The mood is a
**dark globe in a white studio**: a dark earth sphere floating in a soft,
near-white room (brightest behind the globe, warm toward the floor), dark ink
type on the open room, one electric-lime marker. Calm, not tactical.

- **One accent: lime.** `--accent` (`#ebfc72`) is the only loud color — active
  states, tags, emphasis. Region hues are muted naturalistic earth tones that
  identify, never shout.
- **Flat and shadowless.** No box-shadows, no backdrop blur, no chrome
  gradients. Hairline `1px` borders; radius 3.6px on controls, zero on
  cards/images. Depth comes from contrast and type scale.
- **Mono is the interface voice — relaxed.** Every UI label, tag, and button
  is JetBrains Mono in sentence case (no uppercase shouting). Inter carries
  editorial text (hero, headings, body) at weight 400 with `-0.03em`
  tracking. Two fonts only.
- **Never `#000000`.** The dark surfaces (panels, ink) are `#13140e`, not pure
  black — the olive cast keeps the dark organic. The room itself is never a
  clinical `#ffffff` either; it stays a warm near-white.
- All colors reference CSS tokens from `:root`. No hard-coded hex in components.
- The same palette lives in `core/theme.js` for Three.js — one source, two
  consumers.
- Respect `prefers-reduced-motion` everywhere: no inertia, no auto-spin,
  fly-to/descend transitions become instant cuts.

---

## The five regions — character reference

| Region           | Accent     | Tile density  | Visual feel                                         |
| ---------------- | ---------- | ------------- | --------------------------------------------------- |
| Climbing         | `#c48468`  | Medium-high   | Dusty clay — warm, muted terracotta                 |
| Landscape        | `#7aaa7e`  | Medium        | Soft moss — gentle green, open space                |
| Music            | `#9e82ba`  | Medium        | Quiet lavender — muted purple, energy               |
| Portrait         | `#c4a46c`  | Low (curated) | Honeyed sand — warm tan, breathing room             |
| Professional     | `#6aa0b4`  | Low-medium    | Hazy teal — soft blue-green, technical feel         |

---

## Phase status

| Phase | Name                        | Status      |
| ----- | --------------------------- | ----------- |
| 0     | Foundation                  | ✅ Done     |
| 1     | Module refactor + manifest  | ✅ Done     |
| 2     | Tile primitive + image type | ⬜ Next     |
| 3     | Additional content types    | ⬜ Planned  |
| 4     | Navigation feel & polish    | ⬜ Planned  |
| 5     | Scale & growth              | ⬜ Planned  |
| 6     | Nice-to-haves               | ⬜ Parked   |

Full detail in `docs/FEATURE_MAP.md`.

---

## How to add content (today)

Edit `js/content/manifest.js`. Add an entry to `NODES`:

```js
{
  id: 'climb-smith-rock-2024',   // unique, no spaces
  region: 'climbing',            // must match a REGIONS id
  lat: 32, lon: -8,              // placement on sphere
  label: 'Smith Rock',           // tooltip on hover
  title: 'Smith Rock, Oregon',   // panel heading
  icon: '🧗',
  body: 'Three days on Monkey Face. The route that changed things.',
}
```

Run `verify/index.html` to confirm the entry is valid. Done.

---

## What Claude should always do

1. **Read before writing.** Read the relevant module and docs before making
   any change. Never guess at the existing structure.
2. **Check the FEATURE_MAP.** Know which phase we're in. Don't build Phase 4
   features during Phase 2 work.
3. **Update docs in the same commit.** If behaviour changes, `docs/` changes.
   If a FEATURE_MAP checkbox gets completed, check it off.
4. **Run the verify suite mentally.** Before pushing, trace through whether
   `verify/checks/` would pass. If unsure, say so.
5. **Grade and iterate.** When asked to review or plan, give an honest grade,
   find the three weakest points in each area, and improve the top ones.
   Don't just produce output — scrutinise it.
6. **Ask before phases.** Before starting a new phase, confirm with Jeffrey
   which phase and confirm any open design decisions for that phase.
7. **Keep navigation sacred.** Any change that makes dragging the sphere feel
   worse is the wrong change, regardless of what it adds.

## What Claude should never do

- Add features, refactor, or introduce abstractions beyond what the current
  phase requires.
- Add content (photos, real captions, real URLs) on Jeffrey's behalf — that is
  Jeffrey's voice.
- Commit without running a structural check (import cycles, main.js line count,
  verify suite status).
- Use hard-coded hex colors in component code — use CSS tokens.
- Allocate objects inside `animate()` or event handlers.
- Push to any branch other than the one specified for the current session.
- Ship a failure mode that doesn't match the degradation contract in
  `docs/CLEAN_CODE.md`.

---

## Key file reference

| I need to...                          | File                              |
| ------------------------------------- | --------------------------------- |
| Add or move a region anchor           | `js/content/manifest.js`          |
| Change the sphere or terrain          | `js/core/sphere.js`               |
| Change lighting, camera, or night sky | `js/core/sceneSetup.js`           |
| Change drag feel, inertia, spin       | `js/interaction/controls.js`      |
| Change descend/orbit, fly-to-region   | `js/interaction/flyTo.js`         |
| Change region jump bar / location label | `js/ui/regionNav.js` `js/ui/coords.js` |
| Change hover/click behaviour          | `js/interaction/picker.js`        |
| Change the detail panel               | `js/ui/panel.js` + `css/style.css`|
| Change colors, type, spacing          | `css/style.css` `:root`           |
| Understand the full build order       | `docs/CODEBASE_GUIDE.md`          |
| Check what's next                     | `docs/FEATURE_MAP.md`             |
| Check a version or browser requirement| `docs/ENVIRONMENT.md`             |
| Understand the design intent          | `docs/DESIGN.md`                  |
| Understand the product vision         | `docs/VISION.md`                  |
