import * as THREE from 'three';
import { buildScene }      from './core/sceneSetup.js';
import { buildSphere }     from './core/sphere.js';
import { attachControls }  from './interaction/controls.js';
import { attachPicker }    from './interaction/picker.js';
import { tickTile }        from './tiles/Tile.js';
import { loadRegionTiles } from './tiles/loadTiles.js';
import { REGIONS, TILES }  from './content/manifest.js';

// ── Bootstrap ──────────────────────────────────────────────────────────────────
const canvas = document.getElementById('globe');
const { renderer, scene, camera } = buildScene(canvas);

const { sphereGroup, matWire } = buildSphere();
scene.add(sphereGroup);

const regionMap   = Object.fromEntries(REGIONS.map(r => [r.id, r]));

// tileObjects grows as the R2 folders load asynchronously.
const tileObjects = [];
loadRegionTiles(REGIONS, TILES, regionMap).then(tiles => {
  tiles.forEach(tile => { sphereGroup.add(tile); tileObjects.push(tile); });
}).catch(err => console.error('[main] Failed to load tiles:', err));

const controls = attachControls(canvas, sphereGroup, () => {
  document.getElementById('intro').classList.add('faded');
});
attachPicker(canvas, camera, [], tileObjects, controls);

// ── Animate ────────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
(function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  controls.tick();
  tileObjects.forEach(tile => tickTile(tile, camera));
  matWire.opacity = 0.1 + 0.06 * Math.sin(t * 0.5);

  renderer.render(scene, camera);
}());
