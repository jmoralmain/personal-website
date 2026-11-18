"""Title-impact check: what traded-in assets produced for the finalists in each title season.
Usage: python3 -I titles.py <scratch_dir>"""
import json, sys, collections
S = sys.argv[1]
d = json.load(open(f'{S}/trades_out.json'))
SEASONS = {2024: '1098388508928032768', 2025: '1180453968974659584'}
out = {}
for y, L in SEASONS.items():
    wb = json.load(open(f'{S}/dyn/{L}/winners_bracket.json'))
    fin = next(m for m in wb if m.get('p') == 1)
    champ, runner = fin['w'], fin['l']
    # final week = last round
    rnd = fin['r']; fw = 14 + rnd
    mu = {m['roster_id']: m for m in json.load(open(f'{S}/dyn/{L}/mu_{fw}.json'))}
    score = {r: mu[r]['points'] for r in (champ, runner)}
    res = dict(champ=champ, runner=runner, final_week=fw, final_score=score, teams={})
    for rid in (champ, runner):
        rows = []
        for t in d['trades']:
            for s in t['sides']:
                if s['rid'] != rid: continue
                for a in s['got']:
                    wk = a.get('wk') or []
                    seas = sum(v for yy, w, v in wk if yy == y)
                    po = sum(v for yy, w, v in wk if yy == y and w >= 15)
                    fv = sum(v for yy, w, v in wk if yy == y and w == fw)
                    if seas: rows.append(dict(trade=t['n'], name=a.get('name'), season=round(seas, 1), playoffs=round(po, 1), final=round(fv, 1)))
            # assets this team gave away that produced for others in season y
        gave = []
        for t in d['trades']:
            for s in t['sides']:
                if s['rid'] == rid: continue
                for a in s['got']:
                    if a.get('from_rid') != rid: continue
                    seas = sum(v for yy, w, v in (a.get('wk') or []) if yy == y)
                    if seas: gave.append(dict(trade=t['n'], name=a.get('name'), to=s['owner'], season=round(seas, 1)))
        res['teams'][rid] = dict(got=rows, gave=gave)
    out[y] = res
json.dump(out, open(f'{S}/titles_out.json', 'w'))
print(json.dumps(out, indent=1))
