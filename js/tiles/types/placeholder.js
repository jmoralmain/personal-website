import * as THREE from 'three';
import { applyRoundedMask, roundRectPath, RADIUS_FRAC } from '../tileShape.js';

// Renders a grey tile with a "?" so broken/unknown entries are visible
// on the globe rather than silently missing.
export const handler = {
  buildThumb() {
    const canvas  = document.createElement('canvas');
    canvas.width  = 256;
    canvas.height = 256;
    const ctx     = canvas.getContext('2d');

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = '#444466';
    ctx.lineWidth   = 4;
    roundRectPath(ctx, 6, 6, 244, 244, 256 * RADIUS_FRAC - 6);
    ctx.stroke();

    ctx.fillStyle   = '#555577';
    ctx.font        = 'bold 80px sans-serif';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 128, 128);

    applyRoundedMask(canvas);
    return new THREE.CanvasTexture(canvas);
  },

  open(data) {
    console.warn('[tiles/placeholder] No handler for type:', data.type);
  },
};
