# [0546] Low Rank for Rank: Uncertainty-Aware Task-Specific LLM Ranking under Sparse Pairwise Comparisons (arXiv:2605.29395v2)

**Citation:** Li, J., Simchi-Levi, D., & Sun, W. W. (2026). *Low Rank for Rank: Uncertainty-Aware Task-Specific LLM Ranking under Sparse Pairwise Comparisons*. MIT / Purdue. arXiv:2605.29395v2. URL: https://arxiv.org/abs/2605.29395v2
**Ledger completed:** 2026-09-21. **Read:** full text main body (PDF text extract, §§1–7, all tables/figures); proof appendices A–E skimmed.
**Verdict:** ADAPT — the LLM domain does not transfer, but two components port directly to GSE: (1) a **low-rank task×team ability matrix** that shares information across contexts while preserving context-specific rankings, and (2) **simultaneous rank confidence sets with three-way top-K certification** (certified top-K / certified non-top-K / unresolved) — a rigorous upgrade for GSE's pick-confidence tiers.

## 1. Research question
Pairwise-preference platforms (Chatbot Arena) report global leaderboards that mask task heterogeneity, while independent per-task Bradley–Terry estimation is statistically unstable under sparse, imbalanced comparisons. The paper asks: can a *low-rank task-by-model ability matrix* Θ⋆ ∈ R^{d_t×d_m} (shared latent capabilities like reasoning/style) deliver both (a) entrywise-accurate task-specific scores with top-K recovery guarantees and (b) *uncertainty-aware* certification — simultaneous confidence sets for ranks and valid top-K membership tests across many tasks and models — under sparse binary within-task comparisons?

## 2. Dataset / schema
- **Synthetic:** d_t = d_m = 50, true rank r⋆ = 5, amplitude α = 5 (rescaled ‖T⋆‖∞ ≤ α), n ∈ {4,000, 8,000, 16,000, 32,000} BTL comparisons (τ = 1), uniform sampling, 6-fold cross-fitting, N = 200 trials (bootstrap-resampled).
- **LM Arena:** Arena 140K dataset; top-30 most-compared models; d_t = 10 task categories (platform metadata); n = 81,150 comparisons; ground truth T⋆ = per-task BTL MLE on full data; rank r = 3 chosen because top-3 singular values capture > 94% of energy; subsampling fractions f ∈ {0.02, 0.05, 0.10, 0.20, 0.50, 1.0}.
- **Schema:** observation i = (task t_i, model pair (m_i, m'_i), binary outcome Y_i); signed design matrix X_i = e_{t_i}(e_{m_i} − e_{m'_i})ᵀ; BTL model Pr(Y_i=1|X_i) = σ(Θ⋆_{t_i,m_i} − Θ⋆_{t_i,m'_i}); row-centering identification Θ⋆1 = 0; μ-incoherent singular vectors; bounded signal ‖Θ⋆‖∞ ≤ B; near-uniform sampling bounds on ν_t and π_t({m,m'}).

