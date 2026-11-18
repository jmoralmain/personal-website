"""Point the 2027 mock view at C.J. Freel's board, with The Big Board kept as a comparison column."""
import json, sys
S = sys.argv[1]
f = f'{S}/page4/mock.src.html'
s = open(f).read()
reps = [
    ("The prospects and their order come from a current consensus superflex ranking. Each team's choice leans toward the positions where its roster is thinnest or oldest.</p>",
     "The prospects and their order come from C.J. Freel's superflex rankings on his Fantasy for Real Substack. Each team's choice leans toward the positions where its roster is thinnest or oldest.</p>"),
    ("<p>\"Board\" is the player's spot in the consensus ranking, and \"vs board\" shows how early (−) or late (+) he goes here.",
     "<p>\"Freel\" is the player's spot on C.J. Freel's board, and \"vs Freel\" shows how early (−) or late (+) he goes here. \"Big Board\" is where The Big Board's superflex list ranks him, for comparison (— means he isn't in its top 48)."),
    ("<th class=\"r\">Board</th><th class=\"r\">vs board</th>", "<th class=\"r\">Freel</th><th class=\"r\">Big Board</th><th class=\"r\">vs Freel</th>"),
    ("<td class=\"r\">#${m.bb_rank}</td>\n      <td class=\"r\">${m.reach > 0",
     "<td class=\"r\">#${m.bb_rank}</td><td class=\"r dim\">${m.alt_rank ? '#' + m.alt_rank : '—'}</td>\n      <td class=\"r\">${m.reach > 0"),
    ("<tr class=\"rd\"><td colspan=\"8\">", "<tr class=\"rd\"><td colspan=\"9\">"),
    ("<td>${label(m)}</td>", "<td>${label(m)}${RETURN.has(m.name) ? ' <span class=\"pill\" title=\"C.J. Freel projects him as likely to return to college (can change)\">may return to school</span>' : ''}</td>"),
    ("const POS = ['QB', 'RB', 'WR', 'TE'];", "const POS = ['QB', 'RB', 'WR', 'TE'];\nconst RETURN = new Set(['Arch Manning', 'Sam Leavitt', 'Austin Simmons', 'Hollywood Smothers']);"),
    ("if (m.why === 'need') return `Passes on ${esc(m.best_left.name)} (${m.best_left.pos}, board #${m.best_left.rank}) because ${room}.`;\n  return `Passes on ${esc(m.best_left.name)} (${m.best_left.pos}, board #${m.best_left.rank}) for a better fit.`;",
     "if (m.why === 'need') return `Passes on ${esc(m.best_left.name)} (${m.best_left.pos}, Freel #${m.best_left.rank}) because ${room}.`;\n  return `Passes on ${esc(m.best_left.name)} (${m.best_left.pos}, Freel #${m.best_left.rank}) for a better fit.`;"),
    ("`<div><span class=\"eyebrow\">1.01</span><b>${esc(first.name)} to ${esc(first.owner)}</b><p>The consensus top prospect,",
     "`<div><span class=\"eyebrow\">1.01</span><b>${esc(first.name)} to ${esc(first.owner)}</b><p>Every board's top prospect,"),
    ("`<div><span class=\"eyebrow\">A quarterback first round</span><b>${r1qb.length} QBs in round 1</b><p>${r1qb.map(m => `${esc(m.name)} (${m.round}.${String(m.slot).padStart(2, '0')})`).join(', ')}. In superflex the quarterback class is worth more than anything but the top receiver.</p></div>`,",
     "`<div><span class=\"eyebrow\">Quarterbacks</span><b>${r1qb.length} QBs in round 1</b><p>${r1qb.map(m => `${esc(m.name)} (${m.round}.${String(m.slot).padStart(2, '0')})`).join(', ')}. Freel is lower on this QB class than most boards: he has Drew Mestemaker as QB1, Dante Moore in round 2, and Arch Manning likely returning to Texas.</p></div>`,"),
    ("<p><strong>How this was made.</strong> Prospects and their order come from <a href=\"https://www.thebigboard.gg/dynasty/rookie-rankings-2027\" target=\"_blank\" rel=\"noopener\">The Big Board's 2027 superflex rookie rankings</a> (12-team PPR, updated 17 November 2026), which match the order in other current lists: Jeremiah Smith first, then a deep quarterback group. Each pick takes the prospect with the best mix of that ranking and the team's need: the ranking's own value score, raised by up to about 40% for the team's thinnest position. After a pick, that team's need at the position drops.</p>",
     "<p><strong>How this was made.</strong> Prospects and their order come from C.J. Freel's <a href=\"https://cjfreel.substack.com\" target=\"_blank\" rel=\"noopener\">Fantasy for Real</a> Substack: the top 24 from his <a href=\"https://cjfreel.substack.com/p/cj-carr-aces-the-test-jackson-harris\" target=\"_blank\" rel=\"noopener\">Superflex Mock Draft #6</a> (10 November 2026), the rest from his <a href=\"https://cjfreel.substack.com/p/big-board-v20-50-prospects-in-around\" target=\"_blank\" rel=\"noopener\">Big Board v2.0</a> (5 November), with Caden Veltkamp added from his <a href=\"https://cjfreel.substack.com/p/2027-qb-re-ranks-first-peak-at-2028\" target=\"_blank\" rel=\"noopener\">2027 QB re-rank</a> (12 November). That re-rank projects Arch Manning, Sam Leavitt and Austin Simmons as likely to return to college, and Hollywood Smothers is out for the season; they're flagged. The comparison column is <a href=\"https://www.thebigboard.gg/dynasty/rookie-rankings-2027\" target=\"_blank\" rel=\"noopener\">The Big Board's superflex list</a> (17 November).</p><p>Each pick takes the prospect with the best mix of Freel's order and the team's need. Value at each spot on his board uses The Big Board's value curve, raised by up to about 40% for the team's thinnest position. After a pick, that team's need at the position drops.</p>"),
]
for a, b in reps:
    if a in s: s = s.replace(a, b)
    else: assert b in s, a[:70]
open(f, 'w').write(s)
bm = f'{S}/scripts/build_mock.py'
t = open(bm).read()
t = t.replace("d = json.load(open(f'{S}/mock2027.json'))", "d = json.load(open(f'{S}/mock2027_freel.json'))")
open(bm, 'w').write(t)
print('patched')
