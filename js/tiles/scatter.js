// Auto-scatter: takes a list of tile data entries and lays them out as a
// MEANDERING SPUR — a gently winding road that leaves the region center and
// flows outward through the region's photos. Unlike a tight spiral (which curls
// in a small patch and turns at every stop), the spur keeps a heading and bends
// it slowly, so the route reads like a road you can follow, not a zigzag.
// Adding a new photo to R2 and the index just works — no manual placement.

import { REGIONS } from '../content/manifest.js';
import { destinationPoint, initialBearing, angularDist } from '../core/coords.js';

const regionMap = Object.fromEntries(REGIONS.map(r => [r.id, r]));

// Arc distance (degrees) between consecutive stops along the spur — the road's
// stride. Must clear a tile's angular width (~19° at TILE_W 0.65 on r=2) so
// photos don't overlap and the road shows between them.
const STEP_DEG = 28;

// Heading wander: the bearing turns by up to WANDER_AMPL° each step, driven by a
// low-frequency sine so curves are long and lazy (one gentle bend over several
// photos) rather than a sharp turn at every stop.
const WANDER_AMPL = 14;
const WANDER_FREQ = 0.8;

// Soft containment: past this fraction of the region spread, blend the heading
// back toward center so the spur folds back and stays inside its own territory
// instead of spilling into a neighbor.
const SOFT_RADIUS_FRAC = 0.45;
const CENTER_PULL      = 1.0;

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

    const positions = meanderSpread(
      regionTiles.length,
      region.center.lat,
      region.center.lon,
      region.spread,
      hashStr(regionId),     // stable per-region seed — same layout every reload
    );

    regionTiles.forEach((tile, i) => {
      result.push({ ...tile, lat: positions[i].lat, lon: positions[i].lon, trail: i });
    });
  }

  return result;
}

// Walks n stops outward from the region center along a meandering great-circle
// road. The first stop is one stride out (the center itself stays free for the
// region marker; path.js anchors the branch back to the center).
function meanderSpread(n, centerLat, centerLon, spreadDeg, seed) {
  if (n === 0) return [];

  const softRadius = spreadDeg * SOFT_RADIUS_FRAC;
  const phase      = seededRand(seed * 3 + 1) * Math.PI * 2;

  let bearing = seededRand(seed) * 360;   // deterministic initial heading
  let lat = centerLat, lon = centerLon;
  const positions = [];

  for (let i = 0; i < n; i++) {
    const next = destinationPoint(lat, lon, bearing, STEP_DEG);
    lat = clamp(next.lat, -85, 85);
    lon = wrapLon(next.lon);
    positions.push({ lat, lon });

    // Gentle low-frequency wander for the next leg.
    let turn = WANDER_AMPL * Math.sin(i * WANDER_FREQ + phase);

    // Steer back toward center once we drift past the soft radius.
    const dist = angularDist(lat, lon, centerLat, centerLon);
    if (dist > softRadius) {
      const toCenter = initialBearing(lat, lon, centerLat, centerLon);
      const pull     = Math.min(1, (dist - softRadius) / softRadius) * CENTER_PULL;
      bearing = steerToward(bearing, toCenter, pull);
    }
    bearing = (bearing + turn + 360) % 360;
  }

  return positions;
}

// Blend one compass bearing toward another by fraction t, along the shorter arc.
function steerToward(from, to, t) {
  const diff = ((to - from + 540) % 360) - 180;
  return (from + diff * t + 360) % 360;
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
