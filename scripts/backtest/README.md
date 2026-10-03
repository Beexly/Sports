# GSE player-projection backtest

Answers the one question no document can: **does the engine add real signal out-of-sample on real
games?** It runs the prediction engine's *existing* purged + embargoed walk-forward + Clark-West
harness (`runTweedieBaselineBacktest`) against real nflverse weekly player stats — no new modeling
logic lives here, only data loading + leakage-safe feature engineering.

## Run

From the repo root (needs `node_modules` installed + outbound network):

```bash
NODE_OPTIONS=--use-system-ca npx tsx scripts/backtest/player-projection-backtest.ts 2021 2022 2023 2024 2025
```

Args = seasons (default = all completed seasons `2021 2022 2023 2024 2025`; the 2026 season has not
been played yet). PPR scoring, skill positions (QB/RB/WR/TE), regular season only. nflverse renamed
the weekly asset after 2024, so the driver tries both `player_stats_<season>.csv` and the newer
`stats_player_week_<season>.csv` names. A player-week is eligible once it has ≥3 prior games that season (so trailing features
exist). Features for week *W* use **strictly** weeks `< W` (no leakage).

## What it prints

`model MAE` vs `naive-baseline MAE`, the Clark-West statistic, and `beats NAIVE = true/false`
(Clark-West gate: n ≥ 30, t > 1.64, and lower MAE).

## Honest scope — read this

- The baseline is a player's **trailing-average fantasy points** ("you'll score what you've been
  scoring"). So this tests **model vs. naive points-persistence on real data** — the correct *first*
  question.
- It is **NOT** "beats the Vegas market." That requires historical player-prop lines, which are not
  freely available — a `[DATA]` follow-up.
- `beats NAIVE = true` ⇒ the engine adds real signal over persistence OOS, the bar to keep building.
  `beats NAIVE = false` ⇒ iterate the model, not the marketing.
- Nothing here publishes a projection, sets `priced=true`, or changes `canPublishProjections`.
  Engine output stays `priced=false` / `shadow`.
