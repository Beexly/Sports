# [1451] Inference in a generalized Bradley-Terry model for paired comparisons with covariates and a growing number of subjects (arXiv:2507.22472)

**Citation:** Ting Yan (2025). *Inference in a generalized Bradley-Terry model for paired comparisons with covariates and a growing number of subjects*. arXiv:2507.22472v1 [stat.ME]. URL: https://arxiv.org/abs/2507.22472
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 58 pages: main text sections 1–7 with all theorems/proofs, plus supplementary material A–E with supporting-lemma proofs — read via pdftotext).
**Verdict:** ADAPT — (a) adopt the covariate-Bradley–Terry model P(i beats j) = exp(βᵢ−βⱼ+Zᵢⱼₖᵀγ)/(1+exp(βᵢ−βⱼ+Zᵢⱼₖᵀγ)) as GSE's rating skeleton with explicit situational covariates (home/away, rest differential, travel, QB-status flags) instead of folding everything into team strengths — Figure 1 shows omitting a real covariate makes merit-estimation error *not shrink with n*; (b) adopt the bias-corrected estimator γ̂_bc = γ̂ − N^{−1/2}Σ̂⁻¹B̂ for any shared/global coefficients GSE fits jointly with team ratings (incidental-parameter bias is real and has a closed-form correction); (c) use the top-K exact-recovery gate Δ_K ≫ √(log n/n) (Corollary 1) as a principled "are the top teams actually separable?" check before publishing GSE power rankings; (d) use the two-step alternating MLE algorithm (Ford fixed-point for merits, Newton–Raphson for covariate coefficients) for GSE's weekly rating refit.

## Research question
In high-dimensional paired-comparison settings (number of teams n → ∞, comparisons per pair fixed), how do covariates (e.g., home-field advantage) affect estimation of team merits, and what are the consistency rates and asymptotic distributions of the joint MLE of merits β (growing dimension) and covariate coefficients γ (fixed dimension)?

