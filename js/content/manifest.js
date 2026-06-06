// Single source of truth for regions and content.
// To add a photo: append an entry to TILES with type:'image' and the R2 src URL.
// No other file needs to change.

export const R2_BASE = 'https://pub-32f646c68df74615a84d9be9717511f2.r2.dev';

export const REGIONS = [
  {
    id: 'climbing',
    label: 'Climbing',
    color: '#ff8c42',
    center: { lat:  30, lon:    0 },
    spread: 45,
  },
  {
    id: 'family',
    label: 'Family',
    color: '#ff6fae',
    center: { lat: -20, lon:   80 },
    spread: 40,
  },
  {
    id: 'friends',
    label: 'Friends',
    color: '#7b61ff',
    center: { lat:  20, lon:  160 },
    spread: 40,
  },
  {
    id: 'portraits',
    label: 'Portraits',
    color: '#00d4ff',
    center: { lat: -40, lon: -100 },
    spread: 45,
  },
  {
    id: 'data',
    label: 'Data Engineering',
    color: '#4ade80',
    center: { lat:  55, lon: -160 },
    spread: 50,
  },
];

// Region anchor nodes — the glowing dot/ring markers on the globe.
export const NODES = [
  {
    id: 'region-climbing',
    region: 'climbing',
    lat:  30, lon:    0,
    label: 'Climbing',
    title: 'Climbing',
    icon: '🧗',
    body: 'Adventures on rock and ice — routes, trips, and the stories behind them.',
  },
  {
    id: 'region-family',
    region: 'family',
    lat: -20, lon:   80,
    label: 'Family',
    title: 'Family',
    icon: '🏡',
    body: 'The people who matter most. Moments worth keeping.',
  },
  {
    id: 'region-friends',
    region: 'friends',
    lat:  20, lon:  160,
    label: 'Friends',
    title: 'Friends',
    icon: '🤝',
    body: 'Good people, good times.',
  },
  {
    id: 'region-portraits',
    region: 'portraits',
    lat: -40, lon: -100,
    label: 'Portraits',
    title: 'Portraits',
    icon: '📷',
    body: 'Portrait photography — my craft work.',
  },
  {
    id: 'region-data',
    region: 'data',
    lat:  55, lon: -160,
    label: 'Data Engineering',
    title: 'Data Engineering',
    icon: '⚙️',
    body: 'Essays, pipelines, and ideas from working in data.',
  },
];

// Content tiles — photos, PDFs, essays floating on the sphere surface.
// type:'image' → renders a photo tile; clicking opens the full image in the panel.
// Add new entries here; the sphere picks them up automatically.
export const TILES = [
  {
    id: 'climb-mt-tam-nick-brian',
    type: 'image',
    region: 'climbing',
    lat:  28, lon:   8,
    label: 'Mt Tam with Nick & Brian',
    title: 'Mt Tam — Nick & Brian',
    icon: '🧗',
    src: `${R2_BASE}/Climbing/Climbing_MtTam_Nick%2BBrian_Street.JPG`,
    caption: 'Mt Tamalpais with Nick and Brian.',
  },
];
