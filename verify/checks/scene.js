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

  results.push(check('Camera is positioned at z=6.0',
    camera.position.z === 6.0,
    `z=${camera.position.z}. At z=6.0 the sphere (radius 2) fills the FOV correctly. ` +
    `Too close clips the sphere; too far makes it too small.`));

  results.push(check('Camera FOV is 50°',
    camera.fov === 50,
    `FOV=${camera.fov}. A wider FOV distorts the sphere edges; narrower makes it feel flat.`));

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
  results.push(check('Scene has 2 PointLights (violet key + cyan fill)',
    points.length === 2,
    `Found ${points.length}. These create the dimensional sheen on the sphere surface. ` +
    `Check sceneSetup.js _addLights() for the key and fill light setup.`));

  // Starfield
  const stars = [];
  scene.traverse(obj => { if (obj.isPoints) stars.push(obj); });
  results.push(check('Scene has exactly 1 starfield (Points object)',
    stars.length === 1,
    `Found ${stars.length} Points object(s). ` +
    `0 = no starfield background. >1 = double-density stars (check for duplicate _addStarfield calls).`));

  // ── buildSphere ───────────────────────────────────────────────────────────
  let sphereGroup, matWire;
  try {
    ({ sphereGroup, matWire } = buildSphere());
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

  results.push(check('buildSphere returns matWire as a MeshBasicMaterial',
    matWire instanceof THREE.MeshBasicMaterial,
    `Got ${typeStr(matWire)}. matWire is mutated in the animate loop ` +
    `(matWire.opacity = ...). The wrong type here causes a silent no-op shimmering effect.`));

  results.push(check('matWire.wireframe is true',
    matWire.wireframe === true,
    `wireframe=${matWire.wireframe}. Without wireframe=true the icosahedron renders ` +
    `as a solid mesh, obscuring the globe body.`));

  results.push(check('matWire.transparent is true',
    matWire.transparent === true,
    `transparent=${matWire.transparent}. Without transparent=true, opacity changes ` +
    `in the animate loop have no visible effect — the shimmer animation is broken.`));

  const sphereMeshes = [];
  sphereGroup.traverse(obj => { if (obj.isMesh) sphereMeshes.push(obj); });
  results.push(check('sphereGroup contains exactly 2 meshes (wireframe + solid)',
    sphereMeshes.length === 2,
    `Found ${sphereMeshes.length} mesh(es). Expected: 1 icosahedron wireframe + 1 solid sphere. ` +
    `Missing solid = transparent globe; extra meshes = unintended geometry.`));

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
