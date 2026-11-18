import json, csv, statistics as st
J = lambda f: json.load(open('raw/' + f))
SC = J('league.json')['scoring_settings']; P = J('players.json')
score = lambda s: sum(v * s.get(k, 0) for k, v in SC.items())
# replacement level: weekly score of QB13 / RB30 / WR30 / TE13 (roughly the best free agent in a 14-team, 2RB/2WR/2FLEX league)
REPL_N = {'QB': 13, 'RB': 30, 'WR': 30, 'TE': 13}
repl = {}
for w in range(1, 11):
    S = J(f'stats_{w}.json'); byp = {}
    for pid, s in S.items():
        p = (P.get(pid) or {}).get('position')
        if p in REPL_N and s.get('gms_active'): byp.setdefault(p, []).append(score(s))
    for p, v in byp.items(): repl[(p, w)] = sorted(v, reverse=True)[REPL_N[p] - 1]
D = json.load(open('players_perf.json'))
TEAMS = ['Love Hurts', 'TannerMenning', 'masonmay', 'KDEMPSTER15']
summ = {s['team']: s for s in csv.DictReader(open('/home/user/personal-website/sleeper-analysis/team_waiver_summary.csv'))}
ranks = {r['team']: [] for r in csv.DictReader(open('/home/user/personal-website/sleeper-analysis/weekly_rank_alive_teams.csv'))}
for r in csv.DictReader(open('/home/user/personal-website/sleeper-analysis/weekly_rank_alive_teams.csv')): ranks[r['team']].append((int(r['week']), float(r['points']), int(r['rank']), float(r['margin_over_chopped'])))
print('replacement sample wk5', {p: round(repl[(p, 5)], 1) for p in REPL_N})
for t in TEAMS:
    c = [o for o in D if o['team'] == t]
    par, parw, wk_started, recent = 0, [], 0, 0
    per = []
    for o in c:
        v = 0
        for w, pts, rk, started in o['wkly']:
            if started:
                v += pts - repl[(o['pos'], w)]; wk_started += 1
                if w >= 8: recent += pts
        per.append((round(v, 1), o['p'], o['bid'], o['kind']))
        par += v
    per.sort(reverse=True)
    top2 = sum(x[0] for x in per[:2])
    draft = float(summ[t]['total_started_points']) - float(summ[t]['pickup_started_points'])
    paid = sum(o['bid'] for o in c if o['kind'] == 'claim' and o['games'] > 0)
    paid_par = sum(x[0] for x in per if x[2] > 0)
    now = [o for o in c if o['now'] and o['games']]
    form = []
    for o in now:
        l3 = [x for x in o['wkly'] if x[0] >= 8 and x[2]]
        if l3: form.append((round(sum(x[1] for x in l3) / len(l3), 1), o['p'], o['pos']))
    form.sort(reverse=True)
    print(f'\n== {t}')
    print(f' pickup PAR (started weeks, all adds): {par:.1f}   without top 2 ({per[0][1]}, {per[1][1]}): {par - top2:.1f}')
    print(f' PAR from paid claims: {paid_par:.1f} for ${paid}  -> ${paid / paid_par if paid_par > 0 else float("nan"):.2f} per PAR point')
    print(f' started pickup-weeks: {wk_started}   PAR per started week: {par / wk_started:.2f}')
    print(f' drafted-player starter points: {draft:.1f}   pickup starter pts: {summ[t]["pickup_started_points"]}')
    print(f' pickup starter pts weeks 8-10: {recent:.1f}')
    print(' top PAR:', per[:4]); print(' worst PAR:', per[-3:])
    print(' current pickups, PPG wks 8-10 (top 5):', form[:5])
    print(' weekly (wk, pts, rank, margin):', ranks[t])
