import csv, json, sys, statistics as st
RAW, D, OUT = sys.argv[1:4]
J = lambda f: json.load(open(f'{RAW}/{f}'))
SC = J('league.json')['scoring_settings']; P = J('players.json')
score = lambda s: round(sum(v * s.get(k, 0) for k, v in SC.items()), 2)
pos_of = lambda pid: (P.get(pid) or {}).get('position')
# weekly positional ranks among players who played
rank, pts, played = {}, {}, {}
for w in range(1, 11):
    S = J(f'stats_{w}.json'); byp = {}
    for pid, s in S.items():
        p = pos_of(pid)
        if p not in ('QB', 'RB', 'WR', 'TE') or not s.get('gms_active'): continue
        pts[(pid, w)] = score(s); played[(pid, w)] = True; byp.setdefault(p, []).append(pid)
    for p, ids in byp.items():
        for i, pid in enumerate(sorted(ids, key=lambda x: -pts[(x, w)])): rank[(pid, w)] = i + 1
pk = list(csv.DictReader(open(f'{D}/pickups_alive_teams.csv')))
rows = []
for r in pk:
    pid = None
    # find player id from transactions
    rows.append(r)
tx = {(t['roster_id'], t['week'], t['added']): t['added_id'] for t in csv.DictReader(open(f'{D}/transactions_all_teams.csv')) if t['added']}
def lineup(pid, wk, g, started):
    sg = [w for w in g if w in started]            # started and played
    bg = [w for w in g if w not in started]        # benched and played
    dead = [w for w in wk if w in started and w not in g]  # started, but no game
    return dict(sg=len(sg), bg=len(bg), dead=len(dead),
                ppgS=round(sum(pts[(pid, w)] for w in sg) / len(sg), 1) if sg else None,
                medS=st.median([rank[(pid, w)] for w in sg]) if sg else None,
                benchPts=round(sum(pts[(pid, w)] for w in bg), 1))
out = []
for r in pk:
    pid = tx[(r['roster_id'], r['week'], r['added'])]
    wk = [int(x) for x in r['weeks_list'].split()]
    g = [w for w in wk if played.get((pid, w))]
    ranks = [rank[(pid, w)] for w in g]
    started = set(int(x) for x in r['started_list'].split())
    out.append(dict(team=r['team'], kind='claim' if r['kind'] == 'waiver_claim' else 'fa', w=int(r['week']), p=r['added'], pos=r['pos'],
        bid=int(r['bid']), wr=len(wk), ws=len(started), games=len(g), stp=float(r['started_points']), rop=float(r['rostered_points']),
        ppg=round(sum(pts[(pid, w)] for w in g) / len(g), 1) if g else None,
        med=st.median(ranks) if ranks else None, best=min(ranks) if ranks else None,
        top=sum(1 for x in ranks if x <= (12 if r['pos'] in ('QB', 'TE') else 24)),
        wkly=[[w, pts.get((pid, w), 0), rank.get((pid, w)), w in started] for w in wk],
        pend=r['status'].startswith('pending'), now=r['still_on_roster'] == 'True',
        **lineup(pid, wk, g, started)))
json.dump(out, open(OUT, 'w'), separators=(',', ':'))
for o in sorted(out, key=lambda o: -o['bid'])[:60]:
    if o['kind'] == 'claim': print(o['team'][:10], o['p'][:20], o['pos'], o['bid'], 'g', o['games'], 'ppg', o['ppg'], 'med', o['med'], 'top', o['top'], 'stp', o['stp'])
print(len(out))
