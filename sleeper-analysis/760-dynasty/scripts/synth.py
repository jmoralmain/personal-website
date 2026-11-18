"""Synthesis of the 760 Dynasty reviews: startup draft, trades, 2025 and 2026 rookie drafts.
All decision values are in points above replacement (PAR), the unit every page uses.
Usage: python3 -I synth.py <scratchpad> <out_json>
"""
import json, sys, collections, statistics as st
S, OUT = sys.argv[1], sys.argv[2]
J = lambda f: json.load(open(f'{S}/{f}'))
dyn, tr, r25, r26 = J('dyn_out.json'), J('trades_out.json'), J('scripts/rk25.json'), J('rk26.json')
L26 = '1336088004720099328'

def by_rid(teams, key='rid'):
    return {t[key]: t for t in teams}
D, T, R5, R6 = by_rid(dyn['teams']), by_rid(tr['teams']), by_rid(r25['teams']), by_rid(r26['teams'])
r25_key = 'vos' if 'vos' in next(iter(R5.values())) else None
assert r25_key, list(next(iter(R5.values())).keys())

# future picks owned (2027-2029): default one per round per team, then apply traded picks
own = {(y, rd, rid): rid for y in ('2027', '2028', '2029') for rd in (1, 2, 3) for rid in D}
for p in J(f'dyn/{L26}/traded_picks.json'):
    if p['season'] in ('2027', '2028', '2029'):
        own[(p['season'], p['round'], p['roster_id'])] = p['owner_id']
fut = collections.defaultdict(lambda: collections.Counter())
for (y, rd, orig), cur in own.items():
    fut[cur][rd] += 1

rows = []
for rid in sorted(D):
    d, t = D[rid], T[rid]
    w = sum(d['rec'][y]['w'] for y in ('2024', '2025', '2026')); l = sum(d['rec'][y]['l'] for y in ('2024', '2025', '2026'))
    comp = dict(startup=round(d['voe_total'], 1), trades=round(t['net'], 1), r25=round(R5[rid][r25_key], 1), r26=round(R6[rid]['vos'], 1))
    rows.append(dict(rid=rid, owner=d['owner'], me=d['me'], **comp, total=round(sum(comp.values()), 1),
        wins=w, losses=l, rec=d['rec'], playoffs=d['playoffs'], titles=d['titles'], finals=d['finals'],
        n_trades=t['n'], firsts=fut[rid][1], seconds=fut[rid][2], thirds=fut[rid][3],
        pf26=round(d['rec']['2026']['pf'], 1)))
# wins explained by decisions
xs = [r['total'] for r in rows]; ys = [r['wins'] for r in rows]
mx, my = st.mean(xs), st.mean(ys)
b = sum((a - mx) * (c - my) for a, c in zip(xs, ys)) / sum((a - mx) ** 2 for a in xs); a0 = my - b * mx
corr = sum((a - mx) * (c - my) for a, c in zip(xs, ys)) / (sum((a - mx) ** 2 for a in xs) ** .5 * sum((c - my) ** 2 for c in ys) ** .5)
for r in rows:
    r['pred'] = round(a0 + b * r['total'], 1); r['resid'] = round(r['wins'] - r['pred'], 1)
# ranks per component (1 = best)
for k in ('startup', 'trades', 'r25', 'r26', 'total', 'wins', 'firsts', 'pf26'):
    for i, r in enumerate(sorted(rows, key=lambda r: -r[k])): r.setdefault('rank', {})[k] = i + 1
out = dict(rows=rows, fit=dict(a=round(a0, 3), b=round(b, 5), corr=round(corr, 2)))
json.dump(out, open(OUT, 'w'))
print(f'wins = {a0:.2f} + {b:.4f} * total   corr {corr:.2f}')
for r in sorted(rows, key=lambda r: -r['total']):
    print(f"{r['owner'][:14]:14}{' ME' if r['me'] else '   '} total {r['total']:7.1f} | startup {r['startup']:7.1f} trades {r['trades']:7.1f} r25 {r['r25']:6.1f} r26 {r['r26']:6.1f} | "
          f"W {r['wins']}-{r['losses']} pred {r['pred']} resid {r['resid']:+.1f} | 2026 {r['rec']['2026']['w']}-{r['rec']['2026']['l']} pf {r['pf26']} | titles {r['titles']} | future 1sts {r['firsts']} 2nds {r['seconds']} 3rds {r['thirds']} | trades {r['n_trades']}")
