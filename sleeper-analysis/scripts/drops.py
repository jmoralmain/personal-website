"""Points that dropped players scored after each chopped team released them, plus bid detail."""
import json, collections
J = lambda f: json.load(open('raw/' + f))
SC = J('league.json')['scoring_settings']; P = J('players.json')
score = lambda s: sum(v * s.get(k, 0) for k, v in SC.items())
stats = {w: J(f'stats_{w}.json') for w in range(1, 11)}
pname = lambda pid: (P.get(pid) or {}).get('full_name') or pid
rows = json.load(open('losers.json'))
chop = {r['rid']: r['week'] for r in rows if r['chopped']}
out = {}
for rid, cw in chop.items():
    drops, bids = [], []
    for w in range(1, cw + 1):
        for t in J(f'tx_{w}.json'):
            if (t['roster_ids'] or [None])[0] != rid or t['type'] not in ('waiver', 'free_agent'): continue
            if t['status'] == 'failed':
                bids.append((t['settings'] or {}).get('waiver_bid', 0)); continue
            if t['status'] != 'complete': continue
            for pid in (t['drops'] or {}):
                # waivers for leg w run after week w's games, so the drop costs weeks w+1..; FA drops mid-week cost week w too
                start = w + 1 if t['type'] == 'waiver' else w
                after = sum(score(stats[x].get(pid, {})) for x in range(start, 11))
                lost_while_alive = sum(score(stats[x].get(pid, {})) for x in range(start, cw + 1))
                drops.append(dict(name=pname(pid), w=w, after=round(after, 1), while_alive=round(lost_while_alive, 1)))
    drops.sort(key=lambda d: -d['after'])
    out[rid] = dict(drops=drops[:3], n_drops=len(drops), failed_bids=bids)
    print(rid, [r['team'] for r in rows if r['rid'] == rid][0], 'drops', len(drops), drops[:3], '| failed bid amounts', sorted(bids, reverse=True)[:12])
json.dump(out, open('drops.json', 'w'))
