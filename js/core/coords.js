import * as THREE from 'three';

// Converts geographic coordinates to a point on a sphere of radius r.
export function latLonToVec3(lat, lon, r) {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  );
}

// Inverse of the above for the view center: given the sphereGroup's Euler
// rotation (x, y — controls never touch z), returns the {lat, lon} of the
// surface point currently facing the camera. Writes into `out` (no allocation;
// safe to call from the animate loop).
export function rotationToLatLon(rx, ry, out) {
  // The camera looks down world +Z; the local point that ends up there is
  // p = Ry(-ry) · Rx(-rx) · (0,0,1), expanded inline below.
  const cx = Math.cos(rx), sx = Math.sin(rx);
  const x = -Math.sin(ry) * cx;
  const y =  sx;
  const z =  Math.cos(ry) * cx;

  const phi = Math.acos(Math.min(1, Math.max(-1, y)));
  out.lat = 90 - phi * (180 / Math.PI);

  let lon = Math.atan2(z, -x) * (180 / Math.PI) - 180;
  while (lon >  180) lon -= 360;
  while (lon < -180) lon += 360;
  out.lon = lon;
  return out;
}
