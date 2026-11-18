import sys
d = sys.argv[1]
s = open(f'{d}/page/faab-ledger.src.html').read()
for k, f in (('__DATA__', 'pagedata.json'), ('__PLAYERS__', 'players_perf.json'), ('__REVIEW__', 'review.json'), ('__SIM__', 'simpage.json'), ('__BACKTEST__', 'backtest.json')):
    assert k in s, k
    s = s.replace(k, open(f'{d}/{f}').read())
open(f'{d}/page/faab-ledger.html', 'w').write(s)
print('built', len(s))
