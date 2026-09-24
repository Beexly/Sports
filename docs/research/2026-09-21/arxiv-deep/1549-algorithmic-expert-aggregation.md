# [1549] Algorithmic Expert Aggregation (arXiv:2607.08744)

**Citation:** Tang, W. and Zhang, H. (2026). *Algorithmic Expert Aggregation*. arXiv:2607.08744v1 [cs.GT]. Chinese University of Hong Kong. URL: https://arxiv.org/abs/2607.08744
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 53+ pages incl. appendix; read §§1–5, formal theorems, algorithms, hardness constructions; proof details skimmed).
**Verdict:** REJECT — pure theory paper with zero empirical forecasting application: no datasets, no experiments, no backtests, no numbers. The characterization theorems and NP-hardness results are real mathematics but cannot be counted toward the 750-valuable target, which requires applied forecasting value. Replaced by arXiv:1803.06730 as ledger 1560.

## 1. Research question
In forecast aggregation, can one construct an output expert that (i) remains calibrated, (ii) Blackwell-dominates a target input expert and is undominated among constructible experts, and (iii) minimizes expected proper loss among such refinements — using only the observable prior and input experts? What is the computational complexity? Pure theory; no empirical question is posed.

## 2. Dataset / schema
No datasets. Results are theorems, not experiments. The only applied scenario is a stated-but-never-executed hospital-expert-aggregation motivation.

## 3. Method / model
Finite state space Ω, prior λ, binary outcome Y; experts as stochastic mappings f: Ω → Δ([0,1]) with posterior-consistent (calibrated) reports. Constructs: observable signal-state matrix A, linear system Ay = b, observable row space S = Row(A), cone K = S ∩ Rⁿ₊. Characterization: constructible experts = decompositions of the all-ones vector into nonzero v⁽ʰ⁾ ∈ K. Algorithms: Search-Aggregation (polynomial-time via extreme-ray decomposition + Stern–Brocot search) and OPT-Aggregation (additive FPTAS via LP). Hardness: deterministic output is NP-hard (SubsetSum reduction), no multiplicative PTAS for Brier optimization unless P = NP.

## 4. Equations & assumptions
- Integrated CDF: I_f(t) = E[(t − p)_+]; Blackwell dominance f ⪰ f† iff I_f(t) ≥ I_f†(t) ∀ t.
- Observable system A(j,a),i = ρ_{j,a,i}; Ay = b with b_{j,a} = p_{j,a}λ(ρ_{j,a}).
- Constructible expert: g(·|ω_i) = Σ_h v⁽ʰ⁾_i δ(p_h), p_h = Ŷ(v⁽ʰ⁾)/λ(v⁽ʰ⁾).
- Expected proper loss E[L̄]; Theorem 5.1: polynomial-time additive FPTAS.
- Assumptions: exactly calibrated experts, known prior, finite state space, curvature-bounded regular proper loss.

## 5. Features / target
Inputs: prior λ, input experts' reporting rules, target index τ, proper loss L. Output: a single output expert (randomized mapping states → predictions). No features or empirical targets.

## 6. Validation design
Formal proofs only. Theorems 4.1, 5.1, 1.2/§6. No empirical validation, no datasets, no backtests.

## 7. Numerical results / baselines
None — no numbers reported anywhere. "Results" are complexity classifications. Example 1.1 is a worked 3-state toy calculation, not an experiment.

## 8. Code / data availability
None stated. No repository, no data.

## 9. Leakage & limitations
- Zero empirical validation: the LP algorithms were never run on any data; practical behavior unknown.
- Exact-calibration assumption is strong and untested for robustness.
- Finite-state discrete formalism; no path to continuous predictive distributions discussed.
- Worst-case hardness; no heuristic guidance for the deterministic case GSE actually needs.

## 10. GSE overlap
Conceptually new (calibrated aggregation, Blackwell dominance) but with no applied result to overlap or transfer. No duplication concern because there is nothing empirical to duplicate.

## 11. GSE implementation spec
Not applicable — rejected. The paper's LP refinement procedure could in principle be prototyped (discretize engine/market/Elo probabilities into state bins, build A from historical report distributions, run Search-Aggregation), but with zero empirical evidence that it beats a linear pool, this is speculative research, not an adaptation target.

## 12. Reproducible test
Not applicable — rejected. No empirical claim exists to reproduce.

## 13. Acceptance / rejection gate
**REJECTED.** Gate failed at the threshold criterion: the wave requires applied forecasting value (full empirical read with datasets, results, and a GSE transfer path). A 53-page theorem paper with no experiment cannot clear it, regardless of mathematical quality. No implementation, no test, no gate metrics are warranted.

## 14. Improvement experiment
Not applicable — rejected. If a future applied version appears (algorithms run on real forecast data vs. linear pools), re-evaluate under a new ledger number; do not resurrect this one.
