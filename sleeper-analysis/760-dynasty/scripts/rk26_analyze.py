"""2026 rookie draft review of The 760 Dynasty (early returns, weeks 1-10).
Usage: python3 -I rk26_analyze.py <dyn_dir> <players_json> <out_json>

Same season-points and replacement logic as dynasty.py, restricted to 2026 weeks 1-10.
PAR = 2026 points minus replacement (24th QB, 30th RB, 42nd WR, 14th TE by season-to-date
points), floored at 0. Value over slot (VOS) = PAR minus the mean PAR of picks within +-3
slots (7-pick window, truncated at the ends of the draft, own pick included).
"""
import json, sys, collections, statistics as st

D, PJ, OUT = sys.argv[1:4]
J = lambda f: json.load(open(f'{D}/{f}'))
P = json.load(open(PJ))
L = '1336088004720099328'; L25 = '1180453968974659584'; L24 = '1098388508928032768'
DRAFT = '1336088004732657664'
LAST = 10
ME_RID = 12
REPL = {'QB': 24, 'RB': 30, 'WR': 42, 'TE': 14}
STARTER = {'QB': 24, 'RB': 24, 'WR': 36, 'TE': 12}
WIN = 3

league = J(f'league_{L}.json'); sc = league['scoring_settings']
users = {u['user_id']: u for u in J(f'{L}/users.json')}
rosters = {r['roster_id']: r for r in J(f'{L}/rosters.json')}
owner = lambda rid: users.get(rosters[rid]['owner_id'], {}).get('display_name') or '?'
pos_of = lambda pid: (P.get(pid) or {}).get('position')

# weekly points, all players
wk_pts = collections.defaultdict(dict); active = collections.defaultdict(set); snaps = collections.defaultdict(dict)
for w in range(1, LAST + 1):
    for pid, s in J(f'stats/2026_{w}.json').items():
        wk_pts[w][pid] = sum(v * s.get(k, 0) for k, v in sc.items())
        # 'gp' marks a game actually played; 'gms_active' is set for nearly every rostered player, IR included
        if s.get('gp'): active[w].add(pid); snaps[w][pid] = (s.get('off_snp', 0), s.get('tm_off_snp', 0))
tot = collections.Counter()
for w in wk_pts:
    for pid, v in wk_pts[w].items(): tot[pid] += v

repl, starter_cut = {}, {}
byp = collections.defaultdict(list)
for pid, v in tot.items():
    if pos_of(pid) in REPL: byp[pos_of(pid)].append(v)
for p in REPL:
    vals = sorted(byp[p], reverse=True); repl[p] = vals[REPL[p] - 1]; starter_cut[p] = vals[STARTER[p] - 1]
season_rank = {}
for p in REPL:
    for i, pid in enumerate(sorted((x for x in tot if pos_of(x) == p), key=lambda x: -tot[x])): season_rank[pid] = i + 1
# weekly position ranks
wk_rank = {}
for w in wk_pts:
    for p in REPL:
        for i, pid in enumerate(sorted((x for x in wk_pts[w] if pos_of(x) == p), key=lambda x: -wk_pts[w][x])):
            wk_rank[(w, pid)] = i + 1

draft = J(f'draft_{DRAFT}.json'); picks = J(f'picks_{DRAFT}.json')
slot_orig = {int(k): v for k, v in draft['settings'].items() if False} or {int(k): v for k, v in draft['slot_to_roster_id'].items()}
t_start, t_end = draft['start_time'], draft['last_picked']

# trades touching 2026 picks (all three league files), and trades of drafted players after the draft
pick_trades = []; post_trades = []
for LL, yr in ((L24, 2024), (L25, 2025), (L, 2026)):
    for w in range(1, 19):
        try: tx = J(f'{LL}/tx_{w}.json')
        except Exception: continue
        for t in tx:
            if t['type'] != 'trade' or t['status'] != 'complete': continue
            dp = [d for d in (t.get('draft_picks') or []) if str(d['season']) == '2026']
            if dp:
                pick_trades.append(dict(ts=t['status_updated'], yr=yr, w=w, rids=t['roster_ids'], adds=t.get('adds') or {},
                    picks26=[dict(rd=d['round'], orig=d['roster_id'], frm=d['previous_owner_id'], to=d['owner_id']) for d in dp],
                    other=[dict(season=d['season'], rd=d['round'], orig=d['roster_id'], frm=d['previous_owner_id'], to=d['owner_id']) for d in (t.get('draft_picks') or []) if str(d['season']) != '2026']))
            if yr == 2026 and t['status_updated'] > t_end:
                post_trades.append(dict(ts=t['status_updated'], w=w, rids=t['roster_ids'], adds=t.get('adds') or {}, drops=t.get('drops') or {}, picks=t.get('draft_picks') or []))
