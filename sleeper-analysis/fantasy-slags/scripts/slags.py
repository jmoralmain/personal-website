"""Fantasy Slags review: startup draft grades, every trade, and an overall synthesis.
One season (2026, weeks 1-10), 12 teams, superflex, half PPR.
Usage: python3 -I slags.py <slags_dir> <stats_dir> <players_json> <out_json>

Units: points above replacement (PAR) everywhere.
- Draft: a pick's 2026 points minus the season-to-date total of the Nth player at
  his position (QB 24, RB 30, WR 42, TE 14), floored at 0. Expected PAR at each
  pick comes from a smooth curve fitted to all 264 picks (PAR ~ a + b*ln(pick),
  floored at 0); value over slot = PAR - expected.
- Trades: for each week a received player is in the new team's starters (from the
  trade's week until he leaves), max(0, his points - that week's Nth-best score at
  his position among players who played). Startup picks traded during the draft
  are credited with the player taken. Picks for 2027+ are unvalued (future).
"""
import json, sys, math, collections, statistics as st, datetime
D, SD, PJ, OUT = sys.argv[1:5]
L, DRAFT, LAST = '1392784178944184320', '1392784180957417472', 10
J = lambda f: json.load(open(f'{D}/{f}'))
P = json.load(open(PJ))
lg = J(f'league_{L}.json'); SC = lg['scoring_settings']
users = {u['user_id']: u for u in J(f'{L}/users.json')}
rosters = {r['roster_id']: r for r in J(f'{L}/rosters.json')}
owner = {rid: users.get(r['owner_id'], {}).get('display_name', '?') for rid, r in rosters.items()}
REPL = {'QB': 24, 'RB': 30, 'WR': 42, 'TE': 14}
pos_of = lambda pid, meta=None: (meta or {}).get('position') or (P.get(pid) or {}).get('position')
name_of = lambda pid: (P.get(pid) or {}).get('full_name') or pid
score = lambda s: sum(v * s.get(k, 0) for k, v in SC.items())

stats = {w: json.load(open(f'{SD}/2026_{w}.json')) for w in range(1, LAST + 1)}
played = lambda s: (s.get('gp') or 0) > 0 or (s.get('off_snp') or 0) > 0
wk_pts = {w: {pid: score(s) for pid, s in stats[w].items()} for w in stats}
season = collections.Counter()
for w in stats:
    for pid, v in wk_pts[w].items(): season[pid] += v
repl, wrepl = {}, {}
for p, n in REPL.items():
    vals = sorted((v for pid, v in season.items() if pos_of(pid) == p), reverse=True)
    repl[p] = vals[n - 1]
for w in stats:
    for p, n in REPL.items():
        vals = sorted((wk_pts[w][pid] for pid, s in stats[w].items() if pos_of(pid) == p and played(s)), reverse=True)
        wrepl[(w, p)] = vals[n - 1] if len(vals) >= n else 0.0

# ---------------- startup draft ----------------
draft = J(f'draft_{DRAFT}.json'); picks = J(f'picks_{DRAFT}.json')
slot_rid = {int(k): v for k, v in draft['slot_to_roster_id'].items()}
rows = []
for p in sorted(picks, key=lambda p: p['pick_no']):
    pid, pos = p['player_id'], pos_of(p['player_id'], p.get('metadata'))
    par = max(0.0, season[pid] - repl[pos]) if pos in REPL else 0.0
    rows.append(dict(pick=p['pick_no'], rd=p['round'], slot=p['draft_slot'], rid=p['roster_id'], owner=owner[p['roster_id']],
                     orig=slot_rid[p['draft_slot']], pid=pid, name=name_of(pid), pos=pos, pts=round(season[pid], 1), par=round(par, 1)))
x = [math.log(r['pick']) for r in rows]; y = [r['par'] for r in rows]
mx, my = st.mean(x), st.mean(y)
b = sum((a - mx) * (c - my) for a, c in zip(x, y)) / sum((a - mx) ** 2 for a in x); a0 = my - b * mx
for r, xi in zip(rows, x):
    r['exp'] = round(max(0.0, a0 + b * xi), 1); r['voe'] = round(r['par'] - r['exp'], 1)
now_rid = {pid: rid for rid, r in rosters.items() for pid in (r['players'] or [])}
for r in rows: r['now_rid'] = now_rid.get(r['pid'])

# ---------------- weekly lineups ----------------
mu = {w: {m['roster_id']: m for m in J(f'{L}/mu_{w}.json')} for w in range(1, LAST + 1)}
def starter_par(pid, rid, start_w):
    """Starter PAR for pid on roster rid from week start_w until he leaves that roster."""
    tot, starts = 0.0, 0
    for w in range(start_w, LAST + 1):
        m = mu[w].get(rid)
        if not m or pid not in (m['players'] or []):
            if w > start_w: break
            continue
        if pid in (m['starters'] or []):
            pos = pos_of(pid)
            if pos in REPL:
                tot += max(0.0, wk_pts[w].get(pid, 0) - wrepl[(w, pos)]); starts += 1
    return round(tot, 1), starts

