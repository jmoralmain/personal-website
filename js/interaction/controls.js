const DRAG_SPEED  = 0.005;
const INERTIA     = 0.92;
// Velocity below this threshold is treated as idle (triggers auto-rotate).
const IDLE_THRESH = 0.0002;
const AUTO_SPIN   = 0.0008;

// Attaches drag/touch controls to canvas, rotating sphereGroup.
// Returns a state object with { isDragging, velX, velY } for use in animate().
export function attachControls(canvas, sphereGroup, onDragStart) {
  const state = { isDragging: false, velX: 0, velY: 0 };
  let prevX = 0, prevY = 0;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
    state.velX = dx * DRAG_SPEED;
    state.velY = dy * DRAG_SPEED;
    sphereGroup.rotation.y += state.velX;
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
  state.tick = (sphereGroup) => {
    if (state.isDragging || prefersReduced) return;
    sphereGroup.rotation.y += state.velX;
    sphereGroup.rotation.x += state.velY;
    state.velX *= INERTIA;
    state.velY *= INERTIA;
    if (Math.abs(state.velX) < IDLE_THRESH && Math.abs(state.velY) < IDLE_THRESH) {
      sphereGroup.rotation.y += AUTO_SPIN;
    }
  };

  return state;
}
