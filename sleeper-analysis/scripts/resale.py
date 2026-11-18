import json, collections
J = lambda f: json.load(open('raw/' + f))
P = J('players.json'); users = {u['user_id']: u for u in J('users.json')}; rosters = {r['roster_id']: r for r in J('rosters.json')}
def team(rid):
    u = users.get(rosters[rid]['owner_id'], {}); return (u.get('metadata') or {}).get('team_name') or u.get('display_name')
chains = collections.defaultdict(list)
for w in range(1, 12):
    for t in J(f'tx_{w}.json'):
        if t['type'] == 'waiver' and t['status'] == 'complete' and t['adds']:
            pid = next(iter(t['adds'])); chains[pid].append(dict(w=w, team=team(t['roster_ids'][0]), bid=(t['settings'] or {}).get('waiver_bid', 0)))
out = []
for pid, c in chains.items():
    if len(c) >= 2 and max(x['bid'] for x in c) >= 100:
        out.append(dict(name=(P.get(pid) or {}).get('full_name'), pos=(P.get(pid) or {}).get('position'), chain=c))
out.sort(key=lambda o: -max(x['bid'] for x in o['chain']))
for o in out: print(o['name'], ' -> '.join(f"{x['team']} ${x['bid']} (wk {x['w']})" for x in o['chain']))
first = sum(o['chain'][0]['bid'] for o in out); last = sum(o['chain'][-1]['bid'] for o in out)
print('players', len(out), 'first purchase total', first, 'latest purchase total', last)
json.dump(out, open('resale.json', 'w'))