# ---------------- trades ----------------
pick_player = {}
for r in rows: pick_player[(r['rd'], r['orig'])] = r
raw = sorted((t for w in range(1, 19) for t in J(f'{L}/tx_{w}.json') if t['type'] == 'trade' and t['status'] == 'complete'),
             key=lambda t: t['created'])
# Sleeper records one trade twice when a deal was redone: identical player moves a few days apart.
# Keep one copy (the one with draft picks, whose pick moves match the league's current pick ownership).
kept, dupes = [], []
for t in raw:
    twin = next((k for k in kept if (k.get('adds') or {}) == (t.get('adds') or {}) and (t.get('adds') or {})
                 and abs(k['created'] - t['created']) < 7 * 86400 * 1000), None)
    if twin is None: kept.append(t); continue
    dupes.append(t['transaction_id'])
    if not twin.get('draft_picks') and t.get('draft_picks'): kept[kept.index(twin)] = t
week_of = {t['transaction_id']: w for w in range(1, 19) for t in J(f'{L}/tx_{w}.json')}
trades = []
for t in kept:
        w = week_of[t['transaction_id']]
        when = datetime.datetime.fromtimestamp(t['created'] / 1000, datetime.UTC)
        tw = min(max(w, 1), LAST + 1)
        sides = {rid: dict(rid=rid, owner=owner[rid], got=[], value=0.0) for rid in t['roster_ids']}
        for pid, rid in (t.get('adds') or {}).items():
            v, s = starter_par(pid, rid, tw) if tw <= LAST else (0.0, 0)
            sides[rid]['got'].append(dict(kind='player', name=name_of(pid), pos=pos_of(pid), value=v, starts=s))
            sides[rid]['value'] += v
        for dp in t.get('draft_picks') or []:
            rid = dp['owner_id']; item = dict(kind='pick', season=dp['season'], round=dp['round'], orig=owner[dp['roster_id']])
            if dp['season'] == '2026':
                r = pick_player.get((dp['round'], dp['roster_id']))
                if r and r['rid'] == rid:
                    v, s = starter_par(r['pid'], rid, 1)
                    item.update(status='used', name=r['name'], pos=r['pos'], pick=r['pick'], value=v, starts=s); sides[rid]['value'] += v
                else:
                    item.update(status='flipped', value=0.0)
            else:
                item.update(status='future', value=0.0)
            sides[rid]['got'].append(item)
        for fb in t.get('waiver_budget') or []:
            sides[fb['receiver']]['got'].append(dict(kind='faab', amount=fb['amount'], value=0.0))
        for s in sides.values(): s['value'] = round(s['value'], 1)
        ss = sorted(sides.values(), key=lambda s: -s['value'])
        margin = round(ss[0]['value'] - ss[-1]['value'], 1)
        assets = [a for s in sides.values() for a in s['got']]
        fut = sum(1 for a in assets if a['kind'] == 'pick' and a['status'] == 'future')
        unvalued_side = any(all(a['kind'] == 'faab' or (a['kind'] == 'pick' and a['status'] == 'future') for a in s['got']) for s in sides.values())
        verdict = 'early' if (unvalued_side and fut) or fut * 2 > len(assets) else 'close' if margin < 15 else 'win'
        trades.append(dict(week=w, date=when.strftime('%Y-%m-%d'), during_draft=when.timestamp() * 1000 < (draft.get('last_picked') or 0),
                           sides=list(sides.values()), margin=margin, leader=ss[0]['rid'], verdict=verdict, n_future=fut))
trades.sort(key=lambda t: t['date'])
for i, t in enumerate(trades, 1): t['n'] = i

team_tr = {rid: dict(n=0, got=0.0, gave=0.0, w=0, l=0, c=0, best=None, worst=None, partners=collections.Counter()) for rid in rosters}
for t in trades:
    for s in t['sides']:
        others = [o for o in t['sides'] if o['rid'] != s['rid']]
        gave = sum(o['value'] for o in others); net = s['value'] - gave
        tt = team_tr[s['rid']]; tt['n'] += 1; tt['got'] += s['value']; tt['gave'] += gave
        for o in others: tt['partners'][o['owner']] += 1
        if t['verdict'] == 'win': tt['w' if t['leader'] == s['rid'] else 'l'] += 1
        else: tt['c'] += 1
        if tt['best'] is None or net > tt['best'][1]: tt['best'] = (t['n'], round(net, 1))
        if tt['worst'] is None or net < tt['worst'][1]: tt['worst'] = (t['n'], round(net, 1))

# ---------------- future picks held ----------------
own = {(yy, rd, rid): rid for yy in ('2027', '2028', '2029') for rd in range(1, 5) for rid in rosters}
for p in J(f'{L}/traded_picks.json'):
    if p['season'] in ('2027', '2028', '2029'): own[(p['season'], p['round'], p['roster_id'])] = p['owner_id']
