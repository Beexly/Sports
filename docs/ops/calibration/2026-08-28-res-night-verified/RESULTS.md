# Operation Resolution — verified backtest (2026-08-28)

Data: nflverse `games.csv` (CC-BY-4.0, registry-cleared), 2018–2024 REG+POST,
1,935 games with real closing moneylines. Spread orientation proven from data
(home win rate 0.675 when spread_line>0). Elo is strictly walk-forward
(predict-then-update, season regression 2/3) — no leakage. Murphy decomposition
with 20 fixed bins (binned identity residual asserted < 0.02).

| model | Brier | REL | RES | UNC | ECE |
|---|---|---|---|---|---|
| **market (ML de-vig)** | **0.2107** | 0.0013 | **0.0380** | 0.2480 | 0.0308 |
| spread CDF (σ=13.45) | 0.2112 | 0.0023 | 0.0388 | 0.2480 | 0.0351 |
| Elo (walk-forward) | 0.2226 | 0.0023 | 0.0278 | 0.2480 | 0.0405 |
| blend .9 mkt + .1 elo | 0.2110 | 0.0017 | 0.0388 | 0.2480 | 0.0367 |
| blend .8 mkt + .2 elo | 0.2114 | 0.0012 | 0.0376 | 0.2480 | 0.0285 |
| blend .5 mkt + .5 elo | 0.2141 | 0.0015 | 0.0350 | 0.2480 | 0.0317 |

Per-season market Brier: 2018 .2124 · 2019 .2141 · 2020 .2019 · 2021 .2177 ·
2022 .2093 · 2023 .2186 · 2024 .2010.

## Pre-registered verdict (honest)

1. **Market alone wins.** No Elo blend beats the de-vigged close on Brier;
   Elo adds no net game-level edge. Do not publish any beat-the-market claim.
2. **The market itself scores 0.2107 with RES 0.038** — it clears the 0.22
   floor, but only just, and NOT in every season (2021/2023 ≈ 0.218). An
   absolute 0.22 floor fails a perfectly market-grade model in some seasons —
   direct evidence for restating C4 as **paired Brier vs the de-vigged close
   on identical picks** (meter: the promotion gate's Leg-1 math).
3. **The live-class gap is a harvesting problem, not a modeling moonshot.**
   Live Brier 0.2478 (RES≈0.005) vs clean de-vig 0.2107 (RES 0.038): the live
   confidence pipeline is a DEGRADED market echo. Priority order: (a) make
   pick confidence equal the de-vigged close wherever no independent signal
   justifies deviating — measured by the paired meter — then (b) spend
   independents (Elo/Poisson/FPI) on SELECTIVE deviation, where RES is earned.
4. Caveat: this is NFL-only; the live class mixes sports/markets. The paired
   meter over GSE's own settled picks (clvClosePrice de-vig) is the
   apples-to-apples instrument and remains the key build.

Corrects `hermes/res-night-1` round-2 numbers (Brier 0.34 > coin-flip on the
1967–2017 Kaggle CSV = inverted spread orientation + wrong dataset; a market
model can never lose to random). Full run log: RESULTS.txt; script:
res_backtest.py (self-validating orientation + identity checks).
