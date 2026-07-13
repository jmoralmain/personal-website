# Clean Code & Accountability

The standards we hold ourselves to. Short, enforceable, and specific to this
project. If a PR or change violates these, it's not done.

---

## Guiding principles

1. **Data over code.** Content is data in the manifest; code only *renders* data.
   If publishing a photo requires touching render logic, the design is wrong.
2. **One primitive, many behaviours.** New content types extend via the type
   registry (`ARCHITECTURE.md` §3.2), never via `if (type === ...)` scattered
   through core or interaction code.
3. **One-way dependencies.** Follow the module map in `ARCHITECTURE.md` §5:
   `content` / `core/coords` depend on nothing → `tiles` → `interaction`/`ui` →
   `main`. **No import cycles.**
4. **Keep navigation sacred.** The render loop and controls are hot paths. Don't
   allocate objects per frame; reuse vectors/raycasters. Profile before adding
   work to `animate()`.
5. **Small, honest modules.** A file does one thing. If you can't describe it in
   one sentence, split it.

## Concrete rules

### Structure
- One module = one responsibility, named for what it owns (`controls.js`,
  `picker.js`, `tooltip.js`).
- `main.js` stays a **thin wiring layer**: load manifest → build → start loop. No
  business logic.
- Pure math (coordinates, sizing) lives in `core/coords.js` with **no Three.js
  scene state** so it stays testable.

### Naming
- `camelCase` for variables/functions, `PascalCase` for builder factories/classes
  (`Tile`), `UPPER_SNAKE` for tuned constants (`DRAG_SPEED`, `INERTIA`).
- Names say intent, not type: `tileMesh` not `m`, `regionColor` not `c`.

### Functions
- Prefer small pure functions. Side effects (DOM, scene mutation) are isolated and
  obvious from the function name (`openPanel`, `showTooltip`).
- No magic numbers in logic — name them as constants near the top of the module,
  with a comment on what the value *means*.

### Three.js hygiene
- Build geometry/materials **once**; mutate transforms/uniforms in the loop, don't
  recreate. Dispose geometries/materials/textures when a tile is removed.
- Reuse a single `Raycaster`, `Vector2`, and scratch `Vector3`s — no per-frame
  `new`.
- Load textures lazily and asynchronously; never block the first frame on assets.

### CSS
- Theme via the CSS custom properties already in `:root`. No hard-coded hex in
  component rules — reference the tokens.
- Keep layout responsive; test at mobile width.

### Comments & docs
- Comment the *why*, not the *what*. The code says what.
- When you change behaviour, update the relevant `docs/` file in the **same**
  change. Docs drifting from code is a bug.
- Leave a `// TODO(scope):` with context, never a bare `// TODO`.

### Accessibility & resilience (non-negotiable)
- Respect `prefers-reduced-motion` (no inertia/auto-spin when set).
- Every interactive thing reachable by keyboard where feasible.
- Failures must degrade gracefully. "Graceful" is not a feeling — it is a
  specific visual and behavioral contract defined below.

### Graceful degradation contract

Every failure mode has an exact, agreed output. Deviation from this table is a
bug, not a style choice.

| Failure                            | What the user sees                                                    | What the console shows                        |
| ---------------------------------- | --------------------------------------------------------------------- | --------------------------------------------- |
| `thumb` still loading               | Quiet loam swatch — flat fill, no border, no spinner (region identity comes from the ring plane behind the tile); shows a blurred `data.preview` in place of the swatch if the manifest entry has one, then fades into the real photo over ~350ms when it arrives (instant swap if `prefers-reduced-motion`) | — (expected; no log) |
| `thumb` path 404 / load error (retries exhausted) | Gray tile plane with region-colored border — visually distinct from the loading swatch above, so "still loading" and "gave up" never look the same | `[Tile warn] thumb failed to load: <path>`    |
| `full` image 404 (on click)        | Lightbox opens with gray background + "Image unavailable" message     | `[Tile warn] full image failed: <path>`       |
| `type` not in registry             | Gray placeholder tile, no click action, tooltip says "Unknown type"   | `[Registry warn] unknown type: <type>`        |
| `region` not found in REGIONS      | Tile placed at origin (lat 0, lon 0), orange error border             | `[Manifest error] unknown region: <id>`       |
| Missing required field (`id`,      | Entire tile skipped; does not appear on sphere                        | `[Manifest error] tile skipped: <reason>`     |
| `type`, `title`)                   |                                                                       |                                               |
| Substack iframe blocked (CSP)      | Panel shows title + caption + "Read on Substack →" link button        | `[Substack warn] embed blocked, fallback link`|
| PDF embed fails                    | Panel shows cover thumb + "Open PDF →" link button                   | `[PDF warn] embed failed, fallback link`      |
| JS exception inside a type handler | Only that tile's action fails; sphere and other tiles continue        | Full stack trace, prefixed `[Handler error]`  |
| WebGL context lost                 | Canvas replaced with a static fallback image + "WebGL unavailable"   | `[Scene error] context lost`                  |
| Region has 0 photos                | Spine loop still passes through its center; no branch drawn for it     | — (expected; no log)                          |
| Fewer than 3 region centers        | Branches only, no globe-spanning spine loop                           | `[path] not enough region centers for a spine loop — spine skipped` |
| Trail network throws while building | Photos + territories still render; no trail drawn                     | `[path] trail network failed to build, continuing without it: …` |
| Blaze markers throw while building  | Trail still drawn; no blazes, hover lights nothing (`setActiveBlaze` no-op) | `[blaze] trail markers failed to build, continuing without them: …` |

**Implementation rule:** every `catch` block must (a) log with the prefix above,
(b) produce the exact fallback in the table, and (c) never let the exception
propagate to the render loop. The render loop must be wrapped in a top-level
try/catch that prevents a single frame error from killing the animation.

## Definition of Done (per change)

A change is done only when **all** are true:

- [ ] Adheres to the module map and dependency direction (no cycles).
- [ ] New content type (if any) added purely via the registry.
- [ ] No per-frame allocations introduced in the render/control hot paths.
- [ ] Runs at ~60fps with current content on a mid laptop.
- [ ] Works on mobile (touch) and at small viewport widths.
- [ ] `prefers-reduced-motion` and missing-asset paths handled.
- [ ] Every failure mode produces the exact output in the degradation contract
      table — not "something reasonable," the exact agreed output.
- [ ] Any new manifest entry has all required fields populated; soft-fail fields
      have either a value or an explicit acknowledgment that the placeholder will
      show (i.e., omitting `caption` must be a deliberate choice, not an accident).
- [ ] Relevant `docs/` updated in the same change; `FEATURE_MAP.md` checkboxes
      reflect reality.
- [ ] No dead code / leftover scaffolding committed.

## Review checklist (use on every PR)

1. Could this content change have been data instead of code? If yes, make it so.
2. Any `if (type === ...)` outside the registry? Move it in.
3. Any `new` inside `animate()` or move handlers? Hoist it out.
4. Are disposed resources actually disposed?
5. Did the docs change with the behaviour?
6. Is each touched file still one-sentence describable?
