"""760 Dynasty waiver review: every waiver claim and free-agent add, what it produced, and what drops cost.
Usage: python3 -I waivers760.py <dyn_dir> <players_json> <out_json>

Add value  = starter points above replacement for the adding team: each week the
             player is in that team's starters, max(0, points - that week's Nth-best
             score at his position among players who played; N = QB 24, RB 30, WR 42,
             TE 14), from the add until he leaves the roster, across seasons.
Drop cost  = the same measure for whichever team later started the dropped player,
             from the week after the drop through 2026 week 10.
"""
import json, sys, collections
D, PJ, OUT = sys.argv[1:4]
J = lambda f: json.load(open(f'{D}/{f}'))
P = json.load(open(PJ))
SEASONS = [(2024, '1098388508928032768', 17), (2025, '1180453968974659584', 17), (2026, '1336088004720099328', 10)]
REPL = {'QB': 24, 'RB': 30, 'WR': 42, 'TE': 14}
pos_of = lambda pid: (P.get(pid) or {}).get('position')
name_of = lambda pid: (P.get(pid) or {}).get('full_name') or pid
users = {u['user_id']: u for u in J('1336088004720099328/users.json')}
rost26 = {r['roster_id']: r for r in J('1336088004720099328/rosters.json')}
owner = {rid: users.get(r['owner_id'], {}).get('display_name', '?') for rid, r in rost26.items()}

TL, mu, wpar = [], {}, {}
for y, L, last in SEASONS:
    sc = J(f'league_{L}.json')['scoring_settings']
    for w in range(1, last + 1):
        TL.append((y, w))
        mu[(y, w)] = {m['roster_id']: m for m in J(f'{L}/mu_{w}.json')}
        st = J(f'stats/{y}_{w}.json')
        pts = {pid: sum(v * s.get(k, 0) for k, v in sc.items()) for pid, s in st.items()}
        played = {pid for pid, s in st.items() if (s.get('gp') or 0) > 0 or (s.get('off_snp') or 0) > 0}
        rep = {}
        for p, n in REPL.items():
            vals = sorted((pts[pid] for pid in played if pos_of(pid) == p), reverse=True)
            rep[p] = vals[n - 1] if len(vals) >= n else 0.0
        wpar[(y, w)] = {pid: max(0.0, pts[pid] - rep[pos_of(pid)]) for pid in pts if pos_of(pid) in REPL}
idx = {k: i for i, k in enumerate(TL)}

def add_value(pid, rid, start):
    tot, starts, weeks = 0.0, 0, 0
    for k in TL[start:]:
        m = mu[k].get(rid)
        if not m or pid not in (m['players'] or []):
            if weeks: break
            if idx[k] - start > 1: break   # never showed up on the roster
            continue
        weeks += 1
        if pid in (m['starters'] or []):
            tot += wpar[k].get(pid, 0.0); starts += 1
    return round(tot, 1), starts, weeks

def drop_cost(pid, start):
    tot, starts, by = 0.0, 0, collections.Counter()
    for k in TL[start:]:
        for rid, m in mu[k].items():
            if pid in (m['starters'] or []):
                v = wpar[k].get(pid, 0.0); tot += v; starts += 1; by[rid] += v
    top = by.most_common(1)[0][0] if by else None
    return round(tot, 1), starts, (owner[top] if top else None)

moves = []
for y, L, last in SEASONS:
    for w in range(1, 19):
        for t in J(f'{L}/tx_{w}.json'):
            if t['type'] not in ('waiver', 'free_agent') or t['status'] != 'complete': continue
            rid = (t['roster_ids'] or [None])[0]
            wk = min(max(w, 1), last)
            start = idx[(y, wk)]
            adds = [p for p in (t.get('adds') or {}) if pos_of(p) in REPL]
            drops = [p for p in (t.get('drops') or {}) if pos_of(p) in REPL]
            bid = (t.get('settings') or {}).get('waiver_bid', 0) if t['type'] == 'waiver' else 0
            if not adds and not drops: continue
            av = [dict(pid=p, name=name_of(p), pos=pos_of(p), **dict(zip(('value', 'starts', 'weeks'), add_value(p, rid, start)))) for p in adds]
            dv = []  # cost filled in after all moves are known
            for p in drops:
                c, s, by = 0.0, 0, None
                dv.append(dict(pid=p, name=name_of(p), pos=pos_of(p), cost=c, starts=s, by=by))
            moves.append(dict(season=y, week=w, kind='claim' if t['type'] == 'waiver' else 'fa', rid=rid, owner=owner[rid], bid=bid,
                              adds=av, drops=dv, created=t['created']))
moves.sort(key=lambda m: m['created'])
# A drop costs what the NEXT team to add that player got from him (its add value).
# If the dropping team itself re-added him first, the drop cost nothing. Each point is charged once.
adds_by_pid = collections.defaultdict(list)
for m in moves:
    for a in m['adds']: adds_by_pid[a['pid']].append((m['created'], m['rid'], a['value'], a['starts']))
for m in moves:
    for d in m['drops']:
        nxt = next(((rid, v, s) for c, rid, v, s in adds_by_pid[d['pid']] if c > m['created']), None)
        if nxt and nxt[0] != m['rid']:
            d['cost'], d['starts'], d['by'] = nxt[1], nxt[2], owner[nxt[0]]
        else:
            d['cost'], d['starts'], d['by'] = 0.0, 0, (owner[nxt[0]] if nxt else None)
        d['readded_self'] = bool(nxt and nxt[0] == m['rid'])

