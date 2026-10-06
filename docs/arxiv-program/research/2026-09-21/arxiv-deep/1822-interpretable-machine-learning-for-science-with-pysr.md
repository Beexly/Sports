# [1822] Interpretable Machine Learning for Science with PySR and SymbolicRegression.jl (arXiv:2305.01582)

**Citation:** Miles Cranmer (2023). *Interpretable Machine Learning for Science with PySR and SymbolicRegression.jl*. arXiv:2305.01582v3. URL: https://arxiv.org/abs/2305.01582
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADOPT

The flagship production symbolic-regression stack; evolve-simplify-optimize loop with BFGS constant fitting, adaptive parsimony, custom operators, and the EmpiricalBench benchmark protocol are directly usable for GSE's metric-invention program.

## 1. Research question
Can a practical, open-source symbolic regression (SR) tool meet the full set of requirements of "scientific SR" — real unknown constants, noisy/heteroscedastic data, non-differentiable piecewise relations, domain constraints, custom field-specific operators, high-dimensional and non-tabular data — and can its applicability to real science be measured by rediscovering historically empirical equations (Kepler, Hubble, Planck, etc.) from their original noisy data?

## 2. Dataset / schema
No single dataset — this is a software/methods paper plus a new benchmark, EmpiricalBench (Sec. 3.2): 9 historically-empirical laws (Hubble's law v=H0·D from digitized 1929 original data via WebPlotDigitizer; Kepler's Third Law; Newton's gravitation; Planck's law; Leavitt's Law; Schechter function; Bode's law; ideal gas law; Rydberg formula). Original public datasets where available; otherwise data generated from the equation over realistic variable ranges with noise applied. All 9 laws posed WITHOUT physical constants (algorithm must discover H0, G, h, R etc. automatically), and several posed in observed units rather than log units so the search must discover better variable transformations itself. Code/datasets: github.com/MilesCranmer/pysr_paper (fork of SRBench competition).

