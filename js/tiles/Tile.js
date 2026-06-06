import * as THREE from 'three';
import { latLonToVec3 } from '../core/coords.js';
import { SPHERE_R }     from '../core/sphere.js';
import { getHandler }   from './registry.js';

// Tile elevation above sphere surface
const TILE_ELEVATION = 0.03;
// Default tile size in world units (width × height ratio 4:3)
const TILE_W = 0.38;
const TILE_H = 0.285;

export function buildTile(data, regionColor) {
  const handler = getHandler(data.type ?? 'image');
  const texture = handler.buildThumb(data, regionColor);

  texture.colorSpace = THREE.SRGBColorSpace;

  const geometry = new THREE.PlaneGeometry(TILE_W, TILE_H);
  const material = new THREE.MeshStandardMaterial({
    map:           texture,
    side:          THREE.FrontSide,   // back-face culling: only front renders
    transparent:   true,
    opacity:       1,
    depthWrite:    false,
  });

  // Border glow using a slightly larger plane behind the tile
  const borderGeo = new THREE.PlaneGeometry(TILE_W + 0.018, TILE_H + 0.018);
  const borderMat = new THREE.MeshBasicMaterial({
    color:       new THREE.Color(regionColor ?? '#7b61ff'),
    transparent: true,
    opacity:     0.35,
    depthWrite:  false,
    side:        THREE.FrontSide,
  });
  const border = new THREE.Mesh(borderGeo, borderMat);
  border.position.z = -0.001;

  const group = new THREE.Group();
  group.add(border);

  const mesh = new THREE.Mesh(geometry, material);
  group.add(mesh);

  // Position the group on the sphere surface, oriented tangent to it
  positionOnSphere(group, data.lat, data.lon);

  group.userData = { data, handler, borderMat, tileMesh: mesh, isHovered: false };

  return group;
}

function positionOnSphere(group, lat, lon) {
  const r   = SPHERE_R + TILE_ELEVATION;
  const pos = latLonToVec3(lat, lon, r);
  group.position.copy(pos);

  // Orient the tile so it faces outward (away from sphere center)
  group.lookAt(0, 0, 0);
  // lookAt points -Z toward target; flip 180° so the face points outward
  group.rotateY(Math.PI);
}

// Called every frame. Fades tiles on the back hemisphere; scales hovered tile.
export function tickTile(tileGroup, camera) {
  const { borderMat, tileMesh } = tileGroup.userData;

  // Dot product of tile outward normal with direction to camera
  const worldNormal = new THREE.Vector3(0, 0, 1)
    .applyQuaternion(tileGroup.quaternion);
  const toCamera = camera.position.clone().sub(tileGroup.position).normalize();
  const dot = worldNormal.dot(toCamera);

  // Fade out tiles approaching the limb (dot < 0.15) and hide back-facing ones
  const visible = dot > -0.05;
  tileGroup.visible = visible;
  if (!visible) return;

  const alpha = Math.min(1, Math.max(0, (dot - 0.0) / 0.2));
  tileMesh.material.opacity = alpha;
  borderMat.opacity = tileGroup.userData.isHovered
    ? 0.9 * alpha
    : 0.35 * alpha;

  // Hover scale
  const targetScale = tileGroup.userData.isHovered ? 1.08 : 1.0;
  tileGroup.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.12);
}
