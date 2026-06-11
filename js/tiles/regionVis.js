// Region visuals: a translucent filled cap + a solid boundary ring per region,
// sized from the actual trail spread (so a region with 3 photos is a small
// intimate territory; a region with 30 spans much more of the globe).
//
// Depth order (lowest first): cap (faint tint) → outline (boundary ring) →
// trail (dashed path, path.js) → tiles (photos, Tile.js).
//
// Both objects are built once at load — nothing here runs per frame.

import * as THREE from 'three';
import { latLonToVec3 } from '../core/coords.js';
import { SPHERE_R }     from '../core/sphere.js';

// Elevations below the trail (0.035) and tiles (0.06) so they sit underneath.
const CAP_ELEVATION     = 0.010;
const OUTLINE_ELEVATION = 0.022;

// Padding added to actualSpread so the boundary ring sits beyond the last photo.
const OUTLINE_PAD_DEG   = 6;
// Minimum territory radius for regions with 0–1 photos so a ring still renders.
const MIN_SPREAD_DEG    = 10;

const CAP_SEGMENTS      = 48;
const OUTLINE_SEGMENTS  = 96;
const CAP_OPACITY       = 0.07;
const OUTLINE_OPACITY   = 0.28;

const RAD = Math.PI / 180;

// Returns an array of Three.js objects (cap mesh + outline line) for every
// region in regionSpreads. Add them all to sphereGroup.
export function buildRegionVisuals(regionSpreads, regionMap) {
  const objects = [];
  for (const [regionId, rawSpread] of regionSpreads) {
    const region = regionMap[regionId];
    if (!region) continue;

    const visualSpread = Math.max(rawSpread, MIN_SPREAD_DEG);
    const outlineSpread = visualSpread + OUTLINE_PAD_DEG;

    objects.push(buildCap(region, visualSpread));
    objects.push(buildOutline(region, outlineSpread));
  }
  return objects;
}

// Translucent filled disc — a faint territorial tint in the region's accent.
function buildCap(region, spreadDeg) {
  const { lat: cLat, lon: cLon } = region.center;
  const r   = SPHERE_R + CAP_ELEVATION;
  const N   = CAP_SEGMENTS;
  const pos = [];

  // Center vertex
  const cv = latLonToVec3(cLat, cLon, r);
  pos.push(cv.x, cv.y, cv.z);

  // Ring vertices
  for (let i = 0; i < N; i++) {
    const bearing = (i / N) * Math.PI * 2;
    const v = sphericalDest(cLat, cLon, spreadDeg, bearing, r);
    pos.push(v.x, v.y, v.z);
  }

  // Triangle fan (0 = center, 1..N = ring)
  const idx = [];
  for (let i = 1; i <= N; i++) {
    idx.push(0, i, i < N ? i + 1 : 1);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);

  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
    color:       new THREE.Color(region.color),
    transparent: true,
    opacity:     CAP_OPACITY,
    depthWrite:  false,
    side:        THREE.DoubleSide,
  }));
}

// Solid boundary ring — outlines the territory in the region's accent.
// Solid (not dashed) so it reads differently from the trail inside it.
function buildOutline(region, spreadDeg) {
  const { lat: cLat, lon: cLon } = region.center;
  const r      = SPHERE_R + OUTLINE_ELEVATION;
  const points = [];

  for (let i = 0; i < OUTLINE_SEGMENTS; i++) {
    const bearing = (i / OUTLINE_SEGMENTS) * Math.PI * 2;
    points.push(sphericalDest(cLat, cLon, spreadDeg, bearing, r));
  }

  const geo = new THREE.BufferGeometry().setFromPoints(points);
  return new THREE.LineLoop(geo, new THREE.LineBasicMaterial({
    color:       new THREE.Color(region.color),
    transparent: true,
    opacity:     OUTLINE_OPACITY,
    depthWrite:  false,
  }));
}

// Exact spherical destination: point at angular distance distDeg from
// (cLat, cLon) along bearing (radians), on a sphere of radius r.
function sphericalDest(cLat, cLon, distDeg, bearing, radius) {
  const φ1 = cLat * RAD;
  const λ1 = cLon * RAD;
  const d  = distDeg * RAD;
  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(d) + Math.cos(φ1) * Math.sin(d) * Math.cos(bearing),
  );
  const λ2 = λ1 + Math.atan2(
    Math.sin(bearing) * Math.sin(d) * Math.cos(φ1),
    Math.cos(d) - Math.sin(φ1) * Math.sin(φ2),
  );
  return latLonToVec3(φ2 / RAD, λ2 / RAD, radius);
}
