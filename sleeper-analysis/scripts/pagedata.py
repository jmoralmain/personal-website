import csv, json, sys
D, F, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
R = lambda f: list(csv.DictReader(open(f'{D}/{f}')))
pk = R('pickups_alive_teams.csv'); fails = R('failed_waiver_bids.csv'); summ = {s['team']: s for s in R('team_waiver_summary.csv')}
fa = json.load(open(F))
ORDER = [('Love Hurts', 'mynameisuser'), ('TannerMenning', 'TannerMenning'), ('masonmay', 'masonmay'), ('KDEMPSTER15', 'KDEMPSTER15')]
teams = []
for t, owner in ORDER:
    s = summ[t]; f = fa[t]
    over = {(o['week'], o['player']): o['runner_up'] for o in f['over']}
    claims = []
    for p in pk:
        if p['team'] == t and p['kind'] == 'waiver_claim':
            w = int(p['week']); b = int(p['bid'])
            claims.append(dict(w=w, p=p['added'], pos=p['pos'], bid=b, ru=over.get((w, p['added'])) if b else None,
                               pts=float(p['started_points']), st=int(p['weeks_started']), pend=p['status'].startswith('pending'),
                               src=p['from_chopped_team']))
    myf = [x for x in fails if x['team'] == t]
    teams.append(dict(name=t, owner=owner, weekly=[f['weekly'][str(w)] for w in range(1, 11)],
        submitted=sum(f['submitted'][str(w)] for w in range(1, 11)), spent=int(s['faab_spent']), left=int(s['faab_remaining']),
        lostOutbid=sum('claimed by another' in x['reason'] for x in myf), lostFull=sum('too many' in x['reason'] for x in myf),
        pickupPts=float(s['pickup_started_points']), startPts=float(s['total_started_points']),
        byPos={k: int(v) for k, v in (kv.split(':') for kv in s['faab_by_pos'].split())}, claims=claims))
json.dump(dict(teams=teams, budget=1000, asOf='2026-11-18', scoredThrough=10), open(OUT, 'w'), separators=(',', ':'))
print(open(OUT).read()[:600]); import os; print(os.path.getsize(OUT))
