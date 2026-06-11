// Region territories — Voronoi-like cells that tile the entire globe with no
// empty space. Each cell is the set of globe points closest to one region
// center, with a deterministic noise layer added to the distance comparison so
// borders are irregular and organic rather than perfectly circular.
//
// One translucent mesh per region (faint accent tint) + one LineSegments for
// all cell boundary edges. Everything is built once at load.

import * as THREE from 'three';
import { SPHERE_R } from '../core/sphere.js';

// Sits just above the sphere surface, below trails (0.035) and tiles (0.06).
const CELL_ELEVATION = 0.008;

// How many latitude / longitude grid cells to use. Higher = smoother borders
// at the cost of more vertices. 90×45 (4°×4°) gives a good balance.
const GRID_LON = 90;
const GRID_LAT = 45;

// Fraction of distance added as noise to break circular borders. ±0.3 means
// the boundary can wobble up to 30% of the distance to the region center.
const BOUNDARY_NOISE = 0.30;

const CELL_OPACITY     = 0.10;
const BOUNDARY_OPACITY = 0.18;

// Returns an array of Three.js objects: one colored mesh per region that has
// at least one cell, plus a single LineSegments for all shared borders.
export function buildRegionVisuals(regionMap) {
  const regions = Object.values(regionMap);
  if (regions.length === 0) return [];

  const r  = SPHERE_R + CELL_ELEVATION;
  const rb = r + 0.001;  // boundaries float just above the cell mesh

  // ── 1. Assign each grid cell to the nearest region (+ noise) ─────────────
  const assignment = new Uint8Array(GRID_LON * GRID_LAT);
  for (let j = 0; j < GRID_LAT; j++) {
    for (let i = 0; i < GRID_LON; i++) {
      const lat = 90 - (j + 0.5) / GRID_LAT * 180;
      const lon = (i + 0.5) / GRID_LON * 360 - 180;
      assignment[j * GRID_LON + i] = nearestRegion(lat, lon, regions);
    }
  }

  // ── 2. Build one float buffer per region ─────────────────────────────────
  const bufs = regions.map(() => []);

  for (let j = 0; j < GRID_LAT; j++) {
    const th0 = (j / GRID_LAT) * Math.PI;
    const th1 = ((j + 1) / GRID_LAT) * Math.PI;
    for (let i = 0; i < GRID_LON; i++) {
      const az0 = (i / GRID_LON) * 2 * Math.PI;
      const az1 = ((i + 1) / GRID_LON) * 2 * Math.PI;
      const buf = bufs[assignment[j * GRID_LON + i]];
      // Two CCW triangles per quad (DoubleSide material so winding doesn't matter)
      pushV(buf, th0, az0, r); pushV(buf, th1, az0, r); pushV(buf, th1, az1, r);
      pushV(buf, th0, az0, r); pushV(buf, th1, az1, r); pushV(buf, th0, az1, r);
    }
  }

  const objects = [];
  for (let ri = 0; ri < regions.length; ri++) {
    if (bufs[ri].length === 0) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(bufs[ri], 3));
    objects.push(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
      color:       new THREE.Color(regions[ri].color),
      transparent: true,
      opacity:     CELL_OPACITY,
      depthWrite:  false,
      side:        THREE.DoubleSide,
    })));
  }

  // ── 3. Boundary edges between differently-assigned neighbours ─────────────
  const bpts = [];
  for (let j = 0; j < GRID_LAT; j++) {
    for (let i = 0; i < GRID_LON; i++) {
      const a = assignment[j * GRID_LON + i];

      // Vertical edge to the right (wraps longitude)
      const iR = (i + 1) % GRID_LON;
      if (assignment[j * GRID_LON + iR] !== a) {
        const az = ((i + 1) / GRID_LON) * 2 * Math.PI;
        pushV(bpts, (j / GRID_LAT) * Math.PI,       az, rb);
        pushV(bpts, ((j + 1) / GRID_LAT) * Math.PI, az, rb);
      }

      // Horizontal edge below
      if (j + 1 < GRID_LAT && assignment[(j + 1) * GRID_LON + i] !== a) {
        const th = ((j + 1) / GRID_LAT) * Math.PI;
        pushV(bpts, th, (i / GRID_LON) * 2 * Math.PI,       rb);
        pushV(bpts, th, ((i + 1) / GRID_LON) * 2 * Math.PI, rb);
      }
    }
  }

  if (bpts.length > 0) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(bpts, 3));
    objects.push(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
      color:       0xffffff,
      transparent: true,
      opacity:     BOUNDARY_OPACITY,
      depthWrite:  false,
    })));
  }

  return objects;
}

// Index of the region closest to (lat, lon), with noise-perturbed distances
// so borders are irregular.
function nearestRegion(lat, lon, regions) {
  let bestIdx = 0, bestDist = Infinity;
  for (let i = 0; i < regions.length; i++) {
    const d = gcDist(lat, lon, regions[i].center.lat, regions[i].center.lon);
    const n = cellNoise(lat, lon, i) * d * BOUNDARY_NOISE;
    if (d + n < bestDist) { bestDist = d + n; bestIdx = i; }
  }
  return bestIdx;
}

// Angular distance (degrees) between two lat/lon points.
function gcDist(lat1, lon1, lat2, lon2) {
  const R = Math.PI / 180;
  const φ1 = lat1 * R, φ2 = lat2 * R, Δλ = (lon2 - lon1) * R;
  return Math.acos(Math.min(1, Math.sin(φ1) * Math.sin(φ2) + Math.cos(φ1) * Math.cos(φ2) * Math.cos(Δλ))) / R;
}

// Deterministic noise in [-1, 1] — stable across reloads, unique per cell+region.
function cellNoise(lat, lon, regionIdx) {
  const s = Math.sin(lat * 12.9898 + lon * 78.233 + regionIdx * 39.346) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

// Push one vertex using the same spherical convention as latLonToVec3:
//   theta = polar angle from north  (j/LAT * π)
//   az    = (lon + 180) * π/180     (i/LON * 2π)
function pushV(arr, theta, az, r) {
  arr.push(
    -r * Math.sin(theta) * Math.cos(az),
     r * Math.cos(theta),
     r * Math.sin(theta) * Math.sin(az),
  );
}
