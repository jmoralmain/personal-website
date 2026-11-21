"""Trade review of The 760 Dynasty.
Usage: python3 -I trades.py <scratch_dir>

Value of what a team received = starter points above weekly replacement produced
for that team after the trade, while the asset stayed on its roster.
Weekly replacement = that week's Nth-best score at the position among players with
gms_active (QB 24, RB 30, WR 42, TE 14). Seasons: 2024/2025 weeks 1-17, 2026 weeks 1-10.
Picks: credited to the team that made the pick, for the rookie drafted with it.
Future picks (2027+): their expected value from the Draft picks tab.
Follow-through: anything received and later traded on also carries what it brought back (followthrough.py).
"""
import json, sys, collections, datetime, statistics as st

S = sys.argv[1]
D = f'{S}/dyn'
J = lambda f: json.load(open(f'{D}/{f}'))
P = json.load(open(f'{S}/raw/players.json'))
SEASONS = {2024: ('1098388508928032768', 17), 2025: ('1180453968974659584', 17), 2026: ('1336088004720099328', 10)}
ROOKIE = {2025: '1180453968974659585', 2026: '1336088004732657664'}
DRAFTS = {2024: '1098388509481684992', **ROOKIE}
ME_RID = 12
REPL = {'QB': 24, 'RB': 30, 'WR': 42, 'TE': 14}
CLOSE = 15

league = {y: J(f'league_{L}.json') for y, (L, _) in SEASONS.items()}
users = {u['user_id']: u for u in J(f'{SEASONS[2026][0]}/users.json')}
rost26 = {r['roster_id']: r for r in J(f'{SEASONS[2026][0]}/rosters.json')}
owner = {rid: users[r['owner_id']]['display_name'] for rid, r in rost26.items()}
# sanity: owners map to roster ids identically in every season
for y, (L, _) in SEASONS.items():
    for r in J(f'{L}/rosters.json'):
        assert r['owner_id'] == rost26[r['roster_id']]['owner_id'], (y, r['roster_id'])

pos = lambda pid: (P.get(pid) or {}).get('position')
name = lambda pid: (P.get(pid) or {}).get('full_name') or pid

# timeline of scored weeks
TL = [(y, w) for y, (_, last) in SEASONS.items() for w in range(1, last + 1)]
TIDX = {k: i for i, k in enumerate(TL)}

# weekly scores and replacement
score, repl = {}, {}
for y, w in TL:
    sc = league[y]['scoring_settings']
    wk = {}
    byp = collections.defaultdict(list)
    for pid, s in J(f'stats/{y}_{w}.json').items():
        v = sum(val * s.get(k, 0) for k, val in sc.items())
        wk[pid] = v
        if s.get('gms_active') and pos(pid) in REPL: byp[pos(pid)].append(v)
    score[(y, w)] = wk
    for p, n in REPL.items():
        vals = sorted(byp[p], reverse=True)
        repl[(y, w, p)] = vals[n - 1]

# matchups: per week per roster -> players set, starters set
mu = {}
for y, w in TL:
    L = SEASONS[y][0]
    mu[(y, w)] = {m['roster_id']: (set(m['players'] or []), set(m['starters'] or [])) for m in J(f'{L}/mu_{w}.json')}

def par_week(pid, y, w):
    p = pos(pid)
    if p not in REPL: return 0.0
    return max(0.0, score[(y, w)].get(pid, 0.0) - repl[(y, w, p)])

WEEKLY = []
def value_for(pid, rid, start_idx):
    """Starter PAR for roster rid from timeline index start_idx while pid stays on the roster.
    If pid isn't on the roster yet in the first week (trade processed after that week's snapshot),
    allow one week of grace before counting."""
    tot, by_season, weeks, starts = 0.0, collections.Counter(), 0, 0
    wl = []
    i = start_idx
    if i < len(TL) and pid not in mu[TL[i]][rid][0]: i += 1
    while i < len(TL):
        y, w = TL[i]
        players, starters = mu[(y, w)][rid]
        if pid not in players: break
        weeks += 1
        if pid in starters:
            starts += 1
            v = par_week(pid, y, w)
            tot += v; by_season[y] += v
            if v: wl.append((y, w, round(v, 1)))
        i += 1
    WEEKLY.append(wl)
    return round(tot, 1), {k: round(v, 1) for k, v in by_season.items()}, weeks, starts

# future picks (2027+): expected value from the Draft picks tab (picks760.json):
# expected starter PAR over a rookie's first season and a half, from the 2025 rookie-draft curve;
# 2027 at its projected slot, 2028-29 at the round average. Rounds beyond those use the curve's round average.
import math
_pk = json.load(open(f'{S}/picks760.json'))
_fv = {(p['season'], p['round'], p['orig_rid']): p['value'] for p in _pk['picks']}
_ca, _cb = _pk['curve']['a'], _pk['curve']['b']
def fut_value(season, rd, orig):
    if (season, rd, orig) in _fv: return _fv[(season, rd, orig)]
    return round(sum(max(0.0, _ca + _cb * math.log((rd - 1) * 12 + s)) for s in range(1, 13)) / 12, 1)
