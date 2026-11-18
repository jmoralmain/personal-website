"""Startup-draft review of The 760 Dynasty.
Usage: python3 -I dynasty.py <dyn_dir> <players_json> <out_json>

Value of a pick = points above replacement (PAR) in each season, in that season's
league scoring, floored at 0 per season (a bust is worth nothing, not less).
Replacement for a 12-team superflex PPR league, by full-season points rank:
QB 24, RB 30, WR 42, TE 14. Value over slot = a pick's PAR minus the average PAR
of the 21 picks around it (its own slot +-10), so early picks aren't rewarded
just for being early.
"""
import json, sys, collections, statistics as st

D, PJ, OUT = sys.argv[1:4]
J = lambda f: json.load(open(f'{D}/{f}'))
P = json.load(open(PJ))
SEASONS = {2024: ('1098388508928032768', 17), 2025: ('1180453968974659584', 17), 2026: ('1336088004720099328', 10)}
ME = '1132449068699025408'
REPL = {'QB': 24, 'RB': 30, 'WR': 42, 'TE': 14}
STARTER = {'QB': 24, 'RB': 24, 'WR': 36, 'TE': 12}

league = {y: J(f'league_{L}.json') for y, (L, _) in SEASONS.items()}
users = {y: {u['user_id']: u for u in J(f'{L}/users.json')} for y, (L, _) in SEASONS.items()}
rosters = {y: {r['roster_id']: r for r in J(f'{L}/rosters.json')} for y, (L, _) in SEASONS.items()}
def owner(rid, y=2026):
    u = users[y].get(rosters[y][rid]['owner_id'], {})
    return u.get('display_name') or '?'

# season points for every player, in each season's own scoring
season_pts, games = {}, {}
for y, (L, last) in SEASONS.items():
    sc = league[y]['scoring_settings']
    tot, g = collections.Counter(), collections.Counter()
    for w in range(1, last + 1):
        for pid, s in json.load(open(f'{D}/stats/{y}_{w}.json')).items():
            v = sum(val * s.get(k, 0) for k, val in sc.items())
            tot[pid] += v
            if s.get('gms_active'): g[pid] += 1
    season_pts[y], games[y] = tot, g

def position(pid, meta=None):
    return (meta or {}).get('position') or (P.get(pid) or {}).get('position')

# replacement level per season and position
repl, starter_cut = {}, {}
for y in SEASONS:
    byp = collections.defaultdict(list)
    for pid, v in season_pts[y].items():
        p = position(pid)
        if p in REPL: byp[p].append(v)
    for p in REPL:
        vals = sorted(byp[p], reverse=True)
        repl[(y, p)] = vals[REPL[p] - 1]
        starter_cut[(y, p)] = vals[STARTER[p] - 1]

startup = next(d for d in (json.load(open(f'{D}/draft_{x}.json')) for x in ['1098388509481684992']))
picks = json.load(open(f'{D}/picks_1098388509481684992.json'))
rows = []
for p in picks:
    pid, pos = p['player_id'], position(p['player_id'], p.get('metadata'))
    par = {y: round(max(0.0, season_pts[y][pid] - repl[(y, pos)]), 1) if pos in REPL else 0.0 for y in SEASONS}
    hit = {y: pos in REPL and season_pts[y][pid] >= starter_cut[(y, pos)] for y in SEASONS}
    rows.append(dict(pick=p['pick_no'], rd=p['round'], rid=p['roster_id'], owner=owner(p['roster_id']),
        pid=pid, name=(P.get(pid) or {}).get('full_name') or f"{(p.get('metadata') or {}).get('first_name','')} {(p.get('metadata') or {}).get('last_name','')}".strip(),
        pos=pos, nfl=(p.get('metadata') or {}).get('team'),
        pts={y: round(season_pts[y][pid], 1) for y in SEASONS}, par=par, par_total=round(sum(par.values()), 1),
        starter_seasons=sum(hit.values()), hit=hit))
rows.sort(key=lambda r: r['pick'])
# expected value at each slot: mean PAR of picks within +-10 slots
for i, r in enumerate(rows):
    win = rows[max(0, i - 10): i + 11]
    r['exp'] = round(st.mean(x['par_total'] for x in win), 1)
    r['voe'] = round(r['par_total'] - r['exp'], 1)

# where each startup player is now
now_roster = {pid: rid for rid, r in rosters[2026].items() for pid in (r['players'] or [])}
for r in rows: r['now_rid'] = now_roster.get(r['pid'])

