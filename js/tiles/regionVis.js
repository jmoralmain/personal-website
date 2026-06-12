// Region territories — weighted canvas-texture Voronoi.
//
// Each pixel is assigned to the region whose weighted distance is smallest.
// Weight = photo count proportion, so regions with more photos claim more
// of the globe surface. Two noise octaves create organic, irregular borders.
//
// Border: a narrow colour-blend zone (BORDER_DEG) at each seam mixes the
// two neighbouring region colours — a soft curved line, not a hard edge.

import * as THREE from 'three';
import { SPHERE_R } from '../core/sphere.js';

const CELL_ELEVATION = 0.008;

// Noise fraction applied to each distance comparison. Higher = more irregular.
const BOUNDARY_NOISE = 0.50;

// How many degrees of territory advantage the most-photographed region gains
// relative to a region with zero photos. Regions with average count = no change.
const BIAS_SCALE = 35;

const TEX_W = 1024;
const TEX_H = 512;

// Width of the colour-blend zone at each boundary, in degrees.
const BORDER_DEG = 0.8;

export function buildRegionVisuals(regionMap, regionCounts = {}) {
  const regions = Object.values(regionMap);
  if (regions.length === 0) return [];

  const RAD          = Math.PI / 180;
  const totalCount   = Object.values(regionCounts).reduce((a, b) => a + b, 0);
  const avgFraction  = 1 / regions.length;

  const centers = regions.map((r, i) => {
    const frac = totalCount > 0
      ? (regionCounts[r.id] || 0) / totalCount
      : avgFraction;
    return {
      sinLat: Math.sin(r.center.lat * RAD),
      cosLat: Math.cos(r.center.lat * RAD),
      lonR:   r.center.lon * RAD,
      rgb:    hexToRgb(r.color),
      idx:    i,
      // Positive bias = claimed at greater distance = larger region.
      bias:   BIAS_SCALE * (frac - avgFraction),
    };
  });

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

      let bestIdx = 0, secondIdx = 0, bestD = Infinity, secondD = Infinity;
      for (const c of centers) {
        const dot  = sinL * c.sinLat + cosL * c.cosLat * Math.cos(lonR - c.lonR);
        const dist = Math.acos(Math.max(-1, Math.min(1, dot))) / RAD;
        // Weighted distance: subtract bias so larger-count regions claim more.
        const nd   = dist - c.bias + cellNoise(lat, lon, c.idx) * dist * BOUNDARY_NOISE;
        if (nd < bestD) {
          secondD = bestD; secondIdx = bestIdx;
          bestD   = nd;    bestIdx   = c.idx;
        } else if (nd < secondD) {
          secondD = nd; secondIdx = c.idx;
        }
      }

      // At the seam, blend the two neighbouring region colours (max 50/50).
      const borderT = Math.max(0, 1 - (secondD - bestD) / BORDER_DEG);
      const rgbA    = centers[bestIdx].rgb;
      const rgbB    = centers[secondIdx].rgb;
      const t       = borderT * 0.5;

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

// Two-octave noise — large-scale shape + medium-scale detail.
// Deterministic: same seed → same output every load.
function cellNoise(lat, lon, regionIdx) {
  const s1 = Math.sin(lat * 12.9898 + lon * 78.233  + regionIdx * 39.346) * 43758.5453;
  const n1 = (s1 - Math.floor(s1)) * 2 - 1;
  const s2 = Math.sin(lat * 37.719  + lon * 26.478  + regionIdx * 51.235) * 38912.7654;
  const n2 = (s2 - Math.floor(s2)) * 2 - 1;
  return n1 * 0.65 + n2 * 0.35;
}
