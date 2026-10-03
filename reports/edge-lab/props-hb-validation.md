# Props-HB validation — real nflverse receptions data (NOT a prop-line CLV claim)

Generated 2026-07-16T16:53:28.906Z by `scripts/edge-lab/props-hb-validation.ts` (provenance 338aecf60409ba46…, model v5.1.0).

**Scope:** NOT a prop-line CLV claim. This validates the posterior-predictive machinery's calibration against real player receptions outcomes under an honest walk-forward protocol. A prop-line edge claim requires an archived prop-price history this repo does not yet have.

| item | value |
|---|---|
| seasons | 2022, 2023, 2024 (prior fit on season N-1, walk-forward within season N) |
| position groups | WR, TE, RB |
| stat target | receptions (a genuine per-game count — the Poisson-conditional path) |
| player-week rows loaded | 111329 |
| predictions scored | 12571 |
| Brier (model) | 0.21890 |
| Brier (climatology, base rate 0.3533) | 0.22847 |
| model beats climatology | YES |
| calibration inversions (deciles, tolerance 1) | 0 → MONOTONE |

## Calibration by decile

| decile | n | mean predicted | realized rate | Wilson LCB (realized) |
|---|---|---|---|---|
| 1 | 1257 | 0.192 | 0.195 | 0.177 |
| 2 | 1257 | 0.251 | 0.270 | 0.250 |
| 3 | 1257 | 0.285 | 0.305 | 0.284 |
| 4 | 1257 | 0.313 | 0.308 | 0.287 |
| 5 | 1257 | 0.342 | 0.308 | 0.287 |
| 6 | 1257 | 0.371 | 0.357 | 0.335 |
| 7 | 1257 | 0.403 | 0.375 | 0.353 |
| 8 | 1257 | 0.440 | 0.403 | 0.380 |
| 9 | 1257 | 0.497 | 0.437 | 0.414 |
| 10 | 1258 | 0.602 | 0.576 | 0.552 |


**ACCEPTANCE: PASSED.** The empirical-Bayes Gamma-Poisson posterior-predictive machinery is calibrated on real player-week outcomes and beats a climatology baseline — a validated prerequisite, not a priced prop-line edge.