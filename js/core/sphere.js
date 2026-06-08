import * as THREE from 'three';
import { THEME } from './theme.js';

export const SPHERE_R = 2;

export function buildSphere() {
  const sphereGroup = new THREE.Group();

  // Solid body — textured "blue sand": matte, grainy, tactile but not photoreal.
  const grain = makeSandTexture();
  const geoSolid = new THREE.SphereGeometry(SPHERE_R * 0.97, 64, 64);
  const matSolid = new THREE.MeshStandardMaterial({
    // White base so the grain map shows at its true blue tone. Tinting the
    // map with the water color too would multiply and darken the globe.
    color:        0xffffff,
    map:          grain,
    bumpMap:      grain,
    bumpScale:    0.015,
    roughness:    0.9,    // matte, like wet sand — not a shiny balloon
    metalness:    0.0,
  });
  sphereGroup.add(new THREE.Mesh(geoSolid, matSolid));

  return { sphereGroup };
}

// Procedural grain — a tileable blue speckle that gives the globe a sandy,
// textured surface without shipping an image asset. Built once at startup.
function makeSandTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Base water tone — lifted toward the shallows so the globe reads as a
  // lighter "blue sand", not a dark navy ball.
  ctx.fillStyle = THEME.water.shallow;
  ctx.fillRect(0, 0, size, size);

  // Speckle grains between deep and shallow water tones for a sandy texture.
  const grains = 14000;
  for (let i = 0; i < grains; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 1.4 + 0.3;
    const t = Math.random();
    ctx.fillStyle = t < 0.5 ? THEME.water.deep : THEME.water.shallow;
    ctx.globalAlpha = 0.10 + Math.random() * 0.18;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 2);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