pick_trades.sort(key=lambda t: t['ts'])
# waiver/FA drops of drafted players after the draft
drops = collections.defaultdict(list)
for w in range(1, 19):
    try: tx = J(f'{L}/tx_{w}.json')
    except Exception: continue
    for t in tx:
        if t['status'] == 'complete' and t['type'] != 'trade' and t['status_updated'] > t_end:
            for pid, rid in (t.get('drops') or {}).items(): drops[pid].append(dict(w=w, rid=rid, type=t['type']))
            for pid, rid in (t.get('adds') or {}).items(): drops[pid].append(dict(w=w, rid=rid, type=t['type'] + '_add'))

# matchups: starters and roster membership per week
mu = {w: {m['roster_id']: m for m in J(f'{L}/mu_{w}.json')} for w in range(1, LAST + 1)}
now_roster = {pid: rid for rid, r in rosters.items() for pid in (r['players'] or [])}

rows = []
for p in sorted(picks, key=lambda p: p['pick_no']):
    pid = p['player_id']; meta = p.get('metadata') or {}; pi = P.get(pid) or {}
    pos = pos_of(pid) or meta.get('position'); rid = p['roster_id']; orig = slot_orig[p['draft_slot']]
    weeks = [round(wk_pts[w].get(pid, 0.0), 2) for w in range(1, LAST + 1)]
    played = [pid in active[w] for w in range(1, LAST + 1)]
    gp = sum(played); pts = round(tot[pid], 1)
    par = round(max(0.0, tot[pid] - repl[pos]), 1) if pos in REPL else 0.0
    starter_wks = sum(1 for w in range(1, LAST + 1) if pid in active[w] and wk_rank.get((w, pid), 999) <= STARTER.get(pos, 0))
    h1 = [w for w in range(1, 6) if pid in active[w]]; h2 = [w for w in range(6, 11) if pid in active[w]]
    ppg1 = round(sum(wk_pts[w].get(pid, 0) for w in h1) / len(h1), 1) if h1 else None
    ppg2 = round(sum(wk_pts[w].get(pid, 0) for w in h2) / len(h2), 1) if h2 else None
    pts1 = round(sum(wk_pts[w].get(pid, 0) for w in range(1, 6)), 1); pts2 = round(sum(wk_pts[w].get(pid, 0) for w in range(6, 11)), 1)
    st1 = sum(1 for w in range(1, 6) if pid in active[w] and wk_rank.get((w, pid), 999) <= STARTER.get(pos, 0))
    st2 = sum(1 for w in range(6, 11) if pid in active[w] and wk_rank.get((w, pid), 999) <= STARTER.get(pos, 0))
    def share(ws):
        a = sum(snaps[w][pid][0] for w in ws); b = sum(snaps[w][pid][1] for w in ws)
        return round(100 * a / b) if b else None
    snap_all, snap1, snap2 = share(h1 + h2), share(h1), share(h2)
    wk_snap = [round(100 * snaps[w][pid][0] / snaps[w][pid][1]) if pid in active[w] and snaps[w][pid][1] else None for w in range(1, LAST + 1)]
    on_drafter = [w for w in range(1, LAST + 1) if pid in (mu[w].get(rid, {}).get('players') or [])]
    started_drafter = [w for w in range(1, LAST + 1) if pid in (mu[w].get(rid, {}).get('starters') or [])]
    started_any = [w for w in range(1, LAST + 1) if any(pid in (m.get('starters') or []) for m in mu[w].values())]
    rows.append(dict(pick=p['pick_no'], rd=p['round'], slot=p['draft_slot'], rid=rid, owner=owner(rid), orig=orig, orig_owner=owner(orig),
        pid=pid, name=pi.get('full_name') or f"{meta.get('first_name','')} {meta.get('last_name','')}".strip(), pos=pos,
        nfl=pi.get('team') or meta.get('team'), draft_team=meta.get('team'), college=pi.get('college'), age=pi.get('age'),
        depth=pi.get('depth_chart_order'), inj=pi.get('injury_status'), status=pi.get('status'),
        pts=pts, gp=gp, ppg=round(tot[pid] / gp, 1) if gp else None, par=par, rank=season_rank.get(pid), weeks=weeks, played=played,
        starter_wks=starter_wks, snap=snap_all, snap1=snap1, snap2=snap2, wk_snap=wk_snap, ppg1=ppg1, ppg2=ppg2, pts1=pts1, pts2=pts2, gp1=len(h1), gp2=len(h2), st1=st1, st2=st2,
        on_drafter_wks=len(on_drafter), started_drafter=len(started_drafter), started_any=len(started_any),
        now_rid=now_roster.get(pid), now_owner=owner(now_roster[pid]) if pid in now_roster else None, moves=drops.get(pid, [])))
