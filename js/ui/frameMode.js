import { openPanel, closePanelSilent } from './panel.js';
import { openLightbox } from './lightbox.js';

let _framedTile = null;

export function enterFrame(tileGroup, flyTo) {
  if (_framedTile === tileGroup) return;
  _clearFrame();

  _framedTile = tileGroup;
  tileGroup.userData.isFramed = true;

  // Dim all sibling tiles that have a handler (i.e. are tiles, not paths/blazes).
  const siblings = tileGroup.parent ? tileGroup.parent.children : [];
  siblings.forEach(c => { if (c !== tileGroup && c.userData?.handler) c.userData.isDimmed = true; });

  const data = tileGroup.userData.data;
  flyTo.flyToRegion({ center: { lat: data.lat, lon: data.lon } });

  openPanel({
    icon:  data.icon    ?? '',
    title: data.title   ?? '',
    body:  data.caption ?? data.body ?? '',
    onFullscreen: data.src
      ? () => openLightbox({ src: data.src, title: data.title ?? '', caption: data.caption ?? '' })
      : null,
    onClose: exitFrame,
  });
}

export function exitFrame() {
  if (!_framedTile) return;
  _clearFrame();
  closePanelSilent();
}

function _clearFrame() {
  if (_framedTile?.parent) {
    _framedTile.parent.children.forEach(c => {
      if (c.userData?.handler) { c.userData.isFramed = false; c.userData.isDimmed = false; }
    });
  }
  _framedTile = null;
}

window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && _framedTile) exitFrame();
});