# rookie drafts: (season, round, original roster) -> pick
rookie_pick = {}
for y, did in DRAFTS.items():
    d = J(f'draft_{did}.json'); s2r = {int(k): v for k, v in d['slot_to_roster_id'].items()}
    for p in J(f'picks_{did}.json'):
        orig = s2r[p['draft_slot']]
        rookie_pick[(str(y), p['round'], orig)] = p
# sanity: traded_picks final owner == team that made the pick
for y, did in ROOKIE.items():
    L = SEASONS[y][0]
    for tp in J(f'{L}/traded_picks.json'):
        if tp['season'] == str(y):
            pk = rookie_pick[(tp['season'], tp['round'], tp['roster_id'])]
            assert pk['roster_id'] == tp['owner_id'], ('pick owner mismatch', tp, pk['roster_id'])

# collect trades
trades = []
for y, (L, _) in SEASONS.items():
    for w in range(1, 19):
        try: tx = J(f'{L}/tx_{w}.json')
        except FileNotFoundError: continue
        for t in tx:
            if t['type'] == 'trade' and t['status'] == 'complete':
                trades.append((y, t))
trades.sort(key=lambda x: x[1]['created'])

rookie_draft_end = {y: J(f'draft_{did}.json').get('last_picked') for y, did in DRAFTS.items()}

out_trades = []
for n, (y, t) in enumerate(trades, 1):
    leg = t['leg']
    created = datetime.datetime.fromtimestamp(t['created'] / 1000, datetime.timezone.utc)
    # start index on the timeline
    if leg > SEASONS[y][1]:
        nxt = [k for k in TL if k[0] > y]; sidx = TIDX[nxt[0]] if nxt else len(TL)
    else:
        sidx = TIDX[(y, leg)]
    sides = {rid: dict(rid=rid, owner=owner[rid], got=[], value=0.0, gave_value=0.0) for rid in t['roster_ids']}
    for pid, rid in (t.get('adds') or {}).items():
        v, bys, wks, starts = value_for(pid, rid, sidx)
        giver = (t.get('drops') or {}).get(pid)
        sides[rid]['got'].append(dict(kind='player', pid=pid, name=name(pid), pos=pos(pid), age=(P.get(pid) or {}).get('age'),
                                      value=v, by_season=bys, weeks=wks, starts=starts, from_rid=giver, wk=WEEKLY[-1]))
    for dp in t.get('draft_picks') or []:
        rid, giver = dp['owner_id'], dp['previous_owner_id']
        item = dict(kind='pick', season=dp['season'], round=dp['round'], orig_rid=dp['roster_id'], orig=owner[dp['roster_id']],
                    from_rid=giver, value=0.0, by_season={}, status=None)
        key = (dp['season'], dp['round'], dp['roster_id'])
        if int(dp['season']) >= 2027:
            item['status'] = 'future'
            item['value'] = fut_value(dp['season'], dp['round'], dp['roster_id'])
        elif key in rookie_pick:
            pk = rookie_pick[key]
            item['pick_no'] = pk['pick_no']; item['slot'] = pk['draft_slot']
            pid = pk['player_id']; item['pid'] = pid; item['name'] = name(pid); item['pos'] = pos(pid)
            item['made_by'] = pk['roster_id']
            # was the draft already done when this trade happened? then the "pick" is moot
            assert t['created'] <= rookie_draft_end[int(dp['season'])], ('pick traded after draft', n)
            if pk['roster_id'] == rid:
                item['status'] = 'used'
                first = (int(dp['season']), 1)
                si = max(TIDX[first], sidx)
                v, bys, wks, starts = value_for(pid, rid, si)
                item.update(value=v, by_season=bys, weeks=wks, starts=starts, wk=WEEKLY[-1])
            else:
                item['status'] = 'flipped'
                item['made_by_owner'] = owner[pk['roster_id']]
        else:
            item['status'] = 'missing'
        sides[rid]['got'].append(item)
    for wb in t.get('waiver_budget') or []:
        sides[wb['receiver']]['got'].append(dict(kind='faab', amount=wb['amount'], from_rid=wb['sender'], value=0.0, by_season={}))
    for rid in sides:
        sides[rid]['value'] = round(sum(a['value'] for a in sides[rid]['got']), 1)
    for rid, s in sides.items():
        s['gave_value'] = round(sum(a['value'] for r2, s2 in sides.items() if r2 != rid for a in s2['got'] if a['from_rid'] == rid), 1)
        s['net'] = round(s['value'] - s['gave_value'], 1)
    ordered = sorted(sides.values(), key=lambda s: -s['value'])
    margin = round(ordered[0]['value'] - ordered[1]['value'], 1)
    assets = [a for s in sides.values() for a in s['got']]
    young = sum(1 for a in assets if (a['kind'] == 'pick' and (a['status'] == 'future' or a['season'] == '2026'))
                or (a['kind'] == 'player' and (P.get(a['pid']) or {}).get('years_exp') == 0 and y == 2026))
    early = young * 2 > len(assets)
    verdict = 'close' if margin < CLOSE else ('early' if early else 'win')
    out_trades.append(dict(n=n, season=y, week=leg, date=created.strftime('%Y-%m-%d'), ts=t['created'],
                           sides=list(sides.values()), margin=margin, winner=ordered[0]['rid'] if verdict == 'win' else None,
                           leader=ordered[0]['rid'], verdict=verdict, n_assets=len(assets), n_young=young, early=early))

