import * as THREE from 'three';

// Must exactly match the version pinned in:
//   - docs/ENVIRONMENT.md
//   - the import map in index.html  (two entries: three + three/addons/)
const EXPECTED_THREE_VERSION = '0.165.0';

// Every DOM element required at startup. If any is missing, the module
// that depends on it will throw a TypeError at parse time, silently
// breaking the whole page.
const REQUIRED_DOM_IDS = [
  { id: 'globe',        usedBy: 'core/sceneSetup.js — WebGL canvas' },
  { id: 'intro',        usedBy: 'interaction/controls.js — faded on first drag' },
  { id: 'panel',        usedBy: 'ui/panel.js — detail panel container' },
  { id: 'panel-close',  usedBy: 'ui/panel.js — close button listener' },
  { id: 'panel-icon',   usedBy: 'ui/panel.js — icon slot' },
  { id: 'panel-title',  usedBy: 'ui/panel.js — title slot' },
  { id: 'panel-body',   usedBy: 'ui/panel.js — body text slot' },
  { id: 'tooltip',      usedBy: 'ui/tooltip.js — hover label element' },
];

// CSS tokens defined in :root of style.css.
// If missing, 3D scene colors and UI colors will silently fall back to
// browser defaults (often black or transparent).
const REQUIRED_CSS_TOKENS = [
  { token: '--bg',              affect: 'page background' },
  { token: '--accent',          affect: 'brand violet, gradients, wireframe' },
  { token: '--accent-2',        affect: 'brand cyan, hover color' },
  { token: '--text',            affect: 'all body text' },
  { token: '--text-dim',        affect: 'captions, panel body' },
  { token: '--panel-bg',        affect: 'glass panel background' },
  { token: '--region-climb',    affect: 'Climbing node/tile color' },
  { token: '--region-family',   affect: 'Family node/tile color' },
  { token: '--region-friends',  affect: 'Friends node/tile color' },
  { token: '--region-portrait', affect: 'Portraits node/tile color' },
  { token: '--region-data',     affect: 'Data Engineering node/tile color' },
];

export const name = 'Environment';

export function run() {
  const results = [];

  // ── Three.js version ─────────────────────────────────────────────────────
  // THREE.REVISION is an integer string like "165"; compare both forms.
  const expectedRev = EXPECTED_THREE_VERSION.replace(/\./g, '').replace(/^0+/, '');
  const actualRev   = String(THREE.REVISION).replace(/^0+/, '');
  const versionOk   = actualRev === expectedRev;
  results.push(check(
    `Three.js REVISION matches pin (${EXPECTED_THREE_VERSION})`,
    versionOk,
    `Got REVISION="${THREE.REVISION}" (parsed as "${actualRev}"), expected "${expectedRev}". ` +
    `Update the import map in index.html AND EXPECTED_THREE_VERSION in verify/checks/env.js ` +
    `AND the table in docs/ENVIRONMENT.md to match. See the upgrade steps in ENVIRONMENT.md.`,
  ));

  // ── WebGL ─────────────────────────────────────────────────────────────────
  const probe = document.createElement('canvas');
  const gl2   = !!probe.getContext('webgl2');
  const gl1   = !!probe.getContext('webgl') || !!probe.getContext('experimental-webgl');

  results.push(check(
    'WebGL 1 available (minimum required)',
    gl1 || gl2,
    'Neither webgl nor webgl2 context available. The sphere cannot render. ' +
    'Check browser version, GPU drivers, or hardware acceleration settings. ' +
    'On Chrome: chrome://settings/system → "Use hardware acceleration".',
  ));
  results.push(info(
    'WebGL 2 available (preferred)',
    gl2 ? 'Yes — optimal path' : 'No — falling back to WebGL 1 (still functional)',
  ));

  // ── Import map support ────────────────────────────────────────────────────
  const importMapsOk = HTMLScriptElement.supports?.('importmap') ?? false;
  results.push(check(
    'Import maps supported by this browser',
    importMapsOk,
    'Import maps are not supported. ES module loading via the <script type="importmap"> ' +
    'in index.html will fail and no JS will run. Minimum versions: ' +
    'Chrome 89+, Firefox 108+, Safari 16.4+. ' +
    'Workaround: introduce a build step (Vite) per SCALING.md §5.',
  ));

  // ── Required DOM elements ─────────────────────────────────────────────────
  REQUIRED_DOM_IDS.forEach(({ id, usedBy }) => {
    const el = document.getElementById(id);
    results.push(check(
      `DOM #${id} present`,
      !!el,
      `#${id} not found in the document. Used by: ${usedBy}. ` +
      `The module that queries this element will throw a TypeError at load time, ` +
      `silently preventing the sphere from initialising. Check index.html.`,
    ));
  });

  // ── CSS tokens ────────────────────────────────────────────────────────────
  const style = getComputedStyle(document.documentElement);
  REQUIRED_CSS_TOKENS.forEach(({ token, affect }) => {
    const value = style.getPropertyValue(token).trim();
    results.push(check(
      `CSS token ${token} defined`,
      value !== '',
      `Token ${token} is not defined in :root. Affects: ${affect}. ` +
      `Check that css/style.css is loaded and the :root block is intact. ` +
      `Components using this token will render with browser defaults (likely black or transparent).`,
    ));
  });

  return results;
}

function check(label, passed, failDetail) {
  return { label, passed, severity: 'error', detail: passed ? null : failDetail };
}

function info(label, detail) {
  return { label, passed: null, severity: 'info', detail };
}
