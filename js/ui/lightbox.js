// Full-screen photo view. Clicking an image tile opens the photo at full size
// over the globe; click anywhere, the × button, or Esc to close.

const lightbox = document.getElementById('lightbox');
const imgEl    = document.getElementById('lightbox-img');
const captionEl = document.getElementById('lightbox-caption');
const closeBtn = document.getElementById('lightbox-close');

export function openLightbox({ src, title, caption }) {
  imgEl.src = src;
  imgEl.alt = title ?? '';

  const titleHtml   = title   ? `<strong>${escapeHtml(title)}</strong>` : '';
  const captionHtml = caption ? escapeHtml(caption) : '';
  captionEl.innerHTML = titleHtml + captionHtml;

  lightbox.classList.remove('hidden');
}

export function closeLightbox() {
  lightbox.classList.add('hidden');
  // Drop the src so a large image isn't held in memory while closed.
  imgEl.removeAttribute('src');
}

// Backdrop click closes; clicking the image itself does not (so users can
// inspect it). The × button and Escape always close.
lightbox.addEventListener('click', (e) => {
  if (e.target === imgEl) return;
  closeLightbox();
});
closeBtn.addEventListener('click', closeLightbox);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !lightbox.classList.contains('hidden')) closeLightbox();
});

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