teams = []
for rid in sorted(owner):
    mine = [m for m in moves if m['rid'] == rid]
    adds = [(m, a) for m in mine for a in m['adds']]
    drops = [(m, d) for m in mine for d in m['drops']]
    val = sum(a['value'] for _, a in adds); cost = sum(d['cost'] for _, d in drops)
    spent = sum(m['bid'] for m in mine)
    paid = [(m, a) for m, a in adds if m['bid'] > 0]
    by_season = {y: round(sum(a['value'] for m, a in adds if m['season'] == y), 1) for y, _, _ in SEASONS}
    best = max(adds, key=lambda x: x[1]['value'], default=None)
    worst = max(drops, key=lambda x: x[1]['cost'], default=None)
    teams.append(dict(rid=rid, owner=owner[rid], me=False, moves=len(mine), adds=len(adds), claims=sum(1 for m in mine if m['kind'] == 'claim'),
        fa=sum(1 for m in mine if m['kind'] == 'fa'), value=round(val, 1), drop_cost=round(cost, 1), net=round(val - cost, 1),
        hits=sum(1 for _, a in adds if a['value'] >= 10), never_started=sum(1 for _, a in adds if a['starts'] == 0),
        spent=spent, paid_value=round(sum(a['value'] for _, a in paid), 1),
        per_dollar=round(sum(a['value'] for _, a in paid) / spent, 2) if spent else None,
        by_season=by_season,
        best=dict(name=best[1]['name'], pos=best[1]['pos'], value=best[1]['value'], starts=best[1]['starts'], season=best[0]['season'], week=best[0]['week'], bid=best[0]['bid'], kind=best[0]['kind']) if best else None,
        worst_drop=dict(name=worst[1]['name'], pos=worst[1]['pos'], cost=worst[1]['cost'], by=worst[1]['by'], season=worst[0]['season'], week=worst[0]['week']) if worst else None))

flat_adds = [dict(season=m['season'], week=m['week'], kind=m['kind'], owner=m['owner'], rid=m['rid'], bid=m['bid'],
                  dropped=', '.join(d['name'] for d in m['drops']), **a) for m in moves for a in m['adds']]
flat_drops = [dict(season=m['season'], week=m['week'], owner=m['owner'], rid=m['rid'], added=', '.join(a['name'] for a in m['adds']), **d) for m in moves for d in m['drops']]
pos = {}
for p in REPL:
    e = [a for a in flat_adds if a['pos'] == p]
    pos[p] = dict(n=len(e), value=round(sum(a['value'] for a in e), 1), hits=sum(1 for a in e if a['value'] >= 10),
                  top=sorted(e, key=lambda a: -a['value'])[0]['name'] if e else None)
season_sum = {y: dict(moves=sum(1 for m in moves if m['season'] == y), value=round(sum(a['value'] for a in flat_adds if a['season'] == y), 1),
                      spent=sum(m['bid'] for m in moves if m['season'] == y)) for y, _, _ in SEASONS}
out = dict(teams=teams, top_adds=sorted(flat_adds, key=lambda a: -a['value'])[:20], top_drops=sorted(flat_drops, key=lambda d: -d['cost'])[:15],
           top_paid=sorted([a for a in flat_adds if a['bid'] > 0], key=lambda a: -a['bid'])[:15], pos=pos, seasons=season_sum,
           n_adds=len(flat_adds), n_drops=len(flat_drops), n_moves=len(moves),
           hit_rate=round(sum(1 for a in flat_adds if a['value'] >= 10) / len(flat_adds), 3),
           never=sum(1 for a in flat_adds if a['starts'] == 0))
json.dump(out, open(OUT, 'w'), separators=(',', ':'))

print('moves', len(moves), 'adds', len(flat_adds), 'drops', len(flat_drops), 'hit rate (>=10 starter PAR)', out['hit_rate'], 'never started', out['never'])
print('seasons', season_sum)
print('pos', pos)
for t in sorted(teams, key=lambda t: -t['net']):
    b, wd = t['best'], t['worst_drop']
    print(f"{t['owner'][:14]:14} moves {t['moves']:3} adds {t['adds']:3} value {t['value']:6.1f} drop cost {t['drop_cost']:6.1f} net {t['net']:6.1f} hits {t['hits']:2} never {t['never_started']:2} | FAAB ${t['spent']} -> {t['paid_value']} ({t['per_dollar']}/$) | by {t['by_season']}")
    print(f"      best: {b['name'] if b else '-'} {b['value'] if b else ''} ({b['season'] if b else ''} wk{b['week'] if b else ''} ${b['bid'] if b else ''}) | worst drop: {wd['name'] if wd else '-'} {wd['cost'] if wd else ''} -> {wd['by'] if wd else ''} ({wd['season'] if wd else ''} wk{wd['week'] if wd else ''})")
print('\nTOP ADDS'); [print('  ', a['season'], a['week'], a['owner'], a['name'], a['pos'], a['value'], 'starts', a['starts'], '$', a['bid'], a['kind'], '| dropped', a['dropped']) for a in out['top_adds'][:12]]
print('TOP DROPS'); [print('  ', d['season'], d['week'], d['owner'], d['name'], d['pos'], d['cost'], 'starts', d['starts'], 'by', d['by'], '| for', d['added']) for d in out['top_drops'][:10]]
print('TOP PAID'); [print('  ', a['season'], a['week'], a['owner'], a['name'], '$', a['bid'], a['value'], a['starts']) for a in out['top_paid'][:10]]
