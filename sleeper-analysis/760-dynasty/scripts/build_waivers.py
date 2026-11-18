"""Build the Waivers view and add waiver value to the Overall view (shown beside the total, not in it)."""
import json, sys
S = sys.argv[1]
w = json.load(open(f'{S}/waivers760.json'))

src = f'{S}/page4/waivers.src.html'
s = open(src).read()
a, b = ("<p>The 15 adds that produced the most for the team that made them. Most were cheap: only four cost more than $20.</p>",
        "<p>The 15 adds that produced the most for the team that made them. Most were cheap: only two cost more than $20.</p>")
if a in s: s = s.replace(a, b)
assert b in s
open(src, 'w').write(s)
open(f'{S}/page4/waivers.html', 'w').write(s.replace('__WAIVERS__', json.dumps(w, separators=(',', ':'))))

# Overall: add a waivers column and one sentence
syn = json.load(open(f'{S}/synth.json'))
net = {t['owner']: t['net'] for t in w['teams']}
for r in syn['rows']: r['waivers'] = round(net[r['owner']], 1)
json.dump(syn, open(f'{S}/synth.json', 'w'))
o = f'{S}/page5/overall.src.html'
t = open(o).read()
reps = [
    ('<th class="r">2026 rookies (early)</th><th class="r">Wins 24–26</th>',
     '<th class="r">2026 rookies (early)</th><th class="r">Waivers (not in total)</th><th class="r">Wins 24–26</th>'),
    ("<td class=\"r\">${sign(t.startup)}</td><td class=\"r\">${sign(t.trades)}</td><td class=\"r\">${sign(t.r25)}</td><td class=\"r\">${sign(t.r26)}</td>",
     "<td class=\"r\">${sign(t.startup)}</td><td class=\"r\">${sign(t.trades)}</td><td class=\"r\">${sign(t.r25)}</td><td class=\"r\">${sign(t.r26)}</td><td class=\"r dim\">${sign(t.waivers)}</td>"),
    ("The 2026 tab grades on raw points instead, so its order differs. \"Predicted\" is wins from the fit above.</p>",
     "The 2026 tab grades on raw points instead, so its order differs. \"Predicted\" is wins from the fit above. Waivers: net value from the Waivers tab, shown for reference. Waiver results show no relationship with wins (correlation −0.12), so they stay out of the total.</p>"),
]
for x, y in reps:
    if x in t: t = t.replace(x, y)
    else: assert y in t, x[:60]
if '.dim {' not in t:
    t = t.replace('.num { font-family: var(--f-mono); font-variant-numeric: tabular-nums; }', '.num { font-family: var(--f-mono); font-variant-numeric: tabular-nums; }\n.dim { color: var(--muted); }', 1)
open(o, 'w').write(t)
open(f'{S}/page5/overall.html', 'w').write(t.replace('__SYNTH__', json.dumps(syn)))

# Merge config: add the Waivers view after Trades
m = f'{S}/scripts/merge_dyn.py'
mt = open(m).read()
if "'page4/waivers.html'" not in mt:
    mt = mt.replace("         ('rookies-2025', 'page4/rookies-2025.html',", "         ('waivers', 'page4/waivers.html', 'Waivers', '760 Dynasty Waivers'),\n         ('rookies-2025', 'page4/rookies-2025.html',")
    mt = mt.replace("       '<a href=\"#rookies-2025\" data-view=\"rookies-2025\">2025 rookie draft</a>'",
                    "       '<a href=\"#waivers\" data-view=\"waivers\">Waivers</a>'\n       '<a href=\"#rookies-2025\" data-view=\"rookies-2025\">2025 rookie draft</a>'")
    assert "'page4/waivers.html'" in mt and 'data-view="waivers"' in mt
    open(m, 'w').write(mt)
print('built')
