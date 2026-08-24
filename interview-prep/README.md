# Allocate — Senior Data Engineer · practice sandbox

A self-contained, zero-cloud rehearsal for the first technical interview: a
messy financial-transactions feed and a focused transformation to build. It
mirrors the real thing — small data, imperfect inputs, a defensible model —
and runs on a bare machine (pure-stdlib path works with no installs).

> **Practice blind first.** Read the scenario below, open `data/`, and build
> your solution *before* looking in `reference/`. That folder is the answer
> key — check yourself against it after, not during.

---

## The scenario (your practice prompt)

You've been handed a raw feed of trades from a back-office system,
`data/transactions.csv`, plus a reference FX table, `data/fx_rates.csv`.
The feed is imperfect in the ordinary ways a real feed is.

**Deliverable:** a clean, analysis-ready model plus one summary.

1. **Normalize** the feed into tidy, typed records:
   - one row per genuine transaction,
   - amounts as signed decimals in **USD**,
   - parsed trade/settle dates,
   - canonical counterparty and category values.
2. **Convert to USD** using `fx_rates.csv`. Rates are published only on some
   dates — decide how to price a trade whose date has no exact rate.
3. **Summarize:** net USD cash flow **per counterparty** (a by-month cut is a
   nice extra).
4. **Reconcile:** account for every input row. `rows_in` must equal
   `rows_clean + rows_rejected + rows_dropped`. Emit a rejects table with a
   reason per row — never silently drop.

You are **not** expected to reach one "correct" number. You're expected to
make each judgment call *explicitly* and defend it. Where you assume, say so
in code (a constant, a comment, a `WHERE`) — not in your head.

### The imperfections are real
Without spoiling the full list (see `reference/answer_key.md` after you try):
mixed date formats, amounts as strings (`$1,234.56`, `(500.00)`, stray
whitespace), multiple currencies, a currency with no FX rate, blank
currencies, duplicate `txn_id`s — including one with a *conflicting* amount —
null counterparties, at least one fat-finger outlier, and trailing junk rows.
Each one is a decision, not a nuisance.

---

## Run it

Everything is runnable with **Python 3 standard library only** — no installs
needed for the verifier. `pandas`/`duckdb` are optional and only used by the
richer reference solutions.

```bash
cd interview-prep

# regenerate the messy data (deterministic, seeded)
python3 gen_data.py

# self-check: recompute the reconciliation + one defensible scorecard (stdlib)
python3 verify.py

# reference solutions (peek AFTER you've tried)
python3 reference/solution_pandas.py      # needs: pip install pandas
duckdb < reference/solution_sql.sql       # or run in the duckdb CLI / python
```

## What's here

| File                          | What it is                                                       |
| ----------------------------- | --------------------------------------------------------------- |
| `data/transactions.csv`       | the messy raw feed — your input                                 |
| `data/fx_rates.csv`           | date-sparse FX reference (EUR, GBP → USD)                        |
| `gen_data.py`                 | deterministic generator (so you can re-roll / inspect the seeds) |
| `verify.py`                   | stdlib reconciliation + scorecard — your self-check             |
| `CHEATSHEET.md`               | live-usable snippets (date/currency parsing, dedup, as-of join) |
| `reference/answer_key.md`     | full catalogue of every injected imperfection + the decisions   |
| `reference/solution_pandas.py`| one worked solution in pandas                                   |
| `reference/solution_sql.sql`  | the same logic in DuckDB / dbt-style SQL                        |

---

## How to rehearse (30–40 min)

1. **Profile before you touch anything** (5 min). Row count, null rates,
   distinct currencies/directions, min/max amount. Say what you find.
2. **Build the transformation** (20 min) in your stronger stack. Narrate each
   judgment call out loud as if the interviewer is watching — because they are.
3. **Reconcile** (5 min). Prove `rows_in = clean + rejected + dropped`.
4. **Check** against `reference/` and `verify.py`. Where you differ, ask
   *"is my decision defensible?"* — often yes. Multiple answers are fine.
5. **Rehearse the AI narration** (5 min): "I had the assistant scaffold the
   currency parser; I reviewed the parenthesis-as-negative case and verified
   the totals myself." Owning it is the graded skill.
