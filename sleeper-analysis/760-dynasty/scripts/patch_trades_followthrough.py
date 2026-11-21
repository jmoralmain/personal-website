"""760 trades page: copy and checks for follow-through (a flipped pick or player carries what it brought back)."""
import sys
S = sys.argv[1]
f = f'{S}/scripts/trades.src.html'
s = open(f).read()
R = [
 ("judged on what each side has produced in its new team's starting lineup, with picks for 2027 and later counted at their expected value.",
  "judged on what each side has produced in its new team's starting lineup, with picks for 2027 and later counted at their expected value. Each trade is followed through: if a team flipped what it received in a later deal, what came back counts toward the original trade."),
 ("<li><strong>+408 net from 17 trades,</strong> the most in the league and the most trades. It received 1,122 and gave away 714.</li>",
  "<li><strong>+408 net from 17 trades,</strong> the most in the league and the most trades. It received 1,072 and gave away 664.</li>"),
 ("<li><strong>7 clear wins, 5 losses,</strong> and 5 too close or too early to call.", "<li><strong>7 clear wins, 3 losses,</strong> and 7 too close or too early to call."),
 ("<li><strong>−364 net from 14 trades,</strong> the worst in the league. It received 609 and gave away 973.</li>",
  "<li><strong>−364 net from 14 trades,</strong> the worst in the league. It received 390 and gave away 754.</li>"),
 ("<li><strong>Its worst deal sent Drake Maye to ryanoleson5</strong> for two first-round picks (−276, #13). Next worst: Jaylen Waddle for masonmay's 2027 first, projected 1.02 (−63, #49).</li>",
  "<li><strong>Its worst deal sent Drake Maye to ryanoleson5</strong> for two first-round picks (−325, #13), counting what it later got for one of them, Matthew Golden. Next worst: Brandon Aiyuk and a first for Jaxson Dart (−91, #30), once the 2027 first it got there and spent on Jaylen Waddle is followed through.</li>"),
 ("<li><strong>3 clear wins, 8 losses,</strong> the most losses of any team.", "<li><strong>3 clear wins, 7 losses,</strong> the most losses of any team."),
 ("<div><span class=\"eyebrow\">Most lopsided trade</span><b>Puka Nacua for six picks</b><p>masonmay sent its 2025 and 2026 first-, second- and third-round picks to Perriconejp for Puka Nacua in November 2024. Nacua has produced 425 above replacement for masonmay. The picks have returned 17. Margin: 408.</p></div>",
  "<div><span class=\"eyebrow\">Most lopsided trade</span><b>Puka Nacua for six picks</b><p>masonmay sent its 2025 and 2026 first-, second- and third-round picks to Perriconejp for Puka Nacua in November 2024. Nacua has produced 425 above replacement for masonmay. Followed through, the picks have returned 137, most of it from the 2026 first, which Perriconejp spent on Derrick Henry. Margin: 289.</p></div>"),
 ("<p class=\"note\">Received: points above replacement the team's new players and picks have produced in its starting lineup, plus the expected value of 2027–29 picks. Given: the same for the assets it sent away.",
  "<p class=\"note\">Received: points above replacement the team's new players and picks have produced in its starting lineup, plus the expected value of 2027–29 picks, plus the net result of flipping any of them in later trades. Given: what the assets it sent away produced for the team that got them. A flip's result is booked to the trade that brought the asset in, so each point counts once."),
 ("<p>The five biggest margins. Values are points above replacement produced for the receiving team so far.</p>",
  "<p>The five biggest margins, followed through. Values are points above replacement produced for the receiving team so far, plus what anything it traded on brought back.</p>"),
 ("Picks show the player they became, and later picks are marked as future picks and counted at their expected value.</p>",
  "Picks show the player they became, and later picks are marked as future picks and counted at their expected value. Anything traded on in a later deal shows which one; its value includes what came back.</p>"),
 ("A pick that was traded again before the draft is worth nothing to the team that passed it on; its value shows up in the later trade.",
  "Trades are followed through: if a team traded on something it received, the asset is worth what it produced for that team plus its share of what came back in the later deal (split by what each outgoing piece became for the team that got it). In the team ledger, the flip's result is booked to the original trade and taken out of the later one, so team totals count every point once and the league sums to zero."),
 ("<span>${x.kind === 'pick' && x.status !== 'used' && x.status !== 'future' || x.kind === 'faab' ? '–' : R(x.value)}</span>",
  "<span>${x.kind === 'faab' || (x.kind === 'pick' && x.status === 'missing') ? '–' : R(x.value)}</span>"),
 ("  if (a.status === 'flipped') return `${base}, traded on`;", "  if (a.status === 'flipped') return `${base}, traded on${a.flip_n ? ' in #' + a.flip_n : ''}`;"),
 ("  if (a.kind === 'player') return `${esc(a.name)} <span style=\"color:var(--muted)\">${a.pos || ''}</span>`;",
  "  if (a.kind === 'player') return `${esc(a.name)} <span style=\"color:var(--muted)\">${a.pos || ''}${a.flip_n ? ', traded on in #' + a.flip_n : ''}</span>`;"),
 ("  if (a.status === 'used') return `${base}: ${esc(a.name)}`;", "  if (a.status === 'used') return `${base}: ${esc(a.name)}${a.flip_n ? ` <span style=\"color:var(--muted)\">traded on in #${a.flip_n}</span>` : ''}`;"),
 ("The six picks have returned 17, all from Germie Bernard. Perriconejp did get some use from them: it passed the 2026 first on in trade #25, which brought back Derrick Henry.`,",
  "Followed through, the six picks have returned 137: 17 from Germie Bernard and 119 from the 2026 first, which Perriconejp passed on in trade #25 for Derrick Henry and Jauan Jennings.`,"),
 ("when ryanoleson5 went 11-3. The two picks have returned 9.`,",
  "when ryanoleson5 went 11-3. The two picks have returned 14: Matthew Golden produced 9 for GAVINKIRK before it traded him to masonmay (#46), and that deal has brought back 5.`,"),
 ("Walker has produced 119 above replacement for brookseleven and Barkley 43 for masonmay. The two picks add 75 of expected value on brookseleven's side.`,",
  "Walker produced 119 above replacement for brookseleven, which then traded him to Bengraz03 (#56) for a package worth 66 so far, so he counts 185. Barkley has produced 43 for masonmay. The two picks add 75 of expected value on brookseleven's side.`,"),
]
for a, b in R:
    if a in s: s = s.replace(a, b)
    else: assert b in s, a[:90]
