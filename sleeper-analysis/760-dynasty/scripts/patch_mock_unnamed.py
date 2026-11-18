"""Remove every mention of the 2027 mock's prospect-ranking source from the page and its embedded data."""
import sys
S = sys.argv[1]
f = f'{S}/page4/mock.src.html'
s = open(f).read()
reps = [
    ("The prospects and their order come from C.J. Freel's superflex rankings on his Fantasy for Real Substack.",
     "The prospects and their order come from current superflex rookie rankings."),
    ("<p>\"Freel\" is the player's spot on C.J. Freel's board, and \"vs Freel\" shows",
     "<p>\"Rank\" is the player's spot in the prospect ranking, and \"vs rank\" shows"),
    ("<th class=\"r\">Freel</th><th class=\"r\">Big Board</th><th class=\"r\">vs Freel</th>",
     "<th class=\"r\">Rank</th><th class=\"r\">Big Board</th><th class=\"r\">vs rank</th>"),
    ("title=\"C.J. Freel projects him as likely to return to college (can change)\"",
     "title=\"Projected as likely to return to college (can change)\""),
    ("(${m.best_left.pos}, Freel #${m.best_left.rank}) because", "(${m.best_left.pos}, rank #${m.best_left.rank}) because"),
    ("(${m.best_left.pos}, Freel #${m.best_left.rank}) for a better fit", "(${m.best_left.pos}, rank #${m.best_left.rank}) for a better fit"),
    ("Freel is lower on this QB class than most boards: he has Drew Mestemaker as QB1, Dante Moore in round 2, and Arch Manning likely returning to Texas.",
     "This ranking is lower on the QB class than most: Drew Mestemaker is QB1, Dante Moore falls to round 2, and Arch Manning is likely to return to Texas."),
]
for a, b in reps:
    if a in s: s = s.replace(a, b)
    else: assert b in s, a[:70]
i = s.index('<p><strong>How this was made.</strong> Prospects and their order come from C.J. Freel') if 'C.J. Freel\'s <a' in s else -1
if i >= 0:
    j = s.index('</p>', s.index('</p>', i) + 4) + 4
    s = s[:i] + ("<p><strong>How this was made.</strong> Prospects and their order come from current superflex rookie rankings "
                 "(as of mid-November 2026). Arch Manning, Sam Leavitt and Austin Simmons are projected as likely to return to college, "
                 "and Hollywood Smothers is out for the season; they're flagged. The comparison column is "
                 "<a href=\"https://www.thebigboard.gg/dynasty/rookie-rankings-2027\" target=\"_blank\" rel=\"noopener\">The Big Board's superflex list</a> (17 November).</p>"
                 "<p>Each pick takes the prospect with the best mix of the ranking and the team's need. Value at each spot uses The Big Board's value curve, "
                 "raised by up to about 40% for the team's thinnest position. After a pick, that team's need at the position drops.</p>") + s[j:]
open(f, 'w').write(s)
bm = f'{S}/scripts/build_mock.py'
t = open(bm).read()
strip = ("for x in d['mock'] + d['prospects'] + [m for t in d['teams'] for m in t['picks']]:\n    x.pop('src', None)\n"
         "d.pop('source', None)\n")
if strip not in t:
    t = t.replace("s = open(f'{S}/page4/mock.src.html').read()", strip + "s = open(f'{S}/page4/mock.src.html').read()")
    open(bm, 'w').write(t)
print('patched')
