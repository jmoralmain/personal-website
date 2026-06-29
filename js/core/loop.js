export function startLoop(fn) {
  (function tick() { requestAnimationFrame(tick); fn(); }());
}
