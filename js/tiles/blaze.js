// Trail blazes: the small upright markers that stand on the Survey Line, in the
// Appalachian-Trail "white blaze" vocabulary. Two kinds:
//
//   • stop blazes — a slim vellum tick at every Nth photo along a branch, so the
//                   trail reads as a marked route without a marker at every stop.
//   • trailhead   — a taller blaze at each region center where branches meet the
//                   spine, marking the junction.
//
// The one blaze nearest the photo the user is leaning into flips to lime (the
// "you are here" survey marker) via setActiveBlaze(); everything else rests in
// vellum. The swap is an instant per-instance colour write — no tween (so it is
// reduced-motion-safe by construction) and no allocation in the hot path.
//
// All markers are InstancedMesh (one draw call per kind) sharing a single quad
// geometry, so adding photos stays free at any scale. Core THREE only; built once
// at load, nothing here runs per frame.

import * as THREE from 'three';
import { latLonToVec3 } from '../core/coords.js';
import { SPHERE_R }     from '../core/sphere.js';
import { THEME }        from '../core/theme.js';

const BLAZE_ELEVATION = 0.025;            // stands on the trail (same shell as path)
const BLAZE_W         = 0.08;             // err wide to start — easy to miss when small
const BLAZE_H         = 0.09;             // short: a low, calm marker, never a tall flag
const JUNCTION_SCALE  = 1.35;             // trailhead blazes only a touch larger
const STOP_EVERY      = 3;                // a blaze every Nth photo along a branch

// Pre-built colours — no `new THREE.Color` in the hover path.
const _vellum = new THREE.Color(THEME.vellum);
const _lime   = new THREE.Color(THEME.lime);

// Scratch objects for orienting instances at build time (reused, never per frame).
const _pos    = new THREE.Vector3();
const _normal = new THREE.Vector3();
const _tan    = new THREE.Vector3();
const _right  = new THREE.Vector3();
const _face   = new THREE.Vector3();
const _basis  = new THREE.Matrix4();
const _quat   = new THREE.Quaternion();
const _scale  = new THREE.Vector3();
const _mat    = new THREE.Matrix4();

// Group placed tiles into per-region branches (sorted along the trail), skipping
// pinned/off-trail tiles — mirrors buildBranches in path.js so the two stay in step.
function branchesByRegion(placedTiles, regionMap) {
  const byRegion = new Map();
  for (const tile of placedTiles) {
    if (typeof tile.trail !== 'number') continue;
    if (!regionMap[tile.region]) continue;
    if (!byRegion.has(tile.region)) byRegion.set(tile.region, []);
    byRegion.get(tile.region).push(tile);
  }
  for (const stops of byRegion.values()) stops.sort((a, b) => a.trail - b.trail);
  return byRegion;
}

// Compose the instance matrix for a blaze standing upright at (lat, lon): height
// along the surface normal, width across the trail (`tangentHint`), face along it.
function placeBlaze(mesh, index, lat, lon, tangentHint, radius, heightScale) {
  _pos.copy(latLonToVec3(lat, lon, 1));
  _normal.copy(_pos);                                            // outward normal = up
  _tan.copy(tangentHint).addScaledVector(_normal, -tangentHint.dot(_normal)).normalize();
  _right.crossVectors(_tan, _normal).normalize();                // across the trail
  _face.crossVectors(_right, _normal).normalize();               // along the trail
  _basis.makeBasis(_right, _normal, _face);                      // local +Y = up (radial)
  _quat.setFromRotationMatrix(_basis);
  _pos.copy(_normal).multiplyScalar(radius + (BLAZE_H * heightScale) / 2);  // bottom on the shell
  _scale.set(1, heightScale, 1);
  _mat.compose(_pos, _quat, _scale);
  mesh.setMatrixAt(index, _mat);
  mesh.setColorAt(index, _vellum);
}

