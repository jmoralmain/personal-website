"""Fantasy Slags page: trades now count 2027+ picks at expected value. Rewrites the affected copy and checks every number used."""
import json, sys, math
S = sys.argv[1]
r = lambda v: math.floor(v + 0.5)
d = json.load(open(f'{S}/slags_out.json'))
T = {t['owner']: t for t in d['teams']}
TR = {t['n']: t for t in d['trades']}
rk = sorted(d['teams'], key=lambda t: -t['total'])
tr = sorted(d['teams'], key=lambda t: -t['tr_net'])
# ---- checks
assert [t['owner'] for t in rk[:2]] == ['radumanea', 'jpmarlowe'] and r(rk[0]['total']) == 226 and r(rk[1]['total']) == 224
assert rk[-1]['owner'] == 'drewbagel11' and r(rk[-1]['total']) == -206
x = T['radumanea']; assert r(x['draft_voe']) == 173 and r(x['tr_net']) == 53 and r(x['tr_now']) == 155 and r(x['tr_fut']) == -102 and r(x['pf']) == 1382
x = T['drewbagel11']; assert r(x['draft_voe']) == -163 and x['trades'] == 1 and x['tr_best'] == [13, -42.2] and (x['w'], x['l']) == (4, 6)
assert sorted(d['teams'], key=lambda t: t['draft_voe'])[1]['owner'] == 'drewbagel11'
x = T['ryandoerr']; assert r(x['tr_now']) == -282 and r(x['tr_fut']) == 316 and r(x['tr_net']) == 33
assert d['fit']['corr'] == 0.89 and d['fit']['pf_corr'] == 0.96 and d['fit']['draft_corr'] == 0.69
assert [t['owner'] for t in tr[:2]] == ['Nemdawg1', 'butingwantsbuckets'] and r(tr[0]['tr_net']) == 79 and r(tr[1]['tr_net']) == 79
assert tr[-1]['owner'] == 'kyleavery' and r(tr[-1]['tr_net']) == -93 and T['kyleavery']['trades'] == 2
assert r(TR[5]['margin']) == 28 and r(TR[18]['margin']) == 54 and r(TR[17]['margin']) == 75 and r(TR[20]['margin']) == 19 and r(TR[13]['margin']) == 42
assert all(a['value'] == 0 for n in (17, 20) for s in TR[n]['sides'] if s['owner'] == 'kyleavery' for a in s['got'])
assert max((t for t in d['trades'] if t['verdict'] == 'win'), key=lambda t: t['margin'])['n'] == 1
fut = [a for t in d['trades'] for s in t['sides'] for a in s['got'] if a['kind'] == 'pick' and a['status'] == 'future']
assert len(fut) == 25 and r(sum(a['value'] for a in fut)) == 671

