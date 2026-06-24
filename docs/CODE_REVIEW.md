# Code Review — Industry / Resume-Grade Standards

_Reviewed: 2026-06-24 · Branch: `claude/website-review-standards-bfju67`_

A pre-publication review of the portfolio against professional standards for
**security, accessibility, SEO, supply chain, code organization, and docs
hygiene**. The goal is a site that holds up as a resume artifact — both the
running site _and_ the repo, since a recruiter will open both.

The review was conducted across three parallel audits (security, architecture
/ organization, web standards) plus a manual pass of the hot-path render and
interaction code.

## Verdict

The **engineering discipline is genuinely strong** — clean acyclic module
graph, zero per-frame allocations, the registry/Tile abstraction is honored,
reduced-motion is handled in both JS motion paths, no committed secrets, no
analytics, no stray debug logging. As an _engineering_ sample the code already
reads well.

The gap is **publication readiness**, and it is concentrated in one place:
**the entire experience is locked behind a mouse-drag WebGL canvas.** There is
no keyboard path, no touch path in the picker, no screen-reader path, no
crawler/no-JS content, and no fallback if WebGL is unavailable. For a public
resume site this is the headline risk — it simultaneously fails accessibility,
SEO, and robustness. Everything else is smaller.

---

## Confirmed strengths (keep these)

- **Module graph is acyclic** and matches the one-way dependency rule exactly
  (`content/` → nothing, `core/` → nothing in-project, `tiles/` → core+content,
  `interaction/`+`ui/` → tiles, `main.js` → all).
- **No per-frame allocations** in `animate()`, `controls.tick`, `flyTo.tick`,
  or `tickTile` — scratch vectors are hoisted (`picker.js:6-7`,
  `Tile.js:17-30`).
- **Registry pattern is clean** — zero `type === …` outside `tiles/registry.js`.
- **`prefers-reduced-motion` honored in JS** — inertia/auto-spin gated
  (`controls.js:18,60`) and fly-to becomes an instant cut (`flyTo.js:48,89`),
  plus the CSS block at `style.css:437`.
- **No secrets committed**; the Actions workflow passes R2 creds via `env:`
  (not inline `${{ }}`), so they never hit a rendered command line.
- **Most content→DOM paths use `textContent`** (`panel.js`, `tooltip.js`,
  `coords.js`, `regionNav.js`). Only one `innerHTML` sink exists.
- **`main.js` is thin** (51 lines, pure wiring).

---

## Findings (consolidated, de-duplicated across the three audits)

Severity reflects impact **on a public resume-grade launch**.

### P0 — Blockers for publication

| # | Finding | Where |
|---|---------|-------|
| P0-1 | **No non-canvas content path.** All content is reached by raycasting mouse coords; picker has only `mousedown`/`mousemove`/`click`. No keyboard nav, no touch in the picker, no screen-reader path. Fails WCAG 2.1.1 (Keyboard, Level A). | `js/interaction/picker.js:35-82` |
| P0-2 | **Blank for crawlers & no-JS.** `<body>` holds only empty shells populated by JS; no `<noscript>`. Social/search bots and JS-disabled visitors see effectively one string. | `index.html:12-51` |
| P0-3 | **No WebGL-failure fallback.** `new THREE.WebGLRenderer()` is unguarded; on an unsupported/blocked GPU the module throws and the page stays blank. | `js/core/sceneSetup.js:5`, `js/main.js:14` |
| P0-4 | **No social/SEO meta.** Missing `meta description`, all Open Graph + Twitter Card tags, favicon, `theme-color`, canonical. A shared link renders bare and image-less — exactly how a resume circulates. | `index.html:3-11` |
| P0-5 | **Owner name mismatch — needs your confirmation.** Site says **"Jeffrey Morales"** (`<title>`, brand, hero); `CLAUDE.md` says **"Jeffrey Moral"**. One is wrong, and it's the most important string on the page. | `index.html:6,17,23` vs `CLAUDE.md` |

> P0-1, P0-2 and P0-3 share one fix: a **manifest-driven accessible DOM content
> path** (a real list/grid of `<button>`/`<a>` that opens the same panel /
> lightbox), wrapped in `<main>`, shown as the fallback when WebGL fails and
> mirrored in `<noscript>`. The "content is always data" design makes this
> cheap — the manifest already holds everything needed.

