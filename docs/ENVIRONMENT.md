# Environment

The canonical record of every external dependency, version pin, and
runtime requirement for this project. When something breaks due to a
version mismatch, start here.

---

## External dependencies

This project has **no npm install**. All dependencies are loaded from
CDN via the import map in `index.html`. The versions here are the source
of truth — the import map must match them exactly.

| Package    | Version   | CDN URL                                                              | Used for              |
| ---------- | --------- | -------------------------------------------------------------------- | --------------------- |
| `three`    | `0.165.0` | `https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js`  | 3D rendering (WebGL)  |
| `three/addons/` | `0.165.0` | `https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/`     | Three.js extras (Phase 5+) |

### Verifying versions

Open `verify/index.html` in a browser after serving the project locally.
The **Environment** check confirms Three.js loaded at the exact version
above. A version mismatch shows as a red FAIL with the actual vs. expected
string.

### Upgrading Three.js

1. Update the version string in `index.html` import map (both entries).
2. Update the `EXPECTED_THREE_VERSION` constant in `verify/checks/env.js`.
3. Update the table above.
4. Open `verify/index.html` and confirm the env check goes green.
5. Manually smoke-test the sphere (drag, hover, click a node).

Do **not** upgrade Three.js mid-phase. Tie upgrades to phase boundaries
so any breakage is isolated.

---

## Runtime requirements (browser)

| Requirement         | Why                                       | Fallback if absent          |
| ------------------- | ----------------------------------------- | --------------------------- |
| WebGL 2 (preferred) | Hardware-accelerated 3D rendering         | WebGL 1 is acceptable       |
| WebGL 1 (minimum)   | Three.js requires at least WebGL 1        | Static fallback image shown |
| ES Modules          | All JS is `type="module"`                 | No fallback — hard requirement |
| Import Maps         | `<script type="importmap">` in index.html | No fallback — Chrome 89+, FF 108+, Safari 16.4+ |
| `backdrop-filter`   | Glass panel blur effect                   | Panel still visible, no blur |
| `100dvh`            | Full-height viewport on mobile            | Falls back to `100vh`       |

### Minimum tested browsers

| Browser          | Minimum version | Notes                        |
| ---------------- | --------------- | ---------------------------- |
| Chrome / Edge    | 89+             | Import maps supported        |
| Firefox          | 108+            | Import maps supported        |
| Safari           | 16.4+           | Import maps + `backdrop-filter` |
| Mobile Safari    | 16.4+           | Touch drag tested            |
| Mobile Chrome    | 89+             | Touch drag tested            |

---

## Development environment

No local tooling is required to run the project. To serve locally:

```bash
# Python (built-in on macOS/Linux)
python3 -m http.server 8080

# Node (if installed)
npx serve .
```

Then open `http://localhost:8080`.

### Future: build step (Phase 5 trigger)

When a build step is introduced (see `SCALING.md §5`), this section will
gain:
- Node.js minimum version
- Package manager choice (npm / pnpm)
- `package.json` with locked versions replacing the import map

Until that trigger fires, there is intentionally nothing to install.

---

## Environment variables

There are currently **no environment variables**. The project is fully
static.

If environment-specific config is ever needed (e.g. a different Substack
URL per environment, or a feature flag), it will be introduced as a
`config.js` module with clear documentation here. It will not use
`process.env` or `.env` files until a build step exists.

---

## Content paths

All local content assets are relative to the repo root:

| Type        | Path convention               | Example                            |
| ----------- | ----------------------------- | ---------------------------------- |
| Images      | `assets/<region>/<filename>`  | `assets/climbing/el-cap.jpg`       |
| Full-res    | `assets/<region>/full/<file>` | `assets/climbing/full/el-cap.jpg`  |
| PDFs        | `assets/data/<filename>`      | `assets/data/pipeline-notes.pdf`   |
| Thumbnails  | Same as image, `_thumb` suffix (Phase 5 generator) | `assets/climbing/el-cap_thumb.jpg` |

The `assets/` directory does not exist yet — it is created when real
content is added in Phase 2.
