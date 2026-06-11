// ─────────────────────────────────────────────────────────────────────────────
// SINGLE SOURCE OF TRUTH — regions and content tiles.
//
// TO ADD A NEW REGION:
//   1. Append one object to REGIONS below (id, label, color, folder, center, spread)
//   2. Create that folder in R2 and upload a _index.json inside it
//   3. That's it — the globe marker, scatter, and folder loader all derive from here.
//
// TO ADD A PHOTO:
//   Upload the file to the correct R2 folder, then edit _index.json in that folder.
//   No code changes needed. See docs/CONTENT_GUIDE.md.
// ─────────────────────────────────────────────────────────────────────────────

// Public base URL for the R2 bucket. The pub-*.r2.dev host is Cloudflare's
// DEVELOPMENT endpoint and is rate-limited — bursting it with many photo
// requests at once gets most of them throttled (see docs/CONTENT_GUIDE.md →
// "Serving photos reliably"). For production, connect a custom domain to the
// bucket in the Cloudflare dashboard and swap this one line to it, e.g.
//   export const R2_BASE = 'https://cdn.jeffreymoral.com';
export const R2_BASE = 'https://pub-32f646c68df74615a84d9be9717511f2.r2.dev';

export const REGIONS = [
  {
    id:     'climbing',
    label:  'Climbing',
    icon:   '🧗',
    color:  '#c86a3a',
    folder: 'Climbing',
    center: { lat:  30, lon:    0 },
    spread: 55,
    body:   'Adventures on rock — routes, trips, and the stories behind them.',
  },
  {
    id:     'landscape',
    label:  'Landscape',
    icon:   '🏔',
    color:  '#4daa66',
    folder: 'Landscape',
    center: { lat: -20, lon:   80 },
    spread: 50,
    body:   'Wide open spaces. The world as it is.',
  },
  {
    id:     'music',
    label:  'Music',
    icon:   '🎵',
    color:  '#8a5cc0',
    folder: 'Music',
    center: { lat:  20, lon:  160 },
    spread: 50,
    body:   'Sound, rhythm, and the people behind it.',
  },
  {
    id:     'portrait',
    label:  'Portrait',
    icon:   '📷',
    color:  '#c09a38',
    folder: 'Portrait',
    center: { lat: -40, lon: -100 },
    spread: 55,
    body:   'Portrait photography — my craft work.',
  },
  {
    id:     'professional',
    label:  'Professional',
    icon:   '⚙️',
    color:  '#3a8faa',
    folder: 'Professional',
    center: { lat:  55, lon: -160 },
    spread: 60,
    body:   'Data engineering, essays, and ideas from working in tech.',
  },
];

// Auto-generate the globe anchor node for each region.
// Each node is the glowing dot/ring marker at the region center.
export const NODES = REGIONS.map(r => ({
  id:     `region-${r.id}`,
  region: r.id,
  lat:    r.center.lat,
  lon:    r.center.lon,
  label:  r.label,
  title:  r.label,
  icon:   r.icon,
  body:   r.body,
}));

// Pinned tiles — explicitly positioned content that bypasses auto-scatter.
// Use this for hero shots or content you want at a specific lat/lon.
// Most photos should live in R2 folders + _index.json instead.
export const TILES = [];