### P1 — High (fix before sharing widely)

| # | Finding | Where |
|---|---------|-------|
| P1-1 | **Modals aren't modal.** Panel & lightbox: no focus move-in, no focus trap (Tab leaks to the canvas), no focus return on close, no `role="dialog"`/`aria-modal`/`aria-labelledby`; **panel has no Escape handler** (lightbox does). | `js/ui/panel.js`, `js/ui/lightbox.js`, `index.html:36-51` |
| P1-2 | **`#panel-close` has no accessible name** — content is only the `×` glyph. (The lightbox close button correctly has `aria-label="Close"`.) | `index.html:37` |
| P1-3 | **README is one line.** The repo is itself a portfolio artifact with excellent `docs/` the README never surfaces. Needs pitch, screenshot/GIF, stack, local-run (note ES-module static-server requirement), how-to-add-content, deploy, link into `docs/`. | `README.md:1` |
| P1-4 | **Path traversal in the index script.** `folder` comes from R2 `CommonPrefixes` and is used to build filesystem paths (`INDEX_ROOT / folder / index.json`) and `mkdir(parents=True)`. A bucket key containing `../` writes outside `r2-indexes/`. Risk scales with who can write to the bucket. | `scripts/refresh_r2_index.py:69,79,101-104` |
| P1-5 | **Dead "node" code path.** `attachPicker` is called with a hard-coded empty `[]`; `core/nodes.js` is never imported by `main.js`; the picker's node-hit branch and `ui/panel.js` (openPanel) are therefore unreachable in the running app (only `verify/` references them). Decide: **wire nodes in, or delete `nodes.js` + the node branch** and update docs/verify. A green check that proves nothing about the live site. | `js/main.js:40`, `js/core/nodes.js`, `js/interaction/picker.js:25,75-77` |

### P2 — Medium (hardening + professional polish)

| # | Finding | Where |
|---|---------|-------|
| P2-1 | **Lightbox uses `innerHTML` with partial escaping.** Only sink in the codebase; `escapeHtml` covers `& < >` but not quotes. Safe today (element-content context, owner-authored data) but fragile for a "growing world." Build with `createElement('strong')` + `textContent` like `panel.js`. | `js/ui/lightbox.js:13-15,37-42` |
| P2-2 | **Supply chain: Three.js via CDN import-map, no SRI possible.** Pinned to `@0.165.0` (good) but a hijacked jsDelivr response executes with full page privileges. Also third-party Google Fonts (render-blocking + GDPR). **Vendor Three.js + fonts locally** → first-party, removes the integrity gap and the third-party requests. | `index.html:9,53-60` |
| P2-3 | **No CSP / security headers.** No CSP meta and (on GitHub Pages) no way to send headers. A CSP would blunt P2-1 and P2-2. Consider deploying on **Cloudflare Pages** so a `_headers` file can set CSP, `X-Content-Type-Options`, `Referrer-Policy`, HSTS. | `index.html`, deploy config |
| P2-4 | **GitHub Actions not SHA-pinned.** `actions/checkout@v4`, `setup-python@v5` are mutable tags; the job holds `contents: write` and R2 secrets. Pin to commit SHAs + enable Dependabot for `github-actions`. | `.github/workflows/refresh-r2-index.yml:31,33` |
| P2-5 | **Lightbox img alt can be empty; no async decode.** `alt` falls back to `''` when title is missing (image invisible to AT); add `decoding="async"` and a meaningful alt (fall back to caption). | `js/ui/lightbox.js:10-11`, `index.html:49` |
| P2-6 | **`.env` not in `.gitignore`.** No env file exists today, but add `.env`/`*.env` to prevent a future accidental commit. | `.gitignore` |
| P2-7 | **Region buttons misuse `aria-pressed`** for what is navigation; state is cleared on drag, confusing AT. Prefer `aria-current`. | `js/ui/regionNav.js:17,41` |

### P3 — Low (docs drift, cleanups, internal consistency)

