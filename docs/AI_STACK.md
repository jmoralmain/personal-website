# The AI Stack — how agents work on this repo

This document is written **for future Claude sessions** (and for Jeffrey to
understand what they'll do). It describes the agent/skill stack that lives in
`.claude/`, the orchestration patterns to use, and the roadmap of what to add
next. It was authored in July 2026 in a deliberate effort to encode strong
working patterns into the repo before model access changed — the stack is
designed so that **smaller, cheaper models produce disciplined work here**,
because the discipline lives in the repo, not in the model.

Treat this file the way CLAUDE.md treats all docs: **it is code**. If you add,
remove, or change an agent or skill, update this file in the same commit.

---

## 1. Philosophy

Three ideas drive the design:

1. **The repo carries the judgement.** CLAUDE.md holds the rules; the agents
   in `.claude/agents/` are those rules turned into runnable auditors; the
   skills in `.claude/skills/` are the proven procedures. A fresh session on
   any model should be able to ship safely by following them.

2. **Agents run agents — on purpose.** The lead session should stay
   small-context and strategic, and fan heavy work out to subagents. Reading
   forty files to audit import direction is subagent work; deciding what to
   do about a violation is lead-agent work. Don't be shy about spawning; DO
   be deliberate about it (see §3).

3. **Verification is cheap, so it is mandatory.** Both verify layers now run
   headlessly from the CLI in ~30 seconds (`/verify-site`). There is no
   excuse for pushing unverified work.

---

## 2. Inventory — what exists today

### Subagents (`.claude/agents/`)

| Agent | Role | Writes? | Model |
| --- | --- | --- | --- |
| `verifier` | Runs both verify layers headlessly, reports GREEN/RED with verbatim failures | No | sonnet |
| `structure-auditor` | CLAUDE.md technical rules: dep direction, main.js ≤ 50, registry rule, hot-path allocations, degradation contract | No | sonnet |
| `design-reviewer` | DESIGN.md conformance: tokens, single lime accent, flat chrome, two fonts, reduced-motion, css↔theme.js parity | No | sonnet |
| `docs-auditor` | Docs drift: behaviour changes must update docs in the same commit; standing truths spot-checked | No | sonnet |

All four are **read-only by design** — they report with file:line evidence and
the lead agent decides and edits. This keeps authority in one place and makes
their output safe to trust from a cheaper model.

### Skills (`.claude/skills/`)

| Skill | What it encodes |
| --- | --- |
| `verify-site` | The proven, environment-tested commands to run both verify layers headlessly (bootstrap → serve → `structural.mjs` + `smoke.mjs`) |
| `preflight` | The ship gate: fan out the three auditors in parallel + run verify, triage, fix, re-verify, then commit/push |
| `add-content` | Content is data: R2 upload → index Action → globe. Debug order for missing photos. How to add a region. Never write Jeffrey's captions |
| `new-tile-type` | The Phase 3 registry pattern for new content types, including the degradation-contract and docs obligations |

### Supporting tooling

- `verify/browser/structural.mjs` — headless CLI runner for the
  `verify/index.html` suites (built for this stack; previously those checks
  required a human with a browser). Same stub strategy as `smoke.mjs`.
- Both harnesses auto-resolve Chromium: `/tmp/chrome-linux64/chrome`, then
  `/opt/pw-browsers/chromium` (pre-installed in Claude remote sandboxes) —
  so no Chrome download in remote sessions.
- `.claude/settings.json` — shared permission allowlist for the verify
  commands and read-only git, so the gate runs without permission friction.

### Built-in skills that slot in

These ship with Claude Code and complement the stack — no setup needed:

- `/code-review` — general correctness review of a diff; run it for logic
  bugs (the custom auditors deliberately don't hunt bugs, they enforce THIS
  repo's rules).
- `/security-review` — before shipping anything touching URLs, fetch logic,
  or the R2 pipeline.
- `/simplify` — after a feature lands, to sand it down.

---

## 3. Orchestration patterns

### The ship gate (use every time)

`/preflight` is the standard finish to any coding session:

```
lead agent ── spawns in parallel ──▶ structure-auditor ─┐
          ├───────────────────────▶ design-reviewer    ├─▶ reports
          ├───────────────────────▶ docs-auditor       ─┘
          └── runs itself (or via verifier) ▶ verify-site
then: triage → fix → re-verify → commit → push
```

Rules of thumb:

- **Spawn all auditors in one message** so they actually run concurrently.
- **Scope the prompt.** Tell each auditor what changed in one paragraph and
  point it at `git diff main...`. A vague prompt makes a subagent re-derive
  the world.
- **Auditors report, the lead decides.** Never let a subagent edit code it
  audited — that's how rules erode.
- **Right-size the gate.** One-line CSS fix → verify + design-reviewer only.
  Multi-module change → the full fan-out. When unsure, run it all; three
  sonnet auditors in parallel cost less than one bad push.

### Layered delegation (for big jobs)

For a large feature, add one level: the lead plans, spawns a `general-purpose`
agent to implement a well-specified chunk, then runs the ship gate on the
result. Keep it to **two levels deep** (lead → worker → its own Explore/Plan
helpers). Deeper nesting loses context fidelity faster than it saves time.

### Long-running / unattended work

- **PR babysitting:** after opening a PR, subscribe to its activity
  (`subscribe_pr_activity`) and fix CI/review feedback as events arrive —
  run `/preflight` on every fix push, not just the first.
- **Scheduled checks:** Routines/cron can run a fresh session on a schedule
  (see roadmap §5.4). Give scheduled prompts full standalone context — they
  start cold.

### What NOT to delegate

- Anything touching **navigation feel** (`js/interaction/controls.js`,
  `flyTo.js`). CLAUDE.md calls navigation sacred; drag-feel is judged by a
  human hand on a real trackpad. Agents may refactor around it, but any
  change to the feel itself gets flagged to Jeffrey with a before/after
  description, never silently shipped.
- **Jeffrey's voice.** No agent writes captions, titles, region bodies, or
  essay text. Ask for the words.
- **Phase decisions.** Starting a new phase requires Jeffrey's confirmation
  (CLAUDE.md rule 6) — a subagent must never make that call implicitly.

---

## 4. Model guidance (post-Fable)

The stack was authored on a frontier model but deliberately doesn't depend on
one:

- **Auditor/verifier agents are pinned to `sonnet`** in their frontmatter —
  checklist enforcement with evidence is exactly what a mid-tier model does
  well and cheaply. Aliases (not dated IDs) are used so they track current
  releases.
- **Lead sessions:** use the best model available for planning and for any
  change near the hot paths or navigation; `sonnet` is fine for content
  plumbing, docs, and CSS token work.
- **Never "save money" by skipping the gate.** The gate is where cheap models
  are made safe. Skipping preflight to save three subagent runs is the most
  expensive thing a session can do here.

---

## 5. Roadmap — what to add next (priority order)

Each item is scoped so a future session can pick it up cold. Confirm with
Jeffrey before starting any of them.

### 5.1 CI verify workflow (high value, small)
A GitHub Action running both verify layers on every PR — the exact commands
in `/verify-site` (install `playwright-core` + pinned `three`, use the
runner's Chrome or Chrome-for-Testing, serve, run both `.mjs` harnesses,
upload the two screenshots as artifacts). This makes the ship gate
un-skippable even for hand edits made outside Claude. Mirror the existing
`refresh-r2-index.yml` style.

### 5.2 Visual regression check (supports Phase 4)
`smoke.mjs` already screenshots the globe deterministically (stubbed photos,
fixed viewport). Add a blessed baseline under `verify/baselines/`, a pixel
diff (e.g. `pixelmatch` from /tmp, kept out of the repo like playwright), and
a `visual-review` skill: regenerate → diff → show Jeffrey both images when
the delta exceeds threshold. Remember the SwiftShader under-lighting caveat —
compare structure, not luminance.

### 5.3 Content pipeline watcher (Routine)
A scheduled session (weekly is plenty) that: triggers/checks the R2 index
Action, runs the smoke test, and runs `docs-auditor` — then reports drift and
broken photos to Jeffrey. This is the "the site quietly rotted" alarm. Use a
fresh-session Routine with a fully self-contained prompt that starts by
reading this file.

### 5.4 Interaction-feel harness (hard, Phase 4)
Scripted pointer gestures in the smoke harness (drag arcs, flicks) asserting
measurable proxies for feel: frames dropped during drag, inertia decay time,
`prefers-reduced-motion` producing instant cuts. Proxies only — a human still
signs off on feel — but they catch regressions agents can't perceive.

### 5.5 Grow the allowlist from real usage
Periodically run the built-in `/fewer-permission-prompts` to mine actual
session transcripts and extend `.claude/settings.json` beyond the seed list.

### Deliberately NOT on the roadmap
- More agents for their own sake. Four auditors cover the standing rules;
  add a fifth only when a new *class* of rule exists.
- Marketplace plugins. Nothing this repo needs is missing from built-ins +
  this stack; a dependency on third-party plugins is a liability for a
  personal site meant to last years.
- Auto-merge / agents pushing to `main`. A human merges.

---

## 6. Maintenance rules for the stack itself

1. **Same-commit rule applies.** Change an agent's checks → its section here
   and (if behaviour-adjacent) CLAUDE.md change too.
2. **Skills must stay executable.** If a command in `verify-site` stops
   working, fixing it is a blocking bug, not a docs chore — the whole stack
   rests on that skill being true.
3. **Auditors stay read-only.** If you're tempted to give one Edit access,
   what you actually want is a new *skill* the lead agent runs.
4. **Known drift ledger.** When an auditor reports pre-existing drift that
   isn't fixed in-session, record it here so it isn't re-discovered forever:
   - `docs/FEATURE_MAP.md` phase table (and CLAUDE.md's copy) lag reality —
     tiles/photos (Phase 2-ish) are live while the tables say Phase 2 is
     "Next". Jeffrey should re-baseline the phases.
