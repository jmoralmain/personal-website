"""Extract The Big Board's 2027 Superflex rookie rankings (rank, name, position, school, value, NFL board rank)."""
import re, sys, json, html
s = open(sys.argv[1], encoding='utf-8', errors='replace').read()
text = re.sub(r'<script.*?</script>|<style.*?</style>', ' ', s, flags=re.S)
lines = [l.strip() for l in html.unescape(re.sub(r'<[^>]+>', '\n', text)).split('\n') if l.strip()]
start = next(i for i, l in enumerate(lines) if l.startswith('2027 rookie rankings — Superflex'))
end = next((i for i, l in enumerate(lines) if i > start and l.startswith('2027 rookie rankings — 1QB')), len(lines))
L = lines[start:end]
POS = {'QB', 'RB', 'WR', 'TE'}
rows, i = [], 0
while i < len(L) - 4:
    if L[i].isdigit() and (L[i + 1] == '–' or L[i + 1][:1] in '▲▼' or L[i + 1] == 'NEW') and L[i + 3] in POS:
        rank, move, name, pos, school = int(L[i]), L[i + 1], L[i + 2], L[i + 3], L[i + 4]
        notes, j = [], i + 5
        while j < len(L) and not re.fullmatch(r'\d+\.\d{2}', L[j]):
            if L[j] not in POS and L[j] != school: notes.append(L[j])
            j += 1
        slot = L[j] if j < len(L) else None
        val = re.sub(r'[^\d]', '', L[j + 1]) if j + 1 < len(L) else ''
        nfl = L[j + 2] if j + 2 < len(L) and L[j + 2].startswith('#') else None
        rows.append(dict(rank=rank, move=move, name=name, pos=pos, school=school, slot=slot, value=int(val) if val else None, nfl=nfl, notes=notes))
        i = j + 2
    else:
        i += 1
json.dump(rows, open(sys.argv[2], 'w'), indent=1)
print(len(rows), 'rows; ranks', rows[0]['rank'], '..', rows[-1]['rank'], '| gaps', [r['rank'] for a, r in zip(rows, rows[1:]) if r['rank'] != a['rank'] + 1][:5])
for r in rows[:60]: print(r['rank'], r['name'], r['pos'], r['school'], r['slot'], r['value'], r['nfl'], '|', '; '.join(r['notes'])[:90])
