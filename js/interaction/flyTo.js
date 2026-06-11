import { SPHERE_R }     from '../core/sphere.js';
import { latLonToVec3 } from '../core/coords.js';

// ─────────────────────────────────────────────────────────────────────────────
// Altitude + fly-to-region — implements docs/SURFACE_VIEW_PLAN.md.
//
// One scalar, `altitude` in [0, 1], is the single source of truth for "how far
// out am I". Everything is derived from it:
//   altitude = 1 → orbit view  (whole globe in frame, FOV 50)
//   altitude = 0 → surface view (one region fills the frame, FOV 38)
// Controls read it to scale drag speed and gate auto-spin.
//
// Jumping to a region rotates the sphereGroup so the region center faces the
// camera AND descends to the surface; "return to orbit" ascends in place.
// ─────────────────────────────────────────────────────────────────────────────

const ORBIT_FOV   = 50;
const SURFACE_FOV = 40;
const SURFACE_Z   = SPHERE_R + 1.5;
const FLY_MS      = 800;
const TWO_PI      = Math.PI * 2;

// Keep in sync with updateCamera() in core/sceneSetup.js.
// Portrait (aspect < 1): width is the constraining dimension. Solve for z
// that fits the globe diameter (2·SPHERE_R) with 15% margin:
//   visible width = 2·z·tan(ORBIT_FOV/2)·aspect ≥ 2·SPHERE_R·1.15
//   z = SPHERE_R·1.15 / (tan(ORBIT_FOV/2)·aspect)
function orbitZ() {
  const a = window.innerWidth / window.innerHeight;
  return a >= 1
    ? 4.0
    : (SPHERE_R * 1.15) / (Math.tan(ORBIT_FOV / 2 * Math.PI / 180) * a);
}

// Approximates the project's standard cubic-bezier(.22,1,.36,1): fast start,
// soft landing.
function ease(t) {
  return 1 - Math.pow(1 - t, 4);
}

export function attachFlyTo(sphereGroup, camera) {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let altitude = 1;
  let altFrom = 1, altTo = 1, altT = 1;            // altT: progress 0..1; 1 = done
  let rotT = 1, rxFrom = 0, rxTo = 0, ryFrom = 0, ryTo = 0;
  let atSurface = false;
  let lastNow = 0;

  const api = {
    // Assigned by main.js after the region nav exists; called with `true`
    // when crossing into surface view, `false` when returning toward orbit.
    onModeChange: null,

    getAltitude: () => altitude,

    // Rotate the region center to face the camera and descend to the surface.
    flyToRegion(region) {
      // Solve Rx(rx)·Ry(ry)·p = +Z for the region's unit position p
      // (controls only ever touch rotation.x / rotation.y; z stays 0).
      const p = latLonToVec3(region.center.lat, region.center.lon, 1);
      const h = Math.hypot(p.x, p.z);
      rxFrom = sphereGroup.rotation.x;
      ryFrom = sphereGroup.rotation.y;
      rxTo = nearestTurn(rxFrom, Math.atan2(p.y, h));
      ryTo = nearestTurn(ryFrom, Math.atan2(-p.x, p.z));
      rotT = 0;
      startAltitude(0);
    },

    toOrbit() { startAltitude(1); },

    // Called when the user grabs the sphere mid-flight: their drag wins.
    // The altitude animation keeps going — descending while dragging is fine.
    cancelRotation() { rotT = 1; },

    // Per-frame; numbers only — no allocations on this hot path.
    tick() {
      const now = performance.now();
      const dt = lastNow ? now - lastNow : 16;
      lastNow = now;
      // Reduced motion: transitions become an instant cut.
      const step = prefersReduced ? 1 : dt / FLY_MS;

      if (rotT < 1) {
        rotT = Math.min(1, rotT + step);
        const e = ease(rotT);
        sphereGroup.rotation.x = rxFrom + (rxTo - rxFrom) * e;
        sphereGroup.rotation.y = ryFrom + (ryTo - ryFrom) * e;
      }
      if (altT < 1) {
        altT = Math.min(1, altT + step);
        altitude = altFrom + (altTo - altFrom) * ease(altT);
        applyAltitude();
      }
    },
  };

  function startAltitude(target) {
    altFrom = altitude;
    altTo = target;
    altT = altFrom === altTo ? 1 : 0;
  }

  // Shortest-path equivalent of `to` relative to an accumulated drag angle.
  function nearestTurn(from, to) {
    return to + Math.round((from - to) / TWO_PI) * TWO_PI;
  }

  function applyAltitude() {
    camera.position.z = SURFACE_Z + (orbitZ() - SURFACE_Z) * altitude;
    camera.fov = SURFACE_FOV + (ORBIT_FOV - SURFACE_FOV) * altitude;
    camera.updateProjectionMatrix();

    const surface = altitude < 0.5;
    if (surface !== atSurface) {
      atSurface = surface;
      api.onModeChange?.(surface);
    }
  }

  // Re-derive the camera for the *current* altitude on resize. This runs after
  // sceneSetup's own resize handler (registered earlier), overriding its
  // orbit-only camera distance.
  window.addEventListener('resize', applyAltitude);

  return api;
}
