# jnederlo/dfs_optimizers

**Stars:** 64 | **License:** MIT | **Pushed:** 2024-05-03 | **Language:** Python | **Forks:** 29

## 1. Vision
A teaching-grade DFS optimizer that implements the math from the "Picking Winners" academic paper: formulate lineup construction as an integer program, solve it fast, and explain the concepts in a companion Medium article. It exists to show *how* an optimizer thinks, not to win you a GPP.

## 2. The Ask
- Python 3, `requirements.txt`, clone and run `run_example.py` (pre-loaded NHL example).
- **IBM CPLEX for speed** — the README is blunt: the default solver works but is "much slower"; CPLEX needs a free IBM account + manual Python API setup (a notoriously fiddly install, including moving the `cplex` folder inside the venv).
- NHL example inputs ship in `example_inputs/`; for other sports you build your own inputs.

## 3. Constraints
- **MIT license** — legally adoptable with attribution.
- **Maintenance:** last pushed 2024-05-03; single-author teaching repo, not a product. NHL example only — no NFL inputs shipped.
- The CPLEX dependency is the real ceiling: a commercial-grade solver behind an account wall and a fragile install. GSE can't standardize a pipeline on that without pain.
- No ownership, stacking, contest structures, or slate feeds — pure point-maximization IP.

## 4. GSE lens
- **Solver quality is a real lever GSE hasn't pulled.** jnederlo's whole point is that the *solver* (CPLEX vs default) is the difference between a usable optimizer and a toy. GSE's optimizer exists but has no documented solver story and no latency budget — and Garrett's mandate names latency as a stated requirement. If GSE's optimizer is slow or naive, every downstream GPP plan inherits it.
- **The "Picking Winners" paper lineage matters for Garrett's GPP research doctrine.** His 2026-09-25 directive demands winning-lineup construction from real samples/data, not vibes. This repo is a bridge to the actual academic literature on lineup optimization — the kind of source GSE's research corpus should cite and the wiring lane should re-implement.
- Honest non-gap: the optimizer math here is not better than pydfs-lineup-optimizer's; its value is pedagogical.

## 5. Verdict
**REBUILD** — learn the paper's formulation and the solver-speed lesson; rebuild GSE's optimizer core on a proper MILP solver (PuLP/CBC at minimum, benchmarked) rather than adopting a teaching repo with an NHL-only example and a CPLEX dependency.

## 6. The 4 tricks
- codewiki: https://codewiki.google/github.com/jnederlo/dfs_optimizers
- gitdiagram: https://gitdiagram.com/jnederlo/dfs_optimizers
- star-history: https://star-history.com/#jnederlo/dfs_optimizers (64 stars)
- github.dev: https://github.dev/jnederlo/dfs_optimizers
