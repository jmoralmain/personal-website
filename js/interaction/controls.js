const DRAG_SPEED  = 0.005;
const INERTIA     = 0.92;
// Velocity below this threshold is treated as idle (triggers auto-rotate).
const IDLE_THRESH = 0.0002;
const AUTO_SPIN   = 0.0008;
// Fraction of orbit drag speed remaining at the surface (altitude 0).
const SURFACE_SPEED_K = 0.4;
// Below this altitude we're "at the surface": no idle auto-spin.
const SPIN_ALTITUDE = 0.5;
// Meridians converge toward the poles: a fixed yaw (rotation.y) step moves
// surface points a screen distance that shrinks with cos(pitch), so near the
// top/bottom of the globe left/right drag feels stuck. Scale horizontal drag by
// 1/cos(pitch) to keep it responsive, capped so it never blows up at the pole.
const POLE_BOOST_MAX = 5;
// Hard limit on pitch so the view never reaches the degenerate pole (where yaw
// spins in place and left/right dies). Well clear of the northernmost content
// (Professional at lat 55), so nothing useful is cut off.
const MAX_PITCH = 80 * Math.PI / 180;

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

  // Latitude compensation for horizontal drag: bigger boost the closer the
  // pitch is to a pole, capped so the limit stays bounded.
  function lonBoost() {
    return Math.min(POLE_BOOST_MAX, 1 / Math.max(Math.cos(sphereGroup.rotation.x), 0.001));
  }

  // Apply a pitch delta, clamped to the pole limit. Returns the velocity that
  // survived (0 once we're pinned at the limit) so inertia doesn't push forever.
  function applyPitch(delta) {
    const clamped = Math.max(-MAX_PITCH, Math.min(MAX_PITCH, sphereGroup.rotation.x + delta));
    const applied = clamped - sphereGroup.rotation.x;
    sphereGroup.rotation.x = clamped;
    return applied;
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
    state.velX = dx * s * lonBoost();
    state.velY = dy * s;
    sphereGroup.rotation.y += state.velX;
    if (applyPitch(state.velY) === 0) state.velY = 0;   // pinned at the pole limit
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
    sphereGroup.rotation.y += state.velX;
    if (applyPitch(state.velY) === 0) state.velY = 0;   // stop inertia at the limit
    state.velX *= INERTIA;
    state.velY *= INERTIA;
    if (Math.abs(state.velX) < IDLE_THRESH && Math.abs(state.velY) < IDLE_THRESH
        && getAltitude() > SPIN_ALTITUDE) {
      sphereGroup.rotation.y += AUTO_SPIN;
    }
  };

  return state;
}
