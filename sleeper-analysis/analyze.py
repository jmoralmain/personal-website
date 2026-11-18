"""Sleeper chopped-league waiver analysis.
Usage: python3 -I analyze.py <raw_dir> <out_dir>
"""
import csv, json, os, sys, collections, datetime

RAW, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)
J = lambda f: json.load(open(os.path.join(RAW, f)))

league = J('league.json')
SC = league['scoring_settings']
BUDGET = league['settings']['waiver_budget']
users = {u['user_id']: u for u in J('users.json')}
rosters = {r['roster_id']: r for r in J('rosters.json')}
P = J('players.json')

def team(rid):
    u = users.get(rosters[rid]['owner_id'], {})
    tn = (u.get('metadata') or {}).get('team_name')
    return u.get('display_name', '?'), tn or u.get('display_name', '?')

def pname(pid):
    p = P.get(pid) or {}
    n = p.get('full_name') or f"{p.get('first_name','')} {p.get('last_name','')}".strip() or pid
    return n, p.get('position') or '?', p.get('team') or 'FA'

def write(name, rows, cols):
    with open(os.path.join(OUT, name), 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=cols); w.writeheader(); w.writerows(rows)

WEEKS = range(1, 19)
tx = {w: J(f'tx_{w}.json') for w in WEEKS}
mu = {w: J(f'mu_{w}.json') for w in WEEKS}
stats = {w: J(f'stats_{w}.json') for w in WEEKS}
SCORED = [w for w in WEEKS if stats[w]]          # weeks with stats
LAST = max(SCORED)

# ---- 1. elimination ------------------------------------------------------
chop_week = {}
for w in WEEKS:
    for t in tx[w]:
        if t['type'] == 'chopped':
            for rid in t['roster_ids']: chop_week[rid] = w
chop_src = {}
for w in WEEKS:
    for t in tx[w]:
        if t['type'] == 'chopped':
            for pid in (t['drops'] or {}): chop_src.setdefault(pid, []).append((w, t['roster_ids'][0]))
last_active = {rid: max([w for w in WEEKS if any(m['roster_id'] == rid and m['players'] for m in mu[w])] or [0]) for rid in rosters}
elim_rows = []
for rid, r in sorted(rosters.items()):
    dn, tn = team(rid)
    wk = {w: next((m['points'] for m in mu[w] if m['roster_id'] == rid), None) for w in SCORED}
    elim_rows.append(dict(roster_id=rid, display_name=dn, team_name=tn,
        players_on_roster_now=len(r['players'] or []), chopped_tx_week=chop_week.get(rid, ''),
        last_week_with_players_in_matchups=last_active[rid],
        lowest_score_that_week=(min((m['points'] for m in mu[chop_week[rid]] if m['players']), default=None) == wk.get(chop_week[rid])) if rid in chop_week else '',
        score_in_chop_week=wk.get(chop_week.get(rid)) if rid in chop_week else '',
        waiver_budget_used=r['settings'].get('waiver_budget_used', 0),
        status='alive' if rid not in chop_week and r['players'] else 'chopped'))
write('eliminations.csv', elim_rows, list(elim_rows[0]))
ALIVE = [e['roster_id'] for e in elim_rows if e['status'] == 'alive']

