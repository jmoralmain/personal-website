"""
verify.py — stdlib-only self-check for the practice sandbox.

Runs a *reference* cleaning of data/transactions.csv and prints:
  - a control scorecard (rows in / clean / rejected / dropped),
  - the reconciliation identity  rows_in == clean + rejected + dropped,
  - net USD flow per counterparty,
  - the rejects table with a reason per row.

It is ONE defensible cleaning, not the only right answer. Use it to sanity-check
your own numbers and to see whether you accounted for every row. No third-party
packages — runs on a bare Python 3.

Every decision below is labelled  # DECISION:  — those are the judgment calls
the interview is actually about.
"""
import csv
import os
import re
from collections import defaultdict
from datetime import date

HERE = os.path.dirname(os.path.abspath(__file__))
TXNS = os.path.join(HERE, "data", "transactions.csv")
FX = os.path.join(HERE, "data", "fx_rates.csv")

KNOWN_CCY = {"USD", "EUR", "GBP"}
OUTLIER_ABS = 5_000_000          # DECISION: |amount USD| above this = review, not auto-include
BUY = {"buy", "b", "debit"}
SELL = {"sell", "s", "credit"}
_MONTHS = {m: i + 1 for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"])}


# --- parsers -----------------------------------------------------------------
def parse_amount(raw):
    """'$1,234.56' / '(500.00)' / '-42' / ' 340.5 '  ->  signed float, or None."""
    s = (raw or "").strip()
    if not s:
        return None
    neg = s.startswith("(") and s.endswith(")") or s.startswith("-")
    s = re.sub(r"[()$,\s]", "", s).lstrip("-")
    try:
        v = float(s)
    except ValueError:
        return None
    return -v if neg else v


def parse_date(raw):
    """ISO / MM/DD/YYYY / DD-Mon-YYYY. A slash date with month>12 is read DD/MM.
    Returns a date or None."""
    s = (raw or "").strip()
    if not s:
        return None
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", s)                      # ISO
    if m:
        y, mo, d = map(int, m.groups())
        return _safe_date(y, mo, d)
    m = re.match(r"^(\d{2})/(\d{2})/(\d{4})$", s)                      # slash
    if m:
        a, b, y = map(int, m.groups())
        # DECISION: assume US MM/DD; if month impossible (>12), it must be DD/MM.
        return _safe_date(y, b, a) if a > 12 else _safe_date(y, a, b)
    m = re.match(r"^(\d{2})-([A-Za-z]{3})-(\d{4})$", s)                # DD-Mon-YYYY
    if m:
        d, mon, y = m.group(1), m.group(2).title(), m.group(3)
        if mon in _MONTHS:
            return _safe_date(int(y), _MONTHS[mon], int(d))
    return None


def _safe_date(y, mo, d):
    try:
        return date(y, mo, d)
    except ValueError:
        return None


def canon_counterparty(raw):
    s = re.sub(r"\s+", " ", (raw or "").strip())
    return s.title() if s else ""      # DECISION: title-case canonical (LLC -> Llc, acceptable & consistent)


def norm_direction(raw):
    s = (raw or "").strip().lower()
    if s in BUY:
        return "buy"
    if s in SELL:
        return "sell"
    return None


# --- FX: as-of join ----------------------------------------------------------
def load_fx():
    rates = defaultdict(list)          # ccy -> sorted [(date, rate)]
    with open(FX, newline="") as f:
        for r in csv.DictReader(f):
            d = parse_date(r["rate_date"])
            rates[r["currency"]].append((d, float(r["rate_to_usd"])))
    for c in rates:
        rates[c].sort()
    return rates


def fx_to_usd(amount_ccy, ccy, trade_dt, rates):
    """DECISION: USD is 1.0 by definition (not in the table). Otherwise use the
    most recent rate on/before the trade date; if the trade predates all rates,
    fall back to the earliest published rate."""
    if ccy == "USD":
        return amount_ccy
    series = rates.get(ccy)
    if not series:
        return None
    chosen = series[0][1]
    for d, rate in series:
        if d <= trade_dt:
            chosen = rate
        else:
            break
    return amount_ccy * chosen


# --- reference cleaning ------------------------------------------------------
def clean():
    rates = load_fx()
    with open(TXNS, newline="") as f:
        raw_rows = list(csv.DictReader(f))
    rows_in = len(raw_rows)

    clean_rows, rejects, dropped = [], [], []

    # pass 1: collapse EXACT duplicates (all fields identical)
    seen, deduped, dup_collapsed = set(), [], 0
    for r in raw_rows:
        key = tuple(r[k] for k in r)
        if key in seen:
            dup_collapsed += 1                          # DECISION: exact dup -> collapse silently
            continue
        seen.add(key)
        deduped.append(r)

    # pass 2: find txn_ids with CONFLICTING amounts (same id, different value)
    by_id = defaultdict(set)
    for r in deduped:
        by_id[r["txn_id"].strip()].add(parse_amount(r["amount"]))
    conflict_ids = {i for i, amts in by_id.items() if i and len(amts) > 1}

    for r in deduped:
        tid = r["txn_id"].strip()
        amt_raw = r["amount"]
        # structural noise: no id AND no amount -> not a transaction at all
        if not tid and not (amt_raw or "").strip():
            dropped.append((r, "empty_feed_row"))
            continue

        def reject(reason):
            rejects.append((r, reason))

        if tid in conflict_ids:                         # DECISION: id collision w/ disagreeing amount -> can't trust either
            reject("duplicate_txn_id_conflict")
            continue
        amt = parse_amount(amt_raw)
        if amt is None:
            reject("missing_or_unparseable_amount")
            continue
        cp = canon_counterparty(r["counterparty"])
        if not cp:                                      # DECISION: can't attribute a P&L line to nobody
            reject("missing_counterparty")
            continue
        trade_dt = parse_date(r["trade_date"])
        if trade_dt is None:
            reject("unparseable_trade_date")
            continue
        ccy = (r["currency"] or "").strip().upper()
        assumed_usd = False
        if ccy == "":                                   # DECISION: blank ccy -> assume USD, but flag it
            ccy, assumed_usd = "USD", True
        elif ccy not in KNOWN_CCY:                      # DECISION: no rate for this ccy -> reject, don't guess
            reject(f"no_fx_rate:{ccy}")
            continue
        usd = fx_to_usd(amt, ccy, trade_dt, rates)
        if usd is None:
            reject(f"no_fx_rate:{ccy}")
            continue
        if abs(usd) > OUTLIER_ABS:                      # DECISION: fat-finger -> quarantine for review
            reject("outlier_needs_review")
            continue

        clean_rows.append({
            "txn_id": tid,
            "trade_date": trade_dt,
            "counterparty": cp,
            "direction": norm_direction(r["direction"]),
            "amount_usd": round(usd, 2),
            "src_currency": ccy,
            "assumed_usd": assumed_usd,
        })

    return rows_in, dup_collapsed, clean_rows, rejects, dropped


# --- report ------------------------------------------------------------------
def main():
    rows_in, dup_collapsed, clean_rows, rejects, dropped = clean()
    accounted = len(clean_rows) + len(rejects) + len(dropped) + dup_collapsed

    print("=" * 60)
    print("CONTROL SCORECARD  (one defensible cleaning)")
    print("=" * 60)
    print(f"  rows_in (raw data rows)      {rows_in}")
    print(f"  exact duplicates collapsed   {dup_collapsed}")
    print(f"  rows_clean                   {len(clean_rows)}")
    print(f"  rows_rejected                {len(rejects)}")
    print(f"  rows_dropped (empty)         {len(dropped)}")
    print(f"  ---------------------------------")
    ok = accounted == rows_in
    print(f"  reconciliation  clean+rejected+dropped+dupes = {accounted}"
          f"  {'== rows_in  OK' if ok else '!= rows_in  MISMATCH'}")
    assert ok, "reconciliation identity failed"

    net = sum(r["amount_usd"] for r in clean_rows)
    print(f"\n  net USD cash flow (clean)    {net:,.2f}")

    print("\n" + "-" * 60)
    print("NET USD FLOW PER COUNTERPARTY")
    print("-" * 60)
    by_cp = defaultdict(float)
    for r in clean_rows:
        by_cp[r["counterparty"]] += r["amount_usd"]
    for cp in sorted(by_cp):
        print(f"  {cp:<26} {by_cp[cp]:>16,.2f}")

    print("\n" + "-" * 60)
    print(f"REJECTS ({len(rejects)}) — reason per row, nothing silently dropped")
    print("-" * 60)
    for r, reason in rejects:
        print(f"  {r['txn_id'] or '(no id)':<8} {reason:<28} "
              f"ccy={r['currency'] or '-':<4} amt={r['amount'] or '-'}")

    if dropped:
        print(f"\n  dropped (structural noise): {len(dropped)} row(s)")


if __name__ == "__main__":
    main()
