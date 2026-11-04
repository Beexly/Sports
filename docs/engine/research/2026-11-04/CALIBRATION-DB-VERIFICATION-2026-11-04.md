# Calibration: Database Verification vs the Evidence Snapshot — 2026-11-04

**Purpose.** The calibration brief was built on
`apps/web/__tests__/calibration-audit/evidence/prod-settled-sample-full.csv`.
It is a file. It was never checked against the database it claims to represent.
This document does that check and reports what changed.

**Verdict: the conclusions survive, the sample was biased, and one caveat is now
harder than the brief said.**

---

## 1. The population reconciles

Published picks, live from `gse-postgres` (`summer-brook-99380762`, main, PG 17):

| outcome | rows |
|---|---|
| WIN + LOSS | **3,143** |
| PENDING | 611 |
| VOID | 488 |
| PUSH | 20 |
| **total published** | **4,262** |

1,119 excluded rows are accounted for exactly. They must be excluded: PUSH, VOID
and PENDING are not win/loss outcomes, and folding them in as losses would
deflate the realized rate and manufacture a calibration gap that is not there.

## 2. The evidence file was 62% of the population, and not randomly so

| market | DB (WIN+LOSS) | CSV | coverage |
|---|---|---|---|
| MONEYLINE | 1,319 | 1,219 | 92.4% |
| SPREAD | 990 | 795 | **80.3%** |
| TOTAL | 834 | 648 | **77.7%** |
| **all** | **3,143** | **2,662** | **84.7%** |

The snapshot covered 84.7% overall but **under-sampled the two markets that are
broken** — spread and total — relative to moneyline, which is the one market that
behaves. That is a bias in the direction of the *conservative* estimate: the
sample made the problem look smaller, not larger.

Cause of the gap is not established. It looks like a partial pull or a filter
applied at snapshot time; there is no dated filter in the file to confirm it.

## 3. Rerunning on the full population changes nothing structurally

Poisson-binomial test, full population vs snapshot:

| group | DB n | DB gap | DB z | CSV n | CSV gap |
|---|---|---|---|---|---|
| ALL | 3,143 | **+0.0942** | −11.30 | 2,662 | +0.0877 |
| MONEYLINE | 1,319 | **−0.0087** | 0.68 (p=0.50) | 1,219 | −0.0072 |
| SPREAD | 990 | **+0.1962** | −13.50 | 795 | +0.1992 |
| TOTAL | 834 | **+0.1358** | −8.18 | 648 | +0.1292 |

Every conclusion holds:

- Moneyline remains **calibrated in the mean** (p = 0.50, not significant).
- Spread remains catastrophically overconfident (+19.6 pts) and worse than the
  sample suggested.
- Total remains overconfident (+13.6 pts).
- The pooled gap is **larger** on the true population (+9.42 vs +8.77), exactly
  as the sampling bias predicted.

Brier against climatology also reproduces: 0.2642 vs 0.2473 pooled, 0.2342 vs
0.2238 moneyline, 0.2985 vs 0.2489 spread, 0.2711 vs 0.2495 total. **Negative
skill in all three markets** — the model still does not beat "always predict the
base rate".

## 4. The price caveat is worse than stated

The brief said the evidence file carried no posted prices. True — but the
database was supposed to have them, via `clvLockPrice` / `closingPrice`:

| column | populated |
|---|---|
| `clvLockPrice` | 258 / 3,143 (**8.2%**) |
| `closingPrice` | 0 / 3,143 (**0.0%**) |
| both | **0 / 3,143 (0.0%)** |

`closingPrice` is **never populated on any settled published pick**. CLV is
therefore not merely absent from my file — it is **structurally uncomputable
from this table**. Any CLV figure quoted anywhere in the product cannot be
derived from `picks` as it stands.

This is the most actionable finding in this document and it is outside the
calibration question entirely.

## 5. What this does and does not change

**Changes:** the sample is now known to be biased, the direction of the bias is
known (conservative), and the headline numbers are restated on the true
population. The brief's caveat about prices is upgraded from "absent from my
file" to "the column is empty in production".

**Does not change:** the diagnosis. Spread confidence is inverted at the top,
moneyline is unbiased-in-mean and inverted-in-order, and no market beats its own
base rate on Brier. All three survive a 18% larger, differently-weighted sample.

## 6. Reproducibility

The snapshot is replaced by a query:

```
python scripts/ops/picks_export.py --out data/engine/picks_settled_export.csv
```

The export verifies its own row count against an independent `COUNT(*)` and exits
non-zero on mismatch — the check that would have caught the original 2,662-row
file. 17 tests in `tests/test_picks_export.py`, all DB-stubbed so they run
offline.

Access notes that cost time and are worth recording:

- `neon` on this machine is an npm shim. `subprocess` with `["neon", ...]` raises
  `FileNotFoundError [WinError 2]`; it must go through `cmd.exe /c neon.cmd`.
- SQL containing both single quotes (enum literals) and double quotes
  (camelCase identifiers) must not be passed on a command line. Write it to a
  file and use `-f`.
- `head` in a pipeline truncates a `COPY ... TO STDOUT` capture via SIGPIPE.
  Redirect to a file, then inspect.
- `UNION ALL` against a `PickType` column needs `::text` on the enum, or Postgres
  rejects the literal `'ALL'`.
