# Week 9 Sunday Main Slate (11 games) — Optimizer Packet

**Generated:** 2026-11-07T19:53:11Z
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
- candidates scored: 228
- Monte Carlo sims: 10000
- 26-Layer ContextPacket + L1..L5 ReasoningTrace + 21,419-Equation Cognitive Router: `VERIFIED (26 layers, 21419 equations)`
- adversarial field rosters: 300
- p99 field win threshold: 133.66 points
- portfolio size: 3

## Situational & Vacated-Workload Matchup Spotlights

| Player | Pos | Team | Opp | Salary | Engine Proj | Value ($/1k) |
|---|---|---|---|---:|---:|---:|
| **Rhamondre Stevenson** | RB | NE | GB | $6,100 | **21.63** | 3.55x |
| **Ollie Gordon II** | RB | MIA | DET | $5,600 | **21.71** | 3.88x |
| **Joe Milton III** | QB | PHI | NYG | $4,100 | **18.82** | 4.59x |
| **Malik Davis** | RB | DAL | IND | $4,000 | **15.97** | 3.99x |
| **Greg Dulcich** | TE | MIA | DET | $3,100 | **12.38** | 3.99x |

## Portfolio

| # | Salary | Proj | Win prob vs p99 | Teams |
|---|---|---|---|---|
| 1 | $49,900 | 181.13 | 0.8724 | DAL, DET, GB, LAC, MIA, NO, NYG |
| 2 | $49,900 | 178.88 | 0.8544 | DAL, GB, HOU, LAC, MIA, SEA |
| 3 | $49,900 | 159.14 | 0.7107 | DEN, DET, LAC, LAR, LV, NE, NYJ, WAS |

## Rosters

### Lineup 1 — $49,900 / proj 181.13

| Slot | Player | Pos | Team | Salary | Proj |
|---|---|---|---|---:|---:|
| WR | Malik Nabers | WR | NYG | $7,300 | 23.64 |
| RB | Josh Jacobs | RB | GB | $6,800 | 26.83 |
| QB | Jared Goff | QB | DET | $6,600 | 29.91 |
| WR | Jameson Williams | WR | DET | $6,100 | 17.46 |
| RB | Ollie Gordon II | RB | MIA | $5,600 | 21.71 |
| WR | Ladd McConkey | WR | LAC | $5,500 | 15.68 |
| TE | Sam LaPorta | TE | DET | $5,100 | 19.45 |
| RB | Malik Davis | RB | DAL | $4,000 | 15.97 |
| DST | Saints | DST | NO | $2,900 | 10.48 |

### Lineup 2 — $49,900 / proj 178.88

| Slot | Player | Pos | Team | Salary | Proj |
|---|---|---|---|---:|---:|
| WR | Jaxon Smith-Njigba | WR | SEA | $9,300 | 29.11 |
| WR | Nico Collins | WR | HOU | $7,200 | 19.26 |
| RB | Josh Jacobs | RB | GB | $6,800 | 26.83 |
| QB | C.J. Stroud | QB | HOU | $5,900 | 27.76 |
| RB | Ollie Gordon II | RB | MIA | $5,600 | 21.71 |
| WR | Ladd McConkey | WR | LAC | $5,500 | 15.68 |
| RB | Malik Davis | RB | DAL | $4,000 | 15.97 |
| TE | Dalton Schultz | TE | HOU | $3,200 | 12.76 |
| DST | Packers | DST | GB | $2,400 | 9.80 |

### Lineup 3 — $49,900 / proj 159.14

| Slot | Player | Pos | Team | Salary | Proj |
|---|---|---|---|---:|---:|
| WR | Puka Nacua | WR | LAR | $8,800 | 25.74 |
| QB | Matthew Stafford | QB | LAR | $6,200 | 23.21 |
| RB | Rhamondre Stevenson | RB | NE | $6,100 | 21.63 |
| RB | Ashton Jeanty | RB | LV | $5,900 | 19.58 |
| WR | Stefon Diggs | WR | WAS | $5,600 | 12.90 |
| RB | Jonah Coleman | RB | DEN | $5,300 | 16.58 |
| TE | Sam LaPorta | TE | DET | $5,100 | 19.45 |
| WR | Adonai Mitchell | WR | NYJ | $4,500 | 12.57 |
| DST | Chargers | DST | LAC | $2,400 | 7.48 |

## Engine Provenance

- Projections are hydrated from the 10,000-world Connected Workflow Dossiers (`stage3_4_conserved_post_sim_projections`),
  26-Layer `ContextPacket`s, 5-Track `L1..L5` `ReasoningTrace`s, and the `21,419`-Equation Cognitive Router.
- Stage 0 pre-flight roster gate hard-blocks OUT/IR/DNP players (`TreVeyon Henderson`, `Jaylen Wright`, `De'Von Achane`, `Tanner McKee`, `Lamar Jackson`, `Isaiah Likely`).
- Win probabilities are measured against a p99 adversarial-field threshold from
  `simulate_dirichlet_multinomial_field` across 10,000 correlated worlds.
