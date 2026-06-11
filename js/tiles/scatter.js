// Auto-scatter: takes a list of tile data entries and lays them out as a
// TRAIL — even stops along an Archimedean spiral winding out from the region
// center. Spacing between consecutive photos is constant regardless of count:
// a few photos huddle near the center, more photos extend the trail outward,
// clamped to the region's spread radius. The stop order is the trail order —
// tiles/path.js draws the route line through them in this sequence.
// Adding a new photo to R2 and the index just works — no manual placement.

import { REGIONS } from '../content/manifest.js';

const regionMap = Object.fromEntries(REGIONS.map(r => [r.id, r]));

// Angular distance (degrees) between consecutive stops on the trail.
// Tiles are ~13° wide on the sphere (TILE_W 0.46 at SPHERE_R 2), so 18° keeps
// a readable gap between neighbours without scattering them apart.
const TRAIL_SPACING_DEG = 18;

// Assigns { lat, lon } to any tile that doesn't already have them, plus a
// `trail` index recording its position along the region's route.
// Tiles with explicit lat/lon are kept exactly where they are (off-trail).
// Returns { tiles, regionSpreads } where regionSpreads is a Map<regionId →
// actualSpreadDeg> — the measured radius from center to the outermost trail
// stop. regionVis.js uses this to size the boundary ring and tinted cap.
export function scatterTiles(tiles) {
  const byRegion     = new Map();
  const result       = [];
  const regionSpreads = new Map();

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

    const { positions, actualSpread } = trailSpread(
      regionTiles.length,
      region.center.lat,
      region.center.lon,
      region.spread,
    );
    regionSpreads.set(regionId, actualSpread);

    regionTiles.forEach((tile, i) => {
      result.push({ ...tile, lat: positions[i].lat, lon: positions[i].lon, trail: i });
    });
  }

  return { tiles: result, regionSpreads };
}

// Places n stops at equal arc-length intervals along an Archimedean spiral
// (r = c·θ) centred at (centerLat, centerLon). Ring gap and stop spacing are
// both `d`. The last stop lands at radius d·√((π + n − 1)/π) — the π accounts
// for starting one ring out — so if that would overflow the region's spread,
// d shrinks to fit.
// Returns { positions, actualSpread } where actualSpread is the great-circle
// distance (degrees) from the center to the outermost stop — used by
// regionVis.js to size the boundary ring and tinted cap proportionally.
function trailSpread(n, centerLat, centerLon, spreadDeg) {
  if (n === 0) return { positions: [], actualSpread: 0 };
  if (n === 1) return { positions: [{ lat: centerLat, lon: centerLon }], actualSpread: 0 };

  const d = Math.min(TRAIL_SPACING_DEG, spreadDeg * Math.sqrt(Math.PI / (Math.PI + n - 1)));
  const c = d / (2 * Math.PI);
  const positions = [];

  const s0 = c * (2 * Math.PI) ** 2 / 2;

  const RAD  = Math.PI / 180;
  const latC = centerLat * RAD;
  const lonC = centerLon * RAD;

  for (let i = 0; i < n; i++) {
    const s     = s0 + i * d;
    const theta = Math.sqrt((2 * s) / c);
    const r     = c * theta * RAD;

    const lat = Math.asin(
      Math.sin(latC) * Math.cos(r) + Math.cos(latC) * Math.sin(r) * Math.cos(theta),
    );
    const lon = lonC + Math.atan2(
      Math.sin(theta) * Math.sin(r) * Math.cos(latC),
      Math.cos(r) - Math.sin(latC) * Math.sin(lat),
    );
    positions.push({ lat: lat / RAD, lon: wrapLon(lon / RAD) });
  }

  // Measure the actual outermost radius by great-circle distance to the last stop.
  const last = positions[positions.length - 1];
  const actualSpread = gcDist(centerLat, centerLon, last.lat, last.lon);

  return { positions, actualSpread };
}

function gcDist(lat1, lon1, lat2, lon2) {
  const R = Math.PI / 180;
  const φ1 = lat1 * R, φ2 = lat2 * R, Δλ = (lon2 - lon1) * R;
  return Math.acos(Math.min(1, Math.sin(φ1) * Math.sin(φ2) + Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ))) / R;
}
function wrapLon(lon) {
  while (lon >  180) lon -= 360;
  while (lon < -180) lon += 360;
  return lon;
}
