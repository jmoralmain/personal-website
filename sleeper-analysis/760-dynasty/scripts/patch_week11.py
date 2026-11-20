"""760 Dynasty: refresh copy and checks after the week-11 trades (#61-63) and adds. Data pulled 20 November 2026."""
import sys, re
S = sys.argv[1]

def apply(path, reps):
    s = open(path).read()
    for a, b in reps:
        if a in s: s = s.replace(a, b)
        else: assert b in s, (path, a[:90])
    open(path, 'w').write(s)

apply(f'{S}/scripts/trades.src.html', [
 ("All 60 trades since the startup draft", "All 63 trades since the startup draft"),
 ("<p>All 60, oldest first.", "<p>All 63, oldest first."),
 ("<li><strong>−406 net from 13 trades,</strong> the worst in the league. It received 567 and gave away 973.</li>",
  "<li><strong>−364 net from 14 trades,</strong> the worst in the league. It received 609 and gave away 973.</li>"),
 ("<li><strong>3 clear wins, 8 losses,</strong> the most losses of any team. It still won the 2025 title, on a roster its trades made weaker.</li>",
  "<li><strong>3 clear wins, 8 losses,</strong> the most losses of any team. It still won the 2025 title, on a roster its trades made weaker. This week it sent De'Von Achane to brookseleven for David Montgomery and four picks (#61, too early to call).</li>"),
 ("<p>mynameisuser's 14 trades net −5 once its future picks count. They lost 202 of production in 2026, and the future picks it collected, led by masonmay's 2027 first, make that back. The 4.6-win shortfall came from elsewhere.</p>",
  "<p>mynameisuser's 15 trades net +30 once its future picks count. They lost 202 of production in 2026, and the future picks it collected, led by masonmay's 2027 first, more than make that back. The 4.6-win shortfall came from elsewhere.</p>"),
 ("across the 12 teams the correlation between net trade value and wins above or below the draft's prediction is 0.63.",
  "across the 12 teams the correlation between net trade value and wins above or below the draft's prediction is 0.62."),
 ("but the future picks it got back are worth about as much, so the net is −5.</li>",
  "but the future picks it got back are worth more, including two seconds for Josh Downs this week (#63), so the net is +30.</li>"),
 ("<li><strong>Trading more did not help by itself.</strong> Of the four busiest teams, masonmay (17 trades, +408) and Bengraz03 (13, +343) gained, mynameisuser (14, −5) broke even and GAVINKIRK (13, −406) lost. The correlation between number of trades and net value is 0.24.</li>",
  "<li><strong>Trading more did not help by itself.</strong> Of the four busiest teams, masonmay (17 trades, +408), Bengraz03 (15, +343) and mynameisuser (15, +30) gained, while GAVINKIRK (14, −364) lost. The correlation between number of trades and net value is 0.32.</li>"),
 ("pulled 19 November 2026: every completed trade", "pulled 20 November 2026: every completed trade"),
 ("The 37 picks for 2027 and later are worth 1,244 at expected value,", "The 45 picks for 2027 and later are worth 1,355 at expected value,"),
 ("The 2026 rookies have had ten weeks. 2026 is through week 10.",
  "The 2026 rookies have had ten weeks. 2026 is through week 10, so the three week-11 trades (#61–63) count only their picks so far; the players in them haven't played for their new teams yet."),
])

b = f'{S}/scripts/build_trades.py'
t = open(b).read()
for a, c in [
 ("assert worst['owner'] == 'GAVINKIRK' and r(worst['net']) == -406 and r(worst['got']) == 567 and r(worst['gave']) == 973",
  "assert worst['owner'] == 'GAVINKIRK' and r(worst['net']) == -364 and r(worst['got']) == 609 and r(worst['gave']) == 973"),
 ("assert (worst['w'], worst['l'], worst['c'], worst['n']) == (3, 8, 2, 13)", "assert (worst['w'], worst['l'], worst['c'], worst['n']) == (3, 8, 3, 14)"),
 ("assert st['n_trades'] == 60 and st['n_future'] == 37", "assert st['n_trades'] == 63 and st['n_future'] == 45 and [x['verdict'] for x in d['trades'][-3:]] == ['early'] * 3"),
 ("assert r(me['net']) == -5 and round(me['resid'], 1) == -4.6 and me['n'] == 14", "assert r(me['net']) == 30 and round(me['resid'], 1) == -4.6 and me['n'] == 15 and r(TR[63]['margin']) == 35"),
 ("st['corr_net_resid'] == 0.63 and st['corr_n_net'] == 0.24", "st['corr_net_resid'] == 0.62 and st['corr_n_net'] == 0.32"),
 ("assert r(sum(a['value'] for a in fut)) == 1244", "assert r(sum(a['value'] for a in fut)) == 1355"),
 ("assert [(t['owner'], r(t['net'])) for t in busy] == [('masonmay', 408), ('mynameisuser', -5), ('Bengraz03', 343), ('GAVINKIRK', -406)]",
  "assert sorted((t['owner'], t['n'], r(t['net'])) for t in busy) == sorted([('masonmay', 17, 408), ('Bengraz03', 15, 343), ('mynameisuser', 15, 30), ('GAVINKIRK', 14, -364)])"),
]:
    if a in t: t = t.replace(a, c)
    else: assert c in t, a[:80]
open(b, 'w').write(t)

