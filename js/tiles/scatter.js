// Auto-scatter: takes a list of tile data entries and lays them out as a clean,
// non-crossing SWITCHBACK GRID centered on the region — like a hiking trail
// zigzagging up a slope. Rows are walked in serpentine order so consecutive
// trail stops are always grid neighbors and the road never crosses itself.
// Crucially the whole grid is CONTAINED within the region's `spread` radius:
// a region's photos never wander into a neighbor's territory (the old
// constant-curvature arc marched 38°/photo across the globe, dumping photos
// into photo-less regions). Adding a photo to R2 just works.

import { REGIONS } from '../content/manifest.js';
import { destinationPoint, initialBearing } from '../core/coords.js';

const regionMap = Object.fromEntries(REGIONS.map(r => [r.id, r]));

// A tile's on-sphere footprint in degrees of arc (TILE_W 0.65 / TILE_H 0.4875
// at SPHERE_R=2). Grid steps must always exceed these or photos touch.
const TILE_W_DEG = 19;
const TILE_H_DEG = 14;

// Preferred spacing (degrees) between photo centers — a ~0.4-unit world gap
// around each tile. The grid compresses below this only when a region has so
// many photos it must tighten to stay inside its spread, and never below the
// tile footprint + margin, so photos can crowd but never overlap.
const COL_STEP = 30;
const ROW_STEP = 24;

// Photo centers stay within this fraction of the region's spread radius, so a
// half-tile of overhang at the grid edge still lands inside the region.
const FIT = 0.8;

// Bearing of the spine as it passes through each region center (toward the next
// center by longitude). A branch leaves perpendicular to this, heading into the
// open polar space rather than toward a neighbor region. Precomputed once.
const spineBearing = (() => {
  const ordered = REGIONS
    .filter(r => r.center && typeof r.center.lat === 'number')
    .sort((a, b) => a.center.lon - b.center.lon);
  const out = {};
  ordered.forEach((r, i) => {
    const nx = ordered[(i + 1) % ordered.length];
    out[r.id] = initialBearing(r.center.lat, r.center.lon, nx.center.lat, nx.center.lon);
  });
  return out;
})();

// Assigns { lat, lon, trail } to any tile that doesn't already have coordinates.
// Tiles with explicit lat/lon are kept exactly where they are (off-trail).
export function scatterTiles(tiles) {
  const byRegion = new Map();
  const result   = [];

  for (const tile of tiles) {
    if (typeof tile.lat === 'number' && typeof tile.lon === 'number') {
      result.push(tile);
      continue;
    }
    if (!byRegion.has(tile.region)) byRegion.set(tile.region, []);
    byRegion.get(tile.region).push(tile);
  }

  for (const [regionId, regionTiles] of byRegion) {
    const region = regionMap[regionId];
    if (!region) {
      console.warn(`[scatter] Unknown region "${regionId}" — tiles will be placed at (0,0)`);
      regionTiles.forEach(t => result.push({ ...t, lat: 0, lon: 0 }));
      continue;
    }

    const positions = gridSpread(
      regionTiles.length,
      region.center.lat,
      region.center.lon,
      spineBearing[regionId] ?? 0,
      region.spread ?? 50,
      hashStr(regionId),     // stable per-region seed — same layout every reload
    );

    regionTiles.forEach((tile, i) => {
      result.push({ ...tile, lat: positions[i].lat, lon: positions[i].lon, trail: i });
    });
  }

  return result;
}

// Lays n stops on a serpentine grid centered on the region. The grid's LONG
// axis runs perpendicular to the spine (into the open polar space — neighbor
// regions sit east-west ALONG the spine), its short axis along the spine.
// Steps shrink to keep photo centers within FIT × spread of the center, but
// never below the tile footprint + margin, so photos can crowd, never overlap.
// path.js anchors the road back to the center so the branch meets the spine.
function gridSpread(n, centerLat, centerLon, spineBrg, spread, seed) {
  if (n === 0) return [];

  const side = seededRand(seed) > 0.5 ? 1 : -1;       // which way row 0 scans
  const cols = Math.ceil(Math.sqrt(n));               // long axis (away from neighbors)
  const rows = Math.ceil(n / cols);

  const fitStep = axis => axis > 1 ? (2 * FIT * spread) / (axis - 1) : Infinity;
  const colStep = Math.max(TILE_W_DEG + 2, Math.min(COL_STEP, fitStep(cols)));
  const rowStep = Math.max(TILE_H_DEG + 2, Math.min(ROW_STEP, fitStep(rows)));

  const colBrg = spineBrg + 90;                       // long axis: perpendicular to spine
  const positions = [];

  for (let i = 0; i < n; i++) {
    const r    = Math.floor(i / cols);
    const scan = i % cols;
    const c    = (r % 2 === 0) === (side > 0) ? scan : cols - 1 - scan;  // serpentine
    // Offsets centered on the region center; two great-circle hops place the stop.
    const rowOff = (r - (rows - 1) / 2) * rowStep;
    const colOff = (c - (cols - 1) / 2) * colStep;
    const mid  = destinationPoint(centerLat, centerLon, spineBrg, rowOff);
    const stop = destinationPoint(mid.lat, mid.lon, colBrg, colOff);
    positions.push({ lat: clamp(stop.lat, -85, 85), lon: wrapLon(stop.lon) });
  }

  return positions;
}

// Deterministic hash → 0..1, stable across reloads.
function seededRand(seed) {
  const s = Math.sin(seed * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

// Stable integer hash of a region id, so each region keeps the same seed
// regardless of load order.
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) + 1;
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function wrapLon(lon) {
  while (lon >  180) lon -= 360;
  while (lon < -180) lon += 360;
  return lon;
}