# ---- 2. transactions -----------------------------------------------------
tx_rows, fails = [], []
for w in WEEKS:
    for t in tx[w]:
        if t['type'] not in ('waiver', 'free_agent'): continue
        rid = (t['roster_ids'] or [None])[0]
        adds, drops = list((t['adds'] or {}).keys()), list((t['drops'] or {}).keys())
        base = dict(week=w, created_utc=datetime.datetime.fromtimestamp(t['created'] / 1000, datetime.UTC).strftime('%Y-%m-%d %H:%M'),
                    transaction_id=t['transaction_id'], roster_id=rid, team=team(rid)[1],
                    alive=rid in ALIVE, bid=(t['settings'] or {}).get('waiver_bid', 0) if t['type'] == 'waiver' else 0)
        if t['type'] == 'waiver' and t['status'] == 'failed':
            for a in adds:
                fails.append({**base, 'player_id': a, 'player': pname(a)[0], 'pos': pname(a)[1], 'reason': (t['metadata'] or {}).get('notes', '')})
            continue
        if t['status'] != 'complete' or not adds: continue  # skip drop-only moves
        label = 'waiver_claim' if t['type'] == 'waiver' else 'free_agent_add'
        for i in range(max(len(adds), len(drops))):
            a = adds[i] if i < len(adds) else None; d = drops[i] if i < len(drops) else None
            tx_rows.append({**base, 'kind': label,
                'added_id': a or '', 'added': pname(a)[0] if a else '', 'added_pos': pname(a)[1] if a else '',
                'dropped_id': d or '', 'dropped': pname(d)[0] if d else '', 'dropped_pos': pname(d)[1] if d else '',
                'bid': base['bid'] if i == 0 else 0})
tx_rows.sort(key=lambda r: (r['week'], r['created_utc']))
TXC = ['week', 'created_utc', 'kind', 'roster_id', 'team', 'alive', 'added', 'added_pos', 'added_id', 'dropped', 'dropped_pos', 'dropped_id', 'bid', 'transaction_id']
write('transactions_all_teams.csv', tx_rows, TXC)
won = {(r['week'], r['added_id']): r for r in tx_rows if r['kind'] == 'waiver_claim'}
for f in fails:
    wr = won.get((f['week'], f['player_id']))
    f['won_by'] = wr['team'] if wr else ''; f['winning_bid'] = wr['bid'] if wr else ''
write('failed_waiver_bids.csv', fails, ['week', 'created_utc', 'roster_id', 'team', 'alive', 'player', 'pos', 'player_id', 'bid', 'won_by', 'winning_bid', 'reason', 'transaction_id'])

# ---- 3. scoring ----------------------------------------------------------
def score(s): return round(sum(v * s.get(k, 0) for k, v in SC.items()), 2)
week_rows, diffs = [], []
own = collections.defaultdict(dict)   # (rid) -> {week: {pid: (started, pts)}}
for w in SCORED:
    for m in mu[w]:
        rid = m['roster_id']
        if not m['players']: continue
        for pid in m['players']:
            calc = score(stats[w].get(pid, {}))
            slp = (m['players_points'] or {}).get(pid, 0)
            started = pid in (m['starters'] or [])
            own[rid][w] = own[rid].get(w, {}); own[rid][w][pid] = (started, slp)
            diffs.append(abs(calc - slp))
            if rid in ALIVE:
                n, pos, tm = pname(pid)
                week_rows.append(dict(week=w, roster_id=rid, team=team(rid)[1], player_id=pid, player=n, pos=pos, nfl_team=tm,
                                      started=started, sleeper_points=slp, computed_points=calc))
write('weekly_player_points_alive_teams.csv', week_rows, list(week_rows[0]))
print(f'scoring check: {len(diffs)} player-weeks, max |computed - sleeper| = {max(diffs):.2f}, mismatches>0.05: {sum(d > .05 for d in diffs)}')

