import * as THREE from 'three';
import { THEME, hexInt } from './theme.js';

export function buildScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.z = 4.0;

  _addLights(scene);

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

