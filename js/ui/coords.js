// Location label (top-right, the #coords element) — quietly names the region
// you're wandering over, and fades away over open ground. A gentle "you are
// here", not telemetry.

import { REGIONS } from '../content/manifest.js';

const el = document.getElementById('coords');
const DEG = Math.PI / 180;

// Precomputed unit vector for each region center — allocated once, reused
// every tick.
const regions = REGIONS.map(r => {
  const phi   = (90 - r.center.lat) * DEG;
  const theta = (r.center.lon + 180) * DEG;
  return {
    label: r.label,
    // cos of the region's angular radius, with a little slack past the edge
    // so the label doesn't flicker right at the boundary.
    nearCos: Math.cos((r.spread + 8) * DEG),
    x: -Math.sin(phi) * Math.cos(theta),
    y:  Math.cos(phi),
    z:  Math.sin(phi) * Math.sin(theta),
  };
});

// Throttled + change-gated so the hot path never builds strings needlessly.
let frame = 0;
let lastLabel = null;

export function tickCoords(sphereGroup) {
  if (frame++ % 8 !== 0) return;

  // The local-space point currently facing the camera:
  // p = Ry(-ry) · Rx(-rx) · (0,0,1), expanded inline (no allocation).
  const rx = sphereGroup.rotation.x, ry = sphereGroup.rotation.y;
  const cx = Math.cos(rx);
  const vx = -Math.sin(ry) * cx;
  const vy =  Math.sin(rx);
  const vz =  Math.cos(ry) * cx;

  let best = null, bestDot = -1;
  for (const r of regions) {
    const dot = vx * r.x + vy * r.y + vz * r.z;
    if (dot > bestDot) { bestDot = dot; best = r; }
  }

  const label = best && bestDot >= best.nearCos ? best.label : '';
  if (label === lastLabel) return;
  lastLabel = label;
  el.textContent = label;
  el.classList.toggle('visible', label !== '');
}