fut = collections.defaultdict(collections.Counter)
for (yy, rd, o), cur in own.items(): fut[cur][rd] += 1

# ---------------- teams ----------------
teams = []
for rid in sorted(rosters):
    mine = [r for r in rows if r['rid'] == rid]; s = rosters[rid]['settings']; tt = team_tr[rid]
    teams.append(dict(rid=rid, owner=owner[rid], me=False, first_pick=min(r['pick'] for r in mine), n_picks=len(mine),
        draft_par=round(sum(r['par'] for r in mine), 1), draft_voe=round(sum(r['voe'] for r in mine), 1),
        voe_r1_5=round(sum(r['voe'] for r in mine if r['rd'] <= 5), 1), voe_r6=round(sum(r['voe'] for r in mine if r['rd'] > 5), 1),
        hits=sum(1 for r in mine if r['par'] > 0), still=sum(1 for r in mine if r['now_rid'] == rid),
        trades=tt['n'], tr_got=round(tt['got'], 1), tr_gave=round(tt['gave'], 1), tr_net=round(tt['got'] - tt['gave'], 1),
        tr_w=tt['w'], tr_l=tt['l'], tr_c=tt['c'], tr_best=tt['best'], tr_worst=tt['worst'],
        partner=[k for k, v in tt['partners'].items() if v == max(tt['partners'].values())] if tt['partners'] else [],
        w=s.get('wins', 0), l=s.get('losses', 0), pf=round(s.get('fpts', 0) + s.get('fpts_decimal', 0) / 100, 1),
        firsts=fut[rid][1], future_total=sum(fut[rid].values())))
for t in teams: t['total'] = round(t['draft_voe'] + t['tr_net'], 1)
def fit(xs, ys):
    mx, my = st.mean(xs), st.mean(ys)
    b = sum((a - mx) * (c - my) for a, c in zip(xs, ys)) / sum((a - mx) ** 2 for a in xs)
    r = b * (sum((a - mx) ** 2 for a in xs) ** .5) / (sum((c - my) ** 2 for c in ys) ** .5)
    return my - b * mx, b, r
fa, fb, fr = fit([t['total'] for t in teams], [t['w'] for t in teams])
da, db, dr = fit([t['draft_voe'] for t in teams], [t['w'] for t in teams])
pa, pb, pr = fit([t['total'] for t in teams], [t['pf'] for t in teams])
for t in teams:
    t['pred'] = round(fa + fb * t['total'], 1); t['resid'] = round(t['w'] - t['pred'], 1)
out = dict(rows=rows, trades=trades, teams=teams, repl={k: round(v, 1) for k, v in repl.items()},
           curve=dict(a=round(a0, 2), b=round(b, 2)), fit=dict(a=round(fa, 3), b=round(fb, 5), corr=round(fr, 2), draft_corr=round(dr, 2), pf_corr=round(pr, 2)),
           n_future=sum(t['n_future'] for t in trades), n_dupes=len(dupes))
json.dump(out, open(OUT, 'w'), separators=(',', ':'))

print('replacement', out['repl'], '| curve', out['curve'], '| fit', out['fit'], '| future picks traded', out['n_future'])
for t in sorted(teams, key=lambda t: -t['total']):
    print(f"{t['owner'][:18]:18} total {t['total']:6.1f} | draft {t['draft_voe']:6.1f} (r1-5 {t['voe_r1_5']:6.1f}, r6+ {t['voe_r6']:6.1f}) hits {t['hits']:2} | trades {t['trades']} net {t['tr_net']:6.1f} ({t['tr_w']}-{t['tr_l']}-{t['tr_c']}) | {t['w']}-{t['l']} pf {t['pf']} pred {t['pred']} | 1sts {t['firsts']} | 1st pick #{t['first_pick']} still {t['still']}")
print('\nbest picks:'); [print('  ', r['pick'], r['rd'], r['owner'], r['name'], r['pos'], r['par'], r['exp'], r['voe']) for r in sorted(rows, key=lambda r: -r['voe'])[:10]]
print('worst picks:'); [print('  ', r['pick'], r['rd'], r['owner'], r['name'], r['pos'], r['par'], r['exp'], r['voe']) for r in sorted(rows, key=lambda r: r['voe'])[:10]]
print('\ntrades:')
for t in trades:
    lab = lambda a: a['name'] if a['kind'] == 'player' else f"${a['amount']} FAAB" if a['kind'] == 'faab' else f"{a['season']} R{a['round']} ({a['orig']}){' = ' + a['name'] if a.get('status') == 'used' else ' ' + a['status']}"
    print(f"#{t['n']} {t['date']} wk{t['week']} {'(draft)' if t['during_draft'] else ''} margin {t['margin']} {t['verdict']} | " + ' || '.join(f"{s['owner']} {s['value']}: " + ', '.join(lab(a) for a in s['got']) for s in t['sides']))
print('duplicates merged:', out['n_dupes'])
