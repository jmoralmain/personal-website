"""Inline the 2025 rookie draft data into the page template.
Usage: python3 -I rk25_build.py <rk25.json> <template.html> <out.html>"""
import json, sys
d = json.load(open(sys.argv[1]))
keep = ['pick', 'rd', 'slot', 'rid', 'owner', 'orig', 'orig_owner', 'traded', 'name', 'pos', 'nfl', 'pts', 'gp', 'rank',
        'par', 'par_total', 'hit', 'hits', 'starts_team', 'starts_any', 'exp', 'vos', 'now_rid', 'now_owner']
data = dict(rows=[{k: r[k] for k in keep} for r in d['rows']], teams=d['teams'], pos=d['pos'], repl=d['repl'])
html = open(sys.argv[2]).read().replace('__DATA__', json.dumps(data, separators=(',', ':')))
open(sys.argv[3], 'w').write(html)
print('wrote', sys.argv[3], len(html), 'bytes')
