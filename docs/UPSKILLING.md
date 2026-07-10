# Upskilling — what to read, what to practice, and the reframe

> **For:** Jeffrey, not agents (agents read `AI_STACK.md`)
> **Written:** 2026-07-10, alongside the AI-stack build
> **Occasion:** model access is about to step down a tier. This document argues
> that matters less than it feels like it does — and shows where the real
> leverage is.

---

## Part 1 — The reframe

You asked how to reframe the way you're going about this. Five shifts, each
one grounded in something that actually happened in this repo.

### 1. Stop upgrading the model. Start upgrading the environment.

The instinct behind "I'm doing this before I lose access to Fable" is that
capability lives in the model. Mostly, it doesn't — it lives in what the model
can *see and check*. A frontier model in an undocumented repo guesses; a
mid-tier model in THIS repo reads CLAUDE.md, runs 96 checks headlessly, and
gets audited by three subagents before anything ships.

The evidence is already in your git history: the docs-auditor that caught four
real documentation bugs on its first run was a *cheap* model (`sonnet`)
following a 40-line role file. The intelligence was in the checklist, not the
weights. Every hour you spend encoding judgment into the repo (rules, skills,
checks, degradation contracts) is an hour that survives every pricing change,
forever. Every hour you spend on a clever one-off prompt evaporates when the
session ends.

**The reframe: you are not a prompt author. You are the architect of an
environment that makes any competent model behave like a senior engineer.**

### 2. Trust is a property of gates, not of models.

During this very build, an agent (me) pushed a commit claiming "verified
green" when the verify run had actually crashed — a pipe swallowed the exit
code and a dead server read as success. Not malice; plumbing. The lesson
isn't "models lie," it's that **confidence and correctness are uncorrelated,
at every model tier**. The fix wasn't a better model; it was hardening the
gate (`verify-site` now documents the failure signature).

So: never grade agent work by how assured the summary sounds. Grade it by
what the gate says. Your job when reviewing agent output is to ask one
question — *"what would have caught this if it were wrong?"* — and if the
answer is "nothing," the work isn't done, regardless of how good it looks.

### 3. Sessions are disposable. Files are the product.

A chat session is RAM. It gets summarized, truncated, forgotten. The only
outputs that compound are the ones written to disk: `docs/`, `.claude/`,
`verify/`. You already half-knew this ("documentation is code"), but apply it
to your *own* learning too: when a session teaches you something — a debugging
order, a gotcha, a workflow — the session isn't over until that lesson lives
in a file the next session will read. The R2 CORS saga became a debug
checklist in `CONTENT_GUIDE.md`; the pipe-exit-code bug became three lines in
`verify-site`. That's the pattern. **Ratchet, don't repeat.**

### 4. Orchestration is a budget, not a flex.

"Not afraid to have agents run other agents" is the right instinct with one
discipline attached: every hop loses context fidelity, and a subagent that
has to re-derive the world burns the money it was meant to save. The patterns
that pay: **fan-out** (parallel read-only auditors, like `/preflight`),
**worker + gate** (one implementer, then the ship gate), and **watchers**
(PR babysitting, scheduled Routines). The pattern that doesn't: deep chains
of agents delegating to agents, each with a vaguer brief than the last. Two
levels. Scoped prompts. Read-only auditors, one writer. That's not caution —
it's what makes aggressive delegation actually cheap.

### 5. The portfolio is the curriculum.

You're a data engineer learning AI-native engineering. The best course
available to you is not a course — it's this repo, because it's real, it's
yours, and it has a working feedback loop (the verify suite tells you within
30 seconds whether you broke it). Everything in Part 2 should be read *in
service of shipping something here*, then tested against reality. Reading
without shipping is how this becomes a bookmarks folder.

And one inherited caution from your own CLAUDE.md: content first. The stack
is now good. More photos, more essays, more regions beat a fifth auditor.

---

## Part 2 — The reading list

Tiered by return on time. Read Tier 1 completely; treat the rest as a menu.

### Tier 1 — Foundations (a weekend, total)

1. **Anthropic — "Building Effective Agents"** (anthropic.com/engineering).
   The single best conceptual piece: workflows vs. agents, and why you should
   use the simplest pattern that works. Your `/preflight` is their
   "parallelization + evaluator" pattern; recognizing the patterns lets you
   design new ones deliberately.
2. **Anthropic — "Claude Code Best Practices"** (anthropic.com/engineering).
   The practical companion: CLAUDE.md discipline, plan-then-code,
   test/verify loops, subagents, headless mode. You've now implemented ~80%
   of it — read it to see the remaining 20%.
3. **Anthropic — "Effective Context Engineering for AI Agents"**
   (anthropic.com/engineering). Why "prompt engineering" became "context
   engineering": attention is a budget, retrieval beats stuffing, and
   sub-agents exist to protect the lead's context. This is the theory behind
   reframe #4.
4. **Karpathy — "Software Is Changing (Again)"** (the 2025 YC AI Startup
   School talk, on YouTube). Software 1.0 = code, 2.0 = weights, 3.0 =
   English. His "autonomy slider" and "keep the agent on a short leash" map
   exactly onto what you built: the leash is the verify gate.
