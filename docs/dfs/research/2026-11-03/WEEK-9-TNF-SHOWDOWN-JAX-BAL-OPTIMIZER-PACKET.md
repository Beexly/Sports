# Week 9 TNF Showdown JAX@BAL — Optimizer Packet

**Generated:** 2026-11-03T17:58:08Z
**Source salary export:** `C:\Users\Garrett\Downloads\DKSalaries (3).csv`
**Archived copy:** `data/dfs/dk_salaries_week9_tnf_showdown_jax_bal_2026_11_05.csv`

## Slate identity

```json
{
  "row_count": 104,
  "unique_games": [
    "JAX@BAL 11/05/2026 08:15PM ET"
  ],
  "detected_nfl_week": 9,
  "is_week8_retrospective_file": false,
  "is_week9_live_file": true
}
```

## Run parameters

- roster structure: 1 CPT (1.5x) + 5 FLEX
- candidates scored: 104
- Monte Carlo sims: 120
- adversarial field rosters: 60
- p99 field win threshold: 83.35 points
- portfolio size: 2

## Portfolio

| # | Salary | Proj | Win prob vs p99 | Teams |
|---|---|---|---|---|
| 1 | $49,500 | 87.1 | 0.5083 | BAL, JAX |
| 2 | $49,500 | 87.1 | 0.5083 | BAL, JAX |

## Rosters

### Lineup 1 — $49,500 / proj 87.1

| Slot | Player | Pos | Team | Salary | Proj |
|---|---|---|---|---|---|
| CPT | Trevor Lawrence | QB | JAX | $15,900 | 20.7 |
| FLEX | Zay Flowers | WR | BAL | $10,400 | 18.7 |
| FLEX | Derrick Henry | RB | BAL | $10,200 | 18.0 |
| FLEX | Cam Little | K | JAX | $5,400 | 9.0 |
| FLEX | Lamar Jackson | QB | BAL | $6,000 | 16.8 |
| FLEX | Nate Boerkircher | TE | JAX | $1,600 | 3.9 |

### Lineup 2 — $49,500 / proj 87.1

| Slot | Player | Pos | Team | Salary | Proj |
|---|---|---|---|---|---|
| CPT | Trevor Lawrence | QB | JAX | $15,900 | 20.7 |
| FLEX | Zay Flowers | WR | BAL | $10,400 | 18.7 |
| FLEX | Derrick Henry | RB | BAL | $10,200 | 18.0 |
| FLEX | Cam Little | K | JAX | $5,400 | 9.0 |
| FLEX | Lamar Jackson | QB | BAL | $6,000 | 16.8 |
| FLEX | Nate Boerkircher | TE | JAX | $1,600 | 3.9 |

## Provenance and honesty

- Projections are anchored to DraftKings' own `AvgPointsPerGame`; the per-position
  decomposition and the 0.55 * mean sigma are documented modelling choices, not a
  fitted forecasting model.
- Win probabilities are measured against a p99 adversarial-field threshold from
  `simulate_dirichlet_multinomial_field` / salary-share field sampling, not against
  the actual contest field.
- RESEARCH ARTIFACT. Not a published play set. Nothing here may be surfaced to a
  customer until it passes the 5-stage engine and the snap-by-snap JEV gate.
