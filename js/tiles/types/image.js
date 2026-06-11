import * as THREE from 'three';
import { openLightbox } from '../../ui/lightbox.js';
import { THEME } from '../../core/theme.js';
import { loadImage } from '../../core/imageLoader.js';

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
      // Draw the loaded photo onto a fixed 256×256 canvas before handing it to
      // the texture. The placeholder already uploaded a 256×256 image to the
      // GPU; swapping in a different-sized image makes Three.js call
      // texSubImage2D, which throws GL_INVALID_VALUE on a size change. Keeping
      // the dimensions constant avoids that. (Full-res photo is shown in the
      // lightbox, so thumbnail downscaling here is fine.)
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      canvas.getContext('2d').drawImage(img, 0, 0, 256, 256);
      texture.image = canvas;
      texture.needsUpdate = true;
    }).catch(() => {
      // Degradation contract (docs/CLEAN_CODE.md): placeholder tile remains.
      console.warn(`[Tile warn] thumb failed to load: ${data.src}`);
    });

    return texture;
  },

  // Click a photo → open it full-screen. Title/caption are optional; the
  // photo shows regardless of whether they're populated.
  open(data) {
    openLightbox({
      src:     data.src,
      title:   data.title ?? '',
      caption: data.caption ?? '',
    });
  },
};

function makePlaceholderCanvas(regionColor) {
  const canvas  = document.createElement('canvas');
  canvas.width  = 256;
  canvas.height = 256;
  const ctx     = canvas.getContext('2d');
  const color   = regionColor ?? THEME.glint;

  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = color;
  ctx.lineWidth   = 3;
  ctx.globalAlpha = 0.4;
  ctx.strokeRect(6, 6, 244, 244);

  // Simple loading spinner lines
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2;
  for (let i = 0; i < 8; i++) {
    ctx.save();
    ctx.translate(128, 128);
    ctx.rotate((i / 8) * Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(0, 40);
    ctx.stroke();
    ctx.restore();
  }

  return canvas;
}
