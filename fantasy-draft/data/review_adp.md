# QA Review — `adp.csv` (ESPN / Field Yates 2026 PPR)

Reviewed: 2026-08-04 · 138 rows · source `espn-fieldyates` · `espn_adp` blank on all rows (expected; `espn_pos_rank` populated).

## Team corrections

Bottom line: **zero corrections needed.** Every team checked is correct. All seven builder-flagged
players trace to genuine 2026 offseason moves (free agency or trade), so the teams that "look wrong for
2025" are right for 2026. The TEAM column was flagged low-confidence, but it held up on every check.

### Flagged players (all confirmed CORRECT)

| player | team_in_csv | verified_team | confidence | source note |
| --- | --- | --- | --- | --- |
| A.J. Brown | NE | NE (Patriots) | high | Traded PHI→NE (post-June-1, 2026), reuniting with Mike Vrabel. |
| Kenneth Walker III | KC | KC (Chiefs) | high | Left SEA in free agency; 3-yr deal with Kansas City (2026). |
| Jaylen Waddle | DEN | DEN (Broncos) | high | Traded MIA→DEN during 2026 draft. |
| David Montgomery | HOU | HOU (Texans) | high | Traded DET→HOU (2026) for pick + OL Juice Scruggs. |
| DJ Moore | BUF | BUF (Bills) | high | Traded CHI→BUF (2026); reunites with HC Joe Brady. |
| Kyler Murray | MIN | MIN (Vikings) | high | Released by ARI; signed 1-yr min deal with MIN (2026). |
| Isiah Pacheco | DET | DET (Lions) | high | FA from KC; signed DET as Gibbs' backup after Montgomery trade. |

### Additional spot-checks (all confirmed CORRECT)

Non-flagged stars verified against 2026 rosters — every one matched the CSV:

| player | team_in_csv | verified_team | confidence | source note |
| --- | --- | --- | --- | --- |
| Mike Evans | SF | SF (49ers) | high | Left TB after 12 yrs; signed SF in FA (Mar 2026). Career-Buc, so looked odd — but correct. |
| Davante Adams | LAR | LAR (Rams) | high | 2nd yr with Rams (signed 2025). |
| George Pickens | DAL | DAL (Cowboys) | high | 2nd yr in DAL; on $27.3M franchise tag. |
| DK Metcalf | PIT | PIT (Steelers) | high | 2nd yr in PIT. |
| Travis Etienne Jr. | NO | NO (Saints) | high | FA from JAX; signed hometown Saints (2026). |
| Rachaad White | WSH | WSH (Commanders) | high | FA from TB; signed WSH (Mar 2026). |
| Jakobi Meyers | JAX | JAX (Jaguars) | high | Traded LV→JAX mid-2025; extended, full yr in JAX for 2026. |
| Christian McCaffrey | SF | SF (49ers) | high | Confirmed still SF. |

No player in the 15 checked differed from the CSV. Rookie/2026-draft entries (e.g., Jeremiyah Love ARI,
Jadarian Price SEA, Carnell Tate TEN, Makai Lemon PHI, Jordyn Tyson NO) were not team-verified — draft
landing spots are outside reliable search confidence and were not part of the flagged set.

## Structural issues

No blocking problems. Details:

- **Duplicate player names:** none.
- **Positional-rank continuity:** complete and gapless in every position —
  RB1–RB49, WR1–WR56, TE1–TE15, QB1–QB18, each appearing exactly once.
  Counts sum to 49+56+15+18 = **138**, matching the row count exactly (no orphan/extra positions).
- **`overall_adp_rank`:** sequential 1–138, no gaps or duplicates.
- **`pos` vs `espn_pos_rank`:** consistent on every row (RB rows carry RBn, WR→WRn, etc.). No misparses;
  all rows have the full 8 fields.
- **Minor (non-blocking) ordering inconsistencies** — positional rank not perfectly monotonic with
  overall rank in two spots. Not gaps or dupes, just the two rank columns disagreeing slightly:
  - Overall 114 Zach Charbonnet = RB41 but overall 115 Blake Corum = RB40 (RB40/RB41 inverted).
  - Overall 105 Romeo Doubs = WR46, yet overall 107/108/120 = WR43/WR44/WR45 — so WR43–WR46 are
    out of order relative to overall ADP. Worth a glance but not a data error.

## Overall assessment

Usable as the ranking backbone as-is. The top-15 ordering reads like a sane 2026 PPR expert board
(RB-heavy top tier, Chase at 5 / JSN at 6 slightly aggressive but defensible), the positional ranks are
gapless, and the TEAM column — despite being flagged low-confidence — verified 15-for-15, including all
seven suspected errors, which are all legitimate 2026 moves.
