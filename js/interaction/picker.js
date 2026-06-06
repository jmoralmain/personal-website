import * as THREE from 'three';
import { showTooltip, hideTooltip } from '../ui/tooltip.js';
import { openPanel } from '../ui/panel.js';

// Scratch objects — allocated once, reused every event.
const raycaster = new THREE.Raycaster();
const mouse     = new THREE.Vector2();

let hoveredNode = null;

// nodeObjects: array of { mesh, ring, data }
export function attachPicker(canvas, camera, nodeObjects, controls) {
  function getRegionColor(data) {
    return data.regionColor ?? 0x7b61ff;
  }

  function resetColor(node) {
    const c = getRegionColor(node.data);
    node.mesh.material.color.set(c);
    node.ring.material.color.set(c);
  }

  function pick(clientX, clientY) {
    mouse.x =  (clientX / window.innerWidth)  * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    return raycaster.intersectObjects(nodeObjects.map(n => n.mesh));
  }

  window.addEventListener('mousemove', e => {
    const hits = pick(e.clientX, e.clientY);
    if (hits.length > 0) {
      const node = nodeObjects.find(n => n.mesh === hits[0].object);
      if (node !== hoveredNode) {
        if (hoveredNode) resetColor(hoveredNode);
        hoveredNode = node;
        node.mesh.material.color.set(0x00d4ff);
        node.ring.material.color.set(0x00d4ff);
      }
      showTooltip(node.data.label, e.clientX, e.clientY);
      canvas.style.cursor = 'pointer';
    } else {
      if (hoveredNode) { resetColor(hoveredNode); hoveredNode = null; }
      hideTooltip();
      canvas.style.cursor = controls.isDragging ? 'grabbing' : 'grab';
    }
  });

  window.addEventListener('click', e => {
    const hits = pick(e.clientX, e.clientY);
    if (hits.length > 0) {
      const node = nodeObjects.find(n => n.mesh === hits[0].object);
      openPanel(node.data);
    }
  });
}
