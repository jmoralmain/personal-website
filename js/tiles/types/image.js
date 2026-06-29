import * as THREE from 'three';
import { THEME } from '../../core/theme.js';
import { loadImage } from '../../core/imageLoader.js';

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

    // Placeholder canvas shown immediately while the real image loads
    const placeholder = makePlaceholderCanvas(regionColor);
    texture.image  = placeholder;
    texture.needsUpdate = true;

    // loadImage() routes through a concurrency-limited, retry-with-backoff pool
    // (core/imageLoader.js) so a page full of tiles doesn't burst-request the
    // rate-limited R2 endpoint all at once and lose most of the photos. It sets
    // crossOrigin='anonymous' so R2 returns Access-Control-Allow-Origin and the
    // image stays untainted for WebGL.
    loadImage(data.src).then(img => {
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
      texture.image = canvas;
      texture.needsUpdate = true;
    }).catch(() => {
      // Degradation contract (docs/CLEAN_CODE.md): placeholder tile remains.
      console.warn(`[Tile warn] thumb failed to load: ${data.src}`);
    });

    return texture;
  },

  // Single click → Frame Mode. The picker injects { enterFrame } so tiles/
  // never imports from ui/ (one-way dependency rule).
  open(tileGroup, { enterFrame }) {
    enterFrame(tileGroup);
  },
};

function makePlaceholderCanvas(regionColor) {
  const canvas  = document.createElement('canvas');
  canvas.width  = THUMB_W;
  canvas.height = THUMB_H;
  const ctx     = canvas.getContext('2d');
  const color   = regionColor ?? THEME.glint;

  // Gray loam fill — lifted clearly off the near-black terrain (#13140e) so an
  // empty/loading container is visible against the globe. (A near-black fill
  // made placeholders disappear into the surface; this is the gray-tile half of
  // the degradation contract in docs/CLEAN_CODE.md.)
  ctx.fillStyle = '#3a3b33';
  ctx.fillRect(0, 0, THUMB_W, THUMB_H);

  // Region-colored border, strong enough to read at a glance.
  ctx.strokeStyle = color;
  ctx.lineWidth   = 6;
  ctx.globalAlpha = 0.85;
  ctx.strokeRect(12, 12, THUMB_W - 24, THUMB_H - 24);

  // Simple loading spinner lines
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = color;
  ctx.lineWidth   = 3;
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.translate(THUMB_W / 2, THUMB_H / 2);
    ctx.rotate((i / 8) * Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(0, 30);
    ctx.lineTo(0, 60);
    ctx.stroke();
    ctx.restore();
  }

  return canvas;
}
