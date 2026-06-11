# Testing

How this project is verified. Two layers, used together:

1. **Structural checks** (`verify/index.html`) — fast, in-browser assertions
   about modules, the scene graph, the manifest, and CSS tokens.
2. **Browser smoke test** (`verify/browser/smoke.mjs`) — drives the *real*
   page in a headless Chrome and confirms it actually renders and behaves.

The rule of thumb: structural checks prove the wiring is sound; the smoke test
proves the page runs. Ship only when both are green.

---

## 1. Structural checks — `verify/index.html`

Open `verify/index.html` in a browser (or serve the repo and visit it). It runs
the suites in `verify/checks/` and shows green/red. Run this after any change;
all checks must pass before pushing. It covers:

- `env.js` — Three.js version pin, WebGL availability, required DOM ids
  (including the region jump bar and location label), required CSS tokens
  (`--bg`, `--accent`, the five `--region-*`, …).
- `scene.js` — camera (orbit z = 4.0/5.5 by aspect, FOV 50), 3 lights, no
  Points objects (sky is a CSS gradient), bare terrain sphere (no graticule),
  one node dot+ring per manifest node.
- `manifest.js`, `coords.js` — data shape and placement math.

These need no network beyond the Three.js CDN.

---

## 2. Browser smoke test — `verify/browser/smoke.mjs`

This is what caught the real bugs (CORS, then the texture-size
`GL_INVALID_VALUE`). It launches Chrome, loads the site, and asserts:

- the WebGL canvas builds and there are **0 page errors**;
- the **field-terminal** theme is applied (flat obsidian canvas, lime
  `--color-lime-surveyor` accent) and the region jump bar is built from the
  manifest;
- the **lightbox** opens on a photo, closes on `Esc`, and **shows the photo even
  with no title/caption**;
- there are **no WebGL texture warnings** (`GL_INVALID_VALUE` / `texSubImage2D`).

It screenshots `/tmp/shot-globe.png` and `/tmp/shot-lightbox.png` so you can eye
the result. It exits non-zero if any check fails.

### Why it stubs two things

The site loads Three.js from a CDN and photos from Cloudflare R2. In a locked-down
or offline environment those hosts are unreachable, so the harness intercepts
just those two requests:

- **Three.js CDN** → served from a local copy of the *same pinned version*.
- **R2 photo URLs** → served as a generated SVG stand-in image.
- **Google Fonts** → served as empty CSS (cosmetic only; the system font
  stacks in `css/style.css` take over).

Everything else — our own JS/CSS and the repo's `r2-indexes/*/index.json` — is
served for real by a local static server. So the test exercises our actual code
paths; only the two external dependencies are faked.

> When running against a machine that *can* reach the CDN and R2, you can delete
> the two `page.route(...)` stubs to test fully end-to-end against live assets.

### Setup (one time)

You need a Chrome/Chromium binary and a local copy of the pinned Three.js.

```bash
# 1. Playwright driver (no browser download needed — we point it at a binary)
cd /tmp && npm i playwright-core three@0.165.0

# 2. A Chrome binary. Either use one already installed, or fetch Chrome for
#    Testing (pick a build that matches your platform):
cd /tmp
curl -s -o chrome.zip \
  "https://storage.googleapis.com/chrome-for-testing-public/131.0.6778.108/linux64/chrome-linux64.zip"
unzip -q -o chrome.zip       # -> /tmp/chrome-linux64/chrome
```

The pinned Three.js version is in `docs/ENVIRONMENT.md` and the import map in
`index.html`. Keep the local copy in step 1 matching it.

### Run

```bash
# From the repo root: serve the site (so /js, /css, /r2-indexes resolve)
python3 -m http.server 8899 &

# Run the smoke test (also from the repo root)
node verify/browser/smoke.mjs
```

All paths have defaults, so on a machine set up as above this is enough. To
override them:

```bash
CHROME_PATH=/path/to/chrome \
THREE_PATH=/path/to/three.module.js \
PLAYWRIGHT_DIR=/path/with/node_modules \
BASE_URL=http://localhost:8899 \
node verify/browser/smoke.mjs
```

`PLAYWRIGHT_DIR` (default `/tmp`) is where `playwright-core` is installed — the
harness resolves it from there, so it doesn't need to live in the repo. Expected
output ends with:

```
8/8 checks passed
```

Then open `/tmp/shot-globe.png` and `/tmp/shot-lightbox.png` to confirm the look.

### Notes / gotchas

- Headless Chrome here uses **SwiftShader** (software GL). It renders correctly
  but **under-lights** the scene — the globe looks darker in screenshots than on
  a real GPU. Judge final lighting/color on real hardware, not these shots.
- The harness drives the lightbox by importing `js/ui/lightbox.js` directly,
  rather than trying to click a tile through the WebGL canvas (raycasting a
  3D tile at an exact screen pixel is brittle). It still exercises the real
  lightbox module, DOM, and CSS.
- If you change the pinned Three.js version, update the local copy in `/tmp`
  too, or the stub serves a mismatched build.

---

## What "good" means before pushing

- `verify/index.html` — all green.
- `verify/browser/smoke.mjs` — `N/N checks passed`, screenshots look right.
- For changes to the photo pipeline, also sanity-check the index generator:
  `python3 scripts/refresh_r2_index.py` logic (it has a self-contained test in
  the commit history; mock the S3 client to exercise it offline).
