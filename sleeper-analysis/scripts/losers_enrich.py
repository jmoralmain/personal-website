"""Adds chop-week detail, worst lineup swap and the manager grade to losers.json."""
import json
J = lambda f: json.load(open('raw/' + f))
P = J('players.json')
pos = lambda pid: (P.get(pid) or {}).get('position')
pname = lambda pid: (P.get(pid) or {}).get('full_name') or pid
users = {u['user_id']: u for u in J('users.json')}
rosters = {r['roster_id']: r for r in J('rosters.json')}
def team(rid):
    u = users.get(rosters[rid]['owner_id'], {})
    return (u.get('metadata') or {}).get('team_name') or u.get('display_name')
rows = json.load(open('losers.json')); drops = json.load(open('drops.json'))
SLOTS = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'FLEX']
def optimal(m):
    pp = m['players_points'] or {}; used = []
    for slot in SLOTS:
        ok = [p for p in m['players'] if p not in used and (pos(p) == slot or (slot == 'FLEX' and pos(p) in ('RB', 'WR', 'TE')))]
        if ok: used.append(max(ok, key=lambda p: pp.get(p, 0)))
    return used
chopped = [r for r in rows if r['chopped']]
for r in chopped:
    w = r['week']; ms = {m['roster_id']: m for m in J(f'mu_{w}.json') if m['players']}
    m = ms[r['rid']]; pp = m['players_points']
    others = sorted(((x['points'], rid) for rid, x in ms.items() if rid != r['rid']))
    r['lost_to'] = team(others[0][1]); r['lost_by'] = round(others[0][0] - m['points'], 2)
    opt = optimal(m); st = [s for s in m['starters'] if s not in ('0', None, '')]
    should_start = sorted([p for p in opt if p not in st], key=lambda p: -pp.get(p, 0))
    should_sit = sorted([p for p in st if p not in opt], key=lambda p: pp.get(p, 0))
    r['benched'] = [dict(name=pname(p), pos=pos(p), pts=round(pp.get(p, 0), 1)) for p in should_start][:2]
    r['started'] = [dict(name=pname(p), pos=pos(p), pts=round(pp.get(p, 0), 1)) for p in should_sit][:2]
    r['bench_in_chop'] = round(r['chop_opt'] - r['chop_act'], 1)
    r['avoid_margin'] = round(r['chop_opt'] - r['chop_next'], 1)
    d = drops[str(r['rid'])]
    r['worst_drop'] = d['drops'][0] if d['drops'] else None
    r['failed_bid_max'] = max(d['failed_bids'] or [0])
# grade: rank each chopped team 1 (worst) .. 10 (best) on three decisions they fully control
def rank(key, worst_high):
    order = sorted(chopped, key=lambda r: -r[key] if worst_high else r[key])
    for i, r in enumerate(order): r.setdefault('ranks', {})[key] = i + 1
rank('efficiency', worst_high=False)      # lowest lineup efficiency is worst
rank('avoid_margin', worst_high=True)     # most avoidable chop is worst
rank('draft_val', worst_high=False)       # least productive draft is worst
for r in chopped:
    r['grade_sum'] = sum(r['ranks'].values())
for i, r in enumerate(sorted(chopped, key=lambda r: (r['grade_sum'], r['ranks']['efficiency']))):
    r['worst_rank'] = i + 1
json.dump(rows, open('losers.json', 'w'), indent=1)
for r in sorted(chopped, key=lambda r: r['worst_rank']):
    print(r['worst_rank'], r['team'], r['grade_sum'], r['ranks'], '| lost to', r['lost_to'], 'by', r['lost_by'], '| bench', r['bench_in_chop'], 'avoid', r['avoid_margin'], '| benched', r['benched'], 'started', r['started'], '| drop', r['worst_drop'])
