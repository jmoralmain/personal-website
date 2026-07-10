---
name: verify-site
description: Run this project's full verify suite headlessly from the CLI — structural checks (verify/index.html suites) plus the browser smoke test. Use after any significant change and always before committing or pushing. These commands are proven to work in Claude's remote sandbox.
---

# Verify the site headlessly

Two layers, both must be green before pushing (docs/TESTING.md is the full
reference; this skill is the executable version).

## 1. Bootstrap (once per container)

Skip if `/tmp/node_modules/playwright-core` exists.

```bash
cd /tmp && npm i --no-fund --no-audit playwright-core three@0.165.0
```

The `three` version must match the pin in `index.html` / `docs/ENVIRONMENT.md`.
No browser download is needed: the harnesses auto-resolve Chromium from
`/tmp/chrome-linux64/chrome`, then `/opt/pw-browsers/chromium` (pre-installed
in Claude remote sessions). Override with `CHROME_PATH=` only if neither exists
— then follow the Chrome-for-Testing download in docs/TESTING.md.

## 2. Serve the repo (once per session)

```bash
python3 -m http.server 8899 --directory /path/to/repo/root &
```

Port 8899 is the harness default (`BASE_URL` overrides).

## 3. Run both layers (from the repo root)

```bash
node verify/browser/structural.mjs   # suites from verify/checks/ — expect "ALL CHECKS PASSED"
node verify/browser/smoke.mjs        # runtime smoke — expect "9/9 checks passed"
```

Both exit non-zero on any failure, so `&&`-chain them in scripts — but if
you pipe their output (e.g. `| tail`), the pipe returns the LAST command's
exit code and a crash reads as success. Use `set -o pipefail` first, or
don't pipe. A crash ends with a bare `Node.js vXX` line — treat that as RED.
Also confirm the static server is still up (`curl -s -o /dev/null -w
'%{http_code}' http://localhost:8899/index.html` → 200) before trusting a
run; background servers don't survive container restarts. The smoke
test writes `/tmp/shot-globe.png` and `/tmp/shot-lightbox.png` — look at them.
Caveat from docs/TESTING.md: headless SwiftShader under-lights the globe, so
judge composition in the screenshots, never lighting or final color.

## Interpreting results

- Structural failure → the wiring broke (scene graph, manifest shape, tokens,
  DOM ids). Fix the code, or if the check itself is wrong, fix the check AND
  document why in the same commit (CLAUDE.md rule).
- Smoke failure → the page doesn't actually run. Page errors and WebGL
  texture warnings are listed verbatim in the output.
- Never ship on a partial run. A layer that didn't run did not pass.
