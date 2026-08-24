-- Reference solution — DuckDB / dbt-style SQL.
-- Same defensible cleaning as verify.py, expressed as staging -> classify -> marts.
-- Run:  duckdb < reference/solution_sql.sql      (from the interview-prep/ dir)
--   or in Python:  import duckdb; duckdb.sql(open('reference/solution_sql.sql').read())
--
-- Highlights the two things worth saying out loud: robust parsing in a staging
-- layer, and an ASOF JOIN for point-in-time FX pricing.

-- ── staging: read everything as text, then parse defensively ────────────────
CREATE OR REPLACE TABLE stg_txn AS
SELECT
    trim(coalesce(txn_id, ''))                               AS txn_id,
    counterparty AS counterparty_raw,
    -- DuckDB has no initcap, so the canonical key is lower-cased +
    -- whitespace-collapsed (case-insensitive grouping). Same entity, one bucket.
    nullif(lower(regexp_replace(trim(coalesce(counterparty, '')), '\s+', ' ', 'g')), '') AS cp_canon,
    upper(trim(coalesce(currency, '')))                      AS ccy_raw,
    coalesce(direction, '')                                  AS direction,
    coalesce(amount, '')                                     AS amount_raw,
    -- amount: strip $ , ( ) space and minus, then re-apply sign
    CASE WHEN amount LIKE '(%)' OR amount LIKE '-%' THEN -1 ELSE 1 END
        * TRY_CAST(regexp_replace(amount, '[()$,\s\-]', '', 'g') AS DOUBLE)
                                                              AS amount_num,
    -- date: try each format; MM/DD is tried before DD/MM so an impossible
    -- month (13/04/2024) falls through to the DD/MM reading automatically
    COALESCE(
        TRY_STRPTIME(trade_date, '%Y-%m-%d'),
        TRY_STRPTIME(trade_date, '%d-%b-%Y'),
        TRY_STRPTIME(trade_date, '%m/%d/%Y'),
        TRY_STRPTIME(trade_date, '%d/%m/%Y')
    )::DATE                                                   AS trade_dt
FROM read_csv_auto('data/transactions.csv', all_varchar = true);

-- collapse EXACT duplicates, flag conflicting txn_ids
CREATE OR REPLACE TABLE stg_dedup AS
WITH d AS (SELECT DISTINCT * FROM stg_txn),
     conflict AS (
        SELECT txn_id FROM d
        GROUP BY txn_id
        HAVING count(*) > 1 AND count(DISTINCT amount_num) > 1
     )
SELECT d.*, (c.txn_id IS NOT NULL) AS is_conflict
FROM d LEFT JOIN conflict c USING (txn_id);

-- ── classify: assign every row a reason, or NULL if clean ───────────────────
CREATE OR REPLACE TABLE classified AS
SELECT *,
    (ccy_raw = '')                              AS assumed_usd,
    CASE WHEN ccy_raw = '' THEN 'USD' ELSE ccy_raw END AS ccy,
    CASE
        WHEN txn_id = '' AND amount_raw = ''    THEN 'DROP_empty_feed_row'
        WHEN is_conflict                        THEN 'duplicate_txn_id_conflict'
        WHEN amount_num IS NULL                 THEN 'missing_or_unparseable_amount'
        WHEN cp_canon IS NULL                    THEN 'missing_counterparty'
        WHEN trade_dt IS NULL                   THEN 'unparseable_trade_date'
        WHEN ccy_raw NOT IN ('', 'USD','EUR','GBP') THEN 'no_fx_rate:' || ccy_raw
        ELSE NULL
    END                                         AS reason
FROM stg_dedup;

-- ── FX: ASOF JOIN = most recent published rate on/before the trade date ─────
CREATE OR REPLACE TABLE fx AS
SELECT rate_date::DATE AS rate_date, currency, rate_to_usd
FROM read_csv_auto('data/fx_rates.csv');

CREATE OR REPLACE TABLE priced AS
SELECT c.*,
       CASE WHEN c.ccy = 'USD' THEN c.amount_num
            ELSE c.amount_num * f.rate_to_usd END            AS amount_usd
FROM classified c
ASOF LEFT JOIN fx f
     ON c.ccy = f.currency AND c.trade_dt >= f.rate_date
WHERE c.reason IS NULL;                       -- price only the clean candidates

-- outlier quarantine happens after conversion
CREATE OR REPLACE TABLE clean AS
SELECT * FROM priced WHERE abs(amount_usd) <= 5000000;

-- ── marts / report ─────────────────────────────────────────────────────────
.print '--- reconciliation ---'
SELECT
    (SELECT count(*) FROM read_csv_auto('data/transactions.csv', all_varchar=true)) AS rows_in,
    (SELECT count(*) FROM stg_txn) - (SELECT count(*) FROM stg_dedup)               AS dupes_collapsed,
    (SELECT count(*) FROM clean)                                                    AS rows_clean,
    (SELECT count(*) FROM priced WHERE abs(amount_usd) > 5000000)
      + (SELECT count(*) FROM classified WHERE reason IS NOT NULL
                                          AND reason NOT LIKE 'DROP_%')             AS rows_rejected,
    (SELECT count(*) FROM classified WHERE reason LIKE 'DROP_%')                    AS rows_dropped;

.print '--- net USD per counterparty ---'
SELECT cp_canon AS counterparty, round(sum(amount_usd), 2) AS net_usd
FROM clean GROUP BY 1 ORDER BY 1;

.print '--- net USD total ---'
SELECT round(sum(amount_usd), 2) AS net_usd_total FROM clean;

.print '--- rejects ---'
SELECT txn_id, reason, ccy_raw, amount_raw
FROM classified WHERE reason IS NOT NULL AND reason NOT LIKE 'DROP_%'
UNION ALL
SELECT txn_id, 'outlier_needs_review', ccy, amount_raw::VARCHAR
FROM priced WHERE abs(amount_usd) > 5000000
ORDER BY txn_id;
