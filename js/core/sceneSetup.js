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
  // Vellum ambient — enough that photos read true, low enough that the
  // terrain stays a midnight surface, not a daylight ball.
  scene.add(new THREE.AmbientLight(hexInt(THEME.vellum), 0.7));

  // Warm key light — low sun raking across the terrain from the upper right.
  const key = new THREE.PointLight(hexInt(THEME.sun), 7, 18);
  key.position.set(6, 6, 4);
  scene.add(key);

  // Faint olive bounce from the far side — the lime accent's deeper stop,
  // kept dim so it reads as atmosphere, never a second sun.
  const fill = new THREE.PointLight(hexInt(THEME.olive), 2.5, 18);
  fill.position.set(-6, -4, -4);
  scene.add(fill);
}

