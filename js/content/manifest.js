// Single source of truth for regions and content.
// Adding a node = appending to NODES. No other file needs to change.

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

// Each node is a region marker — the anchor point for a region on the globe.
// Phase 2 will replace/augment these with full Tile entries (photos, essays, etc.).
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
