"""760 Dynasty future draft capital: every 2027-2029 rookie pick, who owns it, and what it's worth.
Usage: python3 -I picks760.py <dyn_dir> <rk25_json> <out_json>

Pick value = expected points above replacement over a rookie's first season and a half,
from the curve fitted to the 2025 rookie draft (PAR ~ a + b*ln(pick), floored at 0).
2027: projected slot from current 2026 standings (linear draft, reverse regular-season
standings: fewer wins first, then fewer points). 2028 and 2029: the average value of all
12 slots in that round, since the order is unknown.
"""
import json, sys, math, collections
D, RK25, OUT = sys.argv[1:4]
L = '1336088004720099328'
J = lambda f: json.load(open(f'{D}/{f}'))
users = {u['user_id']: u for u in J(f'{L}/users.json')}
rosters = {r['roster_id']: r for r in J(f'{L}/rosters.json')}
owner = {rid: users.get(r['owner_id'], {}).get('display_name', '?') for rid, r in rosters.items()}
rk = json.load(open(RK25))
curve = rk.get('curve') or {}
a = curve.get('a', 105.63); b = curve.get('b', -29.94)
ROUNDS = sorted({p['round'] for p in J(f'{L}/traded_picks.json')} | {1, 2, 3})
ROUNDS = [r for r in ROUNDS if r <= 3]
val_at = lambda pick: max(0.0, a + b * math.log(pick))
# projected 2027 order: worst record first, ties by fewer points
order = sorted(rosters, key=lambda rid: (rosters[rid]['settings'].get('wins', 0), rosters[rid]['settings'].get('fpts', 0) + rosters[rid]['settings'].get('fpts_decimal', 0) / 100))
slot27 = {rid: i + 1 for i, rid in enumerate(order)}
round_avg = {rd: sum(val_at((rd - 1) * 12 + s) for s in range(1, 13)) / 12 for rd in ROUNDS}

own = {(y, rd, rid): rid for y in ('2027', '2028', '2029') for rd in ROUNDS for rid in rosters}
path = collections.defaultdict(list)
for p in J(f'{L}/traded_picks.json'):
    if p['season'] in ('2027', '2028', '2029') and p['round'] in ROUNDS:
        own[(p['season'], p['round'], p['roster_id'])] = p['owner_id']
# trade history for each future pick (who moved it, when)
for y0, L0 in (('2024', '1098388508928032768'), ('2025', '1180453968974659584'), ('2026', L)):
    for w in range(1, 19):
        try: txs = J(f'{L0}/tx_{w}.json')
        except FileNotFoundError: continue
        for t in txs:
            if t['type'] != 'trade' or t['status'] != 'complete': continue
            for dp in t.get('draft_picks') or []:
                if dp['season'] in ('2027', '2028', '2029') and dp['round'] in ROUNDS:
                    path[(dp['season'], dp['round'], dp['roster_id'])].append(dict(frm=owner[dp['previous_owner_id']], to=owner[dp['owner_id']], season=y0, week=w, created=t['created']))
for k in path: path[k].sort(key=lambda x: x['created'])

picks = []
for (y, rd, orig), cur in sorted(own.items()):
    if y == '2027':
        pk = (rd - 1) * 12 + slot27[orig]; v = val_at(pk); proj = pk
    else:
        v = round_avg[rd]; proj = None
    picks.append(dict(season=y, round=rd, orig_rid=orig, orig=owner[orig], rid=cur, owner=owner[cur], value=round(v, 1), proj_pick=proj,
                      moved=[dict(frm=x['frm'], to=x['to'], season=x['season'], week=x['week']) for x in path.get((y, rd, orig), [])]))

teams = []
for rid in sorted(rosters):
    mine = [p for p in picks if p['rid'] == rid]
    gone = [p for p in picks if p['orig_rid'] == rid and p['rid'] != rid]
    got = [p for p in mine if p['orig_rid'] != rid]
    cnt = collections.Counter((p['season'], p['round']) for p in mine)
    s = rosters[rid]['settings']
    teams.append(dict(rid=rid, owner=owner[rid], me=False, n=len(mine), firsts=sum(1 for p in mine if p['round'] == 1),
        seconds=sum(1 for p in mine if p['round'] == 2), thirds=sum(1 for p in mine if p['round'] == 3),
        value=round(sum(p['value'] for p in mine), 1), own_value=round(sum(p['value'] for p in picks if p['orig_rid'] == rid), 1),
        acquired=len(got), traded_away=len(gone), by=dict(cnt and {f'{y}-{r}': c for (y, r), c in cnt.items()}),
        sources=collections.Counter(p['orig'] for p in got).most_common(), destinations=collections.Counter(p['owner'] for p in gone).most_common(),
        w=s.get('wins', 0), l=s.get('losses', 0), slot27=slot27[rid],
        top=sorted(mine, key=lambda p: -p['value'])[:3]))
for t in teams: t['vs_start'] = round(t['value'] - t['own_value'], 1)
out = dict(picks=picks, teams=teams, order27=[dict(slot=i + 1, rid=r, orig=owner[r], w=rosters[r]['settings'].get('wins', 0), l=rosters[r]['settings'].get('losses', 0),
          owner=owner[own[('2027', 1, r)]]) for i, r in enumerate(order)],
           curve=dict(a=round(a, 2), b=round(b, 2)), round_avg={str(k): round(v, 1) for k, v in round_avg.items()},
           start_value=round(sum(p['value'] for p in picks) / len(rosters), 1), rounds=ROUNDS)
json.dump(out, open(OUT, 'w'), separators=(',', ':'))
print('rounds', ROUNDS, 'curve', out['curve'], 'round avg', out['round_avg'], 'avg team value', out['start_value'])
print('2027 projected 1st-round order:', [(o['slot'], o['orig'], f"{o['w']}-{o['l']}", 'owned by ' + o['owner']) for o in out['order27']])
for t in sorted(teams, key=lambda t: -t['value']):
    print(f"{t['owner'][:14]:14} picks {t['n']:2} (1sts {t['firsts']} 2nds {t['seconds']} 3rds {t['thirds']}) value {t['value']:6.1f} own-start {t['own_value']:6.1f} vs {t['vs_start']:+6.1f} | got {t['acquired']} from {t['sources']} | gave {t['traded_away']} to {t['destinations']} | {t['w']}-{t['l']} slot27 {t['slot27']}")