5. **Karpathy — "How I use LLMs"** (YouTube, 2025). Concrete, tool-by-tool
   workflow habits from the person whose four guidelines are now in your
   CLAUDE.md.
6. **The Claude Code docs** (code.claude.com/docs) — specifically the pages
   on skills, subagents, hooks, settings/permissions, and headless/SDK
   usage. Skim all; bookmark; return when building.

### Tier 2 — Practice deepeners (as needed, over months)

7. **Simon Willison's blog** (simonwillison.net). Subscribe. The most honest
   running commentary on what LLM tooling actually does vs. claims to do.
   Start with his posts on "vibe engineering" and prompt injection.
8. **Hamel Husain — "Your AI Product Needs Evals"** (hamel.dev). You built a
   verify suite for the site; evals are the same idea for AI behavior. When
   you eventually want to *measure* whether a cheaper model + your stack
   really equals a frontier model, this is how.
9. **Anthropic — "Building agents with the Claude Agent SDK"**
   (anthropic.com/engineering). For when a workflow outgrows interactive
   sessions — e.g. roadmap item 5.3 (the scheduled content watcher) done
   properly.
10. **Three.js Journey** (threejs-journey.com, Bruno Simon) — the one
    non-AI item, because reframe #5 cuts both ways: agents write your
    Three.js today, and you'll direct them far better once you can *read*
    a scene graph fluently. Do the fundamentals chapters, skip what the
    globe doesn't need.

### Tier 3 — Depth (optional, only if it pulls you)

11. **Karpathy — "Software 2.0"** (2017, karpathy.medium.com). The decade-old
    essay the current moment vindicated. Short; read for perspective.
12. **Karpathy — "Intro to Large Language Models"** then the **"Zero to
    Hero" series** (YouTube). As a data engineer you're one standard
    deviation from actually understanding transformers end-to-end. Not
    needed to *use* agents well — genuinely useful for intuition about why
    they fail the ways they fail (context limits, hallucinated confidence).
13. **Prompt-injection literature** (Willison's tag page is the best index).
    You now have agents that read web content and GitHub events. Before you
    build watchers that act on external input, understand the attack.

---

## Part 3 — Practice ladder (on this repo)

Do these roughly in order. Each one exercises a Part 1 reframe against a
real deliverable.

1. **Drive, don't code: ship roadmap item 5.1** (the CI verify workflow in
   `AI_STACK.md §5.1`) using a *mid-tier* model. Your only inputs: the
   roadmap paragraph, answers to its questions, review of its PR. If the
   stack is as good as claimed, the result should be indistinguishable from
   frontier-model work. This is the direct test of reframe #1 — run it
   *after* Fable access lapses, deliberately.
2. **Practice the gate reflex:** for one week, respond to every agent
   "done ✅" summary with only: "what would have caught this if it were
   wrong?" Make the agent answer. Notice how often the honest answer forces
   another check into `verify/`.
3. **Write one skill from scratch yourself** — no agent — for something you
   do repeatedly (e.g. a `new-essay` skill for when Substack tiles land in
   Phase 3). Writing one by hand teaches you what makes skills load-bearing:
   proven commands, failure signatures, exact file paths.
4. **Run a deliberate fan-out:** next real feature, spawn Plan + Explore
   agents in parallel before writing anything, then implement from their
   reports. Compare against your usual single-session flow — you're
   calibrating when orchestration pays, which is reframe #4 as muscle memory.
5. **Build the content watcher (roadmap 5.3)** once 1–4 feel natural. It
   combines everything: scheduling, subagents, external input handled with
   appropriate distrust (Tier 3, item 13), and reports you'll actually read.

---

## Part 4 — The anti-curriculum

Equal and opposite advice — things that feel like progress and aren't:

- **Prompt-trick listicles.** ("10 magic phrases…") Context engineering made
  them obsolete; anything real they contain is already in the Tier 1 docs.
- **Tool-of-the-week churn.** New agent frameworks ship daily. Your stack is
  plain markdown + a test suite — portable across all of them. Re-evaluate
  tooling quarterly, not per launch-tweet.
- **Model-release anxiety** — including the Fable loss that prompted all
  this. You now hold the counter-position: a repo where the discipline is
  installed *below* the model layer. Losing a tier costs you some raw
  cleverness on hard problems; it costs you nothing on process, and process
  is where projects die.
- **A fifth auditor, a sixth skill, a meta-orchestrator.** The stack's own
  roadmap says it: no more agents for their own sake. When tempted to grow
  the stack, add a *check* to `verify/` instead — checks compound, agents
  mostly multiply.
- **Reading past the point of shipping.** One tier-1 read → one practice-
  ladder rung → repeat. If two weekends pass with reading and no commits,
  the ratio is inverted.

---

*Maintenance: this is a snapshot, not a living doc like the rest of `docs/`.
Revisit after finishing the practice ladder; archive or rewrite it then.*
