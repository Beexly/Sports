# Week 9 TNF Showdown JAX@BAL — Optimizer Packet

**Generated:** 2026-11-05T01:01:21Z
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
- candidates scored: 88
- Monte Carlo sims: 400
- adversarial field rosters: 300
- p99 field win threshold: 84.74 points
- portfolio size: 3

## Portfolio

| # | Salary | Proj | Win prob vs p99 | Teams |
|---|---|---|---|---|
| 1 | $49,900 | 93.48 | 0.4525 | BAL, JAX |
| 2 | $49,700 | 93.03 | 0.4525 | BAL, JAX |
| 3 | $49,500 | 91.78 | 0.4525 | BAL, JAX |

## Rosters

### Lineup 1 — $49,900 / proj 93.48

| Slot | Player | Pos | Team | Salary | Proj |
|---|---|---|---|---|---|
| CPT | Trevor Lawrence | QB | JAX | $15,900 | 31.05 |
| FLEX | Derrick Henry | RB | BAL | $10,200 | 19.8 |
| FLEX | Bhayshul Tuten | RB | JAX | $9,800 | 17.3 |
| FLEX | Zay Flowers | WR | BAL | $10,400 | 15.9 |
| FLEX | Chris Rodriguez Jr. | RB | JAX | $3,400 | 6.2 |
| FLEX | Chris Moore | WR | BAL | $200 | 3.23 |

### Lineup 2 — $49,700 / proj 93.03

| Slot | Player | Pos | Team | Salary | Proj |
|---|---|---|---|---|---|
| CPT | Derrick Henry | RB | BAL | $15,300 | 29.7 |
| FLEX | Trevor Lawrence | QB | JAX | $10,600 | 20.7 |
| FLEX | Bhayshul Tuten | RB | JAX | $9,800 | 17.3 |
| FLEX | Zay Flowers | WR | BAL | $10,400 | 15.9 |
| FLEX | Chris Rodriguez Jr. | RB | JAX | $3,400 | 6.2 |
| FLEX | Chris Moore | WR | BAL | $200 | 3.23 |

### Lineup 3 — $49,500 / proj 91.78

| Slot | Player | Pos | Team | Salary | Proj |
|---|---|---|---|---|---|
| CPT | Bhayshul Tuten | RB | JAX | $14,700 | 25.95 |
| FLEX | Trevor Lawrence | QB | JAX | $10,600 | 20.7 |
| FLEX | Derrick Henry | RB | BAL | $10,200 | 19.8 |
| FLEX | Zay Flowers | WR | BAL | $10,400 | 15.9 |
| FLEX | Chris Rodriguez Jr. | RB | JAX | $3,400 | 6.2 |
| FLEX | Chris Moore | WR | BAL | $200 | 3.23 |

## Provenance and honesty

- Projections are anchored to DraftKings' own `AvgPointsPerGame`; the per-position
  decomposition and the 0.55 * mean sigma are documented modelling choices, not a
  fitted forecasting model.
- Win probabilities are measured against a p99 adversarial-field threshold from
  `simulate_dirichlet_multinomial_field` / salary-share field sampling, not against
  the actual contest field.
- RESEARCH ARTIFACT. Not a published play set. Nothing here may be surfaced to a
  customer until it passes the 5-stage engine and the snap-by-snap JEV gate.
