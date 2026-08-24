"""
Generate a deterministic, messy financial-transactions dataset for interview practice.

Run:  python3 gen_data.py
Emits: data/transactions.csv, data/fx_rates.csv

Every messy trait injected here is catalogued in reference/ANSWER_KEY.md so you can
check whether your cleaning caught it. Seeded -> same output every run.
"""
import csv
import os
import random

random.seed(42)
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "data")
os.makedirs(DATA, exist_ok=True)

# --- Reference universe -------------------------------------------------------
COUNTERPARTIES = ["Acme Capital", "Blue Harbor LLC", "Cedar Point Partners",
                  "Delta Securities", "Everest Asset Mgmt"]
INSTRUMENTS = ["UST-10Y", "CORP-AAPL", "CORP-XOM", "MUNI-CA", "EQ-SPX"]
CURRENCIES = ["USD", "EUR", "GBP"]
# "true" rates the generator uses to build amounts; the fx file exposes a
# messier, date-sparse view of these.
BASE_RATE = {"USD": 1.0, "EUR": 1.08, "GBP": 1.27}

def money_str(x):
    """Return an amount rendered in one of several inconsistent string styles."""
    neg = x < 0
    a = abs(x)
    style = random.random()
    if style < 0.35:
        s = f"${a:,.2f}"
    elif style < 0.6:
        s = f"{a:,.2f}"
    elif style < 0.8:
        s = f"{a:.2f}"
    else:
        s = f" {a:.1f} "  # stray whitespace, one decimal
    if neg:
        # negatives shown two disagreeing ways: parentheses OR leading minus
        return f"({s.strip()})" if random.random() < 0.5 else f"-{s.strip()}"
    return s

DATE_STYLES = [
    lambda y, m, d: f"{y:04d}-{m:02d}-{d:02d}",          # ISO
    lambda y, m, d: f"{m:02d}/{d:02d}/{y:04d}",          # US
    lambda y, m, d: f"{d:02d}-{['Jan','Feb','Mar'][m-1]}-{y:04d}",  # DD-Mon-YYYY
]

def date_str(day):
    """day: 1..31 in Jan/Feb/Mar 2024, rendered in a random format."""
    m = 1 + (day - 1) // 28
    d = 1 + (day - 1) % 28
    return random.choice(DATE_STYLES)(2024, m, d), (2024, m, d)

DIRECTION_STYLES = {
    "buy":  ["buy", "BUY", "Buy", "b", "debit"],
    "sell": ["sell", "SELL", "Sell", "s", "credit"],
}

rows = []
txn_counter = 1000

def make_row(day, cp, direction, base_usd, cur, instr, note=""):
    global txn_counter
    txn_counter += 1
    # amount stored in the row's OWN currency (not USD)
    amt_ccy = base_usd / BASE_RATE[cur]
    signed = -amt_ccy if direction == "sell" else amt_ccy
    trade_disp, _ = date_str(day)
    # settle = trade + 2, sometimes blank
    settle_disp, _ = date_str(min(day + 2, 84))
    if random.random() < 0.15:
        settle_disp = ""
    # counterparty casing/whitespace noise
    cp_disp = cp
    r = random.random()
    if r < 0.15:
        cp_disp = cp.upper()
    elif r < 0.3:
        cp_disp = " " + cp.lower() + "  "
    return {
        "txn_id": f"TX{txn_counter}",
        "trade_date": trade_disp,
        "settle_date": settle_disp,
        "counterparty": cp_disp,
        "direction": random.choice(DIRECTION_STYLES[direction]),
        "amount": money_str(signed),
        "currency": cur,
        "instrument": instr,
        "category": random.choice(["Fixed Income", "fixed income", "Equity", "equity ", "Muni"]),
        "notes": note,
    }

