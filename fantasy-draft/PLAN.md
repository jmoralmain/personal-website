# 2026 Fantasy Draft Board — Build Plan

**League:** 12-team, PPR. **Owner:** Jeffrey.
**Built:** 2026-08-04. Standalone project — NOT part of the personal-website app.
Branch `claude/fantasy-football-draft-planner-1bgrb4` (not to be merged to main).

## Locked decisions
| Fork | Decision |
| --- | --- |
| Board depth | Top ~120 (≈10 rounds) |
| Positions | QB / RB / WR / TE only (no K/DST) |
| Missing Vegas lines | Leave blank; rank those players on ESPN ADP only |
| Vegas source | Best-available public scrape; **record which book each line came from** + timestamp |
| Output | `.xlsx` workbook (one sheet per position + Overall) **and** per-sheet `.csv` exports |

## Data sources
- **ADP / rankings:** ESPN 2026 PPR ADP + ESPN positional expert rankings. Fallback to
  FantasyPros consensus / DraftSharks (ESPN ADP) / FantasyFootballCalculator if ESPN's
  JS pages block the fetcher.
- **Vegas lines:** season-long player props, public scrape. Coverage is strong for the
  top ~40–60 players per stat and thins out fast past that — expect blanks at the back.

## Orchestration (agents grouped by SOURCE, not by stat, for efficiency)
1. **Agent A — ADP puller** → `data/adp.csv`
2. **Agent B — Vegas props puller** → `data/vegas_props.csv` (long format: one row per player-stat)
3. **Orchestrator (me)** → join A+B, build per-position tables
4. **Agent C — Ranking agent** → Vegas-implied fantasy projection → value rank → delta vs ESPN ADP

## Assumptions flagged
- "ESPN rankings" interpreted as ESPN ADP (ranking column) + ESPN positional expert ranks (for delta).
- Vegas lines are per-book, move daily, and are timestamped — not a single canonical truth.
- Players without a published season-long prop get blank line columns and no ranking delta.

## Fantasy scoring assumed (standard PPR) — used by Agent C
- PPR: 1.0 / reception. Rush/Rec yds: 0.1 / yd. Rush/Rec TD: 6. Fumble lost: −2.
- QB: Pass yds 0.04 / yd, Pass TD: 4, INT: −2, Rush yds 0.1/yd, Rush TD: 6.