for i, r in enumerate(rows):
    win = rows[max(0, i - WIN): i + WIN + 1]
    r['exp'] = round(st.mean(x['par'] for x in win), 1); r['vos'] = round(r['par'] - r['exp'], 1)

teams = []
for rid in sorted(rosters):
    mine = [r for r in rows if r['rid'] == rid]; owned = [r for r in rows if r['orig'] == rid]
    s = rosters[rid]['settings']
    teams.append(dict(rid=rid, owner=owner(rid), me=rid == ME_RID, n=len(mine), n_owned=len(owned), slot=next(k for k, v in slot_orig.items() if v == rid),
        par=round(sum(r['par'] for r in mine), 1), vos=round(sum(r['vos'] for r in mine), 1), pts=round(sum(r['pts'] for r in mine), 1),
        starter_wks=sum(r['starter_wks'] for r in mine), started=sum(r['started_drafter'] for r in mine),
        still=sum(1 for r in mine if r['now_rid'] == rid), w=s.get('wins', 0), l=s.get('losses', 0),
        pf=round(s.get('fpts', 0) + s.get('fpts_decimal', 0) / 100, 1),
        best=max(mine, key=lambda r: r['vos'])['pick'] if mine else None, worst=min(mine, key=lambda r: r['vos'])['pick'] if mine else None,
        picks=[r['pick'] for r in mine], owned_picks=[r['pick'] for r in owned]))

out = dict(rows=rows, teams=teams, repl={p: round(v, 1) for p, v in repl.items()}, starter_cut={p: round(v, 1) for p, v in starter_cut.items()},
    pick_trades=pick_trades, post_trades=[t for t in post_trades if any(pid in {r['pid'] for r in rows} for pid in t['adds'])],
    names={str(rid): owner(rid) for rid in rosters}, pnames={pid: (P.get(pid) or {}).get('full_name') for t in pick_trades for pid in t['adds']},
    draft_start=t_start, draft_end=t_end)
json.dump(out, open(OUT, 'w'), indent=1)

print('repl', out['repl'], 'starter cut', out['starter_cut'])
for r in rows:
    print(f"#{r['pick']:>2} R{r['rd']} {r['owner'][:12]:12} (orig {r['orig_owner'][:12]:12}) {r['name'][:20]:20} {r['pos']} {str(r['nfl']):4} pts {r['pts']:6.1f} gp {r['gp']:>2} ppg {str(r['ppg']):5} rk {str(r['rank']):4} PAR {r['par']:6.1f} exp {r['exp']:5.1f} VOS {r['vos']:6.1f} snap {r['snap']} ({r['snap1']}->{r['snap2']}) stW {r['starter_wks']} ({r['st1']}/{r['st2']}) ppg {r['ppg1']}->{r['ppg2']} pts {r['pts1']}->{r['pts2']} | onDr {r['on_drafter_wks']} startDr {r['started_drafter']} startAny {r['started_any']} now {r['now_owner']} | dc {r['depth']} inj {r['inj']} {r['status']}")
for t in sorted(teams, key=lambda t: -t['vos']):
    print(f"{t['owner'][:14]:14} {'ME' if t['me'] else '  '} slot {t['slot']:>2} n {t['n']} owned {t['n_owned']} PAR {t['par']:6.1f} VOS {t['vos']:6.1f} pts {t['pts']:6.1f} stW {t['starter_wks']} started {t['started']} still {t['still']} {t['w']}-{t['l']} pf {t['pf']} picks {t['picks']} owned {t['owned_picks']}")
for t in pick_trades:
    print(t['yr'], t['w'], [out['names'][str(x)] for x in t['rids']], [(out['pnames'].get(p), out['names'][str(r)]) for p, r in t['adds'].items()], [(d['rd'], out['names'][str(d['orig'])], out['names'][str(d['frm'])], '->', out['names'][str(d['to'])]) for d in t['picks26']], [(d['season'], d['rd'], out['names'][str(d['orig'])], '->', out['names'][str(d['to'])]) for d in t['other']])
print('post-draft trades with rookies', out['post_trades'])
for r in rows:
    if r['moves']: print('moves', r['name'], r['moves'])