f = f'{S}/page6/slags.src.html'
s = open(f).read()
reps = [
 # ---- Overall
 ("Every pick of the startup draft and all 20 trades are measured in points above replacement, then added up into one ranking.",
  "Every pick of the startup draft and all 20 trades are measured in points above replacement, with traded future picks at their expected value, then added up into one ranking."),
 ("<li><strong>+328 from its decisions,</strong> the most in the league.</li>", "<li><strong>+226 from its decisions,</strong> the most in the league, 2 ahead of jpmarlowe.</li>"),
 ("<li><strong>A strong draft (+173)</strong> led by Christian McCaffrey in round 3, and the best trading record (+155) without losing a deal.</li>",
  "<li><strong>A strong draft (+173)</strong> led by Christian McCaffrey in round 3. Its trades add +53: the players it bought have produced 155, and the future picks it paid are worth 102.</li>"),
 ('<div class="name">butingwantsbuckets</div>\n          <ul>\n            <li><strong>−328 from its decisions,</strong> last in the league.</li>',
  '<div class="name">drewbagel11</div>\n          <ul>\n            <li><strong>−206 from its decisions,</strong> last in the league.</li>'),
 ("<li><strong>The weakest startup draft (−186).</strong> Only 4 of its 22 picks are above replacement.</li>",
  "<li><strong>The second-weakest startup draft (−163).</strong> Only 7 of its 22 picks are above replacement.</li>"),
 ("<li><strong>0-10 with the fewest points (639).</strong> It has since turned seller and holds six future first-round picks.</li>",
  "<li><strong>Its one trade sent its 2027 first, projected 1.04, to ryandoerr</strong> for Quinshon Judkins (−42). It is 4-6.</li>"),
 ("Those picks have no value here yet, so its trade total reads −282 for now.</p>",
  "On production alone its trades are −282; the picks it got back are worth 316 at expected value, so they net +33.</p>"),
 ("<div><span class=\"eyebrow\">Already decisive</span><b>Draft and trades</b><p>Together they line up with this year's wins at a correlation of 0.89, and with points scored at 0.96. The draft alone gets 0.69.</p></div>",
  "<div><span class=\"eyebrow\">Already decisive</span><b>Draft and trades</b><p>Draft value plus what traded players have produced lines up with this year's wins at a correlation of 0.89, and with points scored at 0.96. The draft alone gets 0.69.</p></div>"),
 ("<p>Each team's startup-draft value plus its net trade value, against its wins so far.",
  "<p>Each team's startup-draft value plus the net value its traded players have produced, against its wins so far. Future picks are left out of this chart because they haven't played yet."),
 ("txt(svg, m.l + iw, H - 4, 'Draft value + trade value →', { 'text-anchor': 'end' });", "txt(svg, m.l + iw, H - 4, 'Draft value + traded players →', { 'text-anchor': 'end' });"),
 ("    const cx = x(t.total), cy = y(t.w);", "    const cx = x(t.now), cy = y(t.w);"),
 ("<div class=\"row\"><span>Trades</span><span class=\"num\">${sign(t.tr_net)}</span></div><div class=\"row\"><span><b>Total</b></span><span class=\"num\"><b>${sign(t.total)}</b></span></div>",
  "<div class=\"row\"><span>Traded players</span><span class=\"num\">${sign(t.tr_now)}</span></div><div class=\"row\"><span><b>Charted</b></span><span class=\"num\"><b>${sign(t.now)}</b></span></div><div class=\"row\"><span>Future picks (not charted)</span><span class=\"num\">${sign(t.tr_fut)}</span></div>"),
 ("Trades: net value from the Trades tab. \"Predicted\" is wins from the fit above.",
  "Trades: net value from the Trades tab, with future picks at expected value. \"Predicted\" is wins from the fit above, which leaves future picks out."),
 ("Trade values count only what players produced in the new team's starting lineup. Picks for 2027 and later have no value yet.",
  "Trade values count what players produced in the new team's starting lineup, and picks for 2027 and later at their expected value from the Draft picks tab."),
 # ---- Trades
 ("Two teams have spent the season selling players for future picks, and those picks can't be valued until they're drafted, so many deals here are too early to call.</p>",
  "Picks for 2027 and later count at their expected value from the Draft picks tab. A deal where one side got only picks is still marked too early to call, because those picks haven't produced anything yet.</p>"),
 ('<span class="eyebrow">Best trader so far</span>\n          <div class="name">radumanea</div>',
  '<span class="eyebrow">Best traders so far</span>\n          <div class="name">Nemdawg1 · butingwantsbuckets</div>'),
 ("<li><strong>+155 net from 4 trades,</strong> the most in the league, without losing one.</li>",
  "<li><strong>+79 each,</strong> the top two totals, from opposite directions.</li>"),
 ("<li><strong>Its biggest gain came during the draft:</strong> a pick swap that landed Bryce Young (+72).</li>",
  "<li><strong>Nemdawg1 bought players and won on both:</strong> Dak Prescott for a 2027 first and second (+28, #5), and Chris Olave to jpmarlowe for Tre Tucker, Brian Thomas Jr., a 2027 first and a 2028 second (+54, #18).</li>"),
 ("<li><strong>It then bought D'Andre Swift and George Pickens</strong> from the league's busiest seller, ryandoerr.</li>",
  "<li><strong>butingwantsbuckets sold:</strong> its best deal got kyleavery's 2027 first, 2028 second and 2028 third for RJ Harvey and TreVeyon Henderson (+75, #17).</li>"),
 ('<span class="eyebrow">The sellers</span>\n          <div class="name">ryandoerr · butingwantsbuckets</div>',
  '<span class="eyebrow">Furthest behind</span>\n          <div class="name">kyleavery</div>'),
 ("<li><strong>−282 and −142 net,</strong> the two lowest totals, almost all from players sent away for picks.</li>",
  "<li><strong>−93 net from 2 trades,</strong> the lowest total. Both bought players with picks.</li>"),
 ("<li><strong>Between them they hold 14 of the league's 36 future first-round picks,</strong> 8 and 6.</li>",
  "<li><strong>Its 2027 first, projected 1.06, plus a 2028 second and third</strong> went to butingwantsbuckets for RJ Harvey and TreVeyon Henderson (−75, #17).</li>"),
 ("<li><strong>Their trades will be judged in the 2027–29 drafts.</strong> Until then the numbers only show the cost.</li>",
  "<li><strong>A 2029 second</strong> went to ryandoerr for Joe Fagnano and Gardner Minshew II (−19, #20). None of the four players has produced above replacement in its lineup.</li>"),
 ("<div><span class=\"eyebrow\">Biggest early lead</span><b>Dak Prescott</b><p>Nemdawg1 sent a 2027 first and second to ryandoerr for Prescott in week 1. He has produced 106 above replacement for Nemdawg1 since.</p></div>",
  "<div><span class=\"eyebrow\">The sellers, re-scored</span><b>ryandoerr · butingwantsbuckets</b><p>Counting their picks, both come out ahead: +33 and +79. On production alone their trades are −282 and −142. Between them they hold 14 of the league's 36 future first-round picks.</p></div>"),
 ("Received: points above replacement the team's new players have produced in its starting lineup. Given: what the assets it sent away have produced for their new teams. Future picks received counts 2027–29 picks gained in trades.",
  "Received: points above replacement the team's new players have produced in its starting lineup, plus the expected value of 2027–29 picks. Given: the same for the assets it sent away. Future picks (net): the expected value of picks received minus picks sent. Future picks received counts 2027–29 picks gained in trades."),
 ("<th class=\"r\">Net</th><th></th><th class=\"r\">Future picks received</th>", "<th class=\"r\">Net</th><th></th><th class=\"r\">Future picks (net)</th><th class=\"r\">Future picks received</th>"),
 ("<td>${bar(t.tr_net)}</td>\n    <td class=\"r\">${futRecv[t.rid]}</td>", "<td>${bar(t.tr_net)}</td>\n    <td class=\"r\">${sign(t.tr_fut)}</td><td class=\"r\">${futRecv[t.rid]}</td>"),
 ("const valueOf = a => (a.kind === 'player' || (a.kind === 'pick' && a.status === 'used')) ? R(a.value) : '–';",
  "const valueOf = a => (a.kind === 'player' || (a.kind === 'pick' && (a.status === 'used' || a.status === 'future'))) ? R(a.value) : '–';"),
 ("if (a.status === 'future') return `${base}, future pick`;", "if (a.status === 'future') return `${base}, future pick (expected)`;"),
 ("Picks for 2027 and later have no value yet, and one trade moved $1 of FAAB, which isn't valued.",
  "Picks for 2027 and later count at their expected value from the Draft picks tab (25 picks, 671 in all): 2027 at its projected slot, 2028 and 2029 at the round average. That is a projection, not production, and the 2027 slots will move with the standings. One trade moved $1 of FAAB, which isn't valued."),
]
for a, b in reps:
    if a in s: s = s.replace(a, b)
    else: assert b in s, a[:90]
open(f, 'w').write(s)
print('patched')
