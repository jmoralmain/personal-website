// Live coordinates readout (top-right) — the lat/lon of the surface point
// currently facing the camera, formatted like mission telemetry.

import { rotationToLatLon } from '../core/coords.js';

const el = document.getElementById('coords');

// Scratch state — the readout is on the animate hot path, so work is
// throttled and strings are only built when the rounded value changes.
const _view = { lat: 0, lon: 0 };
let frame = 0;
let lastLat = null, lastLon = null;

export function tickCoords(sphereGroup) {
  if (frame++ % 8 !== 0) return;

  rotationToLatLon(sphereGroup.rotation.x, sphereGroup.rotation.y, _view);
  const lat = Math.round(_view.lat);
  const lon = Math.round(_view.lon);
  if (lat === lastLat && lon === lastLon) return;

  lastLat = lat;
  lastLon = lon;
  el.textContent = `LAT ${fmt(lat, 2)} / LON ${fmt(lon, 3)}`;
}

function fmt(deg, width) {
  const sign = deg < 0 ? '−' : '+';
  return sign + String(Math.abs(deg)).padStart(width, '0') + '°';
}
