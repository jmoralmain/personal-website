"""760 trades page: count future picks at expected value. Rewrites copy, adds a future-picks column, updates the build checks."""
import sys
S = sys.argv[1]
f = f'{S}/scripts/trades.src.html'
s = open(f).read()
R = [
 ("All 60 trades since the startup draft, judged on what each side has actually produced in its new team's starting lineup. Then who has gained from trading, and whether trades explain the teams that beat or missed what their startup draft predicted.</p>",
  "All 60 trades since the startup draft, judged on what each side has produced in its new team's starting lineup, with picks for 2027 and later counted at their expected value. Then who has gained from trading, and whether trades explain the teams that beat or missed what their startup draft predicted.</p>"),
 ('<div class="name">Bengraz03</div>', '<div class="name">masonmay</div>'),
 ("<li><strong>+413 net from 13 trades,</strong> the most in the league. Its new players produced 897 points above replacement for it, and what it gave away produced 484 for others.</li>",
  "<li><strong>+408 net from 17 trades,</strong> the most in the league and the most trades. It received 1,122 and gave away 714.</li>"),
 ("<li><strong>302 of that came from three trades with mynameisuser,</strong> led by Ja'Marr Chase (+195, trade #21) and Bhayshul Tuten with Michael Wilson for Rashee Rice (+93, #44).</li>",
  "<li><strong>Nearly all of it is one deal:</strong> Puka Nacua for six 2025–26 picks (+408, trade #9). Its other 16 trades net out to zero.</li>"),
 ("<li><strong>4 clear wins, 3 losses,</strong> and 6 too close or too early to call. It is 8-2 this year after a 5-9 2025.</li>",
  "<li><strong>7 clear wins, 5 losses,</strong> and 5 too close or too early to call. Its worst was Saquon Barkley (#36, −151), which cost Kenneth Walker III and its 2028 first and second. Bengraz03 is second at +343.</li>"),
 ("<li><strong>−335 net from 13 trades,</strong> the worst in the league. It received 478 and gave away 813.</li>",
  "<li><strong>−406 net from 13 trades,</strong> the worst in the league. It received 567 and gave away 973.</li>"),
 ("<li><strong>Its worst deal sent Drake Maye to ryanoleson5</strong> for two first-round picks (−276, #13). Jaxson Dart to masonmay (−113, #30) was the next worst.</li>",
  "<li><strong>Its worst deal sent Drake Maye to ryanoleson5</strong> for two first-round picks (−276, #13). Next worst: Jaylen Waddle for masonmay's 2027 first, projected 1.02 (−63, #49).</li>"),
 ("<li><strong>4 clear wins, 7 losses,</strong> the most losses of any team. It still won the 2025 title, on a roster its trades made weaker.</li>",
  "<li><strong>3 clear wins, 8 losses,</strong> the most losses of any team. It still won the 2025 title, on a roster its trades made weaker.</li>"),
 ("<div><span class=\"eyebrow\">Why masonmay beat its draft</span><b>Trades, almost exactly</b><p>masonmay's +344 net from trades is worth about 4.9 wins at this league's rate, and it has won 4.9 more games than its startup draft predicts.</p></div>",
  "<div><span class=\"eyebrow\">Why masonmay beat its draft</span><b>Trades, and then some</b><p>masonmay's +408 net from trades is worth about 5.8 wins at this league's rate. It has won 4.9 more games than its startup draft predicts.</p></div>"),
 ("<div><span class=\"eyebrow\">Why mynameisuser fell short</span><b>Partly trades</b><p>Your −215 net from 14 trades is worth about 3.0 wins of the 4.6-win shortfall. The trade losses landed in 2026. The 2-12 season in 2025 came before them.</p></div>",
  "<div><span class=\"eyebrow\">Why mynameisuser fell short</span><b>Not trades</b><p>mynameisuser's 14 trades net −5 once its future picks count. They lost 202 of production in 2026, and the future picks it collected, led by masonmay's 2027 first, make that back. The 4.6-win shortfall came from elsewhere.</p></div>"),
 ("<p>Mostly, yes. The startup-draft page found that draft value predicts wins well, with a few teams far off the line. Net trade value lines up with those gaps: across the 12 teams the correlation between net trade value and wins above or below the draft's prediction is 0.79.",
  "<p>Partly. The startup-draft page found that draft value predicts wins well, with a few teams far off the line. Net trade value lines up with those gaps, though less tightly now that future picks count (they haven't won anyone a game yet): across the 12 teams the correlation between net trade value and wins above or below the draft's prediction is 0.63."),
 ("<li><strong>masonmay: the trades are the story.</strong> Its +344 net matches its 4.9-win surplus, and the timing fits. Its trades added 86 in 2024 and 295 in 2025, its two 9-5 playoff seasons. In 2026 they are −36, and it is 2-8. Puka Nacua alone is worth 408 of the net.</li>",
  "<li><strong>masonmay: the trades are the story.</strong> Its +408 net covers its 4.9-win surplus, and the timing fits. Its trades added 86 in 2024 and 295 in 2025, its two 9-5 playoff seasons. In 2026 they are −36, and it is 2-8. Puka Nacua alone is worth 408 of the net.</li>"),
 ("<li><strong>mynameisuser: trades explain about two-thirds.</strong> The −215 net is worth about 3.0 of the 4.6 missing wins. By season the trades were −70 in 2024 and +57 in 2025, so the 2-12 collapse in 2025 was the roster, not trading. The trade losses arrived in 2026 (−202), mostly Ja'Marr Chase, Michael Wilson and Bhayshul Tuten producing for Bengraz03, during a 2-8 start.</li>",
  "<li><strong>mynameisuser: trades explain little.</strong> By season the trades were −70 in 2024 and +57 in 2025, so the 2-12 collapse in 2025 was the roster, not trading. The 2026 losses (−202) are real, mostly Ja'Marr Chase, Michael Wilson and Bhayshul Tuten producing for Bengraz03, but the future picks it got back are worth about as much, so the net is −5.</li>"),
 ("<li><strong>Trading more did not help by itself.</strong> The four busiest teams split down the middle: masonmay (17 trades, +344) and Bengraz03 (13, +413) gained, while mynameisuser (14, −215) and GAVINKIRK (13, −335) lost. The correlation between number of trades and net value is 0.15.</li>",
  "<li><strong>Trading more did not help by itself.</strong> Of the four busiest teams, masonmay (17 trades, +408) and Bengraz03 (13, +343) gained, mynameisuser (14, −5) broke even and GAVINKIRK (13, −406) lost. The correlation between number of trades and net value is 0.24.</li>"),
 ("<p class=\"note\">Received: points above replacement the team's new players and picks have produced in its starting lineup. Given: what the assets it sent away have produced for their new teams. Season columns show net value by the season it was produced in.</p>",
  "<p class=\"note\">Received: points above replacement the team's new players and picks have produced in its starting lineup, plus the expected value of 2027–29 picks. Given: the same for the assets it sent away. Season columns show net value by the season it was produced in; \"Future picks\" is the net expected value of 2027–29 picks. Together they add up to the net.</p>"),
 ("<p>All 60, oldest first. The higher-value side is listed first. Picks show the player they became, and later picks are marked as future picks.</p>",
  "<p>All 60, oldest first. The higher-value side is listed first. Picks show the player they became, and later picks are marked as future picks and counted at their expected value.</p>"),
 ("pulled 18 November 2026: every completed trade", "pulled 19 November 2026: every completed trade"),
 ("Net value is what a team received minus what its outgoing assets produced for their new teams.</p>",
  "A pick for 2027 or later counts at its expected value from the Draft picks tab: the points above replacement a rookie taken there typically produces over his first season and a half, using the 2027 order projected from the standings and a round average for 2028 and 2029. Net value is what a team received minus the value of what it sent away.</p>"),
 ("The 37 picks for 2027 and later have no value yet, and the 2026 rookies have had ten weeks.",
  "The 37 picks for 2027 and later are worth 1,244 at expected value, which is a projection, not production; the 2027 slots will move with the standings. The 2026 rookies have had ten weeks."),
 ("<th class=\"r\">2024</th><th class=\"r\">2025</th><th class=\"r\">2026</th><th>Best trade</th>",
  "<th class=\"r\">2024</th><th class=\"r\">2025</th><th class=\"r\">2026</th><th class=\"r\">Future picks</th><th>Best trade</th>"),
 ("<td class=\"r\">${sign(t.net_by['2026'])}</td>\n    <td>${tr(t.best)}",
  "<td class=\"r\">${sign(t.net_by['2026'])}</td><td class=\"r\">${sign(t.net_fut)}</td>\n    <td>${tr(t.best)}"),
 ("<span>${x.kind === 'pick' && x.status !== 'used' || x.kind === 'faab' ? '–' : R(x.value)}</span>",
  "<span>${x.kind === 'pick' && x.status !== 'used' && x.status !== 'future' || x.kind === 'faab' ? '–' : R(x.value)}</span>"),
 ("if (a.status === 'future') return `${base}, future pick`;", "if (a.status === 'future') return `${base}, future pick (${R(a.value)} expected)`;"),
]
for a, b in R:
    if a in s: s = s.replace(a, b)
    else: assert b in s, a[:80]