## 3. Method / model
PySR = multi-population (island-model) evolutionary algorithm, asynchronous, each population running a tournament-selection GA (tournament subset of size n_s, winner selected with probability p, else remove and repeat) with mutations and crossovers (Figs. 1–3). Key modifications over classic GP:
- **Evolve-simplify-optimize loop** (Algorithm 2): run full evolution for a set number of mutations → "Simplify": apply algebraic equivalence rules to equations (deliberately infrequent, so redundant intermediates like x*x−x*x survive long enough to mutate into x*x−x*y) → "Optimize": a few iterations of BFGS (Optim.jl default; any Optim.jl optimizer swappable) to fit real constants inside every expression. This explicit constant-optimization stage is credited with vastly improving discovery of equations containing real constants.
- **Adaptive parsimony** instead of fixed λ·complexity: ℓ(E) = ℓ_pred(E)·exp(frecency[C(E)]) (Eq. 2), where frecency = frequency+recency count of expressions at complexity C(E) in a moving time window divided by a tunable constant. This equalizes the number of expressions per complexity level and prevents premature specialization in one functional form.
- **Simulated annealing** on mutation acceptance: q_anneal = exp(−(L*−L)/(α·T)), acceptance if rand() < q_anneal·q_parsimony, T = 1 − k/n_c annealing schedule (Algorithms 3). Reported to significantly speed search (Sec. 3).
- **Outer loop** (Algorithm 1): populations evolve independently, then migrate — novel: migration uses a global permanent "hall of fame" recording best expression at each complexity across all populations, which significantly speeds search.
- **Preprocessing**: optional GP denoising with kernel k(x,x') = σ²exp(−|x−x'|²/2ℓ²) + αδ(x−x') + C (Gaussian + white-noise + constant kernels), plus dimensionality reduction.
- **Custom operators**: users define any 1–2 argument scalar operator (e.g. a sports-domain aggregation); must supply SymPy + JAX/PyTorch equivalents for export paths.
Backend: SymbolicRegression.jl fuses user operators into SIMD kernels at runtime, autodiff, distributes populations to thousands of cores across a cluster; Python front-end interfaces with deep-learning packages (mixed NN→SR strategy from [22–24] for high-dim/non-tabular data via aggregation operators such as Σ).

## 4. Equations & assumptions
ℓ(E) = ℓ_pred(E) + parsimony·C(E) (Eq. 1, classical fixed-penalty, rejected)
ℓ(E) = ℓ_pred(E)·exp(frecency[C(E)]) (Eq. 2, adaptive parsimony actually used)
q_anneal = exp(−(L* − L)/(α·T)), T = 1 − k/n_c (mutation acceptance)
GP denoising kernel: k(x,x') = σ²exp(−|x−x'|²/2ℓ²) + αδ(x−x') + C
Complexity default = number of nodes in expression tree (fully user-configurable).
Assumptions: (1) target relation is expressible as a compact analytic tree over the operator set; (2) noise is smooth enough for GP denoising; (3) Pareto balance of accuracy vs complexity selects the scientifically-adopted equation; (4) simplification equivalence rules preserve semantics; (5) migration frequency/α_H=0.05, α_M=0.05 defaults transfer.

## 5. Features / target
Generic supervised regression: inputs = any tabular features; target = any scalar response. In EmpiricalBench: inputs = physical observables (distance D, period P, temperature T, etc.), target = observed law quantity (velocity v, force F, spectral radiance B, etc.). For GSE analogs: inputs = play-level EPA, success rate, air yards, pressure rate, etc.; target = e.g. next-season win share, team points, or QB efficiency proxy.

## 6. Validation design
EmpiricalBench (Sec. 3.2.1): each of 6 algorithms (PySR, Operon, DSR, EQL, QLattice, SR-Transformer) run 5 trials on each of 9 equations = 45 runs/algorithm. Every algorithm is fed the entire dataset for training (test = the output expression itself). Each trial's full Pareto front is judged manually (by eye, because SymPy equality checks were unreliable) into four categories: correct / almost (off by a constant factor) / failed (crash/undefined expression — counted in the primary score) / incorrect. Explicitly notes author-bias caveat: they are more likely to run PySR in a stable environment, and DSR improves if failed runs are excluded.

## 7. Numerical results / baselines
Table 3 (EmpiricalBench, 9 historical laws × 5 trials; fraction = correct rediscoveries / 5; itemization = correct/nearly-correct/failed/incorrect), columns PySR | Operon | QLattice | DSR | EQL | SR-Transformer:
- Hubble: 5/5 | 0/5 (0,5,0,0) | 1/5 | 0/5 | 0/5 | 0/5
- Kepler: 5/5 | 0/5 (0,5,0,0) | 4/5 | 0/5 | 0/5 | 0/5
- Newton: 5/5 | 1/5 | 1/5 | 0/5 | 0/5 | 0/5
- Planck: 0/5 | 0/5 | 0/5 | 0/5 | 0/5 | 0/5 (nobody solved it)
- Leavitt: 5/5 | 0/5 | 5/5 | 0/5 | 0/5 | 0/5
- Schechter: 5/5 | 5/5 | 5/5 | 0/5 | 5/5 | 0/5
- Bode: 5/5 | 3/5 | 1/5 | 0/5 | 0/5 | 0/5
- Ideal Gas: 5/5 | 0/5 | 5/5 | 0/5 | 0/5 | 0/5
- Rydberg: 0/5 | 0/5 | 0/5 | 0/5 | 0/5 | 0/5 (nobody solved it)
Totals (correct/45): PySR **35/45**, QLattice 21/45, Operon 9/45, EQL 5/45, DSR 0/45 (many failed/crashed runs — improves if failed runs excluded), SR-Transformer 0/45. The four "untrained" classic-heuristic algorithms (PySR, Operon, DSR, QLattice) all outperformed the two pure deep-learning approaches (EQL, SR-Transformer); SR-Transformer recovered the fewest despite pre-training on billions of synthetic expressions on a GPU cluster for weeks. Raw per-trial Pareto fronts at github.com/MilesCranmer/pysr_paper.

## 8. Code / data availability
PySR: github.com/MilesCranmer/PySR (PyPI/Conda `pysr`); backend: github.com/MilesCranmer/SymbolicRegression.jl (Julia registry `SymbolicRegression`); paper repo: github.com/MilesCranmer/pysr_paper (EmpiricalBench code + datasets, fork of SRBench). All open-source.

## 9. Leakage & limitations
- Author-bias: Cranmer is PySR's author; self-reported stability advantage acknowledged but not fully controlled.
- GP algorithms are sample-inefficient: benchmark explicitly does NOT measure number of evaluations, where genetic algorithms are very inefficient — search cost for high-dimensional sports data could be large.
- No separate held-out set: train = entire dataset; expression judged by eye — leakage into selection is mitigated by judging form recovery, but predictive generalization of discovered equations is untested here.
- Noise model in synthetic EmpiricalBench entries is simple; sports data has heavier tails and structural breaks.
- Assumption that the truth is a compact analytic tree fails if the true DGP is genuinely complex — then SR returns a misleadingly simple approximation.

## 10. GSE overlap
GSE's 2026-09-18 ML research brief (`docs/research/2026-09-18-ml-research-brief.md`, items 12–13) explicitly flags automated discovery: "most of these have weak track records on low-signal tabular problems, and an earlier internal effort using symbolic regression produced no surviving finding." This paper is the direct antidote and therefore a NEW capability, not a duplicate: PySR's BFGS constant-optimization loop, adaptive parsimony, GP denoising, and the EmpiricalBench noise-realistic benchmark protocol address exactly the failure modes an naive SR attempt would hit (unknown constants, heteroscedastic noise, premature specialization). No existing GSE repo code implements evolve-simplify-optimize SR; check for PySR usage found none.

## 11. GSE implementation spec
- Install: `pip install pysr` (pulls Julia runtime; pin versions in a conda lockfile); or pure-Julia `SymbolicRegression.jl` for cluster runs.
- Data: nflverse play-by-play 2015–2025 → game/team-season aggregates: net EPA/play, success rate, explosive-play rate, air yards/attempt, pressure rate allowed, sack rate, turnover margin proxy, 3rd-down conversion. Target lanes: (a) points scored per drive (team), (b) next-season win total (team-season, n≈320 rows), (c) QB EPA/dropback vs box-score stats.
- Operators: +, −, ×, ÷, pow, exp, log, sqrt, min/max; custom operators: `sigmoid`, `relu`-like piecewise for regime changes (PySR supports non-differentiable piecewise discovery), plus constraint hooks (e.g. enforce monotonicity in turnover margin).
- Protocol: GP-denoise inputs; run multi-population search with adaptive parsimony; export the Pareto hall-of-fame; select final equation by held-out-season accuracy AND complexity.
- Effort: ~1–2 engineer-days to wire the pipeline + compute for searches; serving is trivial (a closed-form formula evaluates in microseconds).

## 12. Reproducible test
Dataset: nflverse team-season stats 2009–2023 train, 2024–2025 held out. Baseline: passer rating and QBR's correlation with next-season wins (both ≈0.30–0.35 on this window). Task: evolve a closed-form "true QB efficiency" equation from per-game QB box-score + EPA features predicting next-season team wins. Metric: Pearson r of discovered metric vs next-season wins on held-out seasons.

## 13. Acceptance / rejection gate
ADOPT if the discovered closed-form equation beats the better of passer rating / QBR by ≥0.05 Pearson r on held-out 2024–2025 seasons AND has ≤15 tree nodes (interpretable enough to publish); REJECT if it fails either, or if the top Pareto solutions are all degenerate (constants only, or reuse a single input).

## 14. Improvement experiment
Multi-view SR: run two PySR searches in parallel — one on QB efficiency features, one on team defensive features — then feed each search's hall-of-fame expressions as custom operator inputs into a third "fusion" search (PySR allows arbitrary 1–2 arg custom operators). This tests whether composable discovered sub-metrics (like EmpiricalBench's multi-variable laws) beat a single flat search on the same feature set, and mirrors how analysts actually build metrics hierarchically.

---
Lane: symreg_equation_discovery · Block 1822–1841
