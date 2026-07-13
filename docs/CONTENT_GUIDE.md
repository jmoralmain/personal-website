# Adding Content

**Just upload a photo to R2 — it appears on the globe automatically.** No file
editing, no code changes.

## How it works

Photos and documents live **in R2**. Index files
(`r2-indexes/<Folder>/index.json`) live **in the repo** and are now
**auto-generated** from the bucket contents by a GitHub Action
(`Refresh R2 photo index`, see `scripts/refresh_r2_index.py`). The site fetches
the index from the repo, builds a tile for each entry, and loads the actual
image from R2.

```
Upload to R2  ─▶  GitHub Action lists the bucket  ─▶  commits index.json
              ─▶  globe shows a new tile
```

The Action runs hourly, on demand (Actions tab → "Run workflow"), and when the
script itself changes. So after uploading, the photo appears within the hour —
or immediately if you trigger the workflow by hand. **You never edit an index
file to add a photo.**

```
Repo (code + indexes)            R2 (photos + docs only)
─────────────────────            ───────────────────────
r2-indexes/                      Climbing/
  Climbing/index.json  ──────▶    Climbing_MtTam_Nick+Brian_Street.JPG
  Landscape/index.json            Climbing_Tahoe_Nick+Brian_Lean.JPG
  Music/index.json     ──────▶  Music/
  Portrait/index.json             Music_Coachella_Ayybo+GreenVelvet_Yuma.JPG
  Professional/index.json       Portrait/
                                 Professional/
```

## Serving photos reliably

The site loads each photo from the bucket's public base URL, set as `R2_BASE`
in `js/content/manifest.js`.

### The bucket MUST have a CORS policy (or no photos render)

Photos are painted onto the 3D tiles as WebGL textures, which requires loading
the images with `crossOrigin = "anonymous"`. The browser will only let WebGL use
a cross-origin image if the server returns an `Access-Control-Allow-Origin`
header. If the bucket has **no CORS policy**, every image still downloads
(HTTP 200) but the browser blocks WebGL from using it — so the tiles stay as
empty placeholders and *no photos appear*.

Set this once in the Cloudflare dashboard (**R2 → bucket → Settings → CORS
Policy**):

```json
[
  { "AllowedOrigins": ["https://jmoralmain.github.io"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3600 }
]
```

**Gotcha — stale edge cache:** if photos were ever requested before the CORS
policy existed, Cloudflare cached those responses *without* the header and keeps
serving them. The loader appends a version tag (`?v=N`, `ASSET_VERSION` in
`js/content/r2loader.js`) to force a fresh, CORS-enabled fetch. Bump that number
any time the CORS/cache headers change.

The default `https://pub-*.r2.dev` host is Cloudflare's **development** endpoint
and is **rate-limited**. Because every tile requests its image at once, a page
with many photos bursts that limit and most requests get throttled — so only a
few photos appear, and the count varies by device (a fast desktop bursts all at
once and loses the most; a staggered mobile connection or a warm cache gets
more through).

Two mitigations are in place / available:

1. **Client-side (already implemented):** `js/core/imageLoader.js` loads images
   through a small concurrency pool (4 at a time) and retries throttled requests
   with exponential backoff, so the full set comes in even on the dev endpoint.

2. **Custom domain (recommended for production):** In the Cloudflare dashboard,
   connect a custom domain to the R2 bucket (R2 → bucket → Settings → Public
   access → Custom Domains). That serves photos through Cloudflare's CDN with
   real caching and **no `r2.dev` rate limit**. Then change the single
   `R2_BASE` line in `manifest.js` to the new domain.

## index.json format

```json
[
  {
    "file":    "Climbing_MtTam_Nick+Brian_Street.JPG",
    "title":   "Mt Tam — Nick & Brian",
    "caption": "Mt Tamalpais with Nick and Brian.",
    "body":    "Optional longer description shown in the panel."
  },
  {
    "file":    "another-photo.jpg",
    "title":   "Another Climb",
    "caption": ""
  }
]
```

**Required:** `file` — must match the exact filename in R2 (case-sensitive).
**Optional:** `title`, `caption`, `body`, `icon`

The Action writes `{ "file": "..." }` for every photo automatically. A photo
**shows on the globe and opens full-screen even with no title or caption.** If
there is no `title`, the filename minus its extension stands in (hover shows
`Tahoe_Corniche`, not `Tahoe_Corniche.JPG`). If you *want* a caption, add
`title`/`caption` to that entry by hand — the Action **preserves hand-written
titles and captions** on the next refresh (it only adds/removes entries to
match the bucket).

## To add a new region

1. Add one object to `REGIONS` in `js/content/manifest.js`:
   ```js
   {
     id:     'travel',          // unique, no spaces
     label:  'Travel',          // shown in UI
     icon:   '✈️',
     color:  '#fbbf24',         // hex color for glow/border
     folder: 'Travel',          // R2 folder name (case-sensitive)
     center: { lat: 10, lon: 50 }, // where on the globe
     spread: 40,                // region radius in degrees — auto-scattered
                                // photos are contained within this radius
     body:   'Description shown when the region anchor is clicked.',
   },
   ```
2. Create the matching folder in R2 (e.g. `Travel/`) and upload at least one photo
3. Done — the next index refresh creates `r2-indexes/Travel/index.json`, and the
   globe marker, tile loading, and scatter all derive from the manifest entry

## To add a new photo

1. Upload the photo to the correct folder in R2 (e.g. `Climbing/`)
2. That's it. The Action regenerates the index and the photo appears on the
   globe. Trigger "Run workflow" in the Actions tab if you don't want to wait
   for the hourly run.

(Optionally, to add a caption: edit that photo's entry in
`r2-indexes/Climbing/index.json` — your caption is preserved on future refreshes.)

## Folder → region mapping

| R2 Folder    | Region id      |
|--------------|----------------|
| Climbing     | climbing       |
| Landscape    | landscape      |
| Music        | music          |
| Portrait     | portrait       |
| Professional | professional   |

The mapping is defined by the `folder` field on each entry in `REGIONS` in
`js/content/manifest.js`. Adding a new region there automatically registers
its folder — no other file needs to change.

## Notes

- File names are URL-encoded automatically — spaces and `+` signs are handled.
- Photos without explicit `lat`/`lon` in the index are auto-placed along the
  region's trail — evenly spaced stops on a spiral from the region center, so
  spacing stays consistent however many photos the folder holds (the trail
  grows outward with the count, capped at the region's `spread`). A faded
  dashed "Survey Line" trail with upright blaze markers connects the stops on
  the globe.
- To pin a photo at a specific location, add `"lat": 30, "lon": 5` to its entry
  (preserved across refreshes alongside title/caption).
- The `index.json` files are served from the repo alongside the site and are
  regenerated by the `Refresh R2 photo index` Action — you normally never touch
  them by hand.
