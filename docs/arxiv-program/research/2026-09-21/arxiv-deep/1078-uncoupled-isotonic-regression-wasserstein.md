# 1078 — Uncoupled isotonic regression via minimum Wasserstein deconvolution

- **arXiv ID**: 1806.10648v2
- **Full-text URL**: https://arxiv.org/pdf/1806.10648v2
- **Authors**: Philippe Rigollet (MIT), Jonathan Weed (MIT)
- **Lane**: calibration_uncertainty
- **Verdict**: **REJECT**
- **Replacement chain**: 1806.10648v2 REJECT → 2303.06021v4 (ledger 1079, read in full but disqualified: drawn from calibration/betting searches, not the mandated referee-bias/home-advantage mechanism lane) → 2506.11399v1 (ledger 1080, ADAPT, compliant fresh search in the referee-bias/home-advantage lane). Chain closed 2026-09-21.
- **Reason for rejection**: Pure statistical theory with no empirical content. The paper proves matching minimax upper/lower bounds for estimating a monotone regression function from *unpaired* observations (unordered x-set and y-set), via minimum Wasserstein distance deconvolution and moment-matching arguments. It contains **no data, no experiments, no code, no implementation, and no operational result**. The headline result is a negative one: minimax rate log log n / log n versus n^{-1/3} for standard isotonic regression, meaning unpaired datasets would need exponentially larger sample sizes to match paired-data accuracy. GSE's calibration pipeline already operates on paired predictions/outcomes (paper #1, ENIR, ADAPT), so this paper changes nothing operationally — it only confirms that unpaired marginal data is useless at GSE's sample sizes. Nothing to implement, nothing to adapt, nothing to adopt. Same REJECT profile as 1610.06833v1 (pure optimal-transport theory).
- **Read depth**: FULL READ of the complete cached ar5iv text, end to end: abstract, introduction, prior work, model and sub-exponential noise assumptions, main minimax results (Theorems 2 and 3), minimum Wasserstein deconvolution estimator (convex relaxation on an O(n^{1/4}) grid, quantile rounding), moment-matching/Wasserstein-moment-control machinery (Theorems 4 and 5, Proposition 3 tightness), upper- and lower-bound proofs, conclusion, full appendix proofs (A.1–A.6, Lemmas 1–11), and references.
- **Wave**: wave2-reader-20
- **GSE overlap**: None found in phase-one tracker, existing-research-map, or wave-one reports.

## Summary

The paper studies *uncoupled isotonic regression*: estimating a nondecreasing regression function f: [0,1] → ℝ from y_i = f(x_i) + ξ_i, where only the unordered sets {x_1..x_n} and {y_1..y_n} are observed ("you don't know which x corresponds to which y"). Key machinery: the map f ↦ π_f (pushforward measure of design points through f) is an isometry between isotonic functions with empirical ℓ_p norm and probability measures with Wasserstein-p distance (Proposition 1), so the problem reduces to deconvolution of π_f * 𝒟 given samples from the convolution. The estimator is minimum Wasserstein deconvolution: f̂ ∈ argmin_{g ∈ ℱ_V} W_2²(π_g * 𝒟, π̂), relaxed to a convex program over measures on an O(n^{1/4}) grid and rounded via quantile functions. Main results: minimax risk ≍ V·(log log n)/(log n) for all p ∈ [1,∞), proved via a novel moment-matching theorem controlling W_p by moment differences (Theorem 4, tight by Proposition 3), and a lower bound via the method of fuzzy hypotheses with moment-matched priors (Lemma 3, Lemma 11). Rate is exponentially worse than standard isotonic regression (n^{-1/3}). Conclusion flags piecewise-constant f and multivariate extensions as future work.

## Method, math, and equations

- Model: y_i = f(x_i) + ξ_i, ξ_i ∼ 𝒟 i.i.d. sub-exponential (centered, Orlicz ψ_1 norm finite), f nondecreasing, |f| ≤ V, 𝒟 known.
- Proposition 1: ‖f − g‖_p = W_p(π_f, π_g) for isotonic f, g.
- Estimator (4): f̂ ∈ argmin_{g∈ℱ_V} W_2²(π_g * 𝒟, π̂); efficient version (5) over measures on grid 𝒜 of size O(n^{1/4}), Ĝ(x_i) = 𝒬_μ̂(i/n).
- Theorem 4: W_p(μ,ν) ≤ Cp·sup_{ℓ≥1} Δ_ℓ(μ,ν)/ℓ, Δ_ℓ = |E[X^ℓ] − E[Y^ℓ]|^{1/ℓ} — first W_p (p>1) moment-control result for unbounded measures.
- Theorem 2 (upper): sup risk^{1/p} ≤ CpV(log log n)/(log n)(1+o(1)).
- Theorem 3 (lower): same rate is unavoidable even with Gaussian noise, via fuzzy-hypotheses construction with k = c_1(log n)/(log log n) matching moments.

## Datasets

None. No experiments, no simulations, no data — the paper is entirely theorem/proof-based.

## GSE application and implementation spec

None operational. The only GSE-relevant lesson is a negative one: learning a monotone calibration map from unpaired prediction/outcome marginals is statistically infeasible at realistic sample sizes, so GSE should keep calibrating on paired data — which it already does. No method, code, or data artifact is provided to adapt.

## Leakage

- Noise distribution 𝒟 must be *known*; the authors prove no consistent estimator exists otherwise (a theoretical assumption, not a data leak).
- No data sources are used, so no train/test leakage issues arise; all bounds are analytic.

## Limitations

- Noise distribution must be known (fundamental identifiability requirement).
- Fixed design on [0,1]; univariate only — multivariate isotonic extension left to future work.
- Efficient estimator is described as a convex program but no implementation, library, or runtime evaluation is given.
- The log log n / log n rate makes the method practically useless even at census scale; the authors note piecewise-constant f could give better rates but do not develop it.

## GSE overlap

None.

## Implementation difficulty

Not applicable (REJECT). For the record: even the efficient convex program is impractical for GSE — solving a Wasserstein barycenter-type problem on an O(n^{1/4}) grid per calibration pass with no shipped code, to achieve an astronomically slow rate, has no place in the engine.

## Reproducible test

Not applicable (REJECT). A paper-level replication would require re-deriving the moment-matching proofs; no code or numeric claims exist to reproduce.

## Numeric gate

**0.24** — the paper's minimax rate factor (log log n)/(log n) evaluated at n=10⁴ (a large GSE calibration set), versus n^{−1/3} ≈ 0.046 for paired isotonic regression: the uncoupled estimator's error decays ~5× slower, so GSE would need exponentially larger samples to reach ENIR-quality calibration from unpaired data. Operational gate: uncoupled calibration is only ever considered if GSE's paired prediction/outcome pipeline breaks; until then the REJECT stands and no paired-data calibration work (e.g. ENIR, ledger 1074) is displaced by unpaired-data theory.

## Improvement experiment

Not applicable (REJECT). (For the record: the paper's own future work — piecewise-constant regression functions for better rates, multivariate extension — would remain theory without a GSE use case.)

## Verdict

**REJECT** — Pure minimax theory for uncoupled isotonic regression with no data, experiments, code, or operational result. The headline finding is a negative result (unpaired data needs exponentially larger samples) that changes nothing about GSE's paired-data calibration pipeline. Nothing to implement, adapt, or adopt; replaced by 2506.11399v1 (ledger 1080, ADAPT) via compliant referee-bias/home-advantage fresh search — replacement chain closed.
