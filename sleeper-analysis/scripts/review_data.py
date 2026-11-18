import json, csv
J = lambda f: json.load(open('raw/' + f))
SC = J('league.json')['scoring_settings']; P = J('players.json')
score = lambda s: sum(v * s.get(k, 0) for k, v in SC.items())
W = {}
for w in range(1, 11):
    byp = {}
    for pid, s in J(f'stats_{w}.json').items():
        p = (P.get(pid) or {}).get('position')
        if p in ('QB', 'RB', 'WR', 'TE') and s.get('gms_active'): byp.setdefault(p, []).append(score(s))
    W[w] = {p: sorted(v, reverse=True) for p, v in byp.items()}
D = json.load(open('players_perf.json'))
summ = {s['team']: s for s in csv.DictReader(open('/home/user/personal-website/sleeper-analysis/team_waiver_summary.csv'))}
LINES = {'strict': {'QB': 10, 'RB': 20, 'WR': 20, 'TE': 10}, 'base': {'QB': 13, 'RB': 30, 'WR': 30, 'TE': 13}, 'loose': {'QB': 18, 'RB': 45, 'WR': 45, 'TE': 18}}
TEAMS = ['Love Hurts', 'TannerMenning', 'masonmay', 'KDEMPSTER15']
review = {}
for t in TEAMS:
    review[t] = {'draft': float(summ[t]['total_started_points']) - float(summ[t]['pickup_started_points'])}
    for k, N in LINES.items():
        tot = paidpar = paid = 0; noburrow = [0, 0]
        for o in D:
            if o['team'] != t: continue
            v = sum(pts - W[w][o['pos']][N[o['pos']] - 1] for w, pts, rk, s in o['wkly'] if s)
            tot += v
            if o['bid'] > 0 and o['games']:
                paidpar += v; paid += o['bid']
                if o['p'] != 'Joe Burrow': noburrow[0] += v; noburrow[1] += o['bid']
        review[t][k] = dict(par=round(tot, 1), cpp=round(paid / paidpar, 2))
        if t == 'Love Hurts': print(k, 'LH without Burrow $/PAR', round(noburrow[1] / noburrow[0], 2))
    print(t, review[t])
json.dump(review, open('review.json', 'w'))

def team(d, n): return [x for x in d['teams'] if x['team'] == n][0]
rec, sea = json.load(open('sim.json')), json.load(open('sim_norecency.json'))
sim = {}
for t in TEAMS:
    a, b = team(rec, t), team(sea, t)
    sim[t] = dict(recent=dict(win=a['p_win']), season=dict(win=b['p_win']),
                  blend=dict(win=(a['p_win'] + b['p_win']) / 2, final=(a['p_final'] + b['p_final']) / 2, surv=(a['p_survive11'] + b['p_survive11']) / 2),
                  proj={int(k): v for k, v in b['proj_by_week'].items()}, out={int(k): v for k, v in b['out_wk'][0].items()})
    print(t, sim[t]['blend'], sim[t]['proj'])
json.dump(sim, open('simpage.json', 'w'))
