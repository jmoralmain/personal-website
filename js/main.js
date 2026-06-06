import * as THREE from 'three';
import { buildScene }    from './core/sceneSetup.js';
import { buildSphere }   from './core/sphere.js';
import { buildNodes }    from './core/nodes.js';
import { attachControls} from './interaction/controls.js';
import { attachPicker }  from './interaction/picker.js';
import { buildTile, tickTile } from './tiles/Tile.js';
import { loadFolderTiles }     from './content/r2loader.js';
import { REGIONS, NODES, TILES } from './content/manifest.js';

// ── Bootstrap ──────────────────────────────────────────────────────────────────
const canvas = document.getElementById('globe');
const { renderer, scene, camera } = buildScene(canvas);

const { sphereGroup, matWire } = buildSphere();
scene.add(sphereGroup);

const regionMap   = Object.fromEntries(REGIONS.map(r => [r.id, r]));
const nodeObjects = buildNodes(sphereGroup, NODES, regionMap);

// tileObjects grows as folders load asynchronously
const tileObjects = [];

// Seed with any explicitly positioned tiles from the manifest
TILES.forEach(data => {
  const tile = buildTile(data, regionMap[data.region]?.color);
  sphereGroup.add(tile);
  tileObjects.push(tile);
});

// R2 folder declarations — one entry per region folder in your bucket.
// Add a folder here when you create a new folder in R2.
// Files inside are listed in _index.json in that folder.
const R2_FOLDERS = [
  { region: 'climbing',  folder: 'Climbing'  },
  { region: 'family',    folder: 'Family'    },
  { region: 'friends',   folder: 'Friends'   },
  { region: 'portraits', folder: 'Portraits' },
  { region: 'data',      folder: 'Data'      },
];

loadFolderTiles(R2_FOLDERS).then(tiles => {
  tiles.forEach(data => {
    const tile = buildTile(data, regionMap[data.region]?.color);
    sphereGroup.add(tile);
    tileObjects.push(tile);
  });
}).catch(err => {
  console.error('[main] Failed to load folder tiles:', err);
});

const controls = attachControls(canvas, sphereGroup, () => {
  document.getElementById('intro').classList.add('faded');
});
attachPicker(canvas, camera, nodeObjects, tileObjects, controls);

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

  tileObjects.forEach(tile => tickTile(tile, camera));

  matWire.opacity = 0.1 + 0.06 * Math.sin(t * 0.5);

  renderer.render(scene, camera);
}());
