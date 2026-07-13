// Choreographs first-load arrival. The white room + hero are pure CSS and
// show instantly; this module only flips classes at the right moments so
// the canvas (and its contact shadow) ease in once a frame has actually
// rendered, and the intro's loading line fades once tiles have landed.
// All motion itself is CSS (see canvas#globe / .intro-status in style.css).

export function attachEntrance(canvas) {
  const intro      = document.getElementById('intro');
  const shadow     = document.getElementById('contact-shadow');
  const statusLine = document.getElementById('intro-status');

  let revealed = false;
  function revealGlobe() {
    if (revealed) return;   // idempotent — safe to call every frame
    revealed = true;
    canvas.classList.add('ready');
    shadow?.classList.add('ready');
  }

  function fadeIntro() {
    intro?.classList.add('faded');
  }

  function tilesReady() {
    statusLine?.classList.add('faded');
  }

  return { revealGlobe, fadeIntro, tilesReady };
}
