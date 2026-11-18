import csv, json, sys, collections
D = sys.argv[1]
R = lambda f: list(csv.DictReader(open(f'{D}/{f}')))
tx = R('transactions_all_teams.csv'); fails = R('failed_waiver_bids.csv'); pk = R('pickups_alive_teams.csv')
TEAMS = ['Love Hurts', 'TannerMenning', 'masonmay', 'KDEMPSTER15']
WEEKS = range(1, 12)
claims = [t for t in tx if t['kind'] == 'waiver_claim' and t['added']]
out = {}
for t in TEAMS:
    c = [x for x in claims if x['team'] == t]
    wk = {w: sum(int(x['bid']) for x in c if int(x['week']) == w) for w in WEEKS}
    cum, run = [], 0
    for w in WEEKS: run += wk[w]; cum.append(run)
    bids = sorted([int(x['bid']) for x in c], reverse=True)
    # submitted bid volume (won + lost, excluding roster-full failures? keep both) per week
    f = [x for x in fails if x['team'] == t]
    sub = {w: wk[w] + sum(int(x['bid']) for x in f if int(x['week']) == w) for w in WEEKS}
    # overpay: winning bid minus best rival bid on same player same week
    over = []
    for x in c:
        if int(x['bid']) == 0: continue
        rivals = [int(y['bid']) for y in fails if y['week'] == x['week'] and y['player_id'] == x['added_id'] and y['team'] != t and 'claimed by another' in y['reason']]
        over.append(dict(player=x['added'], week=int(x['week']), bid=int(x['bid']), runner_up=max(rivals) if rivals else None))
    out[t] = dict(weekly=wk, cumulative=cum, submitted=sub, bids=bids, n_paid=sum(b > 0 for b in bids),
                  top2_share=round(sum(bids[:2]) / 1000, 3), over=over,
                  zero_or_one=sum(b <= 3 for b in bids), n=len(bids))
# how much of each chop dump's FAAB went to whom
for t in TEAMS:
    o = out[t]
    uncontested = [v for v in o['over'] if v['runner_up'] is None]
    contested = [v for v in o['over'] if v['runner_up'] is not None]
    print(f"\n== {t}: weekly {o['weekly']}\n cum {o['cumulative']}\n submitted {o['submitted']}\n bids {o['bids']} top2 {o['top2_share']} small(<=3) {o['zero_or_one']}/{o['n']}")
    print(' overpay (paid claims):')
    for v in o['over']: print('   ', v['week'], v['player'], v['bid'], 'runner-up', v['runner_up'], 'margin', (v['bid'] - v['runner_up']) if v['runner_up'] is not None else f"uncontested (paid {v['bid']})")
    print(' money above runner-up:', sum(v['bid'] - v['runner_up'] for v in contested), ' uncontested $:', sum(v['bid'] for v in uncontested))
# league context: total FAAB spent per week by all teams & whole league share
allw = {w: sum(int(x['bid']) for x in claims if int(x['week']) == w) for w in WEEKS}
print('\nleague weekly spend', allw)
# points return by spend period from pickups
for t in TEAMS:
    for lo, hi in ((1, 3), (4, 7), (8, 11)):
        p = [x for x in pk if x['team'] == t and x['kind'] == 'waiver_claim' and lo <= int(x['week']) <= hi]
        print(t, f'wk{lo}-{hi}', '$', sum(int(x['bid']) for x in p), 'started pts', round(sum(float(x['started_points']) for x in p), 1), 'pending', sum(x['status'].startswith('pending') for x in p))
json.dump(out, open(sys.argv[2], 'w'))
