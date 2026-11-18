"""Re-rank 2025 rookie picks against a smooth expected-value curve by draft position.
Two curves, both decreasing from #1 to #36:
  log fit:      PAR ~ a + b*ln(pick), least squares over all 36 picks
  isotonic fit: best non-increasing step fit (pool adjacent violators)
Usage: python3 -I rk25_curve.py <rookies-2025.html>
"""
import json, re, sys, math
s = open(sys.argv[1]).read()
D = json.loads(re.search(r'const D = (\{.*?\});\n', s, re.S).group(1))
R = sorted(D['rows'], key=lambda r: r['pick'])
x = [math.log(r['pick']) for r in R]; y = [r['par_total'] for r in R]
mx, my = sum(x) / len(x), sum(y) / len(y)
b = sum((a - mx) * (c - my) for a, c in zip(x, y)) / sum((a - mx) ** 2 for a in x); a0 = my - b * mx
logfit = [max(0.0, a0 + b * xi) for xi in x]
# isotonic (non-increasing) regression by pool-adjacent-violators
blocks = [[v, 1] for v in y]
i = 0
while i < len(blocks) - 1:
    if blocks[i][0] < blocks[i + 1][0]:
        v = (blocks[i][0] * blocks[i][1] + blocks[i + 1][0] * blocks[i + 1][1]) / (blocks[i][1] + blocks[i + 1][1])
        blocks[i] = [v, blocks[i][1] + blocks[i + 1][1]]; del blocks[i + 1]; i = max(i - 1, 0)
    else: i += 1
iso = [v for v, n in blocks for _ in range(n)]
print(f'log fit: PAR = {a0:.1f} {b:+.1f} * ln(pick); expected at #1 {logfit[0]:.1f}, #10 {logfit[9]:.1f}, #19 {logfit[18]:.1f}, #32 {logfit[31]:.1f}')
rows = []
for r, e1, e2 in zip(R, logfit, iso):
    rows.append((r['pick'], r['name'], r['pos'], r['owner'], round(r['par_total'], 1), round(r['vos'], 1), round(e1, 1), round(r['par_total'] - e1, 1), round(e2, 1), round(r['par_total'] - e2, 1)))
print('\npick name pos owner | PAR | old vs-slot | log exp, vs log | iso exp, vs iso')
for row in sorted(rows, key=lambda t: -t[7])[:8]: print(row)
print('...worst by log:')
for row in sorted(rows, key=lambda t: t[7])[:4]: print(row)
print('\nby isotonic:', [(t[1], t[0], t[9]) for t in sorted(rows, key=lambda t: -t[9])[:6]])
