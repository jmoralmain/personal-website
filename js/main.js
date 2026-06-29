import { buildScene, syncScene }  from './core/sceneSetup.js';
import { buildSphere, SPHERE_R }  from './core/sphere.js';
import { startLoop }              from './core/loop.js';
import { attachControls }         from './interaction/controls.js';
import { attachPicker }           from './interaction/picker.js';
import { attachFlyTo }            from './interaction/flyTo.js';
import { tickTile }               from './tiles/Tile.js';
import { loadRegionTiles }        from './tiles/loadTiles.js';
import { attachRegionNav }        from './ui/regionNav.js';
import { tickCoords }             from './ui/coords.js';
import { REGIONS, TILES }         from './content/manifest.js';
import                               './ui/about.js';

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

startLoop(() => {
  controls.tick();
  flyTo.tick();
  tickCoords(sphereGroup);
  tileObjects.forEach(tile => tickTile(tile, camera, flyTo.getAltitude()));
  syncScene(camera, SPHERE_R);
  renderer.render(scene, camera);
});
