import * as THREE from 'three';
import { showTooltip, hideTooltip } from '../ui/tooltip.js';
import { openPanel } from '../ui/panel.js';

// Scratch objects — allocated once, reused every event.
const raycaster = new THREE.Raycaster();
const mouse     = new THREE.Vector2();

// nodeObjects: array of { mesh, ring, data }
// tileObjects: array of THREE.Group (each has userData.data and userData.handler)
export function attachPicker(canvas, camera, nodeObjects, tileObjects, controls) {
  const nodeMeshes = nodeObjects.map(n => n.mesh);

  let hoveredTile = null;
  // Lights the trail blaze nearest the hovered photo. No-op until the async tile
  // load wires the real setter in via bindBlazes(), so hover never throws.
  let setActiveBlaze = () => {};

  // Track mouse travel to distinguish click from drag
  let mouseDownX = 0, mouseDownY = 0;
  const DRAG_THRESHOLD = 5; // px

  function pick(clientX, clientY) {
    mouse.x =  (clientX / window.innerWidth)  * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const nodeHits = raycaster.intersectObjects(nodeMeshes);
    // Collect tile meshes at pick-time so async-loaded tiles are included
    const visibleTileMeshes = tileObjects
      .map(g => g.userData.tileMesh)
      .filter(m => m?.parent?.visible);
    const tileHits = raycaster.intersectObjects(visibleTileMeshes);

    return { nodeHits, tileHits };
  }

  window.addEventListener('mousedown', e => {
    mouseDownX = e.clientX;
    mouseDownY = e.clientY;
  });

  // Hide tooltip when cursor leaves the window
  window.addEventListener('mouseleave', () => {
    if (hoveredTile) { hoveredTile.userData.isHovered = false; hoveredTile = null; }
    setActiveBlaze(null);
    hideTooltip();
  });

  window.addEventListener('mousemove', e => {
    const { nodeHits, tileHits } = pick(e.clientX, e.clientY);

    if (tileHits.length > 0) {
      const tileGroup = tileObjects.find(g => g.userData.tileMesh === tileHits[0].object);

      if (tileGroup !== hoveredTile) {
        if (hoveredTile) hoveredTile.userData.isHovered = false;
        hoveredTile = tileGroup;
        tileGroup.userData.isHovered = true;
        setActiveBlaze(tileGroup.userData.data);   // light the nearest blaze
      }
      showTooltip(tileGroup.userData.data.title, e.clientX, e.clientY);
      canvas.style.cursor = 'pointer';

    } else {
      if (hoveredTile) { hoveredTile.userData.isHovered = false; hoveredTile = null; setActiveBlaze(null); }
      hideTooltip();
      canvas.style.cursor = controls.isDragging ? 'grabbing' : 'grab';
    }
  });

  window.addEventListener('click', e => {
    // Ignore if the mouse travelled far — treat as a drag, not a click
    const dx = e.clientX - mouseDownX;
    const dy = e.clientY - mouseDownY;
    if (Math.hypot(dx, dy) > DRAG_THRESHOLD) return;

    const { nodeHits, tileHits } = pick(e.clientX, e.clientY);

    if (nodeHits.length > 0) {
      const node = nodeObjects.find(n => n.mesh === nodeHits[0].object);
      openPanel(node.data);
    } else if (tileHits.length > 0) {
      const tileGroup = tileObjects.find(g => g.userData.tileMesh === tileHits[0].object);
      tileGroup.userData.handler.open(tileGroup.userData.data);
    }
  });

  // The blaze setter is built by the async tile load; wire it in once it exists.
  return { bindBlazes: fn => { setActiveBlaze = fn || (() => {}); } };
}
