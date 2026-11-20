---
name: dk-200pt-dfs-contest-simulation-loop
description: Build DraftKings Classic and Showdown portfolios from situationally conditioned 10,000-world trajectories and QRE opponent field sims.
metadata:
  source-workflow: workflows/dk-200pt-dfs-contest-simulation-loop.md
  loop-mode: loop-me
---

# Two-Wave DraftKings DFS Contest Simulation & Late-Swap Loop

## When to Use
- Pre-lock builds (`T-180 min`, `T-60 min`), early-to-late window late-swap optimization, or breaking starter `Out`/`Active` rulings.
- Running `intelligence/dfs/dk_200pt_situational_dfs_and_projection_engine.py`, `intelligence/dfs/institutional_dfs_v2_portfolio.py`, or `python scripts/ops/solve_showdown_dfs_milp.py`.

## When Not to Use
- Straight sportsbook odds evaluation (`full-board-360-game-dossier-and-firewall-loop`) or post-game settlement grading (`continuous-post-game-learning-and-pathwise-calibration-loop`).
- Unconditioned Gaussian simulations around static mean projections without Stage 2 situational priors.

## Execution Workflow
1. **Conserved Situational Projections:** Derive player distributions (`mean`, `std`, `p75`..`p99`, milestone bonuses) conditioned on Stage 2 priors, Stream 15O/15P causal positional vulnerability, and verified `Out`/`IR` exclusions (`player_gp` true active denominator).
2. **Wave 1 — Correlated MILP Portfolio:** Solve `$50,000` salary cap Classic/Showdown lineups enforcing primary stack + opposing bring-back, opposing DST exclusion, Hamming distance diversity, and exposure caps.
3. **Wave 2 — QRE & Dirichlet-Multinomial Field Sim:** Simulate realistic opponent field lineups across `10,000` correlated worlds and rank lineups by expected ROI / top-1% ceiling and causal leverage.
4. **Export & Late Check:** Write dated receipt under `docs/dfs/research/<YYYY-MM-DD>/` (never overwrite historical Nov 7 artifacts) and present top lineups + CSV upload path for final operator review before lock.

## Completion Criteria
Done when DFS unit tests (`tests/test_institutional_dfs_v2_portfolio.py`), salary-cap/hygiene invariants (`$50,000`, 0 `Out`/`IR` players), and dated DFS receipt checks pass exit `0`.
