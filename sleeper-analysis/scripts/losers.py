"""Review of every chopped team in the chopped league.
Usage: python3 -I losers.py <raw_dir> <out_json>
"""
import json, sys, collections, statistics as st

RAW, OUT = sys.argv[1], sys.argv[2]
J = lambda f: json.load(open(f'{RAW}/{f}'))
SC = J('league.json')['scoring_settings']; P = J('players.json')
users = {u['user_id']: u for u in J('users.json')}
rosters = {r['roster_id']: r for r in J('rosters.json')}
picks = J('draft_picks.json')
score = lambda s: sum(v * s.get(k, 0) for k, v in SC.items())
stats = {w: J(f'stats_{w}.json') for w in range(1, 11)}
mu = {w: {m['roster_id']: m for m in J(f'mu_{w}.json') if m['players']} for w in range(1, 11)}
tx = {w: J(f'tx_{w}.json') for w in range(1, 12)}
pos = lambda pid: (P.get(pid) or {}).get('position')
pname = lambda pid: (P.get(pid) or {}).get('full_name') or pid
SLOTS = ['QB', 'RB', 'RB', 'WR', 'WR', 'TE', 'FLEX', 'FLEX']

def team(rid):
    u = users.get(rosters[rid]['owner_id'], {})
    return (u.get('metadata') or {}).get('team_name') or u.get('display_name'), u.get('display_name')

def optimal(m):
    pp = m['players_points'] or {}
    used, total, lineup = set(), 0.0, []
    for slot in SLOTS:
        ok = [p for p in m['players'] if p not in used and (pos(p) == slot or (slot == 'FLEX' and pos(p) in ('RB', 'WR', 'TE')))]
        if not ok: continue
        b = max(ok, key=lambda p: pp.get(p, 0)); used.add(b); total += pp.get(b, 0); lineup.append(b)
    return round(total, 2), lineup

chop_week = {}
for w in range(1, 11):
    for t in tx[w]:
        if t['type'] == 'chopped': chop_week[t['roster_ids'][0]] = w

# draft value: points each team's 14 drafted players scored in weeks 1-10, whoever rostered them
drafted = collections.defaultdict(list)
for p in picks: drafted[p['roster_id']].append(p)
season_pts = collections.Counter()
for w in range(1, 11):
    for pid, s in stats[w].items(): season_pts[pid] += score(s)
draft_val = {rid: sum(season_pts[p['player_id']] for p in ps) for rid, ps in drafted.items()}
draft_rank = {rid: i + 1 for i, rid in enumerate(sorted(draft_val, key=lambda r: -draft_val[r]))}

# weeks 1..chop window: draft value per team limited to the weeks they were alive, for fairness
def draft_alive(rid, last):
    return sum(score(stats[w].get(p['player_id'], {})) for p in drafted[rid] for w in range(1, last + 1))

