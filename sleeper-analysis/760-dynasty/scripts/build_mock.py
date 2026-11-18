"""Build the 2027 mock view and add it to the merged 760 page after Draft picks."""
import json, sys
S = sys.argv[1]
d = json.load(open(f'{S}/mock2027.json'))
for m in d['mock']:
    if m['why'] == 'value': m['why'] = 'fit'
for t in d['teams']:
    for m in t['picks']:
        if m['why'] == 'value': m['why'] = 'fit'
s = open(f'{S}/page4/mock.src.html').read()
open(f'{S}/page4/mock.html', 'w').write(s.replace('__MOCK__', json.dumps(d, separators=(',', ':'))))
m = f'{S}/scripts/merge_dyn.py'
mt = open(m).read()
if "'page4/mock.html'" not in mt:
    mt = mt.replace("         ('rookies-2025', 'page4/rookies-2025.html',", "         ('mock-2027', 'page4/mock.html', '2027 mock', '760 Dynasty 2027 Mock Draft'),\n         ('rookies-2025', 'page4/rookies-2025.html',")
    mt = mt.replace("       '<a href=\"#rookies-2025\" data-view=\"rookies-2025\">2025 rookie draft</a>'",
                    "       '<a href=\"#mock-2027\" data-view=\"mock-2027\">2027 mock</a>'\n       '<a href=\"#rookies-2025\" data-view=\"rookies-2025\">2025 rookie draft</a>'")
    assert "'page4/mock.html'" in mt and 'data-view="mock-2027"' in mt
    open(m, 'w').write(mt)
for f, old, new in ((f'{S}/scripts/merge_test.js', "'picks', 'grades'", "'picks', 'mock-2027', 'grades'"),
                    (f'{S}/scripts/neutral_test.js', "'picks', 'rookies-2025'", "'picks', 'mock-2027', 'rookies-2025'")):
    x = open(f).read()
    if new not in x:
        assert old in x, f; open(f, 'w').write(x.replace(old, new))
print('built', len(d['mock']), 'picks')
