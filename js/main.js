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

const { sphereGroup } = buildSphere();
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
(function animate() {
  requestAnimationFrame(animate);
  controls.tick();
  tileObjects.forEach(tile => tickTile(tile, camera));
  renderer.render(scene, camera);
}());
