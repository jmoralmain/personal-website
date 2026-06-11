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
export function scatterTiles(tiles) {
  // Group un-positioned tiles by region
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

// Places n stops at equal arc-length intervals along an Archimedean spiral
// (r = c·θ) centred at (centerLat, centerLon). Ring gap and stop spacing are
// both `d`. The last stop lands at radius d·√((π + n − 1)/π) — the π accounts
// for starting one ring out — so if that would overflow the region's spread,
// d shrinks to fit.
function trailSpread(n, centerLat, centerLon, spreadDeg) {
  if (n === 0) return [];
  if (n === 1) return [{ lat: centerLat, lon: centerLon }];

  const d = Math.min(TRAIL_SPACING_DEG, spreadDeg * Math.sqrt(Math.PI / (Math.PI + n - 1)));
  const c = d / (2 * Math.PI);          // radius gained per radian of azimuth
  const positions = [];

  // Arc length of r = c·θ is ≈ c·θ²/2, so θ(s) = √(2s/c). Start one ring out
  // (s₀ = arc length at θ = 2π) so the first stop clears the region marker.
  const s0 = c * (2 * Math.PI) ** 2 / 2;

  const RAD  = Math.PI / 180;
  const latC = centerLat * RAD;
  const lonC = centerLon * RAD;

  for (let i = 0; i < n; i++) {
    const s     = s0 + i * d;
    const theta = Math.sqrt((2 * s) / c);  // bearing from center, radians
    const r     = c * theta * RAD;         // angular distance from center, radians

    // Exact spherical destination point — a planar lat/lon offset distorts
    // spacing away from the equator (regions near the poles collapsed east-west).
    const lat = Math.asin(
      Math.sin(latC) * Math.cos(r) + Math.cos(latC) * Math.sin(r) * Math.cos(theta),
    );
    const lon = lonC + Math.atan2(
      Math.sin(theta) * Math.sin(r) * Math.cos(latC),
      Math.cos(r) - Math.sin(latC) * Math.sin(lat),
    );

    positions.push({ lat: lat / RAD, lon: wrapLon(lon / RAD) });
  }

  return positions;
}
function wrapLon(lon) {
  while (lon >  180) lon -= 360;
  while (lon < -180) lon += 360;
  return lon;
}
