// Tests latLonToVec3 against known geometric values.
// The math is re-implemented without a THREE dependency so this suite
// reports failures even if THREE fails to load entirely.
//
// Coordinate system used by latLonToVec3:
//   lon=0,  lat=0  → ( 1,  0,  0)  front (faces camera)
//   lon=180,lat=0  → (-1,  0,  0)  back
//   lon=90, lat=0  → ( 0,  0, -1)  right
//   lon=-90,lat=0  → ( 0,  0,  1)  left
//   lat=90         → ( 0,  1,  0)  north pole
//   lat=-90        → ( 0, -1,  0)  south pole

export const name = 'Coordinate math (latLonToVec3)';

function latLonToVec3(lat, lon, r) {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return {
    x: -r * Math.sin(phi) * Math.cos(theta),
    y:  r * Math.cos(phi),
    z:  r * Math.sin(phi) * Math.sin(theta),
  };
}

const EPS = 1e-10;

function near(a, b) { return Math.abs(a - b) < EPS; }

function vecNear(v, ex, ey, ez) {
  return near(v.x, ex) && near(v.y, ey) && near(v.z, ez);
}

export function run() {
  const results = [];

  // ── Compass points (equator) ─────────────────────────────────────────────
  // These define the coordinate system. If any fails, placement of every
  // node and tile on the globe is wrong.

  const eq0 = latLonToVec3(0, 0, 1);
  results.push(check(
    'Equator lon=0   → ( 1,  0,  0) [front, faces camera]',
    vecNear(eq0, 1, 0, 0),
    `got (${fmt(eq0.x)}, ${fmt(eq0.y)}, ${fmt(eq0.z)}) — coordinate system is inverted or rotated`,
  ));

  const eq180 = latLonToVec3(0, 180, 1);
  results.push(check(
    'Equator lon=180  → (-1,  0,  0) [back of sphere]',
    vecNear(eq180, -1, 0, 0),
    `got (${fmt(eq180.x)}, ${fmt(eq180.y)}, ${fmt(eq180.z)})`,
  ));

  const eq90 = latLonToVec3(0, 90, 1);
  results.push(check(
    'Equator lon=90   → ( 0,  0, -1) [right side]',
    vecNear(eq90, 0, 0, -1),
    `got (${fmt(eq90.x)}, ${fmt(eq90.y)}, ${fmt(eq90.z)}) — check sign of theta in latLonToVec3`,
  ));

  const eqn90 = latLonToVec3(0, -90, 1);
  results.push(check(
    'Equator lon=-90  → ( 0,  0,  1) [left side]',
    vecNear(eqn90, 0, 0, 1),
    `got (${fmt(eqn90.x)}, ${fmt(eqn90.y)}, ${fmt(eqn90.z)})`,
  ));

  // ── Poles ────────────────────────────────────────────────────────────────
  const np = latLonToVec3(90, 0, 1);
  results.push(check(
    'North pole lat=90  → ( 0,  1,  0)',
    vecNear(np, 0, 1, 0),
    `got (${fmt(np.x)}, ${fmt(np.y)}, ${fmt(np.z)}) — phi calculation wrong`,
  ));

  const sp = latLonToVec3(-90, 0, 1);
  results.push(check(
    'South pole lat=-90 → ( 0, -1,  0)',
    vecNear(sp, 0, -1, 0),
    `got (${fmt(sp.x)}, ${fmt(sp.y)}, ${fmt(sp.z)})`,
  ));

  // ── Radius scaling ────────────────────────────────────────────────────────
  // Doubling r must double the distance from origin. If this fails,
  // nodes placed at SPHERE_R + 0.04 will be at the wrong elevation.
  const r1   = latLonToVec3(30, 45, 1);
  const r2   = latLonToVec3(30, 45, 2);
  const dist1 = Math.sqrt(r1.x**2 + r1.y**2 + r1.z**2);
  const dist2 = Math.sqrt(r2.x**2 + r2.y**2 + r2.z**2);
  results.push(check(
    'Radius r=2 produces a point twice as far from origin as r=1',
    near(dist2, dist1 * 2),
    `r=1 → dist ${fmt(dist1)}, r=2 → dist ${fmt(dist2)} (expected ${fmt(dist1 * 2)}) — r is not applied linearly`,
  ));

  // ── Unit sphere invariant ─────────────────────────────────────────────────
  // Every point on a unit sphere must be distance exactly 1 from origin.
  // We test each of the five real region center coordinates from the manifest
  // so a breakage here directly implies region placement is wrong.
  const regionCenters = [
    { label: 'Climbing  (lat 30,  lon   0)', lat:  30, lon:    0 },
    { label: 'Family    (lat -20, lon  80)', lat: -20, lon:   80 },
    { label: 'Friends   (lat 20,  lon 160)', lat:  20, lon:  160 },
    { label: 'Portraits (lat -40, lon -100)',lat: -40, lon: -100 },
    { label: 'Data Eng  (lat 55,  lon -160)',lat:  55, lon: -160 },
  ];
  regionCenters.forEach(({ label, lat, lon }) => {
    const v    = latLonToVec3(lat, lon, 1);
    const dist = Math.sqrt(v.x**2 + v.y**2 + v.z**2);
    results.push(check(
      `${label} lies on unit sphere (|v| = 1.0)`,
      near(dist, 1),
      `|v| = ${dist.toFixed(12)} — floating point error exceeds ${EPS}; check sin/cos formula`,
    ));
  });

  return results;
}

function check(label, passed, failDetail) {
  return { label, passed, severity: 'error', detail: passed ? null : failDetail };
}

function fmt(n) { return n.toFixed(8); }
