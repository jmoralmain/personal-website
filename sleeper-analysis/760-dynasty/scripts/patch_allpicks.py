"""Draft grades page: show all 25 rounds (board, team cards), split value into early/middle/late rounds,
and add a round-by-round section."""
f = 'page3/dynasty.src.html'
s = open(f).read()
reps = [
    # board: all 25 rounds
    ("<p>Rounds 1–10, in the order they were picked; the draft snaked, so each team's column reads down its own picks. Blue picks beat their slot, and red picks fell short.</p>",
     "<p>All 25 rounds, in the order they were picked; the draft snaked, so each team's column reads down its own picks. Blue picks beat their slot, and red picks fell short. The color fades to gray after round 15 because late picks rarely produced anything, so a small hit there still stands out.</p>"),
    ('<span class="eyebrow">Rounds 1–10 · value over slot</span>', '<span class="eyebrow">All 300 picks · value over slot</span>'),
    ("Each cell shows the player, position and value over slot. The full 300 picks are in each team's card below.</p>",
     "Each cell shows the player, position and value over slot. Hover or focus a cell for the full numbers.</p>"),
    ("  const rows = D.rows.filter(r => r.rd <= 10);", "  const rows = D.rows;"),
    ("  for (let rd = 1; rd <= 10; rd++) {", "  for (let rd = 1; rd <= 25; rd++) {"),
    # grades table: early / middle / late
    ("const head = ['', 'Team', 'Grade', '1st pick', 'Value over slot', 'Rounds 1–5', 'Rounds 6+', 'Starter hits',",
     "const head = ['', 'Team', 'Grade', '1st pick', 'Value over slot', 'Rounds 1–5', 'Rounds 6–15', 'Rounds 16–25', 'Starter hits',"),
    ("const num = new Set([0, 3, 4, 5, 6, 7, 8, 9, 10, 12, 13]);", "const num = new Set([0, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 14]);"),
    ("    <td class=\"r\">${sign(t.voe_r1_5)}</td><td class=\"r\">${sign(t.voe_r6_plus)}</td>",
     "    <td class=\"r\">${sign(grp(t.rid, 1, 5))}</td><td class=\"r\">${sign(grp(t.rid, 6, 15))}</td><td class=\"r\">${sign(grp(t.rid, 16, 25))}</td>"),
    # team cards: all picks
    ("<p>In grade order, best to worst. Each card lists the team's first ten picks; its best pick from round 11 on is noted below the table.</p>",
     "<p>In grade order, best to worst. Each card lists all 25 of the team's picks, split into the early (1–5), middle (6–15) and late (16–25) rounds.</p>"),
    ("    const top10 = mine.filter(r => r.rd <= 10);\n    const late = mine.filter(r => r.rd > 10).sort((a, b) => b.voe - a.voe)[0];",
     "    const late = mine.filter(r => r.rd >= 16).sort((a, b) => b.voe - a.voe)[0];\n    const band = (a, b, label) => `<tr><td colspan=\"9\" style=\"font:500 11px var(--f-mono);color:var(--muted);letter-spacing:0.04em;text-transform:uppercase;padding-top:12px\">${label} · ${sign(grp(t.rid, a, b))} vs slot</td></tr>`;"),
    ("        ${top10.map(r => `<tr>", "        ${mine.map(r => `${r.rd === 1 ? band(1, 5, 'Rounds 1–5') : r.rd === 6 ? band(6, 15, 'Rounds 6–15') : r.rd === 16 ? band(16, 25, 'Rounds 16–25') : ''}<tr>"),
    ("<p class=\"note\">${late ? `Best pick from round 11 on: <strong style=\"color:var(--ink)\">${esc(late.name)}</strong> (${late.pos}, R${late.rd} · #${late.pick}), ${sign(late.voe)} vs slot.` : ''} \"Gone\" marks players no longer on this roster. Year columns are points above replacement.</p>",
     "<p class=\"note\">${late && late.par_total > 0 ? `Best late-round pick: <strong style=\"color:var(--ink)\">${esc(late.name)}</strong> (${late.pos}, R${late.rd} · #${late.pick}), ${Math.round(late.par_total)} above replacement.` : 'None of its picks after round 15 has cleared replacement level.'} \"Gone\" marks players no longer on this roster. Year columns are points above replacement.</p>"),
    # round-by-round section after best/worst picks
    ("  <section>\n    <div class=\"stack prose\">\n      <h2>Team by team</h2>",
     """  <section>
    <div class="stack prose">
      <h2>Round by round</h2>
      <p>The first five rounds supplied 60% of all the value this draft has produced, and 93% of those picks have had a starter-grade season. Rounds 6–15 supplied 36%. The last ten rounds supplied 4%: 85% of those 120 picks have never cleared replacement level.</p>
      <p>The middle rounds are where the best drafters pulled away. DrKnockerzz (+247 over slot), ryanoleson5 (+204) and KDEMPSTER15 (+195) did most of their work in rounds 6–15, and masonmay (−208) lost the most there. Round 6 returned more than round 5, led by Derrick Henry. The best late-round drafter was Bengraz03 (+132 in rounds 16–25), with Parker Washington in round 23 and Kenny Gainwell in round 20. The best single late pick was Michael Wilson in round 17 (mynameisuser).</p>
    </div>
    <div class="panel">
      <div class="tbl" id="t-rounds"></div>
      <p class="note">Average points above replacement per pick, 2024 through 2026 week 10. A starter season is a top-24 QB, top-24 RB, top-36 WR or top-12 TE finish.</p>
    </div>
  </section>

  <section>
    <div class="stack prose">
      <h2>Team by team</h2>"""),
]
for a, b in reps:
    assert s.count(a) == 1, (s.count(a), a[:70])
    s = s.replace(a, b)
# helper + round table script (before the Team cards block)
helper = """const grp = (rid, a, b) => D.rows.filter(r => r.rid === rid && r.rd >= a && r.rd <= b).reduce((s, r) => s + r.voe, 0);
(function roundTable() {
  const rows = [];
  for (let rd = 1; rd <= 25; rd++) {
    const e = D.rows.filter(r => r.rd === rd), best = e.reduce((a, b) => (b.par_total > a.par_total ? b : a));
    const avg = e.reduce((s, r) => s + r.par_total, 0) / e.length, hit = e.filter(r => r.starter_seasons > 0).length, zero = e.filter(r => r.par_total === 0).length;
    rows.push(`<tr><td class="r">${rd}</td><td class="r">${Math.round(avg)}</td><td class="r">${hit} of 12</td><td class="r">${zero} of 12</td><td>${best.par_total > 0 ? `${esc(best.name)} <span style="color:var(--muted)">${best.pos} · ${esc(best.owner)}</span>` : '<span style="color:var(--muted)">nobody above replacement</span>'}</td><td class="r">${Math.round(best.par_total)}</td></tr>`);
  }
  document.getElementById('t-rounds').innerHTML = `<table><thead><tr><th class="r">Round</th><th class="r">Avg above repl.</th><th class="r">Starter seasons</th><th class="r">Nothing above repl.</th><th>Best pick</th><th class="r">Above repl.</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
})();
"""
anchor = "/* Grades table */"
assert s.count(anchor) == 1
s = s.replace(anchor, helper + anchor)
open(f, 'w').write(s)
print('patched')
