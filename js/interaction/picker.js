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
  // Collect the inner tile meshes (index 1 in each tile group) for raycasting
  const tileMeshes = tileObjects.map(g => g.userData.tileMesh);

  let hoveredNode = null;
  let hoveredTile = null;

  function resetNodeColor(node) {
    const c = node.data.regionColor ?? 0x7b61ff;
    node.mesh.material.color.set(c);
    node.ring.material.color.set(c);
  }

  function pick(clientX, clientY) {
    mouse.x =  (clientX / window.innerWidth)  * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const nodeHits = raycaster.intersectObjects(nodeMeshes);
    // Only raycast visible tiles
    const visibleTileMeshes = tileMeshes.filter(m => m.parent?.visible);
    const tileHits = raycaster.intersectObjects(visibleTileMeshes);

    return { nodeHits, tileHits };
  }

  window.addEventListener('mousemove', e => {
    const { nodeHits, tileHits } = pick(e.clientX, e.clientY);

    // Node hover takes priority over tile hover
    if (nodeHits.length > 0) {
      const node = nodeObjects.find(n => n.mesh === nodeHits[0].object);

      if (hoveredTile) { hoveredTile.userData.isHovered = false; hoveredTile = null; }

      if (node !== hoveredNode) {
        if (hoveredNode) resetNodeColor(hoveredNode);
        hoveredNode = node;
        node.mesh.material.color.set(0x00d4ff);
        node.ring.material.color.set(0x00d4ff);
      }
      showTooltip(node.data.label, e.clientX, e.clientY);
      canvas.style.cursor = 'pointer';

    } else if (tileHits.length > 0) {
      const tileGroup = tileObjects.find(g => g.userData.tileMesh === tileHits[0].object);

      if (hoveredNode) { resetNodeColor(hoveredNode); hoveredNode = null; }

      if (tileGroup !== hoveredTile) {
        if (hoveredTile) hoveredTile.userData.isHovered = false;
        hoveredTile = tileGroup;
        tileGroup.userData.isHovered = true;
      }
      showTooltip(tileGroup.userData.data.label, e.clientX, e.clientY);
      canvas.style.cursor = 'pointer';

    } else {
      if (hoveredNode) { resetNodeColor(hoveredNode); hoveredNode = null; }
      if (hoveredTile) { hoveredTile.userData.isHovered = false; hoveredTile = null; }
      hideTooltip();
      canvas.style.cursor = controls.isDragging ? 'grabbing' : 'grab';
    }
  });

  window.addEventListener('click', e => {
    const { nodeHits, tileHits } = pick(e.clientX, e.clientY);

    if (nodeHits.length > 0) {
      const node = nodeObjects.find(n => n.mesh === nodeHits[0].object);
      openPanel(node.data);
    } else if (tileHits.length > 0) {
      const tileGroup = tileObjects.find(g => g.userData.tileMesh === tileHits[0].object);
      tileGroup.userData.handler.open(tileGroup.userData.data);
    }
  });
}
