# Scaling

How this grows from "a handful of placeholder dots" to "hundreds of photos plus
essays and PDFs" without a rewrite. Each section gives a **trigger** (when to act)
and a **plan** (what to do).

---

## 1. Content volume → sphere sizing

**Goal:** as content is added, the world grows so it never feels cramped.

- **Now:** fixed sphere radius, a few tiles.
- **Trigger:** average tile density per region passes a comfortable threshold
  (tiles start visually overlapping).
- **Plan:**
  - Make sphere radius a function of total tile count, e.g.
    `radius = clamp(BASE + k * sqrt(tileCount), BASE, MAX)`.
  - Scale camera distance with radius so framing stays constant.
  - Within a region, place tiles with a minimum angular separation; if a region
    gets dense, expand its `spread` or push radius up.
  - Tiles keep a fixed *screen-ish* size via `size`, independent of radius.

## 2. Authoring workflow → from manifest to pipeline

**Goal:** publishing stays cheap as the catalogue grows.

- **Now:** hand-edit `js/content/manifest.js`.
- **Trigger:** editing the manifest by hand becomes error-prone (dozens+ items),
  or you want non-code publishing.
- **Plan (in order):**
  1. Move data to `content.json` (data leaves code entirely).
  2. Add a small Node script that scans an `assets/<region>/` folder, generates
     thumbnails, reads EXIF/sidecar captions, and emits `content.json` with
     auto-scattered positions (overridable per item).
  3. Only if truly needed: a tiny headless CMS or a Google-Sheet/Notion export
     feeding the same JSON. Keep the renderer agnostic — it only consumes JSON.

## 3. Images → asset performance

**Goal:** many high-res photos without tanking load time or memory.

- **Now:** raw JPGs referenced directly; full-res only on click.
- **Triggers & plans:**
  - *Thumbnails:* always render small thumbs on the sphere; load `full` only on
    open. (Do this early — Phase 2/3.)
  - *Many textures:* batch small thumbs into a **texture atlas** to cut draw
    calls and GPU memory.
  - *Large textures:* adopt **KTX2 / Basis** compressed textures via Three's
    loader once raw JPG memory becomes the bottleneck.
  - *Network:* responsive sizes + lazy load by proximity (only fully prepare
    tiles near the camera's facing hemisphere).

## 4. Content types → plugin growth

**Goal:** PDFs, Substack essays, and future formats slot in cleanly.

- **Now:** `type` switch is the design (`ARCHITECTURE.md` §3.2) but not yet a
  registry.
- **Trigger:** the second content type (PDF or Substack) — don't wait.
- **Plan:** implement `tiles/registry.js` so each type is an isolated module
  exporting `{ buildThumb, open }`. Adding a type never touches core/interaction.
  - *Substack:* prefer embedding the public post in a reader overlay (iframe);
    fall back to opening in a new tab. Store only the `url` in the manifest.
  - *PDF:* embedded viewer (`<iframe>`/pdf.js) or new tab; store `url` + a cover
    `thumb`.

## 5. Codebase → build step & types

**Goal:** keep DX healthy as the code grows past a few modules.

- **Now:** plain JS, ES modules, import map, no bundler.
- **Triggers:**
  - You need npm packages that don't ship as ESM/CDN, **or**
  - module count and asset handling make "no build" painful, **or**
  - you want type safety to prevent manifest/handler mismatches.
- **Plan:**
  - Introduce **Vite** (fast, minimal config) for bundling + local dev server +
    asset hashing.
  - Adopt **TypeScript** incrementally — start by typing the manifest schema and
    the type-registry contract (the two places mistakes hurt most).
  - Add a lint/format pass (ESLint + Prettier) wired into the same step.

## 6. Performance budget (the guardrail)

Hold these as we scale; revisit a phase if any is breached:

| Metric                     | Budget                                   |
| -------------------------- | ---------------------------------------- |
| Frame rate (mid laptop)    | ~60fps during drag                        |
| Initial load (sphere ready)| Fast first paint; no full-res on startup |
| GPU memory                 | Thumbs atlased/compressed at high counts |
| Tiles considered per frame | Cull/deprioritise back-facing hemisphere |

## 7. Hosting → still static, then maybe not

- **Now & likely forever:** static hosting (GitHub Pages, Netlify, Vercel).
- **Only if** you add server-side needs (private content, auth, contact form
  backend) do you introduce serverless functions — keep the explorer static.

---

## Sequencing principle

Don't pre-build for scale you don't have. Each item above is gated on a
**trigger**. Build the abstraction *seams* now (manifest, tile primitive, type
registry) because they're cheap; defer the *machinery* (atlases, build step,
generators) until a trigger fires.
