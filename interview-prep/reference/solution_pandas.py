"""
Reference solution — pandas.  One defensible cleaning of the messy feed.
Mirrors the decisions in ../verify.py.  Run:  python3 reference/solution_pandas.py
Requires: pip install pandas
"""
import os
import re
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
KNOWN_CCY = {"USD", "EUR", "GBP"}
OUTLIER_ABS = 5_000_000

# --- parsers -----------------------------------------------------------------
def parse_amount(s):
    s = str(s).strip()
    if not s or s.lower() == "nan":
        return None
    neg = (s.startswith("(") and s.endswith(")")) or s.startswith("-")
    s = re.sub(r"[()$,\s]", "", s).lstrip("-")
    try:
        v = float(s)
    except ValueError:
        return None
    return -v if neg else v

def parse_date(s):
    """ISO / MM_DD / DD-Mon. Slash date with month>12 read as DD/MM. -> Timestamp/NaT"""
    s = str(s).strip()
    for fmt in ("%Y-%m-%d", "%d-%b-%Y"):
        try:
            return pd.Timestamp(pd.to_datetime(s, format=fmt))
        except (ValueError, TypeError):
            pass
    m = re.match(r"^(\d{2})/(\d{2})/(\d{4})$", s)
    if m:
        a, b, y = map(int, m.groups())
        mo, d = (b, a) if a > 12 else (a, b)   # DECISION: assume US MM/DD unless impossible
        try:
            return pd.Timestamp(year=y, month=mo, day=d)
        except ValueError:
            return pd.NaT
    return pd.NaT

# --- load --------------------------------------------------------------------
df = pd.read_csv(os.path.join(DATA, "transactions.csv"), dtype=str, keep_default_na=False)
rows_in = len(df)

# profile first — this is what you'd narrate out loud
print(f"rows_in={rows_in}  currencies={sorted(df.currency.unique())}  "
      f"directions={sorted(df.direction.unique())}")

# 1. exact-duplicate collapse
before = len(df)
df = df.drop_duplicates()
dup_collapsed = before - len(df)

# structural noise: no id AND no amount
empty_mask = (df.txn_id.str.strip() == "") & (df.amount.str.strip() == "")
dropped = int(empty_mask.sum())
df = df[~empty_mask].copy()

# typed columns
df["amount_parsed"] = df.amount.map(parse_amount)
df["trade_dt"] = df.trade_date.map(parse_date)
df["cp"] = df.counterparty.str.strip().str.replace(r"\s+", " ", regex=True).str.title()
df["ccy"] = df.currency.str.strip().str.upper()
df["assumed_usd"] = df.ccy == ""
df.loc[df.assumed_usd, "ccy"] = "USD"                 # DECISION: blank ccy -> USD (flagged)

# 2. conflicting txn_id (same id, >1 distinct amount)
conflict_ids = (df.groupby("txn_id").amount_parsed.nunique()
                  .loc[lambda s: (s > 1) & (df.groupby("txn_id").size() > 1)].index)

# route rejects, reason per row (first matching reason wins)
def reason(r):
    if r.txn_id in conflict_ids:            return "duplicate_txn_id_conflict"
    if r.amount_parsed is None:             return "missing_or_unparseable_amount"
    if r.cp == "":                          return "missing_counterparty"
    if pd.isna(r.trade_dt):                 return "unparseable_trade_date"
    if r.ccy not in KNOWN_CCY:              return f"no_fx_rate:{r.ccy}"
    return ""

df["reject_reason"] = df.apply(reason, axis=1)

# --- FX as-of join -----------------------------------------------------------
fx = pd.read_csv(os.path.join(DATA, "fx_rates.csv"))
fx["rate_date"] = pd.to_datetime(fx["rate_date"])
fx = fx.sort_values("rate_date")

clean = df[df.reject_reason == ""].sort_values("trade_dt").copy()
usd_rows, eur_gbp = [], clean[clean.ccy != "USD"]
merged = pd.merge_asof(                                  # point-in-time rate on/before trade
    eur_gbp.sort_values("trade_dt"),
    fx.rename(columns={"rate_date": "trade_dt"}),
    on="trade_dt", left_by="ccy", right_by="currency", direction="backward")
clean.loc[clean.ccy == "USD", "amount_usd"] = clean.loc[clean.ccy == "USD", "amount_parsed"]
merged["amount_usd"] = merged.amount_parsed * merged.rate_to_usd
clean = clean.set_index("txn_id")
clean.loc[merged.txn_id, "amount_usd"] = merged.set_index("txn_id")["amount_usd"]
clean = clean.reset_index()

# outlier quarantine (after conversion)
outliers = clean.amount_usd.abs() > OUTLIER_ABS
df.loc[df.txn_id.isin(clean[outliers].txn_id), "reject_reason"] = "outlier_needs_review"
clean = clean[~outliers]

rejects = df[df.reject_reason != ""]

# --- report ------------------------------------------------------------------
accounted = len(clean) + len(rejects) + dropped + dup_collapsed
print(f"\nclean={len(clean)}  rejected={len(rejects)}  dropped={dropped}  "
      f"dupes={dup_collapsed}  -> accounted={accounted}  "
      f"{'OK' if accounted == rows_in else 'MISMATCH'}")
print(f"net USD = {clean.amount_usd.sum():,.2f}\n")
print("net USD per counterparty:")
print(clean.groupby("cp").amount_usd.sum().round(2).to_string())
print("\nrejects:")
print(rejects[["txn_id", "reject_reason", "currency", "amount"]].to_string(index=False))
