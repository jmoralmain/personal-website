import json, sys
d = sys.argv[1]
f = f'{d}/page2/postmortems.src.html'
s = open(f).read()
fixes = [
    ('It dropped Patrick Mahomes, its 8th-round pick, after week 1. Mahomes scored 85.6 points over the three weeks hnestande had left, and 181.4 for the season.',
     'It dropped Patrick Mahomes, its 8th-round pick, in week 1. Mahomes scored 85.6 points during hnestande\'s four weeks, and 181.4 for the season.'),
    ('and dropped Patrick Mahomes after week 1.', 'and dropped Patrick Mahomes in week 1.'),
    ('have scored 358 points this season for other teams.', 'have scored 358 points between them this season.'),
    ("It went out to Love Hurts by 1.46 points, with Cam Skattebo starting for 0.0 and Keon Coleman (15.9) on the bench. That one swap would have saved it.",
     "It went out to Love Hurts by 1.46 points, with Cam Skattebo starting for 0.0 and Keon Coleman (15.9) on the bench. Its best lineup, with Coleman in and Skattebo out, would have survived by 15.2."),
]
for a, b in fixes:
    if a in s: s = s.replace(a, b)
    else: assert b in s, a[:50]
open(f, 'w').write(s)
rows = json.load(open(f'{d}/losers.json'))
for r in rows:
    if r['chopped']: r['teams_left'] = r['weekly'][-1]['teams']
keep = [r for r in rows if r['chopped']]
surv = {r['team']: r['efficiency'] for r in rows if not r['chopped']}
out = (s.replace('__LOSERS__', json.dumps(keep, separators=(',', ':'))).replace('__SURV__', json.dumps(surv))
       .replace('__FAAB__', open(f'{d}/faab_chopped.json').read()).replace('__RESALE__', open(f'{d}/resale.json').read()))
assert '__' not in out.split('<script>')[1][:60]
open(f'{d}/page2/postmortems.html', 'w').write(out)
print('built', len(out))
