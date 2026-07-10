---
name: new-tile-type
description: Add a new content type to the globe (PDF, essay, video, …) via the tile registry — the Phase 3 pattern. Use when a new kind of content needs to render on the sphere. Encodes the registry rule so type logic never leaks outside tiles/registry.js.
---

# Adding a new tile content type

CLAUDE.md's rule: everything on the sphere is a Tile, and new types extend
via the registry. **No `if (type === ...)` outside `js/tiles/registry.js`.
Ever.** Before starting, confirm with Jeffrey that this is in-phase work
(check `docs/FEATURE_MAP.md`) and settle open design decisions.

## The pattern

1. **Handler module** — create `js/tiles/types/<type>.js` exporting the
   handler interface the existing types use (read a current handler in
   `js/tiles/types/` first and mirror its exact shape; don't invent a new
   interface). The handler owns: how the tile face renders, what hover
   preview shows, what click opens.
2. **Register it** — one line in `js/tiles/registry.js` mapping the type name
   to the handler. This is the ONLY place the type name may appear in a
   conditional or lookup.
3. **Content stays data** — the new type must be publishable from the
   manifest / R2 index alone. If publishing one requires code, the handler
   isn't finished.
4. **Hot-path discipline** — allocate textures/geometry/materials in the
   handler's setup, never per frame or per hover event.
5. **Degradation contract** — define the failure mode (asset missing, fetch
   fails) as an exact visual output + console prefix, add the row to the
   table in `docs/CLEAN_CODE.md`, and implement precisely that.
6. **Docs, same commit** — CLEAN_CODE table (step 5), FEATURE_MAP checkbox,
   and CONTENT_GUIDE "how to publish one of these".
7. **Add a check** — extend `verify/checks/manifest.js` (or `scene.js`) so an
   entry of the new type is validated, then run `/preflight`.

## Review before building

Per CLAUDE.md's "critique and iterate": after drafting the handler design and
before writing it, grade the plan — where does type logic risk leaking? what's
the failure mode? does hover stay allocation-free? Fix the weakest point of
the plan, then build.