rows = []
for rid in sorted(rosters):
    last = chop_week.get(rid, 10)
    name, owner = team(rid)
    weeks = []
    for w in range(1, last + 1):
        m = mu[w][rid]
        opt, opt_lu = optimal(m)
        act = m['points']
        starters = [s for s in (m['starters'] or [])]
        empty = sum(1 for s in starters if s in ('0', None, ''))
        dead = [pname(s) for s in starters if s not in ('0', None, '') and not stats[w].get(s, {}).get('gms_active')]
        others = [x['points'] for r, x in mu[w].items() if r != rid]
        rank = 1 + sum(1 for o in others if o > act)
        weeks.append(dict(w=w, act=act, opt=opt, lost=round(opt - act, 2), dead=dead, empty=empty,
                          rank=rank, teams=len(mu[w]), low_other=min(others)))
    cw = weeks[-1] if rid in chop_week else None
    adds = [t for w in range(1, last + 1) for t in tx[w] if t['type'] in ('waiver', 'free_agent') and t['status'] == 'complete' and (t['roster_ids'] or [None])[0] == rid and t['adds']]
    claims = [t for t in adds if t['type'] == 'waiver']
    bids_failed = [t for w in range(1, last + 1) for t in tx[w] if t['type'] == 'waiver' and t['status'] == 'failed' and (t['roster_ids'] or [None])[0] == rid]
    spent = rosters[rid]['settings'].get('waiver_budget_used', 0)
    big = sorted(claims, key=lambda t: -(t['settings'] or {}).get('waiver_bid', 0))[:3]
    # the roster they were chopped with: best players by season points
    chop_roster = []
    if cw:
        chop_roster = sorted(mu[last][rid]['players'], key=lambda p: -season_pts[p])[:4]
    rows.append(dict(
        rid=rid, team=name, owner=owner, chopped=rid in chop_week, week=chop_week.get(rid),
        weeks_alive=last, total_pts=round(sum(x['act'] for x in weeks), 2), avg_pts=round(st.mean(x['act'] for x in weeks), 1),
        avg_opt=round(st.mean(x['opt'] for x in weeks), 1),
        lost_total=round(sum(x['lost'] for x in weeks), 1), lost_per_week=round(st.mean(x['lost'] for x in weeks), 1),
        efficiency=round(sum(x['act'] for x in weeks) / sum(x['opt'] for x in weeks), 3),
        dead_starts=sum(len(x['dead']) for x in weeks), empty_slots=sum(x['empty'] for x in weeks),
        dead_list=[f"wk {x['w']}: {', '.join(x['dead'])}" for x in weeks if x['dead']],
        chop_act=cw['act'] if cw else None, chop_opt=cw['opt'] if cw else None, chop_next=cw['low_other'] if cw else None,
        avoidable=(cw['opt'] > cw['low_other']) if cw else None,
        chop_gap=round(cw['low_other'] - cw['act'], 2) if cw else None,
        draft_val=round(draft_val.get(rid, 0), 1), draft_rank=draft_rank.get(rid),
        draft_alive=round(draft_alive(rid, last), 1),
        top_picks=[dict(rd=p['round'], name=pname(p['player_id']), pos=pos(p['player_id']), pts=round(season_pts[p['player_id']], 1)) for p in sorted(drafted[rid], key=lambda p: p['pick_no'])[:3]],
        best_pick=max(({'rd': p['round'], 'name': pname(p['player_id']), 'pts': round(season_pts[p['player_id']], 1)} for p in drafted[rid]), key=lambda x: x['pts']),
        spent=spent, faab_left=1000 - spent, n_claims=len(claims), n_fa=len(adds) - len(claims), n_failed=len(bids_failed),
        big_bids=[dict(name=pname(next(iter(t['adds']))), bid=(t['settings'] or {}).get('waiver_bid', 0), w=t['leg']) for t in big],
        chop_roster=[dict(name=pname(p), pts=round(season_pts[p], 1)) for p in chop_roster],
        weekly=[dict(w=x['w'], act=x['act'], opt=x['opt'], rank=x['rank'], teams=x['teams']) for x in weeks]))

json.dump(rows, open(OUT, 'w'), indent=1)
for r in sorted(rows, key=lambda r: (r['week'] or 99)):
    print(f"{r['team'][:20]:20} wk {r['week']} | avg {r['avg_pts']} opt {r['avg_opt']} eff {r['efficiency']} lost/wk {r['lost_per_week']} | dead {r['dead_starts']} empty {r['empty_slots']} | "
          f"chop act {r['chop_act']} opt {r['chop_opt']} next {r['chop_next']} avoid {r['avoidable']} | draft {r['draft_val']} (#{r['draft_rank']}) | "
          f"faab spent {r['spent']} left {r['faab_left']} claims {r['n_claims']} fa {r['n_fa']} failed {r['n_failed']}")
    print('    dead:', r['dead_list'], '| big:', r['big_bids'], '| picks:', r['top_picks'], '| best:', r['best_pick'])
