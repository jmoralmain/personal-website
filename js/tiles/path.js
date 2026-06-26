// The trail network: one quiet "Survey Line" you can follow across the globe.
// Deliberately understated — a faded, dashed hiking trail, not a highway — so it
// suggests a route without shouting over the photos or the lime accent. The
// blaze markers that stand on it live in tiles/blaze.js.
//
//   • spine    — a route circling the whole globe through every region center
//                 (ordered by longitude). The "index contour": wider, long dashes.
//   • branches — the same route leaving the spine at each region center and
//                 curving through that region's photos. Finer, dotted dashes.
//
// Hierarchy reads by line WEIGHT + DASH RHYTHM, never by colour — one muted sand
// tone throughout. Each road is a ribbon: a flat strip of triangles that hugs the
// sphere along a smoothed (centripetal Catmull-Rom) curve, laid just above the
// terrain and under the photos. Dashes are cut by an alpha texture with alphaTest
// (NOT blending), so the trail stays opaque and z-correct — no transparency-sort
// flicker — with frustum culling off so it never pops out as the globe rotates.
// The dash texture's V axis is true arc length, so dashes stay evenly spaced
// regardless of how the curve bends. Core THREE only. Built once at load; nothing
// here runs per frame.

import * as THREE from 'three';
import { latLonToVec3 } from '../core/coords.js';
import { SPHERE_R }     from '../core/sphere.js';
import { THEME }        from '../core/theme.js';

const PATH_ELEVATION = 0.025;             // just above the territory caps, below the photos
const SAMPLE_CHORD   = 0.05;              // resample curves to ~3° spacing (unit-sphere chord)

// Trail hierarchy — the spine is the heavier "index contour", branches the finer
// "intermediate" trails. Differentiation is width + dash rhythm only, never colour.
const SPINE_WIDTH        = 0.13;          // index contour — the primary route
const BRANCH_WIDTH       = 0.075;         // intermediate — finer side trails
const SPINE_DASH_PERIOD  = 0.34;          // long dashes (world-units of arc per dash+gap)
const BRANCH_DASH_PERIOD = 0.16;          // fine/dotted
const SPINE_INK_RATIO    = 0.62;          // long dash, short gap
const BRANCH_INK_RATIO   = 0.40;          // short ink — reads as dotted

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
  return makeRoad(sampleCurve(centers, radius, true), {
    width: SPINE_WIDTH, dashPeriod: SPINE_DASH_PERIOD, alphaTex: SPINE_DASH_TEX, closed: true,
  });
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
    roads.push(makeRoad(sampleCurve(controls, radius, false), {
      width: BRANCH_WIDTH, dashPeriod: BRANCH_DASH_PERIOD, alphaTex: BRANCH_DASH_TEX,
    }));
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

// One repeating dash profile per tier (spine, branch), built once at module load
// and shared across every road of that tier. The V axis is one dash cycle: the
// first `inkRatio` is opaque (white), the rest transparent (black). alphaTest
// cuts at 0.5, so it reads as crisp dashes while staying in the opaque pass.
function makeDashTexture(inkRatio, res = 64) {
  const data = new Uint8Array(res * 4);
  const cut  = Math.floor(res * inkRatio);
  for (let i = 0; i < res; i++) {
    const a = i < cut ? 255 : 0;                 // luminance: ink vs gap
    data[i * 4] = a; data[i * 4 + 1] = a; data[i * 4 + 2] = a; data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, 1, res, THREE.RGBAFormat);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;              // tile along arc length (V)
  tex.magFilter = THREE.NearestFilter;           // crisp dash edges
  tex.minFilter = THREE.NearestFilter;
  tex.needsUpdate = true;
  return tex;
}

const SPINE_DASH_TEX  = makeDashTexture(SPINE_INK_RATIO);
const BRANCH_DASH_TEX = makeDashTexture(BRANCH_INK_RATIO);

// Scratch vectors — reused across all roads (built at load).
const _normal  = new THREE.Vector3();
const _tangent = new THREE.Vector3();
const _side    = new THREE.Vector3();
const _edge    = new THREE.Vector3();

// Build a ribbon mesh: a flat strip of `width` centered on the curve, each edge
// re-projected onto the sphere so the trail conforms to the surface. The UV's V
// channel carries cumulative arc length / dash period, so the shared dash texture
// tiles evenly along the curve no matter how it bends. For a closed loop the dash
// period is snapped so a whole number of cycles fits exactly — no broken seam.
function makeRoad(points, { width, dashPeriod, alphaTex, closed = false }) {
  const n      = points.length;
  const radius = points[0].length();
  const half   = width / 2;
  const positions = new Float32Array(n * 2 * 3);
  const uvs       = new Float32Array(n * 2 * 2);

  let total = 0;
  for (let i = 1; i < n; i++) total += points[i].distanceTo(points[i - 1]);
  const period = closed ? total / Math.max(1, Math.round(total / dashPeriod)) : dashPeriod;

  let arc = 0;
  for (let i = 0; i < n; i++) {
    const p = points[i];
    if (i > 0) arc += p.distanceTo(points[i - 1]);                       // world-space arc length
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

    const v = arc / period;                                               // dash cycles so far
    uvs[i * 4]     = 0; uvs[i * 4 + 1] = v;                               // left  edge (u=0)
    uvs[i * 4 + 2] = 1; uvs[i * 4 + 3] = v;                               // right edge (u=1)
  }

  const indices = [];
  for (let i = 0; i < n - 1; i++) {
    const l0 = i * 2, r0 = i * 2 + 1, l1 = (i + 1) * 2, r1 = (i + 1) * 2 + 1;
    indices.push(l0, r0, l1, r0, r1, l1);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('uv',       new THREE.BufferAttribute(uvs, 2));
  geometry.setIndex(indices);

  const material = new THREE.MeshBasicMaterial({
    color:       new THREE.Color(THEME.trail),
    side:        THREE.DoubleSide,
    alphaMap:    alphaTex,           // sampled luminance → dashes
    transparent: false,              // opaque pass — no transparency-sort flicker
    alphaTest:   0.5,                // discard gaps; keeps depth correct
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;       // never let three cull it mid-rotation
  return mesh;
}
