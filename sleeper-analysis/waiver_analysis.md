# Waiver wire report: "It was a Chopped Run" (2026)

*Data pulled 2026-11-18 from the Sleeper public API. Scored weeks: 1–10. Week 11 is in progress, so it has no stats yet.*

## TL;DR

**Love Hurts (you) has played the waiver wire best, and it isn't close on output.** Players you picked up produced **701.6 starter points**, which is 61% of everything you've started. No other surviving team gets more than 47% from pickups. You also paid the least per point ($1.29 of FAAB per starter point; the others paid $1.72–$2.67). Your draft was the weakest of the four (you have the fewest starter points overall), so waivers are why you're still alive.

You also have the most FAAB left ($93, against $41, $4 and $0). From here on, each chop dumps another full roster onto waivers, so that budget is the biggest structural edge left in the league.

| Rank | Team | Pickup starter pts | Share of starter pts from pickups | FAAB spent | FAAB / pickup pt | FAAB left | Verdict |
|---|---|---:|---:|---:|---:|---:|---|
| 1 | **Love Hurts** (mynameisuser) | **701.6** | **60.8%** | 907 | **$1.29** | **93** | Best: highest volume, most efficient, most dry powder |
| 2 | masonmay | 578.9 | 47.2% | 996 | $1.72 | 4 | Aggressive, won the Ja'Marr Chase auction, now broke |
| 3 | TannerMenning | 432.2 | 30.9% | 1000 | $2.31 | 0 | Stars and scrubs: two huge bids, strong draft carrying them |
| 4 | KDEMPSTER15 | 359.6 | 28.1% | 959 | $2.67 | 41 | Least return so far, but $245 of week-10 bids is still unproven |

---

## How the data was built (and checked)

**League selection.** Your account (`mynameisuser`, user_id `1132449068699025408`) has three 2026 leagues. Only **It was a Chopped Run** (`1395599117568180225`) is a guillotine league. Its `settings.type = 3`, `last_chopped_leg = 10` and `disable_elimination = 0`, and the name says so. The other two are `type = 2` (dynasty).

**Who's alive.** Three independent signals all agree:

1. **`chopped` transactions.** Each of weeks 1–10 has exactly one transaction of type `chopped`. It names the roster and drops all 14 of its players: week 1 → roster 5, 2 → 14, 3 → 2, 4 → 7, 5 → 13, 6 → 3, 7 → 9, 8 → 6, 9 → 8, 10 → 11.
2. **`/rosters`.** Exactly four rosters still hold players (14 each): 1, 4, 10 and 12. The ten chopped rosters have `players: []`. Neither roster `settings`/`metadata` nor league `metadata` carries an elimination flag (`metadata` is `null`), so the empty roster plus the chop transaction is the evidence.
3. **`/matchups`.** In every week, the chopped roster was the lowest scorer among teams with players. It has an empty player list from the next week onward. The week-11 matchups list only rosters 1, 4, 10 and 12.

See `eliminations.csv`.

**Scoring.** I scored every player-week from `/stats/nfl/regular/2026/{week}` using the league's `scoring_settings` (full PPR, 6-pt rush/rec TD, 4-pt pass TD, 0.04/pass yd). The result matched Sleeper's own `players_points` in the matchups **exactly on all 1,323 player-weeks** (max difference 0.00).

**FAAB.** The $1,000 budget is from `settings.waiver_budget`. Spend summed from completed waiver bids matches each roster's `waiver_budget_used` exactly (996 / 959 / 907 / 1000).

**Pickup points.** A pickup is credited for a week only if the player appears in that team's `/matchups` roster that week, on or after the add, and before any later re-add. "Started points" counts only weeks he was in `starters`. Note the timing: **waivers for leg N run the Wednesday after week N's games**, after the Tuesday chop, so a leg-N claim first counts in week N+1. Free-agent adds can count the same week. Leg-10 claims ran this morning, so they show as *pending*.

**Caveats.**
- FAAB per point favours early spending, because early pickups have had more weeks to score. Late, big claims (KDEMPSTER15's Lamb, Cook and Bowers; TannerMenning's Gibbs) are understated.
- I didn't model "points over replacement". These are raw points produced.

---

## The market that matters: chopped rosters

In this league, almost all FAAB went to players released by a just-chopped team:

