"""Build page4/trades.html from trades_out.json + titles_out.json.
Usage: python3 -I build_trades.py <scratch_dir>"""
import json, sys, os, collections
S = sys.argv[1]
d = json.load(open(f'{S}/trades_out.json'))
ti = json.load(open(f'{S}/titles_out.json'))
T = {t['rid']: t for t in d['teams']}
TR = {t['n']: t for t in d['trades']}
st = d['stats']
by = lambda o: next(t for t in d['teams'] if t['owner'] == o)

# per-season net per team
for t in d['teams']:
    t['net_by'] = {y: round(t['got_by'][y] - t['lost_by'][y], 1) for y in t['got_by']}
    t['wins_from_trades'] = t['net'] * st['wins_per_pf']
    t['wins_by'] = {y: t['rec'][y]['w'] for y in t['rec']}
    t['loss_by'] = {y: t['rec'][y]['l'] for y in t['rec']}

# ---- checks for every number used in the copy
import math
r = lambda v: math.floor(v + 0.5)  # JS Math.round
for t in d['teams']: t['net_fut'] = round(t['net'] - sum(t['net_by'].values()), 1)
ranked = sorted(d['teams'], key=lambda t: -t['net'])
best, worst = ranked[0], ranked[-1]
assert best['owner'] == 'masonmay' and r(best['net']) == 408 and r(best['got']) == 1122 and r(best['gave']) == 714
assert (best['w'], best['l'], best['c'], best['n']) == (7, 5, 5, 17) and best['worst'] == 36 and r(best['worst_net']) == -151
assert ranked[1]['owner'] == 'Bengraz03' and r(ranked[1]['net']) == 343
assert worst['owner'] == 'GAVINKIRK' and r(worst['net']) == -364 and r(worst['got']) == 609 and r(worst['gave']) == 973
assert (worst['w'], worst['l'], worst['c'], worst['n']) == (3, 8, 3, 14)
gk = sorted((r(next(s['net'] for s in t['sides'] if s['rid'] == worst['rid'])), t['n']) for t in d['trades'] if worst['rid'] in [s['rid'] for s in t['sides']])
assert gk[:2] == [(-276, 13), (-63, 49)], gk[:2]
lop = max((t for t in d['trades'] if t['verdict'] != 'close'), key=lambda t: t['margin'])
assert lop['n'] == 9 and r(lop['margin']) == 408
assert st['n_trades'] == 63 and st['n_future'] == 45 and [x['verdict'] for x in d['trades'][-3:]] == ['early'] * 3
assert [t['n'] for t in sorted([t for t in d['trades'] if t['verdict'] != 'close'], key=lambda t: -t['margin'])[:5]] == [9, 13, 25, 36, 32]
assert r(TR[36]['margin']) == 151 and r(TR[32]['margin']) == 140
mm, me = by('masonmay'), by('mynameisuser')
assert round(mm['resid'], 1) == 4.9 and round(mm['wins_from_trades'], 1) == 5.8
assert r(me['net']) == 30 and round(me['resid'], 1) == -4.6 and me['n'] == 15 and r(TR[63]['margin']) == 35
assert [r(mm['net_by'][y]) for y in ('2024', '2025', '2026')] == [86, 295, -36], mm['net_by']
assert [r(me['net_by'][y]) for y in ('2024', '2025', '2026')] == [-70, 57, -202], me['net_by']
assert round(1 / st['wins_per_pf']) == 71 and st['corr_net_resid'] == 0.62 and st['corr_n_net'] == 0.32
fut = [a for t in d['trades'] for s in t['sides'] for a in s['got'] if a['kind'] == 'pick' and a['status'] == 'future']
assert r(sum(a['value'] for a in fut)) == 1355
assert r(worst['lost_by']['2025']) == 507 and r(worst['got_by']['2025']) == 194
assert r(TR[13]['margin']) == 276 and r(TR[25]['margin']) == 239
k24 = ti['2024']['teams']['7']['got'][0]
assert k24['name'] == 'Derrick Henry' and r(k24['season']) == 41 and r(k24['playoffs']) == 27 and k24['final'] == 16.5
fs24, fs25 = ti['2024']['final_score'], ti['2025']['final_score']
assert r(fs24['7'] - fs24['9']) == 78 and r(fs25['11'] - fs25['5']) == 88
busy = sorted(d['teams'], key=lambda t: -t['n'])[:4]
assert sorted((t['owner'], t['n'], r(t['net'])) for t in busy) == sorted([('masonmay', 17, 408), ('Bengraz03', 15, 343), ('mynameisuser', 15, 30), ('GAVINKIRK', 14, -364)])

data = dict(trades=d['trades'], teams=d['teams'], titles=ti, stats=st)
# trim weekly detail to keep the page small
for t in data['trades']:
    for s in t['sides']:
        for a in s['got']: a.pop('wk', None)
src = open(f'{S}/scripts/trades.src.html').read()
html = src.replace('__DATA__', json.dumps(data, separators=(',', ':')))
os.makedirs(f'{S}/page4', exist_ok=True)
open(f'{S}/page4/trades.html', 'w').write(html)
print('built', len(html))
