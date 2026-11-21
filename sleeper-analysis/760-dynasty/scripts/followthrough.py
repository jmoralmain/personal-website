"""Trade follow-through, shared by the 760 and Slags trade scripts.

If a team trades away something it got in an earlier trade, the result of that flip belongs to the earlier
trade: the pick you got in trade A and spent in trade B is worth, to trade A, what B brought back.

For an asset a that team X received in trade t (direct = X's own value from it: production while held,
the rookie it was used on, or a future pick's expected value):
  if X later traded a away in trade t2, with share s = a's part of everything X sent in t2
  (weighted by what each piece became for the team that got it; equal if all zero):
    gross(a) = direct + s * sum(gross of what X got in t2)                 -> who won trade t, followed through
    net(a)   = direct + s * sum(net of what X got in t2) - direct of a for the team it went to
                                                                           -> X's ledger, counted once
Team ledger per trade: what X received, at net(), minus the direct value of what X gave, except that the part
of a trade paid for with things X got in earlier trades is booked to those earlier trades instead.
Every point is still counted once, so team totals equal the plain per-trade method; only which trade gets the
credit changes. Later trades are strictly later in time, so the recursion always ends.
"""

def key_of(a):
    if a.get('kind') == 'player': return ('p', a['pid'])
    if a.get('kind') == 'pick': return ('k', str(a['season']), a['round'], a['orig_rid'])
    return None


def keys_of(a):
    """A pick that was used carries on as the player taken with it."""
    k = [key_of(a)] if key_of(a) else []
    if a.get('kind') == 'pick' and a.get('status') == 'used' and a.get('pid'): k.append(('p', a['pid']))
    return k


def follow_through(trades, to_of, from_of):
    order = sorted(trades, key=lambda t: t['ts'])
    flat = []
    for t in order:
        for s in t['sides']:
            for a in s['got']:
                a['_to'] = to_of(s); a['_from'] = from_of(a); a['_key'] = key_of(a)
                a.setdefault('direct', a['value'])
                flat.append((t, a))
    gives, gets = {}, {}
    for t, a in flat:
        if a['_key'] is None: continue
        gives.setdefault((a['_from'], a['_key']), []).append((t['ts'], t, a))
        for k in keys_of(a): gets.setdefault((a['_to'], k), []).append(t['ts'])

    def outgoing(t, rid): return [a for s in t['sides'] for a in s['got'] if a['_from'] == rid]
    def incoming(t, rid): return [a for s in t['sides'] for a in s['got'] if a['_to'] == rid]
    def next_give(t, a):
        nxt = [(ts, t2, o) for k in keys_of(a) for ts, t2, o in gives.get((a['_to'], k), []) if ts > t['ts']]
        return min(nxt, key=lambda x: x[0])[1:] if nxt else None

    mg, mn = {}, {}
    def share(t, rid, o):
        out = outgoing(t, rid); tot = sum(G(t, x) for x in out)
        return G(t, o) / tot if tot > 0 else 1.0 / len(out)

    def G(t, a):
        if id(a) not in mg:
            v = a['direct']; nx = next_give(t, a)
            if nx:
                t2, o = nx
                v += share(t2, a['_to'], o) * sum(G(t2, b) for b in incoming(t2, a['_to']))
            mg[id(a)] = v
        return mg[id(a)]

    def N(t, a):
        if id(a) not in mn:
            v, a['flip'], a['flip_n'] = a['direct'], 0.0, None
            nx = next_give(t, a)
            if nx:
                t2, o = nx
                f = share(t2, a['_to'], o) * sum(N(t2, b) for b in incoming(t2, a['_to'])) - o['direct']
                a['flip'], a['flip_n'] = round(f, 1), t2['n']; v += f
            mn[id(a)] = v
        return mn[id(a)]

    acquired = lambda rid, key, ts: key is not None and any(x < ts for x in gets.get((rid, key), []))
    for t in order:
        for s in t['sides']:
            rid = s['rid']; inc, out = incoming(t, rid), outgoing(t, rid)
            s['value_direct'] = round(sum(a['direct'] for a in inc), 1)
            s['value'] = round(sum(G(t, a) for a in inc), 1)
            s['gave_value'] = round(sum(G(t, o) for o in out), 1)
            s['net'] = round(s['value'] - s['gave_value'], 1)
            s['net_direct'] = round(s['value_direct'] - sum(o['direct'] for o in out), 1)
            own = [o for o in out if not acquired(rid, o['_key'], t['ts'])]
            W = sum(G(t, o) for o in out)
            frac = (sum(G(t, o) for o in own) / W) if W > 0 else (len(own) / len(out) if out else 1.0)
            s['recv_attr'] = round(frac * sum(N(t, a) for a in inc), 1)
            s['gave_attr'] = round(sum(o['direct'] for o in own), 1)
            s['net_attr'] = round(s['recv_attr'] - s['gave_attr'], 1)
    for t, a in flat:
        N(t, a); a['gross'] = round(G(t, a), 1); a['value'] = a['gross']
        for k in ('_to', '_from', '_key'): a.pop(k, None)
