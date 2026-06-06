# Adding Content

Everything lives in R2. No code changes needed to add photos.

## How it works

Index files live **in the repo** (`r2-indexes/<Folder>/index.json`).
Photos and documents live **in R2**. The site fetches the index from the repo,
builds a tile for each entry, and loads the actual image from R2.

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
     spread: 40,                // region radius in degrees
     body:   'Description shown when the region anchor is clicked.',
   },
   ```
2. Create the folder in R2 and upload an empty `index.json` (`[]`) inside it
3. Done — the globe marker, tile loading, and scatter all derive from the manifest entry

## To add a new photo

1. Upload the photo to the correct folder in R2 (e.g. `Climbing/`)
2. Edit `r2-indexes/Climbing/index.json` in the repo — add one entry
3. Commit and push — the photo appears on the globe automatically

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
- Photos without explicit `lat`/`lon` in the index are auto-scattered evenly
  within the region's spread radius using a Fibonacci spiral pattern.
- To pin a photo at a specific location, add `"lat": 30, "lon": 5` to its entry.
- The `index.json` files are served from the repo alongside the site — updating
  them is a normal git commit, no R2 changes needed.