| # | Finding | Where |
|---|---------|-------|
| P3-1 | **Docs/code region drift.** `CLAUDE.md` intro lists "Family · Friends · Data Engineering"; its table + `ARCHITECTURE.md` show different region sets/palettes than the actual manifest (climbing/landscape/music/portrait/professional). Manifest ↔ `theme.js` agree; the docs are stale. | `CLAUDE.md`, `docs/ARCHITECTURE.md` |
| P3-2 | **Degradation contract documented but not implemented.** `CLEAN_CODE.md` defines exact console prefixes / visual outputs ("deviation is a bug") but the render loop has no top-level try/catch, there's no WebGL-context-lost handling, registry log prefix differs, broken full-image shows no message. Either implement the table or mark it aspirational/Phase 3+. | `docs/CLEAN_CODE.md`, `js/main.js:43-50`, `js/tiles/registry.js:16` |
| P3-3 | **`THEME.regions` is dead / colors triplicated.** Region hexes live in `theme.js`, manifest `.color`, and CSS tokens; runtime reads the manifest, so `THEME.regions` is never imported. Pick one source. | `js/core/theme.js:46-50` |
| P3-4 | **`placeholder.js` hard-codes off-theme hex** (`#1a1a2e`, `#444466`, `#555577`) — predates the current palette; violates the no-hard-coded-hex rule. | `js/tiles/types/placeholder.js:12,15,19` |
| P3-5 | **`orbitZ` camera-fit math duplicated** across two files with "keep in sync by hand" comments. Extract one helper into `core/`. | `js/core/sceneSetup.js:19-21`, `js/interaction/flyTo.js:34-39` |
| P3-6 | **Minor:** `ui/coords.js` name misleads (it's the location label); a few unnamed magic numbers in `Tile.js` tickTile; `r2loader.js:28` derives its base path by regex on `import.meta.url` (breaks under bundling). | various |

---

## Execution plan

Phased so each milestone is independently shippable and the riskiest-to-launch
items go first. P0/P1 are pre-publication; P2/P3 are hardening that can follow.

### Phase A — Make it publishable (P0)
1. **Accessible content fallback** (resolves P0-1, P0-2, P0-3): build a
   manifest-driven DOM list/grid of real `<button>`/`<a>` elements inside a
   `<main>` landmark that opens the existing panel/lightbox; render it as the
   visible fallback when WebGL init fails (wrap `buildScene` in try/catch) and
   mirror a short version in `<noscript>`.
2. **SEO/social meta** (P0-4): description, OG + Twitter set with a 1200×630
   preview image, favicon + apple-touch-icon, `theme-color`, canonical.
3. **Confirm the name** (P0-5) — _decision required from you_ — then align the
   site and `CLAUDE.md`.

### Phase B — Accessibility & repo polish (P1)
4. Make panel & lightbox real dialogs: focus move-in, trap, return-on-close,
   `role="dialog"`/`aria-modal`/`aria-labelledby`, panel Escape handler (P1-1).
5. `aria-label="Close"` on `#panel-close` (P1-2).
6. Resume-grade README (P1-3).
7. Harden the Python script: allowlist folder names, assert paths stay within
   `INDEX_ROOT` (P1-4).
8. Resolve the dead node path — wire or delete, update verify + docs (P1-5).

### Phase C — Security & supply-chain hardening (P2)
9. Replace lightbox `innerHTML` with DOM nodes (P2-1).
10. Vendor Three.js + fonts locally (P2-2); 11. add a CSP — ideally move to
    Cloudflare Pages for real headers (P2-3); 12. SHA-pin Actions + Dependabot
    (P2-4); 13. lightbox alt/decoding (P2-5); 14. `.env` to `.gitignore`
    (P2-6); 15. `aria-current` for region buttons (P2-7).

### Phase D — Docs/code consistency & cleanups (P3)
16. Reconcile region taxonomy/palette across `CLAUDE.md` + `ARCHITECTURE.md`.
17. Implement the degradation contract (render-loop try/catch, context-lost
    handling) **or** re-scope `CLEAN_CODE.md` as aspirational.
18. Collapse the triplicated region color source.
19. Tokenize `placeholder.js`; extract `orbitZ`; rename `ui/coords.js`; name
    the remaining `Tile.js` magic numbers.

After each phase, run `verify/index.html` and confirm checks are green (and
update any check whose assumptions changed).
