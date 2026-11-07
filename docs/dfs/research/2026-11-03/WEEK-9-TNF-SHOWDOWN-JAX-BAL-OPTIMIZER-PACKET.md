# Week 9 TNF Showdown JAX@BAL — Optimizer Packet

**Generated:** 2026-11-07T16:23:09Z
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
- candidates scored: 88
- Monte Carlo sims: 10000
- 26-Layer ContextPacket + L1..L5 ReasoningTrace + 21,419-Equation Cognitive Router: `VERIFIED (26 layers, 21419 equations)`
- adversarial field rosters: 300
- p99 field win threshold: 87.35 points
- portfolio size: 3

## Situational & Vacated-Workload Matchup Spotlights

- Verified via Stage 0-4 situational overlays.

## Portfolio

| # | Salary | Proj | Win prob vs p99 | Teams |
|---|---|---|---|---|
| 1 | $49,900 | 93.48 | 0.4376 | BAL, JAX |
| 2 | $49,700 | 93.03 | 0.4376 | BAL, JAX |
| 3 | $49,500 | 91.78 | 0.4376 | BAL, JAX |

## Rosters

### Lineup 1 — $49,900 / proj 93.48

| Slot | Player | Pos | Team | Salary | Proj |
|---|---|---|---|---:|---:|
| CPT | Trevor Lawrence | QB | JAX | $15,900 | 31.05 |
| FLEX | Derrick Henry | RB | BAL | $10,200 | 19.80 |
| FLEX | Bhayshul Tuten | RB | JAX | $9,800 | 17.30 |
| FLEX | Zay Flowers | WR | BAL | $10,400 | 15.90 |
| FLEX | Chris Rodriguez Jr. | RB | JAX | $3,400 | 6.20 |
| FLEX | Chris Moore | WR | BAL | $200 | 3.23 |

### Lineup 2 — $49,700 / proj 93.03

| Slot | Player | Pos | Team | Salary | Proj |
|---|---|---|---|---:|---:|
| CPT | Derrick Henry | RB | BAL | $15,300 | 29.70 |
| FLEX | Trevor Lawrence | QB | JAX | $10,600 | 20.70 |
| FLEX | Bhayshul Tuten | RB | JAX | $9,800 | 17.30 |
| FLEX | Zay Flowers | WR | BAL | $10,400 | 15.90 |
| FLEX | Chris Rodriguez Jr. | RB | JAX | $3,400 | 6.20 |
| FLEX | Chris Moore | WR | BAL | $200 | 3.23 |

### Lineup 3 — $49,500 / proj 91.78

| Slot | Player | Pos | Team | Salary | Proj |
|---|---|---|---|---:|---:|
| CPT | Bhayshul Tuten | RB | JAX | $14,700 | 25.95 |
| FLEX | Trevor Lawrence | QB | JAX | $10,600 | 20.70 |
| FLEX | Derrick Henry | RB | BAL | $10,200 | 19.80 |
| FLEX | Zay Flowers | WR | BAL | $10,400 | 15.90 |
| FLEX | Chris Rodriguez Jr. | RB | JAX | $3,400 | 6.20 |
| FLEX | Chris Moore | WR | BAL | $200 | 3.23 |

## Engine Provenance

- Projections are hydrated from the 10,000-world Connected Workflow Dossiers (`stage3_4_conserved_post_sim_projections`),
  26-Layer `ContextPacket`s, 5-Track `L1..L5` `ReasoningTrace`s, and the `21,419`-Equation Cognitive Router.
- Stage 0 pre-flight roster gate hard-blocks OUT/IR/DNP players (`TreVeyon Henderson`, `Jaylen Wright`, `De'Von Achane`, `Tanner McKee`, `Lamar Jackson`, `Isaiah Likely`).
- Win probabilities are measured against a p99 adversarial-field threshold from
  `simulate_dirichlet_multinomial_field` across 10,000 correlated worlds.
