// Manages the hover label that follows the cursor.
const el = document.getElementById('tooltip');

export function showTooltip(text, x, y) {
  el.textContent = text;
  el.style.left  = (x + 14) + 'px';
  el.style.top   = (y - 10) + 'px';
  el.classList.add('visible');
}

export function hideTooltip() {
  el.classList.remove('visible');
}
