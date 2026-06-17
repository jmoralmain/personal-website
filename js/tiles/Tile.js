import * as THREE from 'three';
import { latLonToVec3 } from '../core/coords.js';
import { SPHERE_R }     from '../core/sphere.js';
import { getHandler }   from './registry.js';
import { THEME }        from '../core/theme.js';

// 4:3, matching the thumb canvas in types/image.js so photos aren't stretched.
const TILE_W = 0.65;
const TILE_H = 0.4875;

// Elevation of the tile center above the sphere surface in each mode.
// tickTile interpolates between these based on altitude.
const ELEV_FLAT  = 0.04;               // flat: just above surface (avoids z-fighting)
const ELEV_STAND = TILE_H / 2 + 0.04; // standing: bottom edge clears the surface

// Scratch objects — allocated once, reused every frame to avoid per-frame GC pressure.
const _worldPos      = new THREE.Vector3();
const _toCamera      = new THREE.Vector3();
const _radial        = new THREE.Vector3();
const _fwd           = new THREE.Vector3();
const _right         = new THREE.Vector3();
const _flatRight     = new THREE.Vector3();
const _flatUp        = new THREE.Vector3();
const _targetScale   = new THREE.Vector3();
const _parentInvQuat = new THREE.Quaternion();
const _flatQuat      = new THREE.Quaternion();
const _standQuat     = new THREE.Quaternion();
const _desiredQuat   = new THREE.Quaternion();
const _basisMat      = new THREE.Matrix4();

export function buildTile(data, regionColor) {
  const handler = getHandler(data.type ?? 'image');
  const texture = handler.buildThumb(data, regionColor);

  texture.colorSpace = THREE.SRGBColorSpace;

  const geometry = new THREE.PlaneGeometry(TILE_W, TILE_H);
  const material = new THREE.MeshStandardMaterial({
    map:           texture,
    side:          THREE.FrontSide,
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

  // Initial flat position — tickTile updates position and orientation every frame.
  group.position.copy(latLonToVec3(data.lat, data.lon, SPHERE_R + ELEV_FLAT));

  // Unit direction from sphere centre to this lat/lon in sphereGroup local space.
  // Stored once so tickTile can reposition the tile each frame without allocation.
  const surfaceDir = group.position.clone().normalize();

  group.userData = { data, handler, borderMat, tileMesh: mesh, isHovered: false, surfaceDir };

  return group;
}

// Called every frame. Blends tile orientation between flat (orbit, altitude≈1)
// and standing/billboard (surface, altitude≈0), fades near the limb, scales on hover.
export function tickTile(tileGroup, camera, altitude) {
  const { borderMat, tileMesh, surfaceDir } = tileGroup.userData;

  // ── Back-hemisphere culling ─────────────────────────────────────────────────
  // Use the radial direction for culling — not the tile face direction, because
  // in standing mode the face always points toward the camera (dot always > 0).
  tileGroup.getWorldPosition(_worldPos);
  _radial.copy(_worldPos).normalize();
  _toCamera.copy(camera.position).sub(_worldPos).normalize();
  const dot = _radial.dot(_toCamera);

  const visible = dot > -0.05;
  tileGroup.visible = visible;
  if (!visible) return;

  // ── Flat orientation (face = radial outward, tile lies on surface) ──────────
  // Gram-Schmidt: build an orthonormal basis with _radial as the face (+Z) axis.
  _flatUp.set(0, 1, 0);
  if (Math.abs(_radial.y) > 0.9) _flatUp.set(1, 0, 0); // pole fallback
  _flatRight.crossVectors(_flatUp, _radial).normalize();
  _flatUp.crossVectors(_radial, _flatRight).normalize(); // re-orthogonalise
  _basisMat.makeBasis(_flatRight, _flatUp, _radial);
  _flatQuat.setFromRotationMatrix(_basisMat);

  // ── Standing / billboard orientation (face = tangential toward camera) ──────
  // Project the camera direction onto the tangent plane (strip the radial component)
  // to get the in-plane direction the tile face should point toward.
  _fwd.copy(_toCamera).addScaledVector(_radial, -dot);
  const fwdLen = _fwd.length();  // = sin(angle between radial and cam direction)

  if (fwdLen > 0.05) {
    // Normal case: tile is off-centre enough to have a clear facing direction.
    _fwd.divideScalar(fwdLen);
    _right.crossVectors(_radial, _fwd); // up × forward = right (right-handed, unit length)
    _basisMat.makeBasis(_right, _radial, _fwd);
    _standQuat.setFromRotationMatrix(_basisMat);
  } else {
    // Degenerate: tile is at or near the dead-centre of the camera view, so the
    // radial direction and camera direction nearly coincide — no valid in-plane
    // facing exists. Fall back to the flat orientation: the camera is looking
    // nearly straight at the tile from above, which shows a flat tile squarely.
    _standQuat.copy(_flatQuat);
  }

  // ── Blend and apply ─────────────────────────────────────────────────────────
  // t = 0 → fully flat (orbit), t = 1 → fully standing (surface).
  const t = 1 - altitude;
  _desiredQuat.slerpQuaternions(_flatQuat, _standQuat, t);

  // Convert desired WORLD quaternion → tile LOCAL quaternion.
  // worldQ = parentWorldQ × localQ  →  localQ = parentWorldQ⁻¹ × worldQ
  tileGroup.parent.getWorldQuaternion(_parentInvQuat);
  _parentInvQuat.invert();
  tileGroup.quaternion.copy(_parentInvQuat).multiply(_desiredQuat);

  // ── Elevation blend ─────────────────────────────────────────────────────────
  // Flat tiles sit just above the surface; standing tiles must be raised so
  // their bottom edge clears the sphere.
  const elev = SPHERE_R + ELEV_FLAT + (ELEV_STAND - ELEV_FLAT) * t;
  tileGroup.position.copy(surfaceDir).multiplyScalar(elev);

  // ── Opacity fade near the limb ──────────────────────────────────────────────
  const alpha = Math.min(1, Math.max(0, dot / 0.2));
  tileMesh.material.opacity = alpha;
  borderMat.opacity = tileGroup.userData.isHovered
    ? 0.9 * alpha
    : 0.35 * alpha;

  // ── Hover scale ─────────────────────────────────────────────────────────────
  const s = tileGroup.userData.isHovered ? 1.08 : 1.0;
  tileGroup.scale.lerp(_targetScale.set(s, s, s), 0.12);
}
