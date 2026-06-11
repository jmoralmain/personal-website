import * as THREE from 'three';
import { THEME, hexInt } from './theme.js';

export function buildScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);

  function updateCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    // Portrait (mobile) needs more distance so the globe isn't cropped
    camera.position.z = aspect < 1 ? 5.5 : 4.0;
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }
  updateCamera();

  _addLights(scene);

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateCamera();
  });

  return { renderer, scene, camera };
}

function _addLights(scene) {
  // Generous ambient — golden hour floods the scene with diffuse warm light;
  // terrain and photos stay readable from any angle.
  scene.add(new THREE.AmbientLight(hexInt(THEME.vellum), 1.4));

  // Golden-hour key — low sun from the upper right, richer and brighter than
  // a noon sun; rakes across the terrain grain and warms the tile borders.
  const key = new THREE.PointLight(hexInt(THEME.sun), 11, 20);
  key.position.set(6, 6, 4);
  scene.add(key);

  // Warm rose-violet fill — atmospheric bounce from the colorful sunset sky
  // on the shadowed side; keeps darks from going cold without competing with
  // the key.
  const fill = new THREE.PointLight(hexInt(THEME.dusk), 5, 20);
  fill.position.set(-5, -3, -4);
  scene.add(fill);
}

