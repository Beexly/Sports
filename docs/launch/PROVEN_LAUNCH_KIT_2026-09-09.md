# PROVEN launch kit (2026-09-09, NFL Week 1)

Every number below was read from `https://www.galaxysportsedge.com/api/ops/public-surface-truth`
at 16:48 UTC on 2026-09-09 (deployment `dc3645324`, basis `market_anchored_v4`). Nothing here is
projected. If a number on the live surface moves, the live surface wins; re-read it before
quoting. Positioning: we're not AI, we're math you can read (`docs/positioning.md`).

## The proof, in one table

| What we measured | Reading | Floor | Result |
|---|---|---|---|
| Settled moneyline picks in the sample | 380 | 100 | pass |
| Expected calibration error, bias-corrected | 0.037 | 0.05 | pass |
| Brier score | 0.210 | 0.22 | pass |
| Deployed model (v5.2.7) calibration error on its own 258 rows | 0.058, 5th-percentile bound 0.044 | 0.05 on the bound | pass |
| Consecutive GREEN six-hourly runs | 5 | 3 | pass |
| Calibration receipt | published (auto) | | open |

Definitions a reader can check: the probability scored is the publish-time market price
rebuilt from the append-only odds table (mean implied probability per side across the books
that quoted the game at or before the pick was generated, proportional de-vig). Picks
generated after kickoff are excluded and counted (104). Picks whose price the odds table cannot
reproduce are excluded and counted (3). Three-way soccer moneylines are excluded (128). The
estimator and every exclusion are documented in `docs/ops/CALIBRATION_ECE_ESTIMATOR_2026-09-09.md`.

## Headlines (each traces to the table)

- Calibrated on 380 settled moneyline picks. Expected calibration error 0.037 against a 0.05 floor.
- The model serving the board today (v5.2.7) is measured on its own 258 rows, not on a pooled number.
- Every pick is priced at publish time from the odds table. Nothing is re-scored after kickoff.
- Five consecutive GREEN gate runs before we said the word Proven. The gate needed three.
- Deterministic factor model. Every pick ships with its factor breakdown. You can read the math.

## Short-form lines (under 280 characters, brand-checked)

1. Galaxy Sports Edge is now PROVEN: 380 settled moneyline picks, calibration error 0.037 against a 0.05 floor, measured on publish-time market prices. We're not AI. We're math you can read.
2. We don't publish a win rate we can't defend. We publish calibration: on 380 settled picks, when we said 60%, it happened about 60% of the time. Read the report on /calibration.
3. NFL Week 1 is live on the board. Every pick carries its factor breakdown and the line it was priced at. Founding rates locked for life for members who join before the step-up.
4. Our calibration gate ran five times in a row GREEN before we flipped the phase. The floors are public, the exclusions are counted, the estimator is documented.

## What NOT to say (positioning rule 8 and the performance policy)

- No "win rate", "ROI", "units", "guaranteed", "lock", "can't lose" claims. The published record
  is calibration and settled results, not a profit promise.
- Never "AI", "AI-powered", "machine learning", "our AI", "artificial intelligence".
  The engine is a deterministic factor model.
- Do not quote the hit rate as a headline. It is on the surface (0.65 on this sample) but it is
  not a calibration claim and reads as a profit promise without the price context.
- Do not round 0.037 down to "under 4%" in a way that implies accuracy. It is a calibration
  error, a gap between stated probability and observed frequency.

## Where to point people

- `/calibration` — the public report the receipt unlocks.
- `/picks` — the board, with factor breakdown per pick.
- `/pricing` — Founding rates, Proven step-up, grandfathering.