# trades per team per season
trades = collections.Counter(); trade_list = []
for y, (L, _) in SEASONS.items():
    for w in range(1, 19):
        try: tx = J(f'{L}/tx_{w}.json')
        except Exception: continue
        for t in tx:
            if t['type'] == 'trade' and t['status'] == 'complete':
                for rid in t['roster_ids']: trades[rid] += 1
                trade_list.append(dict(y=y, w=w, rids=t['roster_ids'], adds=t.get('adds') or {}, picks=t.get('draft_picks') or []))

# results: records, points, playoffs, titles
def bracket_teams(y):
    L = SEASONS[y][0]; wb = J(f'{L}/winners_bracket.json')
    teams = {m.get('t1') for m in wb} | {m.get('t2') for m in wb}
    champ = next((m.get('w') for m in wb if m.get('p') == 1), None)
    runner = next((m.get('l') for m in wb if m.get('p') == 1), None)
    return {t for t in teams if isinstance(t, int)}, champ, runner

teams = []
for rid in sorted(rosters[2026]):
    mine = [r for r in rows if r['rid'] == rid]
    rec = {}
    for y in SEASONS:
        s = rosters[y][rid]['settings']
        rec[y] = dict(w=s.get('wins', 0), l=s.get('losses', 0), pf=s.get('fpts', 0) + s.get('fpts_decimal', 0) / 100)
    po, titles, finals = [], [], []
    for y in (2024, 2025):
        b, c, ru = bracket_teams(y)
        if rid in b: po.append(y)
        if rid == c: titles.append(y)
        if rid == ru: finals.append(y)
    early = [r for r in mine if r['rd'] <= 5]
    top = sorted(mine, key=lambda r: -r['voe'])
    still = [r for r in mine if r['now_rid'] == rid]
    teams.append(dict(rid=rid, owner=owner(rid), me=rosters[2026][rid]['owner_id'] == ME,
        first_pick=min(r['pick'] for r in mine),
        par_total=round(sum(r['par_total'] for r in mine), 1), voe_total=round(sum(r['voe'] for r in mine), 1),
        par_by_year={y: round(sum(r['par'][y] for r in mine), 1) for y in SEASONS},
        voe_r1_5=round(sum(r['voe'] for r in early), 1), voe_r6_plus=round(sum(r['voe'] for r in mine if r['rd'] > 5), 1),
        hits=sum(1 for r in mine if r['starter_seasons'] > 0), hits_r1_10=sum(1 for r in mine if r['rd'] <= 10 and r['starter_seasons'] > 0),
        busts_r1_5=[r['name'] for r in early if r['par_total'] == 0],
        pos_mix=dict(collections.Counter(r['pos'] for r in mine if r['rd'] <= 10)),
        best=[dict(name=r['name'], pos=r['pos'], pick=r['pick'], rd=r['rd'], par=r['par_total'], voe=r['voe']) for r in top[:3]],
        worst=[dict(name=r['name'], pos=r['pos'], pick=r['pick'], rd=r['rd'], par=r['par_total'], voe=r['voe']) for r in sorted(early, key=lambda r: r['voe'])[:2]],
        first3=[dict(name=r['name'], pos=r['pos'], pick=r['pick'], par=r['par_total']) for r in mine[:3]],
        still_n=len(still), still_par26=round(sum(r['par'][2026] for r in still), 1),
        rec=rec, playoffs=po, titles=titles, finals=finals, trades=trades[rid]))
out = dict(rows=rows, teams=teams, repl={f'{y}-{p}': round(v, 1) for (y, p), v in repl.items()}, n_trades=len(trade_list))
json.dump(out, open(OUT, 'w'))
print('replacement', out['repl'])
print('trades total', len(trade_list))
for t in sorted(teams, key=lambda t: -t['voe_total']):
    r = t['rec']
    print(f"{t['owner'][:14]:14} {'ME' if t['me'] else '  '} 1st pick {t['first_pick']:>2} | PAR {t['par_total']:7.1f} VOE {t['voe_total']:7.1f} (r1-5 {t['voe_r1_5']:6.1f}, r6+ {t['voe_r6_plus']:6.1f}) | by yr {t['par_by_year']} | hits {t['hits']} (r1-10 {t['hits_r1_10']}) busts r1-5 {t['busts_r1_5']} | still {t['still_n']} par26 {t['still_par26']} | "
          f"{r[2024]['w']}-{r[2024]['l']} {r[2025]['w']}-{r[2025]['l']} {r[2026]['w']}-{r[2026]['l']} po {t['playoffs']} titles {t['titles']} finals {t['finals']} trades {t['trades']}")
    print('     best', [(b['name'], b['rd'], b['par'], b['voe']) for b in t['best']], '| worst', [(b['name'], b['rd'], b['par'], b['voe']) for b in t['worst']], '| first3', [(b['name'], b['pos'], b['pick']) for b in t['first3']], t['pos_mix'])
