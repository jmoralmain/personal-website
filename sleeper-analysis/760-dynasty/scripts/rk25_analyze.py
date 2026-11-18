"""2025 rookie draft review of The 760 Dynasty.
Usage: python3 -I rk25_analyze.py <dyn_dir> <players_json> <out_json>

Value = points above replacement (PAR) per season, floored at 0, league scoring.
2025 = weeks 1-17, 2026 = weeks 1-10. Replacement = Nth player at the position
by season points: QB 24, RB 30, WR 42, TE 14 (same as the startup page).
Value over slot = PAR minus the mean PAR of picks within +-3 of it (7-pick window,
truncated at the ends of the draft).
"""
import json, sys, collections, statistics as st

D, PJ, OUT = sys.argv[1:4]
J = lambda f: json.load(open(f'{D}/{f}'))
P = json.load(open(PJ))
SEASONS = {2025: ('1180453968974659584', 17), 2026: ('1336088004720099328', 10)}
L24 = '1098388508928032768'
ME_RID = 12
REPL = {'QB': 24, 'RB': 30, 'WR': 42, 'TE': 14}
STARTER = {'QB': 24, 'RB': 24, 'WR': 36, 'TE': 12}

DRAFT = '1180453968974659585'

league = {y: J(f'league_{L}.json') for y, (L, _) in SEASONS.items()}
users = {u['user_id']: u['display_name'] for u in J(f'{SEASONS[2026][0]}/users.json')}
rosters = {y: {r['roster_id']: r for r in J(f'{L}/rosters.json')} for y, (L, _) in SEASONS.items()}
rosters[2024] = {r['roster_id']: r for r in J(f'{L24}/rosters.json')}
owner = {rid: users.get(r['owner_id'], '?') for rid, r in rosters[2026].items()}

def pos_of(pid): return (P.get(pid) or {}).get('position')

season_pts, games = {}, {}
for y, (L, last) in SEASONS.items():
    sc = league[y]['scoring_settings']
    tot, g = collections.Counter(), collections.Counter()
    for w in range(1, last + 1):
        for pid, s in J(f'stats/{y}_{w}.json').items():
            tot[pid] += sum(v * s.get(k, 0) for k, v in sc.items())
            if s.get('gp'): g[pid] += 1  # gms_active is also set for inactive/IR weeks
    season_pts[y], games[y] = tot, g

repl, cut, rank = {}, {}, {}
for y in SEASONS:
    byp = collections.defaultdict(list)
    for pid, v in season_pts[y].items():
        p = pos_of(pid)
        if p in REPL: byp[p].append((v, pid))
    for p in REPL:
        vals = sorted(byp[p], reverse=True)
        repl[(y, p)] = vals[REPL[p] - 1][0]
        cut[(y, p)] = vals[STARTER[p] - 1][0]
        for i, (_, pid) in enumerate(vals): rank[(y, pid)] = i + 1

# starts: weeks 1-17 of 2025, 1-10 of 2026
starts_by = collections.defaultdict(collections.Counter)  # pid -> rid -> starts
weeks_on = collections.defaultdict(collections.Counter)   # pid -> rid -> weeks rostered
for y, (L, last) in SEASONS.items():
    for w in range(1, last + 1):
        for m in J(f'{L}/mu_{w}.json'):
            for pid in (m.get('starters') or []): starts_by[pid][m['roster_id']] += 1
            for pid in (m.get('players') or []): weeks_on[pid][m['roster_id']] += 1
TOTAL_WEEKS = sum(l for _, l in SEASONS.values())

draft = J(f'draft_{DRAFT}.json')
slot_to_rid = {int(k): v for k, v in draft['slot_to_roster_id'].items()}
picks = J(f'picks_{DRAFT}.json')
now_roster = {pid: rid for rid, r in rosters[2026].items() for pid in (r['players'] or [])}

