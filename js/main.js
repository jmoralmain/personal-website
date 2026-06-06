import * as THREE from 'three';

// ── Data ──────────────────────────────────────────────────────────────────────
// Each node: lat/lon in degrees, label shown on hover, panel content on click.
// Spread nodes across the sphere so no two overlap.
const NODES = [
  {
    lat:  40, lon:   0,
    label: '💻 Engineering',
    title: 'Software Engineering',
    icon: '💻',
    body: 'I build things for the web — from snappy frontends to robust backend services. Placeholder: replace with your actual projects and story.',
  },
  {
    lat: -30, lon:  80,
    label: '🎨 Design',
    title: 'Design & Creativity',
    icon: '🎨',
    body: 'Passionate about clean, purposeful UI. I care about the gap between how something looks and how it feels to use. Placeholder: swap with your design work.',
  },
  {
    lat:  20, lon: 160,
    label: '📚 Learning',
    title: 'Continuous Learning',
    icon: '📚',
    body: 'Currently diving into WebGL, distributed systems, and machine learning fundamentals. Placeholder: list what you\'re currently studying.',
  },
  {
    lat: -50, lon: -90,
    label: '🎵 Music',
    title: 'Music',
    icon: '🎵',
    body: 'Music is how I decompress — I play guitar and produce lo-fi beats on weekends. Placeholder: fill in your actual musical interests.',
  },
  {
    lat:  60, lon: -150,
    label: '🌍 Travel',
    title: 'Travel & Culture',
    icon: '🌍',
    body: 'I\'ve explored corners of Europe and South-East Asia. Every trip reshapes how I think about design and people. Placeholder: add your travel story.',
  },
  {
    lat: -10, lon: -40,
    label: '⚽ Sports',
    title: 'Sports & Fitness',
    icon: '⚽',
    body: 'Five-a-side football on Sundays and a daily run to stay sharp. Placeholder: describe your fitness interests.',
  },
];

// ── Scene setup ───────────────────────────────────────────────────────────────
const canvas  = document.getElementById('globe');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const scene  = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.z = 3.2;

// ── Sphere ────────────────────────────────────────────────────────────────────
const SPHERE_R = 1;

// Wireframe icosahedron shell
const geoWire = new THREE.IcosahedronGeometry(SPHERE_R, 4);
const matWire = new THREE.MeshBasicMaterial({
  color: 0x7b61ff,
  wireframe: true,
  opacity: 0.15,
  transparent: true,
});
const wireMesh = new THREE.Mesh(geoWire, matWire);
scene.add(wireMesh);

// Solid inner glow sphere
const geoSolid = new THREE.SphereGeometry(SPHERE_R * 0.97, 64, 64);
const matSolid = new THREE.MeshStandardMaterial({
  color: 0x0a0a28,
  roughness: 0.6,
  metalness: 0.2,
  opacity: 0.85,
  transparent: true,
});
const solidMesh = new THREE.Mesh(geoSolid, matSolid);
scene.add(solidMesh);

// ── Lights ────────────────────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const pointLight1 = new THREE.PointLight(0x7b61ff, 4, 8);
pointLight1.position.set(3, 3, 2);
scene.add(pointLight1);

const pointLight2 = new THREE.PointLight(0x00d4ff, 3, 8);
pointLight2.position.set(-3, -2, -2);
scene.add(pointLight2);

// ── Star field ────────────────────────────────────────────────────────────────
{
  const starCount = 1200;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = 12 + Math.random() * 8;
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.04, sizeAttenuation: true });
  scene.add(new THREE.Points(starGeo, starMat));
}

// ── Node sprites ──────────────────────────────────────────────────────────────
function latLonToVec3(lat, lon, r) {
  const phi   = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
     r * Math.cos(phi),
     r * Math.sin(phi) * Math.sin(theta),
  );
}

const nodeObjects = []; // { mesh, data, baseScale }

NODES.forEach(data => {
  const pos = latLonToVec3(data.lat, data.lon, SPHERE_R + 0.04);

  // Glowing dot
  const geo = new THREE.SphereGeometry(0.045, 16, 16);
  const mat = new THREE.MeshBasicMaterial({ color: 0x7b61ff });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.copy(pos);
  mesh.userData = data;
  scene.add(mesh);

  // Outer ring halo
  const ringGeo = new THREE.RingGeometry(0.06, 0.075, 32);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0x7b61ff, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.copy(pos);
  ring.lookAt(0, 0, 0);
  scene.add(ring);

  nodeObjects.push({ mesh, ring, data, pulseOffset: Math.random() * Math.PI * 2 });
});

// ── Drag / rotation ───────────────────────────────────────────────────────────
const globe = new THREE.Group();
globe.add(wireMesh, solidMesh, ...nodeObjects.map(n => n.mesh), ...nodeObjects.map(n => n.ring));
scene.add(globe);
// (already added to scene individually above — reorganise into group)
// Clear and re-add properly:
scene.clear();
scene.add(ambientLight, pointLight1, pointLight2);
// Stars stay in world space
{
  const starCount = 1200;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi   = Math.acos(2 * Math.random() - 1);
    const r     = 12 + Math.random() * 8;
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
  }
  const sg = new THREE.BufferGeometry();
  sg.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.04, sizeAttenuation: true })));
}

