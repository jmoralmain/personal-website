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
  // Soft ambient — open daytime sky fills the scene evenly.
  scene.add(new THREE.AmbientLight(hexInt(THEME.vellum), 1.2));

  // Warm afternoon key — gentle sun from the upper right; softer than the
  // sharp golden-hour rig, more like clear afternoon light.
  const key = new THREE.PointLight(hexInt(THEME.sun), 8, 20);
  key.position.set(6, 6, 4);
  scene.add(key);

  // Sky-blue fill — atmospheric bounce from the open sky on the shadowed
  // side; keeps darks cool and coherent with the gradient background.
  const fill = new THREE.PointLight(hexInt(THEME.dusk), 4, 20);
  fill.position.set(-5, -3, -4);
  scene.add(fill);
}

