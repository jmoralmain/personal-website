// The trail network: wide solid paths worn into the terrain, the kind you follow
// from photo to photo.
//
//   • spine    — a trail that circles the whole globe, threading through every
//                 region center (ordered by longitude). The main road, in a
//                 neutral worn tone so the lime marker stays the loudest note.
//   • branches — a region-tinted trail leaving the spine at each region center
//                 and flowing outward through that region's photos.
//   • forks    — sparse side-trails that split off the spine, bend away, and
//                 fade out — "another route you could take."
//
// Each trail is a ribbon: a flat strip of triangles that hugs the sphere surface
// along a smoothed (centripetal Catmull-Rom) curve, laid just above the terrain
// and under the photos. Core THREE only — no Line2 / addon dependency. Built once
// at load; nothing here runs per frame.

import * as THREE from 'three';
import { latLonToVec3, destinationPoint, initialBearing, angularDist } from '../core/coords.js';
import { SPHERE_R } from '../core/sphere.js';
import { THEME }    from '../core/theme.js';

const PATH_ELEVATION = 0.02;              // just above the territory caps, below the photos
const SAMPLE_CHORD   = 0.05;              // resample curves to ~3° spacing (unit-sphere chord)

const TRAIL_WIDTH    = 0.13;              // world units — "pretty wide", a path you follow
const FORK_WIDTH     = 0.08;

const BRANCH_OPACITY = 0.8;               // region trails
const SPINE_OPACITY  = 0.72;              // main loop, neutral
const FORK_OPACITY   = 0.5;               // side-trails — quieter

// Forks: short heading-walks leaving the spine. Sparse and deterministic —
// tuned so only a couple of well-separated segments sprout a side-trail.
const FORK_CHANCE    = 0.45;              // per spine segment
const FORK_STEPS     = 3;
const FORK_STEP_DEG  = 13;
const FORK_ANGLE     = 65;                // how hard the fork peels off the spine tangent
const FORK_WANDER    = 12;

// Takes placed tile data (post-scatter) plus the region map and returns a flat
// array of trail meshes making up the whole network.
export function buildRoadNetwork(placedTiles, regionMap) {
  const radius = SPHERE_R + PATH_ELEVATION;
  const lines  = [];

  const spine = buildSpine(regionMap, radius);
  if (spine) lines.push(spine);

  lines.push(...buildBranches(placedTiles, regionMap, radius));
  lines.push(...buildForks(regionMap, radius));

  return lines;
}

// ── Spine: the trail around the globe ───────────────────────────────────────
function buildSpine(regionMap, radius) {
  const centers = orderedCenters(regionMap);
  if (centers.length < 3) {
    console.warn('[path] not enough region centers for a spine loop — spine skipped');
    return null;
  }
  return makeTrail(sampleCurve(centers, radius, true), THEME.ash, SPINE_OPACITY, TRAIL_WIDTH);
}

// Region centers as { lat, lon }, sorted by longitude so the loop wraps cleanly
// around the globe.
function orderedCenters(regionMap) {
  return Object.values(regionMap)
    .filter(r => r.center && typeof r.center.lat === 'number')
    .sort((a, b) => a.center.lon - b.center.lon)
    .map(r => ({ lat: r.center.lat, lon: r.center.lon }));
}

// ── Branches: a trail through each region's photos ──────────────────────────
function buildBranches(placedTiles, regionMap, radius) {
  const byRegion = new Map();
  for (const tile of placedTiles) {
    if (typeof tile.trail !== 'number') continue;   // pinned tiles are off-trail
    if (!byRegion.has(tile.region)) byRegion.set(tile.region, []);
    byRegion.get(tile.region).push(tile);
  }

  const lines = [];
  for (const [regionId, stops] of byRegion) {
    const region = regionMap[regionId];
    if (!region || !region.center) continue;
    stops.sort((a, b) => a.trail - b.trail);

    // Anchor the trail at the region center so it joins the spine (which passes
    // exactly through every center), then flow out through the photos.
    const controls = [
      { lat: region.center.lat, lon: region.center.lon },
      ...stops.map(s => ({ lat: s.lat, lon: s.lon })),
    ];
    if (controls.length < 2) continue;
    lines.push(makeTrail(
      sampleCurve(controls, radius, false),
      region.color ?? THEME.glint, BRANCH_OPACITY, TRAIL_WIDTH,
    ));
  }
  return lines;
}

// ── Forks: faint side-trails off the spine ──────────────────────────────────
function buildForks(regionMap, radius) {
  const centers = orderedCenters(regionMap);
  if (centers.length < 3) return [];

  const lines = [];
  for (let i = 0; i < centers.length; i++) {
    const a = centers[i];
    const b = centers[(i + 1) % centers.length];   // wrap closes the loop

    if (seededRand(i * 13 + 2) > FORK_CHANCE) continue;

    // Spawn at the arc midpoint, peeling off the spine tangent to one side.
    const segDist = angularDist(a.lat, a.lon, b.lat, b.lon);
    const tangent = initialBearing(a.lat, a.lon, b.lat, b.lon);
    const mid     = destinationPoint(a.lat, a.lon, tangent, segDist / 2);
    const side    = seededRand(i * 13 + 7) > 0.5 ? 1 : -1;

    const stops = walkFork(mid.lat, mid.lon, tangent + side * FORK_ANGLE, i * 13 + 11);
    lines.push(...makeFadingFork(sampleCurve(stops, radius, false)));
  }
  return lines;
}

// Heading-walk for a fork: starts on the spine (so it stays connected) and
// wanders a few short steps before trailing off.
function walkFork(startLat, startLon, bearing, seed) {
  const stops = [{ lat: startLat, lon: startLon }];
  const phase = seededRand(seed) * Math.PI * 2;
  let lat = startLat, lon = startLon, brg = bearing;

  for (let i = 0; i < FORK_STEPS; i++) {
    const next = destinationPoint(lat, lon, brg, FORK_STEP_DEG);
    lat = Math.max(-85, Math.min(85, next.lat));
    lon = next.lon;
    stops.push({ lat, lon });
    brg += FORK_WANDER * Math.sin(i + phase);
  }
  return stops;
}

// Split a fork's sampled points into a body and a fainter, narrower tail so the
// side-trail visually thins out and fades rather than stopping dead.
function makeFadingFork(points) {
  const cut  = Math.max(2, Math.floor(points.length * 0.6));
  const body = makeTrail(points.slice(0, cut),  THEME.ash, FORK_OPACITY,        FORK_WIDTH);
  const tail = makeTrail(points.slice(cut - 1), THEME.ash, FORK_OPACITY * 0.4,  FORK_WIDTH * 0.6);
  return [body, tail];
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

// Scratch vectors — reused across all trails (built at load, so this only avoids
// churn during construction, not per frame).
const _normal  = new THREE.Vector3();
const _tangent = new THREE.Vector3();
const _side    = new THREE.Vector3();
const _edge    = new THREE.Vector3();

// Build a ribbon mesh: a flat strip of the given width centered on the curve,
// each edge re-projected onto the sphere so the whole trail conforms to the
// surface like a path worn into the ground.
function makeTrail(points, color, opacity, width) {
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
    color:       new THREE.Color(color),
    transparent: true,
    opacity,
    depthWrite:  false,           // depth-tested against the solid globe: far side hidden
    side:        THREE.DoubleSide, // visible even at grazing limb angles
  });

  return new THREE.Mesh(geometry, material);
}

// Deterministic hash → 0..1, stable across reloads (matches scatter.js).
function seededRand(seed) {
  const s = Math.sin(seed * 127.1) * 43758.5453;
  return s - Math.floor(s);
}
