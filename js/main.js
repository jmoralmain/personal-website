import * as THREE from 'three';
import { buildScene }    from './core/sceneSetup.js';
import { buildSphere }   from './core/sphere.js';
import { buildNodes }    from './core/nodes.js';
import { attachControls} from './interaction/controls.js';
import { attachPicker }  from './interaction/picker.js';
import { REGIONS, NODES } from './content/manifest.js';

// ── Bootstrap ──────────────────────────────────────────────────────────────────
const canvas      = document.getElementById('globe');
const { renderer, scene, camera } = buildScene(canvas);

const { sphereGroup, matWire } = buildSphere();
scene.add(sphereGroup);

const regionMap   = Object.fromEntries(REGIONS.map(r => [r.id, r]));
const nodeObjects = buildNodes(sphereGroup, NODES, regionMap);

const controls    = attachControls(canvas, sphereGroup, () => {
  document.getElementById('intro').classList.add('faded');
});
attachPicker(canvas, camera, nodeObjects, controls);

// ── Animate ────────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

(function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  controls.tick();

  nodeObjects.forEach(n => {
    n.mesh.scale.setScalar(1 + 0.25 * Math.sin(t * 2 + n.pulseOffset));
    n.ring.material.opacity = 0.2 + 0.25 * Math.sin(t * 2 + n.pulseOffset + 1);
  });

  matWire.opacity = 0.1 + 0.06 * Math.sin(t * 0.5);

  renderer.render(scene, camera);
}());
