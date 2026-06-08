import * as THREE from 'three';
import { openLightbox } from '../../ui/lightbox.js';
import { THEME } from '../../core/theme.js';

export const handler = {
  // Returns a texture — either the loaded image or an inline placeholder
  // while the real image is loading (or if it fails).
  buildThumb(data, regionColor) {
    const texture = new THREE.Texture();

    // Placeholder canvas shown immediately while the real image loads
    const placeholder = makePlaceholderCanvas(regionColor);
    texture.image  = placeholder;
    texture.needsUpdate = true;

    // crossOrigin = 'anonymous' sends an Origin header so R2 returns
    // Access-Control-Allow-Origin, keeping the image untainted for WebGL.
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
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
    };
    img.onerror = () => {
      console.error(
        `[tiles/image] Failed to load "${data.src}" for tile "${data.id}". ` +
        `The placeholder will remain. Check that the file exists in R2 and the ` +
        `bucket public URL is correct.`,
      );
    };
    img.src = data.src;

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

  ctx.fillStyle = THEME.water.mid;
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