# follow-through: something received and later traded on is credited with what it brought back
sys.path.insert(0, f'{S}/scripts')
from followthrough import follow_through
follow_through(out_trades, to_of=lambda s: s['rid'], from_of=lambda a: a['from_rid'])
for t in out_trades:
    ordered = sorted(t['sides'], key=lambda s: -s['value'])
    t['margin'] = round(ordered[0]['value'] - ordered[1]['value'], 1)
    t['leader'] = ordered[0]['rid']
    t['verdict'] = 'close' if t['margin'] < CLOSE else ('early' if t['early'] else 'win')
    t['winner'] = t['leader'] if t['verdict'] == 'win' else None

# per team
teams = {}
for rid in sorted(owner):
    mine = [(t, next(s for s in t['sides'] if s['rid'] == rid)) for t in out_trades if rid in [s['rid'] for s in t['sides']]]
    partners = collections.Counter(s['rid'] for t, _ in mine for s in t['sides'] if s['rid'] != rid)
    w = sum(1 for t, s in mine if t['verdict'] == 'win' and t['winner'] == rid)
    l = sum(1 for t, s in mine if t['verdict'] == 'win' and t['winner'] != rid)
    c = sum(1 for t, s in mine if t['verdict'] != 'win')
    best = max(mine, key=lambda x: x[1]['net_attr'])
    worst = min(mine, key=lambda x: x[1]['net_attr'])
    top_p = partners.most_common()
    teams[rid] = dict(rid=rid, owner=owner[rid], me=rid == ME_RID, n=len(mine), net=round(sum(s['net_attr'] for _, s in mine), 1),
                      got=round(sum(s['recv_attr'] for _, s in mine), 1), gave=round(sum(s['gave_attr'] for _, s in mine), 1),
                      net_direct=round(sum(s['net_direct'] for _, s in mine), 1),
                      w=w, l=l, c=c, best=best[0]['n'], best_net=best[1]['net_attr'], worst=worst[0]['n'], worst_net=worst[1]['net_attr'],
                      partner=[owner[p] for p, k in top_p if k == top_p[0][1]], partner_n=top_p[0][1],
                      by_season={yy: round(sum(s['net'] for t, s in mine if True for a in [0] if False), 1) for yy in SEASONS})
    # value received per season (when produced), for title checks
    got_by = collections.Counter()
    for t, s in mine:
        for a in s['got']:
            for yy, v in a['by_season'].items(): got_by[yy] += v
    lost_by = collections.Counter()
    for t, s in mine:
        for s2 in t['sides']:
            if s2['rid'] == rid: continue
            for a in s2['got']:
                if a['from_rid'] == rid:
                    for yy, v in a['by_season'].items(): lost_by[yy] += v
    teams[rid]['got_by'] = {yy: round(got_by[yy], 1) for yy in SEASONS}
    teams[rid]['lost_by'] = {yy: round(lost_by[yy], 1) for yy in SEASONS}

# records, titles
rec = {}
for y, (L, _) in SEASONS.items():
    for r in J(f'{L}/rosters.json'):
        s = r['settings']; rec.setdefault(r['roster_id'], {})[y] = dict(w=s.get('wins', 0), l=s.get('losses', 0),
                                                                          pf=round(s.get('fpts', 0) + s.get('fpts_decimal', 0) / 100, 2))
titles = {}
for y in (2024, 2025):
    wb = J(f'{SEASONS[y][0]}/winners_bracket.json')
    f = next(m for m in wb if m.get('p') == 1)
    titles[y] = dict(champ=f['w'], runner=f['l'])
for rid in teams: teams[rid]['rec'] = rec[rid]