o = f'{S}/scripts/patch_overall_future.py'
t = open(o).read()
for a, c in [
 ("syn['fit']['corr'] == 0.86", "syn['fit']['corr'] == 0.85"),
 ("assert R0['KDEMPSTER15']['rank']['total'] == 4 and R0['GAVINKIRK']['rank']['total'] == 8 and r(R0['GAVINKIRK']['trades']) == -406",
  "assert R0['KDEMPSTER15']['rank']['total'] == 4 and R0['GAVINKIRK']['rank']['total'] == 7 and r(R0['GAVINKIRK']['trades']) == -364"),
 ("r(R0['brookseleven']['trades']) == 216", "r(R0['brookseleven']['trades']) == 175"),
 ("assert r(R0['mynameisuser']['trades']) == -5 and R0['mynameisuser']['resid'] == -4.7", "assert r(R0['mynameisuser']['trades']) == 30 and R0['mynameisuser']['resid'] == -5.2"),
]:
    if a in t: t = t.replace(a, c)
    else: assert c in t, a[:80]
open(o, 'w').write(t)

apply(f'{S}/page5/overall.src.html', [
 ("the startup draft, 60 trades, and two rookie drafts", "the startup draft, 63 trades, and two rookie drafts"),
 ("<p>The 2024 and 2025 champions rank 4th and 8th here. GAVINKIRK won with a strong draft while its trades cost it 406, the worst in the league.</p>",
  "<p>The 2024 and 2025 champions rank 4th and 7th here. GAVINKIRK won with a strong draft while its trades cost it 364, the worst in the league.</p>"),
 ("They line up closely (correlation 0.86),", "They line up closely (correlation 0.85),"),
 ("brookseleven came closest, recovering 216 of its 305.</p>", "brookseleven came closest, recovering 175 of its 305.</p>"),
 ("Trades roughly broke even (−5): Ja'Marr Chase producing for Bengraz03 cost 202 this year, and the future picks it collected make that back.</li>",
  "Trades come out slightly ahead (+30): Ja'Marr Chase producing for Bengraz03 cost 202 this year, and the future picks it collected more than make that back.</li>"),
 ("11-27 is about 4.7 fewer wins than these decisions predict,", "11-27 is about 5.2 fewer wins than these decisions predict,"),
 ("pulled 19 November 2026, scored with", "pulled 20 November 2026, scored with"),
 ("traded-picks list for the league on 19 November 2026.", "traded-picks list for the league on 20 November 2026."),
])
# keep the overall patch's own replacement targets in step with the new text
t = open(o).read()
for a, c in [("Trades roughly broke even (−5): Ja'Marr Chase producing for Bengraz03 cost 202 this year, and the future picks it collected make that back.</li>\"),",
              "Trades come out slightly ahead (+30): Ja'Marr Chase producing for Bengraz03 cost 202 this year, and the future picks it collected more than make that back.</li>\"),"),
             ("11-27 is about 4.7 fewer wins than these decisions predict,\"),", "11-27 is about 5.2 fewer wins than these decisions predict,\"),"),
             ("pulled 19 November 2026, scored with\"),", "pulled 20 November 2026, scored with\"),"),
             ("traded-picks list for the league on 19 November 2026.\"),", "traded-picks list for the league on 20 November 2026.\"),")]:
    t = t.replace(a, c)
open(o, 'w').write(t)

apply(f'{S}/page4/picks.src.html', [
 ("<li><strong>13 picks worth 470,</strong> the most in the league, including 7 first-rounders.</li>",
  "<li><strong>15 picks worth 505,</strong> the most in the league, including 7 first-rounders.</li>"),
 ("<li><strong>Built by selling:</strong> 5 picks acquired, 3 of them from Bengraz03, and only 1 of its own traded away.</li>",
  "<li><strong>Built by selling:</strong> 7 picks acquired, 4 of them originally Bengraz03's, and only 1 of its own traded away. The latest, this week: KDEMPSTER15's 2027 second and Bengraz03's 2029 second for Josh Downs.</li>"),
 ("It also holds 14 picks in all, tied with brookseleven for the most, and hasn't traded any of its own away.</p>",
  "It also holds 14 picks in all, second only to mynameisuser's 15, and hasn't traded any of its own away.</p>"),
 ("<p>3 picks left of its original 9, the fewest in the league. 7 went out, mostly to mynameisuser and brookseleven, while it built the 8-2 roster it has now.</p>",
  "<p>Only 1 of its original 9 picks is left, the fewest in the league. 8 went out, 4 of them to mynameisuser, while it built the 8-2 roster it has now. It holds 3 picks in all.</p>"),
 ("<div><span class=\"eyebrow\">Most picks gained</span><b>brookseleven</b><p>7 picks came in, more than any other team, for 14 in all, though mostly seconds and thirds. Its four firsts include TannerMenning's 2027 pick, which projects fourth.</p></div>",
  "<div><span class=\"eyebrow\">Restocked this week</span><b>GAVINKIRK</b><p>Sent De'Von Achane to brookseleven for David Montgomery, brookseleven's 2027 and 2028 seconds and Bengraz03's 2027 and 2028 thirds, taking it from 8 picks to 12.</p></div>"),
 ("traded-picks list for the league on 18 November 2026,", "traded-picks list for the league on 20 November 2026,"),
])
bp = f'{S}/scripts/build_picks.py'
t = open(bp).read()
t = t.replace("if a in s: s = s.replace(a, b)\nassert b in s\n", "if a in s: s = s.replace(a, b)\nassert b in s or 'Restocked this week' in s\n", 1)
open(bp, 'w').write(t)

apply(f'{S}/page4/waivers.src.html', [
 ("436 players added and 511 dropped.", "441 players added and 518 dropped."),
 ("<b>34 of 436</b>", "<b>34 of 441</b>"),
 ("and 301 never started for the team that made them.", "and 306 never started for the team that made them."),
 ("<p>125 moves, the most in the league,", "<p>127 moves, the most in the league,"),
 ("and 67 of its 98 adds never started.", "and 68 of its 99 adds never started."),
 ("pulled 18 November 2026.", "pulled 20 November 2026."),
])
print('patched')
