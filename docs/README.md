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
5. **[CODEBASE_GUIDE.md](CODEBASE_GUIDE.md)** — how `main.js` works, what each
   module feeds into it, data flow diagrams, and how the structure scales.
7. **[ENVIRONMENT.md](ENVIRONMENT.md)** — pinned dependency versions, CDN URLs,
   browser requirements, content path conventions, and the upgrade checklist.
8. **[SCALING.md](SCALING.md)** — trigger-gated strategies for growing content,
   assets, code, and performance.
6. **[CLEAN_CODE.md](CLEAN_CODE.md)** — the standards we hold ourselves to, plus
   a Definition of Done and review checklist.
9. **[TESTING.md](TESTING.md)** — the two verify layers (structural checks +
   browser smoke test) and how to run them, including headlessly.
10. **[AI_STACK.md](AI_STACK.md)** — the agent/skill stack in `.claude/`: the
    preflight ship gate, the auditor subagents, orchestration patterns, and
    the roadmap for the stack itself.

## TL;DR of the plan

- The whole site is built around **one primitive**: a **Tile** — a 2-D plane
  placed at any `{lat, lon}` on the sphere — that can render a photo, PDF,
  Substack essay, or future type via a **type registry**.
- All content is **data** in a manifest; code only renders it. Publishing =
  editing data.
- **Five regions**: Climbing, Landscape, Music, Portrait, Professional
  (ground truth: `REGIONS` in `js/content/manifest.js`).
- The sphere **grows** with content; abstractions are built now, heavy machinery
  is deferred until a trigger fires.
- Next engineering step (Phase 1): refactor the single `main.js` into the module
  map and drive everything from the manifest — no new features, just foundation.
