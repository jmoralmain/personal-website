import * as THREE from 'three';
import { THEME, hexInt } from './theme.js';

// Pre-allocated — reused every frame, never created inside animate().
const _globeNdc  = new THREE.Vector3();
const _shadowNdc = new THREE.Vector3();

export function buildScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping         = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.88;

  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 200);

  function updateCamera() {
    const aspect = window.innerWidth / window.innerHeight;
    // Landscape: HEIGHT is the limiting dimension. z=5.0 frames the sphere
    // silhouette (angular radius asin(R/z)) at ~94% of viewport height — the
    // full globe visible top to bottom with slim margins, large and immersive.
    // Portrait: WIDTH is limiting. Visible width = 2·z·tan(25°)·aspect.
    // Solve for z to show the full globe (diameter 2) with 5% margin:
    //   z = SPHERE_R·1.05 / (tan(25°)·aspect). Keep in sync with flyTo.js orbitZ().
    camera.position.z = aspect >= 1
      ? 5.0
      : (2.0 * 1.05) / (Math.tan(25 * Math.PI / 180) * aspect);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
  }
  updateCamera();

  scene.environment = _buildStudioEnvMap(renderer);
  _addLights(scene);

  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    updateCamera();
  });

  return { renderer, scene, camera };
}

// Called once per frame: syncs the CSS bloom gradient center to the projected
// globe position, and sizes the contact shadow ellipse under it.
export function syncScene(camera, sphereR) {
  _globeNdc.set(0, 0, 0).project(camera);
  const bx = (_globeNdc.x *  0.5 + 0.5) * 100;
  const by = (_globeNdc.y * -0.5 + 0.5) * 100;
  document.documentElement.style.setProperty('--bloom-x', `${bx.toFixed(1)}%`);
  document.documentElement.style.setProperty('--bloom-y', `${by.toFixed(1)}%`);

  _shadowNdc.set(0, -sphereR, 0).project(camera);
  const cx = (_shadowNdc.x *  0.5 + 0.5) * 100;
  const cy = (_shadowNdc.y * -0.5 + 0.5) * 100;
  _shadowNdc.set(sphereR, 0, 0).project(camera);
  const screenR = Math.abs((_shadowNdc.x * 0.5 + 0.5) * window.innerWidth - window.innerWidth * 0.5);
  const el = document.getElementById('contact-shadow');
  if (el) {
    el.style.left   = `${cx.toFixed(1)}%`;
    el.style.top    = `${cy.toFixed(1)}%`;
    el.style.width  = `${(screenR * 2.2).toFixed(0)}px`;
    el.style.height = `${(screenR * 0.28).toFixed(0)}px`;
  }
}

// Builds a tiny 8×4 equirectangular DataTexture encoding the warm studio room
// (cool overhead → near-white air → warm bloom → warm floor), runs it through
// PMREMGenerator to produce a proper IBL environment map, then disposes the
// source texture. Cost: one-time at startup only.
function _buildStudioEnvMap(renderer) {
  const W = 8, H = 4;
  const data = new Uint8Array(W * H * 4);
  const rows = [
    [0xe8, 0xea, 0xec, 0xff],  // --room-top   (cool overhead)
    [0xf6, 0xf6, 0xf3, 0xff],  // --room-light (luminous near-white)
    [0xff, 0xfc, 0xf8, 0xff],  // bloom        (warm white, front-facing)
    [0xe4, 0xe0, 0xd8, 0xff],  // --room-floor (soft warm floor)
  ];
  for (let r = 0; r < H; r++) {
    for (let c = 0; c < W; c++) {
      const i = (r * W + c) * 4;
      data[i]     = rows[r][0];
      data[i + 1] = rows[r][1];
      data[i + 2] = rows[r][2];
      data[i + 3] = rows[r][3];
    }
  }
  const tex = new THREE.DataTexture(data, W, H);
  tex.mapping     = THREE.EquirectangularReflectionMapping;
  tex.colorSpace  = THREE.SRGBColorSpace;
  tex.needsUpdate = true;

  const pmrem  = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envMap = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose();
  tex.dispose();
  return envMap;
}

function _addLights(scene) {
  // AmbientLight intensity reduced from 1.2 → 0.6: the IBL env map now provides
  // the room-bounce contribution that AmbientLight was approximating alone.
  scene.add(new THREE.AmbientLight(hexInt(THEME.vellum), 0.6));

  // Studio key — soft warm-white from the upper right, giving the dark globe
  // gentle form without a hot spot.
  const key = new THREE.PointLight(hexInt(THEME.key), 6, 20);
  key.position.set(6, 6, 4);
  scene.add(key);

  // Neutral room fill — a cool-white bounce on the shadowed side so the dark
  // globe never crushes to a black void.
  const fill = new THREE.PointLight(hexInt(THEME.fill), 5, 20);
  fill.position.set(-5, -3, -4);
  scene.add(fill);
}
