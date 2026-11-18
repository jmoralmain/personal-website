"""2027 mock rookie draft for the 760 Dynasty.
Usage: python3 -I mock2027.py <dyn_dir> <players_json> <picks760_json> <prospects_json> <out_json>

Roster need, per team and position, from the current (2026) roster:
  strength = average 2026 points-above-replacement per game of the team's best k players
             at the position (k: QB 2 for superflex, RB 3, WR 3, TE 1), weeks 1-10;
  age      = average age of those players;
  need     = how far strength sits below the league average (in standard deviations),
             plus 0.5 if those starters are old for the position (QB 32+, RB 27+, WR 29+, TE 30+).
Pick rule: each pick takes the available prospect with the highest
  score = consensus value (The Big Board superflex value, scaled so #1 = 100) * (1 + 0.15 * need),
  need clipped to [-1, 2.5]; after a pick, that team's need at the position drops by 1.
"""
import json, sys, statistics as st, collections
D, PJ, PK, PR, OUT = sys.argv[1:6]
J = lambda f: json.load(open(f'{D}/{f}'))
P = json.load(open(PJ))
L = '1336088004720099328'
lg = J(f'league_{L}.json'); SC = lg['scoring_settings']
rosters = {r['roster_id']: r for r in J(f'{L}/rosters.json')}
users = {u['user_id']: u for u in J(f'{L}/users.json')}
owner = {rid: users.get(r['owner_id'], {}).get('display_name', '?') for rid, r in rosters.items()}
REPL = {'QB': 24, 'RB': 30, 'WR': 42, 'TE': 14}
K = {'QB': 2, 'RB': 3, 'WR': 3, 'TE': 1}
OLD = {'QB': 32, 'RB': 27, 'WR': 29, 'TE': 30}
pos_of = lambda pid: (P.get(pid) or {}).get('position')

# 2026 season-to-date points and games
pts, gp = collections.Counter(), collections.Counter()
for w in range(1, 11):
    for pid, s in J(f'stats/2026_{w}.json').items():
        pts[pid] += sum(v * s.get(k, 0) for k, v in SC.items())
        if (s.get('gp') or 0) > 0: gp[pid] += 1
repl = {}
for p, n in REPL.items():
    vals = sorted((v for pid, v in pts.items() if pos_of(pid) == p), reverse=True)
    repl[p] = vals[n - 1] / 10.0   # per-week replacement level
def par_pg(pid):
    p = pos_of(pid)
    if p not in REPL or not gp[pid]: return 0.0
    return max(0.0, pts[pid] / gp[pid] - repl[p])

strength, ages, starters = {}, {}, {}
for rid, r in rosters.items():
    for p in REPL:
        mine = sorted((pid for pid in (r['players'] or []) if pos_of(pid) == p), key=par_pg, reverse=True)[:K[p]]
        vals = [par_pg(x) for x in mine] + [0.0] * (K[p] - len(mine))
        strength[(rid, p)] = st.mean(vals)
        a = [P[x].get('age') for x in mine if (P.get(x) or {}).get('age')]
        ages[(rid, p)] = st.mean(a) if a else None
        starters[(rid, p)] = [dict(name=P[x].get('full_name'), age=P[x].get('age'), ppg=round(pts[x] / gp[x], 1) if gp[x] else 0.0) for x in mine]
need = {}
for p in REPL:
    vals = [strength[(rid, p)] for rid in rosters]
    mu, sd = st.mean(vals), st.pstdev(vals) or 1
    for rid in rosters:
        old = ages[(rid, p)] is not None and ages[(rid, p)] >= OLD[p]
        need[(rid, p)] = round((mu - strength[(rid, p)]) / sd + (0.5 if old else 0.0), 2)
rank_pos = {}
for p in REPL:
    for i, rid in enumerate(sorted(rosters, key=lambda r: -strength[(r, p)])): rank_pos[(rid, p)] = i + 1

picks = json.load(open(PK))
order = sorted((x for x in picks['picks'] if x['season'] == '2027'), key=lambda x: x['proj_pick'])
pros = json.load(open(PR))
top = pros[0]['value']
avail = [dict(p, v=round(100 * p['value'] / top, 1)) for p in pros]
live = dict(need)
mock = []
for x in order:
    rid = x['rid']
    def score(c): return c['v'] * (1 + 0.15 * max(-1.0, min(2.5, live[(rid, c['pos'])])))
    best_value = avail[0]
    choice = max(avail, key=score)
    avail.remove(choice)
    n0 = live[(rid, choice['pos'])]
    live[(rid, choice['pos'])] -= 1
    if choice is best_value or choice['rank'] == best_value['rank']: why = 'best'
    elif n0 >= 0.5: why = 'need'
    else: why = 'value'
    mock.append(dict(pick=x['proj_pick'], round=x['round'], slot=(x['proj_pick'] - 1) % 12 + 1, rid=rid, owner=x['owner'], orig=x['orig'],
                     name=choice['name'], pos=choice['pos'], school=choice['school'], bb_rank=choice['rank'], bb_slot=choice['slot'],
                     reach=x['proj_pick'] - choice['rank'], why=why, need=round(n0, 2), pos_rank=rank_pos[(rid, choice['pos'])],
                     starters=starters[(rid, choice['pos'])], best_left=dict(name=best_value['name'], pos=best_value['pos'], rank=best_value['rank'])))
teams = []
for rid in sorted(rosters):
    teams.append(dict(rid=rid, owner=owner[rid], me=False, w=rosters[rid]['settings'].get('wins', 0), l=rosters[rid]['settings'].get('losses', 0),
        need={p: need[(rid, p)] for p in REPL}, strength={p: round(strength[(rid, p)], 2) for p in REPL}, rank={p: rank_pos[(rid, p)] for p in REPL},
        age={p: round(ages[(rid, p)], 1) if ages[(rid, p)] else None for p in REPL}, starters={p: starters[(rid, p)] for p in REPL},
        top_need=max(REPL, key=lambda p: need[(rid, p)]), picks=[m for m in mock if m['rid'] == rid]))
json.dump(dict(mock=mock, teams=teams, prospects=pros, source=dict(name='The Big Board', list='2027 rookie rankings, Superflex 12-team PPR', updated='2026-11-17')), open(OUT, 'w'), indent=1)

print('need by team (QB RB WR TE):')
for t in teams: print(f"  {t['owner'][:15]:15} {t['w']}-{t['l']}  " + '  '.join(f"{p} {t['need'][p]:+.2f}(#{t['rank'][p]}, age {t['age'][p]})" for p in REPL) + f"  -> top need {t['top_need']}")
print('\nMOCK:')
for m in mock: print(f"  {m['round']}.{m['slot']:02d} (#{m['pick']:2}) {m['owner'][:14]:14} {m['name']:22} {m['pos']} {m['school'][:14]:14} BB#{m['bb_rank']:2} reach {m['reach']:+3} {m['why']:5} need {m['need']:+.2f}")
print('undrafted top-36:', [p['name'] for p in avail if p['rank'] <= 36])
