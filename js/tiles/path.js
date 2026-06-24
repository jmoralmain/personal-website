// The road network: one connected road you follow across the globe, drawn to
// read like real pavement — solid asphalt, painted edge lines, and a dashed
// center line.
//
//   • spine    — a wide road that circles the whole globe, threading through
//                 every region center (ordered by longitude).
//   • branches — a road of the same look leaving the spine at each region center
//                 and flowing out through that region's photos.
//
// Each road is a THREE.Group of ribbon meshes — flat strips of triangles that
// hug the sphere surface along a smoothed (centripetal Catmull-Rom) curve:
//   asphalt (gray, full width) + two edge lines + a dashed center line (white,
//   lifted a hair above the asphalt). Rendered OPAQUE so it reads as solid road
//   and is z-buffered (no transparency-sort flicker); frustum culling is off so
//   nothing pops out as the globe rotates. Core THREE only. Built once at load.

import * as THREE from 'three';
import { latLonToVec3 } from '../core/coords.js';
import { SPHERE_R }     from '../core/sphere.js';
import { THEME }        from '../core/theme.js';

const PATH_ELEVATION = 0.025;             // just above the territory caps, below the photos
const SAMPLE_CHORD   = 0.05;              // resample curves to ~3° spacing (unit-sphere chord)

const ROAD_WIDTH = 0.2;                   // world units — wide, a highway you follow
const MARK_LIFT  = 0.006;                 // markings sit a hair above the asphalt (no z-fight)
const EDGE_WIDTH = 0.014;                 // painted edge line
const EDGE_INSET = 0.016;                 // edge line's distance inside the pavement edge
const DASH_WIDTH = 0.016;                 // center line
const DASH_LEN   = 0.26;                  // dash / gap lengths along the road (world units)
const DASH_GAP   = 0.24;

// Takes placed tile data (post-scatter) plus the region map and returns a flat
// array of road groups making up the whole network.
export function buildRoadNetwork(placedTiles, regionMap) {
  const radius = SPHERE_R + PATH_ELEVATION;
  const roads  = [];

  const spine = buildSpine(regionMap, radius);
  if (spine) roads.push(spine);

  roads.push(...buildBranches(placedTiles, regionMap, radius));
  return roads;
}

// ── Spine: the road around the globe ────────────────────────────────────────
function buildSpine(regionMap, radius) {
  const centers = orderedCenters(regionMap);
  if (centers.length < 3) {
    console.warn('[path] not enough region centers for a spine loop — spine skipped');
    return null;
  }
  return makeRoad(sampleCurve(centers, radius, true));
}

// Region centers as { lat, lon }, sorted by longitude so the loop wraps cleanly
// around the globe.
function orderedCenters(regionMap) {
  return Object.values(regionMap)
    .filter(r => r.center && typeof r.center.lat === 'number')
    .sort((a, b) => a.center.lon - b.center.lon)
    .map(r => ({ lat: r.center.lat, lon: r.center.lon }));
}

// ── Branches: a road through each region's photos ───────────────────────────
function buildBranches(placedTiles, regionMap, radius) {
  const byRegion = new Map();
  for (const tile of placedTiles) {
    if (typeof tile.trail !== 'number') continue;   // pinned tiles are off-trail
    if (!byRegion.has(tile.region)) byRegion.set(tile.region, []);
    byRegion.get(tile.region).push(tile);
  }

  const roads = [];
  for (const [regionId, stops] of byRegion) {
    const region = regionMap[regionId];
    if (!region || !region.center) continue;
    stops.sort((a, b) => a.trail - b.trail);

    // Anchor the road at the region center so it joins the spine (which passes
    // exactly through every center), then flow out through the photos.
    const controls = [
      { lat: region.center.lat, lon: region.center.lon },
      ...stops.map(s => ({ lat: s.lat, lon: s.lon })),
    ];
    if (controls.length < 2) continue;
    roads.push(makeRoad(sampleCurve(controls, radius, false)));
  }
  return roads;
}

// ── Shared geometry helpers ─────────────────────────────────────────────────

