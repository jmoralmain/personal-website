"""Switch page copy to the log-curve baseline. Usage: python3 -I rk25_patch_curve.py <template.html>"""
import sys
p = sys.argv[1]; s = open(p).read()
R = [
# verdict: best drafter
("<li><strong>+69 points above its draft slots,</strong> the most in the league, from picks #10, #16, #24 and #28.</li>",
 "<li><strong>+68 points above what its picks were expected to return,</strong> the most in the league, from picks #10, #16, #24 and #28.</li>"),
("<li><strong>Matthew Golden at #10 (+48) and Jaxson Dart at #16 (+21)</strong> both beat their slots. Golden is WR6 this season.</li>",
 "<li><strong>Matthew Golden at #10 (+58) is the best pick in the draft,</strong> and Jaxson Dart at #16 (+26) also beat his slot. Golden is WR6 this season.</li>"),
# verdict: worst drafter
("<li><strong>−85 points below its draft slots,</strong> the worst in the league by 24.</li>",
 "<li><strong>−114 points below what its picks were expected to return,</strong> the worst in the league by 65.</li>"),
("<li><strong>Omarion Hampton at #2 (−59)</strong> has 9.8 points above replacement in a season and a half.</li>",
 "<li><strong>Omarion Hampton at #2 (−75)</strong> has 9.8 points above replacement in a season and a half.</li>"),
# also row
('<div><span class="eyebrow">Best pick</span><b>Ashton Jeanty, #1</b><p>168 points above replacement, RB13 in 2025 and RB14 this year, 26 starts for TannerMenning. +94 over his slot.</p></div>',
 '<div><span class="eyebrow">Best pick</span><b>Matthew Golden, #10</b><p>WR6 this season after nine teams passed on him. 95 points above replacement, +58 over what the 10th pick should return.</p></div>'),
('<p>RB33 as a rookie and RB28 this year. 59 points under what picks near #2 returned.</p>',
 '<p>RB33 as a rookie and RB28 this year. 75 points under what the 2nd pick should return.</p>'),
('13 starts for DrKnockerzz. +43 over his slot.</p>', '13 starts for DrKnockerzz. +49 over his slot.</p>'),
# board note
('Outlined cells are mynameisuser\'s picks. Late third-round picks sit near zero because nothing around them produced either.',
 'Outlined cells are mynameisuser\'s picks. Late third-round misses sit near zero because the curve expects almost nothing that late.'),
# grades intro
("<strong>Value over slot</strong> subtracts the average of the seven picks centred on it (three either side), so the #1 pick only gets credit for beating what the top few picks returned. A team's grade is the sum over the picks it made, whoever owned the slot first.",
 "<strong>Value over slot</strong> subtracts what a pick at that spot was expected to return: a smooth curve that falls with each pick, fitted to this draft's own 36 picks (105.6 points above replacement at #1, 36.7 at #10, 17.5 at #19, 1.9 at #32). With only 36 picks it is a rough expectation, so small gaps between picks don't mean much. A team's grade is the sum over the picks it made, whoever owned the slot first."),
# stories
('<article class="story"><span class="eyebrow">Best pick · TannerMenning</span><h3>Ashton Jeanty <span class="vchip" style="background:var(--d-p3);color:var(--on-strong)">+94</span></h3>\n        <p>The obvious pick at #1 turned out to be the right one. Jeanty scored 233 points as a rookie (RB13) and has 150 through 10 weeks this year (RB14). He is the only rookie with more than 60 points above replacement in both seasons, and TannerMenning has started him 26 of 27 weeks.</p></article>',
 '<article class="story"><span class="eyebrow">Best pick · GAVINKIRK</span><h3>Matthew Golden <span class="vchip" style="background:var(--d-p3);color:var(--on-strong)">+58</span></h3>\n        <p>Golden was WR88 as a rookie and is WR6 this season, with 176 points in 10 games. Ashton Jeanty rates 4 points higher on the curve, which is inside the error of a curve fitted to 36 picks, and Jeanty was the consensus #1 while Golden was there after nine teams passed. So Golden is the best pick. Jeanty is the best player in the class and was the right #1: RB13 and RB14, the only rookie above 60 points above replacement in both seasons, and 26 starts for TannerMenning.</p></article>'),
('<article class="story"><span class="eyebrow">Worst pick · deathreaper439</span><h3>Omarion Hampton <span class="vchip" style="background:var(--d-n3);color:var(--on-strong)">−59</span></h3>',
 '<article class="story"><span class="eyebrow">Worst pick · deathreaper439</span><h3>Omarion Hampton <span class="vchip" style="background:var(--d-n3);color:var(--on-strong)">−75</span></h3>'),
('<article class="story"><span class="eyebrow">The steal · DrKnockerzz</span><h3>Tyler Shough <span class="vchip" style="background:var(--d-p2);color:var(--on-strong)">+43</span></h3>',
 '<article class="story"><span class="eyebrow">The steal · DrKnockerzz</span><h3>Tyler Shough <span class="vchip" style="background:var(--d-p2);color:var(--on-strong)">+49</span></h3>'),
('<h3>Travis Hunter <span class="vchip" style="background:var(--d-n3);color:var(--on-strong)">−58</span></h3>',
 '<h3>Travis Hunter <span class="vchip" style="background:var(--d-n3);color:var(--on-strong)">−64</span></h3>'),
('Kaleb Johnson at #11 (−43, never started) was the other big first-round miss.',
 'Kaleb Johnson at #11 (−34, never started) was the other big first-round miss.'),
('<p class="note">PAR is points above replacement. 2026 runs through week 10.',
 '<p class="note">PAR is points above replacement. "Expected" is the curve\'s value at that pick. 2026 runs through week 10.'),
# traded picks
('Those picks came in 4 points under their slot on average, and the picks teams kept came in 4 over.',
 'Those picks came in 4 points under expectation on average, and the picks teams kept came in 2 over.'),
('no points above replacement and no starts, 54 under their slots combined.',
 'no points above replacement and no starts, 46 under expectation combined.'),
('djklotzshotz\'s 1st became Quinshon Judkins (#9, +14), a starter-grade back',
 'djklotzshotz\'s 1st became Quinshon Judkins (#9, +23), a starter-grade back'),
# positions
('and the group beat its slots by 7 points on average.', 'and the group beat expectation by 6 points on average.'),
# footer
('Value over slot compares a pick with the average of picks within three slots of it (a seven-pick window, cut short at the ends of the draft).',
 'Value over slot compares a pick with a curve of expected value by pick number (least squares on the log of the pick, floored at zero), fitted to this draft\'s own 36 picks. That makes it a rough expectation, and gaps of a few points between picks are noise.'),
# open questions
("so his −27 is the softest number on the board.", "so his −25 is the softest number on the board."),
# takes
("GAVINKIRK: 'Golden at #10 and Dart at #16 both beat their slots,", "GAVINKIRK: 'Golden at #10 is the best pick in the draft and Dart at #16 also beat his slot,"),
("DrKnockerzz: 'Tyler Shough at #32 is the steal of the draft, and RJ Harvey at #8 was RB18 as a rookie before slipping to RB34. Kept all three picks.'",
 "DrKnockerzz: 'Tyler Shough at #32 (+49) is the steal of the draft, and RJ Harvey at #8 (+20) was RB18 as a rookie before slipping to RB34. Kept all three picks.'"),
("TannerMenning: 'Jeanty at #1 is the best pick on the board. Paying DK Metcalf and a 2026 1st to move up for Travis Hunter is the worst move in the draft, and the grade does not count what that move cost.'",
 "TannerMenning: 'Jeanty at #1 (+62) is the best player in the class. Travis Hunter at #4 (−64) cancels him out, and the grade does not count the DK Metcalf and 2026 1st it paid to move up for Hunter.'"),
("Cam Ward at #7 is the miss so far (−28). Bhayshul Tuten at #19 was the fourth-best value in the draft,",
 "Cam Ward at #7 is the miss so far (−27). Bhayshul Tuten at #19 (+54) was the third-best value in the draft,"),
("brookseleven: 'Tyler Warren at #6 was a top-12 tight end in both seasons but only just above replacement this year. Luther Burden at #18 is WR15 now,",
 "brookseleven: 'Tyler Warren at #6 was a top-12 tight end in both seasons but only just above replacement this year. Luther Burden at #18 (+36) is WR15 now,"),
("ryanoleson5: 'McMillan at #3 is the best receiver pick by total value: WR15 and WR16, with 25 starts. Colston Loveland (#15) and Jaydon Blue (#22, since cut) give part of it back.'",
 "ryanoleson5: 'McMillan at #3 (+45) is the best receiver by total value: WR15 and WR16, with 25 starts. Colston Loveland (#15, −25) and Jaydon Blue (#22, −13, since cut) give most of it back.'"),
("Bengraz03: 'TreVeyon Henderson at #5 was RB21 as a rookie but went to mynameisuser after 2 starts and is RB62 this year. Tre\\' Harris and Tory Horton have nothing above replacement.'",
 "Bengraz03: 'TreVeyon Henderson at #5 was RB21 as a rookie, a little under what the 5th pick should return, and went to mynameisuser after 2 starts. He is RB62 this year. Tre\\' Harris (#17, −21) and Tory Horton have nothing above replacement.'"),
]
for a, b in R:
    assert s.count(a) == 1, a[:80]
    s = s.replace(a, b)
# table header and tooltip
for a, b in [('<th class="r">Slot avg</th>', '<th class="r">Expected at pick</th>'), ('slot average ${Math.round(r.exp)}', 'expected ${Math.round(r.exp)}')]:
    assert s.count(a) == 1, a; s = s.replace(a, b)
open(p, 'w').write(s)
print('ok', len(R) + 2, 'edits')