# ---- 4. pickups ----------------------------------------------------------
# attribute each rostered week to the latest add of that player by that team at or before that week
pick_rows = []
for rid in ALIVE:
    adds = [r for r in tx_rows if r['roster_id'] == rid and r['added_id']]
    for i, a in enumerate(adds):
        later = [b for b in adds[i + 1:] if b['added_id'] == a['added_id']]
        end = later[0]['week'] - 1 if later else 99
        weeks = [w for w in SCORED if a['week'] <= w <= end and a['added_id'] in own[rid].get(w, {})]
        st = [w for w in weeks if own[rid][w][a['added_id']][0]]
        pts_st = round(sum(own[rid][w][a['added_id']][1] for w in st), 2)
        pts_ro = round(sum(own[rid][w][a['added_id']][1] for w in weeks), 2)
        src = [c for c in chop_src.get(a['added_id'], []) if c[0] in (a['week'], a['week'] - 1)]
        pick_rows.append(dict(roster_id=rid, team=team(rid)[1], week=a['week'], kind=a['kind'], added=a['added'], pos=a['added_pos'],
            from_chopped_team=team(src[-1][1])[1] if src else '',
            status=('pending (no scored week yet)' if not weeks and a['added_id'] in (rosters[rid]['players'] or []) else 'scored' if weeks else 'never played for team'),
            dropped=a['dropped'], bid=a['bid'], weeks_rostered=len(weeks), weeks_started=len(st),
            started_points=pts_st, rostered_points=pts_ro,
            started_ppg=round(pts_st / len(st), 2) if st else 0,
            faab_per_started_point=round(a['bid'] / pts_st, 2) if pts_st > 0 else ('' if a['bid'] == 0 else 'inf'),
            still_on_roster=a['added_id'] in (rosters[rid]['players'] or []),
            weeks_list=' '.join(map(str, weeks)), started_list=' '.join(map(str, st))))
write('pickups_alive_teams.csv', pick_rows, list(pick_rows[0]))

# ---- 5. team summaries ---------------------------------------------------
summ = []
for rid in ALIVE:
    pr = [p for p in pick_rows if p['roster_id'] == rid]
    wv = [p for p in pr if p['kind'] == 'waiver_claim']
    spent = sum(p['bid'] for p in pr)
    st_pts = sum(own[rid][w][pid][1] for w in SCORED for pid, (s, _) in own[rid].get(w, {}).items() if s)
    pk_st = sum(p['started_points'] for p in pr)
    fl = [f for f in fails if f['roster_id'] == rid]
    by_pos = collections.Counter(p['pos'] for p in pr)
    faab_pos = collections.Counter()
    for p in wv: faab_pos[p['pos']] += p['bid']
    phase = lambda lo, hi: sum(p['bid'] for p in wv if lo <= p['week'] <= hi)
    summ.append(dict(roster_id=rid, team=team(rid)[1], display_name=team(rid)[0],
        waiver_claims=len(wv), fa_adds=len(pr) - len(wv), failed_bids=len(fl), failed_bid_total=sum(f['bid'] for f in fl),
        faab_spent=spent, faab_used_per_sleeper=rosters[rid]['settings'].get('waiver_budget_used'), faab_remaining=BUDGET - spent,
        faab_wk1_3=phase(1, 3), faab_wk4_7=phase(4, 7), faab_wk8_plus=phase(8, 18),
        max_bid=max([p['bid'] for p in wv] or [0]), avg_bid=round(spent / len(wv), 1) if wv else 0,
        total_started_points=round(st_pts, 2), pickup_started_points=round(pk_st, 2),
        pickup_share_of_started_pts=round(pk_st / st_pts, 3) if st_pts else 0,
        faab_per_pickup_started_point=round(spent / pk_st, 2) if pk_st else '',
        pickups_still_rostered=sum(p['still_on_roster'] for p in pr),
        adds_by_pos=' '.join(f'{k}:{v}' for k, v in by_pos.most_common()),
        faab_by_pos=' '.join(f'{k}:{v}' for k, v in faab_pos.most_common()),
        weekly_scores=' '.join(f"{w}:{next(m['points'] for m in mu[w] if m['roster_id'] == rid)}" for w in SCORED)))
write('team_waiver_summary.csv', summ, list(summ[0]))

# weekly league context: score rank among surviving teams that week
ctx = []
for w in SCORED:
    act = sorted([m for m in mu[w] if m['players']], key=lambda m: -m['points'])
    for i, m in enumerate(act):
        if m['roster_id'] in ALIVE:
            ctx.append(dict(week=w, roster_id=m['roster_id'], team=team(m['roster_id'])[1], points=m['points'], rank=i + 1, teams_alive=len(act),
                            margin_over_chopped=round(m['points'] - act[-1]['points'], 2)))
write('weekly_rank_alive_teams.csv', ctx, list(ctx[0]))
for s in summ: print(s)
