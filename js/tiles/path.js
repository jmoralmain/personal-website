// The road network: one connected road, a single solid asphalt color, that you
// follow across the globe.
//
//   • spine    — a wide road that circles the whole globe, threading through
//                 every region center (ordered by longitude).
//   • branches — a road of the same width and color leaving the spine at each
//                 region center and flowing out through that region's photos.
//
// Each road is a ribbon: a flat strip of triangles that hugs the sphere surface
// along a smoothed (centripetal Catmull-Rom) curve, laid just above the terrain
// and under the photos. Rendered OPAQUE (not transparent) so it reads as solid
// pavement and is z-buffered like any solid object — no transparency-sort
// flicker, and frustum culling is disabled so it never pops out as you rotate.
// Core THREE only. Built once at load; nothing here runs per frame.

import * as THREE from 'three';
import { latLonToVec3 } from '../core/coords.js';
import { SPHERE_R }     from '../core/sphere.js';
import { THEME }        from '../core/theme.js';

const PATH_ELEVATION = 0.025;             // just above the territory caps, below the photos
const SAMPLE_CHORD   = 0.05;              // resample curves to ~3° spacing (unit-sphere chord)
const ROAD_WIDTH     = 0.2;               // world units — wide, a highway you follow

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

// ── Spine: the road around the globe ────────────────────────────────────────
function buildSpine(regionMap, radius) {
  const centers = orderedCenters(regionMap);
  if (centers.length < 3) {
    console.warn('[path] not enough region centers for a spine loop — spine skipped');
    return null;
  }
  return makeRoad(sampleCurve(centers, radius, true), ROAD_WIDTH);
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
    roads.push(makeRoad(sampleCurve(controls, radius, false), ROAD_WIDTH));
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

// Scratch vectors — reused across all roads (built at load, so this only avoids
// churn during construction, not per frame).
const _normal  = new THREE.Vector3();
const _tangent = new THREE.Vector3();
const _side    = new THREE.Vector3();
const _edge    = new THREE.Vector3();

// Build a ribbon mesh: a flat strip of the given width centered on the curve,
// each edge re-projected onto the sphere so the whole road conforms to the
// surface. Opaque solid asphalt, never culled.
function makeRoad(points, width) {
  const n      = points.length;
  const radius = points[0].length();
  const half   = width / 2;
  const positions = new Float32Array(n * 2 * 3);

  for (let i = 0; i < n; i++) {
    const p = points[i];
    _normal.copy(p).normalize();
    // Path tangent via central difference, then the in-surface perpendicular.
    _tangent.copy(points[Math.min(n - 1, i + 1)]).sub(points[Math.max(0, i - 1)]).normalize();
    _side.crossVectors(_tangent, _normal).normalize().multiplyScalar(half);

    _edge.copy(p).add(_side).normalize().multiplyScalar(radius);          // left edge
    positions[i * 6]     = _edge.x;
    positions[i * 6 + 1] = _edge.y;
    positions[i * 6 + 2] = _edge.z;
    _edge.copy(p).sub(_side).normalize().multiplyScalar(radius);          // right edge
    positions[i * 6 + 3] = _edge.x;
    positions[i * 6 + 4] = _edge.y;
    positions[i * 6 + 5] = _edge.z;
  }

  const indices = [];
  for (let i = 0; i < n - 1; i++) {
    const l0 = i * 2, r0 = i * 2 + 1, l1 = (i + 1) * 2, r1 = (i + 1) * 2 + 1;
    indices.push(l0, r0, l1, r0, r1, l1);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setIndex(indices);

  const material = new THREE.MeshBasicMaterial({
    color: new THREE.Color(THEME.road),
    side:  THREE.DoubleSide,        // visible even at grazing limb angles
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;       // a small mesh whose center can sit off-screen;
                                    // never let three cull it mid-rotation
  return mesh;
}