# card notes for the two trades that join the top five
TK_OLD = "    21: `Your biggest trade."
TK_NEW = ("    36: `masonmay sent <strong>Kenneth Walker III</strong> with its 2028 first and second to brookseleven for Saquon Barkley. Walker has produced 119 above replacement for brookseleven and Barkley 43 for masonmay. The two picks add 75 of expected value on brookseleven's side.`,\n"
          "    32: `DrKnockerzz sent <strong>James Cook III</strong> and its 2027 first to Bengraz03 for Travis Etienne Jr., KC Concepcion Jr. and Fernando Mendoza. Cook has produced 166 above replacement in 16 starts for Bengraz03; the three players have returned 84 for DrKnockerzz. The first, projected 1.12, adds 57 expected. Two 2026 rookies in the deal keep it officially too early to call.`,\n"
          + TK_OLD)
if '    36: `masonmay sent' not in s:
    assert TK_OLD in s; s = s.replace(TK_OLD, TK_NEW)
open(f, 'w').write(s)

b = f'{S}/scripts/build_trades.py'
t = open(b).read()
i, j = t.index('# ---- checks for every number used in the copy'), t.index('data = dict(')
checks = '''# ---- checks for every number used in the copy
import math
r = lambda v: math.floor(v + 0.5)  # JS Math.round
for t in d['teams']: t['net_fut'] = round(t['net'] - sum(t['net_by'].values()), 1)
ranked = sorted(d['teams'], key=lambda t: -t['net'])
best, worst = ranked[0], ranked[-1]
assert best['owner'] == 'masonmay' and r(best['net']) == 408 and r(best['got']) == 1122 and r(best['gave']) == 714
assert (best['w'], best['l'], best['c'], best['n']) == (7, 5, 5, 17) and best['worst'] == 36 and r(best['worst_net']) == -151
assert ranked[1]['owner'] == 'Bengraz03' and r(ranked[1]['net']) == 343
assert worst['owner'] == 'GAVINKIRK' and r(worst['net']) == -406 and r(worst['got']) == 567 and r(worst['gave']) == 973
assert (worst['w'], worst['l'], worst['c'], worst['n']) == (3, 8, 2, 13)
gk = sorted((r(next(s['net'] for s in t['sides'] if s['rid'] == worst['rid'])), t['n']) for t in d['trades'] if worst['rid'] in [s['rid'] for s in t['sides']])
assert gk[:2] == [(-276, 13), (-63, 49)], gk[:2]
lop = max((t for t in d['trades'] if t['verdict'] != 'close'), key=lambda t: t['margin'])
assert lop['n'] == 9 and r(lop['margin']) == 408
assert st['n_trades'] == 60 and st['n_future'] == 37
assert [t['n'] for t in sorted([t for t in d['trades'] if t['verdict'] != 'close'], key=lambda t: -t['margin'])[:5]] == [9, 13, 25, 36, 32]
assert r(TR[36]['margin']) == 151 and r(TR[32]['margin']) == 140
mm, me = by('masonmay'), by('mynameisuser')
assert round(mm['resid'], 1) == 4.9 and round(mm['wins_from_trades'], 1) == 5.8
assert r(me['net']) == -5 and round(me['resid'], 1) == -4.6 and me['n'] == 14
assert [r(mm['net_by'][y]) for y in ('2024', '2025', '2026')] == [86, 295, -36], mm['net_by']
assert [r(me['net_by'][y]) for y in ('2024', '2025', '2026')] == [-70, 57, -202], me['net_by']
assert round(1 / st['wins_per_pf']) == 71 and st['corr_net_resid'] == 0.63 and st['corr_n_net'] == 0.24
fut = [a for t in d['trades'] for s in t['sides'] for a in s['got'] if a['kind'] == 'pick' and a['status'] == 'future']
assert r(sum(a['value'] for a in fut)) == 1244
assert r(worst['lost_by']['2025']) == 507 and r(worst['got_by']['2025']) == 194
assert r(TR[13]['margin']) == 276 and r(TR[25]['margin']) == 239
k24 = ti['2024']['teams']['7']['got'][0]
assert k24['name'] == 'Derrick Henry' and r(k24['season']) == 41 and r(k24['playoffs']) == 27 and k24['final'] == 16.5
fs24, fs25 = ti['2024']['final_score'], ti['2025']['final_score']
assert r(fs24['7'] - fs24['9']) == 78 and r(fs25['11'] - fs25['5']) == 88
busy = sorted(d['teams'], key=lambda t: -t['n'])[:4]
assert [(t['owner'], r(t['net'])) for t in busy] == [('masonmay', 408), ('mynameisuser', -5), ('Bengraz03', 343), ('GAVINKIRK', -406)]

'''
t = t[:i] + checks + t[j:]
open(b, 'w').write(t)
print('patched')
