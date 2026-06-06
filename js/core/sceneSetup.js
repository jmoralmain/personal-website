import * as THREE from 'three';

const STAR_COUNT  = 1200;
const STAR_R_MIN  = 22;
const STAR_R_BAND = 14;

export function buildScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.z = 6.0;

  _addLights(scene);
  _addStarfield(scene);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return { renderer, scene, camera };
}

function _addLights(scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.4));

  const key = new THREE.PointLight(0x7b61ff, 8, 18);
  key.position.set(6, 6, 4);
  scene.add(key);

  const fill = new THREE.PointLight(0x00d4ff, 6, 18);
  fill.position.set(-6, -4, -4);
  scene.add(fill);
}

function _addStarfield(scene) {
  const positions = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = STAR_R_MIN + Math.random() * STAR_R_BAND;
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.04, sizeAttenuation: true })));
}
