import * as THREE from 'three';
import { latLonToVec3 } from './coords.js';
import { SPHERE_R } from './sphere.js';

// Builds the glowing dot + ring for each manifest node and adds them to sphereGroup.
// Returns nodeObjects array for use by picker and animate loop.
export function buildNodes(sphereGroup, nodes, regionMap) {
  const nodeObjects = [];

  nodes.forEach(data => {
    const regionColor = parseInt((regionMap[data.region]?.color ?? '#7b61ff').replace('#', ''), 16);
    const pos = latLonToVec3(data.lat, data.lon, SPHERE_R + 0.08);

    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 16, 16),
      new THREE.MeshBasicMaterial({ color: regionColor }),
    );
    mesh.position.copy(pos);
    mesh.userData = { ...data, regionColor };
    sphereGroup.add(mesh);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.12, 0.15, 32),
      new THREE.MeshBasicMaterial({ color: regionColor, side: THREE.DoubleSide, transparent: true, opacity: 0.4 }),
    );
    ring.position.copy(pos);
    ring.lookAt(0, 0, 0);
    sphereGroup.add(ring);

    nodeObjects.push({ mesh, ring, data: { ...data, regionColor }, pulseOffset: Math.random() * Math.PI * 2 });
  });

  return nodeObjects;
}
