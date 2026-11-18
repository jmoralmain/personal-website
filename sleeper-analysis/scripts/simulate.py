"""Monte Carlo of the rest of the chopped league (weeks 11-13).
Usage: python3 -I simulate.py <raw_dir> <out_json>
"""
import json, random, sys, statistics as st, collections

RAW, OUT = sys.argv[1], sys.argv[2]
J = lambda f: json.load(open(f'{RAW}/{f}'))
random.seed(2026)
N_SIMS = int(sys.argv[3]) if len(sys.argv) > 3 else 20000
MODE = sys.argv[4] if len(sys.argv) > 4 else 'base'
WEEKS = [11, 12, 13]

SC = J('league.json')['scoring_settings']
P = J('players.json')
users = {u['user_id']: u for u in J('users.json')}
rosters = {r['roster_id']: r for r in J('rosters.json')}
sched = J('schedule.json')
playing = collections.defaultdict(set)
for g in sched:
    playing[g['week']].update([g['home'], g['away']])

def tname(rid):
    u = users.get(rosters[rid]['owner_id'], {})
    return (u.get('metadata') or {}).get('team_name') or u.get('display_name')

score = lambda s: sum(v * s.get(k, 0) for k, v in SC.items())
logs = collections.defaultdict(list)          # pid -> [(week, pts)]
for w in range(1, 11):
    for pid, s in J(f'stats_{w}.json').items():
        if s.get('gms_active'):
            logs[pid].append((w, score(s)))

POS = ('QB', 'RB', 'WR', 'TE')
def info(pid):
    p = P.get(pid) or {}
    return dict(pid=pid, name=p.get('full_name') or pid, pos=p.get('position'), nfl=p.get('team'),
                inj=p.get('injury_status') or '', log=logs.get(pid, []))

def p_out(pl, week):
    """Probability the player doesn't play in `week` (bye, injury)."""
    if pl['nfl'] not in playing[week]:
        return 1.0
    s, k = pl['inj'], week - 11
    if s in ('IR', 'PUP', 'NA'): return 1.0
    if s in ('Out', 'Sus'): return [1.0, 0.5, 0.25][k]
    if s == 'Doubtful': return [0.85, 0.3, 0.1][k]
    if s == 'Questionable': return [0.25, 0.05, 0.0][k]
    return 0.0

def samples(pl):
    out = []
    for w, pts in pl['log']:
        out += [pts] * (2 if (w >= 8 and MODE != 'norecency') else 1)
    return out

for pl_pid in list(logs):
    pass
PL = {}
def get(pid):
    if pid not in PL:
        pl = info(pid); pl['bag'] = samples(pl)
        pl['mean'] = sum(pl['bag']) / len(pl['bag']) if pl['bag'] else 0.0
        PL[pid] = pl
    return PL[pid]

ALIVE = [rid for rid, r in rosters.items() if r['players']]
FAAB0 = {rid: 1000 - rosters[rid]['settings'].get('waiver_budget_used', 0) for rid in ALIVE}
WPOS = {rid: rosters[rid]['settings'].get('waiver_position', 99) for rid in ALIVE}
ROSTER0 = {rid: [p for p in rosters[rid]['players'] if get(p)['pos'] in POS] for rid in ALIVE}
SLOTS = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'FLEX']

def lineup(pids, week):
    ev = {p: get(p)['mean'] * (1 - p_out(get(p), week)) for p in pids}
    used, picks = set(), []
    for slot in SLOTS:
        ok = [p for p in pids if p not in used and (get(p)['pos'] == slot or (slot == 'FLEX' and get(p)['pos'] in ('RB', 'WR', 'TE')))]
        if not ok: continue
        best = max(ok, key=lambda p: ev[p]); used.add(best); picks.append(best)
    return picks, sum(ev[p] for p in picks)

def realize(pid, week):
    pl = get(pid)
    if not pl['bag'] or random.random() < p_out(pl, week): return 0.0
    return random.choice(pl['bag'])

def waivers(rost, faab, freed, week):
    """Two claim rounds over the chopped roster: highest FAAB first, then waiver priority."""
    pool = sorted(freed, key=lambda p: -get(p)['mean'])
    for _ in range(2):
        order = sorted(rost, key=lambda r: (-faab[r], WPOS[r]))
        for i, r in enumerate(order):
            if not pool: return
            cur, cur_ev = lineup(rost[r], week)
            best, gain = None, 0
            for cand in pool[:6]:
                _, ev = lineup(rost[r] + [cand], week)
                if ev - cur_ev > gain: best, gain = cand, ev - cur_ev
            if best is None: continue
            rivals = [faab[x] for x in order[i + 1:]]
            price = min(faab[r], (max(rivals) + 1) if rivals and max(rivals) > 0 else 0)
            faab[r] -= price
            rost[r] = sorted(rost[r] + [best], key=lambda p: -get(p)['mean'])[:14]
            pool.remove(best)

wins = collections.Counter(); survive = {w: collections.Counter() for w in WEEKS}
scores = {rid: [] for rid in ALIVE}; chop_counts = {w: collections.Counter() for w in WEEKS}
for _ in range(N_SIMS):
    rost = {r: list(ROSTER0[r]) for r in ALIVE}; faab = dict(FAAB0)
    for week in WEEKS:
        pts = {}
        for r in rost:
            picks, _ = lineup(rost[r], week)
            pts[r] = sum(realize(p, week) for p in picks)
            if week == 11: scores[r].append(pts[r])
        low = min(pts, key=pts.get)
        chop_counts[week][low] += 1
        for r in rost:
            if r != low: survive[week][r] += 1
        freed = rost.pop(low); faab.pop(low)
        if len(rost) == 1:
            wins[next(iter(rost))] += 1; break
        if MODE != 'nowaivers': waivers(rost, faab, freed, week + 1)

res = []
for r in ALIVE:
    picks, ev = lineup(ROSTER0[r], 11)
    s = scores[r]
    res.append(dict(rid=r, team=tname(r), faab=FAAB0[r],
        wk11_mean=round(st.mean(s), 1), wk11_sd=round(st.pstdev(s), 1), wk11_proj=round(ev, 1),
        p_survive11=round(survive[11][r] / N_SIMS, 3), p_final=round(survive[12][r] / N_SIMS, 3), p_win=round(wins[r] / N_SIMS, 3),
        lineup=[dict(name=get(p)['name'], pos=get(p)['pos'], nfl=get(p)['nfl'], ev=round(get(p)['mean'] * (1 - p_out(get(p), 11)), 1),
                     inj=get(p)['inj'], games=len(get(p)['log'])) for p in picks],
        out_wk=[{w: [dict(name=get(p)['name'], why='bye' if get(p)['nfl'] not in playing[w] else get(p)['inj'], ev=round(get(p)['mean'], 1))
                     for p in ROSTER0[r] if p_out(get(p), w) >= 0.5 and get(p)['mean'] >= 10] for w in WEEKS}],
        proj_by_week={w: round(lineup(ROSTER0[r], w)[1], 1) for w in WEEKS}))
res.sort(key=lambda x: -x['p_win'])
json.dump(dict(sims=N_SIMS, teams=res), open(OUT, 'w'), indent=1)
for x in res:
    print(x['team'], 'win', x['p_win'], 'final', x['p_final'], 'surv11', x['p_survive11'], 'wk11', x['wk11_mean'], '±', x['wk11_sd'], 'proj by wk', x['proj_by_week'], 'faab', x['faab'])
    print('   lineup', [(l['name'], l['pos'], l['ev'], l['inj']) for l in x['lineup']])
    print('   out', x['out_wk'])
