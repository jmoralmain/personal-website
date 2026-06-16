import * as THREE from 'three';
import { latLonToVec3 } from '../core/coords.js';
import { SPHERE_R }     from '../core/sphere.js';
import { getHandler }   from './registry.js';
import { THEME }        from '../core/theme.js';

// 4:3, matching the thumb canvas in types/image.js so photos aren't stretched.
const TILE_W = 0.65;
const TILE_H = 0.4875;
// Tiles stand upright: center must be TILE_H/2 above the surface so the bottom
// doesn't clip through the sphere, plus a small gap.
const TILE_ELEVATION = TILE_H / 2 + 0.05;

// Scratch objects — allocated once, reused every frame to avoid per-frame GC pressure.
const _worldPos       = new THREE.Vector3();
const _toCamera       = new THREE.Vector3();
const _radial         = new THREE.Vector3();
const _fwd            = new THREE.Vector3();
const _right          = new THREE.Vector3();
const _targetScale    = new THREE.Vector3();
const _parentInvQuat  = new THREE.Quaternion();
const _desiredQuat    = new THREE.Quaternion();
const _basisMat       = new THREE.Matrix4();

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
  const borderGeo = new THREE.PlaneGeometry(TILE_W + 0.022, TILE_H + 0.022);
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

  // Stand the tile upright: local Y = radial direction (up from surface).
  // tickTile overwrites this every frame via cylindrical billboarding, so the
  // facing direction chosen here only matters for the very first frame.
  const up  = pos.clone().normalize();
  const ref = Math.abs(up.y) < 0.9
    ? new THREE.Vector3(0, 1, 0)
    : new THREE.Vector3(1, 0, 0);
  const right = new THREE.Vector3().crossVectors(ref, up).normalize();
  const fwd   = new THREE.Vector3().crossVectors(up, right).normalize();
  group.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(right, up, fwd),
  );
}

// Called every frame. Billboards tiles to face the camera (cylindrical, rotating
// around the local-up / radial axis), fades tiles on the back hemisphere, and
// scales the hovered tile.
export function tickTile(tileGroup, camera) {
  const { borderMat, tileMesh } = tileGroup.userData;

  // Back-hemisphere culling — use the RADIAL direction (worldPos normalised),
  // not the tile's face direction. With cylindrical billboarding the face always
  // points toward the camera, so face·toCamera would never cull anything.
  tileGroup.getWorldPosition(_worldPos);
  _radial.copy(_worldPos).normalize();
  _toCamera.copy(camera.position).sub(_worldPos).normalize();
  const dot = _radial.dot(_toCamera);

  const visible = dot > -0.05;
  tileGroup.visible = visible;
  if (!visible) return;

  // ── Cylindrical billboard ───────────────────────────────────────────────────
  // Project the camera direction onto the local tangent plane (remove the
  // component along the radial / up direction), giving the in-plane direction
  // the tile face should point toward.
  _fwd.copy(_toCamera).addScaledVector(_radial, -dot);
  const fwdLen = _fwd.length();

  if (fwdLen > 0.001) {
    _fwd.divideScalar(fwdLen);
    _right.crossVectors(_radial, _fwd);   // right = up × forward (right-handed)

    // Build desired WORLD quaternion from the three orthonormal axes:
    //   local X → right,  local Y → radial (up),  local Z → fwd (face toward cam)
    _basisMat.makeBasis(_right, _radial, _fwd);
    _desiredQuat.setFromRotationMatrix(_basisMat);

    // Convert world → local: localQ = parentWorldQ⁻¹ × desiredWorldQ
    tileGroup.parent.getWorldQuaternion(_parentInvQuat);
    _parentInvQuat.invert();
    tileGroup.quaternion.copy(_parentInvQuat).multiply(_desiredQuat);
  }
  // If fwdLen ≈ 0 (tile dead-centre of view), skip update — any orientation
  // is correct when the camera looks straight at the tile.

  // ── Opacity fade near the limb ──────────────────────────────────────────────
  const alpha = Math.min(1, Math.max(0, (dot - 0.0) / 0.2));
  tileMesh.material.opacity = alpha;
  borderMat.opacity = tileGroup.userData.isHovered
    ? 0.9 * alpha
    : 0.35 * alpha;

  // ── Hover scale ─────────────────────────────────────────────────────────────
  const s = tileGroup.userData.isHovered ? 1.08 : 1.0;
  tileGroup.scale.lerp(_targetScale.set(s, s, s), 0.12);
}
