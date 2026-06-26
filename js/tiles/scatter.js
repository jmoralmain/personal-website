// Auto-scatter: takes a list of tile data entries and lays them out as a clean,
// non-crossing road. Each region's photos sit along a single CONSTANT-CURVATURE
// ARC that leaves the spine perpendicularly (an on-ramp toward the empty pole,
// away from the east-west neighbor regions) and curves gently. A constant-
// curvature arc whose total turn stays under a full circle can never cross
// itself, so the road never tangles. Adding a photo to R2 just works.

import { REGIONS } from '../content/manifest.js';
import { destinationPoint, initialBearing } from '../core/coords.js';

const regionMap = Object.fromEntries(REGIONS.map(r => [r.id, r]));

// Arc distance (degrees) between consecutive photos — the road's stride. At
// SPHERE_R=2, 30° of arc ≈ 1.05 world units — a ~0.40-unit gap on each side of
// the 0.65-wide tile, giving real breathing room between photos.
const STEP_DEG = 30;

// Constant turn per step (degrees): the road is a gentle circular arc. Capped so
// the whole arc never turns more than MAX_TURN — well under a full circle — which
// guarantees it never folds back across itself. Lower value spreads photos across
// a wider area rather than looping them tightly near the region center.
const CURVE_DEG = 28;
const MAX_TURN  = 300;

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

    const positions = arcSpread(
      regionTiles.length,
      region.center.lat,
      region.center.lon,
      spineBearing[regionId] ?? 0,
      hashStr(regionId),     // stable per-region seed — same layout every reload
    );

    regionTiles.forEach((tile, i) => {
      result.push({ ...tile, lat: positions[i].lat, lon: positions[i].lon, trail: i });
    });
  }

  return result;
}

// Walks n stops along a constant-curvature arc leaving the region center. The
// center itself stays free for the region marker; path.js anchors the road back
// to the center so it meets the spine.
function arcSpread(n, centerLat, centerLon, spineBrg, seed) {
  if (n === 0) return [];

  const side  = seededRand(seed) > 0.5 ? 1 : -1;      // curl left or right
  const curve = Math.min(CURVE_DEG, MAX_TURN / Math.max(1, n));
  let bearing = spineBrg + side * 90;                 // leave the spine perpendicularly
  let lat = centerLat, lon = centerLon;
  const positions = [];

  for (let i = 0; i < n; i++) {
    const next = destinationPoint(lat, lon, bearing, STEP_DEG);
    lat = clamp(next.lat, -85, 85);
    lon = wrapLon(next.lon);
    positions.push({ lat, lon });
    bearing += side * curve;                          // constant turn → simple arc
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
