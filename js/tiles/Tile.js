import * as THREE from 'three';
import { latLonToVec3 } from '../core/coords.js';
import { SPHERE_R }     from '../core/sphere.js';
import { getHandler }   from './registry.js';
import { THEME }        from '../core/theme.js';
import { roundRectPath, RADIUS_FRAC } from './tileShape.js';

// 4:3, matching the thumb canvas in types/image.js so photos aren't stretched.
const TILE_W = 0.65;
const TILE_H = 0.4875;

// How far the border ring plane extends past the photo plane (total, per axis).
const BORDER_PAD = 0.022;

// Elevation of the tile center above the sphere surface in each mode.
// tickTile interpolates between these based on altitude.
const ELEV_FLAT  = 0.04;               // flat: just above surface (avoids z-fighting)
const ELEV_STAND = TILE_H / 2 + 0.04; // standing: bottom edge clears the surface

// Tiles are hidden before they reach the geometric limb (see tickTile) so they
// never poke past the globe's silhouette. At orbit the whole silhouette is on
// screen and the cull must bite well inside the limb: the test uses the tile's
// CENTER, but a flat tile spans ~19° of arc, so its outer half can still hang
// past the edge — 0.6 keeps the whole fade band well inside the disc (at
// landscape z=5 and portrait z≈9 alike), leaving room for that overhang. At
// the surface the limb is off-screen and an early cull would delete visible
// tiles, so it relaxes to 0.08. Blended by altitude.
const LIMB_CULL_SURFACE = 0.08;
const LIMB_CULL_ORBIT   = 0.6;

// Fade-in when a tile's real photo swaps in (see tickTile's reveal block).
// Checked once at module load — same pattern as controls.js / flyTo.js.
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
// Per-frame lerp factor toward reveal=1. Not dt-normalized (matches the hover
// scale lerp below) — at ~60fps this reaches ~95% in ~20 frames, ≈330ms.
const REVEAL_LERP = 0.15;

