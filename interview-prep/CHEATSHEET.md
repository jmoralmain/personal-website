# Live cheat sheet — messy financial data

Keep this open in the interview. They allow "normal technical references." These
are the patterns that come up on almost every dirty-financial-data exercise, in
both pandas and DuckDB/dbt-style SQL. Copy, adapt, **and be ready to explain**.

---

## 0. Profile first (say this out loud before transforming)

```python
df = pd.read_csv("f.csv", dtype=str, keep_default_na=False)   # read as text; don't let pandas guess
len(df), df.isna().sum(), df.nunique()
for c in ["currency", "direction", "category"]:
    print(c, df[c].value_counts(dropna=False).to_dict())
```
```sql
SUMMARIZE SELECT * FROM read_csv_auto('f.csv', all_varchar=true);  -- DuckDB one-liner profile
```
> "Read as text first" is itself a signal — you refuse to let the loader make
> silent type/NA decisions for you.

## 1. Currency-string → signed number

`$1,234.56`, `(500.00)`, `-42`, ` 340.5 ` → float. Parentheses **and** leading
minus both mean negative.

```python
def parse_amount(s):
    s = str(s).strip()
    if not s: return None
    neg = (s.startswith("(") and s.endswith(")")) or s.startswith("-")
    s = re.sub(r"[()$,\s]", "", s).lstrip("-")
    try: return -float(s) if neg else float(s)
    except ValueError: return None
```
```sql
CASE WHEN amount LIKE '(%)' OR amount LIKE '-%' THEN -1 ELSE 1 END
  * TRY_CAST(regexp_replace(amount, '[()$,\s\-]', '', 'g') AS DOUBLE)
```

## 2. Mixed date formats (the ambiguity trap)

ISO / `MM/DD/YYYY` / `DD-Mon-YYYY`. The trap: `13/04/2024` can't be US MM/DD →
it must be DD/MM. Try MM/DD first; an impossible month falls through.

```python
for fmt in ("%Y-%m-%d", "%d-%b-%Y", "%m/%d/%Y", "%d/%m/%Y"):
    try: return pd.to_datetime(s, format=fmt)
    except ValueError: continue
return pd.NaT
```
```sql
COALESCE(TRY_STRPTIME(d,'%Y-%m-%d'), TRY_STRPTIME(d,'%d-%b-%Y'),
         TRY_STRPTIME(d,'%m/%d/%Y'), TRY_STRPTIME(d,'%d/%m/%Y'))::DATE
```
> Name the assumption: "I'm treating slash dates as US MM/DD unless the month
> is impossible." That sentence is the whole point of the exercise.

## 3. Canonicalize text keys (dedupe entities)

`ACME CAPITAL`, ` acme capital `, `Acme Capital` are one counterparty.

```python
df.counterparty.str.strip().str.replace(r"\s+"," ",regex=True).str.title()
```
```sql
lower(regexp_replace(trim(counterparty), '\s+', ' ', 'g'))   -- DuckDB has no initcap; a lower key is fine
```

## 4. Dedupe with conflict handling (don't silently pick)

```python
df = df.drop_duplicates()                                    # exact dupes: collapse
n = df.groupby("txn_id").amount.nunique()
conflict_ids = n[(n > 1)].index                              # same id, different amount -> can't trust
```
> Exact dup → collapse. Same key, *different* value → that's a data-quality
> contradiction; route to rejects, don't guess which is real.

## 5. As-of / point-in-time join (date-sparse reference)

FX rates published only some days → price each trade at the latest rate **on or
before** its date. This is the one modeling puzzle; name it "as-of join."

```python
pd.merge_asof(txn.sort_values("dt"), fx.sort_values("dt"),
              on="dt", left_by="ccy", right_by="currency", direction="backward")
```
```sql
FROM txn ASOF LEFT JOIN fx
  ON txn.ccy = fx.currency AND txn.trade_dt >= fx.rate_date
```

## 6. Reconcile — the single strongest signal

Every input row goes somewhere. Prove it.

```python
assert rows_in == len(clean) + len(rejects) + dropped + dup_collapsed
```
Emit a **rejects table with a reason column**. "Nothing silently dropped" is the
sentence that makes a financial-data interviewer trust you.

---

## The judgment calls you'll be asked to defend

| Situation | A defensible line to say |
|-----------|--------------------------|
| Blank currency | "Assuming USD (base ccy) and flagging it, rather than dropping." |
| Unknown currency, no rate | "Can't price it — rejecting to a queue, not guessing a rate." |
| `$99,999,999` outlier | "Quarantining for review; auto-including a fat finger corrupts the total." |
| Null counterparty | "Can't attribute a P&L line to nobody — reject and surface it." |
| Duplicate id, different amount | "Contradiction; I trust neither and flag both to the source." |
| Missing settle date | "Left null = settlement pending; imputing would fabricate data." |

## Owning the AI (they grade this explicitly)

- Delegate the *mechanical* part: "Assistant, write the currency parser."
- Then **review out loud**: "Let me check the parenthesis-negative case… good."
- Then **verify independently**: run the reconciliation, eyeball a few rows.
- If it's wrong, say so and fix it — that's the ownership they're scoring.
