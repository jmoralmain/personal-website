// Region territories — weighted canvas-texture Voronoi.
//
// Borders are driven by spatially-coherent noise (bilinear-interpolated over a
// coarse lat/lon grid) so the boundary wobbles in large smooth protrusions
// rather than per-pixel flicker. Independent per-pixel hash noise creates a
// dithered fuzzy zone that looks like a gradient at viewing distance —
// coherent noise shifts the boundary cleanly as a whole.

import * as THREE from 'three';
import { SPHERE_R } from '../core/sphere.js';

// Just enough lift to clear the terrain without z-fighting. Keep this tiny:
// the shell's overhang past the terrain silhouette projects on screen as a
// light halo ring around the dark globe (0.008 ≈ 2px at orbit; 0.002 < 1px).
const CELL_ELEVATION = 0.002;

// The territory layer is a TINT over the dark terrain, not a paint job.
// docs/DESIGN.md: "Region hues are muted naturalistic earth tones that
// identify, never shout" — the globe must stay the one dark object in the
// white room. At 0.62 each region keeps a clear, legible color while the moss
// grain still reads faintly through. (0.42 went too dark — regions collapsed
// into murk against the black terrain; 1.0 was an opaque pastel map. This is
// the between, pushed brighter so the territories actually read as their hue.)
const TINT_OPACITY = 0.62;

// Fraction of distance displaced by noise. Higher = more dramatic protrusions.
// Coherent noise makes this safe to push high without dithering.
const BOUNDARY_NOISE = 0.70;

// Photo-count weighting: how many degrees of advantage the region with the
// highest photo share gets over one with zero photos.
const BIAS_SCALE = 35;

const TEX_W = 1024;
const TEX_H = 512;

// Width of the cross-blend at a boundary, in degrees of arc. Wide enough to
// anti-alias the staircase the 1024×512 texture would otherwise show at the
// globe's on-screen size; narrow enough that borders still read as borders.
const BORDER_DEG = 1.2;

export function buildRegionVisuals(regionMap, regionCounts = {}) {
  const regions = Object.values(regionMap);
  if (regions.length === 0) return [];

  const RAD         = Math.PI / 180;
  const totalCount  = Object.values(regionCounts).reduce((a, b) => a + b, 0);
  const avgFraction = 1 / regions.length;

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
        const nd   = dist - c.bias + smoothNoise(lat, lon, c.idx) * dist * BOUNDARY_NOISE;
        if (nd < bestD) {
          secondD = bestD; secondIdx = bestIdx;
          bestD   = nd;    bestIdx   = c.idx;
        } else if (nd < secondD) {
          secondD = nd; secondIdx = c.idx;
        }
      }

      const borderT = Math.max(0, 1 - (secondD - bestD) / BORDER_DEG);
      const rgbA    = centers[bestIdx].rgb;
      const rgbB    = centers[secondIdx].rgb;
      const t       = borderT * 0.5;   // full 50/50 mix AT the seam → smooth AA'd edge

      const i4 = (y * TEX_W + x) * 4;
      data[i4]     = Math.round(rgbA.r * (1 - t) + rgbB.r * t);
      data[i4 + 1] = Math.round(rgbA.g * (1 - t) + rgbB.g * t);
      data[i4 + 2] = Math.round(rgbA.b * (1 - t) + rgbB.b * t);
      data[i4 + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  // Hug the terrain: the solid globe is SPHERE_R·0.97 (see core/sphere.js), so
  // the tint sits just above THAT surface. At SPHERE_R + elevation the shell
  // floated ~0.07 above the terrain and became the visible silhouette — the
  // "dark globe" limb was pastel instead of dark.
  // 64×64 segments — MUST match the terrain sphere's tessellation. A coarser
  // shell sags further below the true sphere between vertices than the finer
  // terrain does, dipping under it mid-segment and rendering as dark latitude
  // bands across the globe.
  const geo     = new THREE.SphereGeometry(SPHERE_R * 0.97 + CELL_ELEVATION, 64, 64);
  const mat     = new THREE.MeshBasicMaterial({
    map:         texture,
    transparent: true,
    opacity:     TINT_OPACITY,
    depthWrite:  false,
    side:        THREE.FrontSide,
  });

  return [new THREE.Mesh(geo, mat)];
}

// Spatially-coherent noise: bilinear interpolation over a coarse grid so
// adjacent pixels get similar values. Two octaves — one at 14° scale for
// large protrusions, one at 5° for medium detail.
function smoothNoise(lat, lon, regionIdx) {
  const n1 = bilinear(lat, lon, regionIdx,      14);
  const n2 = bilinear(lat, lon, regionIdx + 53,  5);
  return n1 * 0.65 + n2 * 0.35;
}

function bilinear(lat, lon, seed, scale) {
  const lat0 = Math.floor(lat / scale) * scale;
  const lon0 = Math.floor(lon / scale) * scale;
  const tLat = smoothstep((lat - lat0) / scale);
  const tLon = smoothstep((lon - lon0) / scale);
  return lerp(
    lerp(hash(lat0,        lon0,        seed), hash(lat0 + scale, lon0,        seed), tLat),
    lerp(hash(lat0,        lon0 + scale, seed), hash(lat0 + scale, lon0 + scale, seed), tLat),
    tLon,
  );
}

function smoothstep(t) { return t * t * (3 - 2 * t); }
function lerp(a, b, t) { return a + (b - a) * t; }

function hash(lat, lon, seed) {
  const s = Math.sin(lat * 12.9898 + lon * 78.233 + seed * 39.346) * 43758.5453;
  return (s - Math.floor(s)) * 2 - 1;
}

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}