## 3. Method / model
**Estimation (§3).** Nuclear-norm-penalized BTL initializer Θ̂_0 (Frobenius-accurate: ‖Θ̂_0−Θ⋆‖_F ≲ √(r d̄³ polylog(d̄)/n_0)) → **row-wise pairwise-logistic refinement** Refine_r(Θ̂_0): build right factor from initializer, update each task-side latent vector via pairwise-logistic score equation conditional on it, re-center, then model-side update → rank-r, row-centered, **entrywise-accurate** estimator.
**Score-gap inference (§4).** For contrast Γ (canonical: e_t(e_m−e_{m'})ᵀ → Θ⋆_{t,m}−Θ⋆_{t,m'}), project onto low-rank tangent space P_T Γ; restricted Fisher operator A = P_T G P_T with ⟨GH_1,H_2⟩ = E[I(⟨X,Θ⋆⟩)⟨H_1,X⟩⟨H_2,X⟩], I(η) = σ(η)(1−σ(η)); efficient direction H⋆_Γ = A^{−1}P_T Γ; efficient variance V_eff(Γ) = ⟨P_T Γ, A^{−1}P_T Γ⟩ (semiparametric efficiency bound, attained). **Debiased one-step estimator:** ψ̂_Γ = ⟨Γ,Θ̂⟩ + (1/n)Σ_i (Y_i−σ(η̂_i))⟨Ĥ_Γ, X_i⟩. Joint covariance for correlated gaps: Σ_jk = ⟨P_T Γ_j, A^{−1}P_T Γ_k⟩ (non-diagonal — gaps share tasks/models/comparisons/factors); empirical influence-function covariance Σ̂_jk = n^{−1}Σ_i φ̂_j(W_i)φ̂_k(W_i) is consistent.
**Certification (§5).** Rank = 1 + Σ_{ℓ≠m} 1{Δ^{(m)}_{t,ℓ} > 0} with Δ^{(m)}_{t,ℓ} = Θ⋆_{t,ℓ}−Θ⋆_{t,m}. Multiplier bootstrap: T∗_{t,m} = max_{ℓ≠m} |(1/√n)Σ_i ξ_i φ̂^{(m)}_{t,ℓ}(W_i)/σ̂^{(m)}_{t,ℓ}|, ξ_i ∼ N(0,1); critical value c_{t,m}(1−α) = conditional quantile of T∗ (quantile of the *maximum of correlated studentized errors*, not a pointwise z). Simultaneous bands Î^{(m)}_{t,ℓ} = [Δ̂ ± c·σ̂/√n]. **Rank confidence band:** R̂_t(m) = [1+A_t(m), d_m−B_t(m)] where A_t(m) = #{ℓ: L̂>0} (certified above), B_t(m) = #{ℓ: Û<0} (certified below). **Three-way top-K:** certify m ∈ S⋆_K(t) if d_m−B_t(m) ≤ K; certify m ∉ S⋆_K(t) if 1+A_t(m) > K; else **unresolved**. Extends simultaneously across tasks (Corollary 5.2) and to inner/outer top-K set confidence (E.10).

## 4. Equations & assumptions
- Entrywise bound (Thm 3.1): ‖Θ̂−Θ⋆‖∞ ≤ ε_n = C·poly(a,μ,r,κ,B)·√(d̄ log^c(nd̄)/n), w.p. ≥ 1−n^{−a}, for n ≳ poly(μ,r,κ,B)·d̄ log^c(nd̄).
- Hamming accuracy (Prop 3.2): Ham_{K,t} ≤ R_{K,t}(2ε_n; Θ⋆); exact recovery if **K-gap Δ_K(t) = Θ⋆_{t,(K)}−Θ⋆_{t,(K+1)} > 4ε_n**.
- One-step estimator: ψ̂_Γ = ⟨Γ,Θ̂⟩ + (1/n)Σ_i s(Y_i,η̂_i)⟨Ĥ_Γ, X_i⟩, s(y,η) = y−σ(η).
- Joint asymptotic Gaussianity (Thm 4.1): sup_{B∈R_q}|Pr{√n(ψ̂−ψ) ∈ B} − Pr{Z_Γ ∈ B}| ≲ C_A√(d̄ log^c(nd̄)/n); Z_Γ ∼ N(0,Σ).
- Rank band (Thm 5.1): Pr{rk_t(m) ∈ R̂_t(m)} ≥ 1−α−o(1); Corollary 5.2 extends to all tasks simultaneously.
- **Stated assumptions:** (1) Θ⋆ exactly/approximately low rank, μ-incoherent, bounded entries; (2) sampling near-uniform (no task/pair asymptotically unobserved); (3) only P_T Γ is locally identifiable (tangent-space restriction); (4) Gaussian-approximation regularity for the multiplier bootstrap (Appendix E); (5) cross-fitting for the debiased estimator; (6) **auxiliary-sample initializer** (A.6): the convex initializer (nuclear-norm penalized BTL) is computed on a separate auxiliary sample of size n_aux ≍ n, then three-split row/column refinement upgrades Frobenius accuracy to the entrywise rate — sample splitting is load-bearing, not a technicality; (7) **signal strength** (A.7): ‖Θ⋆‖_F ≥ c_sig√d⋆ (smallest singular value σ_r⋆ ≍ √d⋆, so spectral SNR scales as √d⋆ against O(1) BTL noise) — weak-signal regimes break the guarantees.

## 5. Features / target
- **Inputs:** sparse binary pairwise comparisons indexed by (task, model pair). No covariates — pure latent-matrix model.
- **Targets:** entrywise task×model scores; task-wise top-K sets; per-(task,model) rank confidence bands; three-way top-K membership decisions.

## 6. Validation design
- **Synthetic:** estimation error decay vs n (log–log vs 1/√n reference); per-task top-K Hamming (K ∈ {5,10}); two-contrast joint Gaussianity check (empirical vs plug-in covariance, 95% ellipse coverage over N=500 trials); single-task rank CI (coverage, certification rate, width at n=16,000); simultaneous rank CI across all 50 tasks (n=32,000).
- **LM Arena:** top-K Hamming sweep over f; single-task rank CI for gemini-2.5-pro on math (true rank 1); simultaneous rank CI for gemini-2.5-pro across all 10 tasks.
- Baseline throughout: **per-task BTL** (independent fit per column + analogous Wald multiplier bootstrap).

## 7. Numerical results / baselines
- **Estimation:** joint estimator tracks 1/√n rate; at n = 4,000 per-task BTL Frobenius error exceeds **1000** — nearly two orders of magnitude above the joint estimator (largest gap at sparsest n).
- **Table 1 (top-K Hamming, mean over 50 tasks):** K=5 — joint 0.482/0.339/0.237/0.167 vs per-task BTL 0.730/0.617/0.479/0.360 (n = 4k/8k/16k/32k). K=10 — joint 0.388/0.257/0.181/0.129 vs 0.596/0.489/0.366/0.269. Joint uniformly better; gap shrinks with n.
- **Table 3 (single-task rank CI, n=16,000, K_top=10):** joint coverage **1.000**, correct-certification rate **0.289**, mean width 36.7; per-task BTL 0.967 / **0.081** / 44.6 (each task has only ~320 comparisons — too sparse for per-task inference).
- **Table 4 (simultaneous across 50 tasks, n=32,000):** joint resolves **0.315** (5× per-task BTL's 0.056), width 31.3 vs 46.4, both at nominal coverage.
- **Table 2 (Gaussianity):** ρ_emp = 0.365 vs ρ_thy = 0.443; 95% ellipse achieves 0.950 coverage (target 0.95).
- **Table 5 (Arena top-K Hamming):** f=0.02: joint 0.577/0.411 vs BTL 0.654/0.477; f=0.10: 0.364/0.251 vs 0.427/0.296; f=0.50: 0.221/0.144 vs **0.198/0.134** — crossover: at dense data per-task BTL slightly wins (rank-3 approximation becomes the binding constraint).
- **Table 6 (gemini-2.5-pro, math, true rank 1):** f=0.20: joint certifies top-10 on **22%** of trials (width 15.9) vs BTL **0%** (21.6); f=1.0: both 100%, widths 7.4 vs 6.1.
- **Table 7 (simultaneous, 10 tasks):** f=1.0: joint resolves **0.866** (width 6.7) vs BTL 0.610 (9.1). On the *analytical* task, per-task BTL **never** certifies top-10 at any f; joint certifies on **every trial** at f=1.

## 8. Code / data availability
No code released. Full algorithmic specification in §§3–5 + appendices. Arena 140K dataset is public (Hugging Face). Synthetic setup fully specified.

## 9. Leakage & limitations
- **Arena "ground truth" is itself an estimator:** T⋆ = full-data per-task BTL MLE — the paper measures recovery of a *model fit*, not of an external truth; the f=1.0 BTL row is omitted precisely because it coincides with ground truth.
- **Rank must be chosen:** r = 3 selected from the empirical singular spectrum (>94% energy) — a heuristic; the f=0.50 crossover (BTL beating joint) shows misspecified/low rank becomes the binding constraint at dense data.
- **Near-uniform sampling assumed:** real platforms (and GSE) have highly non-uniform comparison traffic; theory's c_ν, c_π bounds may not hold.
- **Data splitting costs:** the entrywise guarantee needs n_aux ≍ n held out for the convex initializer plus further three-way splits for refinement — in a GSE port with ~272 regular-season games, the effective sample for the final estimator is a fraction of an already-small n.
- **Signal-strength floor (A.7):** guarantees require ‖Θ⋆‖_F ≥ c_sig√d⋆; in high-parity regimes (teams bunched, weak spectral signal) the bounds are vacuous even if rank is low.
- **Computational cost:** nuclear-norm penalized BTL + alternating-minimization refinement + cross-fitted one-step + multiplier bootstrap over d_t(d_m−1) statistics — heavy; no runtime numbers reported.
- **Consistency/binarity:** observations are binary preferences; GSE's outcomes (margins, totals) are richer — the framework would need extension to non-binary outcomes (noted as future work direction in spirit).

## 10. GSE overlap
Per the existing-research map and prior ledgers: **low-rank / factor structure for team strength** — the map has factor-model-adjacent entries but no task×team low-rank BT formulation; **uncertainty quantification** — ledger 0540 (conformal intervals on ratings) and GSE's CQR calibration lane cover *score* intervals, but **nothing covers simultaneous rank confidence sets or three-way top-K certification**; the corpus has no debiased one-step / multiplier-bootstrap machinery for correlated ranking hypotheses. The paper's central complaint — "a point leaderboard cannot answer whether an apparent top-K difference is significant" — applies verbatim to GSE's published pick sheets and power ratings. Verdict: **extension** — new estimation structure (low-rank across contexts) + new UQ output (certified/unresolved pick tiers) on top of GSE's existing ranking machinery.

## 11. GSE implementation spec
1. **Context-specific team strength matrix with low-rank sharing.** Port: rows = game contexts (e.g., 8 clusters from spread/total/rest/dome/divisional, or per-week slices), columns = 32 teams, "comparisons" = game outcomes (BTL on score differences). Fit the nuclear-norm + refinement estimator; read off context-specific power ratings that borrow strength across contexts — directly addressing GSE's early-season sparsity (cf. ledger 0544's phantom-player approach, which this would complement or replace). Data: nflverse 2015–2025. Effort: ~2 weeks (estimator + refinement implementation).
2. **Three-way pick certification for the published sheet.** Port the §5 machinery: for each week's candidate picks, compute simultaneous rank confidence bands via multiplier bootstrap over correlated pick-return gaps; publish each pick as **certified top-K / certified non-top-K / unresolved** instead of a bare ordered list. This is the rigorous version of GSE's confidence tiers and directly answers "is this edge real or noise?". Effort: ~2 weeks (one-step debiasing + bootstrap on the existing margin model).

## 12. Reproducible test
- **Dataset:** nflverse 2020–2024; construct 8 game-context clusters; per-context team "comparisons" from SU outcomes.
- **Baseline:** independent per-context BTL ratings (the paper's per-task BTL analogue).
- **Protocol:** rolling-origin: fit on seasons 2020–2022, predict 2023; refit 2020–2023, predict 2024. Compare (a) next-season SU log-loss of low-rank context-specific ratings vs per-context BTL; (b) top-8 team-set Hamming recovery per context vs end-of-season SRS ordering; (c) rank-CI width and certification rate for the top-8. Expectation from the paper: low-rank wins decisively in sparse contexts (early-season weeks, small clusters), converges at dense data.

## 13. Acceptance / rejection gate
- **Adopt the low-rank context-rating estimator** if it beats per-context BTL on next-season SU log-loss by ≥ 0.003/game averaged over the 2023–2024 test seasons AND produces strictly narrower mean rank CIs at ≥ nominal coverage on a 2024 holdout. **Adopt three-way pick certification for publication** only if, on 2022–2024 backtests, "certified top-K" picks beat "unresolved" picks on ATS ROI by ≥ 2 percentage points (confirming the certification separates signal from noise). **Reject otherwise.** Gates stated before running; contexts (8 clusters), K (=8), and α (=0.05) fixed in advance.

## 14. Improvement experiment
The paper assumes binary outcomes; GSE observes *margins* (point differentials) and totals — strictly richer. Extend the framework to a **low-rank ordered-probit / margin model**: replace the BTL link with P(margin > s) = Φ((Θ_{t,m}−Θ_{t,m'}−s)/τ), keeping the same nuclear-norm + refinement + debiased one-step + multiplier-bootstrap pipeline (the Fisher operator I(η) generalizes to the ordinal case). Hypothesis: margin information tightens the K-gap resolution (Prop 3.2's 4ε_n boundary) because near-boundary teams are separated by *how much* they win, not just whether — potentially certifying top-K membership weeks earlier in the season than the binary version. This would be a genuine methodological advance over the paper, purpose-built for sports.
