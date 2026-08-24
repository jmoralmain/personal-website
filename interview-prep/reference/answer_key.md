# Answer key — every injected imperfection + the judgment call

Read this **after** you've built your own solution. There is no single correct
output; what matters is that you *noticed* each issue and made a defensible,
explicit decision. The reference cleaning in `../verify.py` picks one path —
yours may differ and still be right.

## The imperfections, and how the reference handles each

| # | Imperfection in the feed | Reference decision | Also defensible |
|---|--------------------------|--------------------|-----------------|
| 1 | **Exact duplicate row** (identical `txn_id` + all fields) | collapse silently to one | keep + log |
| 2 | **Same `txn_id`, conflicting amount** (`TX1011`: real amount vs `$1.00`) | reject *both* — can't trust either | keep first-seen; keep max; flag to source |
| 3 | **Blank `currency`** | assume `USD`, set an `assumed_usd` flag | reject as incomplete |
| 4 | **Null / blank `counterparty`** | reject `missing_counterparty` (can't attribute) | bucket as `UNKNOWN` |
| 5 | **Fat-finger outlier** (`$99,999,999`) | quarantine `outlier_needs_review` | winsorize/cap; keep + flag |
| 6 | **Currency with no FX rate** (`CHF`) | reject `no_fx_rate` | source a rate; hold for enrichment |
| 7 | **Ambiguous slash date** (`13/04/2024`) | month>12 ⇒ read as `DD/MM` (13 Apr) | reject unparseable |
| 8 | **Trailing junk rows** (fully blank; id-only w/ no amount) | blank⇒drop; id w/o amount⇒reject | drop both |
| — | Mixed **date formats** (ISO, `MM/DD/YYYY`, `DD-Mon-YYYY`) | multi-pattern parser | dateutil w/ dayfirst logic |
| — | **Amount strings** (`$1,234.56`, `(500.00)`, `-42`, ` 340.5 `) | strip symbols; `()` and `-` ⇒ negative | — |
| — | **Counterparty casing/whitespace** (`ACME CAPITAL`, ` acme capital `) | trim, collapse spaces, title-case | explicit alias map |
| — | **Category casing/whitespace** (`equity `, `fixed income`) | trim + title-case | controlled vocab map |
| — | **Blank `settle_date`** (~15% of rows) | allow null (settlement pending) | impute trade+2 |
| — | **Date-sparse FX** (rates only ~2 dates/month) | as-of join: latest rate on/before trade | interpolate |
| — | **Redundant sign vs `direction`** (amount already signed; `buy/sell/debit/credit`) | amount's sign is authoritative for cash flow; direction kept as a normalized label | reconcile the two and reject disagreements |

## Reference scorecard (from `verify.py`)

```
rows_in            69
exact dupes         1  (collapsed)
rows_clean         61
rows_rejected       6   (TX1011 x2 conflict, outlier, CHF, missing cp, id-only junk)
rows_dropped        1   (fully blank feed row)
reconciliation     61 + 6 + 1 + 1 = 69  ✓
```

The number that matters in the room isn't `net USD = 1,630,438`; it's that you
can say **"69 rows in, here's where every one went, and here's why."**

## Talking points the interviewer is likely fishing for

- **Reconciliation / control totals** — "nothing silently dropped" is the
  single strongest signal you think like a data engineer on financial data.
- **Explicit assumptions** — blank currency, ambiguous dates, the outlier:
  each is a *decision surfaced in code*, not a guess buried in a `dropna()`.
- **Idempotence & determinism** — re-running yields the same result; the
  seed/reference makes that checkable.
- **As-of join** — the date-sparse FX table is the one modeling puzzle; naming
  "as-of / point-in-time join" out loud lands well.
- **Owning the AI** — say what you delegated, then show the verify step.