TK_OLD = "    36: `masonmay sent"
TK_NEW = ("    11: `ryanoleson5 sent <strong>Derrick Henry</strong> and a 2025 third to KDEMPSTER15 for Keon Coleman and KDEMPSTER15's 2025 first and second (Jaydon Blue). The next day it flipped that first, with its own 2026 first, to GAVINKIRK for Drake Maye (#13), so followed through the pick is worth 285 to ryanoleson5. Henry produced 63 for KDEMPSTER15, which later sent him to Perriconejp for two 2026 picks (#25).`,\n" + TK_OLD)
if '    11: `ryanoleson5 sent' not in s:
    assert TK_OLD in s; s = s.replace(TK_OLD, TK_NEW, 1)
open(f, 'w').write(s)

b = f'{S}/scripts/build_trades.py'
t = open(b).read()
for a, c in [
 ("assert best['owner'] == 'masonmay' and r(best['net']) == 408 and r(best['got']) == 1122 and r(best['gave']) == 714",
  "assert best['owner'] == 'masonmay' and r(best['net']) == 408 and r(best['got']) == 1072 and r(best['gave']) == 664"),
 ("assert (best['w'], best['l'], best['c'], best['n']) == (7, 5, 5, 17)", "assert (best['w'], best['l'], best['c'], best['n']) == (7, 3, 7, 17)"),
 ("assert worst['owner'] == 'GAVINKIRK' and r(worst['net']) == -364 and r(worst['got']) == 609 and r(worst['gave']) == 973",
  "assert worst['owner'] == 'GAVINKIRK' and r(worst['net']) == -364 and r(worst['got']) == 390 and r(worst['gave']) == 754"),
 ("assert (worst['w'], worst['l'], worst['c'], worst['n']) == (3, 8, 3, 14)", "assert (worst['w'], worst['l'], worst['c'], worst['n']) == (3, 7, 4, 14)"),
 ("gk = sorted((r(next(s['net'] for s in t['sides'] if s['rid'] == worst['rid'])), t['n'])", "gk = sorted((r(next(s['net_attr'] for s in t['sides'] if s['rid'] == worst['rid'])), t['n'])"),
 ("assert gk[:2] == [(-276, 13), (-63, 49)], gk[:2]", "assert gk[:2] == [(-325, 13), (-91, 30)], gk[:2]"),
 ("assert lop['n'] == 9 and r(lop['margin']) == 408", "assert lop['n'] == 9 and r(lop['margin']) == 289 and r(lop['sides'][1]['value']) == 137"),
 ("[:5]] == [9, 13, 25, 36, 32]", "[:5]] == [9, 13, 25, 11, 36]"),
 ("assert r(TR[36]['margin']) == 151 and r(TR[32]['margin']) == 140", "assert r(TR[36]['margin']) == 217 and r(TR[11]['margin']) == 223 and r(TR[13]['margin']) == 271"),
 ("assert r(TR[13]['margin']) == 276 and r(TR[25]['margin']) == 239", "assert r(TR[25]['margin']) == 239 and abs(sum(x['net'] for x in d['teams'])) < 1"),
]:
    if a in t: t = t.replace(a, c)
    else: assert c in t, a[:80]
open(b, 'w').write(t)
print('patched')
