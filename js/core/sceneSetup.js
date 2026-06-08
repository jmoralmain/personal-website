import * as THREE from 'three';
import { THEME, hexInt } from './theme.js';

// Faint warm glints — like sunlight catching the water far off. Repurposes the
// old starfield as a subtle ocean haze rather than space stars.
const GLINT_COUNT  = 600;
const GLINT_R_MIN  = 22;
const GLINT_R_BAND = 14;

export function buildScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.z = 6.0;

  _addLights(scene);
  _addGlints(scene);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera };
}

function _addLights(scene) {
  // Brighter cool ambient so the water reads light, never murky.
  scene.add(new THREE.AmbientLight(0xcfeaf2, 0.7));

  // Warm key light — sun-on-water from the upper right.
  const key = new THREE.PointLight(hexInt(THEME.regions.climbing), 8, 18);
  key.position.set(6, 6, 4);
  scene.add(key);

  // Warm gold fill from the opposite side, so opposite faces of the globe
  // catch a slightly different warm tone — the "gradient across sections".
  const fill = new THREE.PointLight(hexInt(THEME.glint), 6, 18);
  fill.position.set(-6, -4, -4);
  scene.add(fill);
}

function _addGlints(scene) {
  const positions = new Float32Array(GLINT_COUNT * 3);
  for (let i = 0; i < GLINT_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = GLINT_R_MIN + Math.random() * GLINT_R_BAND;
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
    color: hexInt(THEME.glint), size: 0.05, sizeAttenuation: true,
    transparent: true, opacity: 0.5,
  })));
}
