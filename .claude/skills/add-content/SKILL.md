---
name: add-content
description: Add photos or a new region to the globe — the data-entry workflow (R2 upload + auto-generated indexes + manifest REGIONS). Use when Jeffrey wants content added, a photo isn't showing up, or a new region created. Content is data — if the task seems to require touching render code, the task is being done wrong.
---

# Adding content (photos, regions)

Full reference: `docs/CONTENT_GUIDE.md`. The prime directive from CLAUDE.md:
**publishing content is data entry, never engineering** — and Claude never
writes captions, titles, or body copy on Jeffrey's behalf. That's his voice;
leave those fields for him or ask him for the words.

## Add a photo

1. Jeffrey uploads the file to the right folder in the R2 bucket (Climbing/,
   Landscape/, Music/, Portrait/, Professional/). Claude cannot upload to R2.
2. The GitHub Action **"Refresh R2 photo index"** regenerates
   `r2-indexes/<Folder>/index.json` hourly. To make it appear now, trigger the
   workflow (`workflow_dispatch` on `refresh-r2-index.yml`) via the GitHub MCP
   tools, then confirm the Action's commit landed on main.
3. **Never hand-edit `r2-indexes/*/index.json`** — the Action owns those files
   and will overwrite manual edits within the hour.

## Photo not showing up? (debug order)

1. Index: is the file listed in `r2-indexes/<Folder>/index.json`? If not, the
   Action hasn't run since upload — trigger it.
2. CORS: photos load as WebGL textures and silently stay blank without an
   `Access-Control-Allow-Origin` header on the bucket. See CONTENT_GUIDE
   "Serving photos reliably" — includes the stale-edge-cache gotcha
   (`ASSET_VERSION` bump in `js/content/r2loader.js`).
3. Rate limiting: the `pub-*.r2.dev` host is a throttled dev endpoint;
   `js/core/imageLoader.js` pools and retries, but a custom domain on
   `R2_BASE` is the real fix.

## Add a region

Edit `REGIONS` in `js/content/manifest.js` only — one object with `id`,
`label`, `icon`, `color`, `folder`, `center: {lat, lon}`, `spread`, `body`
(ask Jeffrey for label/icon/body — his voice). Create the matching folder in
R2. Everything (marker, scatter, jump bar, loader) derives from the manifest.
Then update the region table in `CLAUDE.md` and any docs listing regions
(same commit), and run `/verify-site`.
