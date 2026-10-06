# drmbeledogu / RobustDFS

- **Stars:** 13 | **License:** BSD-3-Clause | **Pushed:** 2023-02-03 (stale, research-complete) | **Lang:** Jupyter Notebook + Python

## Vision
Apply **robust optimization** to DFS lineup construction: instead of maximizing projected points (which ignores projection error and payout structure), maximize the *worst-case* outcome given an uncertainty set around player projections — `max pᵀx − ρ‖Σ¹ᐟ²x‖`. Built for 50/50 and Double-Up contests where surviving the cash line matters more than ceiling.

## The Ask
- NumPy/SciPy/Pandas/Matplotlib + **Gurobi** (commercial MILP solver — needs a license) for the robust formulation.
- Historical DK salaries + projections (ships 2021 data scraped from rotoguru1.com; user supplies their own for other seasons).

## Constraints
- BSD-3-Clause — adoptable. But Gurobi licensing is a real cost/complexity gate for production use; open-source MILP alternatives (PuLP/CBC, OR-Tools) would be needed for a free pipeline.
- Research notebook, not a service; 2021 data only.

## GSE lens
This exposes a genuine methodological gap in GSE's DFS lane: **GSE's optimizer maximizes projected points, full stop.** RobustDFS argues — with math — that for cash games the right objective is worst-case performance under projection uncertainty, because projections are wrong in correlated ways (same-team positional error correlation is measured in the notebooks). GSE's DFS research (2026-09-25, large-field GPP construction) covers the tournament side; the cash-game/Double-Up objective function has no such rigor. The correlation-of-errors analysis is also directly reusable: GSE's walk-forward calibration should be measuring *correlated* projection errors, not just per-player residuals. Don't copy the Gurobi dependency; steal the objective formulation and the error-correlation EDA.

## Verdict
**REBUILD** — re-implement the robust objective + error-correlation analysis with an open-source solver (OR-Tools/PuLP), as GSE's own cash-game optimizer path.

## The 4 tricks
- CodeWiki: https://codewiki.google/github.com/drmbeledogu/RobustDFS
- GitDiagram: https://gitdiagram.com/drmbeledogu/RobustDFS
- Star history: https://star-history.com/#drmbeledogu/RobustDFS (13 stars)
- github.dev: https://github.dev/drmbeledogu/RobustDFS
