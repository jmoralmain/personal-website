// Auto-scatter: takes a list of tile data entries and spreads them evenly
// around their region center using a Fibonacci sphere sampling pattern.
// This means adding a new photo to R2 and the index just works — no manual
// lat/lon placement needed.

import { REGIONS } from '../content/manifest.js';

const regionMap = Object.fromEntries(REGIONS.map(r => [r.id, r]));

// Assigns { lat, lon } to any tile that doesn't already have them.
// Tiles with explicit lat/lon are kept exactly where they are.
// Remaining tiles are Fibonacci-distributed within the region's spread radius.
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

    const positions = fibonacciSpread(
      regionTiles.length,
      region.center.lat,
      region.center.lon,
      region.spread,
    );

    regionTiles.forEach((tile, i) => {
      result.push({ ...tile, lat: positions[i].lat, lon: positions[i].lon });
    });
  }

  return result;
}

// Distributes n points evenly within a spherical cap of given angular radius
// centred at (centerLat, centerLon), using a Fibonacci spiral.
function fibonacciSpread(n, centerLat, centerLon, spreadDeg) {
  if (n === 0) return [];
  if (n === 1) return [{ lat: centerLat, lon: centerLon }];

  const spreadRad = spreadDeg * (Math.PI / 180);
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  const positions = [];

  for (let i = 0; i < n; i++) {
    // Map i to a point in a spherical cap using Fibonacci spiral
    const t      = i / (n - 1);                        // 0..1
    const phi    = Math.acos(1 - t * (1 - Math.cos(spreadRad))); // polar angle from cap center
    const theta  = (2 * Math.PI * i) / goldenRatio;   // azimuth

    // Convert polar offset (phi, theta) to lat/lon delta
    const dLat = phi * (180 / Math.PI) * Math.cos(theta);
    const dLon = phi * (180 / Math.PI) * Math.sin(theta) / Math.max(Math.cos(centerLat * Math.PI / 180), 0.1);

    positions.push({
      lat: clamp(centerLat + dLat, -85, 85),
      lon: wrapLon(centerLon + dLon),
    });
  }

  return positions;
}

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }
function wrapLon(lon) {
  while (lon >  180) lon -= 360;
  while (lon < -180) lon += 360;
  return lon;
}
