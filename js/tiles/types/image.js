import * as THREE from 'three';
import { openPanel } from '../../ui/panel.js';

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
      // Draw onto a fixed 256×256 canvas so the texture dimensions never change.
      // texSubImage2D throws GL_INVALID_VALUE if the replacement image is a
      // different size than the placeholder already uploaded to the GPU.
      const canvas = document.createElement('canvas');
      canvas.width  = 256;
      canvas.height = 256;
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

  open(data) {
    openPanel({
      icon:  data.icon  ?? '🖼',
      title: data.title ?? data.label,
      body:  buildBody(data),
    });
  },
};

function buildBody(data) {
  const caption = data.caption ? `<p class="tile-caption">${data.caption}</p>` : '';
  const body    = data.body    ? `<p>${data.body}</p>` : '';
  const img     = `<img class="panel-image" src="${data.src}" alt="${data.title ?? data.label}" loading="lazy">`;
  return `${img}${caption}${body}`;
}

function makePlaceholderCanvas(regionColor) {
  const canvas  = document.createElement('canvas');
  canvas.width  = 256;
  canvas.height = 256;
  const ctx     = canvas.getContext('2d');
  const color   = regionColor ?? '#7b61ff';

  ctx.fillStyle = '#0d0d1a';
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
