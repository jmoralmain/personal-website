// Region territories — canvas-texture Voronoi.
//
// Each pixel in a 1024×512 equirectangular texture is assigned to the nearest
// region center (with deterministic noise for organic borders). Applied to a
// UV-mapped sphere, this gives smooth curved borders instead of the staircase
// edges produced by a coarse lat/lon grid.
//
// Border rendering: at the seam between two regions, a narrow zone (BORDER_DEG)
// blends the two neighbouring colours together. This gives a soft curved line
// rather than a hard edge or a wide glow — distinct regions, natural transition.

import * as THREE from 'three';
import { SPHERE_R } from '../core/sphere.js';

const CELL_ELEVATION = 0.008;
const BOUNDARY_NOISE = 0.30;

const TEX_W = 1024;
const TEX_H = 512;

// Width of the colour-blend zone at region boundaries, in degrees.
// 0.8° is narrow enough to read as a distinct line, wide enough not to alias.
const BORDER_DEG = 0.8;

export function buildRegionVisuals(regionMap) {
  const regions = Object.values(regionMap);
  if (regions.length === 0) return [];

  const RAD = Math.PI / 180;

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
      const lon  = (x / TEX_W) * 360 - 180;
      const lonR = lon * RAD;

      // Find nearest AND second-nearest region (both needed for border blend).
      let bestIdx = 0, secondIdx = 0, bestD = Infinity, secondD = Infinity;
      for (const c of centers) {
        const dot  = sinL * c.sinLat + cosL * c.cosLat * Math.cos(lonR - c.lonR);
        const dist = Math.acos(Math.max(-1, Math.min(1, dot))) / RAD;
        const nd   = dist + cellNoise(lat, lon, c.idx) * dist * BOUNDARY_NOISE;
        if (nd < bestD) {
          secondD = bestD; secondIdx = bestIdx;
          bestD = nd;      bestIdx   = c.idx;
        } else if (nd < secondD) {
          secondD = nd; secondIdx = c.idx;
        }
      }

      // borderT: 0 deep inside the region, 1 right on the boundary line.
      const borderT = Math.max(0, 1 - (secondD - bestD) / BORDER_DEG);

      // Blend the two neighbouring region colours at the seam — no white glow,
      // just the natural mix of the two territories meeting each other.
      const rgbA = centers[bestIdx].rgb;
      const rgbB = centers[secondIdx].rgb;
      const t    = borderT * 0.5;   // max 50% blend toward neighbour at dead centre

      const i4 = (y * TEX_W + x) * 4;
      data[i4]     = Math.round(rgbA.r * (1 - t) + rgbB.r * t);
      data[i4 + 1] = Math.round(rgbA.g * (1 - t) + rgbB.g * t);
      data[i4 + 2] = Math.round(rgbA.b * (1 - t) + rgbB.b * t);
      data[i4 + 3] = 255;
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

function cellNoise(lat, lon, regionIdx) {
  const s = Math.sin(lat * 12.9898 + lon * 78.233 + regionIdx * 39.346) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}
