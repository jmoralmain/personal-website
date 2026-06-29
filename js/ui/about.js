// Full-viewport About overlay. Builds DOM from content/about.js data,
// then wires open/close via the trigger button, ? key, Escape, and × button.

import { ABOUT }        from '../content/about.js';
import { closeLightbox } from './lightbox.js';

const el       = document.getElementById('about');
const closeBtn = document.getElementById('about-close');

// ── Populate from data ────────────────────────────────────────────────────────
// Runs once at module load. All text set via textContent — no innerHTML on user data.

const locationEl = document.getElementById('about-location');
if (ABOUT.location) {
  locationEl.textContent = ABOUT.location;
} else {
  locationEl.style.display = 'none';
}

document.getElementById('about-name').textContent    = ABOUT.name;
document.getElementById('about-tagline').textContent = ABOUT.tagline;

const bioEl = document.getElementById('about-bio');
ABOUT.bio.forEach(text => {
  const p = document.createElement('p');
  p.textContent = text;
  bioEl.appendChild(p);
});

const craftEl = document.getElementById('about-craft');
if (ABOUT.craft.length) {
  ABOUT.craft.forEach(({ label, detail }) => {
    const li  = document.createElement('li');
    li.className = 'about-craft-item';
    const lbl = document.createElement('span');
    lbl.className = 'about-craft-label';
    lbl.textContent = label;
    const det = document.createElement('span');
    det.className = 'about-craft-detail';
    det.textContent = detail;
    li.append(lbl, det);
    craftEl.appendChild(li);
  });
} else {
  craftEl.style.display = 'none';
}

const linksEl = document.getElementById('about-links');
ABOUT.links.forEach(({ label, url }) => {
  const a = document.createElement('a');
  a.className = 'about-link';
  a.href      = url;
  a.target    = '_blank';
  a.rel       = 'noopener noreferrer';
  a.textContent = `${label} ↗`;
  linksEl.appendChild(a);
});

// ── Open / close ──────────────────────────────────────────────────────────────

export function openAbout() {
  closeLightbox();
  el.classList.add('open');
}

export function closeAbout() {
  el.classList.remove('open');
}

closeBtn.addEventListener('click', closeAbout);

// Trigger button (lives in #topnav .brand-group)
document.getElementById('about-trigger')?.addEventListener('click', openAbout);

// ? toggles; Escape closes
window.addEventListener('keydown', e => {
  if (document.activeElement?.tagName === 'INPUT') return;
  if (e.key === '?') {
    el.classList.contains('open') ? closeAbout() : openAbout();
  } else if (e.key === 'Escape' && el.classList.contains('open')) {
    closeAbout();
  }
});
