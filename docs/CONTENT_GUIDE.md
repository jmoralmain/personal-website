# Adding Content

Everything lives in R2. No code changes needed to add photos.

## How it works

Each region has a folder in your R2 bucket. Inside that folder is a `_index.json`
file listing the photos. The site fetches that index on load, auto-places every
photo evenly around the region, and shows them as tiles on the sphere.

```
R2 bucket: pub-32f646c68df74615a84d9be9717511f2.r2.dev
├── Climbing/
│   ├── _index.json          ← list of photos in this folder
│   ├── Climbing_MtTam_Nick+Brian_Street.JPG
│   └── another-photo.jpg
├── Family/
│   ├── _index.json
│   └── ...
├── Friends/
├── Portraits/
└── Data/
```

## _index.json format

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

## To add a new photo

1. Upload the photo to the correct folder in R2 (e.g. `Climbing/`)
2. Edit `_index.json` in that folder — add an entry with `"file"` matching the filename
3. Re-upload the updated `_index.json`
4. Reload the site — the photo appears automatically, scattered within the region

## Folder → region mapping

| R2 Folder  | Region            |
|------------|-------------------|
| Climbing   | climbing          |
| Family     | family            |
| Friends    | friends           |
| Portraits  | portraits         |
| Data       | data              |

## Notes

- File names are URL-encoded automatically — spaces and `+` signs are handled.
- Photos without explicit `lat`/`lon` in the index are auto-scattered evenly
  within the region's spread radius using a Fibonacci spiral pattern.
- To pin a photo at a specific location, add `"lat": 30, "lon": 5` to its entry.
- The `_index.json` is fetched fresh each page load — no cache busting needed
  for new entries, though CDN caching may cause a short delay (usually < 5 min).
