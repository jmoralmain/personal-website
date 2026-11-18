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
ranked = sorted(d['teams'], key=lambda t: -t['net'])
best, worst = ranked[0], ranked[-1]
assert best['owner'] == 'Bengraz03' and r(best['net']) == 413 and r(best['got']) == 897 and r(best['gave']) == 484
assert (best['w'], best['l'], best['c'], best['n']) == (4, 3, 6, 13)
assert worst['owner'] == 'GAVINKIRK' and r(worst['net']) == -335 and r(worst['got']) == 478 and r(worst['gave']) == 813
assert (worst['w'], worst['l'], worst['c'], worst['n']) == (4, 7, 2, 13)
lop = max((t for t in d['trades'] if t['verdict'] != 'close'), key=lambda t: t['margin'])
assert lop['n'] == 9 and r(lop['margin']) == 408 and r(lop['sides'][0]['value']) == 425 and r(lop['sides'][1]['value']) == 17
assert st['n_trades'] == 60 and st['by_season'] == {'2024': 14, '2025': 28, '2026': 18} or st['by_season'] == {2024: 14, 2025: 28, 2026: 18}
assert st['n_future'] == 37 and st['n_players'] == 103 and st['n_picks'] == 101
assert st['verdicts'] == {'close': 16, 'win': 33, 'early': 11}
mm, me = by('masonmay'), by('mynameisuser')
assert r(mm['net']) == 344 and round(mm['resid'], 1) == 4.9 and round(mm['wins_from_trades'], 1) == 4.9 and mm['n'] == 17
assert r(me['net']) == -215 and round(me['resid'], 1) == -4.6 and round(me['wins_from_trades'], 1) == -3.0 and me['n'] == 14
assert [r(mm['net_by'][y]) for y in ('2024', '2025', '2026')] == [86, 295, -36], mm['net_by']
assert [r(me['net_by'][y]) for y in ('2024', '2025', '2026')] == [-70, 57, -202], me['net_by']
assert round(1 / st['wins_per_pf']) == 71 and st['corr_net_resid'] == 0.79 and st['corr_n_net'] == 0.15
bg_from_me = sum(next(s['net'] for s in t['sides'] if s['rid'] == 3) for t in d['trades'] if {s['rid'] for s in t['sides']} == {3, 12})
assert r(bg_from_me) == 302, bg_from_me
assert r(worst['lost_by']['2025']) == 507 and r(worst['got_by']['2025']) == 194
assert r(TR[13]['margin']) == 276 and r(TR[25]['margin']) == 239 and r(TR[21]['margin']) == 195
k24 = ti['2024']['teams']['7']['got'][0]
assert k24['name'] == 'Derrick Henry' and r(k24['season']) == 41 and r(k24['playoffs']) == 27 and k24['final'] == 16.5
fs24, fs25 = ti['2024']['final_score'], ti['2025']['final_score']
assert r(fs24['7'] - fs24['9']) == 78 and r(fs25['11'] - fs25['5']) == 88
busy = sorted(d['teams'], key=lambda t: -t['n'])[:4]
assert [t['owner'] for t in busy] == ['masonmay', 'mynameisuser', 'Bengraz03', 'GAVINKIRK'], [t['owner'] for t in busy]

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
