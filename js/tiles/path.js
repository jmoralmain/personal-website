// The road network: one connected set of dashed survey routes on the globe.
//
//   • spine    — a smooth closed loop that circles the whole globe, threading
//                 through every region center (ordered by longitude). The main
//                 road, in neutral ash so the lime marker stays the loudest note.
//   • branches — a region-accent spur leaving the spine at each region center and
//                 flowing outward through that region's photos (scatter order).
//   • forks    — sparse faint side-routes that split off the spine, bend away,
//                 and trail off — "another route you could take."
//
// Curves are smoothed with a centripetal Catmull-Rom and pinned to the sphere so
// the road bends gently instead of cornering at every stop. Drawn with Line2 fat
// lines (not THREE.Line, which WebGL renders as an invisible 1px hairline) so the
// dashed route actually reads on screen. Built once at load — nothing here runs
// per frame; the only ongoing work is keeping LineMaterial.resolution in sync on
// resize so the pixel linewidth stays correct.

import * as THREE from 'three';
import { latLonToVec3, destinationPoint, initialBearing, angularDist } from '../core/coords.js';
import { SPHERE_R } from '../core/sphere.js';
import { THEME }    from '../core/theme.js';

// Line2 fat-line classes are loaded lazily from three/addons so a CDN hiccup on
// the addon bundle degrades to "no road" (caught in loadTiles) rather than
// breaking the whole module graph and blanking the globe.
let Line2, LineMaterial, LineGeometry;
async function loadLineClasses() {
  if (Line2) return;
  const [a, b, c] = await Promise.all([
    import('three/addons/lines/Line2.js'),
    import('three/addons/lines/LineMaterial.js'),
    import('three/addons/lines/LineGeometry.js'),
  ]);
  Line2 = a.Line2; LineMaterial = b.LineMaterial; LineGeometry = c.LineGeometry;
}

const PATH_ELEVATION = 0.035;             // below tile elevation: routes run under the photos
const SAMPLE_CHORD   = 0.05;              // resample curves to ~3° spacing (unit-sphere chord)
const DASH_SIZE      = 0.12;              // world units along the line
const GAP_SIZE       = 0.09;

const BRANCH_WIDTH   = 3;                 // CSS pixels
const SPINE_WIDTH    = 3;
const FORK_WIDTH     = 2;

const BRANCH_OPACITY = 0.7;              // region spurs — the surveyor's pencil line
const SPINE_OPACITY  = 0.6;              // main loop, neutral ash
const FORK_OPACITY   = 0.4;              // side-routes — faint, secondary

// Forks: short heading-walks leaving the spine. Sparse and deterministic —
// tuned so only a couple of well-separated segments sprout a side-route.
const FORK_CHANCE    = 0.45;             // per spine segment
const FORK_STEPS     = 3;
const FORK_STEP_DEG  = 13;
const FORK_ANGLE     = 65;               // how hard the fork peels off the spine tangent
const FORK_WANDER    = 12;

// Takes placed tile data (post-scatter) plus the region map and resolves to a
// flat array of Line2 objects making up the whole network.
export async function buildRoadNetwork(placedTiles, regionMap) {
  await loadLineClasses();

  const radius    = SPHERE_R + PATH_ELEVATION;
  const materials = [];                  // collected so resize can refresh resolution
  const lines     = [];

  const spine = buildSpine(regionMap, radius, materials);
  if (spine) lines.push(spine);

  lines.push(...buildBranches(placedTiles, regionMap, radius, materials));
  lines.push(...buildForks(regionMap, radius, materials));

  attachResolution(materials);
  return lines;
}

// ── Spine: the loop around the globe ────────────────────────────────────────
function buildSpine(regionMap, radius, materials) {
  const centers = orderedCenters(regionMap);
  if (centers.length < 3) {
    console.warn('[path] not enough region centers for a spine loop — spine skipped');
    return null;
  }
  return makeLine(sampleCurve(centers, radius, true), THEME.ash, SPINE_OPACITY, SPINE_WIDTH, materials);
}

// Region centers as { lat, lon }, sorted by longitude so the loop wraps cleanly
// around the globe.
function orderedCenters(regionMap) {
  return Object.values(regionMap)
    .filter(r => r.center && typeof r.center.lat === 'number')
    .sort((a, b) => a.center.lon - b.center.lon)
    .map(r => ({ lat: r.center.lat, lon: r.center.lon }));
}

// ── Branches: a spur through each region's photos ───────────────────────────
function buildBranches(placedTiles, regionMap, radius, materials) {
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

    // Anchor the spur at the region center so it joins the spine (which passes
    // exactly through every center), then flow out through the photos.
    const controls = [
      { lat: region.center.lat, lon: region.center.lon },
      ...stops.map(s => ({ lat: s.lat, lon: s.lon })),
    ];
    if (controls.length < 2) continue;
    lines.push(makeLine(
      sampleCurve(controls, radius, false),
      region.color ?? THEME.glint, BRANCH_OPACITY, BRANCH_WIDTH, materials,
    ));
  }
  return lines;
}

// ── Forks: faint side-routes off the spine ──────────────────────────────────
function buildForks(regionMap, radius, materials) {
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
    lines.push(...makeFadingFork(sampleCurve(stops, radius, false), materials));
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

// Split a fork's sampled points into a faint body and a fainter tail so the
// side-route visually trails off rather than stopping dead.
function makeFadingFork(points, materials) {
  const cut  = Math.max(2, Math.floor(points.length * 0.65));
  const body = makeLine(points.slice(0, cut),      THEME.ash, FORK_OPACITY,        FORK_WIDTH, materials);
  const tail = makeLine(points.slice(cut - 1),     THEME.ash, FORK_OPACITY * 0.45, FORK_WIDTH, materials);
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

function makeLine(points, color, opacity, widthPx, materials) {
  const positions = new Float32Array(points.length * 3);
  for (let i = 0; i < points.length; i++) {
    positions[i * 3]     = points[i].x;
    positions[i * 3 + 1] = points[i].y;
    positions[i * 3 + 2] = points[i].z;
  }
  const geometry = new LineGeometry();
  geometry.setPositions(positions);

  const material = new LineMaterial({
    color:       new THREE.Color(color).getHex(),
    linewidth:   widthPx,        // CSS pixels (worldUnits = false)
    worldUnits:  false,
    transparent: true,
    opacity,
    dashed:      true,
    dashSize:    DASH_SIZE,
    gapSize:     GAP_SIZE,
    depthTest:   true,           // hidden behind the solid globe
    depthWrite:  false,
  });
  material.resolution.set(window.innerWidth, window.innerHeight);
  materials.push(material);

  const line = new Line2(geometry, material);
  line.computeLineDistances();   // required for dashing
  return line;
}

// LineMaterial needs the viewport resolution to size the pixel linewidth; keep
// it current on resize. One listener for the whole network.
function attachResolution(materials) {
  window.addEventListener('resize', () => {
    for (const m of materials) m.resolution.set(window.innerWidth, window.innerHeight);
  });
}

// Deterministic hash → 0..1, stable across reloads (matches scatter.js).
function seededRand(seed) {
  const s = Math.sin(seed * 127.1) * 43758.5453;
  return s - Math.floor(s);
}
