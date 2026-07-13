import * as THREE from 'three';
import { THEME } from '../../core/theme.js';
import { loadImage } from '../../core/imageLoader.js';
import { applyRoundedMask, roundRectPath, RADIUS_FRAC } from '../tileShape.js';

// Thumb canvas dimensions — 4:3, matching the tile plane in Tile.js so the
// photo isn't stretched. 512px wide keeps thumbs crisp at surface altitude,
// where a tile spans roughly a third of the frame. Placeholder and photo MUST
// share these dimensions (see the texSubImage2D note in buildThumb).
const THUMB_W = 512;
const THUMB_H = 384;

export const handler = {
  // Returns a texture — either the loaded image or an inline placeholder
  // while the real image is loading (or if it fails).
  buildThumb(data, regionColor) {
    const texture = new THREE.Texture();

    // Quiet loam swatch shown immediately while the real image loads.
    texture.image  = makePlaceholderCanvas();
    texture.needsUpdate = true;

    // True once the load pipeline has settled (photo arrived OR failed), so a
    // slow-decoding preview (below) never clobbers a result that beat it.
    let settled = false;

    // Blur-up preview: tile data may carry a tiny data-URI thumbnail
    // (data.preview, ~24×18px). It decodes almost instantly and shows the
    // photo's real colors — softly upscaled — while the full photo streams in.
    if (typeof data.preview === 'string' && data.preview.length > 0) {
      const previewImg = new Image();
      previewImg.onload = () => {
        if (settled) return; // full photo (or a failure) already landed
        const canvas = document.createElement('canvas');
        canvas.width  = THUMB_W;
        canvas.height = THUMB_H;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true; // soft/blurry upscale from the tiny source
        // Same cover-crop math as the full photo below.
        const scale = Math.max(THUMB_W / previewImg.width, THUMB_H / previewImg.height);
        const w = previewImg.width  * scale;
        const h = previewImg.height * scale;
        ctx.drawImage(previewImg, (THUMB_W - w) / 2, (THUMB_H - h) / 2, w, h);
        applyRoundedMask(canvas);
        texture.image = canvas;
        texture.needsUpdate = true;
      };
      // Preview is a nice-to-have, not required — a decode failure just keeps
      // the quiet swatch on screen.
      previewImg.src = data.preview;
    }

    // loadImage() routes through a concurrency-limited, retry-with-backoff pool
    // (core/imageLoader.js) so a page full of tiles doesn't burst-request the
    // rate-limited R2 endpoint all at once and lose most of the photos. It sets
    // crossOrigin='anonymous' so R2 returns Access-Control-Allow-Origin and the
    // image stays untainted for WebGL.
    loadImage(data.src).then(img => {
      settled = true;
      // Draw the loaded photo onto a fixed THUMB_W×THUMB_H canvas before
      // handing it to the texture. The placeholder already uploaded an image
      // of that size to the GPU; swapping in a different-sized image makes
      // Three.js call texSubImage2D, which throws GL_INVALID_VALUE on a size
      // change. Keeping the dimensions constant avoids that. (Full-res photo
      // is shown in the lightbox, so thumbnail downscaling here is fine.)
      const canvas  = document.createElement('canvas');
      canvas.width  = THUMB_W;
      canvas.height = THUMB_H;
      // Cover-crop: scale to fill the 4:3 canvas and center, so any source
      // aspect renders undistorted on the 4:3 tile plane.
      const scale = Math.max(THUMB_W / img.width, THUMB_H / img.height);
      const w = img.width  * scale;
      const h = img.height * scale;
      canvas.getContext('2d').drawImage(img, (THUMB_W - w) / 2, (THUMB_H - h) / 2, w, h);
      // Rounded corners + feathered edge (docs/DESIGN.md §4.2) so the photo
      // sits softly on the terrain instead of cutting a hard rectangle.
      applyRoundedMask(canvas);
      texture.image = canvas;
      texture.needsUpdate = true;
      // Signal Tile.js's tickTile to fade the tile in instead of hard-cutting.
      // image.js can't import Tile.js (tiles/ type handlers are leaves under
      // the registry rule — CLAUDE.md), and buildThumb's contract is fixed at
      // (data, regionColor) → texture, so the signal rides on the texture's
      // own `.userData` (every THREE.Texture already carries one). tickTile
      // reads and clears this same flag once per frame.
      texture.userData.justRevealed = true;
    }).catch(() => {
      settled = true;
      // Degradation contract (docs/CLEAN_CODE.md): a failed load is visually
      // distinct from the quiet loading swatch — strong gray tile + region
      // border, so "still loading" and "gave up" never look the same.
      console.warn(`[Tile warn] thumb failed to load: ${data.src}`);
      texture.image = makeFailedCanvas(regionColor);
      texture.needsUpdate = true;
    });

    return texture;
  },

  // Click a photo → open it full-screen immediately. The picker injects
  // { openLightbox } so tiles/ never imports from ui/ (one-way dependency
  // rule, docs/ARCHITECTURE.md §5). Title/caption are optional; the photo
  // shows regardless of whether they're populated.
  open(data, { openLightbox }) {
    openLightbox({
      src:     data.src,
      title:   data.title ?? '',
      caption: data.caption ?? '',
    });
  },
};

// Quiet loam swatch — shown while a photo is loading (and briefly as the base
// under a blur-up preview). A flat fill a shade lighter than the terrain, no
// border, no spinner: region identity already comes from the ring plane
// behind the tile (Tile.js), so this should read as "a print not yet
// developed," not an error. THEME has no bare loading-swatch tone, so this
// reuses THEME.terrain.mid — already the "lighter than base terrain" step in
// the existing palette (js/core/theme.js, outside this file's ownership).
function makePlaceholderCanvas() {
  const canvas  = document.createElement('canvas');
  canvas.width  = THUMB_W;
  canvas.height = THUMB_H;
  const ctx     = canvas.getContext('2d');

  ctx.fillStyle = THEME.terrain.mid;
  ctx.fillRect(0, 0, THUMB_W, THUMB_H);

  applyRoundedMask(canvas);
  return canvas;
}

// Strong failed-load placeholder — distinct from the quiet loading swatch so
// "still loading" and "gave up" never look the same (degradation contract,
// docs/CLEAN_CODE.md). Gray fill + region-colored border, no spinner.
function makeFailedCanvas(regionColor) {
  const canvas  = document.createElement('canvas');
  canvas.width  = THUMB_W;
  canvas.height = THUMB_H;
  const ctx     = canvas.getContext('2d');
  const color   = regionColor ?? THEME.glint;

  // Gray loam fill — lifted clearly off the near-black terrain (#13140e) so a
  // failed tile is visible against the globe. (A near-black fill made it
  // disappear into the surface.)
  ctx.fillStyle = '#3a3b33';
  ctx.fillRect(0, 0, THUMB_W, THUMB_H);

  // Region-colored border, strong enough to read at a glance. Rounded to
  // match the tile's masked corners.
  ctx.strokeStyle = color;
  ctx.lineWidth   = 6;
  ctx.globalAlpha = 0.85;
  roundRectPath(ctx, 12, 12, THUMB_W - 24, THUMB_H - 24, THUMB_W * RADIUS_FRAC - 12);
  ctx.stroke();

  ctx.globalAlpha = 1;
  applyRoundedMask(canvas);
  return canvas;
}