| Team | FAAB on players from chopped rosters |
|---|---|
| masonmay | $996 of $996 |
| TannerMenning | $980 of $1,000 |
| Love Hurts | $905 of $907 |
| KDEMPSTER15 | $912 of $959 |

The weekly chop is the waiver wire. The teams that won are the ones that won the right auctions and then didn't need to win many more.

---

## Team by team

### Love Hurts (mynameisuser): roster 10

**FAAB:** $907 spent · **$93 left** · 17 claims won, 14 FA adds, 40 failed bids · $513 in weeks 1–3, $207 in weeks 4–7, $187 in weeks 8+

| Wk | Added | Pos | Dropped | Bid | From chopped team | Wks rostered / started | Started pts | $ / started pt |
|---|---|---|---|---:|---|---|---:|---:|
| 1 | Kyren Williams | RB | — | $211 | DrKnockerzz | 9 / 9 | 148.8 | 1.42 |
| 1 | Mike Evans | WR | — | $176 | DrKnockerzz | 9 / 3 | 47.1 | 3.74 |
| 3 | Michael Wilson | WR | — | $126 | Bengraz03 | 6 / 5 | 68.38 | 1.84 |
| 4 | Kaelon Black | RB | Kayshon Boutte | $0 | — | 1 / 0 | 0 | — |
| 4 | Kenyon Sadiq | TE | Kyle Pitts Sr. | $1 | hnestande | 1 / 0 | 0 | ∞ (0 pts) |
| 5 | KC Concepcion Jr. | WR | — | $0 | ryanoleson5 | 3 / 0 | 0 | — |
| 6 | Patrick Mahomes | QB | Jalen Hurts | $0 | — | 1 / 1 | 11.48 | 0.0 |
| 6 | Joe Burrow | QB | Patrick Mahomes | $2 | — | 5 / 4 | 134.06 | 0.01 |
| 6 | Jameson Williams | WR | — | $16 | GAVINKIRK | 5 / 3 | 40.1 | 0.4 |
| 7 | Javonte Williams | RB | — | $136 | CHOPPIN my balls off | 3 / 2 | 29.1 | 4.67 |
| 7 | Luther Burden III | WR | — | $52 | CHOPPIN my balls off | 3 / 1 | 20.7 | 2.51 |
| 8 | Christian McCaffrey | RB | — | $100 | brookseleven | 3 / 2 | 69.0 | 1.45 |
| 8 | Bhayshul Tuten | RB | — | $20 | brookseleven | 2 / 1 | 20.3 | 0.99 |
| 9 | Tee Higgins | WR | — | $60 | michaelcmcguire | 1 / 1 | 11.6 | 5.17 |
| 10 | Tony Pollard | RB | — | $3 | OneSpicyCannoli | pending (wk 11+) | 0 | — |
| 10 | Christian Watson | WR | — | $1 | OneSpicyCannoli | pending (wk 11+) | 0 | — |
| 10 | Tetairoa McMillan | WR | — | $3 | OneSpicyCannoli | pending (wk 11+) | 0 | — |

Free-agent adds that scored as starters (7 of 14 FA adds): Devaughn Vele (wk 1, 34.0), Jacoby Brissett (wk 5, 26.28), Harold Fannin Jr. (wk 9, 12.2), Jalen Coker (wk 6, 11.5), Brenton Strange (wk 6, 9.4), Travis Kelce (wk 10, 5.0), Kalif Raymond (wk 4, 2.6)

**Best pickups**
- **Kyren Williams**, $211 (wk 1). 148.8 pts, started all 9 weeks. The best pickup in the league by volume, landed before anyone else woke up.
- **Joe Burrow**, $2 (wk 6). 134.1 pts in 4 starts, at **$0.01 per point**. The best value pickup of anyone.
- **Christian McCaffrey**, $100 (wk 8). 69.0 pts in 2 starts.

**Worst pickups**
- **Javonte Williams**, $136 (wk 7). 29.1 pts, $4.67/pt. The most expensive per point of your paid claims.
- **Mike Evans**, $176 (wk 1). Only 3 starts in 9 rostered weeks for 47.1 pts ($3.74/pt). Your second-biggest bid was mostly a bench piece.
- **Tee Higgins**, $60 (wk 9). 11.6 pts in his one week so far.

**Strategy.** You were **aggressive early at RB/WR and value-hunted at QB.** Week 1's $387 on Kyren and Evans was the biggest week-1 splash in the league, and Kyren paid it back. After that you spread lots of small bids ($1–$20), especially for QBs. Burrow, Mahomes and Brissett cost a combined $2 and produced 172 starter points. Your FAAB is almost entirely RB ($470) and WR ($434), with $3 total on QB and TE.

