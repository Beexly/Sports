# [2171] DISCOVER: A Physics-Informed, GPU-Accelerated Symbolic Regression Framework (arXiv:2602.06986)

**Citation:** Udaykumar Gajera, Mohsen Sotoudeh, Kanchan Sarkar, Axel Groß (2026). *DISCOVER: A Physics-Informed, GPU-Accelerated Symbolic Regression Framework*. arXiv:2602.06986 (software paper). URL: https://arxiv.org/abs/2602.06986
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — a Python-native SR package whose differentiators are (1) hard dimensional-consistency enforcement via the `pint` unit library during feature generation (invalid expressions pruned before evaluation), and (2) multiple exact/heuristic sparse solvers (OMP, MIQP, simulated annealing) for the L₀ problem. The unit-tracking idea is the hard-constraint complement to ledger 2168's soft LLM judge.

## 1. Research question
Existing SR tools (SISSO, AI Feynman, PySR) trade off interpretability, Python integration, domain-constraint control, and speed. Can a modular, Python-native framework provide configuration-file physics constraints — especially automatic dimensional consistency — plus GPU acceleration, as first-class features rather than afterthoughts?

## 2. Dataset / schema
Software paper; no new datasets. Motivating use cases cited: crystal structure stability descriptors, ion mobility in battery materials, magnetic-structure discrimination. Data regime: materials-science tabular data (features = atomic properties, targets = functional properties).

## 3. Method / model
**DISCOVER** (Data-Informed Symbolic Combination of Operators for Variable Equation Regression): generates candidate symbolic features from user features + operator library, then solves the sparse descriptor problem with interchangeable strategies: Orthogonal Matching Pursuit (OMP), Mixed-Integer Quadratic Programming (MIQP), simulated annealing, heuristics. Core objective (Eq. 1): min_β ‖y − Φβ‖²₂ subject to ‖β‖₀ ≤ D (NP-hard L₀-regularized least squares; all strategies are approximations). Physics constraints via config file: operator restrictions, complexity caps, variable-combination rules. **Dimensional consistency enforced with `pint`**: units tracked through every symbolic operation; dimensionally invalid candidates excluded during generation, shrinking the search space. GPU acceleration: CUDA (NVIDIA) and MPS (Apple Silicon), CPU fallback. Modular Python architecture.

## 4. Equations & assumptions
- Core objective: min_β ‖y − Φβ‖²₂ s.t. ‖β‖₀ ≤ D (Eq. 1), Φ = {Φ₁,…,Φ_M} candidate symbolic features.
- Assumptions: the true descriptor is a sparse linear combination of generated features (SISSO-style); user constraints are correct (overly restrictive constraints exclude valid expressions — stated limitation); unit system fully specified by the user.

## 5. Features / target
User-provided features + operator library → generated symbolic feature matrix Φ; target y = physical property. Pruning happens at generation time via constraints.

## 6. Validation design
Software paper: no benchmark experiments reported (limitations section notes benchmarking is ongoing development). Claims rest on design and cited prior applications of the authors' descriptor work.

## 7. Numerical results / baselines
No numerical results in the paper — it is a software announcement. Relevant cited prior art: SISSO (Ouyang et al. 2018) as the deterministic baseline DISCOVER complements; SISSO++ as the large-scale alternative; the authors' own ion-mobility descriptor papers as proof the approach class works.

## 8. Code / data availability
Open-source package (DISCOVER); paper implies public repo (no URL captured in text). Depends on `pint` for units.

## 9. Leakage & limitations
Adversarial notes: (a) Zero benchmarks — every performance claim is aspirational; treat as a design doc, not evidence. (b) SISSO-style linear-in-features assumption is narrower than full SR (no nested compositions like sin(x²+e^x) unless pre-generated). (c) Hard unit constraints only help when the unit system is real — sports "units" (EPA, points, probabilities) are softer, and over-strict rules could block valid discoveries (the paper's own stated limitation). (d) MIQP is exact but scales poorly; no guidance on when each solver wins. (e) GSE has no GPU SR bottleneck today — the acceleration angle is irrelevant to current needs.

## 10. GSE overlap
GSE's SR runs have no dimensional-consistency enforcement at all — ledgers 2166–2170 add soft/structural/statistical guards (MDL, LLM judge, NED, Taylor priors), but nothing *prevents* generating "win_probability + temperature²" at feature-generation time. DISCOVER's `pint`-style unit tracking is the cheapest possible guard: annotate each sports feature with a unit class (probability, points, EPA/play, count, ratio, time) and forbid operations that violate unit algebra during Φ generation. No GSE pipeline does this.

## 11. GSE implementation spec
1. Build a sports unit registry for GSE's SR feature library: classes {probability [0,1], points, epa, rate, count, yards, time, dimensionless} with operation rules (probabilities only via sigmoid/logit composition; points ± points ok; points × probability forbidden; epa/play × plays → epa ok).
2. Wrap GSE's PySR/SISSO-style feature generation: generate candidate features, tag units via `pint`-like propagation, drop unit-invalid candidates before the search starts.
3. Add MIQP (via a MILP-capable solver) as an exact sparse selector for the linear-in-features discovery path (team descriptor discovery, ≤ 20 features), alongside the existing evolutionary search.
Effort: ~1 week for the unit registry + generation wrapper; MIQP path ~1 additional week. No new data cost.

## 12. Reproducible test
2025 NFL win-probability discovery: same feature set, with vs without unit-constrained generation. Metrics: (a) % of generated candidates pruned pre-search; (b) whether the unconstrained run's final selected equations contain any features pruned by the unit filter (recall check on 2015–2024 successful runs — the filter must not kill historically selected features); (c) wall-clock search time; (d) validation Brier parity.

## 13. Acceptance / rejection gate
**ADAPT if:** the unit filter prunes ≥ 40% of generated candidates pre-search AND recall check passes (zero historically selected features pruned) AND validation Brier stays within 1% of the unconstrained run. **REJECT if:** pruning < 20% (sports units too soft to help — limitation (c) confirmed) or any historically successful feature/equation is pruned (over-restriction — the paper's own warned failure mode) or Brier degrades > 1%. Gate pre-registered.

## 14. Improvement experiment
Beyond the paper: **learned unit classes from data**. The paper requires hand-specified units. For sports, bootstrap the registry empirically: compute each feature's empirical transformation behavior (boundedness, additivity under aggregation, sign stability) from 2015–2024 data and *infer* unit classes automatically, then have a domain expert confirm. If the inferred classes match expert labels on ≥ 90% of features, GSE gets unit-constrained SR without manual ontology maintenance as new features are added — removing the paper's main adoption friction (hand-written constraints) while keeping its pruning power.
