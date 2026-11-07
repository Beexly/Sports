# Week 9 Sunday Main Slate (11 games) — Optimizer Packet

**Generated:** 2026-11-07T16:23:09Z
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

## Full Engine Parameters (`10,000` Sims + `26` Layers + `21,419` Equations + 5-Track `L1..L5` Reasoning)

- roster structure: QB/2RB/3WR/TE/FLEX/DST
- candidates scored: 230
- Monte Carlo sims: 10000
- 26-Layer ContextPacket + L1..L5 ReasoningTrace + 21,419-Equation Cognitive Router: `VERIFIED (26 layers, 21419 equations)`
- adversarial field rosters: 300
- p99 field win threshold: 135.44 points
- portfolio size: 3

## Situational & Vacated-Workload Matchup Spotlights

| Player | Pos | Team | Opp | Salary | Engine Proj | Value ($/1k) |
|---|---|---|---|---:|---:|---:|
| **Rhamondre Stevenson** | RB | NE | GB | $6,100 | **28.07** | 4.6x |
| **Ollie Gordon II** | RB | MIA | DET | $5,600 | **29.07** | 5.19x |
| **Joe Milton III** | QB | PHI | NYG | $4,100 | **15.32** | 3.74x |
| **Malik Davis** | RB | DAL | IND | $4,000 | **19.67** | 4.92x |
| **Greg Dulcich** | TE | MIA | DET | $3,100 | **15.83** | 5.11x |

## Portfolio

| # | Salary | Proj | Win prob vs p99 | Teams |
|---|---|---|---|---|
| 1 | $49,300 | 196.9 | 0.9168 | DET, HOU, LAC, LV, MIA, NE, SEA |
| 2 | $50,000 | 199.04 | 0.9305 | DET, LAC, LV, MIA, NE, NYG |
| 3 | $49,900 | 197.22 | 0.925 | DET, HOU, MIA, NE, NYJ, SEA |

## Rosters

### Lineup 1 — $49,300 / proj 196.90

| Slot | Player | Pos | Team | Salary | Proj |
|---|---|---|---|---:|---:|
| QB | C.J. Stroud | QB | HOU | $5,900 | 27.87 |
| RB1 | Jahmyr Gibbs | RB | DET | $10,000 | 38.85 |
| RB2 | Rhamondre Stevenson | RB | NE | $6,100 | 28.07 |
| WR1 | Jaxon Smith-Njigba | WR | SEA | $9,300 | 28.37 |
| WR2 | Xavier Hutchinson | WR | HOU | $4,000 | 12.91 |
| WR3 | KeAndre Lambert-Smith | WR | LAC | $3,000 | 10.89 |
| TE | Dalton Schultz | TE | HOU | $3,200 | 14.85 |
| FLEX | Ollie Gordon II | RB | MIA | $5,600 | 29.07 |
| DST | Raiders | DST | LV | $2,200 | 6.01 |

### Lineup 2 — $50,000 / proj 199.04

| Slot | Player | Pos | Team | Salary | Proj |
|---|---|---|---|---:|---:|
| QB | Jared Goff | QB | DET | $6,600 | 29.76 |
| RB1 | Jahmyr Gibbs | RB | DET | $10,000 | 38.85 |
| RB2 | Rhamondre Stevenson | RB | NE | $6,100 | 28.07 |
| WR1 | Malik Nabers | WR | NYG | $7,300 | 23.15 |
| WR2 | Jameson Williams | WR | DET | $6,100 | 17.40 |
| WR3 | KeAndre Lambert-Smith | WR | LAC | $3,000 | 10.89 |
| TE | Greg Dulcich | TE | MIA | $3,100 | 15.83 |
| FLEX | Ollie Gordon II | RB | MIA | $5,600 | 29.07 |
| DST | Raiders | DST | LV | $2,200 | 6.01 |

### Lineup 3 — $49,900 / proj 197.22

| Slot | Player | Pos | Team | Salary | Proj |
|---|---|---|---|---:|---:|
| QB | Jared Goff | QB | DET | $6,600 | 29.76 |
| RB1 | Jahmyr Gibbs | RB | DET | $10,000 | 38.85 |
| RB2 | Rhamondre Stevenson | RB | NE | $6,100 | 28.07 |
| WR1 | Jaxon Smith-Njigba | WR | SEA | $9,300 | 28.37 |
| WR2 | Xavier Hutchinson | WR | HOU | $4,000 | 12.91 |
| WR3 | Isaac TeSlaa | WR | DET | $3,100 | 9.59 |
| TE | Greg Dulcich | TE | MIA | $3,100 | 15.83 |
| FLEX | Ollie Gordon II | RB | MIA | $5,600 | 29.07 |
| DST | Jets | DST | NYJ | $2,100 | 4.77 |

## Engine Provenance

- Projections are hydrated from the 10,000-world Connected Workflow Dossiers (`stage3_4_conserved_post_sim_projections`),
  26-Layer `ContextPacket`s, 5-Track `L1..L5` `ReasoningTrace`s, and the `21,419`-Equation Cognitive Router.
- Stage 0 pre-flight roster gate hard-blocks OUT/IR/DNP players (`TreVeyon Henderson`, `Jaylen Wright`, `De'Von Achane`, `Tanner McKee`, `Lamar Jackson`, `Isaiah Likely`).
- Win probabilities are measured against a p99 adversarial-field threshold from
  `simulate_dirichlet_multinomial_field` across 10,000 correlated worlds.
