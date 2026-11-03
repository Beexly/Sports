# Week 9 Sunday Main Slate (11 games) — Optimizer Packet

**Generated:** 2026-11-03T17:21:38Z
**Source salary export:** `C:\Users\Garrett\Downloads\DKSalaries (2).csv`
**Archived copy:** `data/dfs/dk_salaries_week9_main_slate_2026_11_08.csv`

## Slate identity

```json
{
  "row_count": 570,
  "unique_games": [
    "ARI@SEA 11/08/2026 04:25PM ET",
    "CLE@NO 11/08/2026 01:00PM ET",
    "DAL@IND 11/08/2026 01:00PM ET",
    "DEN@CAR 11/08/2026 01:00PM ET",
    "DET@MIA 11/08/2026 01:00PM ET",
    "GB@NE 11/08/2026 04:25PM ET",
    "HOU@LAC 11/08/2026 04:05PM ET",
    "LAR@WAS 11/08/2026 01:00PM ET",
    "LV@SF 11/08/2026 04:25PM ET",
    "NYG@PHI 11/08/2026 01:00PM ET",
    "NYJ@KC 11/08/2026 01:00PM ET"
  ],
  "detected_nfl_week": 9,
  "is_week8_retrospective_file": false,
  "is_week9_live_file": true
}
```

## Run parameters

- roster structure: QB/2RB/3WR/TE/FLEX/DST
- candidates scored: 570
- Monte Carlo sims: 120
- adversarial field rosters: 60
- p99 field win threshold: 92.47 points
- portfolio size: 2

## Portfolio

| # | Salary | Proj | Win prob vs p99 | Teams |
|---|---|---|---|---|
| 1 | $33,500 | 101.63 | 0.4583 | DEN, GB, KC, NYJ |
| 2 | $34,200 | 101.87 | 0.5167 | GB, KC, NYJ, PHI, SEA |

## Rosters

### Lineup 1 — $33,500 / proj 101.63

| Slot | Player | Pos | Team | Salary | Proj |
|---|---|---|---|---|---|
| WR | Rashee Rice | WR | KC | $6,400 | 11.75 |
| QB | Justin Fields | QB | KC | $4,000 | 14.270000457763672 |
| RB | Kaleb Johnson | RB | GB | $4,000 | 12.550000190734863 |
| RB | Chip Trayanum | RB | NYJ | $4,000 | 12.010000228881836 |
| WR | Jalen Royals | WR | KC | $3,200 | 10.899999618530273 |
| WR | Jimmy Holiday | WR | KC | $3,000 | 10.75 |
| WR | Justin Watson | WR | KC | $3,000 | 11.180000305175781 |
| DST | Broncos | DST | DEN | $3,000 | 7.769999980926514 |
| TE | Noah Gray | TE | KC | $2,900 | 10.460000038146973 |

### Lineup 2 — $34,200 / proj 101.87

| Slot | Player | Pos | Team | Salary | Proj |
|---|---|---|---|---|---|
| WR | Rashee Rice | WR | KC | $6,400 | 11.75 |
| RB | Elijah Mitchell | RB | PHI | $4,500 | 12.149999618530273 |
| QB | Justin Fields | QB | KC | $4,000 | 14.270000457763672 |
| RB | Kaleb Johnson | RB | GB | $4,000 | 12.550000190734863 |
| DST | Seahawks | DST | SEA | $3,800 | 7.630000114440918 |
| WR | Jalen Royals | WR | KC | $3,200 | 10.899999618530273 |
| WR | Justin Watson | WR | KC | $3,000 | 11.180000305175781 |
| TE | Kenyon Sadiq | TE | NYJ | $2,800 | 11.050000190734863 |
| TE | Jared Wiley | TE | KC | $2,500 | 10.390000343322754 |

## Provenance and honesty

- Projections are anchored to DraftKings' own `AvgPointsPerGame`; the per-position
  decomposition and the 0.55 * mean sigma are documented modelling choices, not a
  fitted forecasting model.
- Win probabilities are measured against a p99 adversarial-field threshold from
  `simulate_dirichlet_multinomial_field` / salary-share field sampling, not against
  the actual contest field.
- RESEARCH ARTIFACT. Not a published play set. Nothing here may be surfaced to a
  customer until it passes the 5-stage engine and the snap-by-snap JEV gate.
