// Load the Fantasy Slags page under a strict CSP, walk every view, check rendering, text and layout.
const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [file, outDir] = process.argv.slice(2);
  const CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src data: blob:";
  const html = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>' + fs.readFileSync(file, 'utf8') + '</body></html>';
  const b = await chromium.launch();
  for (const [name, vp, scheme] of [['s-desk', { width: 1100, height: 900 }, 'light'], ['s-phone', { width: 390, height: 800 }, 'dark']]) {
    const p = await b.newPage({ viewport: vp, colorScheme: scheme });
    const errs = [];
    p.on('pageerror', e => errs.push('pageerror: ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
    await p.route('http://artifact.test/**', r => r.fulfill({ status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'content-security-policy': CSP }, body: html }));
    await p.goto('http://artifact.test/');
    await p.waitForTimeout(800);
    for (const key of ['overall', 'draft', 'trades', 'overall']) {
      await p.click(`.sitenav a[data-view="${key}"]`);
      await p.waitForTimeout(400);
      const info = await p.evaluate(k => {
        const v = document.getElementById('v-' + k);
        const t = v.innerText;
        const wide = [...v.querySelectorAll('.tbl')].filter(e => e.scrollWidth > e.clientWidth + 1).map(e => e.firstElementChild && e.firstElementChild.tagName).length;
        return { visible: [...document.querySelectorAll('.view')].filter(x => !x.hidden).map(x => x.id), title: document.title, tables: v.querySelectorAll('table').length,
          circles: v.querySelectorAll('svg circle').length, cells: v.querySelectorAll('.cell').length, cards: v.querySelectorAll('.card').length,
          you: (t.match(/\b(you|your)\b/gi) || []).length, overflow: document.documentElement.scrollWidth - innerWidth, scrollingTables: wide };
      }, key);
      console.log(name, key, JSON.stringify(info));
      if (name === 's-desk' && key !== 'overall') await p.screenshot({ path: `${outDir}/${name}-${key}.png`, fullPage: true });
      if (name === 's-desk' && key === 'overall') await p.screenshot({ path: `${outDir}/${name}-overall.png`, fullPage: true });
    }
    console.log(name, errs.length ? errs.join('\n') : 'no errors');
  }
  await b.close();
})();
