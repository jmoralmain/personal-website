"""Add Waivers and Draft picks views to the Fantasy Slags page, refresh its dates, and build it.
Usage: python3 -I build_slags_v2.py <scratchpad>
Inputs: page6/slags.src.html, slags_out.json, waivers_slags.json, picks_slags.json. Output: page6/slags.html
"""
import json, sys
S = sys.argv[1]
src = f'{S}/page6/slags.src.html'
s = open(src).read()

NAV_OLD = '    <a href="#trades" data-view="trades">Trades</a>\n  </nav>'
NAV_NEW = ('    <a href="#trades" data-view="trades">Trades</a>\n'
           '    <a href="#waivers" data-view="waivers">Waivers</a>\n'
           '    <a href="#picks" data-view="picks">Draft picks</a>\n  </nav>')

VIEWS = r'''
  <!-- ============ WAIVERS ============ -->
  <div class="view" id="v-waivers" data-title="Fantasy Slags Waivers" hidden>
    <header>
      <div class="eyebrow">Sleeper · Fantasy Slags · every add and drop through week 10</div>
      <h1>Fantasy Slags Waivers</h1>
      <p class="lede prose">163 waiver claims and free-agent moves, judged on what each added player produced in the adding team's starting lineup. So far the wire has barely mattered: all 117 adds together are worth 102 points above replacement, less than one good startup pick.</p>
    </header>
    <section aria-label="Waiver verdict">
      <div class="verdicts">
        <div class="vbox best">
          <span class="eyebrow">Best on the wire so far</span>
          <div class="name">drewbagel11</div>
          <ul>
            <li><strong>+16 net from 13 adds,</strong> the top total, without dropping anyone who helped another team.</li>
            <li><strong>Small, steady hits:</strong> Kyle McCord, Mack Hollins and Pat Freiermuth each made a start above replacement.</li>
            <li><strong>Only $15 of FAAB spent.</strong> jpmarlowe (+14, Aaron Rodgers) and Nemdawg1 (+14) are right behind.</li>
          </ul>
        </div>
        <div class="vbox worst">
          <span class="eyebrow">Costliest drop</span>
          <div class="name">butingwantsbuckets</div>
          <ul>
            <li><strong>−11 net,</strong> the lowest in the league.</li>
            <li><strong>It cut Aaron Rodgers in week 3.</strong> jpmarlowe picked him up for free and got 14 above replacement from two starts.</li>
            <li><strong>Its five adds have produced 3,</strong> all from Elic Ayomanor.</li>
          </ul>
        </div>
      </div>
      <div class="also">
        <div><span class="eyebrow">FAAB</span><b>$362 spent, nothing back</b><p>No player bought with FAAB has produced a point above replacement in a starting lineup yet. The biggest bid, $75 on Gardner Minshew II, hasn't been started.</p></div>
        <div><span class="eyebrow">Where the value is</span><b>Quarterbacks</b><p>QBs are 25 of the 117 adds but 56 of the 102 points. In superflex, a streaming QB is the one move that has paid.</p></div>
        <div><span class="eyebrow">Mostly roster churn</span><b>70 of 117 never started</b><p>Only 3 adds have reached 10 above replacement: Aaron Rodgers, Emanuel Wilson and Drew Lock.</p></div>
      </div>
    </section>
    <section>
      <div class="stack prose">
        <h2>The waiver ledger</h2>
        <p>Each team's adds and drops, added up. The numbers are small on purpose: they count only starts above replacement, and few free agents have earned one.</p>
      </div>
      <div class="panel">
        <div class="tbl" id="t-wteams"></div>
        <p class="note">Added value: points above replacement the team's pickups scored in its starting lineup until it let them go. Drop cost: what a dropped player produced for the next team that added him (counted once, never twice). Never started: adds that didn't make a single start for the team.</p>
      </div>
    </section>
    <section>
      <div class="stack prose"><h2>Best pickups</h2></div>
      <div class="panel"><div class="tbl" id="t-wadds"></div></div>
    </section>
    <section>
      <div class="stack prose"><h2>Drops that helped someone else</h2><p>Every drop that went on to produce for another team. These are the only nine.</p></div>
      <div class="panel"><div class="tbl" id="t-wdrops"></div></div>
    </section>
    <section>
      <div class="stack prose"><h2>The biggest FAAB bids</h2></div>
      <div class="panel"><div class="tbl" id="t-wpaid"></div></div>
    </section>
    <footer>
      <p>Every completed waiver claim and free-agent add, weeks 1–11 (one week-11 move so far, too new to have produced). Weekly replacement is that week's 24th QB, 30th RB, 42nd WR and 14th TE among players who played. Kickers and defenses are left out. Each team has a $100 FAAB budget.</p>
    </footer>
  </div>

  <!-- ============ PICKS ============ -->
  <div class="view" id="v-picks" data-title="Fantasy Slags Draft Picks" hidden>
    <header>
      <div class="eyebrow">Sleeper · Fantasy Slags · rookie picks for 2027, 2028 and 2029</div>
      <h1>Fantasy Slags Draft Picks</h1>
      <p class="lede prose">Every first-, second- and third-round rookie pick for the next three drafts: who owns it, where it came from, and what it's worth. Two sellers now hold 14 of the 36 first-round picks.</p>
    </header>
    <section aria-label="Draft capital verdict">
      <div class="verdicts">
        <div class="vbox best">
          <span class="eyebrow">Most draft capital</span>
          <div class="name">ryandoerr</div>
          <ul>
            <li><strong>17 picks, 8 of them firsts,</strong> worth 592, more than twice the 235 every team started with.</li>
            <li><strong>Five of the twelve 2027 first-rounders,</strong> projected 1.02, 1.04, 1.05, 1.09 and 1.10.</li>
            <li><strong>Bought from seven different teams.</strong></li>
          </ul>
        </div>
        <div class="vbox worst">
          <span class="eyebrow">Least draft capital</span>
          <div class="name">radumanea · mynameisuser</div>
          <ul>
            <li><strong>Worth 105 and 114,</strong> each about 100 below where they started.</li>
            <li><strong>One first-round pick each across 2027–29,</strong> and neither owns its 2027 first.</li>
            <li><strong>Both are 6-4 or better,</strong> so they spent picks to win now.</li>
          </ul>
        </div>
      </div>
      <div class="also">
        <div><span class="eyebrow">Projected 1.01</span><b>butingwantsbuckets</b><p>0-10 and still holding its own 2027 first, plus two more (1.06 and 1.08). 19 picks in all, the most in the league.</p></div>
        <div><span class="eyebrow">No 2027 first</span><b>Six teams</b><p>drewbagel11, kyleavery, mynameisuser, lomesinurmouth, radumanea and jpmarlowe have all traded theirs.</p></div>
        <div><span class="eyebrow">Untouched</span><b>warrenking</b><p>The only team that hasn't moved a future pick: its own nine, worth 261.</p></div>
      </div>
    </section>
    <section>
      <div class="stack prose">
        <h2>Who holds what</h2>
        <p>Each team's picks for the next three drafts, valued, against what it started with.</p>
      </div>
      <div class="panel">
        <div class="tbl" id="t-pteams"></div>
        <p class="note">Value: expected points above replacement over a rookie's first season and a half at that pick. vs. start: change from the team's own nine picks.</p>
      </div>
    </section>
    <section>
      <div class="stack prose">
        <h2>The 2027 first round, as it stands</h2>
        <p>Projected from the current standings: worst record picks first, ties broken by fewer points scored.</p>
      </div>
      <div class="panel"><div class="tbl" id="t-p27"></div></div>
    </section>
    <section>
      <div class="stack prose"><h2>Every pick by team</h2><p>Picks a team got in a trade show the original owner.</p></div>
      <div class="panel"><div class="tbl" id="t-phold"></div></div>
    </section>
    <footer>
      <p>Pick ownership from Sleeper's traded-picks list for the league, pulled 19 November 2026. This league hasn't held a rookie draft yet, so pick values use the curve fitted to a comparable superflex rookie draft (the 760 Dynasty's 2025 draft): expected value falls from 106 at the first pick to 3.7 for an average third. The 2027 order is projected from the standings; 2028 and 2029 picks are valued at their round's average, because the order is unknown.</p>
    </footer>
  </div>
</div>
'''