// Smooth a list of { lat, lon } stops into points hugging the sphere: build
// control vectors on the unit sphere, run a centripetal Catmull-Rom through
// them, resample evenly, then push each sample back out to `radius`.
function sampleCurve(latLonStops, radius, closed) {
  const ctrl  = latLonStops.map(s => latLonToVec3(s.lat, s.lon, 1));
  const curve = new THREE.CatmullRomCurve3(ctrl, closed, 'centripetal');
  const n     = Math.max(ctrl.length * 6, Math.ceil(curve.getLength() / SAMPLE_CHORD));
  return curve.getPoints(n).map(p => p.normalize().multiplyScalar(radius));
}

// Assemble one road: asphalt + edge lines + dashed center line.
function makeRoad(center) {
  const roadR = center[0].length();
  const markR = roadR + MARK_LIFT;
  const half  = ROAD_WIDTH / 2;

  const group = new THREE.Group();
  group.add(ribbon(center, 0,                   ROAD_WIDTH, roadR, THEME.road,   null));
  group.add(ribbon(center,  half - EDGE_INSET,  EDGE_WIDTH, markR, THEME.vellum, null));
  group.add(ribbon(center, -(half - EDGE_INSET), EDGE_WIDTH, markR, THEME.vellum, null));
  group.add(ribbon(center, 0,                   DASH_WIDTH, markR, THEME.vellum, { dash: DASH_LEN, gap: DASH_GAP }));

  group.frustumCulled = false;
  group.children.forEach(m => { m.frustumCulled = false; });
  return group;
}

// Scratch vectors — reused across all ribbons (built at load).
const _normal  = new THREE.Vector3();
const _tangent = new THREE.Vector3();
const _side    = new THREE.Vector3();
const _ctr     = new THREE.Vector3();
const _edge    = new THREE.Vector3();

// Build a ribbon mesh of the given width, centered on the curve shifted sideways
// by `lateralOffset`, re-projected onto a sphere of `targetRadius` so it hugs
// the surface. If `dash` is given, only the dash portions get triangles, leaving
// gaps — used for the broken center line.
function ribbon(center, lateralOffset, width, targetRadius, colorHex, dash) {
  const n    = center.length;
  const half = width / 2;
  const positions = new Float32Array(n * 2 * 3);
  const cum       = new Float32Array(n);

  for (let i = 0; i < n; i++) {
    const p = center[i];
    if (i > 0) cum[i] = cum[i - 1] + p.distanceTo(center[i - 1]);

    _normal.copy(p).normalize();
    _tangent.copy(center[Math.min(n - 1, i + 1)]).sub(center[Math.max(0, i - 1)]).normalize();
    _side.crossVectors(_tangent, _normal).normalize();

    _ctr.copy(p).addScaledVector(_side, lateralOffset);                  // shift sideways
    _edge.copy(_ctr).addScaledVector(_side,  half).normalize().multiplyScalar(targetRadius);
    positions[i * 6]     = _edge.x;
    positions[i * 6 + 1] = _edge.y;
    positions[i * 6 + 2] = _edge.z;
    _edge.copy(_ctr).addScaledVector(_side, -half).normalize().multiplyScalar(targetRadius);
    positions[i * 6 + 3] = _edge.x;
    positions[i * 6 + 4] = _edge.y;
    positions[i * 6 + 5] = _edge.z;
  }

  const indices = [];
  const period  = dash ? dash.dash + dash.gap : 0;
  for (let i = 0; i < n - 1; i++) {
    if (dash) {
      const mid = (cum[i] + cum[i + 1]) / 2;
      if (mid % period >= dash.dash) continue;   // this segment falls in a gap
    }
    const l0 = i * 2, r0 = i * 2 + 1, l1 = (i + 1) * 2, r1 = (i + 1) * 2 + 1;
    indices.push(l0, r0, l1, r0, r1, l1);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);

  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(colorHex),
    side:  THREE.DoubleSide,
  });
  return new THREE.Mesh(geometry, material);
}
