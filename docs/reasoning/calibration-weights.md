# Calibration weights

The blend weight was chosen by lowest 2024 mean absolute error and then frozen. 2025 and 2026 did not choose it.
Half-PPR blend w = 0.1. Position weights are the 2025 inverse MAE, normalized to sum to 1. A position that was harder to project gets less weight. That weight is not a probability.

## Half-PPR projections

| season | rows | MAE | bias (pred − actual) | slope | intercept |
|---|---|---|---|---|---|
| 2024 | 4668 | 4.530 | -0.447 | 0.798 | 1.968 |
| 2025 | 5427 | 4.110 | -0.207 | 0.794 | 1.551 |
| 2026 | 323 | 5.266 | 0.204 | 0.497 | 3.448 |

| position | 2025 n | 2025 MAE | weight |
|---|---|---|---|
| QB | 583 | 6.827 | 0.152 |
| RB | 1424 | 4.164 | 0.250 |
| TE | 1150 | 3.162 | 0.329 |
| WR | 2270 | 3.858 | 0.269 |

## Props

- passing_yards (QB): w=0.6. 2025 n=583 MAE=68.036 slope=0.623. 2026 n=34 MAE=84.147 slope=0.247.
- rushing_yards (QB, RB): w=0.3. 2025 n=2007 MAE=17.139 slope=0.837. 2026 n=115 MAE=22.800 slope=0.512.
- receiving_yards (RB, TE, WR): w=0.1. 2025 n=4844 MAE=16.180 slope=0.780. 2026 n=289 MAE=21.332 slope=0.482.
- receptions (RB, TE, WR): w=0.3. 2025 n=4844 MAE=1.234 slope=0.790. 2026 n=289 MAE=1.583 slope=0.531.

## Game probability

Elo on 3018 games, 2015–2025. Brier 0.2312. ECE 0.0338. Drift |2025 − 2015–2024| 0.0057.
The devigged-price baseline on the overlapping moneyline games was 0.2122. This Elo does not beat that baseline, so the calibration contract must not come back VALIDATED.

