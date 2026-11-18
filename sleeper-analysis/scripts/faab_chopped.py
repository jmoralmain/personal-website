"""FAAB review of the chopped teams.
Usage: python3 -I faab_chopped.py <raw_dir> <out_json>
"""
import json, sys, collections
RAW, OUT = sys.argv[1], sys.argv[2]
J = lambda f: json.load(open(f'{RAW}/{f}'))
P = J('players.json')
pname = lambda pid: (P.get(pid) or {}).get('full_name') or pid
ppos = lambda pid: (P.get(pid) or {}).get('position') or '?'
users = {u['user_id']: u for u in J('users.json')}
rosters = {r['roster_id']: r for r in J('rosters.json')}
def team(rid):
    u = users.get(rosters[rid]['owner_id'], {})
    return (u.get('metadata') or {}).get('team_name') or u.get('display_name')
tx = {w: J(f'tx_{w}.json') for w in range(1, 12)}
mu = {w: {m['roster_id']: m for m in J(f'mu_{w}.json') if m['players']} for w in range(1, 11)}
chop = {t['roster_ids'][0]: w for w in range(1, 11) for t in tx[w] if t['type'] == 'chopped'}

# every completed claim in the league, to see where a chopped team's buys went next
claims_all = [(w, t) for w in range(1, 12) for t in tx[w] if t['type'] == 'waiver' and t['status'] == 'complete' and t['adds']]
fails_all = [(w, t) for w in range(1, 12) for t in tx[w] if t['type'] == 'waiver' and t['status'] == 'failed' and t['adds']]

out = []
for rid, cw in sorted(chop.items(), key=lambda kv: kv[1]):
    mine = [(w, t) for w, t in claims_all if t['roster_ids'][0] == rid and w <= cw]
    buys = []
    for i, (w, t) in enumerate(mine):
        pid = next(iter(t['adds'])); bid = (t['settings'] or {}).get('waiver_bid', 0)
        later = [x for x, y in mine[i + 1:] if next(iter(y['adds'])) == pid]
        end = (later[0] - 1) if later else cw
        wk = [x for x in range(w, end + 1) if x in mu and rid in mu[x] and pid in (mu[x][rid]['players'] or [])]
        st = [x for x in wk if pid in (mu[x][rid]['starters'] or [])]
        pts = round(sum((mu[x][rid]['players_points'] or {}).get(pid, 0) for x in st), 1)
        rivals = [(y['settings'] or {}).get('waiver_bid', 0) for x, y in fails_all
                  if x == w and next(iter(y['adds'])) == pid and y['roster_ids'][0] != rid and 'claimed by another' in ((y['metadata'] or {}).get('notes') or '')]
        nxt = next(((team(y['roster_ids'][0]), (y['settings'] or {}).get('waiver_bid', 0), x) for x, y in claims_all
                    if x >= cw and next(iter(y['adds'])) == pid and y['roster_ids'][0] != rid), None)
        buys.append(dict(w=w, name=pname(pid), pos=ppos(pid), bid=bid, weeks=len(wk), starts=len(st), pts=pts,
                         runner_up=max(rivals) if rivals else None, next_owner=nxt))
    fails = [(w, t) for w, t in fails_all if t['roster_ids'][0] == rid and w <= cw]
    outbid = [t for w, t in fails if 'claimed by another' in ((t['metadata'] or {}).get('notes') or '')]
    full = [t for w, t in fails if 'too many' in ((t['metadata'] or {}).get('notes') or '')]
    other = [t for w, t in fails if t not in outbid and t not in full]
    paid = [b for b in buys if b['bid'] > 0]
    spent = sum(b['bid'] for b in buys)
    paid_pts = sum(b['pts'] for b in paid)
    over = sum(b['bid'] - b['runner_up'] for b in paid if b['runner_up'] is not None)
    unc = sum(b['bid'] for b in paid if b['runner_up'] is None)
    by_wk = collections.Counter()
    for b in buys: by_wk[b['w']] += b['bid']
    top = max(paid, key=lambda b: b['bid']) if paid else None
    out.append(dict(rid=rid, team=team(rid), week=cw, spent=spent, left=1000 - spent, runs=cw,
        n_claims=len(buys), n_paid=len(paid), paid_pts=round(paid_pts, 1),
        per_pt=round(spent / paid_pts, 2) if paid_pts else None,
        overpay=over, uncontested=unc, top_share=round(top['bid'] / 1000, 3) if top else 0,
        n_failed=len(fails), n_outbid=len(outbid), n_full=len(full), n_other=len(other),
        failed_total=sum((t['settings'] or {}).get('waiver_bid', 0) for w, t in fails),
        failed_max=max([(t['settings'] or {}).get('waiver_bid', 0) for w, t in fails] or [0]),
        failed_top=sorted(([pname(next(iter(t['adds']))), (t['settings'] or {}).get('waiver_bid', 0), w] for w, t in fails), key=lambda x: -x[1])[:3],
        by_week={w: by_wk.get(w, 0) for w in range(1, cw + 1)},
        buys=sorted(buys, key=lambda b: -b['bid'])))
json.dump(out, open(OUT, 'w'), indent=1)
for r in out:
    print(f"\n== wk{r['week']} {r['team']}: spent {r['spent']} left {r['left']} | paid claims {r['n_paid']} -> {r['paid_pts']} started pts, ${r['per_pt']}/pt | over {r['overpay']} unc {r['uncontested']} | top share {r['top_share']} | failed {r['n_failed']} (outbid {r['n_outbid']}, full {r['n_full']}, other {r['n_other']}) total ${r['failed_total']} max ${r['failed_max']} {r['failed_top']}")
    print('   by week', r['by_week'])
    for b in r['buys'][:5]:
        print('   ', b)
