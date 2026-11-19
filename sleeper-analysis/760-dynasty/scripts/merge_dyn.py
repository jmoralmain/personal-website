"""Merge the four 760 Dynasty pages into one page with hash-routed views.

The artifact viewer only passes plain #name hashes, so links to sibling .html
files don't navigate. Each sub-page becomes a <div class="view"> inside the main
page: its CSS is scoped under #v-<key>, its element ids are prefixed, and its
script runs in its own function scope.
Usage: python3 -I merge_dyn.py <scratchpad>
"""
import re, sys
S = sys.argv[1]
VIEWS = [('overall', 'page5/overall.html', 'Overall', '760 Dynasty Overall'),
         ('trades', 'page4/trades.html', 'Trades', '760 Dynasty Trades'),
         ('waivers', 'page4/waivers.html', 'Waivers', '760 Dynasty Waivers'),
         ('picks', 'page4/picks.html', 'Draft picks', '760 Dynasty Draft Picks'),
         ('mock-2027', 'page4/mock.html', '2027 mock', '760 Dynasty 2027 Mock Draft'),
         ('rookies-2025', 'page4/rookies-2025.html', '2025 rookie draft', '760 Dynasty 2025 Rookie Draft'),
         ('rookies-2026', 'page4/rookies-2026.html', '2026 rookie draft', '760 Dynasty 2026 Rookie Draft')]
KEEP_GLOBAL = re.compile(r'^\s*(\*|html|body|:root|\.wrap|\.sitenav)\b')

def split_rules(css):
    """Yield (prelude, body) for top-level blocks, matching braces."""
    i, n, out = 0, len(css), []
    while i < n:
        j = css.find('{', i)
        if j < 0: break
        prelude = css[i:j].strip()
        depth, k = 1, j + 1
        while k < n and depth:
            depth += {'{': 1, '}': -1}.get(css[k], 0); k += 1
        out.append((prelude, css[j + 1:k - 1]))
        i = k
    return out

def strip_comments(css):
    return re.sub(r'/\*.*?\*/', '', css, flags=re.S)

def scope_css(css, prefix, ids, keep_globals):
    res = []
    for prelude, body in split_rules(strip_comments(css)):
        if prelude.startswith('@media') or prelude.startswith('@supports'):
            inner = scope_css(body, prefix, ids, keep_globals)
            if inner.strip(): res.append(f'{prelude} {{\n{inner}\n}}')
            continue
        if prelude.startswith('@'):
            if keep_globals: res.append(f'{prelude} {{{body}}}')
            continue
        sels = []
        for s in prelude.split(','):
            s = s.strip()
            if not s: continue
            if KEEP_GLOBAL.match(s):
                if keep_globals: sels.append(s)
                continue
            for i in ids: s = re.sub(rf'#{re.escape(i)}\b', f'#{prefix}-{i}', s)
            sels.append(f'#v-{prefix} {s}')
        if sels: res.append(f'{", ".join(sels)} {{{body}}}')
    return '\n'.join(res)

def parts(html):
    css = '\n'.join(re.findall(r'<style>(.*?)</style>', html, re.S))
    script = re.findall(r'<script>(.*?)</script>', html, re.S)[-1]
    start = html.index('<div class="wrap">') + len('<div class="wrap">')
    end = html.rindex('</div>', 0, html.index('<script>'))
    inner = html[start:end]
    inner = re.sub(r'<nav\b.*?</nav>', '', inner, flags=re.S)
    return css, inner, script

main = open(f'{S}/page3/dynasty.html').read()
m_css, m_inner, m_script = parts(main)
head_end = main.index('<style>')
m_ids = re.findall(r'id="([^"]+)"', m_inner)

views_html, views_css, views_js = [], [], []
for key, path, label, title in VIEWS:
    css, inner, script = parts(open(f'{S}/{path}').read())
    ids = sorted(set(re.findall(r'\bid="([^"]+)"', inner)), key=len, reverse=True)
    for i in ids:
        inner = re.sub(rf'\bid="{re.escape(i)}"', f'id="{key}-{i}"', inner)
        inner = re.sub(rf'\bfor="{re.escape(i)}"', f'for="{key}-{i}"', inner)
        script = script.replace(f"getElementById('{i}')", f"getElementById('{key}-{i}')")
    script = script.replace("document.querySelectorAll('.seg button')", f"document.querySelectorAll('#v-{key} .seg button')")
    leftover = re.findall(r"getElementById\('([^']+)'\)", script)
    bad = [x for x in leftover if not x.startswith(key + '-')]
    assert not bad, (key, bad)
    assert 'querySelector' not in script.replace(f"document.querySelectorAll('#v-{key} .seg button')", ''), key
    views_css.append(f'/* ---- view: {key} ---- */\n' + scope_css(css, key, ids, keep_globals=False))
    views_html.append(f'<div class="view" id="v-{key}" data-title="{title}" hidden>\n{inner}\n</div>')
    views_js.append(f'/* ---- view: {key} ---- */\n(function () {{\n{script}\n}})();')

