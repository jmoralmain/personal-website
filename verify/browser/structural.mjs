// Headless runner for the structural checks (verify/index.html).
//
// The structural suites in verify/checks/ were built to run in a browser page.
// This harness loads that same page in headless Chrome, waits for the runner
// to finish, and reports the summary on the CLI — so an agent (or CI) can run
// the full check suite without a human opening a browser. It reuses the exact
// stubbing strategy of smoke.mjs (see that file and docs/TESTING.md): the
// Three.js CDN is served from a local copy; everything else is real.
//
// Env vars (same defaults as smoke.mjs):
//   CHROME_PATH  path to a Chrome/Chromium binary
//   THREE_PATH   path to a local three.module.js matching the pinned version
//   BASE_URL     where the site is served (default http://localhost:8899)
//   PLAYWRIGHT_DIR  where playwright-core is installed (default /tmp)
//
// Exit code 0 iff every check passes (warnings allowed, matching summarise()).

import fs from 'fs';
import { createRequire } from 'module';

const CHROME_PATH = process.env.CHROME_PATH
  || ['/tmp/chrome-linux64/chrome', '/opt/pw-browsers/chromium'].find(p => fs.existsSync(p))
  || '/tmp/chrome-linux64/chrome';
const THREE_PATH  = process.env.THREE_PATH  || '/tmp/node_modules/three/build/three.module.js';
const BASE_URL    = process.env.BASE_URL    || 'http://localhost:8899';
const PLAYWRIGHT_DIR = process.env.PLAYWRIGHT_DIR || '/tmp';
const require = createRequire(`${PLAYWRIGHT_DIR}/`);
const { chromium } = require('playwright-core');

const THREE_SRC = fs.readFileSync(THREE_PATH, 'utf8');

const browser = await chromium.launch({
  executablePath: CHROME_PATH,
  headless: true,
  args: ['--no-sandbox', '--disable-gpu', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const pageErrors = [];
page.on('pageerror', e => pageErrors.push(e.message));

await page.route(/cdn\.jsdelivr\.net\/.*three\.module\.js/, r =>
  r.fulfill({ status: 200, contentType: 'application/javascript', body: THREE_SRC }));
await page.route(/cdn\.jsdelivr\.net\/.*examples\/jsm\/.*/, r =>
  r.fulfill({ status: 200, contentType: 'application/javascript', body: 'export default {};' }));
await page.route(/fonts\.(googleapis|gstatic)\.com\/.*/, r =>
  r.fulfill({ status: 200, contentType: 'text/css', body: '' }));

await page.goto(`${BASE_URL}/verify/index.html`, { waitUntil: 'networkidle' });
await page.waitForSelector('.overall', { timeout: 30000 });

const report = await page.evaluate(() => {
  const rows = [...document.querySelectorAll('#output tr')].map(tr => ({
    status: tr.className.replace('row-', ''),
    label:  tr.querySelector('.label')?.childNodes[0]?.textContent.trim() ?? '',
    detail: tr.querySelector('.detail')?.textContent.trim() ?? '',
  }));
  return { overall: document.querySelector('.overall').textContent.trim(), rows };
});

await browser.close();

const icon = { pass: '✓', fail: '✗', warn: '⚠', info: '·' };
for (const r of report.rows) {
  console.log(`${icon[r.status] ?? '?'}  ${r.label}${r.detail ? '  — ' + r.detail : ''}`);
}
if (pageErrors.length) console.log(`\nPage errors: ${pageErrors.join(' | ')}`);

const failed = report.rows.filter(r => r.status === 'fail').length;
const warned = report.rows.filter(r => r.status === 'warn').length;
console.log(`\n${report.overall} — ${report.rows.length} checks, ${failed} failed, ${warned} warnings`);
process.exit(failed === 0 && pageErrors.length === 0 ? 0 : 1);