JS = r'''
/* ---------- Waivers ---------- */
const W = __SWAIV__;
const wk = a => `wk ${a.week}`;
(function waiverTeams() {
  const rows = [...W.teams].sort((a, b) => b.net - a.net || b.value - a.value);
  document.getElementById('t-wteams').innerHTML = `<table><thead><tr><th class="r"></th><th>Team</th><th class="r">Moves</th><th class="r">Adds</th><th class="r">Added value</th><th class="r">Drop cost</th><th class="r">Net</th><th class="r">Never started</th><th class="r">FAAB spent</th><th>Best pickup</th></tr></thead><tbody>${rows.map((t, i) => `<tr>
    <td class="r">${i + 1}</td><td>${esc(t.owner)}</td><td class="r">${t.moves}</td><td class="r">${t.adds}</td><td class="r">${t.value.toFixed(1)}</td><td class="r">${t.drop_cost.toFixed(1)}</td>
    <td class="r">${chip(t.net, [3, 8, 12])}</td><td class="r">${t.never_started}</td><td class="r">$${t.spent}</td>
    <td>${t.best && t.best.value > 0 ? `${esc(t.best.name)} <span class="dim">${t.best.pos} · ${t.best.value.toFixed(1)}</span>` : '<span class="dim">none above replacement</span>'}</td></tr>`).join('')}</tbody></table>`;
})();
(function waiverAdds() {
  const rows = W.top_adds.filter(a => a.value > 0).slice(0, 12);
  document.getElementById('t-wadds').innerHTML = `<table><thead><tr><th>Player</th><th>Team</th><th>When</th><th class="r">Cost</th><th class="r">Starts</th><th class="r">Value</th><th>Dropped for him</th></tr></thead><tbody>${rows.map(a => `<tr>
    <td><strong>${esc(a.name)}</strong> <span class="dim">${a.pos}</span></td><td>${esc(a.owner)}</td><td>${wk(a)} · ${a.kind === 'claim' ? 'claim' : 'free agent'}</td>
    <td class="r">${a.bid ? '$' + a.bid : 'free'}</td><td class="r">${a.starts}</td><td class="r">${a.value.toFixed(1)}</td><td>${a.dropped ? esc(a.dropped) : '<span class="dim">—</span>'}</td></tr>`).join('')}</tbody></table>`;
})();
(function waiverDrops() {
  const rows = W.top_drops.filter(d => d.cost > 0);
  document.getElementById('t-wdrops').innerHTML = `<table><thead><tr><th>Player</th><th>Dropped by</th><th>When</th><th>Picked up by</th><th class="r">Starts there</th><th class="r">Cost</th></tr></thead><tbody>${rows.map(d => `<tr>
    <td><strong>${esc(d.name)}</strong> <span class="dim">${d.pos}</span></td><td>${esc(d.owner)}</td><td>${wk(d)}</td><td>${esc(d.by)}</td><td class="r">${d.starts}</td><td class="r">${d.cost.toFixed(1)}</td></tr>`).join('')}</tbody></table>`;
})();
(function waiverPaid() {
  const rows = W.top_paid.slice(0, 10);
  document.getElementById('t-wpaid').innerHTML = `<table><thead><tr><th>Player</th><th>Team</th><th>When</th><th class="r">Bid</th><th class="r">Weeks rostered</th><th class="r">Starts</th><th class="r">Value</th></tr></thead><tbody>${rows.map(a => `<tr>
    <td><strong>${esc(a.name)}</strong> <span class="dim">${a.pos}</span></td><td>${esc(a.owner)}</td><td>${wk(a)}</td><td class="r">$${a.bid}</td><td class="r">${a.weeks}</td><td class="r">${a.starts}</td><td class="r">${a.value.toFixed(1)}</td></tr>`).join('')}</tbody></table>`;
})();

/* ---------- Draft picks ---------- */
const PK = __SPICKS__;
const rdName = r => ['1st', '2nd', '3rd'][r - 1];
(function pickTeams() {
  const rows = [...PK.teams].sort((a, b) => b.value - a.value);
  const max = Math.max(...rows.map(t => Math.abs(t.vs_start)));
  const bar = v => { const w = 70 * Math.abs(v) / max; return `<div class="tbar" aria-hidden="true"><i style="${v >= 0 ? `left:70px;width:${w}px;background:var(--d-p2)` : `left:${70 - w}px;width:${w}px;background:var(--d-n2)`}"></i></div>`; };
  document.getElementById('t-pteams').innerHTML = `<table><thead><tr><th class="r"></th><th>Team</th><th class="r">Record</th><th class="r">Picks</th><th class="r">1sts</th><th class="r">2nds</th><th class="r">3rds</th><th class="r">Value</th><th class="r">vs. start</th><th></th><th class="r">Got · gave</th></tr></thead><tbody>${rows.map((t, i) => `<tr>
    <td class="r">${i + 1}</td><td>${esc(t.owner)}</td><td class="r">${t.w}-${t.l}</td><td class="r">${t.n}</td><td class="r">${t.firsts}</td><td class="r">${t.seconds}</td><td class="r">${t.thirds}</td>
    <td class="r">${R(t.value)}</td><td class="r">${chip(t.vs_start, [15, 50, 150])}</td><td>${bar(t.vs_start)}</td><td class="r">${t.acquired} · ${t.traded_away}</td></tr>`).join('')}</tbody></table>`;
})();
(function pick27() {
  const val = Object.fromEntries(PK.picks.filter(p => p.season === '2027' && p.round === 1).map(p => [p.orig_rid, p]));
  document.getElementById('t-p27').innerHTML = `<table><thead><tr><th class="r">Pick</th><th>Original team</th><th class="r">Record</th><th>Owned by</th><th class="r">Value</th><th>How it moved</th></tr></thead><tbody>${PK.order27.map(o => { const p = val[o.rid]; return `<tr>
    <td class="r">1.${String(o.slot).padStart(2, '0')}</td><td>${esc(o.orig)}</td><td class="r">${o.w}-${o.l}</td><td>${o.owner === o.orig ? esc(o.owner) : `<strong>${esc(o.owner)}</strong>`}</td>
    <td class="r">${R(p.value)}</td><td>${p.moved.length ? p.moved.map(m => `${esc(m.frm)} → ${esc(m.to)} <span class="dim">wk ${m.week}</span>`).join('<br>') : '<span class="dim">not traded</span>'}</td></tr>`; }).join('')}</tbody></table>`;
})();
(function pickHold() {
  const rows = [...PK.teams].sort((a, b) => b.value - a.value);
  const cell = (rid, y) => {
    const mine = PK.picks.filter(p => p.rid === rid && p.season === y).sort((a, b) => a.round - b.round || (a.proj_pick || 0) - (b.proj_pick || 0));
    return mine.length ? mine.map(p => `${rdName(p.round)}${p.proj_pick ? ` <span class="dim">(${p.round}.${String((p.proj_pick - 1) % 12 + 1).padStart(2, '0')})</span>` : ''}${p.orig_rid !== rid ? ` <span class="dim">via ${esc(p.orig)}</span>` : ''}`).join('<br>') : '<span class="dim">none</span>';
  };
  document.getElementById('t-phold').innerHTML = `<table><thead><tr><th>Team</th><th>2027</th><th>2028</th><th>2029</th></tr></thead><tbody>${rows.map(t => `<tr>
    <td><strong>${esc(t.owner)}</strong></td><td class="assets">${cell(t.rid, '2027')}</td><td class="assets">${cell(t.rid, '2028')}</td><td class="assets">${cell(t.rid, '2029')}</td></tr>`).join('')}</tbody></table>`;
})();
'''