# startup-draft fit (same as the draft page): wins ~ voe_total
dyn = json.load(open(f'{S}/dyn_out.json'))
dt = {t['rid']: t for t in dyn['teams']}
wins = lambda rid: sum(rec[rid][y]['w'] for y in SEASONS)
xs = [dt[r]['voe_total'] for r in teams]; ys = [wins(r) for r in teams]
mx, my = st.mean(xs), st.mean(ys)
b = sum((a - mx) * (c - my) for a, c in zip(xs, ys)) / sum((a - mx) ** 2 for a in xs)
a0 = my - b * mx
for rid in teams:
    teams[rid]['wins'] = wins(rid); teams[rid]['pred'] = round(a0 + b * dt[rid]['voe_total'], 2)
    teams[rid]['resid'] = round(wins(rid) - teams[rid]['pred'], 2)
    teams[rid]['draft_voe'] = dt[rid]['voe_total']

# wins per point of PF over all three seasons (team level)
pfs = [sum(rec[r][y]['pf'] for y in SEASONS) for r in teams]
mpf = st.mean(pfs)
bpf = sum((p - mpf) * (c - my) for p, c in zip(pfs, ys)) / sum((p - mpf) ** 2 for p in pfs)

def corr(x, y):
    mx_, my_ = st.mean(x), st.mean(y)
    return sum((a - mx_) * (b_ - my_) for a, b_ in zip(x, y)) / (sum((a - mx_) ** 2 for a in x) * sum((b_ - my_) ** 2 for b_ in y)) ** 0.5

T = list(teams.values())
stats = dict(
    n_trades=len(out_trades),
    by_season=dict(collections.Counter(t['season'] for t in out_trades)),
    n_future=sum(1 for t in out_trades for s in t['sides'] for a in s['got'] if a['kind'] == 'pick' and a['status'] == 'future'),
    n_picks=sum(1 for t in out_trades for s in t['sides'] for a in s['got'] if a['kind'] == 'pick'),
    n_flipped=sum(1 for t in out_trades for s in t['sides'] for a in s['got'] if a['kind'] == 'pick' and a['status'] == 'flipped'),
    n_used=sum(1 for t in out_trades for s in t['sides'] for a in s['got'] if a['kind'] == 'pick' and a['status'] == 'used'),
    n_missing=sum(1 for t in out_trades for s in t['sides'] for a in s['got'] if a['kind'] == 'pick' and a['status'] == 'missing'),
    n_players=sum(1 for t in out_trades for s in t['sides'] for a in s['got'] if a['kind'] == 'player'),
    verdicts=dict(collections.Counter(t['verdict'] for t in out_trades)),
    corr_n_net=round(corr([t['n'] for t in T], [t['net'] for t in T]), 2),
    corr_net_resid=round(corr([t['net'] for t in T], [t['resid'] for t in T]), 2),
    corr_got_resid=round(corr([t['got'] for t in T], [t['resid'] for t in T]), 2),
    fit=dict(a=round(a0, 3), b=round(b, 5)), wins_per_pf=round(bpf, 5),
    total_value=round(sum(s['value'] for t in out_trades for s in t['sides']), 1),
    repl_avg={p: round(st.mean(repl[(y, w, p)] for y, w in TL), 1) for p in REPL},
)
json.dump(dict(trades=out_trades, teams=T, titles=titles, stats=stats), open(f'{S}/trades_out.json', 'w'))

# ---- print for review
print(json.dumps(stats, indent=1))
print('titles', titles)
for t in out_trades:
    print(f"#{t['n']:2} {t['date']} {t['season']} wk{t['week']:2} {t['verdict']:5} margin {t['margin']:6.1f} young {t['n_young']}/{t['n_assets']}")
    for s in t['sides']:
        items = []
        for a in s['got']:
            if a['kind'] == 'player': items.append(f"{a['name']}({a['pos']}) {a['value']} [{a['starts']}st/{a['weeks']}wk]")
            elif a['kind'] == 'faab': items.append(f"FAAB ${a['amount']}")
            else: items.append(f"{a['season']} R{a['round']}({a['orig']}) {a['status']} {a.get('name','')} {a['value']}")
        print(f"     {s['owner']:15} got {s['value']:6.1f} net {s['net']:6.1f}: " + '; '.join(items))
for t in sorted(T, key=lambda t: -t['net']):
    print(f"{t['owner']:15} n={t['n']:2} net {t['net']:7.1f} got {t['got']:7.1f} gave {t['gave']:7.1f} W{t['w']}-L{t['l']}-C{t['c']} best #{t['best']} {t['best_net']} worst #{t['worst']} {t['worst_net']} partner {t['partner']}x{t['partner_n']} wins {t['wins']} pred {t['pred']} resid {t['resid']} got_by {t['got_by']} lost_by {t['lost_by']}")
