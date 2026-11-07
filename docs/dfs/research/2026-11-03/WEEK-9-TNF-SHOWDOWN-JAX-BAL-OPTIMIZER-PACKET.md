# Week 9 TNF Showdown JAX@BAL — Optimizer Packet

**Generated:** 2026-11-07T19:53:11Z
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

## Full Engine Parameters (`10,000` Sims + `26` Layers + `21,419` Equations + 5-Track `L1..L5` Reasoning)

- roster structure: 1 CPT (1.5x) + 5 FLEX
- candidates scored: 45
- Monte Carlo sims: 10000
- 26-Layer ContextPacket + L1..L5 ReasoningTrace + 21,419-Equation Cognitive Router: `VERIFIED (26 layers, 21419 equations)`
- adversarial field rosters: 300
- p99 field win threshold: 104.2 points
- portfolio size: 3

## Situational & Vacated-Workload Matchup Spotlights

- Verified via Stage 0-4 situational overlays.

## Portfolio

| # | Salary | Proj | Win prob vs p99 | Teams |
|---|---|---|---|---|
| 1 | $49,500 | 104.35 | 0.4999 | BAL, JAX |
| 2 | $49,900 | 101.77 | 0.4655 | BAL, JAX |
| 3 | $49,600 | 100.19 | 0.4454 | BAL, JAX |

## Rosters

### Lineup 1 — $49,500 / proj 104.35

| Slot | Player | Pos | Team | Salary | Proj |
|---|---|---|---|---:|---:|
| CPT | Trevor Lawrence | QB | JAX | $15,900 | 37.76 |
| FLEX | Derrick Henry | RB | BAL | $10,200 | 18.81 |
| FLEX | Brenton Strange | TE | JAX | $7,400 | 14.08 |
| FLEX | Brian Thomas Jr. | WR | JAX | $6,400 | 13.40 |
| FLEX | Jaguars | DST | JAX | $5,800 | 11.40 |
| FLEX | Rashod Bateman | WR | BAL | $3,800 | 8.90 |

### Lineup 2 — $49,900 / proj 101.77

| Slot | Player | Pos | Team | Salary | Proj |
|---|---|---|---|---:|---:|
| CPT | Derrick Henry | RB | BAL | $15,300 | 28.22 |
| FLEX | Trevor Lawrence | QB | JAX | $10,600 | 25.18 |
| FLEX | Parker Washington | WR | JAX | $9,400 | 16.68 |
| FLEX | Brenton Strange | TE | JAX | $7,400 | 14.08 |
| FLEX | Mark Andrews | TE | BAL | $4,400 | 10.40 |
| FLEX | Josh Cameron | WR | JAX | $2,800 | 7.22 |

### Lineup 3 — $49,600 / proj 100.19

| Slot | Player | Pos | Team | Salary | Proj |
|---|---|---|---|---:|---:|
| CPT | Brian Thomas Jr. | WR | JAX | $9,600 | 20.10 |
| FLEX | Trevor Lawrence | QB | JAX | $10,600 | 25.18 |
| FLEX | Bhayshul Tuten | RB | JAX | $9,800 | 16.43 |
| FLEX | Parker Washington | WR | JAX | $9,400 | 16.68 |
| FLEX | Jaguars | DST | JAX | $5,800 | 11.40 |
| FLEX | Mark Andrews | TE | BAL | $4,400 | 10.40 |

## Engine Provenance

- Projections are hydrated from the 10,000-world Connected Workflow Dossiers (`stage3_4_conserved_post_sim_projections`),
  26-Layer `ContextPacket`s, 5-Track `L1..L5` `ReasoningTrace`s, and the `21,419`-Equation Cognitive Router.
- Stage 0 pre-flight roster gate hard-blocks OUT/IR/DNP players (`TreVeyon Henderson`, `Jaylen Wright`, `De'Von Achane`, `Tanner McKee`, `Lamar Jackson`, `Isaiah Likely`).
- Win probabilities are measured against a p99 adversarial-field threshold from
  `simulate_dirichlet_multinomial_field` across 10,000 correlated worlds.
