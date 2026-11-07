# Week 9 Sunday Main Slate (11 games) — Optimizer Packet

**Generated:** 2026-11-07T23:10:26Z
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
- candidates scored: 225
- Monte Carlo sims: 10000
- 26-Layer ContextPacket + L1..L5 ReasoningTrace + 21,419-Equation Cognitive Router: `VERIFIED (26 layers, 21419 equations)`
- adversarial field rosters: 300
- p99 field win threshold: 139.08 points
- portfolio size: 3

## Situational & Vacated-Workload Matchup Spotlights

| Player | Pos | Team | Opp | Salary | Engine Proj | Value ($/1k) |
|---|---|---|---|---:|---:|---:|
| **Rhamondre Stevenson** | RB | NE | GB | $6,100 | **22.24** | 3.65x |
| **Ollie Gordon II** | RB | MIA | DET | $5,600 | **21.27** | 3.8x |
| **Joe Milton III** | QB | PHI | NYG | $4,100 | **19.01** | 4.64x |
| **Malik Davis** | RB | DAL | IND | $4,000 | **16.1** | 4.03x |
| **Greg Dulcich** | TE | MIA | DET | $3,100 | **12.39** | 4.0x |

## Portfolio

| # | Salary | Proj | Win prob vs p99 | Teams |
|---|---|---|---|---|
| 1 | $49,600 | 181.3 | 0.823 | DAL, DEN, DET, GB, MIA, SEA, WAS |
| 2 | $49,900 | 181.99 | 0.8408 | GB, HOU, LAC, LAR, MIA, NE, WAS |
| 3 | $49,500 | 167.54 | 0.7287 | DET, LAC, LV, MIA, NE, NYG, PHI |

## Rosters

### Lineup 1 — $49,600 / proj 181.30

| Slot | Player | Pos | Team | Salary | Proj |
|---|---|---|---|---:|---:|
| WR | Jaxon Smith-Njigba | WR | SEA | $9,300 | 29.57 |
| RB | Josh Jacobs | RB | GB | $6,800 | 27.48 |
| QB | Jared Goff | QB | DET | $6,600 | 30.02 |
| WR | Jameson Williams | WR | DET | $6,100 | 17.68 |
| WR | Stefon Diggs | WR | WAS | $5,600 | 17.65 |
| TE | Sam LaPorta | TE | DET | $5,100 | 19.43 |
| RB | Malik Davis | RB | DAL | $4,000 | 16.10 |
| TE | Greg Dulcich | TE | MIA | $3,100 | 12.39 |
| DST | Broncos | DST | DEN | $3,000 | 10.96 |

### Lineup 2 — $49,900 / proj 181.99

| Slot | Player | Pos | Team | Salary | Proj |
|---|---|---|---|---:|---:|
| WR | Puka Nacua | WR | LAR | $8,800 | 26.07 |
| RB | Josh Jacobs | RB | GB | $6,800 | 27.48 |
| RB | Rhamondre Stevenson | RB | NE | $6,100 | 22.24 |
| QB | C.J. Stroud | QB | HOU | $5,900 | 28.31 |
| RB | Ollie Gordon II | RB | MIA | $5,600 | 21.27 |
| WR | Stefon Diggs | WR | WAS | $5,600 | 17.65 |
| WR | Ladd McConkey | WR | LAC | $5,500 | 15.88 |
| TE | Dalton Schultz | TE | HOU | $3,200 | 13.15 |
| DST | Packers | DST | GB | $2,400 | 9.94 |

### Lineup 3 — $49,500 / proj 167.54

| Slot | Player | Pos | Team | Salary | Proj |
|---|---|---|---|---:|---:|
| WR | Malik Nabers | WR | NYG | $7,300 | 22.64 |
| WR | DeVonta Smith | WR | PHI | $6,800 | 16.43 |
| RB | Rhamondre Stevenson | RB | NE | $6,100 | 22.24 |
| RB | Ashton Jeanty | RB | LV | $5,900 | 19.88 |
| RB | Ollie Gordon II | RB | MIA | $5,600 | 21.27 |
| WR | Ladd McConkey | WR | LAC | $5,500 | 15.88 |
| TE | Sam LaPorta | TE | DET | $5,100 | 19.43 |
| QB | Joe Milton III | QB | PHI | $4,100 | 19.01 |
| DST | Patriots | DST | NE | $3,100 | 10.76 |

## Engine Provenance

- Projections are hydrated from the 10,000-world Connected Workflow Dossiers (`stage3_4_conserved_post_sim_projections`),
  26-Layer `ContextPacket`s, 5-Track `L1..L5` `ReasoningTrace`s, and the `21,419`-Equation Cognitive Router.
- Stage 0 pre-flight roster gate hard-blocks OUT/IR/DNP players (`TreVeyon Henderson`, `Jaylen Wright`, `De'Von Achane`, `Tanner McKee`, `Lamar Jackson`, `Isaiah Likely`).
- Win probabilities are measured against a p99 adversarial-field threshold from
  `simulate_dirichlet_multinomial_field` across 10,000 correlated worlds.
