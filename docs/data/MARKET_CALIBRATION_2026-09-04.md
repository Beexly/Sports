# Market closing-line calibration — 2026-09-04 (Wave 3)

Command that produced every number below (run 2026-09-04, exit 0):

    NODE_OPTIONS=--use-system-ca npx tsx scripts/analytics/replay-calibration.ts

Corpus: 5,281 settled NFL games, seasons 2006-2025, from nflverse `games.csv`
(closing moneylines exist from 2006 — this is the MARKET-moneyline corpus, NOT
the 15,939-pick replay corpus, which is spreads/totals 1999-2025; different
populations, do not cross-quote). Market probability = proportional de-vig of
the two closing moneylines; ties excluded. Method and honest-scope notes are in
the script header. Legality: nflverse cleared-with-attribution (CC BY 4.0).

## Walk-forward folds (train <= N, evaluate N+1; never one pooled number)

| eval | n | raw Brier | reliability | resolution | uncertainty | iso Δ | platt Δ | beta Δ |
|---|---|---|---|---|---|---|---|---|
| 2016 | 265 | 0.2170 | 0.0232 | 0.0298 | 0.2428 | +0.0006 | +0.0003 | +0.0003 |
| 2017 | 266 | 0.2031 | 0.0324 | 0.0481 | 0.2454 | −0.0005 | +0.0003 | +0.0006 |
| 2018 | 265 | 0.2124 | 0.0313 | 0.0285 | 0.2407 | +0.0004 | +0.0003 | +0.0003 |
| 2019 | 266 | 0.2141 | 0.0366 | 0.0373 | 0.2495 | −0.0024 | −0.0002 | −0.0003 |
| 2020 | 268 | 0.2019 | 0.0378 | 0.0531 | 0.2500 | +0.0012 | −0.0002 | +0.0000 |
| 2021 | 284 | 0.2177 | 0.0399 | 0.0418 | 0.2497 | +0.0021 | −0.0007 | −0.0010 |
| 2022 | 282 | 0.2093 | 0.0289 | 0.0349 | 0.2455 | +0.0015 | +0.0002 | +0.0003 |
| 2023 | 285 | 0.2186 | 0.0294 | 0.0315 | 0.2458 | −0.0048 | +0.0003 | +0.0002 |
| 2024 | 285 | 0.2010 | 0.0293 | 0.0532 | 0.2478 | +0.0003 | +0.0002 | +0.0009 |
| 2025 | 284 | 0.2109 | 0.0377 | 0.0404 | 0.2488 | +0.0024 | −0.0001 | +0.0001 |

Δ = held-out Brier(calibrator) − Brier(identity); negative = calibrator better.
Post-isotonic ECE per fold (equal-width/adaptive): worst folds 2021 (0.0888/0.0391)
and 2023 (0.0859/0.0112); the equal-width number is inflated by sparse tail bins —
the adaptive binner is the honest one.

## Pooled held-out window 2016-2025 (n = 2,750, raw de-vig, no recalibration)

- Base rate (home win) 55.02%
- Brier 0.2106, 95% bootstrap CI [0.2050, 0.2172]
- Reliability 0.0324, CI [0.0311, 0.0339]
- Resolution 0.0361, CI [0.0303, 0.0424]
- Uncertainty 0.2475, CI [0.2453, 0.2490]
- ECE equal-width 0.0180, CI [0.0148, 0.0400]; adaptive 0.0126, CI [0.0099, 0.0332]

Reliability curve (equal-count bins, pred → obs home-win %):
28.0→26.6, 42.7→41.2, 55.1→55.4, 64.2→62.0, 73.8→74.0, 84.1→86.8.
Largest deviations ~2-3 points, no monotone bias.

CAVEAT — read before reusing the decomposition: rel − res + unc = 0.2438 ≠
Brier 0.2106. The Murphy decomposition here is computed on 10 equal-width bins,
so it carries a finite-bin (within-bin) residual of ≈0.033; the Brier is exact.
The terms are not additive at this binning. An earlier exact-value grouping was
rejected because its bootstrap CI failed to bracket its own point estimate.

## Calibrator comparison (mean held-out Δ across 10 folds)

- isotonic (PAVA): +0.00007
- Platt: −0.00003
- beta (coarse 3-param grid): −0.00014

NONE beats the identity by more than 0.0005 mean Brier. **The closing line is
already the calibration.** This is the work order's expected honest outcome
(D7); any future recalibration layer would add variance, not skill.

## Variable-based calibration (train ≤2015 per-leaf means, evaluate 2016-2025)

Favourite strength (|spread_line|):
| leaf | test n | train base | test actual |
|---|---|---|---|
| PK-1 | 188 | 46.81% | 46.81% |
| 1.5-2.5 | 447 | 50.94% | 50.11% |
| 3-6 | 1196 | 50.00% | 52.01% |
| 6.5-9.5 | 576 | 65.86% | 57.12% |
| 10+ | 343 | 74.43% | 72.89% |

Weighted leaf Brier 0.2440 vs single global mean 0.2478 (leaf model wins by
0.0038 on held-out data). FLAG, check before relying on it: the 6.5-9.5 leaf
drifts 8.7 points train→test (65.86% → 57.12%, n=576, ≈3.6 standard errors) —
either real era drift in moderate-favourite cover rates or a training-window
artifact. This is the one number in this document that would justify a
follow-up study; it does NOT justify any product change on its own.

Season era: only partially testable — the corpus starts at 2006, so the era
variable trains on 2006-2015 and the 1999-2005/2006-2013 leaves cannot be
evaluated. The single evaluable leaf (2014-2020: 55.91% train, 55.41% test,
weighted leaf Brier 0.2471 vs 0.2478 global) shows no era effect.

## Consequences

- D7 honored: the market is calibrated; publish the reliability CURVE as the
  honest artifact (launch option A), never a recalibrated model claim.
- Combined with `docs/data/CONVERGENT_CALIBRATION_EVIDENCE_2026-09-04.md`:
  the market resolves outcomes; the confidence score does not. Any "edge"
  language on the public surface remains unsupported.
- No MODEL_VERSION change proposed by this document; floors (Brier ≤ 0.22 /
  ECE ≤ 0.05, D2) are met by the MARKET, not by our picks.