**The leak to fix: roster-full failures.** 13 of your 40 failed bids failed with *"your roster will have too many players"*, not because you were outbid. In at least three of those you were the **high bidder**:
- Josh Jacobs (wk 7: you bid $51, he went to KDEMPSTER15 for $43)
- George Kittle (wk 9: $36 vs masonmay's $31)
- Matthew Golden (wk 9: $32 vs masonmay's $17)

Those bids were placed without a drop, and by the time they processed your roster was full. Always attach a drop to every bid, or order your bids so that the ones without drops process first.

---

### TannerMenning: roster 12

**FAAB:** $1,000 spent · **$0 left** · 7 claims won, 6 FA adds, 6 failed bids · $20 in weeks 1–3, $700 in weeks 4–7, $280 in weeks 8+

| Wk | Added | Pos | Dropped | Bid | From chopped team | Wks rostered / started | Started pts | $ / started pt |
|---|---|---|---|---:|---|---|---:|---:|
| 1 | Jordan Love | QB | Sam Darnold | $0 | — | 9 / 7 | 143.26 | 0.0 |
| 3 | Ollie Gordon II | RB | Tyrone Tracy Jr. | $20 | — | 7 / 5 | 61.9 | 0.32 |
| 4 | Puka Nacua | WR | Marvin Mims Jr. | $700 | hnestande | 6 / 5 | 133.5 | 5.24 |
| 8 | Jordan Mason | RB | Dameon Pierce | $0 | — | 1 / 0 | 0 | — |
| 9 | Jahmyr Gibbs | RB | Xavier Worthy | $280 | michaelcmcguire | 1 / 1 | 44.2 | 6.33 |
| 9 | Carnell Tate | WR | Quinshon Judkins | $0 | — | 2 / 0 | 0 | — |
| 10 | Jordyn Tyson | WR | Tucker Kraft | $0 | — | pending (wk 11+) | 0 | — |

Free-agent adds that scored as starters (3 of 6 FA adds): Isaiah Likely (wk 9, 27.7), Dameon Pierce (wk 6, 15.0), DJ Moore (wk 9, 6.6)

**Best pickups**
- **Jordan Love**, $0 (wk 1 claim). 143.3 starter pts. The best free pickup by any of the four teams.
- **Puka Nacua**, $700 (wk 4). 133.5 pts in 5 starts. It worked, but at **$5.24/pt**: it took 70% of the budget in one bid, $297 more than the highest rival bid (KDEMPSTER15's $403).
- **Ollie Gordon II**, $20 (wk 3). 61.9 pts in 5 starts, at $0.32/pt.

**Worst pickups**
- **Jahmyr Gibbs**, $280 (wk 9). 44.2 pts in one start so far ($6.33/pt). Probably fine over time, but it emptied the account.
- **Puka Nacua**, on price alone.
- A run of $0 dart throws (Jordan Mason, Rome Odunze, Carnell Tate) that never started.

**Strategy.** **Stars and scrubs.** This is the lowest-volume team by far: 7 claims, two of which (Puka and Gibbs) took 98% of the budget. Otherwise TannerMenning stays out of the bidding and leans on a strong draft (highest total starter points, 1,398, and the 197.0 week-10 high score). Waivers supplied only 31% of the starter points.

The downside is that they're **out of FAAB**. In week 9, their $200 bid on Tee Higgins *would have won* but failed with a roster-full error, and that's how you got Higgins for $60.

---

### masonmay: roster 1

**FAAB:** $996 spent · **$4 left** · 17 claims won, 18 FA adds, 39 failed bids ($3,350 in losing bids) · $521 in weeks 1–3, $281 in weeks 4–7, $194 in weeks 8+

| Wk | Added | Pos | Dropped | Bid | From chopped team | Wks rostered / started | Started pts | $ / started pt |
|---|---|---|---|---:|---|---|---:|---:|
| 1 | Patrick Mahomes | QB | Alvin Kamara | $0 | — | 5 / 2 | 33.94 | 0.0 |
| 3 | Ja'Marr Chase | WR | Oronde Gadsden | $426 | Bengraz03 | 7 / 6 | 139.3 | 3.06 |
| 3 | Sam LaPorta | TE | Kyle Pitts Sr. | $65 | Bengraz03 | 4 / 2 | 42.2 | 1.54 |
| 3 | Blake Corum | RB | Tre' Harris | $30 | Bengraz03 | 1 / 0 | 0 | ∞ (0 pts) |
| 4 | Rome Odunze | WR | Rachaad White | $0 | — | 1 / 0 | 0 | — |
| 4 | Rico Dowdle | RB | Mark Andrews | $0 | — | 1 / 0 | 0 | — |
| 4 | Ladd McConkey | WR | Rome Odunze | $15 | hnestande | 2 / 1 | 2.7 | 5.56 |
| 5 | Chase Brown | RB | Mike Washington Jr. | $15 | ryanoleson5 | 5 / 3 | 36.4 | 0.41 |
| 6 | Trey McBride | TE | Ladd McConkey | $249 | GAVINKIRK | 4 / 3 | 59.7 | 4.17 |
| 6 | Cam Skattebo | RB | Tyler Allgeier | $1 | GAVINKIRK | 3 / 0 | 0 | ∞ (0 pts) |
| 7 | Isaiah Likely | TE | Jordan Mason | $1 | CHOPPIN my balls off | 0 / 0 | 0 | ∞ (0 pts) |
| 8 | Jonah Coleman | RB | Carnell Tate | $0 | — | 2 / 1 | 18.8 | 0.0 |
| 9 | George Kittle | TE | — | $31 | michaelcmcguire | 1 / 1 | 13.4 | 2.31 |
| 9 | Justin Jefferson | WR | Ladd McConkey | $101 | michaelcmcguire | 1 / 1 | 16.4 | 6.16 |
| 9 | Matthew Golden | WR | — | $17 | michaelcmcguire | 1 / 1 | 12.0 | 1.42 |
| 10 | Bijan Robinson | RB | Saquon Barkley | $44 | OneSpicyCannoli | pending (wk 11+) | 0 | — |
| 10 | Chris Olave | WR | Drake Maye | $1 | OneSpicyCannoli | pending (wk 11+) | 0 | — |

Free-agent adds that scored as starters (5 of 18 FA adds): Drake Maye (wk 4, 138.44), Emmett Johnson (wk 10, 35.1), Ladd McConkey (wk 8, 12.6), Dallas Goedert (wk 6, 12.1), Tyler Allgeier (wk 6, 5.8)

**Best pickups**
- **Ja'Marr Chase**, $426 (wk 3). 139.3 pts in 6 starts, at $3.06/pt. Expensive, but a weekly difference-maker.
- **Drake Maye**, $0 (wk 4 FA add). 138.4 starter pts. A free QB1.
- **Trey McBride**, $249 (wk 6). 59.7 pts in 3 starts ($4.17/pt). Pricey, but it solved TE.

**Worst pickups**
- **Blake Corum**, $30 (wk 3). 0 starter pts, gone after one week.
- **Justin Jefferson**, $101 (wk 9). 16.4 pts so far ($6.16/pt), the worst rate on the team (early days).
- **Ladd McConkey**, $15 (wk 4). 2.7 pts, then re-added later for free.

**Strategy.** **The most aggressive, highest-churn manager.** masonmay made 35 adds, the most of the four, and put in $3,350 of *losing* bids: Jefferson at $422 (wk 2), Chase at $420 (wk 1), Bijan at $349, Olave at $200. Their spend leans heavily **WR/TE** ($906 of $996), and they filled RB and QB almost entirely for free (Maye, Chase Brown at $15, Emmett Johnson). Half their spend landed in weeks 1–3.

The ceiling is real: their 190.8 points in week 5 is the second-highest weekly score among the four. They nearly paid for the slow start, though, surviving week 3 by **3.88 points**. Like TannerMenning, they're now effectively broke ($4).

---

### KDEMPSTER15: roster 4

**FAAB:** $959 spent · **$41 left** · 14 claims won, 15 FA adds, 22 failed bids · **$0 in weeks 1–3**, $666 in weeks 4–7, $293 in weeks 8+

| Wk | Added | Pos | Dropped | Bid | From chopped team | Wks rostered / started | Started pts | $ / started pt |
|---|---|---|---|---:|---|---|---:|---:|
| 4 | Roschon Johnson | RB | Marvin Harrison Jr. | $0 | — | 1 / 0 | 0 | — |
| 4 | Emanuel Wilson | RB | Kendre Miller | $47 | — | 2 / 2 | 18.4 | 2.55 |
| 4 | Bucky Irving | RB | Darren Waller | $173 | hnestande | 6 / 5 | 111.9 | 1.55 |
| 4 | Jeremiyah Love | RB | Courtland Sutton | $109 | hnestande | 4 / 1 | 2.2 | 49.55 |
| 5 | Tyler Warren | TE | Mike Gesicki | $93 | ryanoleson5 | 5 / 3 | 16.6 | 5.6 |
| 5 | A.J. Brown | WR | Marvin Harrison Jr. | $107 | ryanoleson5 | 5 / 2 | 13.5 | 7.93 |
| 5 | Caleb Williams | QB | Tyler Shough | $41 | ryanoleson5 | 5 / 1 | 22.12 | 1.85 |
| 7 | Nico Collins | WR | Denzel Boston | $53 | CHOPPIN my balls off | 3 / 2 | 39.9 | 1.33 |
| 7 | Josh Jacobs | RB | Rhamondre Stevenson | $43 | CHOPPIN my balls off | 2 / 2 | 23.7 | 1.81 |
| 8 | Rashee Rice | WR | DK Metcalf | $26 | brookseleven | 2 / 1 | 13.2 | 1.97 |
| 8 | Derrick Henry | RB | Jeremiyah Love | $22 | brookseleven | 2 / 1 | 19.0 | 1.16 |
| 10 | CeeDee Lamb | WR | A.J. Brown | $101 | OneSpicyCannoli | pending (wk 11+) | 0 | — |
| 10 | James Cook III | RB | Stefon Diggs | $78 | OneSpicyCannoli | pending (wk 11+) | 0 | — |
| 10 | Brock Bowers | TE | Breece Hall | $66 | OneSpicyCannoli | pending (wk 11+) | 0 | — |

Free-agent adds that scored as starters (6 of 15 FA adds): Cam Skattebo (wk 10, 27.2), Breece Hall (wk 10, 14.8), T.J. Hockenson (wk 7, 13.5), Stefon Diggs (wk 6, 12.8), Darren Waller (wk 4, 6.6), Tyler Higbee (wk 6, 4.2)

**Best pickups**
- **Bucky Irving**, $173 (wk 4). 111.9 pts in 5 starts ($1.55/pt). Their one big hit.
- **Nico Collins**, $53 (wk 7). 39.9 pts in 2 starts ($1.33/pt).
- **Cam Skattebo**, $0 (wk 10 FA add). 27.2 pts in his first week.

**Worst pickups**
- **Jeremiyah Love**, $109 (wk 4). **2.2 starter pts** in 4 rostered weeks, at **$49.55/pt**. The single worst claim among the four teams.
- **A.J. Brown**, $107 (wk 5). 13.5 pts in 2 starts ($7.93/pt).
- **Tyler Warren**, $93 (wk 5). 16.6 pts in 3 starts ($5.60/pt).

**Strategy.** **Patient start, then an RB-heavy spending spree.** KDEMPSTER15 spent nothing in weeks 1–3 while riding a strong draft (149 points in each of weeks 1 and 2), then fired $666 of mid-sized bids in weeks 4–7. RB got the most FAAB ($472). Every paid bid was in the $22–$173 range, with no all-in shot. The hit rate was poor: three of their four scored $90+ claims returned under 17 starter points.

The upside is that they saved **$245 for this week's (wk 10) OneSpicyCannoli dump**: CeeDee Lamb ($101), James Cook ($78) and Brock Bowers ($66). If those three hit, the ranking will tighten a lot. They have the strongest draft core after TannerMenning, with 1,278 starter points.

---

## Side by side

| | Love Hurts | TannerMenning | masonmay | KDEMPSTER15 |
|---|---:|---:|---:|---:|
| Waiver claims won | 17 | 7 | 17 | 14 |
| FA adds | 14 | 6 | 18 | 15 |
| Failed bids (outbid / roster full) | 27 / 13 | 5 / 1 | 36 / 3 | 22 / 0 |
| FAAB spent | $907 | $1,000 | $996 | $959 |
| **FAAB left** | **$93** | $0 | $4 | $41 |
| Biggest bid | $211 (Kyren) | $700 (Puka) | $426 (Chase) | $173 (Irving) |
| Avg winning bid | $53 | $143 | $59 | $69 |
| FAAB in weeks 1–3 / 4–7 / 8+ | 513 / 207 / 187 | 20 / 700 / 280 | 521 / 281 / 194 | 0 / 666 / 293 |
| FAAB by position | RB 470, WR 434 | WR 700, RB 300 | WR 560, TE 346, RB 90 | RB 472, WR 287, TE 159, QB 41 |
| Total starter pts (wks 1–10) | 1,153.5 | **1,398.4** | 1,227.7 | 1,277.5 |
| **Pickup starter pts** | **701.6** | 432.2 | 578.9 | 359.6 |
| From $0 pickups | 112.5 | 192.6 | 256.8 | 79.1 |
| From paid pickups | 589.1 | 239.6 | 322.1 | 280.5 |
| Share of starter pts from pickups | **61%** | 31% | 47% | 28% |
| **FAAB per pickup starter pt** | **$1.29** | $2.31 | $1.72 | $2.67 |
| FAAB still unproven (wk-10 claims) | $7 | $0 | $45 | $245 |
| Closest call vs. the chopped team | +1.46 (wk 6) | +13.58 (wk 9) | +3.88 (wk 3) | +11.76 (wk 9) |

## Who's played the wire best

**1. Love Hurts.** Your pickups produced the most starter points: 123 more than masonmay's, and roughly double KDEMPSTER15's. You did it at the lowest cost per point and you still have the most FAAB. You won the two biggest single-value claims of the year: Kyren Williams at $211 (148.8 pts) and Burrow at $2 (134.1 pts). You hit studs at sensible prices (CMC at $100 beat masonmay's $98) and filled QB for $2 all season.

This is also the team that *needed* the wire most. With the weakest total starter points of the four, waivers are the difference between you and an earlier chop. You survived week 6 by 1.46 points. Your one real flaw is mechanical: roster-full failures cost you Jacobs, Kittle and Golden even though you were the high bidder.

**2. masonmay.** The best pure aggressor. They won the Chase auction, found a free QB1 in Drake Maye, and got the most points of anyone from $0 adds (256.8). But they ran $3,350 in losing bids and ended at $4, so they're out of the auction market for the rest of the year.

**3. TannerMenning.** The best *team*, but not the best *waiver* team. Their waiver value comes from one free claim (Jordan Love) and two massive bids. Puka at $700 hit, but at the worst rate of any big claim among the four. Gibbs is still early. Having $0 left has already cost them (the Higgins failure), and it will matter more as chops keep dumping talent.

**4. KDEMPSTER15.** The least return so far: the fewest pickup points and the highest cost per point, driven by the Jeremiyah Love, A.J. Brown and Tyler Warren misses. The grade is provisional, though. They have $245 riding on Lamb, Cook and Bowers, the biggest unproven bet among the four. If all three hit, they could pass TannerMenning for #3.

## What this means going forward (weeks 11+)

With four teams left, every chop releases a full 14-man roster. Those players will go to whoever can still bid:

| Team | FAAB left |
|---|---:|
| Love Hurts | $93 |
| KDEMPSTER15 | $41 |
| masonmay | $4 |
| TannerMenning | $0 |

TannerMenning can only make $0 claims. A $5 bid beats masonmay. And $42 beats everyone, KDEMPSTER15 included.

Don't spend that budget on depth. Hold it for the best player off the next chopped roster. And always designate a drop.

---

## Files in this folder

| File | What's in it |
|---|---|
| `transactions_all_teams.csv` | Every completed waiver claim (`waiver_claim`) and free-agent add (`free_agent_add`), all 14 teams, weeks 1–11, with bid, add/drop and timestamp |
| `failed_waiver_bids.csv` | Every failed bid, with Sleeper's reason and who actually won the player at what price |
| `pickups_alive_teams.csv` | Every add by the four surviving teams: weeks rostered and started, started and rostered points, $ per point, chopped-roster source, still rostered |
| `weekly_player_points_alive_teams.csv` | Player-week rows for the four teams: started flag, Sleeper points, points computed from league scoring |
| `weekly_rank_alive_teams.csv` | Weekly score, rank among surviving teams, margin over that week's chopped team |
| `team_waiver_summary.csv` | One row per surviving team with all the summary metrics above |
| `eliminations.csv` | All 14 rosters: chop week, score that week, current player count, FAAB used |
| `analyze.py` | The script that built all of the above from the cached API JSON (`python3 analyze.py <raw_json_dir> <out_dir>`) |
