"""Backtest the weekly chop model on weeks already played.

For each week W, use only game logs from weeks before W and each team's actual
roster that week (from /matchups), set each team's best lineup by expected
points, simulate the week, and record the probability the model gave to the
team that was actually chopped.

Availability: a player counts as available if his NFL team had a game that
week and he played in it. That gives the model perfect injury news (it can't
know injuries in advance otherwise), so treat the result as a best case on
injuries and a fair test of everything else.
Usage: python3 -I backtest.py <raw_dir> <out_json>
"""
import json, random, sys, collections, math

RAW, OUT = sys.argv[1], sys.argv[2]
J = lambda f: json.load(open(f'{RAW}/{f}'))
random.seed(7)
SIMS = 4000
SC = J('league.json')['scoring_settings']; P = J('players.json')
score = lambda s: sum(v * s.get(k, 0) for k, v in SC.items())
stats = {w: J(f'stats_{w}.json') for w in range(1, 11)}
played = {w: {pid for pid, s in stats[w].items() if s.get('gms_active')} for w in range(1, 11)}
pos = lambda pid: (P.get(pid) or {}).get('position')
SLOTS = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'FLEX']

rows, tot_logp, tot_logu, hits = [], 0.0, 0.0, 0
for W in range(4, 11):
    bags = collections.defaultdict(list)
    for w in range(1, W):
        for pid in played[w]:
            if pos(pid) in ('QB', 'RB', 'WR', 'TE'):
                bags[pid] += [score(stats[w][pid])] * (2 if w >= W - 3 else 1)
    mean = {p: sum(b) / len(b) for p, b in bags.items()}
    teams = {m['roster_id']: [p for p in m['players'] if pos(p) in ('QB', 'RB', 'WR', 'TE')] for m in J(f'mu_{W}.json') if m['players']}
    actual = next(t['roster_ids'][0] for t in J(f'tx_{W}.json') if t['type'] == 'chopped')

    def lineup(pids):
        avail = [p for p in pids if p in played[W]]
        used, picks = set(), []
        for slot in SLOTS:
            ok = [p for p in avail if p not in used and (pos(p) == slot or (slot == 'FLEX' and pos(p) in ('RB', 'WR', 'TE')))]
            if ok:
                b = max(ok, key=lambda p: mean.get(p, 0)); used.add(b); picks.append(b)
        return picks
    lu = {r: lineup(ps) for r, ps in teams.items()}
    chop = collections.Counter()
    for _ in range(SIMS):
        pts = {r: sum(random.choice(bags[p]) if bags.get(p) else 0 for p in picks) for r, picks in lu.items()}
        chop[min(pts, key=pts.get)] += 1
    probs = {r: chop[r] / SIMS for r in teams}
    fav_r = max(probs, key=probs.get)
    p_act = max(probs[actual], 1 / SIMS)
    fav = max(probs, key=probs.get)
    rank = sorted(probs, key=lambda r: -probs[r]).index(actual) + 1
    tot_logp += math.log(p_act); tot_logu += math.log(1 / len(teams)); hits += fav == actual
    rows.append(dict(week=W, teams=len(teams), p_actual=round(probs[actual], 3), uniform=round(1 / len(teams), 3),
                     actual_rank=rank, favorite_hit=fav == actual, top_prob=round(probs[fav], 3), fav=fav, actual=actual))
    print(rows[-1])
summary = dict(weeks=len(rows), favorite_hits=hits, avg_p_actual=round(sum(r['p_actual'] for r in rows) / len(rows), 3),
               avg_uniform=round(sum(r['uniform'] for r in rows) / len(rows), 3),
               avg_rank=round(sum(r['actual_rank'] for r in rows) / len(rows), 2),
               log_score_vs_uniform=round(tot_logp - tot_logu, 2))
print(summary)
json.dump(dict(rows=rows, summary=summary), open(OUT, 'w'))
