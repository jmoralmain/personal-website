import * as THREE from 'three';

export const SPHERE_R = 2;

// Returns { sphereGroup, matWire } — sphereGroup is added to the scene by caller.
export function buildSphere() {
  const sphereGroup = new THREE.Group();

  const geoWire = new THREE.IcosahedronGeometry(SPHERE_R, 4);
  const matWire = new THREE.MeshBasicMaterial({
    color: 0x7b61ff,
    wireframe: true,
    opacity: 0.15,
    transparent: true,
  });
  sphereGroup.add(new THREE.Mesh(geoWire, matWire));

  const geoSolid = new THREE.SphereGeometry(SPHERE_R * 0.97, 64, 64);
  const matSolid = new THREE.MeshStandardMaterial({
    color: 0x0a0a28,
    roughness: 0.6,
    metalness: 0.2,
    opacity: 0.85,
    transparent: true,
  });
  sphereGroup.add(new THREE.Mesh(geoSolid, matSolid));

  return { sphereGroup, matWire };
}
