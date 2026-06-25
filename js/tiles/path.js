// The road network: one quiet, connected route you can follow across the globe.
// Deliberately understated — a single muted ribbon, no lane markings — so it
// suggests a path without shouting over the photos or the lime accent.
//
//   • spine    — a route circling the whole globe through every region center
//                 (ordered by longitude).
//   • branches — the same route leaving the spine at each region center and
//                 curving through that region's photos.
//
// Each road is a ribbon: a flat strip of triangles that hugs the sphere surface
// along a smoothed (centripetal Catmull-Rom) curve, laid just above the terrain
// and under the photos. Rendered opaque (z-buffered, no transparency-sort
// flicker) with frustum culling off so it never pops out as the globe rotates.
// Core THREE only. Built once at load; nothing here runs per frame.

import * as THREE from 'three';
import { latLonToVec3 } from '../core/coords.js';
import { SPHERE_R }     from '../core/sphere.js';
import { THEME }        from '../core/theme.js';

const PATH_ELEVATION = 0.025;             // just above the territory caps, below the photos
const SAMPLE_CHORD   = 0.05;              // resample curves to ~3° spacing (unit-sphere chord)
const ROAD_WIDTH     = 0.11;              // slim — a quiet route, not a highway

// Takes placed tile data (post-scatter) plus the region map and returns a flat
// array of road meshes making up the whole network.
export function buildRoadNetwork(placedTiles, regionMap) {
  const radius = SPHERE_R + PATH_ELEVATION;
  const roads  = [];

  const spine = buildSpine(regionMap, radius);
  if (spine) roads.push(spine);

  roads.push(...buildBranches(placedTiles, regionMap, radius));
  return roads;
}

// ── Spine: the route around the globe ───────────────────────────────────────
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

// ── Branches: a route through each region's photos ──────────────────────────
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

    // Anchor the route at the region center so it joins the spine (which passes
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

// Scratch vectors — reused across all roads (built at load).
const _normal  = new THREE.Vector3();
const _tangent = new THREE.Vector3();
const _side    = new THREE.Vector3();
const _ctr     = new THREE.Vector3();
const _edge    = new THREE.Vector3();

// Build a ribbon mesh: a flat strip of ROAD_WIDTH centered on the curve, each
// edge re-projected onto the sphere so the road conforms to the surface. One
// muted, opaque color — no markings.
function makeRoad(points) {
  const n      = points.length;
  const radius = points[0].length();
  const half   = ROAD_WIDTH / 2;
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
    color: new THREE.Color(THEME.road),
    side:  THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;       // never let three cull it mid-rotation
  return mesh;
}
