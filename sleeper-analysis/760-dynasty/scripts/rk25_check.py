"""Extra figures for copy. Usage: python3 -I rk25_check.py <rk25.json> <dyn_dir>"""
import json, sys, statistics as st
d = json.load(open(sys.argv[1])); D = sys.argv[2]
rows, teams = d['rows'], d['teams']
tr = [r for r in rows if r['traded']]; kept = [r for r in rows if not r['traded']]
print('traded picks', len(tr), 'vos sum', round(sum(r['vos'] for r in tr), 1), 'mean', round(st.mean(r['vos'] for r in tr), 1),
      '| kept', len(kept), 'mean', round(st.mean(r['vos'] for r in kept), 1))
print('still on drafting roster', sum(1 for r in rows if r['now_rid'] == r['rid']), 'elsewhere', sum(1 for r in rows if r['now_rid'] and r['now_rid'] != r['rid']), 'free agents', sum(1 for r in rows if not r['now_rid']))
print('starts by drafting team', sum(r['starts_team'] for r in rows), 'by anyone', sum(r['starts_any'] for r in rows))
print('never started by drafter', [r['name'] for r in rows if r['starts_team'] == 0])
print('PAR on drafting team now vs elsewhere 2026', round(sum(r['par']['2026'] for r in rows if r['now_rid'] == r['rid']), 1), round(sum(r['par']['2026'] for r in rows if r['now_rid'] and r['now_rid'] != r['rid']), 1))
srt = sorted(rows, key=lambda r: r['vos'])
print('worst', [(r['pick'], r['name'], r['vos']) for r in srt[:5]])
print('best', [(r['pick'], r['name'], r['vos']) for r in srt[::-1][:6]])
print('par rank', [(r['pick'], r['name'], r['par_total']) for r in sorted(rows, key=lambda r: -r['par_total'])[:8]])
print('hits', sum(1 for r in rows if r['hits']), 'zero PAR', sum(1 for r in rows if r['par_total'] == 0))
for p in ['RB', 'WR', 'QB', 'TE']:
    xs = [r for r in rows if r['pos'] == p]
    print(p, len(xs), 'by round', [sum(1 for r in xs if r['rd'] == k) for k in (1, 2, 3)], 'hits', [r['name'] for r in xs if r['hits']], 'PAR26', round(sum(r['par']['2026'] for r in xs), 1), 'PAR25', round(sum(r['par']['2025'] for r in xs), 1))
# 2025 / 2026 PAR splits
print('PAR 2025 total', round(sum(r['par']['2025'] for r in rows), 1), '2026', round(sum(r['par']['2026'] for r in rows), 1))
print('went backwards in 2026 (hit 2025, not 2026)', [(r['name'], r['rank']['2025'], r['rank']['2026']) for r in rows if r['hit']['2025'] and not r['hit']['2026']])
print('broke out 2026', [(r['name'], r['rank']['2025'], r['rank']['2026']) for r in rows if not r['hit']['2025'] and r['hit']['2026']])
# draft order check: reverse 2024 standings by wins then points for
rs = json.load(open(f'{D}/1098388508928032768/rosters.json'))
order = sorted(rs, key=lambda r: (r['settings']['wins'], r['settings']['fpts'] + r['settings'].get('fpts_decimal', 0) / 100))
dr = json.load(open(f'{D}/draft_1180453968974659585.json'))
print('slot order matches reverse standings:', [r['roster_id'] for r in order] == [dr['slot_to_roster_id'][str(s)] for s in range(1, 13)])
for t in sorted(teams, key=lambda t: -t['vos']):
    print(t['owner'], t['slot'], t['rec']['2024'], 'still', t['still'], 'n', t['n'])