grades_css = scope_css(m_css, 'grades', [], keep_globals=True)
# The grades view's own rules were scoped with prefix "grades"; tokens, base and nav stay global.
nav = ('<nav class="sitenav" aria-label="760 Dynasty pages">'
       '<a href="#overall" data-view="overall">Overall</a>'
       '<a href="#grades" data-view="grades">Draft grades</a>'
       '<a href="#trades" data-view="trades">Trades</a>'
       '<a href="#waivers" data-view="waivers">Waivers</a>'
       '<a href="#picks" data-view="picks">Draft picks</a>'
       '<a href="#mock-2027" data-view="mock-2027">2027 mock</a>'
       '<a href="#rookies-2025" data-view="rookies-2025">2025 rookie draft</a>'
       '<a href="#rookies-2026" data-view="rookies-2026">2026 rookie draft</a></nav>')
router = """
/* ---- view router: only plain #name hashes pass through the artifact viewer ---- */
(function () {
  const views = [...document.querySelectorAll('.view')];
  const links = [...document.querySelectorAll('.sitenav a')];
  function show() {
    const key = (location.hash || '').slice(1);
    const target = views.find(v => v.id === 'v-' + key) || views[0];
    views.forEach(v => { v.hidden = v !== target; });
    links.forEach(a => { if (a.dataset.view === target.id.slice(2)) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.title = target.dataset.title;
    window.dispatchEvent(new Event('resize'));
  }
  window.addEventListener('hashchange', () => { show(); window.scrollTo(0, 0); });
  show();
})();
"""
grades_view = f'<div class="view" id="v-grades" data-title="760 Dynasty Draft Grades">\n{m_inner}\n</div>'
extra_css = '.view { display: grid; gap: 48px; min-width: 0; }\n.view[hidden] { display: none !important; }'
page = (main[:head_end] + '<style>\n' + grades_css + '\n' + extra_css + '\n' + '\n'.join(views_css) + '\n</style>\n'
        + '<div class="wrap">\n' + nav + '\n' + views_html[0] + '\n' + grades_view + '\n' + '\n'.join(views_html[1:]) + '\n</div>\n'
        + '<script>\n(function () {\n' + m_script + '\n})();\n' + '\n'.join(views_js) + router + '</script>\n')
# ---- Neutral pass: the page goes to the whole league, so no team is singled out as "you". ----
# Every highlight (rows, cards, chart points, "you" pills) is keyed off a per-team "me" flag or ME id.
page = re.sub(r'"me":\s*true', '"me": false', page)
NEUTRAL = [
    ('const ME = 12;', 'const ME = 0;'),
    ('const ME = D.teams.find(t => t.me).rid;', 'const ME = (D.teams.find(t => t.me) || {}).rid;'),
    ("<b>Partly trades</b><p>Your −215 net from 14 trades", "<b>Partly trades</b><p>mynameisuser's −215 net from 14 trades"),
    ('21: `Your biggest trade. mynameisuser sent', '21: `mynameisuser\'s biggest trade. It sent'),
    ('14: `Your best trade. mynameisuser sent', '14: `mynameisuser\'s best trade. It sent'),
    ('but he never started for you and was traded for Rashee Rice', 'but he never started for mynameisuser and was traded for Rashee Rice'),
    ("<p>Less than you'd expect. 16 of the 36 rookies", "<p>Less than expected. 16 of the 36 rookies"),
]
for a, b in NEUTRAL:
    assert page.count(a) <= 1, (a, page.count(a))  # some copy has since been rewritten without "you"
    page = page.replace(a, b)
page, n = re.subn(r'\s*<section>\s*<div class="yours">.*?</section>', '', page, flags=re.S)
assert n == 1, n
# The rendered text is checked in the browser test; here only confirm no team is still flagged.
assert '"me": true' not in page and '"me":true' not in page
open(f'{S}/page3/dynasty-all.html', 'w').write(page)
print('merged', len(page), 'bytes; ids in grades view:', m_ids)
