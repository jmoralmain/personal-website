"""Build a 2027 superflex prospect board from C.J. Freel's Substack (downloaded posts, read as data).
Order: his Superflex Mock #6 (2026-11-10) for the top 24, then his Big Board v2.0 (2026-11-05) for the rest,
with Caden Veltkamp placed right after LaNorris Sellers per his 2027 QB re-rank (2026-11-12).
Value: The Big Board's value at the same rank, so the scale matches the earlier mock.
Usage: python3 -I freel_board.py <cjf_dir> <bigboard_prospects_json> <out_json>
"""
import re, sys, json, html
D, BB, OUT = sys.argv[1:4]
def text_of(slug):
    s = open(f'{D}/{slug}.html', encoding='utf-8', errors='replace').read()
    body = re.search(r'<div class="available-content">(.*?)</article>', s, re.S)
    raw = re.sub(r'<(br|/p|/li|/h\d|/div)[^>]*>', '\n', body.group(1))
    return [l.strip() for l in html.unescape(re.sub(r'<[^>]+>', '', raw)).split('\n') if l.strip()]
POSMAP = {'QB': 'QB', 'RB': 'RB', 'WR': 'WR', 'TE': 'TE'}
mock = []
for l in text_of('cj-carr-aces-the-test-jackson-harris'):
    m = re.fullmatch(r'(\d)\.(\d\d) (.+?), (QB|RB|WR|TE), (.+)', l)
    if m: mock.append(dict(name=m.group(3).replace('’', "'"), pos=m.group(4), school=m.group(5), src=f'SF Mock #6 {m.group(1)}.{m.group(2)}'))
board = []
lines = text_of('big-board-v20-50-prospects-in-around')
i0 = next(i for i, l in enumerate(lines) if l.startswith('Big Board v2.0'))
for l in lines[i0 + 1:]:
    if l.startswith('Special Honorable Mention'): break
    m = re.fullmatch(r'(.+?), (QB|RB|WR|TE)(\d+), (.+)', l)
    if m: board.append(dict(name=m.group(1).replace('’', "'"), pos=m.group(2), school=m.group(4), src=f'Big Board v2.0 {m.group(2)}{m.group(3)}'))
assert len(mock) == 24, len(mock)
assert len(board) == 50, len(board)
norm = lambda n: re.sub(r'[^a-z]', '', n.lower().replace('jr', ''))
seen = {norm(p['name']) for p in mock}
rest = [p for p in board if norm(p['name']) not in seen]
k = next(i for i, p in enumerate(rest) if p['name'] == 'LaNorris Sellers')
rest.insert(k + 1, dict(name='Caden Veltkamp', pos='QB', school='Florida Atlantic', src='2027 QB re-rank (QB9)'))
order = mock + rest
bb = json.load(open(BB))
bbv = [p['value'] for p in bb]
bbrank = {norm(p['name']): p['rank'] for p in bb}
out = []
for i, p in enumerate(order, 1):
    v = bbv[i - 1] if i <= len(bbv) else round(bbv[-1] * (0.97 ** (i - len(bbv))))
    out.append(dict(rank=i, name=p['name'], pos=p['pos'], school=p['school'], value=v, slot=f'{(i - 1) // 12 + 1}.{(i - 1) % 12 + 1:02d}',
                    src=p['src'], bb_rank=bbrank.get(norm(p['name']))))
json.dump(out, open(OUT, 'w'), indent=1)
print(len(out), 'prospects')
for p in out[:40]: print(p['rank'], p['name'], p['pos'], p['school'], '| BB#', p['bb_rank'], '|', p['src'])
print('BB top-24 missing from Freel board:', [p['name'] for p in bb[:24] if norm(p['name']) not in {norm(x['name']) for x in out}])
