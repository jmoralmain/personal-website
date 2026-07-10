---
name: preflight
description: The full pre-push gate for this repo — fan out the audit subagents (structure, design, docs) in parallel, run the headless verify suite, fix what they find, and only then commit and push. Use when a change is ready to ship, or when the user says "preflight", "ship it", or "ready to push".
---

# Preflight — the ship gate

This is an orchestration skill: you are the lead agent, and you delegate the
auditing to specialist subagents so their (large, file-dump-heavy) work stays
out of your context. Run it when the working tree holds a change you believe
is finished.

## Step 0 — Diff discipline (Karpathy rule 3, CLAUDE.md)

Before spawning anything, read your own `git diff` end to end and apply the
test: **every changed line traces directly to the request.** Revert drive-by
"improvements" to adjacent code, unrequested refactors, and formatting churn
now — don't make the auditors (or Jeffrey's review) wade through them. Also
remove any imports/variables your change orphaned.

## Step 1 — Fan out the auditors (parallel, background)

Spawn all three in ONE message so they run concurrently, via the Agent tool
with these `subagent_type`s:

- `structure-auditor` — module deps, main.js thinness, registry rule,
  hot-path allocations, degradation contract.
- `design-reviewer` — tokens, single accent, flat chrome, fonts,
  reduced-motion, theme parity. (Skip only if the diff touches zero CSS/UI.)
- `docs-auditor` — docs updated in the same commit as behaviour.

Give each the same one-paragraph summary of what changed this session, and
tell it to audit `git diff` against `main`.

Fallback: newly created agent definitions can take a while to register in
the session that created them. If a named `subagent_type` isn't available,
spawn `general-purpose` instead with: "Read `.claude/agents/<name>.md` and
perform exactly that role and report format."

## Step 2 — Run the verify suite while they work

Follow `.claude/skills/verify-site/SKILL.md` yourself (or spawn the
`verifier` agent if your context is already heavy). Both layers must be green.

## Step 3 — Triage and fix

Collect all reports. Then:

- **Violations** (rule breaks, red checks): fix them now, yourself.
- **Concerns / pre-existing drift**: fix if trivial; otherwise list them in
  your final message to Jeffrey — don't silently drop them and don't
  block the ship on them.
- If a fix is ambiguous or architecturally significant, stop and ask before
  guessing.

## Step 4 — Re-verify after fixes

Any code fix → rerun both verify layers (cheap, ~30s). Any fix in an area an
auditor flagged → you may re-spawn just that auditor scoped to the fix.

## Step 5 — Commit and push

Only when: verify green, zero unaddressed violations, docs updated in the
same commit. Commit with a clear message; push with
`git push -u origin <session branch>` — never to any other branch.

## Cost calibration

For a tiny diff (one file, few lines), full fan-out is overkill: run
verify-site plus the single relevant auditor. For anything touching multiple
modules or CSS + JS together, run the full gate. When in doubt, run it all —
the auditors are cheap models and run in parallel.
