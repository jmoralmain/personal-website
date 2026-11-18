import json
J = lambda f: json.load(open('raw/' + f))
SC = J('league.json')['scoring_settings']; P = J('players.json')
score = lambda s: sum(v * s.get(k, 0) for k, v in SC.items())
W = {}
for w in range(1, 11):
    S = J(f'stats_{w}.json'); byp = {}
    for pid, s in S.items():
        p = (P.get(pid) or {}).get('position')
        if p in ('QB', 'RB', 'WR', 'TE') and s.get('gms_active'): byp.setdefault(p, []).append(score(s))
    W[w] = {p: sorted(v, reverse=True) for p, v in byp.items()}
D = json.load(open('players_perf.json'))
for label, N in [('strict QB10/RB20/WR20/TE10', {'QB': 10, 'RB': 20, 'WR': 20, 'TE': 10}),
                 ('base   QB13/RB30/WR30/TE13', {'QB': 13, 'RB': 30, 'WR': 30, 'TE': 13}),
                 ('loose  QB18/RB45/WR45/TE18', {'QB': 18, 'RB': 45, 'WR': 45, 'TE': 18})]:
    out = {}
    for t in ['Love Hurts', 'TannerMenning', 'masonmay', 'KDEMPSTER15']:
        tot = wks = paidpar = paid = 0
        for o in D:
            if o['team'] != t: continue
            v = sum(pts - W[w][o['pos']][N[o['pos']] - 1] for w, pts, rk, s in o['wkly'] if s)
            wks += sum(1 for x in o['wkly'] if x[3]); tot += v
            if o['bid'] > 0 and o['games']: paidpar += v; paid += o['bid']
        out[t] = f'PAR {tot:6.1f} | per start {tot / wks:5.2f} | $/PAR {paid / paidpar:5.2f}'
    print(label); [print('   ', k.ljust(14), v) for k, v in out.items()]