// Direction (unit-sphere) from stop `i` toward its trail neighbour, for facing.
function tangentAt(stops, i) {
  const a = stops[Math.max(0, i - 1)];
  const b = stops[Math.min(stops.length - 1, i + 1)];
  return latLonToVec3(b.lat, b.lon, 1).sub(latLonToVec3(a.lat, a.lon, 1));
}

// Builds the blaze layer. Returns { meshes, setActiveBlaze }:
//   meshes         — InstancedMeshes to add to the sphere group
//   setActiveBlaze — (tileData | null) => void; lights the blaze nearest that
//                    photo's position on its branch, restoring the previous one.
export function buildBlazes(placedTiles, regionMap) {
  const radius   = SPHERE_R + BLAZE_ELEVATION;
  const branches = branchesByRegion(placedTiles, regionMap);

  // Decide which stops get a blaze (every Nth), and remember their branch index
  // so a hover can resolve to the nearest blaze on the same branch.
  const stopPlacements = [];                       // { lat, lon, tangent, region, trail }
  const regionStops    = new Map();                // region → [{ instanceIndex, trail }]
  for (const [region, stops] of branches) {
    const list = [];
    regionStops.set(region, list);
    for (let i = 0; i < stops.length; i++) {
      if (i % STOP_EVERY !== 0) continue;
      list.push({ instanceIndex: stopPlacements.length, trail: stops[i].trail });
      stopPlacements.push({ ...stops[i], tangent: tangentAt(stops, i) });
    }
  }

  // Trailhead blazes at each region center (taller). Hover never lights these.
  const trailheads = [];
  for (const region of Object.values(regionMap)) {
    if (!region.center || typeof region.center.lat !== 'number') continue;
    const stops = branches.get(region.id);
    const toward = stops && stops.length
      ? latLonToVec3(stops[0].lat, stops[0].lon, 1).sub(latLonToVec3(region.center.lat, region.center.lon, 1))
      : new THREE.Vector3(0, 1, 0);
    trailheads.push({ lat: region.center.lat, lon: region.center.lon, tangent: toward });
  }

  const quad = new THREE.PlaneGeometry(BLAZE_W, BLAZE_H);
  const mat  = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: false, side: THREE.DoubleSide });

  const stopMesh = new THREE.InstancedMesh(quad, mat, Math.max(1, stopPlacements.length));
  stopMesh.count = stopPlacements.length;
  stopMesh.frustumCulled = false;
  stopPlacements.forEach((s, i) => placeBlaze(stopMesh, i, s.lat, s.lon, s.tangent, radius, 1));
  if (stopMesh.instanceColor) stopMesh.instanceColor.needsUpdate = true;

  const headMesh = new THREE.InstancedMesh(quad, mat, Math.max(1, trailheads.length));
  headMesh.count = trailheads.length;
  headMesh.frustumCulled = false;
  trailheads.forEach((h, i) => placeBlaze(headMesh, i, h.lat, h.lon, h.tangent, radius, JUNCTION_SCALE));
  if (headMesh.instanceColor) headMesh.instanceColor.needsUpdate = true;

  const meshes = [];
  if (stopPlacements.length) meshes.push(stopMesh);
  if (trailheads.length)     meshes.push(headMesh);

  // Active-state: light the stop blaze nearest the hovered photo on its branch.
  let activeIndex = -1;
  function setActiveBlaze(tileData) {
    let target = -1;
    if (tileData && typeof tileData.trail === 'number') {
      const list = regionStops.get(tileData.region);
      if (list && list.length) {
        let best = Infinity;
        for (const s of list) {
          const d = Math.abs(s.trail - tileData.trail);
          if (d < best) { best = d; target = s.instanceIndex; }
        }
      }
    }
    if (target === activeIndex) return;
    if (activeIndex >= 0) stopMesh.setColorAt(activeIndex, _vellum);
    if (target     >= 0) stopMesh.setColorAt(target, _lime);
    if (stopMesh.instanceColor) stopMesh.instanceColor.needsUpdate = true;
    activeIndex = target;
  }

  return { meshes, setActiveBlaze };
}
