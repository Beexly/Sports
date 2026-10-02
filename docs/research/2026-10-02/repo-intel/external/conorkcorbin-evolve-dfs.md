# conorkcorbin / evolve-dfs

- **Stars:** 16 | **License:** MIT | **Pushed:** 2017-11-10 (abandoned) | **Lang:** Python (genetic algorithm)

## Vision
Optimize DraftKings MLB/NFL lineups with a **genetic algorithm** (population, generations, mutation rate tunable) instead of integer programming. Projection-agnostic: feed it any CSV of projections and it evolves lineups.

## The Ask
- Python 3.6, numpy, pandas. User downloads projections (RotoGrinders in the example) and formats a CSV; edit `generate_lineups.py` to load it.

## Constraints
- MIT — adoptable, but dead since 2017 and GA-based optimization is strictly worse than MILP for a linear salary-cap problem (GAs don't guarantee optimality; MILP does). Historical interest only.

## GSE lens
Reveals no gap — GSE already has an optimizer, and MILP (what GSE's repo optimizer uses) dominates GAs for this problem class. The one residual lesson is negative and worth stating: **don't let anyone sell GSE a genetic algorithm for lineup optimization.** For linear constraints + linear objective, integer programming is exact and fast; the GA is a slower, worse answer. If the optimizer ever needs multi-lineup diversity (GPP), the right tool is still MILP with iterative exclusion constraints, not evolution. Included so the "we should try genetic algorithms" idea dies here with a citation.

## Verdict
**IGNORE** — obsolete method for this problem; MILP strictly dominates. Kept on file only to kill the GA idea with evidence.

## The 4 tricks
- CodeWiki: https://codewiki.google/github.com/conorkcorbin/evolve-dfs
- GitDiagram: https://gitdiagram.com/conorkcorbin/evolve-dfs
- Star history: https://star-history.com/#conorkcorbin/evolve-dfs (16 stars)
- github.dev: https://github.dev/conorkcorbin/evolve-dfs
