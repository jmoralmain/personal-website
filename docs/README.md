# Documentation

Planning & reference docs for the interactive 3D portfolio. Read in this order:

1. **[VISION.md](VISION.md)** — the concept, the five regions, UX principles. The
   north star for decisions.
2. **[ARCHITECTURE.md](ARCHITECTURE.md)** — how it works now, the Tile primitive,
   the content manifest, and the target module map.
3. **[DESIGN.md](DESIGN.md)** — the visual language: color tokens, region
   accents, typography, depth/light, spacing, motion, and accessibility.
4. **[FEATURE_MAP.md](FEATURE_MAP.md)** — every feature in phases, with status
   checkboxes. Our accountability tracker.
5. **[SCALING.md](SCALING.md)** — trigger-gated strategies for growing content,
   assets, code, and performance.
6. **[CLEAN_CODE.md](CLEAN_CODE.md)** — the standards we hold ourselves to, plus
   a Definition of Done and review checklist.

## TL;DR of the plan

- The whole site is built around **one primitive**: a **Tile** — a 2-D plane
  placed at any `{lat, lon}` on the sphere — that can render a photo, PDF,
  Substack essay, or future type via a **type registry**.
- All content is **data** in a manifest; code only renders it. Publishing =
  editing data.
- **Five regions**: Climbing, Family, Friends, Portraits, Data Engineering.
- The sphere **grows** with content; abstractions are built now, heavy machinery
  is deferred until a trigger fires.
- Next engineering step (Phase 1): refactor the single `main.js` into the module
  map and drive everything from the manifest — no new features, just foundation.
