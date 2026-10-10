# PP MARGIN CURVE — computed 2026-10-10 (our sigma x their over-only lines x confirmed payouts)
Data: 232 PP over-only lines priced against 96 DK-reconstructed (mu,sigma) fits (R2>=0.98).

## Per-stat mean P(over) at PP over-only lines
| stat | n | mean p | median |
|---|---|---|---|
| rush_rec_yards | 20 | 0.544 | 0.555 |
| pass_yards | 208 | 0.543 | 0.533 |
| rush_yards | 4 | 0.300 | 0.258 (deep goblin-style lines) |

## Slip EV at league p-bar=0.539 (per $1, independence approx, different-game legs)
| legs | Power | Flex |
|---|---|---|
| 2 | -0.128 | - |
| 3 | -0.060 | -0.128 |
| 4 | -0.156 | -0.060 |
| 5 | -0.090 | -0.023 |
| 6 | -0.080 | -0.387 |

VERDICT (league level): PP product margin is real — no free EV at average depth on any mode/legs.

## THE POCKET (conditional on DK distribution calibration)
Deepest over-only lines price at p=0.81-0.84 (Goff 209.5 p=.837; Brissett/Stafford .824; Stroud .820; Rodgers 159.5 .816; Gibbs 89.5 .812...). Two DIFFERENT-game legs at p=.82 on 2-leg Power 3x: joint .672 x3 = +102% EV per $1. This is the arbitrage between PP's product pricing and DK's market probability — it INHERITS DK's model risk (mu_hat anchored to DK's own main line; circularity caveat).
rush_yards over-only = the trap side (p-bar .30, EV deeply negative).

## Kill tests (pre-registered)
1. Backtest: 2-leg Powers from top-quartile p lines vs graded outcomes (needs results feed) — does realized hit rate match our p?
2. Circularity check: recompute mu_hat with PP's own primary lines as anchor; if edge collapses, it was DK-shading not PP-freespace.
3. Correlation: same-game pairs via margin_total_copula (product banned).
MODEL RISK: none of this touches production; diagnostic only.
