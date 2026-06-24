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
    // Landscape: height is the limiting dimension — z=3.4 fills the frame well.
    // Portrait: WIDTH is limiting. Visible width = 2·z·tan(25°)·aspect.
    // Solve for z to show the full globe (diameter 2) with 5% margin:
    //   z = SPHERE_R·1.05 / (tan(25°)·aspect). Keep in sync with flyTo.js orbitZ().
    camera.position.z = aspect >= 1
      ? 3.4
      : (2.0 * 1.05) / (Math.tan(25 * Math.PI / 180) * aspect);
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
  // Soft ambient — the white room bounces light evenly from every side.
  scene.add(new THREE.AmbientLight(hexInt(THEME.vellum), 1.2));

  // Studio key — soft warm-white from the upper right, giving the dark globe
  // gentle form without a hot spot. Softer than the old golden-hour sun.
  const key = new THREE.PointLight(hexInt(THEME.key), 6, 20);
  key.position.set(6, 6, 4);
  scene.add(key);

  // Neutral room fill — a cool-white bounce on the shadowed side so the dark
  // globe never crushes to a black void. Replaces the old sky-blue fill.
  const fill = new THREE.PointLight(hexInt(THEME.fill), 5, 20);
  fill.position.set(-5, -3, -4);
  scene.add(fill);
}

