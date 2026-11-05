# Week 9 Sunday Main Slate (11 games) — Optimizer Packet

**Generated:** 2026-11-05T01:01:21Z
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
- candidates scored: 203
- Monte Carlo sims: 400
- adversarial field rosters: 300
- p99 field win threshold: 133.06 points
- portfolio size: 3

## Portfolio

| # | Salary | Proj | Win prob vs p99 | Teams |
|---|---|---|---|---|
| 1 | $49,900 | 160.09 | 0.725 | ARI, DET, GB, NYG, NYJ, SEA |
| 2 | $49,900 | 160.02 | 0.7325 | DET, GB, HOU, LV, MIA, SEA, SF |
| 3 | $49,900 | 158.89 | 0.7225 | ARI, DET, GB, LV, MIA, NYJ, SEA |

## Rosters

### Lineup 1 — $49,900 / proj 160.09

| Slot | Player | Pos | Team | Salary | Proj |
|---|---|---|---|---|---|
| RB | Jahmyr Gibbs | RB | DET | $10,000 | 31.700000762939453 |
| WR | Jaxon Smith-Njigba | WR | SEA | $9,300 | 31.510000228881836 |
| RB | Josh Jacobs | RB | GB | $6,800 | 22.209999084472656 |
| TE | Isaiah Likely | TE | NYG | $5,000 | 15.350000381469727 |
| WR | Omar Cooper Jr. | WR | NYJ | $4,900 | 14.100000381469727 |
| QB | Gardner Minshew II | QB | ARI | $4,500 | 20.030000686645508 |
| WR | Adonai Mitchell | WR | NYJ | $4,500 | 13.619999885559082 |
| TE | Elijah Higgins | TE | ARI | $2,500 | 4.460000038146973 |
| DST | Packers | DST | GB | $2,400 | 7.119999885559082 |

### Lineup 2 — $49,900 / proj 160.02

| Slot | Player | Pos | Team | Salary | Proj |
|---|---|---|---|---|---|
| RB | Jahmyr Gibbs | RB | DET | $10,000 | 31.700000762939453 |
| WR | Jaxon Smith-Njigba | WR | SEA | $9,300 | 31.510000228881836 |
| RB | Josh Jacobs | RB | GB | $6,800 | 22.209999084472656 |
| QB | Kirk Cousins | QB | LV | $5,300 | 22.649999618530273 |
| WR | Deebo Samuel Sr. | WR | SF | $5,300 | 12.359999656677246 |
| WR | Caleb Douglas | WR | MIA | $4,200 | 12.579999923706055 |
| TE | Michael Mayer | TE | LV | $3,400 | 9.789999961853027 |
| TE | Dalton Schultz | TE | HOU | $3,200 | 10.119999885559082 |
| DST | Packers | DST | GB | $2,400 | 7.119999885559082 |

### Lineup 3 — $49,900 / proj 158.89

| Slot | Player | Pos | Team | Salary | Proj |
|---|---|---|---|---|---|
| RB | Jahmyr Gibbs | RB | DET | $10,000 | 31.700000762939453 |
| WR | Jaxon Smith-Njigba | WR | SEA | $9,300 | 31.510000228881836 |
| RB | Josh Jacobs | RB | GB | $6,800 | 22.209999084472656 |
| RB | Ashton Jeanty | RB | LV | $5,900 | 17.3799991607666 |
| QB | Gardner Minshew II | QB | ARI | $4,500 | 20.030000686645508 |
| WR | Adonai Mitchell | WR | NYJ | $4,500 | 13.619999885559082 |
| WR | Caleb Douglas | WR | MIA | $4,200 | 12.579999923706055 |
| TE | Teagan Quitoriano | TE | ARI | $2,500 | 3.7300000190734863 |
| DST | Raiders | DST | LV | $2,200 | 6.139999866485596 |

## Provenance and honesty

- Projections are anchored to DraftKings' own `AvgPointsPerGame`; the per-position
  decomposition and the 0.55 * mean sigma are documented modelling choices, not a
  fitted forecasting model.
- Win probabilities are measured against a p99 adversarial-field threshold from
  `simulate_dirichlet_multinomial_field` / salary-share field sampling, not against
  the actual contest field.
- RESEARCH ARTIFACT. Not a published play set. Nothing here may be surfaced to a
  customer until it passes the 5-stage engine and the snap-by-snap JEV gate.
