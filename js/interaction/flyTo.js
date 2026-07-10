import * as THREE     from 'three';
import { SPHERE_R }     from '../core/sphere.js';
import { latLonToVec3 } from '../core/coords.js';

// ─────────────────────────────────────────────────────────────────────────────
// Altitude + fly-to-region — implements docs/SURFACE_VIEW_PLAN.md.
//
// One scalar, `altitude` in [0, 1], is the single source of truth for "how far
// out am I". Everything is derived from it:
//   altitude = 1 → orbit view  (whole globe in frame, FOV 50)
//   altitude = 0 → surface view (ground-level, FOV 65, camera tilted up)
// Controls read it to scale drag speed and gate auto-spin.
//
// Jumping to a region rotates the sphereGroup so the region center faces the
// camera AND descends to the surface; "return to orbit" ascends in place.
// ─────────────────────────────────────────────────────────────────────────────

const ORBIT_FOV    = 50;
const SURFACE_FOV  = 65;
// Camera sits ~1.2 above sphere surface — close enough for an immersive feel
// while still keeping scattered tiles (18-25° from region centre) in the FOV.
const SURFACE_Z    = SPHERE_R + 1.2;
// At surface, the camera tilts upward so the sphere appears as a curved ground
// beneath you rather than a wall filling the view. lookAt target Y at altitude 0:
// at z≈3.2 this is ~25° of upward tilt.
const SURFACE_TILT = 1.5;
const FLY_MS      = 800;
const POLE        = new THREE.Vector3(0, 1, 0);   // local north-pole direction

// Scratch — allocated once. The fly-to target is a quaternion that frames the
// region centered and north-up; tick() slerps the group toward it.
const _f   = new THREE.Vector3();
const _u   = new THREE.Vector3();
const _r   = new THREE.Vector3();
const _m   = new THREE.Matrix4();

// Keep in sync with updateCamera() in core/sceneSetup.js.
// One framing for every aspect: z=5.0 frames the sphere at ~94% of viewport
// height; on portrait the sides intentionally bleed off the screen edges.
function orbitZ() {
  return 5.0;
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
  let rotT = 1;                                     // rotation progress 0..1; 1 = done
  const quatFrom = new THREE.Quaternion();
  const quatTo   = new THREE.Quaternion();
  let atSurface = false;
  let lastNow = 0;

  const api = {
    // Assigned by main.js after the region nav exists; called with `true`
    // when crossing into surface view, `false` when returning toward orbit.
    onModeChange: null,

    getAltitude: () => altitude,

    // Rotate the region center to face the camera (centered, north-up) and
    // frame it from the orbit overview. We pull OUT to the wide view rather than
    // descending to the surface — the region and its scattered tiles read as an
    // airy, spread-out map, not a cramped wall of photos up close.
    flyToRegion(region) {
      // Build the group orientation that maps the region's local basis
      //   f = region direction → +Z (faces camera)
      //   u = north tangent   → +Y (screen up)
      //   r = u × f           → +X (screen right)
      // makeBasis(r,u,f) is that mapping's inverse (world→local), so invert it.
      _f.copy(latLonToVec3(region.center.lat, region.center.lon, 1)).normalize();
      _u.copy(POLE).addScaledVector(_f, -POLE.dot(_f));          // north tangent at the region
      if (_u.lengthSq() < 1e-6) _u.set(1, 0, 0);                 // region at a pole: any up
      _u.normalize();
      _r.crossVectors(_u, _f).normalize();
      _u.crossVectors(_f, _r).normalize();                      // re-orthogonalise
      _m.makeBasis(_r, _u, _f).invert();

      quatFrom.copy(sphereGroup.quaternion);
      quatTo.setFromRotationMatrix(_m);
      rotT = 0;
      startAltitude(1);   // stay at the orbit overview — farther out, never dive in
    },

    toOrbit() { startAltitude(1); },

    // Called when the user grabs the sphere mid-flight: their drag wins.
    // The altitude animation keeps going — descending while dragging is fine.
    cancelRotation() { rotT = 1; },

    // Per-frame — slerps into the existing quaternion, no allocations on this hot path.
    tick() {
      const now = performance.now();
      const dt = lastNow ? now - lastNow : 16;
      lastNow = now;
      // Reduced motion: transitions become an instant cut.
      const step = prefersReduced ? 1 : dt / FLY_MS;

      if (rotT < 1) {
        rotT = Math.min(1, rotT + step);
        sphereGroup.quaternion.slerpQuaternions(quatFrom, quatTo, ease(rotT));
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

  function applyAltitude() {
    camera.position.z = SURFACE_Z + (orbitZ() - SURFACE_Z) * altitude;
    camera.fov = SURFACE_FOV + (ORBIT_FOV - SURFACE_FOV) * altitude;
    camera.updateProjectionMatrix();
    // Tilt the camera upward at surface so the sphere reads as curved ground
    // beneath you, not a wall. At orbit the target is (0,0,0) — no tilt.
    camera.lookAt(0, (1 - altitude) * SURFACE_TILT, 0);

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