rows = []
for p in picks:
    pid = p['player_id']; m = p.get('metadata') or {}
    pos = m.get('position') or pos_of(pid)
    par = {y: round(max(0.0, season_pts[y][pid] - repl[(y, pos)]), 1) for y in SEASONS}
    hit = {y: season_pts[y][pid] >= cut[(y, pos)] for y in SEASONS}
    orig = slot_to_rid[p['draft_slot']]
    rid = p['roster_id']
    rows.append(dict(pick=p['pick_no'], rd=p['round'], slot=p['draft_slot'], rid=rid, owner=owner[rid],
        orig=orig, orig_owner=owner[orig], traded=orig != rid,
        pid=pid, name=(P.get(pid) or {}).get('full_name') or f"{m.get('first_name','')} {m.get('last_name','')}".strip(),
        pos=pos, nfl=m.get('team'), nfl_now=(P.get(pid) or {}).get('team'),
        pts={y: round(season_pts[y][pid], 1) for y in SEASONS}, gp={y: games[y][pid] for y in SEASONS},
        rank={y: 1 + sum(1 for q, v in season_pts[y].items() if q != pid and pos_of(q) == pos and v > season_pts[y][pid]) for y in SEASONS},
        par=par, par_total=round(sum(par.values()), 1), hit=hit, hits=sum(hit.values()),
        starts_team=starts_by[pid][rid], starts_any=sum(starts_by[pid].values()),
        weeks_team=weeks_on[pid][rid],
        now_rid=now_roster.get(pid), now_owner=owner.get(now_roster.get(pid)) if now_roster.get(pid) else None))
rows.sort(key=lambda r: r['pick'])
# expected PAR at each pick: least-squares fit PAR = a + b*ln(pick) over all 36 picks, floored at 0
import math
xs = [math.log(r['pick']) for r in rows]; ys = [r['par_total'] for r in rows]
mx, my = st.mean(xs), st.mean(ys)
FIT_B = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sum((x - mx) ** 2 for x in xs)
FIT_A = my - FIT_B * mx
print('fit a', round(FIT_A, 2), 'b', round(FIT_B, 2))
for r in rows:
    r['exp'] = round(max(0.0, FIT_A + FIT_B * math.log(r['pick'])), 1)
    r['vos'] = round(r['par_total'] - r['exp'], 1)

# trades that moved 2025 picks
pick_trades = []
for y, L in ((2024, L24), (2025, SEASONS[2025][0])):
    for w in range(1, 19):
        try: tx = J(f'{L}/tx_{w}.json')
        except Exception: continue
        for t in tx:
            if t['type'] != 'trade' or t['status'] != 'complete': continue
            dp = t.get('draft_picks') or []
            if not any(str(d['season']) == '2025' for d in dp): continue
            sides = {}
            for rid in t['roster_ids']:
                sides[owner[rid]] = dict(
                    players=[(P.get(pid) or {}).get('full_name', pid) + f" ({pos_of(pid)})" for pid, to in (t.get('adds') or {}).items() if to == rid],
                    picks=[f"{d['season']} R{d['round']} ({owner[d['roster_id']]})" for d in dp if d['owner_id'] == rid])
            moved = [next(r['pick'] for r in rows if r['rd'] == d['round'] and r['orig'] == d['roster_id'])
                     for d in dp if str(d['season']) == '2025']
            pick_trades.append(dict(ts=t['status_updated'], season=y, week=w, sides=sides, moved=moved))
pick_trades.sort(key=lambda t: t['ts'])

# what happened to drafted players who left the drafting team (trades after the draft)
drafted = {r['pid']: r for r in rows}
player_moves = []
for y, (L, _) in SEASONS.items():
    for w in range(1, 19):
        try: tx = J(f'{L}/tx_{w}.json')
        except Exception: continue
        for t in tx:
            if t['status'] != 'complete' or t['status_updated'] < draft['last_picked']: continue
            for pid, to in (t.get('adds') or {}).items():
                if pid in drafted:
                    frm = (t.get('drops') or {}).get(pid)
                    got = [(P.get(q) or {}).get('full_name', q) for q, tt in (t.get('adds') or {}).items() if tt == frm] if frm else []
                    gotp = [f"{d['season']} R{d['round']}" for d in (t.get('draft_picks') or []) if d['owner_id'] == frm] if frm else []
                    player_moves.append(dict(y=y, w=w, ts=t['status_updated'], type=t['type'], pid=pid, name=drafted[pid]['name'],
                                             frm=owner.get(frm), to=owner[to], got=got, got_picks=gotp))
            for pid, frm in (t.get('drops') or {}).items():
                if pid in drafted and pid not in (t.get('adds') or {}):
                    player_moves.append(dict(y=y, w=w, ts=t['status_updated'], type=t['type'] + ' drop', pid=pid, name=drafted[pid]['name'], frm=owner[frm], to=None, got=[], got_picks=[]))
player_moves.sort(key=lambda m: m['ts'])