// Scratch objects — allocated once, reused every frame to avoid per-frame GC pressure.
const _worldPos      = new THREE.Vector3();
const _toCamera      = new THREE.Vector3();
const _cameraFwd     = new THREE.Vector3();
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

  // Border glow using a slightly larger plane behind the tile — a rounded
  // ring texture (shared, tinted per region) so it follows the photo's
  // soft corners instead of poking square corners out behind them.
  const borderGeo = new THREE.PlaneGeometry(TILE_W + BORDER_PAD, TILE_H + BORDER_PAD);
  const borderMat = new THREE.MeshBasicMaterial({
    map:         getRingTexture(),
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

  // reveal: 1 = fully shown (instant states — placeholder, preview, reduced
  // motion). image.js's buildThumb() has no access to this tileGroup (its
  // contract is fixed at buildThumb(data, regionColor) → texture), so when
  // the real photo swaps in it flags the texture's own `.userData` instead;
  // tickTile below reads + clears that flag and resets reveal to 0 to fade in.
  group.userData = { data, handler, borderMat, tileMesh: mesh, isHovered: false, surfaceDir, reveal: 1 };

  return group;
}

// Called every frame. Blends tile orientation between flat (orbit, altitude≈1)
// and standing/billboard (surface, altitude≈0), fades near the limb, scales on hover.
export function tickTile(tileGroup, camera, altitude) {
  const { borderMat, tileMesh, surfaceDir } = tileGroup.userData;

  // ── Limb culling ────────────────────────────────────────────────────────────
  // Use the radial direction for culling — not the tile face direction, because
  // in standing mode the face always points toward the camera (dot always > 0).
  // Cull slightly BEFORE the geometric limb (dot 0.08, not 0): tiles sit above
  // the surface, so at the limb they poke past the globe's silhouette and read
  // as debris stuck to the edge. Fading them out just inside keeps the circle clean.
  tileGroup.getWorldPosition(_worldPos);
  _radial.copy(_worldPos).normalize();
  _toCamera.copy(camera.position).sub(_worldPos).normalize();
  const dot = _radial.dot(_toCamera);

  const limbCull = LIMB_CULL_SURFACE + (LIMB_CULL_ORBIT - LIMB_CULL_SURFACE) * altitude;
  const visible = dot > limbCull;
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

  // ── Standing / billboard orientation (face = perpendicular to camera view) ──────
  // View-aligned: tile face normal = −camera.forward so every photo is perfectly
  // face-on regardless of where it sits in the viewport or how the camera tilts.
  camera.getWorldDirection(_cameraFwd);
  _fwd.copy(_cameraFwd).negate();                        // face normal toward viewer

  // Up = radial orthogonalised against face normal so the tile stands upright.
  const rdn = _radial.dot(_fwd);
  _flatUp.copy(_radial).addScaledVector(_fwd, -rdn);
  const upLen = _flatUp.length();
  if (upLen > 0.01) {
    _flatUp.divideScalar(upLen);
    _right.crossVectors(_flatUp, _fwd);                  // right = up × normal
    _basisMat.makeBasis(_right, _flatUp, _fwd);
    _standQuat.setFromRotationMatrix(_basisMat);
  } else {
    _standQuat.copy(_flatQuat);                          // degenerate: tile on camera axis
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

  // ── Reveal fade-in (real photo just arrived) ────────────────────────────────
  // See buildTile's userData comment for the signaling mechanism.
  const map = tileMesh.material.map;
  if (map && map.userData.justRevealed) {
    tileGroup.userData.reveal = 0;
    map.userData.justRevealed = false;
  }
  if (prefersReducedMotion) {
    tileGroup.userData.reveal = 1;
  } else {
    tileGroup.userData.reveal += (1 - tileGroup.userData.reveal) * REVEAL_LERP;
  }

  // ── Opacity fade near the limb ──────────────────────────────────────────────
  const alpha = Math.min(1, Math.max(0, (dot - limbCull) / 0.2));
  tileMesh.material.opacity = alpha * tileGroup.userData.reveal;
  borderMat.opacity = tileGroup.userData.isHovered
    ? 0.9 * alpha
    : 0.35 * alpha;

  // ── Hover scale ─────────────────────────────────────────────────────────────
  const s = tileGroup.userData.isHovered ? 1.08 : 1.0;
  tileGroup.scale.lerp(_targetScale.set(s, s, s), 0.12);
}

// White rounded ring, built once and shared by every tile's border material
// (each material tints it with its region color). Drawn at the same px/world
// scale as the 512px photo thumb so the ring's corner radius lines up with
// the photo's rounded corners (tileShape.js RADIUS_FRAC).
let _ringTexture = null;

function getRingTexture() {
  if (_ringTexture) return _ringTexture;

  const pxPerUnit = 512 / TILE_W;
  const w   = Math.round((TILE_W + BORDER_PAD) * pxPerUnit);
  const h   = Math.round((TILE_H + BORDER_PAD) * pxPerUnit);
  const pad = (BORDER_PAD / 2) * pxPerUnit;      // photo edge inset from ring edge
  const r   = 512 * RADIUS_FRAC;                 // photo corner radius in ring px

  const canvas  = document.createElement('canvas');
  canvas.width  = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Solid rounded plate...
  ctx.fillStyle = '#fff';
  roundRectPath(ctx, 1, 1, w - 2, h - 2, r + pad - 1);
  ctx.fill();
  // ...with the photo area punched out, 2px INSIDE the photo edge so the ring
  // tucks under the photo's feathered edge with no gap between them.
  ctx.globalCompositeOperation = 'destination-out';
  roundRectPath(ctx, pad + 2, pad + 2, w - 2 * (pad + 2), h - 2 * (pad + 2), r - 2);
  ctx.fill();

  _ringTexture = new THREE.CanvasTexture(canvas);
  _ringTexture.colorSpace = THREE.SRGBColorSpace;
  return _ringTexture;
}
