# Player-projection backtest (real nflverse data)

Stands up the "is the engine actually smart?" test. It fetches real nflverse weekly
player stats, engineers leakage-safe trailing-usage features, and runs the engine's
**existing** purged + embargoed walk-forward + Clark-West harness
(`runTweedieBaselineBacktest`). No new modeling logic — it exercises the real engine.

## Run

From the repo root, in an environment with `node_modules` installed and network access:

```bash
NODE_OPTIONS=--use-system-ca npx tsx scripts/backtest/player-projection-backtest.ts 2021 2022 2023
```

Args are seasons (default `2021 2022 2023`). PPR scoring.

## What it answers (and what it does NOT)

- **Answers:** does the model add real signal **over naive points-persistence**
  (a player's trailing-average fantasy points) **out-of-sample on real games**?
  That is the correct first bar. `beats NAIVE = true` (Clark-West, n≥30, t>1.64,
  lower MAE) means keep building.
- **Does NOT answer:** "beats the Vegas market." That requires historical player-prop
  lines (not freely available) and is a `[DATA]` follow-up. The baseline here is naive
  persistence, and the report says so explicitly.

## Doctrine

Read-only, shadow. The engine output stays `priced=false`. Nothing here publishes a
projection or changes `canPublishProjections`. If `beats NAIVE` is true on a healthy
sample, that is the evidence to attach to a `DRAFT` calibration proposal — the flip to
public stays a human `[OWNER]/[DATA]` decision.

## If the data fetch fails

nflverse release asset names drift. The driver tries three URL patterns per season; if
none resolve, update `candidateUrls()` in `player-projection-backtest.ts` with the
current `player_stats` / `stats_player_week` release asset URL from
https://github.com/nflverse/nflverse-data/releases .
