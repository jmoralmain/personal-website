import * as THREE from 'three';
import { latLonToVec3 } from '../core/coords.js';
import { SPHERE_R }     from '../core/sphere.js';
import { getHandler }   from './registry.js';
import { THEME }        from '../core/theme.js';

const TILE_ELEVATION = 0.06;
// 4:3, matching the thumb canvas in types/image.js so photos aren't stretched.
// Sized so a tile fills ~1/3 of the frame height at surface altitude (was ~2/3
// at 0.9×0.68, which swallowed the screen and magnified the thumb past its
// resolution): close to the ground, but the photos stay photos.
const TILE_W = 0.46;
const TILE_H = 0.345;

// Scratch objects — allocated once, reused every frame to avoid per-frame GC pressure.
const _worldNormal = new THREE.Vector3();
const _toCamera    = new THREE.Vector3();
const _targetScale = new THREE.Vector3();
const _worldPos    = new THREE.Vector3();
const _worldQuat   = new THREE.Quaternion();

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
  const borderGeo = new THREE.PlaneGeometry(TILE_W + 0.016, TILE_H + 0.016);
  const borderMat = new THREE.MeshBasicMaterial({
    color:       new THREE.Color(regionColor ?? THEME.glint),
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

  // Dot product of the tile's outward normal with the direction to the camera —
  // computed in WORLD space. The tile is a child of sphereGroup, and dragging
  // rotates sphereGroup, so we must fold in the parent rotation. Using the
  // tile's local quaternion/position here would make this dot rotation-invariant,
  // which kept all but a fixed cap of tiles permanently hidden (rotating the
  // globe never revealed the other regions).
  tileGroup.getWorldQuaternion(_worldQuat);
  tileGroup.getWorldPosition(_worldPos);
  _worldNormal.set(0, 0, 1).applyQuaternion(_worldQuat);
  _toCamera.copy(camera.position).sub(_worldPos).normalize();
  const dot = _worldNormal.dot(_toCamera);

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
  const s = tileGroup.userData.isHovered ? 1.08 : 1.0;
  tileGroup.scale.lerp(_targetScale.set(s, s, s), 0.12);
}
