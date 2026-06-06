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
- Missing asset or unknown content `type` must degrade gracefully, never crash the
  scene.

## Definition of Done (per change)

A change is done only when **all** are true:

- [ ] Adheres to the module map and dependency direction (no cycles).
- [ ] New content type (if any) added purely via the registry.
- [ ] No per-frame allocations introduced in the render/control hot paths.
- [ ] Runs at ~60fps with current content on a mid laptop.
- [ ] Works on mobile (touch) and at small viewport widths.
- [ ] `prefers-reduced-motion` and missing-asset paths handled.
- [ ] Relevant `docs/` updated in the same change; `FEATURE_MAP.md` checkboxes
      reflect reality.
- [ ] No dead code / leftover scaffolding (e.g. the current `main.js` re-grouping
      cruft must go in Phase 1).

## Review checklist (use on every PR)

1. Could this content change have been data instead of code? If yes, make it so.
2. Any `if (type === ...)` outside the registry? Move it in.
3. Any `new` inside `animate()` or move handlers? Hoist it out.
4. Are disposed resources actually disposed?
5. Did the docs change with the behaviour?
6. Is each touched file still one-sentence describable?
