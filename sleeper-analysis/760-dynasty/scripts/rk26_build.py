"""Enrich rk26.json for the page and inject into the HTML template.
Usage: python3 -I rk26_build.py <rk26.json> <players_json> <template.html> <out.html>
Adds points over slot (2026 points minus mean points of picks within +-3), trade chains
for each pick, grades, and summary numbers. Prints everything the copy cites.
"""
import json, sys, statistics as st, collections

SRC, PJ, TPL, OUT = sys.argv[1:5]
d = json.load(open(SRC)); P = json.load(open(PJ))
rows, teams, N = d['rows'], d['teams'], d['names']
pname = lambda pid: (P.get(pid) or {}).get('full_name') or pid

for i, r in enumerate(rows):
    win = rows[max(0, i - 3): i + 4]
    r['pexp'] = round(st.mean(x['pts'] for x in win), 1); r['pos_'] = round(r['pts'] - r['pexp'], 1)
    r['reg'] = r['st2'] >= 3  # weekly starter in 3+ of weeks 6-10

# trade chain for each pick (round, original roster)
chains = collections.defaultdict(list)
for t in d['pick_trades']:
    for pk in t['picks26']:
        got = [pname(p) for p, rid in t['adds'].items() if rid == pk['frm']]
        other = [f"{o['season']} R{o['rd']}" for o in t['other'] if o['to'] == pk['frm']]
        other += [f"2026 R{o['rd']} ({N[str(o['orig'])]})" for o in t['picks26'] if o['to'] == pk['frm']]
        chains[(pk['rd'], pk['orig'])].append(dict(frm=N[str(pk['frm'])], to=N[str(pk['to'])], season=t['yr'], w=t['w'], got=got + other))
for r in rows:
    r['chain'] = chains.get((r['rd'], r['orig']), [])
    r['traded'] = r['orig'] != r['rid']

# post-draft trades of drafted players
pid2row = {r['pid']: r for r in rows}
post = []
for t in d['post_trades']:
    for pid, to in t['adds'].items():
        if pid in pid2row:
            frm = t['drops'][pid]; back = [pname(p) for p, rid in t['adds'].items() if rid == frm] + [f"{x['season']} R{x['round']} ({N[str(x['roster_id'])]})" for x in t['picks'] if x['owner_id'] == frm]; also = [f"{x['season']} R{x['round']} ({N[str(x['roster_id'])]})" for x in t['picks'] if x['previous_owner_id'] == frm]
            post.append(dict(pick=pid2row[pid]['pick'], name=pid2row[pid]['name'], frm=N[str(frm)], to=N[str(to)], w=t['w'], got=back, also=also))
post.sort(key=lambda x: x['pick'])

def grade(v):
    for cut, g in ((75, 'A'), (40, 'B+'), (15, 'B'), (-15, 'C'), (-30, 'C−'), (-45, 'D')):
        if v >= cut: return g
    return 'D−'
for t in teams:
    mine = [r for r in rows if r['rid'] == t['rid']]
    t['pos_'] = round(sum(r['pos_'] for r in mine), 1); t['grade'] = grade(t['pos_'])
    t['best'] = max(mine, key=lambda r: (r['pos_'], r['vos']))['pick']; t['worst'] = min(mine, key=lambda r: (r['pos_'], r['vos']))['pick']
    t['traded_in'] = sum(1 for r in mine if r['traded']); t['traded_out'] = sum(1 for r in rows if r['orig'] == t['rid'] and r['traded'])

out = dict(rows=rows, teams=teams, repl=d['repl'], post=post)
html = open(TPL).read().replace('__DATA__', json.dumps(out, separators=(',', ':'), ensure_ascii=False))
open(OUT, 'w').write(html)

# ---- numbers for the copy ----
T = sorted(teams, key=lambda t: -t['pos_'])
for t in T:
    print(f"{t['grade']:3} {t['owner'][:14]:14} n{t['n']} ptsOS {t['pos_']:7.1f} VOS {t['vos']:6.1f} pts {t['pts']:6.1f} stW {t['starter_wks']} started {t['started']} still {t['still']}/{t['n']} in {t['traded_in']} out {t['traded_out']} {t['w']}-{t['l']} best #{t['best']} worst #{t['worst']}")
print('above repl', sum(1 for r in rows if r['par'] > 0), 'any starter wk', sum(1 for r in rows if r['starter_wks'] > 0), 'zero gp', [r['name'] for r in rows if r['gp'] == 0], 'zero pts', sum(1 for r in rows if r['pts'] == 0))
print('regular starters wk6-10', [(r['name'], r['st2']) for r in rows if r['reg']])
print('total pts', round(sum(r['pts'] for r in rows), 1), 'r1 pts', round(sum(r['pts'] for r in rows if r['rd'] == 1), 1), 'r2', round(sum(r['pts'] for r in rows if r['rd'] == 2), 1), 'r3', round(sum(r['pts'] for r in rows if r['rd'] == 3), 1))
for pos in ('QB', 'RB', 'WR', 'TE'):
    g = [r for r in rows if r['pos'] == pos]
    print(pos, len(g), 'pts', round(sum(r['pts'] for r in g), 1), 'avg pos_', round(st.mean(r['pos_'] for r in g), 1), [r['name'] for r in g])
print('started by drafter total', sum(r['started_drafter'] for r in rows), 'still with drafter', sum(1 for r in rows if r['now_rid'] == r['rid']))
print('traded picks', sum(1 for r in rows if r['traded']))
for r in rows:
    if r['traded']:
        print(f"#{r['pick']} {r['name']} {r['orig_owner']} -> {r['owner']} pts {r['pts']} pos_ {r['pos_']} chain", [(c['frm'], c['to'], c['season'], c['w'], c['got']) for c in r['chain']])
print('post', post)
tr = sorted([r for r in rows if r['ppg1'] is not None and r['ppg2'] is not None and r['gp1'] >= 2 and r['gp2'] >= 2], key=lambda r: r['ppg2'] - r['ppg1'])
print('falling', [(r['name'], r['ppg1'], r['ppg2'], r['gp1'], r['gp2']) for r in tr[:6]])
print('rising', [(r['name'], r['ppg1'], r['ppg2'], r['gp1'], r['gp2']) for r in tr[::-1][:8]])
for r in rows: print(r['pick'], r['name'], r['weeks'], r['gp1'], r['gp2'])
