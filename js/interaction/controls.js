import * as THREE from 'three';

const DRAG_SPEED  = 0.005;
const INERTIA     = 0.92;
// Velocity below this threshold is treated as idle (triggers auto-rotate).
const IDLE_THRESH = 0.0002;
const AUTO_SPIN   = 0.0008;
// Fraction of orbit drag speed remaining at the surface (altitude 0).
const SURFACE_SPEED_K = 0.4;
// Below this altitude we're "at the surface": no idle auto-spin.
const SPIN_ALTITUDE = 0.5;

// Trackball drag: rotations are applied about the CAMERA's axes (screen up /
// screen right), not the globe's own axes. Premultiplying the group quaternion
// by a world-axis rotation does exactly that — so horizontal drag always pans
// left/right and vertical always tilts, anywhere on the globe including the
// poles. No gimbal lock, no dead zone, no pitch limit.
const X_AXIS = new THREE.Vector3(1, 0, 0);   // screen right
const Y_AXIS = new THREE.Vector3(0, 1, 0);   // screen up
const _q     = new THREE.Quaternion();        // scratch — reused, never allocates per frame

// Attaches drag/touch controls to canvas, rotating sphereGroup.
// `getAltitude` (0 = surface, 1 = orbit) scales drag speed and gates auto-spin.
// Returns a state object with { isDragging, velX, velY } for use in animate().
export function attachControls(canvas, sphereGroup, onDragStart, getAltitude = () => 1) {
  const state = { isDragging: false, velX: 0, velY: 0 };
  let prevX = 0, prevY = 0;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function speed() {
    const a = getAltitude();
    return DRAG_SPEED * (SURFACE_SPEED_K + (1 - SURFACE_SPEED_K) * a);
  }

  // Spin the globe about a world (camera-space) axis.
  function rotateWorld(axis, angle) {
    _q.setFromAxisAngle(axis, angle);
    sphereGroup.quaternion.premultiply(_q);
  }

  function onDown(x, y) {
    state.isDragging = true;
    prevX = x; prevY = y;
    state.velX = 0; state.velY = 0;
    onDragStart?.();
  }

  function onMove(x, y) {
    if (!state.isDragging) return;
    const s = speed();
    state.velX = (x - prevX) * s;
    state.velY = (y - prevY) * s;
    rotateWorld(Y_AXIS, state.velX);   // horizontal drag → spin about screen up
    rotateWorld(X_AXIS, state.velY);   // vertical drag   → tilt about screen right
    prevX = x; prevY = y;
  }

  function onUp() { state.isDragging = false; }

  canvas.addEventListener('mousedown',  e => onDown(e.clientX, e.clientY));
  window.addEventListener('mousemove',  e => onMove(e.clientX, e.clientY));
  window.addEventListener('mouseup',    onUp);

  canvas.addEventListener('touchstart', e => onDown(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
  window.addEventListener('touchmove',  e => { if (state.isDragging) onMove(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
  window.addEventListener('touchend',   onUp);

  // Called every frame by the animate loop.
  // Uses the closed-over sphereGroup — no parameter needed or accepted.
  state.tick = () => {
    if (state.isDragging || prefersReduced) return;
    rotateWorld(Y_AXIS, state.velX);   // inertia
    rotateWorld(X_AXIS, state.velY);
    state.velX *= INERTIA;
    state.velY *= INERTIA;
    if (Math.abs(state.velX) < IDLE_THRESH && Math.abs(state.velY) < IDLE_THRESH
        && getAltitude() > SPIN_ALTITUDE) {
      rotateWorld(Y_AXIS, AUTO_SPIN);  // idle auto-spin about screen up
    }
  };

  return state;
}
