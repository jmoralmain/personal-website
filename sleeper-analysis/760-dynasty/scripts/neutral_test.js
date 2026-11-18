// Render every view of the merged page and confirm nothing addresses the reader or singles out one team.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>' + fs.readFileSync(process.argv[2], 'utf8') + '</body></html>');
  await p.waitForTimeout(800);
  const out = {};
  for (const k of ['overall', 'grades', 'trades', 'rookies-2025', 'rookies-2026']) {
    await p.evaluate(k => { location.hash = k; }, k);
    await p.waitForTimeout(350);
    out[k] = await p.evaluate(k => {
      const v = document.getElementById('v-' + k);
      // include tooltips (title attributes) and the team filter, which innerText skips
      const t = v.innerText + ' ' + [...v.querySelectorAll('[title]')].map(e => e.getAttribute('title')).join(' ') + ' ' + [...v.querySelectorAll('option')].map(o => o.textContent).join(' ');
      return {
        youWords: (t.match(/\b(you|your|yours)\b/gi) || []).filter(w => w).length,
        samples: (t.match(/.{0,30}\b(you|your|yours)\b.{0,30}/gi) || []).slice(0, 4),
        highlighted: v.querySelectorAll('tr.me, .card.me, .cell.mine, .hd.me, .pill.me, .lbl.me, .yours').length,
        blueDots: [...v.querySelectorAll('circle')].filter(c => (c.getAttribute('fill') || '').includes('--me')).length,
        tables: v.querySelectorAll('table').length,
      };
    }, k);
  }
  console.log(JSON.stringify(out, null, 1));
  console.log('errors', JSON.stringify(errs));
  await b.close();
})();
