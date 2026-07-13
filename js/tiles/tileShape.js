// Shared rounded-corner + feathered-edge helpers for tile canvases.
// Used by the type handlers (photo thumbs, placeholders) and the border ring
// in Tile.js so every canvas that lands on a tile plane shares one shape
// language. Depends on nothing (tiles/ → core/ + content/ only).

// Corner radius and edge feather as fractions of canvas WIDTH, so canvases of
// different resolutions (512px photo thumb, 256px placeholder) map to the same
// world-space rounding once stretched onto the tile plane.
export const RADIUS_FRAC  = 0.047; // ≈24px at 512 wide
export const FEATHER_FRAC = 0.008; // ≈4px at 512 wide

// Traces a rounded-rect path with arcTo. ctx.roundRect() needs Chrome 99+,
// above the Chrome 89 floor in docs/ENVIRONMENT.md, so the path is manual.
export function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}

// Alpha masks reused across every thumb of the same size, keyed "WxH" —
// each photo load applies a mask, so build it once per size, not per photo.
const maskCache = new Map();

// Masks a finished thumb canvas to a rounded rect whose last few pixels of
// alpha fade out, so tile edges sit softly on the terrain instead of cutting
// a hard line. Feather is drawn as concentric strokes of decreasing alpha
// (canvas 2D has no portable blur — ctx.filter misses the Safari floor).
export function applyRoundedMask(canvas) {
  const w = canvas.width;
  const h = canvas.height;
  const key = `${w}x${h}`;

  let mask = maskCache.get(key);
  if (!mask) {
    mask = document.createElement('canvas');
    mask.width  = w;
    mask.height = h;
    const m = mask.getContext('2d');
    const r = Math.round(w * RADIUS_FRAC);
    const f = Math.max(2, Math.round(w * FEATHER_FRAC));

    // Opaque core, inset by the feather width
    m.fillStyle = '#fff';
    roundRectPath(m, f, f, w - 2 * f, h - 2 * f, r);
    m.fill();

    // Feather rings from the core out to the canvas edge
    m.strokeStyle = '#fff';
    m.lineWidth   = 1.5;
    for (let i = 1; i <= f; i++) {
      m.globalAlpha = 1 - i / (f + 1);
      roundRectPath(m, f - i, f - i, w - 2 * (f - i), h - 2 * (f - i), r + i);
      m.stroke();
    }
    maskCache.set(key, mask);
  }

  const ctx = canvas.getContext('2d');
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(mask, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
}