## Method
**Covariate-BT model (CBTM):** P(i beats j | Zᵢⱼₖ, γ, βᵢ, βⱼ) = exp(βᵢ−βⱼ+Zᵢⱼₖᵀγ)/(1+exp(βᵢ−βⱼ+Zᵢⱼₖᵀγ)) (Eq. 1), with antisymmetry Zᵢⱼₖ = −Zⱼᵢₖ. Reduces to Agresti's home-field model when Zᵢⱼₖ = 1 (i home). n+1 subjects labeled 0..n, β₀ = 0 for identification, mᵢⱼ ≤ m* fixed. MLE from the score equations (2): dᵢ = ΣⱼΣₖμᵢⱼₖ(β,γ) and Σᵢ<ⱼΣₖaᵢⱼₖZᵢⱼₖ = Σᵢ<ⱼΣₖZᵢⱼₖμᵢⱼₖ(β,γ). Existence iff the sufficient statistic lies in the interior of its convex hull (Prop. 1); without covariates this is Ford's (1957) strong-connectivity condition. **Proof technique:** two-stage Newton–Kantorovich argument alternating between β|γ (score H_γ(β)=0, Eq. 4) and γ|β (profiled score Q, Eqs. 5–6), with the inverse Jacobian approximated by the Simons–Yao (1998) matrix S (Eq. 10), error O(1/(n²b₀³)) (Eq. 16). Computation: alternate Ford (1957) fixed-point for β with Newton–Raphson for γ (R's glm only for small n).

## Equations
- CBTM: P(i beats j) = exp(βᵢ−βⱼ+Zᵢⱼₖᵀγ)/(1+exp(βᵢ−βⱼ+Zᵢⱼₖᵀγ)) (Eq. 1)
- Score equations (2); profiled/concentrated score Q_c(γ) (Eq. 6)
- **Theorem 1:** ‖β̂−β*‖∞ = Oₚ(√(log n/n)), ‖γ̂−γ*‖₂ = Oₚ(√(log n)/n) — different rates
- **Theorem 2:** √N·cᵀ(γ̂−γ) →ᵈ N(Σ̄⁻¹B*, cᵀΣ̄c); bias B* (Eq. 12); bias-corrected γ̂_bc = γ̂ − N^{−1/2}Σ̂⁻¹B̂
- **Theorem 3:** fixed-k merit differences asymptotically normal, covariance = k×k block of S (Eq. 10); Var(β̂ᵢ) ≈ 1/vᵢᵢ + 1/v₀₀
- **Corollary 1:** top-K exactly recovered if separation Δ_K = β*_{K−1} − β*_K ≫ √(log n/n)
- **Theorem 4** (Erdős–Rényi G(n,qₙ), qₙ ≥ c₁log n/n, pₙ² = o(nqₙ/log n)): ‖β̂−β*‖∞ = Oₚ(√(log n/(nqₙ))), ‖γ̂−γ*‖₂ = Oₚ(√(pₙlog n/(nqₙ)))
- **Theorem 5** (fixed sparse graph, NFL-schedule-motivated): consistency/AN under τₙ path conditions

## Datasets
- **Simulations:** n ∈ {100, 200}, one comparison per pair, 2-dim covariates (Z₁ ∈ {−1,+1}, Z₂ ~ N(0,1)), γ* = (0.5, 0.5)ᵀ, βᵢ* = ic·log n/n with c ∈ {0, 0.05, 0.1, 0.2}, 5,000 replications.
- **Real data:** NBA 2018–19 regular season, 30 teams, 1,230 games (41 home/41 away each); covariate = home/away indicator.

## Exact results / baselines
- **Figure 1 (the money plot):** fitting plain BT while the truth has a covariate effect γ: the ℓ∞ merit error grows rapidly with γ and *does not decrease as n grows* — a permanent, non-vanishing bias. CBTM error stays small and shrinks. This is the paper's core practical message: omitting a real covariate corrupts every team's rating, and more data does not fix it.
- **Table 1:** 95% CI coverage for βᵢ−βⱼ near nominal (94–95%) when the merit range is controlled (c ≤ 0.05), but collapses for far-apart pairs under wide merit ranges — e.g., n=200, c=0.2, pair (0,100): coverage **13.00%**; pair (0,200): 14.60%. Controlling ‖β*‖∞ growth is necessary, not technical decoration.
- **Table 2:** γ coverage near 95% nominal; analytical bias correction moves coverage slightly closer to nominal (bias was small under balanced home/away design — B* ≈ oₚ(1) when covariates are centered, Remark 3).
- **NBA 2018–19:** γ̂ = 0.45 (SE 0.065), p = 2.1×10⁻¹² for home advantage — decisively significant. Merit ordering reproduced the playoff seeding in the East exactly; in the West it swapped the 7/8 seeds (Clippers vs Spurs) relative to NBA rules.
- Theory is minimax-consistent with Simons & Yao (1999) and Chen et al. (2020) in the no-covariate case (Remarks 1–2).

## Leakage assessment
Clean. Simulations are synthetic with known parameters; the NBA example is descriptive (in-sample fit, no prediction claims — no leakage possible). The design condition λ_min(Σ ZᵢⱼₖZᵢⱼₖᵀ) ≥ c₀n² (Condition 1) and compactness (Condition 2) are stated as assumptions, with simulations probing their violation (the c = 0.2 coverage collapse).

## GSE overlap / corpus position
- Builds directly on [1449] (LS paired comparisons) and [1450] (ridge BT): this paper says *what to put inside* the likelihood (situational covariates) and what goes wrong when you don't. GSE's rating likelihood should be CBTM with γ covering home field, rest days, travel distance, and QB-status — not plain BT.
- The incidental-parameter bias (Theorem 2) is a warning for GSE's market-effect coefficients: any global coefficient estimated jointly with 32 team strengths inherits bias unless corrected with the paper's closed-form correction.
- Corollary 1's top-K gate complements [1446]'s ordinal machinery: before publishing "top-5 power rankings," check separability.
- Fan et al. (2024) is the concurrent related work (individual-level covariates only); this paper's per-comparison covariates (Zᵢⱼₖ) are the strictly more general form GSE needs.

## Implementation plan (GSE)
1. Replace GSE's plain Bradley-Terry/Elo win-probability core with CBTM: βᵢ team merits + γ over [home indicator, rest-day differential, travel miles, starting-QB-change flag, dome/outdoor mismatch].
2. Weekly refit with the alternating algorithm: Ford fixed-point sweep for β given γ, Newton–Raphson for γ given β; warm-start from last week.
3. Report γ̂ with bias correction and standard errors; monitor the home-effect γ̂₁ as a market-relevant time series (if books shade home lines, γ̂₁ estimated from SU outcomes vs ATS outcomes diverges — a bias signal).
4. Add the Corollary-1 separability check to the rankings publisher: only assert "Team A > Team B" when the merit gap clears the √(log n/n)-scale threshold at 95% confidence.

## Reproducible test
Fit CBTM on NFL 2019–2023 with covariates [home, rest diff, travel, QB change]; compare out-of-sample log-loss vs plain BT and vs GSE's current rating on weeks 7–17 (train on weeks 1–6 + prior seasons). Confirm Figure-1 behavior: plain-BT merit error vs CBTM merit error as a function of fitted |γ|.

## Numeric gate
On the NFL 2019–2023 walk-forward test, CBTM log-loss must beat plain BT by ≥ 0.01 and must not lose to GSE's current rating model; the home-effect coefficient must be significant (|γ̂₁|/SE > 3) in ≥ 4 of 5 seasons (else the covariate set is misspecified and the complexity is unjustified).

## Improvement experiment
The paper's fixed-dimension-γ theory breaks when many covariates are used (Theorem 4: rate degrades as √(pₙlog n/(nqₙ))). GSE-relevant experiment: **penalized CBTM** — add an ℓ₁/ℓ₂ penalty on γ (not β) and select the situational covariate set by cross-validated log-loss over ~15 candidate covariates; test whether penalized-CBTM beats fixed-covariate CBTM on 2022–2023 holdout. Secondary: time-varying γ_t (home advantage is shrinking league-wide per public research) via rolling-window refits — test for a trend in γ̂₁(t).
