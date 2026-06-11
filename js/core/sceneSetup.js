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
  _addSky(scene);

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateCamera();
  });

  return { renderer, scene, camera };
}

function _addLights(scene) {
  // Vellum ambient — bright enough that the terrain and photos read clearly;
  // the midnight mood comes from the palette, not from starving the light.
  scene.add(new THREE.AmbientLight(hexInt(THEME.vellum), 1.1));

  // Warm key light — low sun raking across the terrain from the upper right.
  const key = new THREE.PointLight(hexInt(THEME.sun), 9, 18);
  key.position.set(6, 6, 4);
  scene.add(key);

  // Olive bounce from the far side — the lime accent's deeper stop, kept
  // softer than the key so it reads as atmosphere, never a second sun.
  const fill = new THREE.PointLight(hexInt(THEME.olive), 4, 18);
  fill.position.set(-6, -4, -4);
  scene.add(fill);
}

// Night sky — a sparse, static field of vellum stars on a distant shell, so
// the space around the globe reads as open night sky rather than a void.
// Built once at setup, never animated: calm by design, nothing for the hot
// loop, and inherently fine under prefers-reduced-motion.
const STAR_COUNT   = 600;
const STAR_SHELL_R = 60;     // well inside the camera far plane (200)
const STAR_SIZE    = 0.45;   // world units at the shell — a few px on screen

function _addSky(scene) {
  const positions = new Float32Array(STAR_COUNT * 3);
  const colors    = new Float32Array(STAR_COUNT * 3);
  const vellum    = new THREE.Color(hexInt(THEME.vellum));
  const star      = new THREE.Color();

  for (let i = 0; i < STAR_COUNT; i++) {
    // Uniform random direction on the sphere
    const z  = Math.random() * 2 - 1;
    const az = Math.random() * Math.PI * 2;
    const r  = Math.sqrt(1 - z * z);
    positions[i * 3]     = STAR_SHELL_R * r * Math.cos(az);
    positions[i * 3 + 1] = STAR_SHELL_R * z;
    positions[i * 3 + 2] = STAR_SHELL_R * r * Math.sin(az);

    // Cubed random skews most stars faint with a handful of bright ones —
    // reads as depth without needing per-star sizes.
    const brightness = 0.2 + Math.random() ** 3 * 0.8;
    star.copy(vellum).multiplyScalar(brightness);
    colors[i * 3]     = star.r;
    colors[i * 3 + 1] = star.g;
    colors[i * 3 + 2] = star.b;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    map:             makeStarSprite(),
    size:            STAR_SIZE,
    vertexColors:    true,
    transparent:     true,
    depthWrite:      false,
    sizeAttenuation: true,
  });

  scene.add(new THREE.Points(geometry, material));
}

// Soft round alpha mask for star points (a bare Points square reads as
// confetti). White here is a mask, not a palette color — every star is
// tinted by its vellum vertex color.
function makeStarSprite() {
  const size   = 32;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0,   'rgba(255, 255, 255, 1)');
  g.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
  g.addColorStop(1,   'rgba(255, 255, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

