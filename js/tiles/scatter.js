// Auto-scatter: takes a list of tile data entries and lays them out as a
// TRAIL — even stops along an Archimedean spiral winding out from the region
// center. Each stop gets a small deterministic jitter so the layout feels
// organic rather than perfectly mechanical.
// Adding a new photo to R2 and the index just works — no manual placement.

import { REGIONS } from '../content/manifest.js';

const regionMap = Object.fromEntries(REGIONS.map(r => [r.id, r]));

// Angular distance (degrees) between consecutive trail stops.
const TRAIL_SPACING_DEG = 26;

// Maximum position jitter (degrees). Deterministic: same index → same offset
// across reloads, so photos don't jump around on refresh.
const JITTER_DEG = 9;

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

    const positions = trailSpread(
      regionTiles.length,
      region.center.lat,
      region.center.lon,
      region.spread,
    );

    regionTiles.forEach((tile, i) => {
      result.push({ ...tile, lat: positions[i].lat, lon: positions[i].lon, trail: i });
    });
  }

  return result;
}

// Places n stops on an Archimedean spiral, then offsets each by a small
// deterministic jitter so placements feel hand-scattered.
function trailSpread(n, centerLat, centerLon, spreadDeg) {
  if (n === 0) return [];
  if (n === 1) return [{ lat: centerLat, lon: centerLon }];

  const d = Math.min(TRAIL_SPACING_DEG, spreadDeg * Math.sqrt(Math.PI / (Math.PI + n - 1)));
  const c = d / (2 * Math.PI);
  const s0 = c * (2 * Math.PI) ** 2 / 2;

  const RAD  = Math.PI / 180;
  const latC = centerLat * RAD;
  const lonC = centerLon * RAD;

  const positions = [];
  for (let i = 0; i < n; i++) {
    const s     = s0 + i * d;
    const theta = Math.sqrt((2 * s) / c);
    const r     = c * theta * RAD;

    // Exact spherical destination
    const lat = Math.asin(
      Math.sin(latC) * Math.cos(r) + Math.cos(latC) * Math.sin(r) * Math.cos(theta),
    );
    const lon = lonC + Math.atan2(
      Math.sin(theta) * Math.sin(r) * Math.cos(latC),
      Math.cos(r) - Math.sin(latC) * Math.sin(lat),
    );

    // Deterministic jitter — breaks the mechanical spiral regularity
    const jLat = (seededRand(i * 2)     - 0.5) * JITTER_DEG;
    const jLon = (seededRand(i * 2 + 1) - 0.5) * JITTER_DEG / Math.max(Math.cos(lat), 0.1);

    positions.push({
      lat: clamp(lat / RAD + jLat, -85, 85),
      lon: wrapLon(lon / RAD + jLon),
    });
  }

  return positions;
}

// Deterministic hash → 0..1, stable across reloads.
function seededRand(seed) {
  const s = Math.sin(seed * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function wrapLon(lon) {
  while (lon >  180) lon -= 360;
  while (lon < -180) lon += 360;
  return lon;
}
