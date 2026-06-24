import * as THREE from 'three';

const RAD = Math.PI / 180;

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

// Spherical "direct geodesic": from (lat, lon) travel `distDeg` of arc along the
// great circle leaving at initial compass bearing `bearingDeg`. Returns the
// destination as { lat, lon } in degrees. Used to walk a meandering road across
// the sphere one step at a time.
export function destinationPoint(lat, lon, bearingDeg, distDeg) {
  const phi1 = lat * RAD, lam1 = lon * RAD, brg = bearingDeg * RAD, d = distDeg * RAD;
  const sinPhi2 = Math.sin(phi1) * Math.cos(d) + Math.cos(phi1) * Math.sin(d) * Math.cos(brg);
  const phi2    = Math.asin(Math.max(-1, Math.min(1, sinPhi2)));
  const y = Math.sin(brg) * Math.sin(d) * Math.cos(phi1);
  const x = Math.cos(d) - Math.sin(phi1) * sinPhi2;
  const lam2 = lam1 + Math.atan2(y, x);
  return { lat: phi2 / RAD, lon: ((lam2 / RAD + 540) % 360) - 180 };
}

// Initial compass bearing (degrees, 0..360) of the great circle from point 1 to
// point 2 — used to steer the road back toward a center or along a tangent.
export function initialBearing(lat1, lon1, lat2, lon2) {
  const phi1 = lat1 * RAD, phi2 = lat2 * RAD, dLam = (lon2 - lon1) * RAD;
  const y = Math.sin(dLam) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLam);
  return (Math.atan2(y, x) / RAD + 360) % 360;
}

// Great-circle angular distance (degrees) between two lat/lon points.
export function angularDist(lat1, lon1, lat2, lon2) {
  const phi1 = lat1 * RAD, phi2 = lat2 * RAD;
  const dot  = Math.sin(phi1) * Math.sin(phi2)
             + Math.cos(phi1) * Math.cos(phi2) * Math.cos((lon2 - lon1) * RAD);
  return Math.acos(Math.max(-1, Math.min(1, dot))) / RAD;
}
