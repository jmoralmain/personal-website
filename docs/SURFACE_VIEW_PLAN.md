# Surface View — Plan (not yet built)

> Status: **planned**. This documents the design for the "zoom to the surface"
> navigation before any code is written, per the project rule that architectural
> decisions are written down first. Nothing in this doc is implemented yet.

## The goal (in Jeffrey's words)

> "When you first load the screen you see the full globe but eventually I only
> want you to see whatever part of the surface you're on."

So the experience has two altitudes:

1. **Orbit view** (today): the whole globe floating in the ocean. Drag to spin.
   This is the first thing you see — it orients you.
2. **Surface view** (new): you've descended to the water's surface. The globe
   fills the frame; you only see the region you're over, and dragging *travels*
   across the surface rather than spinning a distant ball. It should feel like
   crossing the ocean.

The transition between them is the heart of this feature.

## Why this is its own phase

It touches the three most load-bearing systems at once:

- **Camera** (`core/sceneSetup.js`): a single fixed camera at `z = 6` today.
  Surface view needs the camera to move along a radius (dolly in) and probably
  narrow its FOV, plus a smooth animated transition between altitudes.
- **Controls** (`interaction/controls.js`): today drag rotates `sphereGroup` by
  a fixed `DRAG_SPEED`. In surface view the *same drag gesture* must feel like
  panning across a surface — the rotation-per-pixel has to scale with altitude,
  and inertia/auto-spin behaviour changes.
- **Tile culling** (`tiles/Tile.js`): `tickTile` already fades tiles past the
  limb. Surface view changes what "visible" means and how aggressively tiles
  outside the viewport should unload for performance.

Changing any one of these in isolation risks making the drag feel worse — and
"navigation is sacred" (CLAUDE.md). They need to be designed together.

## Proposed model

Represent the camera by a single **`altitude` scalar** in `[0, 1]`:

- `altitude = 1` → orbit view (`camera.z ≈ 6`, FOV 50, whole globe in frame).
- `altitude = 0` → surface view (`camera.z ≈ SPHERE_R + small`, FOV ~35,
  one region fills the frame).

Everything else is derived from `altitude`, so there is one source of truth for
"how far out am I":

| Derived value        | At orbit (1)      | At surface (0)            |
| -------------------- | ----------------- | ------------------------- |
| `camera.position.z`  | 6.0               | ~`SPHERE_R + 0.6`         |
| `camera.fov`         | 50°               | ~35°                      |
| drag rotation/pixel  | `DRAG_SPEED`      | `DRAG_SPEED * k(altitude)`|
| idle auto-spin       | on                | off                       |
| limb fade aggression | gentle            | strong (tight viewport)   |

`k(altitude)` shrinks the rotation-per-pixel as you descend so that near the
surface a drag moves you a believable distance, not a whole hemisphere.

## Transition triggers (open question — needs a decision)

Three candidate ways to move between altitudes; pick one (or a combo) when we
build:

1. **Scroll / pinch to zoom** — natural, but competes with page scroll on some
   setups and needs a careful mobile pinch handler.
2. **Click a region node to descend** — pairs nicely with the planned
   "fly to region" (Phase 4); click a marker → fly there *and* drop to surface.
3. **Auto-descend after idle** — you stop dragging over a region and the camera
   eases down to it. Risky: can feel like loss of control. Probably not first.

Recommendation: start with **(2) click-to-descend** + an explicit "back up"
control to return to orbit, because it reuses the node picker we already have
and never moves the camera without an explicit user action. Add scroll/pinch
(1) once the altitude model is proven.

## Build order (when we start)

1. Introduce the `altitude` scalar and drive `camera.position.z` + `fov` from it
   (no transition yet — just prove the two static framings look right).
2. Animate `altitude` with the project's standard
   `cubic-bezier(.22,1,.36,1)`, 800ms easing (matches "fly-to-region").
3. Scale drag rotation by `k(altitude)`; disable auto-spin below a threshold.
4. Wire the chosen trigger (click-to-descend + back-up control).
5. Tighten tile culling for the surface viewport; verify 60fps.

## Exit criteria

- Loading the site still shows the full globe first (orbit view unchanged).
- Descending to a region fills the frame with that region and dragging feels
  like travelling across the surface, not spinning a ball.
- Returning to orbit is always one obvious action away.
- `prefers-reduced-motion` turns the transition into an instant cut.
- 60fps maintained at both altitudes with current tile volume.
- Dragging never feels worse at any altitude than it does today.
