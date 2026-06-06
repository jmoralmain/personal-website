// Manages the detail panel that opens when a node is clicked.
const panel     = document.getElementById('panel');
const closeBtn  = document.getElementById('panel-close');
const iconEl    = document.getElementById('panel-icon');
const titleEl   = document.getElementById('panel-title');
const bodyEl    = document.getElementById('panel-body');

// Named distinctly to avoid shadowing Window.close.
export function closePanel() {
  panel.classList.add('hidden');
}

closeBtn.addEventListener('click', closePanel);

export function openPanel({ icon, title, body }) {
  iconEl.textContent  = icon ?? '';
  titleEl.textContent = title ?? '';
  bodyEl.textContent  = body  ?? '';
  panel.classList.remove('hidden');
}