# --- 60 clean-ish base transactions ------------------------------------------
for _ in range(60):
    day = random.randint(1, 84)
    cp = random.choice(COUNTERPARTIES)
    direction = random.choice(["buy", "sell"])
    base_usd = round(random.uniform(10_000, 500_000), 2)
    cur = random.choices(CURRENCIES, weights=[6, 3, 2])[0]
    instr = random.choice(INSTRUMENTS)
    rows.append(make_row(day, cp, direction, base_usd, cur, instr))

# --- Injected imperfections (all logged in ANSWER_KEY.md) --------------------

# 1. Exact duplicate row (same txn_id, identical) -> should collapse to 1
rows.append(dict(rows[3]))

# 2. Same txn_id, CONFLICTING amount (data-quality contradiction -> judgment call)
dup_conflict = dict(rows[10])
dup_conflict["amount"] = "$1.00"
rows.append(dup_conflict)

# 3. Missing currency (blank) -> assume USD? or reject? judgment
r = make_row(20, "Acme Capital", "buy", 88_000, "USD", "EQ-SPX", note="ccy missing")
r["currency"] = ""
rows.append(r)

# 4. Null / missing counterparty
r = make_row(25, "Acme Capital", "sell", 45_000, "USD", "MUNI-CA", note="cp missing")
r["counterparty"] = ""
rows.append(r)

# 5. Fat-finger outlier (extra zeros)
r = make_row(30, "Delta Securities", "buy", 12_000, "USD", "CORP-XOM")
r["amount"] = "$99,999,999.00"
r["notes"] = "verify: possible fat finger"
rows.append(r)

# 6. Unknown currency code not in fx table
r = make_row(33, "Blue Harbor LLC", "buy", 60_000, "USD", "UST-10Y")
r["currency"] = "CHF"
rows.append(r)

# 7. Trade date in a format that also parses ambiguously (13/… can't be US month)
r = make_row(5, "Cedar Point Partners", "sell", 30_000, "USD", "MUNI-CA")
r["trade_date"] = "13/04/2024"  # unambiguously DD/MM -> tests US-format assumption
rows.append(r)

# shuffle so issues aren't clustered at the end
random.shuffle(rows)

# 8. Trailing junk / empty rows (appended AFTER shuffle so they sit at the end)
rows.append({k: "" for k in rows[0]})
rows.append({"txn_id": "TX9999", "trade_date": "", "settle_date": "",
             "counterparty": "  ", "direction": "", "amount": "",
             "currency": "", "instrument": "", "category": "", "notes": "blank feed row"})

# --- write transactions.csv ---------------------------------------------------
fields = ["txn_id", "trade_date", "settle_date", "counterparty", "direction",
          "amount", "currency", "instrument", "category", "notes"]
with open(os.path.join(DATA, "transactions.csv"), "w", newline="") as f:
    w = csv.DictWriter(f, fieldnames=fields)
    w.writeheader()
    for r in rows:
        w.writerow(r)

# --- fx_rates.csv : date-sparse, so some txn dates have no exact rate ---------
# rates published only on a few dates per month -> forces as-of / nearest join.
fx_rows = []
for (y, m, d) in [(2024, 1, 1), (2024, 1, 15), (2024, 2, 1), (2024, 2, 15),
                  (2024, 3, 1), (2024, 3, 15)]:
    drift = 1 + (m - 1) * 0.01
    fx_rows.append([f"{y:04d}-{m:02d}-{d:02d}", "EUR", round(1.08 * drift, 4)])
    fx_rows.append([f"{y:04d}-{m:02d}-{d:02d}", "GBP", round(1.27 * drift, 4)])
    # USD intentionally omitted (rate is 1.0 by definition) -> judgment
with open(os.path.join(DATA, "fx_rates.csv"), "w", newline="") as f:
    w = csv.writer(f)
    w.writerow(["rate_date", "currency", "rate_to_usd"])
    w.writerows(fx_rows)

print(f"wrote {len(rows)} transaction rows and {len(fx_rows)} fx rows to {DATA}")