teams = []
for rid in sorted(rosters[2026]):
    mine = [r for r in rows if r['rid'] == rid]
    own = [r for r in rows if r['orig'] == rid]
    rec = {y: dict(w=rosters[y][rid]['settings'].get('wins', 0), l=rosters[y][rid]['settings'].get('losses', 0),
                   pf=round(rosters[y][rid]['settings'].get('fpts', 0) + rosters[y][rid]['settings'].get('fpts_decimal', 0) / 100, 1)) for y in (2024, 2025, 2026)}
    teams.append(dict(rid=rid, owner=owner[rid], me=rid == ME_RID,
        slot=next(s for s, r in slot_to_rid.items() if r == rid),
        n=len(mine), n_own=len(own),
        picks=[r['pick'] for r in mine],
        par=round(sum(r['par_total'] for r in mine), 1), vos=round(sum(r['vos'] for r in mine), 1),
        par25=round(sum(r['par'][2025] for r in mine), 1), par26=round(sum(r['par'][2026] for r in mine), 1),
        hits=sum(1 for r in mine if r['hits'] > 0),
        starts=sum(r['starts_team'] for r in mine),
        still=sum(1 for r in mine if r['now_rid'] == rid),
        still_par26=round(sum(r['par'][2026] for r in mine if r['now_rid'] == rid), 1),
        rec=rec))

# positional trends
pos_stats = {}
for p in REPL:
    xs = [r for r in rows if r['pos'] == p]
    pos_stats[p] = dict(n=len(xs), r1=sum(1 for r in xs if r['rd'] == 1), vos=round(st.mean(r['vos'] for r in xs), 1) if xs else 0,
                        par=round(st.mean(r['par_total'] for r in xs), 1) if xs else 0,
                        hits=sum(1 for r in xs if r['hits']), zero=sum(1 for r in xs if r['par_total'] == 0))
by_round = {rd: dict(par=round(st.mean(r['par_total'] for r in rows if r['rd'] == rd), 1),
                     hits=sum(1 for r in rows if r['rd'] == rd and r['hits']),
                     zero=sum(1 for r in rows if r['rd'] == rd and r['par_total'] == 0)) for rd in (1, 2, 3)}

out = dict(fit=dict(a=round(FIT_A, 2), b=round(FIT_B, 2)), rows=rows, teams=teams, pick_trades=pick_trades, player_moves=player_moves, pos=pos_stats, by_round=by_round,
           repl={f'{y}-{p}': round(v, 1) for (y, p), v in repl.items()},
           cut={f'{y}-{p}': round(v, 1) for (y, p), v in cut.items()}, total_weeks=TOTAL_WEEKS)
json.dump(out, open(OUT, 'w'), indent=0)

print('repl', out['repl']); print('cut', out['cut'])
for r in rows:
    print(f"{r['pick']:>2} R{r['rd']} {r['owner'][:12]:12} {'(from '+r['orig_owner'][:10]+')' if r['traded'] else '':18} {r['name'][:20]:20} {r['pos']} "
          f"pts {r['pts'][2025]:6.1f}/{r['pts'][2026]:6.1f} gp {r['gp'][2025]:>2}/{r['gp'][2026]:>2} rk {r['rank'][2025]}/{r['rank'][2026]} "
          f"PAR {r['par'][2025]:5.1f}/{r['par'][2026]:5.1f}={r['par_total']:5.1f} exp {r['exp']:5.1f} vos {r['vos']:6.1f} hits {r['hits']} "
          f"st {r['starts_team']:>2}/{r['starts_any']:>2} wk {r['weeks_team']:>2} now {r['now_owner']}")
print()
for t in sorted(teams, key=lambda t: -t['vos']):
    r = t['rec']
    print(f"{t['owner'][:14]:14} slot {t['slot']:>2} n {t['n']} own {t['n_own']} picks {t['picks']} PAR {t['par']:6.1f} ({t['par25']}/{t['par26']}) VOS {t['vos']:6.1f} hits {t['hits']} starts {t['starts']} still {t['still']} ({t['still_par26']}) "
          f"{r[2024]['w']}-{r[2024]['l']} {r[2025]['w']}-{r[2025]['l']} {r[2026]['w']}-{r[2026]['l']}")
print(); print(pos_stats); print(by_round)
for t in pick_trades: print(t)
for m in player_moves: print(m['y'], m['w'], m['type'], m['name'], m['frm'], '->', m['to'], m['got'], m['got_picks'])
