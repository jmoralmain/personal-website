"""Build the Draft picks view, add it to the merged 760 page, and point the Overall outlook at it."""
import json, sys
S = sys.argv[1]
src = f'{S}/page4/picks.src.html'
s = open(src).read()
a, b = ("<p>14 picks after 7 came in, the most of any team, though mostly seconds and thirds.",
        "<p>7 picks came in, more than any other team, for 14 in all, though mostly seconds and thirds.")
if a in s: s = s.replace(a, b)
assert b in s
open(src, 'w').write(s)
open(f'{S}/page4/picks.html', 'w').write(s.replace('__PICKS__', open(f'{S}/picks760.json').read()))

o = f'{S}/page5/overall.src.html'
t = open(o).read()
a, b = ("<p class=\"note\">Future picks come from Sleeper's traded-picks list for the league on 18 November 2026. Points scored is the 2026 regular season through week 10.</p>",
        "<p class=\"note\">Future picks come from Sleeper's traded-picks list for the league on 18 November 2026. Points scored is the 2026 regular season through week 10. The Draft picks tab covers every round, with values and the projected 2027 order.</p>")
if a in t: t = t.replace(a, b)
assert b in t
open(o, 'w').write(t)
open(f'{S}/page5/overall.html', 'w').write(t.replace('__SYNTH__', open(f'{S}/synth.json').read()))

m = f'{S}/scripts/merge_dyn.py'
mt = open(m).read()
if "'page4/picks.html'" not in mt:
    mt = mt.replace("         ('rookies-2025', 'page4/rookies-2025.html',", "         ('picks', 'page4/picks.html', 'Draft picks', '760 Dynasty Draft Picks'),\n         ('rookies-2025', 'page4/rookies-2025.html',")
    mt = mt.replace("       '<a href=\"#rookies-2025\" data-view=\"rookies-2025\">2025 rookie draft</a>'",
                    "       '<a href=\"#picks\" data-view=\"picks\">Draft picks</a>'\n       '<a href=\"#rookies-2025\" data-view=\"rookies-2025\">2025 rookie draft</a>'")
    assert "'page4/picks.html'" in mt and 'data-view="picks"' in mt
    open(m, 'w').write(mt)
for f, old, new in ((f'{S}/scripts/merge_test.js', "'waivers', 'grades'", "'waivers', 'picks', 'grades'"),
                    (f'{S}/scripts/neutral_test.js', "'waivers', 'rookies-2025'", "'waivers', 'picks', 'rookies-2025'")):
    x = open(f).read()
    if new not in x:
        assert old in x, f; open(f, 'w').write(x.replace(old, new))
print('built')
