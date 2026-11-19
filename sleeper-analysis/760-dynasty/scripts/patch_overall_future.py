"""760 Overall page: copy for trade values that now include future picks at expected value."""
import json, sys, math
S = sys.argv[1]
r = lambda v: math.floor(v + 0.5)
syn = json.load(open(f'{S}/synth.json'))
R0 = {x['owner']: x for x in syn['rows']}
ranked = sorted(syn['rows'], key=lambda x: -x['total'])
# checks for every number below
assert [x['owner'] for x in ranked[:2]] == ['DrKnockerzz', 'Perriconejp'] and ranked[-1]['owner'] == 'deathreaper439'
assert r(R0['Perriconejp']['total']) == 337 and r(R0['DrKnockerzz']['total']) == 472 and r(R0['deathreaper439']['total']) == -794
assert r(ranked[-1]['total'] - ranked[-2]['total']) == -521 and r(R0['deathreaper439']['trades']) == -139
assert R0['DrKnockerzz']['resid'] == -4.0 and R0['Perriconejp']['resid'] == 4.7 and syn['fit']['corr'] == 0.86 and r(1 / syn['fit']['b']) == 78
assert r(R0['masonmay']['trades']) == 408 and r(R0['Bengraz03']['trades']) == 343 and r(R0['ryanoleson5']['trades']) == 200
assert R0['KDEMPSTER15']['rank']['total'] == 4 and R0['GAVINKIRK']['rank']['total'] == 8 and r(R0['GAVINKIRK']['trades']) == -406
assert r(R0['Perriconejp']['trades']) == -162 and r(R0['DrKnockerzz']['trades']) == -25 and r(R0['brookseleven']['trades']) == 216
assert {x['owner'] for x in ranked[-4:]} == {'brookseleven', 'TannerMenning', 'mynameisuser', 'deathreaper439'}
assert r(R0['mynameisuser']['trades']) == -5 and R0['mynameisuser']['resid'] == -4.7
o = f'{S}/page5/overall.src.html'
t = open(o).read()
reps = [
 ("<li><strong>+472 from its decisions,</strong> 8 behind DrKnockerzz, with by far the best results: 28-10, playoffs in both full seasons, and 9-1 this year.</li>",
  "<li><strong>+337 from its decisions,</strong> second to DrKnockerzz, with by far the best results: 28-10, playoffs in both full seasons, and 9-1 this year.</li>"),
 ("<li><strong>The bill comes later.</strong> It holds none of its 2027, 2028 or 2029 first-round picks, so this roster is its window.</li>",
  "<li><strong>The bill is already on the books.</strong> It holds none of its 2027, 2028 or 2029 first-round picks, and counting those picks puts its trades at −162. This roster is its window.</li>"),
 ("<li><strong>−935 from its decisions,</strong> last by 474.</li>", "<li><strong>−794 from its decisions,</strong> last by 521.</li>"),
 ("<li><strong>The worst startup draft (−538) and the worst 2025 rookie draft (−114),</strong> and the second-worst trading record (−280).</li>",
  "<li><strong>The worst startup draft (−538) and the worst 2025 rookie draft (−114),</strong> plus −139 from trades.</li>"),
 ("<p>+479, the most in the league, from the second-best startup draft and the second-best 2025 rookie draft. But it's 21-17 with no title and 4-6 this year, about 3.4 fewer wins than its decisions predict.</p>",
  "<p>+472, the most in the league, from the second-best startup draft and the second-best 2025 rookie draft. But it's 21-17 with no title and 4-6 this year, about 4.0 fewer wins than its decisions predict.</p>"),
 ("<div><span class=\"eyebrow\">Traded its way up</span><b>Bengraz03 · masonmay</b><p>Both had bottom-five startup drafts. Trading added +413 and +344, the two best marks in the league, and turned both into 20-18 teams. Bengraz03 is 8-2 this year.</p></div>",
  "<div><span class=\"eyebrow\">Traded its way up</span><b>masonmay · Bengraz03</b><p>Both had bottom-five startup drafts. Trading added +408 and +343, the two best marks in the league, and turned both into 20-18 teams. Bengraz03 is 8-2 this year.</p></div>"),
 ("<p>The 2024 and 2025 champions rank 4th and 7th here. GAVINKIRK won with a strong draft while its trades cost it 335, the worst in the league.</p>",
  "<p>The 2024 and 2025 champions rank 4th and 8th here. GAVINKIRK won with a strong draft while its trades cost it 406, the worst in the league.</p>"),
 ("They line up closely (correlation 0.91), more closely than the startup draft alone (0.77). About 90 points of decision value is worth one win over three seasons. What's left over is lineups, injuries and luck: Perriconejp has won about 3.7 more games than its decisions predict, and DrKnockerzz about 3.4 fewer.</p>",
  "They line up closely (correlation 0.86), more closely than the startup draft alone (0.77). About 78 points of decision value is worth one win over three seasons. What's left over is lineups, injuries, luck, and future picks that haven't been drafted yet: Perriconejp has won about 4.7 more games than its decisions predict, and DrKnockerzz about 4.0 fewer.</p>"),
 ("<div><h3>Draft well</h3><p>Perriconejp (+534 at the startup) and DrKnockerzz (+434) built the two best decision totals almost entirely at the draft table, and roughly broke even on trades.",
  "<div><h3>Draft well</h3><p>Perriconejp (+534 at the startup) and DrKnockerzz (+434) built the two best decision totals at the draft table. DrKnockerzz roughly broke even on trades (−25); Perriconejp gave back 162, mostly in future firsts."),
 ("<div><h3>Trade well</h3><p>Bengraz03, masonmay and ryanoleson5 had middling or poor startup drafts and gained 413, 344 and 256 through trades.",
  "<div><h3>Trade well</h3><p>masonmay, Bengraz03 and ryanoleson5 had middling or poor startup drafts and gained 408, 343 and 200 through trades."),
 ("brookseleven came closest, recovering 112 of its 305.</p>", "brookseleven came closest, recovering 216 of its 305.</p>"),
 ("Trades cost another −215, mostly Ja'Marr Chase producing for Bengraz03 this year.</li>",
  "Trades roughly broke even (−5): Ja'Marr Chase producing for Bengraz03 cost 202 this year, and the future picks it collected make that back.</li>"),
 ("<li><strong>The record lags even this total.</strong> 11-27 is about 2.7 fewer wins than these decisions predict,",
  "<li><strong>The record lags even this total.</strong> 11-27 is about 4.7 fewer wins than these decisions predict,"),
 ("Future picks for 2027 and later have no value yet and appear only in the outlook. 2026 runs through week 10.</p>",
  "Picks for 2027 and later count in trades at their expected value from the Draft picks tab, so a team that sold players for picks gets credit for them now, and a team that bought players with picks pays for them now. 2026 runs through week 10.</p>"),
 ("pulled 18 November 2026, scored with", "pulled 19 November 2026, scored with"),
 ("Future picks come from Sleeper's traded-picks list for the league on 18 November 2026.", "Future picks come from Sleeper's traded-picks list for the league on 19 November 2026."),
]
for a, b in reps:
    if a in t: t = t.replace(a, b)
    else: assert b in t, a[:80]
open(o, 'w').write(t)
print('patched')
