import * as THREE from 'three';
import { THEME } from './theme.js';

export const SPHERE_R = 2;

export function buildSphere() {
  const sphereGroup = new THREE.Group();

  // Solid body — dark terrain: matte, grainy, like moss-and-earth ground seen
  // from low altitude at night. Tactile, never photoreal, never a shiny ball.
  const grain = makeTerrainTexture();
  const geoSolid = new THREE.SphereGeometry(SPHERE_R * 0.97, 64, 64);
  const matSolid = new THREE.MeshStandardMaterial({
    // White base so the grain map shows at its true tone. Tinting the map
    // with the terrain color too would multiply and darken the globe.
    color:        0xffffff,
    map:          grain,
    bumpMap:      grain,
    bumpScale:    0.02,
    roughness:    0.95,   // matte earth — not a balloon
    metalness:    0.0,
  });
  sphereGroup.add(new THREE.Mesh(geoSolid, matSolid));

  return { sphereGroup };
}

// Procedural grain — a tileable terrain speckle that gives the globe an
// earthy, vegetated surface without shipping an image asset. Built once.
function makeTerrainTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  // Base ground tone — dark moss, clearly lifted from the obsidian canvas so
  // the globe separates from the background without needing a glow.
  ctx.fillStyle = THEME.terrain.base;
  ctx.fillRect(0, 0, size, size);

  // Speckle grains across the terrain tones: valleys, vegetation, ridgelines.
  const grains = 14000;
  const tones = [THEME.terrain.low, THEME.terrain.mid, THEME.terrain.high];
  for (let i = 0; i < grains; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 1.4 + 0.3;
    ctx.fillStyle = tones[Math.floor(Math.random() * tones.length)];
    ctx.globalAlpha = 0.12 + Math.random() * 0.2;
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
