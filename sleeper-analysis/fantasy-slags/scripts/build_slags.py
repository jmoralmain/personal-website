import json, sys
S = sys.argv[1]
f = f'{S}/page6/slags.src.html'
s = open(f).read()
fixes = [
    ("Those picks have no value here yet, so its trade total reads −283 for now.", "Those picks have no value here yet, so its trade total reads −282 for now."),
    ("<li><strong>−283 and −142 net,</strong>", "<li><strong>−282 and −142 net,</strong>"),
    ("The curve expects about 112 at #1, 65 at #10, 51 at #20 and almost nothing after round 8, so a first-round pick has to produce a lot to grade well.",
     "The curve expects about 112 at #1, 65 at #10, 51 at #20 and 19 at the end of round 8, reaching zero around pick 240, so a first-round pick has to produce a lot to grade well."),
    ("<p>11 of the league's 20 trades, buying future picks in 10 of them. Its only player return so far is Carnell Tate.</p>",
     "<p>11 of the league's 20 trades, buying future picks in 9 of them. Its only player returns are Carnell Tate and De'Zhaun Stribling, the startup pick it got in a draft-day swap.</p>"),
]
for a, b in fixes:
    if a in s: s = s.replace(a, b)
    else: assert b in s, a[:60]
open(f, 'w').write(s)
data = json.load(open(f'{S}/slags_out.json'))
assert not any(t['me'] for t in data['teams'])
open(f'{S}/page6/slags.html', 'w').write(s.replace('__SLAGS__', json.dumps(data, separators=(',', ':'))))
print('built')