const sphereGroup = new THREE.Group();
sphereGroup.add(wireMesh, solidMesh);
nodeObjects.forEach(n => { sphereGroup.add(n.mesh); sphereGroup.add(n.ring); });
scene.add(sphereGroup);

// Drag state
let isDragging   = false;
let prevX = 0, prevY = 0;
let velX  = 0, velY  = 0;
const DRAG_SPEED = 0.005;
const INERTIA    = 0.92;

canvas.addEventListener('mousedown', e => {
  isDragging = true;
  prevX = e.clientX; prevY = e.clientY;
  velX = 0; velY = 0;
  document.getElementById('intro').classList.add('faded');
});
window.addEventListener('mousemove', e => {
  if (!isDragging) return;
  const dx = e.clientX - prevX;
  const dy = e.clientY - prevY;
  velX = dx * DRAG_SPEED;
  velY = dy * DRAG_SPEED;
  sphereGroup.rotation.y += velX;
  sphereGroup.rotation.x += velY;
  prevX = e.clientX; prevY = e.clientY;
  checkHover(e);
});
window.addEventListener('mouseup', () => { isDragging = false; });

// Touch support
canvas.addEventListener('touchstart', e => {
  isDragging = true;
  prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
  velX = 0; velY = 0;
  document.getElementById('intro').classList.add('faded');
}, { passive: true });
window.addEventListener('touchmove', e => {
  if (!isDragging) return;
  const dx = e.touches[0].clientX - prevX;
  const dy = e.touches[0].clientY - prevY;
  velX = dx * DRAG_SPEED;
  velY = dy * DRAG_SPEED;
  sphereGroup.rotation.y += velX;
  sphereGroup.rotation.x += velY;
  prevX = e.touches[0].clientX; prevY = e.touches[0].clientY;
}, { passive: true });
window.addEventListener('touchend', () => { isDragging = false; });

// ── Hover / click raycasting ──────────────────────────────────────────────────
const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 0.1;
const mouse     = new THREE.Vector2();
const tooltip   = document.getElementById('tooltip');
let hoveredNode = null;

function checkHover(e) {
  mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(nodeObjects.map(n => n.mesh));
  if (hits.length > 0) {
    const node = nodeObjects.find(n => n.mesh === hits[0].object);
    if (node !== hoveredNode) {
      if (hoveredNode) resetNodeColor(hoveredNode);
      hoveredNode = node;
      node.mesh.material.color.set(0x00d4ff);
      node.ring.material.color.set(0x00d4ff);
    }
    tooltip.textContent = node.data.label;
    tooltip.style.left  = (e.clientX + 14) + 'px';
    tooltip.style.top   = (e.clientY - 10) + 'px';
    tooltip.classList.add('visible');
    canvas.style.cursor = 'pointer';
  } else {
    if (hoveredNode) { resetNodeColor(hoveredNode); hoveredNode = null; }
    tooltip.classList.remove('visible');
    canvas.style.cursor = isDragging ? 'grabbing' : 'grab';
  }
}

function resetNodeColor(node) {
  node.mesh.material.color.set(0x7b61ff);
  node.ring.material.color.set(0x7b61ff);
}

window.addEventListener('mousemove', checkHover);

window.addEventListener('click', e => {
  mouse.x =  (e.clientX / window.innerWidth)  * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const hits = raycaster.intersectObjects(nodeObjects.map(n => n.mesh));
  if (hits.length > 0) {
    const node = nodeObjects.find(n => n.mesh === hits[0].object);
    openPanel(node.data);
  }
});

// ── Panel ─────────────────────────────────────────────────────────────────────
const panel      = document.getElementById('panel');
const panelClose = document.getElementById('panel-close');
const panelIcon  = document.getElementById('panel-icon');
const panelTitle = document.getElementById('panel-title');
const panelBody  = document.getElementById('panel-body');

function openPanel(data) {
  panelIcon.textContent  = data.icon;
  panelTitle.textContent = data.title;
  panelBody.textContent  = data.body;
  panel.classList.remove('hidden');
}

panelClose.addEventListener('click', () => panel.classList.add('hidden'));

// ── Resize ────────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Animate ───────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // Inertia
  if (!isDragging) {
    sphereGroup.rotation.y += velX;
    sphereGroup.rotation.x += velY;
    velX *= INERTIA;
    velY *= INERTIA;
    // Gentle auto-rotate when idle
    if (Math.abs(velX) < 0.0002 && Math.abs(velY) < 0.0002) {
      sphereGroup.rotation.y += 0.0008;
    }
  }

  // Pulse nodes
  nodeObjects.forEach(n => {
    const s = 1 + 0.25 * Math.sin(t * 2 + n.pulseOffset);
    n.mesh.scale.setScalar(s);
    n.ring.material.opacity = 0.2 + 0.25 * Math.sin(t * 2 + n.pulseOffset + 1);
  });

  // Shimmer wireframe
  matWire.opacity = 0.1 + 0.06 * Math.sin(t * 0.5);

  renderer.render(scene, camera);
}

animate();
