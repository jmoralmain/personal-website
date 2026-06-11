import * as THREE from 'three';
import { buildScene }    from '../../js/core/sceneSetup.js';
import { buildSphere }   from '../../js/core/sphere.js';
import { buildNodes }    from '../../js/core/nodes.js';
import { REGIONS, NODES } from '../../js/content/manifest.js';

export const name = 'Scene setup (sceneSetup, sphere, nodes)';

export function run() {
  const results = [];

  // ── buildScene ────────────────────────────────────────────────────────────
  let renderer, scene, camera;
  try {
    const offscreen = document.createElement('canvas');
    ({ renderer, scene, camera } = buildScene(offscreen));
  } catch (e) {
    results.push(fail(
      'buildScene() threw during construction',
      `${e.name}: ${e.message}. This means the WebGL renderer, scene, or camera ` +
      `could not be created. Common causes: WebGL unavailable (check env check above), ` +
      `canvas element is null, or a Three.js API changed in a version upgrade. ` +
      `Stack: ${e.stack}`,
    ));
    return results;
  }

  results.push(check('buildScene returns a WebGLRenderer',
    renderer instanceof THREE.WebGLRenderer,
    `Got ${typeStr(renderer)}. sceneSetup.js must return { renderer, scene, camera }.`));

  results.push(check('buildScene returns a Scene',
    scene instanceof THREE.Scene,
    `Got ${typeStr(scene)}. main.js calls scene.add(sphereGroup) — a non-Scene will throw.`));

  results.push(check('buildScene returns a PerspectiveCamera',
    camera instanceof THREE.PerspectiveCamera,
    `Got ${typeStr(camera)}. picker.js passes camera to raycaster.setFromCamera() — wrong type causes silent pick failures.`));

  // Orbit camera distance is aspect-dependent (portrait needs more room) —
  // matches updateCamera() in sceneSetup.js and orbitZ() in flyTo.js.
  const expectedZ = (window.innerWidth / window.innerHeight) < 1 ? 5.5 : 4.0;
  results.push(check(`Camera orbit distance is z=${expectedZ} for this aspect`,
    camera.position.z === expectedZ,
    `z=${camera.position.z}. Orbit z must be 4.0 landscape / 5.5 portrait so the ` +
    `sphere (radius 2) fills the frame without cropping. If you changed one, ` +
    `update sceneSetup.js updateCamera() AND flyTo.js orbitZ() together.`));

  results.push(check('Camera FOV is 50° (orbit view)',
    camera.fov === 50,
    `FOV=${camera.fov}. 50° is the orbit-view FOV; flyTo.js narrows toward 38° at ` +
    `the surface. A wider FOV distorts the sphere edges; narrower makes it feel flat.`));

  // Lights
  const lights = [];
  scene.traverse(obj => { if (obj.isLight) lights.push(obj); });
  results.push(check('Scene has exactly 3 lights',
    lights.length === 3,
    `Found ${lights.length} light(s). Expected: 1 AmbientLight + 2 PointLights. ` +
    `Too few = flat/dark sphere; too many = washed out. Check sceneSetup.js _addLights().`));

  const ambients = lights.filter(l => l.isAmbientLight);
  results.push(check('Scene has 1 AmbientLight',
    ambients.length === 1,
    `Found ${ambients.length}. AmbientLight fills dark areas of the sphere. ` +
    `Zero = only lit where point lights hit; more than one = double ambient (too bright).`));

  const points = lights.filter(l => l.isPointLight);
  results.push(check('Scene has 2 PointLights (warm sun key + olive fill)',
    points.length === 2,
    `Found ${points.length}. These create the dimensional sheen on the sphere surface. ` +
    `Check sceneSetup.js _addLights() for the key and fill light setup.`));

  // The night-sky starfield (sceneSetup.js _addSky) is the scene's single
  // Points object. [Check changed 2026-06: it previously asserted NO starfield
  // — the background was the flat obsidian canvas. The design now reads the
  // space around the globe as open night sky (docs/DESIGN.md §4.2), so the
  // starfield is required rather than forbidden.]
  const stars = [];
  scene.traverse(obj => { if (obj.isPoints) stars.push(obj); });
  results.push(check('Scene has exactly 1 Points object (the night-sky starfield)',
    stars.length === 1,
    `Found ${stars.length} Points object(s). Expected the single starfield built by ` +
    `sceneSetup.js _addSky(). Zero = the background reads as a void; more = stray geometry.`));

  // ── buildSphere ───────────────────────────────────────────────────────────
  let sphereGroup;
  try {
    ({ sphereGroup } = buildSphere());
  } catch (e) {
    results.push(fail(
      'buildSphere() threw during construction',
      `${e.name}: ${e.message}. The globe meshes could not be created. Stack: ${e.stack}`,
    ));
    return results;
  }

  results.push(check('buildSphere returns a Group',
    sphereGroup instanceof THREE.Group,
    `Got ${typeStr(sphereGroup)}. sphereGroup must be a Group so all children ` +
    `rotate together when dragged. A plain Mesh would not accept child nodes.`));

  // [Check changed 2026-06: it previously expected 2 meshes (terrain solid +
  // wireframe survey graticule). The graticule was removed from the design —
  // the globe is now bare terrain under a night sky (docs/DESIGN.md §4.2) —
  // so a wireframe mesh here is leftover geometry, not a requirement.]
  const sphereMeshes = [];
  sphereGroup.traverse(obj => { if (obj.isMesh) sphereMeshes.push(obj); });
  results.push(check('sphereGroup contains exactly 1 mesh (the terrain solid)',
    sphereMeshes.length === 1,
    `Found ${sphereMeshes.length} mesh(es). Expected just the solid terrain sphere — the ` +
    `survey graticule was removed. Missing solid = transparent globe; extras = unintended geometry.`));

  results.push(check('No wireframe meshes on the globe (graticule removed by design)',
    !sphereMeshes.some(m => m.material?.wireframe === true),
    `Found a wireframe mesh in sphereGroup. The survey graticule was removed from the ` +
    `design (docs/DESIGN.md §4.2) — remove the leftover grid from core/sphere.js.`));

  // ── buildNodes ────────────────────────────────────────────────────────────
  let nodeObjects;
  try {
    const regionMap = Object.fromEntries(REGIONS.map(r => [r.id, r]));
    nodeObjects = buildNodes(sphereGroup, NODES, regionMap);
  } catch (e) {
    results.push(fail(
      'buildNodes() threw during construction',
      `${e.name}: ${e.message}. Node meshes could not be created. ` +
      `Common causes: NODES is malformed, latLonToVec3 received non-numeric lat/lon, ` +
      `or sphereGroup.add() received a non-Object3D. Stack: ${e.stack}`,
    ));
    renderer.dispose();
    return results;
  }

  results.push(check('buildNodes returns an array',
    Array.isArray(nodeObjects),
    `Got ${typeStr(nodeObjects)}. main.js iterates nodeObjects in the animate loop — ` +
    `a non-array throws a TypeError and kills animation.`));

  results.push(check(`buildNodes returns ${NODES.length} entries (one per manifest node)`,
    Array.isArray(nodeObjects) && nodeObjects.length === NODES.length,
    `Expected ${NODES.length}, got ${nodeObjects?.length ?? 'N/A'}. ` +
    `A count mismatch means some nodes were silently skipped during buildNodes. ` +
    `Check for exceptions swallowed inside nodes.js forEach.`));

  if (Array.isArray(nodeObjects)) {
    nodeObjects.forEach((n, i) => {
      const id = NODES[i]?.id ?? i;
      results.push(check(`nodeObjects[${i}] (${id}) has mesh`,
        n?.mesh instanceof THREE.Mesh,
        `mesh is ${typeStr(n?.mesh)}. picker.js raycasts against mesh; animate loop scales mesh. ` +
        `A non-Mesh means the node is invisible and unclickable.`));

      results.push(check(`nodeObjects[${i}] (${id}) has ring`,
        n?.ring instanceof THREE.Mesh,
        `ring is ${typeStr(n?.ring)}. The pulsing ring halo is animated in main.js. ` +
        `Missing ring causes a TypeError in the animate loop: "Cannot set property 'opacity' of undefined".`));

      results.push(check(`nodeObjects[${i}] (${id}) has data object`,
        typeof n?.data === 'object' && n.data !== null,
        `data is ${JSON.stringify(n?.data)}. picker.js reads data.label for the tooltip ` +
        `and passes data to openPanel() — undefined data causes silent blank panels.`));

      results.push(check(`nodeObjects[${i}] (${id}) has numeric pulseOffset`,
        typeof n?.pulseOffset === 'number',
        `pulseOffset is ${JSON.stringify(n?.pulseOffset)}. Used in Math.sin(t * 2 + pulseOffset) ` +
        `in the animate loop — a non-number produces NaN scale and makes the node invisible.`));
    });

    // Verify total child count in sphereGroup after nodes added
    const allMeshes = [];
    sphereGroup.traverse(obj => { if (obj.isMesh) allMeshes.push(obj); });
    const expected = 2 + NODES.length * 2;  // 2 sphere + (dot + ring) × nodes
    results.push(check(
      `sphereGroup has ${expected} total meshes (2 sphere + ${NODES.length * 2} node dot/ring pairs)`,
      allMeshes.length === expected,
      `Found ${allMeshes.length}, expected ${expected}. ` +
      `Extra meshes: check for double-call to buildNodes. ` +
      `Fewer meshes: some nodes failed to add to sphereGroup — their dots/rings won't rotate with the globe.`,
    ));
  }

  // Dispose the offscreen renderer so the check doesn't exhaust the
  // browser's WebGL context limit (browsers allow ~8–16 simultaneous contexts).
  renderer.dispose();

  return results;
}

function check(label, passed, failDetail) {
  return {
    label,
    passed: passed !== false,
    severity: 'error',
    detail:   (passed !== false) ? null : (failDetail ?? 'assertion failed'),
  };
}

function fail(label, detail) {
  return { label, passed: false, severity: 'error', detail };
}

function typeStr(v) {
  if (v === null)      return 'null';
  if (v === undefined) return 'undefined';
  return v.constructor?.name ?? typeof v;
}
