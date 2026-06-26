import { buildScene }      from './core/sceneSetup.js';
import { buildSphere }     from './core/sphere.js';
import { attachControls }  from './interaction/controls.js';
import { attachPicker }    from './interaction/picker.js';
import { attachFlyTo }     from './interaction/flyTo.js';
import { tickTile }        from './tiles/Tile.js';
import { loadRegionTiles } from './tiles/loadTiles.js';
import { attachRegionNav } from './ui/regionNav.js';
import { tickCoords }      from './ui/coords.js';
import { REGIONS, TILES }  from './content/manifest.js';

// ── Bootstrap ──────────────────────────────────────────────────────────────────
const canvas = document.getElementById('globe');
const { renderer, scene, camera } = buildScene(canvas);

const { sphereGroup } = buildSphere();
scene.add(sphereGroup);

const regionMap = Object.fromEntries(REGIONS.map(r => [r.id, r]));
const tileObjects = [];   // grows as the R2 folders load asynchronously
loadRegionTiles(REGIONS, TILES, regionMap).then(({ tiles, paths, visuals, blazes, setActiveBlaze }) => {
  [...visuals, ...paths, ...blazes].forEach(o => sphereGroup.add(o));
  tiles.forEach(tile => { sphereGroup.add(tile); tileObjects.push(tile); });
  picker.bindBlazes(setActiveBlaze);
}).catch(err => console.error('[main] Failed to load tiles:', err));

const fadeIntro = () => document.getElementById('intro').classList.add('faded');
const flyTo = attachFlyTo(sphereGroup, camera);
const nav   = attachRegionNav(REGIONS, {
  onJump:  id => { fadeIntro(); flyTo.flyToRegion(regionMap[id]); },
  onOrbit: () => flyTo.toOrbit(),
});
flyTo.onModeChange = nav.setMode;

const controls = attachControls(canvas, sphereGroup, () => {
  fadeIntro();
  flyTo.cancelRotation();   // a grab mid-flight hands rotation back to the user
  nav.setActive(null);
}, flyTo.getAltitude);
const picker = attachPicker(canvas, camera, [], tileObjects, controls);

// ── Animate ────────────────────────────────────────────────────────────────────
(function animate() {
  requestAnimationFrame(animate);
  controls.tick();
  flyTo.tick();
  tickCoords(sphereGroup);
  tileObjects.forEach(tile => tickTile(tile, camera, flyTo.getAltitude()));
  renderer.render(scene, camera);
}());