if 'v-waivers' not in s:
    assert NAV_OLD in s
    s = s.replace(NAV_OLD, NAV_NEW)
    i = s.index('</div>\n\n<script>')
    s = s[:i] + VIEWS.lstrip('\n') + s[i + len('</div>\n'):]
    s = s.replace('/* ---------- Router ---------- */', JS.lstrip('\n') + '\n/* ---------- Router ---------- */')
    s = s.replace('/* Layout: three hash-routed views (Overall, Draft grades, Trades)', '/* Layout: five hash-routed views (Overall, Draft grades, Trades, Waivers, Draft picks)')
for a, b in [('pulled 18 November 2026: the 2026 startup draft', 'pulled 19 November 2026: the 2026 startup draft'),
             ("Future picks come from Sleeper's traded-picks list for the league on 18 November 2026.",
              "Future picks come from Sleeper's traded-picks list for the league on 19 November 2026. The Draft picks tab has every pick."),
             ('Future 1sts are first-round picks held for 2027, 2028 and 2029; every team started with three.</p>',
              'Future 1sts are first-round picks held for 2027, 2028 and 2029; every team started with three. Waivers aren\'t in the total: all 117 adds together are worth 102, too little to move the ranking (see the Waivers tab).</p>')]:
    if a in s: s = s.replace(a, b)
    else: assert b in s, a[:60]
open(src, 'w').write(s)

data = json.load(open(f'{S}/slags_out.json'))
w = json.load(open(f'{S}/waivers_slags.json'))
p = json.load(open(f'{S}/picks_slags.json'))
assert not any(t['me'] for t in data['teams'] + w['teams'] + p['teams'])
dump = lambda x: json.dumps(x, separators=(',', ':'))
out = s.replace('__SLAGS__', dump(data)).replace('__SWAIV__', dump(w)).replace('__SPICKS__', dump(p))
open(f'{S}/page6/slags.html', 'w').write(out)
print('built', len(out))
