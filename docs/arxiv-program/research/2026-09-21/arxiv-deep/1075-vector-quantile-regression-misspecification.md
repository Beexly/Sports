# [1075] Vector quantile regression beyond correct specification (arXiv:1610.06833)

**Citation:** Guillaume Carlier, Victor Chernozhukov, Alfred Galichon (2016). *Vector quantile regression beyond correct specification*. arXiv:1610.06833v1. Full-text URL: https://arxiv.org/pdf/1610.06833v1
**Ledger completed:** 2026-09-21. **Read:** full text (cached ar5iv HTML conversion, read cover to cover including appendix).
**Verdict:** REJECT — pure optimal-transport theory with zero experiments, datasets, code, or numbers; its one operationally relevant observation (monotonicity constraints across the t-grid to avoid quantile crossing) is well-known folklore with cheaper remedies (post-hoc quantile sorting) and adds nothing to GSE's CQR/conformal calibration stack.
**Replacement chain:** 1610 REJECT → 2207 reserve REJECT → 2401 ADAPT (ledgers 1076, 1077; the compliant replacement 2401.16392v3 was selected by a fresh referee-bias/home-advantage arXiv search).

## 1. Research question
What do the vector-quantile-regression (VQR) variational problems — correlation maximization with a mean-independence constraint, formulated as an optimal transport problem — tell us about the dependence of a random vector Y on covariates X *without* assuming the conditional vector quantile is affine in x (i.e., beyond correct specification, which their 2016 Annals of Statistics paper assumed)?

## 2. Dataset / schema
None. The paper contains no datasets, no simulations, no empirical evaluation of any kind — it is a mathematical statistics paper (proofs of existence, representation theorems, duality results).

## 3. Method / model
- Vector quantile via correlation maximization (Brenier map): max{E(V·Y) : Law(V)=μ}, μ=uniform([0,1]^d), solved by Y=∇φ(U) for convex φ.
- VQR primal (3.1): max{E(V·Y) : Law(V)=μ, E(X|V)=E(X)} — OT with mean-independence constraint replacing full independence.
- Dual (3.2): inf_{(ψ,φ,b)} E(ψ(X,Y)+φ(U)) s.t. ψ(x,y)+φ(t)+b(t)·x ≥ t·y pointwise; existence of L¹ optimizers proved via Komlós' theorem (Theorem 3.2, appendix) under bounded-convex-support / L∞-bounded-density assumptions.
- Theorem 3.3 (general representation under misspecification): Y ∈ ∂Φ_X^{**}(U) a.s. with Φ_X(U)=Φ_X^{**}(U) a.s. — i.e., the solution lives on the contact set of Φ_x with its convex envelope, subgradients replacing gradients.
- Univariate specialization (d=1): Theorem 4.9 proves sup(4.23)=sup(4.26) — the mean-independence correlation maximization equals the Koenker–Bassett t-by-t program with the added global constraint that t↦U_t is nonincreasing; Propositions 4.5–4.6 and Corollary 4.7 characterize "quasi-specification" (Y=α(U)+β(U)·X, U uniform, X mean-independent of U, t↦α(t)+β(t)·x increasing) and the uniqueness of (α^QR,β^QR).

## 4. Equations & assumptions
Key equations: (3.1) max{E(V·Y), Law(V)=μ, E(X|V)=0}; (3.2) dual inf{E(ψ(X,Y)+φ(U)) : ψ(x,y)+φ(t)+b(t)·x≥t·y}; (3.9) Y∈∂Φ_X^{**}(U), Φ_X(U)=Φ_X^{**}(U) a.s.; (4.15)/(4.16) Koenker–Bassett ρ_t check-function program; (4.17) its dual sup{E(U_t Y): U_t∈[0,1], E(U_t)=(1−t), E(XU_t)=0}; (4.26) the monotonicity-augmented variant with U_t nonincreasing in t; (4.28) dual reformulation inf_{(φ,b)} ∫max_t{ty−φ(t)−b(t)·x}ν(dx,dy)+∫₀¹φ(t)dt; Lemma 4.10: sup_{v∈C}∫₀¹v(t)q(t)dt=max_t Q(t), Q(t)=∫₀ᵗq(s)ds.
**Assumptions:** nonatomic probability space; X centered, E(X)=0; law of X nondegenerate (support contains a ball around E(X)); for d=1: conditional quantiles t↦Q(x,t) continuous and increasing m-a.e.; law of (X,Y) charges no nonvertical hyperplanes, P(Y=α+β·X)=0; (X,Y) bounded (compact support); dual existence needs ν bounded with support closure of an open bounded convex set, bounded away from zero on compacts.

## 5. Features / target
No features, no target, no estimator implementation. Population-level variational problems only; no finite-sample algorithm given.

## 6. Validation design
None. No train/validation/test, no baselines, no metrics, no simulations.

## 7. Numerical results / baselines
None — the paper reports zero numbers. (Nothing to quote; there are no tables or figures.)

## 8. Code / data availability
None stated.

## 9. Leakage
Not applicable as empirical science — there are no data, no trained models, and no evaluation from which information could leak.

## 10. Limitations
As theory: (i) the mean-independence constraint is strictly weaker than independence, so the estimated "quantiles" need not be conditional quantiles at all — this is the paper's honest point, but it limits operational use; (ii) no finite-sample estimator, convergence rates, or computational recipe is given; (iii) dual-existence assumptions (convex bounded support, densities bounded away from zero) are strong relative to real sports data; (iv) the multivariate case admits no analogous monotonicity-repair — Theorem 4.9 is univariate-only.

## 11. GSE overlap
The map's calibration lane has CQR (conformalized quantile regression — implemented in GSE's cqr.ts, audited 2026-09-21), Mondrian/cross-conformal, LRD, ECE-by-slice, grouping loss, Venn-Abers. None of these rest on VQR/optimal transport, and the map lists "optimal transport for sports" as a gap — but this paper does not fill it (no algorithm, no sports application). Its nearest useful claim (global monotone t-grid consistency for quantile regression) is redundant: quantile crossing is fixed post-hoc by sorting or by the quantile-rearrangement method (Chernozhukov–Fernández-Val–Galichon 2009/2010, not this paper).

## 12. GSE implementation spec
None defensible — there is no estimator to implement. The only candidate action item (enforce t-monotonicity across the quantile grid in any t-by-t quantile forecaster to prevent crossing) is a one-line post-processing sort, not an adaptation of this paper.

## 13. Reproducible test
None possible from the paper — no estimator, no data.

## 14. Numeric gate
**0** — the count of experiments, datasets, and reported numbers in the paper. Rejected at the source: no empirical content, no implementable method, no number.

## 15. Improvement experiment
Not applicable. If GSE ever needs joint-distribution forecasting over multivariate outcomes (e.g., joint spread/total probability surfaces), the OT/Brenier-map machinery here suggests a research direction — but that would require a separate applied paper, not this one.

## 16. Verdict

**REJECT** — a mathematical-statistics paper with zero empirical content and no implementable estimator. Its single operationally adjacent observation (t-grid monotonicity to prevent quantile crossing) is folklore with cheaper remedies. Replacement chain completed: 1610 REJECT → 2207 reserve REJECT → 2401 ADAPT.
