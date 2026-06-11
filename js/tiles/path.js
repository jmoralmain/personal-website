// Region trails: a faint dashed route line connecting a region's scattered
// photos in trail order (the `trail` index assigned by scatter.js), so
// wandering a region at the surface has a path you can follow from photo to
// photo. Quiet-night-atlas voice: a hairline dashed survey route in the
// region's muted accent, passing just under the tiles. Built once at load —
// nothing here runs per frame.

import * as THREE from 'three';
import { latLonToVec3 } from '../core/coords.js';
import { SPHERE_R }     from '../core/sphere.js';
import { THEME }        from '../core/theme.js';

const PATH_ELEVATION = 0.035;            // below TILE_ELEVATION: route runs under the photos
const SEGMENT_STEP   = 3 * Math.PI / 180; // sample great-circle arcs every ~3°
const DASH_SIZE      = 0.045;
const GAP_SIZE       = 0.055;
const PATH_OPACITY   = 0.35;

// Takes placed tile data (post-scatter) and returns one dashed THREE.Line per
// region with two or more trail stops. Tiles without a `trail` index (pinned,
// explicitly positioned) are off-trail and skipped.
export function buildRegionPaths(placedTiles, regionMap) {
  const byRegion = new Map();
  for (const tile of placedTiles) {
    if (typeof tile.trail !== 'number') continue;
    if (!byRegion.has(tile.region)) byRegion.set(tile.region, []);
    byRegion.get(tile.region).push(tile);
  }

  const lines = [];
  for (const [regionId, stops] of byRegion) {
    if (stops.length < 2) continue;
    stops.sort((a, b) => a.trail - b.trail);
    lines.push(buildTrailLine(stops, regionMap[regionId]?.color ?? THEME.glint));
  }
  return lines;
}

// One continuous polyline through the stops, each leg a great-circle arc
// hugging the sphere at PATH_ELEVATION.
function buildTrailLine(stops, color) {
  const radius = SPHERE_R + PATH_ELEVATION;
  const points = [];

  for (let i = 0; i < stops.length - 1; i++) {
    const a = latLonToVec3(stops[i].lat,     stops[i].lon,     1);
    const b = latLonToVec3(stops[i + 1].lat, stops[i + 1].lon, 1);
    const steps = Math.max(2, Math.ceil(a.angleTo(b) / SEGMENT_STEP));
    // k starts at 0 only on the first leg; later legs share their start point
    // with the previous leg's end.
    for (let k = i === 0 ? 0 : 1; k <= steps; k++) {
      points.push(a.clone().lerp(b, k / steps).normalize().multiplyScalar(radius));
    }
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineDashedMaterial({
    color:       new THREE.Color(color),
    dashSize:    DASH_SIZE,
    gapSize:     GAP_SIZE,
    transparent: true,
    opacity:     PATH_OPACITY,
    depthWrite:  false,   // depth-tested against the solid globe, so the far side is hidden
  });

  const line = new THREE.Line(geometry, material);
  line.computeLineDistances();   // required for LineDashedMaterial to dash
  return line;
}
