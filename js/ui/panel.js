// Manages the detail panel that opens when a node is clicked.
const panel          = document.getElementById('panel');
const closeBtn       = document.getElementById('panel-close');
const iconEl         = document.getElementById('panel-icon');
const titleEl        = document.getElementById('panel-title');
const bodyEl         = document.getElementById('panel-body');
const fullscreenBtn  = document.getElementById('panel-fullscreen');

let _onClose = null;
let _onFullscreen = null;

// Named distinctly to avoid shadowing Window.close.
// Fires the onClose callback (e.g. exitFrame) after clearing it to prevent re-entry.
export function closePanel() {
  panel.classList.add('hidden');
  const cb = _onClose;
  _onClose = null;
  _onFullscreen = null;
  if (fullscreenBtn) fullscreenBtn.classList.add('hidden');
  cb?.();
}

// Closes the panel without firing onClose — used by exitFrame to avoid loops.
export function closePanelSilent() {
  panel.classList.add('hidden');
  _onClose = null;
  _onFullscreen = null;
  if (fullscreenBtn) fullscreenBtn.classList.add('hidden');
}

closeBtn.addEventListener('click', closePanel);
fullscreenBtn?.addEventListener('click', () => _onFullscreen?.());

export function openPanel({ icon, title, body, onFullscreen = null, onClose = null }) {
  iconEl.textContent  = icon ?? '';
  titleEl.textContent = title ?? '';
  bodyEl.textContent  = body  ?? '';

  _onClose = onClose;
  _onFullscreen = onFullscreen;

  if (fullscreenBtn) {
    fullscreenBtn.classList.toggle('hidden', !onFullscreen);
  }

  panel.classList.remove('hidden');
}
