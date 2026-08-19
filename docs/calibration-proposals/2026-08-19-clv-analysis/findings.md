# L-6 — CLV analysis of the 2026-08-18 census

Standalone script: `docs/calibration-proposals/2026-08-19-clv-analysis/analyze.mjs`
CSV: `docs/ops/calibration/2026-08-18-clv-census.csv`
Rows parsed: **1161** (header excluded). Time-ordered by `generated_at` ASC: **yes**.
No fitting. No holdout training. No floor/gate/3-streak edits.

## (a) What CLV fields the census carries — coverage is the first honest number

Production CLV columns on `picks` (see `packages/db/prisma/schema.prisma` Pick model):
- lock: `clv_lock_line` (points at publish), `clv_lock_price` (American at publish)
- close: `clv_close_line`, `clv_close_price`
- graded: `clv_kind` (POINTS | PROBABILITY), `clv_value` (positive = beat close), `clv_verdict` (BEAT_CLOSE | MATCHED_CLOSE | LOST_TO_CLOSE)
Also joined: `sport`, `pick_type`, `confidence_pct`, proof-receipt `entryOdds` / `marketFairProb`.

| field | non-empty n | of | pct |
| --- | --- | --- | --- |
| pick_id | 1161 | 1161 | 100.00% |
| generated_at | 1161 | 1161 | 100.00% |
| settled_at | 1161 | 1161 | 100.00% |
| confidence_pct | 1161 | 1161 | 100.00% |
| result | 1161 | 1161 | 100.00% |
| pick_type | 1161 | 1161 | 100.00% |
| selection | 1161 | 1161 | 100.00% |
| published_line | 1161 | 1161 | 100.00% |
| tier | 1161 | 1161 | 100.00% |
| model_version | 1161 | 1161 | 100.00% |
| clv_lock_line | 771 | 1161 | 66.41% |
| clv_lock_price | 140 | 1161 | 12.06% |
| clv_close_line | 769 | 1161 | 66.24% |
| clv_close_price | 140 | 1161 | 12.06% |
| clv_kind | 909 | 1161 | 78.29% |
| clv_value | 909 | 1161 | 78.29% |
| clv_verdict | 909 | 1161 | 78.29% |
| sport | 1161 | 1161 | 100.00% |
| sport_key | 1161 | 1161 | 100.00% |
| receipt_entry_odds | 561 | 1161 | 48.32% |
| receipt_line | 561 | 1161 | 48.32% |
| market_fair_prob | 561 | 1161 | 48.32% |

| pair | n | of | note |
| --- | --- | --- | --- |
| lock (line or price) | 911 | 1161 | publish-time number |
| close (line or price) | 909 | 1161 | settlement close |
| **lock AND close** | **909** | 1161 | both ends of the CLV pair |
| graded (`clv_verdict` + `clv_value`) | 909 | 1161 | production grade |

## (b) CLV win rate vs 52.4% break-even

Win = `clv_verdict === BEAT_CLOSE`. Denominator = graded n only (un-graded rows are not losses; they are missing). Wilson 95% interval. Script: `wilson()` / `summarizeGroup()`.

| metric | value | n |
| --- | --- | --- |
| beat close | 226 | 909 |
| matched close | 324 | 909 |
| lost to close | 359 | 909 |
| CLV win rate | 24.86% | 909 |
| Wilson 95% CI | [22.16%, 27.77%] | 909 |
| vs 52.4% | -27.54% | |
| Wilson lower bound ≥ 52.4%? | NO | |
| beat / (beat+lost), MATCHED excluded | 38.63% | 585 |

## (c) Mean / median CLV and the distribution

`clv_value` units are mixed: POINTS (spread/total) vs PROBABILITY (moneyline implied-prob delta). Do not pool them into one "cents" number. Script reports them separately.

| slice | n | mean | median |
| --- | --- | --- | --- |
| all graded `clv_value` (mixed units — do not interpret) | 909 | -0.100886 | 0.000000 |
| POINTS (points of line) | 769 | -0.069377 | 0.000000 |
| PROBABILITY (implied-prob) | 140 | -0.273957 | -0.331150 |
| PROBABILITY in percentage points | 140 | -27.3957 | -33.1150 |

Distribution of graded `clv_value` (mixed units; use only to check outlier dominance):

| q | value |
| --- | --- |
| min | -3.000000 |
| p05 | -1.250000 |
| p10 | -0.545500 |
| p25 | -0.250000 |
| p50 | 0.000000 |
| p75 | 0.002400 |
| p90 | 0.428600 |
| p95 | 0.615000 |
| max | 3.000000 |
| n > 0 | 229 |
| n = 0 | 320 |
| n < 0 | 360 |

Largest-magnitude five graded values: 3.0000, -3.0000, -3.0000, 3.0000, -3.0000.
Mean of |clv_value|: 0.335953. If mean and median disagree in sign, the mean is outlier-driven.

## (d) Cuts — sport, confidence decile, pick type

