const DRAG_SPEED  = 0.005;
const INERTIA     = 0.92;
// Velocity below this threshold is treated as idle (triggers auto-rotate).
const IDLE_THRESH = 0.0002;
const AUTO_SPIN   = 0.0008;
// Fraction of orbit drag speed remaining at the surface (altitude 0).
// Kept low so that with the camera close to the surface, a small drag
// moves you a short distance — walking pace, not sprinting.
const SURFACE_SPEED_K = 0.15;
// Below this altitude we're "at the surface": no idle auto-spin.
const SPIN_ALTITUDE = 0.5;

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

  function onDown(x, y) {
    state.isDragging = true;
    prevX = x; prevY = y;
    state.velX = 0; state.velY = 0;
    onDragStart?.();
  }

  function onMove(x, y) {
    if (!state.isDragging) return;
    const dx = x - prevX;
    const dy = y - prevY;
    const s = speed();
    state.velX = dx * s;
    state.velY = dy * s;
    // When globe is flipped past vertical, horizontal drag would visually go
    // the wrong way without this correction.
    const yFlip = Math.cos(sphereGroup.rotation.x) < 0 ? -1 : 1;
    sphereGroup.rotation.y += state.velX * yFlip;
    sphereGroup.rotation.x += state.velY;
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
    // Re-compute every frame so inertia and auto-spin both stay correct if the
    // globe crosses vertical after the drag has ended.
    const yFlip = Math.cos(sphereGroup.rotation.x) < 0 ? -1 : 1;
    sphereGroup.rotation.y += state.velX * yFlip;
    sphereGroup.rotation.x += state.velY;
    state.velX *= INERTIA;
    state.velY *= INERTIA;
    if (Math.abs(state.velX) < IDLE_THRESH && Math.abs(state.velY) < IDLE_THRESH
        && getAltitude() > SPIN_ALTITUDE) {
      sphereGroup.rotation.y += AUTO_SPIN * yFlip;
    }
  };

  return state;
}
