// Headless browser smoke test — drives the real site in Chrome and checks the
// things that only show up at runtime: the scene builds, no page errors, the
// ocean theme is applied, and the photo lightbox opens/closes and shows a photo
// even with no caption.
//
// This exists because the unit/structural checks in verify/checks/ can't prove
// the page actually renders. See docs/TESTING.md for setup and how to run it.
//
// Two things this machine can't reach are stubbed via request interception:
//   - the Three.js CDN  -> served from a local copy (THREE_PATH)
//   - the R2 photo URLs -> served as a generated SVG stand-in
// Everything else (our own JS/CSS, the repo index.json files) is served for
// real by a local static server.
//
// Env vars (all have sensible defaults):
//   CHROME_PATH  path to a Chrome/Chromium binary
//   THREE_PATH   path to a local three.module.js matching the pinned version
//   BASE_URL     where the site is served (default http://localhost:8899)

import fs from 'fs';
import { createRequire } from 'module';

// Chrome resolution: explicit env var, else the Chrome-for-Testing download
// from docs/TESTING.md, else the Chromium pre-installed in Claude's remote
// sandbox (see docs/AI_STACK.md).
const CHROME_PATH = process.env.CHROME_PATH
  || ['/tmp/chrome-linux64/chrome', '/opt/pw-browsers/chromium'].find(p => fs.existsSync(p))
  || '/tmp/chrome-linux64/chrome';
const THREE_PATH  = process.env.THREE_PATH  || '/tmp/node_modules/three/build/three.module.js';
const BASE_URL    = process.env.BASE_URL    || 'http://localhost:8899';
// playwright-core often isn't installed in the repo. Resolve it from wherever
// it lives (PLAYWRIGHT_DIR, default /tmp) so the harness can run from anywhere.
const PLAYWRIGHT_DIR = process.env.PLAYWRIGHT_DIR || '/tmp';
const require = createRequire(`${PLAYWRIGHT_DIR}/`);
const { chromium } = require('playwright-core');

const THREE_SRC = fs.readFileSync(THREE_PATH, 'utf8');

function svgPhoto(label, color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480">
    <rect width="640" height="480" fill="${color}"/>
    <circle cx="320" cy="200" r="120" fill="#ffffff" opacity="0.25"/>
    <text x="320" y="430" font-size="40" fill="#fff" text-anchor="middle"
      font-family="sans-serif">${label}</text></svg>`;
}

const results = [];
const record = (name, pass, detail = '') => {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  — ' + detail : ''}`);
};

const errors = [];
const warnings = [];

const browser = await chromium.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

page.on('console', m => {
  const t = m.text();
  if (m.type() === 'error') errors.push(t);
  if (/GL_INVALID|texSubImage2D|WebGLState/.test(t)) warnings.push(t);
});
page.on('pageerror', e => errors.push(`PAGEERROR: ${e.message}`));

await page.route(/cdn\.jsdelivr\.net\/.*three\.module\.js/, r =>
  r.fulfill({ status: 200, contentType: 'application/javascript', body: THREE_SRC }));
// Google Fonts (Inter + JetBrains Mono) — purely cosmetic; offline machines
// fall back to the system font stacks declared in css/style.css.
await page.route(/fonts\.(googleapis|gstatic)\.com\/.*/, r =>
  r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
await page.route(/cdn\.jsdelivr\.net\/.*examples\/jsm\/.*/, r =>
  r.fulfill({ status: 200, contentType: 'application/javascript', body: 'export default {};' }));
await page.route(/r2\.dev\/.*/, r => {
  const u = decodeURIComponent(r.request().url());
  const color = u.includes('Music') ? '#ff5e7e' : '#ff7a3d';
  r.fulfill({ status: 200, contentType: 'image/svg+xml', body: svgPhoto(u.split('/').pop().slice(0, 18), color) });
});

await page.goto(`${BASE_URL}/index.html`, { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);

const diag = await page.evaluate(() => {
  const c = document.getElementById('globe');
  const cs = getComputedStyle(document.documentElement);
  return {
    canvas: !!c && c.width > 0 && c.height > 0,
    // White studio: the body is a soft cyclorama (radial light-bloom over a
    // vertical cove fading to a warm floor), painted as layered gradient images
    // and shown through the transparent canvas (renderer uses alpha:true, so the
    // body's own background-color stays transparent).
    roomBg: getComputedStyle(document.body).backgroundColor === 'rgba(0, 0, 0, 0)'
            && getComputedStyle(document.body).backgroundImage.includes('radial-gradient'),
    // The lime survey marker is the one accent (resolves via --color-lime-surveyor).
    limeAccent: cs.getPropertyValue('--color-lime-surveyor').trim().toLowerCase() === '#ebfc72',
    regionButtons: document.querySelectorAll('#region-nav .region-jump').length,
  };
});
record('WebGL canvas built', diag.canvas);
record('White studio room applied (cyclorama gradient over warm floor)', diag.roomBg);
record('Lime survey-marker accent applied', diag.limeAccent, '--color-lime-surveyor should be #ebfc72');
record('Region jump bar built from manifest', diag.regionButtons === 5,
  `found ${diag.regionButtons} buttons, expected 5`);

await page.screenshot({ path: '/tmp/shot-globe.png' });

await page.evaluate(async () => {
  const { openLightbox } = await import('/js/ui/lightbox.js');
  openLightbox({ src: 'https://pub-x.r2.dev/Music/coachella.JPG', title: 'Coachella', caption: 'Yuma tent.' });
});
await page.waitForTimeout(600);
record('Lightbox opens on a photo', await page.evaluate(() =>
  !document.getElementById('lightbox').classList.contains('hidden')));
await page.screenshot({ path: '/tmp/shot-lightbox.png' });

await page.keyboard.press('Escape');
await page.waitForTimeout(400);
record('Lightbox closes on Esc', await page.evaluate(() =>
  document.getElementById('lightbox').classList.contains('hidden')));

await page.evaluate(async () => {
  const { openLightbox } = await import('/js/ui/lightbox.js');
  openLightbox({ src: 'https://pub-x.r2.dev/Climbing/x.JPG' });  // no title/caption
});
await page.waitForTimeout(400);
record('Photo shows with no title/caption', await page.evaluate(() => {
  const img = document.getElementById('lightbox-img');
  return img.complete && img.naturalWidth > 0;
}));

record('No page errors', errors.length === 0, errors.join(' | '));
record('No WebGL texture warnings', warnings.length === 0, warnings.join(' | '));

await browser.close();

const failed = results.filter(r => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length === 0 ? 0 : 1);