### By sport
| sport | n | graded | beat | win rate | Wilson 95% | vs 52.4% | mean POINTS | mean PROB |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MLB | 1022 | 808 | 202 | 25.00% | [22.14%, 28.10%] | -27.40% | -0.0708 | -0.3211 |
| MLS | 117 | 99 | 23 | 23.23% | [16.01%, 32.46%] | -29.17% | -0.0594 | -0.0935 |
| NBA | 7 | 0 | 0 | n/a | n/a | n/a | n/a | n/a |
| NFL | 7 | 0 | 0 | n/a | n/a | n/a | n/a | n/a |
| NHL | 8 | 2 | 1 | 50.00% | [9.45%, 90.55%] | -2.40% | 0.0909 | n/a |

### By pick type
| pick_type | n | graded | beat | win rate | Wilson 95% | vs 52.4% | mean value |
| --- | --- | --- | --- | --- | --- | --- | --- |
| MONEYLINE | 289 | 140 | 10 | 7.14% | [3.93%, 12.65%] | -45.26% | -0.2740 |
| SPREAD | 440 | 388 | 40 | 10.31% | [7.66%, 13.73%] | -42.09% | -0.2111 |
| TOTAL | 432 | 381 | 176 | 46.19% | [41.25%, 51.21%] | -6.21% | 0.0750 |

### By confidence decile (all 1161 rows; D1 = lowest confidence)
| decile | conf range | n | graded | beat | win rate | Wilson 95% | vs 52.4% |
| --- | --- | --- | --- | --- | --- | --- | --- |
| D1 | 50–51 | 125 | 116 | 26 | 22.41% | [15.78%, 30.82%] | -29.99% |
| D2 | 52–54 | 124 | 117 | 26 | 22.22% | [15.64%, 30.57%] | -30.18% |
| D3 | 55–56 | 92 | 83 | 18 | 21.69% | [14.18%, 31.70%] | -30.71% |
| D4 | 57–60 | 139 | 119 | 25 | 21.01% | [14.65%, 29.18%] | -31.39% |
| D5 | 61–63 | 103 | 69 | 19 | 27.54% | [18.39%, 39.05%] | -24.86% |
| D6 | 64–66 | 130 | 91 | 27 | 29.67% | [21.26%, 39.72%] | -22.73% |
| D7 | 67–68 | 82 | 67 | 18 | 26.87% | [17.72%, 38.52%] | -25.53% |
| D8 | 69–72 | 134 | 75 | 23 | 30.67% | [21.39%, 41.83%] | -21.73% |
| D9 | 73–79 | 110 | 84 | 24 | 28.57% | [20.02%, 39.00%] | -23.83% |
| D10 | 80–100 | 122 | 88 | 20 | 22.73% | [15.22%, 32.51%] | -29.67% |

## (e) CLV win rate by month (generated_at)
| month | n | graded | beat | win rate | Wilson 95% | vs 52.4% |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-05 | 3 | 0 | 0 | n/a | n/a | n/a |
| 2026-06 | 450 | 350 | 104 | 29.71% | [25.17%, 34.70%] | -22.69% |
| 2026-07 | 561 | 559 | 122 | 21.82% | [18.60%, 25.43%] | -30.58% |
| 2026-08 | 147 | 0 | 0 | n/a | n/a | n/a |

## (f) Does CLV correlate with confidence? (the decisive cut)

Spearman rank correlation on graded rows only. Script: `spearman()` over ranks with average ties.

| pair | n | Spearman ρ |
| --- | --- | --- |
| confidence vs `clv_value` | 909 | 0.191917 |
| confidence vs beat-close indicator | 909 | 0.045781 |

Graded-only confidence deciles (D1 = lowest confidence among graded):
| decile | conf range | n | beat | win rate | Wilson 95% | mean clv_value |
| --- | --- | --- | --- | --- | --- | --- |
| G-D1 | 50–50 | 73 | 9 | 12.33% | [6.62%, 21.80%] | -0.2596 |
| G-D2 | 51–53 | 118 | 35 | 29.66% | [22.17%, 38.44%] | -0.1347 |
| G-D3 | 54–55 | 87 | 18 | 20.69% | [13.51%, 30.35%] | -0.1948 |
| G-D4 | 56–58 | 86 | 22 | 25.58% | [17.54%, 35.71%] | -0.1277 |
| G-D5 | 59–61 | 99 | 18 | 18.18% | [11.82%, 26.92%] | -0.0908 |
| G-D6 | 62–64 | 78 | 21 | 26.92% | [18.34%, 37.68%] | -0.1232 |
| G-D7 | 65–67 | 91 | 29 | 31.87% | [23.20%, 42.01%] | -0.0713 |
| G-D8 | 68–72 | 105 | 30 | 28.57% | [20.81%, 37.85%] | 0.0280 |
| G-D9 | 73–79 | 84 | 24 | 28.57% | [20.02%, 39.00%] | 0.0240 |
| G-D10 | 80–100 | 88 | 20 | 22.73% | [15.22%, 32.51%] | -0.0999 |

No usable positive ranking: ρ_beat=0.045781, ρ_clv=0.191917. Confidence is not revealing CLV in this slice. Suppression-by-confidence remains unsupported.

## Verdict

Coverage is thick enough to look (graded n=909), but the Wilson lower bound 22.16% does not clear 52.4%. Best point estimate 24.86%. This is the work-plan number — not a reason to bend the 52.4% ladder.

Trace: every table cell is computed in `analyze.mjs` (`summarizeGroup`, `wilson`, `spearman`, `quantile`).
