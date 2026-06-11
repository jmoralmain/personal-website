// Region territories — canvas-texture Voronoi.
//
// Each pixel in a 1024×512 equirectangular texture is assigned to the nearest
// region center (with deterministic noise for organic borders). Applied to a
// UV-mapped sphere, this gives smooth curved borders instead of the staircase
// edges produced by a coarse lat/lon grid.
//
// The UV convention of THREE.SphereGeometry matches latLonToVec3 exactly:
//   u = (lon + 180) / 360,  v = (90 - lat) / 180
// so the texture aligns with node positions with no rotation offset.

import * as THREE from 'three';
import { SPHERE_R } from '../core/sphere.js';

const CELL_ELEVATION = 0.008;
const BOUNDARY_NOISE = 0.30;

const TEX_W = 1024;
const TEX_H = 512;

const CELL_ALPHA   = Math.round(0.42 * 255);
const BORDER_ALPHA = Math.round(0.72 * 255);
const BORDER_DEG   = 1.4;   // soft border zone width in degrees

export function buildRegionVisuals(regionMap) {
  const regions = Object.values(regionMap);
  if (regions.length === 0) return [];

  const RAD = Math.PI / 180;

  // Precompute region data to avoid redundant work inside the pixel loop.
  const centers = regions.map((r, i) => ({
    sinLat: Math.sin(r.center.lat * RAD),
    cosLat: Math.cos(r.center.lat * RAD),
    lonR:   r.center.lon * RAD,
    rgb:    hexToRgb(r.color),
    idx:    i,
  }));

  const canvas = document.createElement('canvas');
  canvas.width  = TEX_W;
  canvas.height = TEX_H;
  const ctx  = canvas.getContext('2d');
  const img  = ctx.createImageData(TEX_W, TEX_H);
  const data = img.data;

  for (let y = 0; y < TEX_H; y++) {
    const lat  = 90 - (y / TEX_H) * 180;
    const latR = lat * RAD;
    const sinL = Math.sin(latR);
    const cosL = Math.cos(latR);

    for (let x = 0; x < TEX_W; x++) {
      const lonR = ((x / TEX_W) * 360 - 180) * RAD;

      // Find the nearest and second-nearest region (noisy distances).
      let bestIdx = 0, bestD = Infinity, secondD = Infinity;
      for (const c of centers) {
        const dot  = sinL * c.sinLat + cosL * c.cosLat * Math.cos(lonR - c.lonR);
        const dist = Math.acos(Math.max(-1, Math.min(1, dot))) / RAD;
        const nd   = dist + cellNoise(lat, (x / TEX_W) * 360 - 180, c.idx) * dist * BOUNDARY_NOISE;
        if (nd < bestD)       { secondD = bestD;  bestD = nd;  bestIdx = c.idx; }
        else if (nd < secondD) { secondD = nd; }
      }

      const rgb = centers[bestIdx].rgb;
      // borderT → 0 in region interior, → 1 right on the boundary
      const borderT = Math.max(0, 1 - (secondD - bestD) / BORDER_DEG);

      const i4 = (y * TEX_W + x) * 4;
      data[i4]     = Math.round(rgb.r + (255 - rgb.r) * borderT * 0.45);
      data[i4 + 1] = Math.round(rgb.g + (255 - rgb.g) * borderT * 0.45);
      data[i4 + 2] = Math.round(rgb.b + (255 - rgb.b) * borderT * 0.45);
      data[i4 + 3] = Math.round(CELL_ALPHA + (BORDER_ALPHA - CELL_ALPHA) * borderT);
    }
  }

  ctx.putImageData(img, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  const geo     = new THREE.SphereGeometry(SPHERE_R + CELL_ELEVATION, 64, 32);
  const mat     = new THREE.MeshBasicMaterial({
    map:         texture,
    transparent: true,
    depthWrite:  false,
    side:        THREE.FrontSide,
  });

  return [new THREE.Mesh(geo, mat)];
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

// Deterministic noise in [-1, 1] — stable across reloads, unique per position+region.
function cellNoise(lat, lon, regionIdx) {
  const s = Math.sin(lat * 12.9898 + lon * 78.233 + regionIdx * 39.346) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}
