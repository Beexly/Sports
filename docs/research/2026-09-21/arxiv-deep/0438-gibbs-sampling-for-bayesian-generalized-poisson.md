# [0438] Gibbs Sampling for Bayesian Generalized Poisson Matrix Factorization (arXiv:2609.12468v1)

**Citation:** Sakaori & Abe (2026). *Gibbs Sampling for Bayesian Generalized Poisson Matrix Factorization.* arXiv:2609.12468v1. URL: https://arxiv.org/abs/2609.12468v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1126 lines).
**Verdict:** REJECT — pure statistical-methodology paper (Bayesian NMF for overdispersed counts) with no demonstrated sports-prediction mechanism; its soccer application is descriptive latent-factor extraction, not forecasting. No GSE transfer path beyond a speculative latent-factor note.

## 1. Research question
Can Generalized Poisson Matrix Factorization (GPMF) — NMF for overdispersed count data — be extended to a fully Bayesian framework with closed-form Gibbs updates, yielding posterior uncertainty quantification that the MLE version (Ohashi et al. 2026) lacks?

## 2. Dataset / schema
- Simulations: 50×100 count matrices, K=5 latent factors, W₀,H₀ ∼ Gamma(1.5,1.5), y_ij ∼ GP((1−ξ₀ᵢ)s₀ᵢⱼ, ξ₀ᵢ); ξ₀ ∈ {1/5, 1/3, 1/2, 3/5, 2/3} plus a heterogeneous row-varying setting; 100 replications.
- Real data: StatsBomb open event data, 2015–16 English Premier League; 20×38 matrix of gegenpressing counts (Pressure within 5s of losing possession) per team per matchweek.

## 3. Method / model
Hierarchical Bayesian GPMF: latent n_ijk | w_ik,h_jk,ξ_i ∼ Poisson((1−ξ_i)w_ik h_jk); y_ij | n_ij,ξ_i ∼ Borel–Tanner(n_ij, ξ_i) (compound-Poisson representation of GP via Finner et al. 2015). Priors: w_ik, h_jk ∼ Gamma; ξ_i ∼ EBeta(α_ξ,β_ξ,γ_ξ) (exponentially tilted beta = Esscher transform of beta). Gibbs updates in closed form: W,H Gamma; ξ EBeta (Prop 4); n_ij −1 ∼ Binomial(y_ij−1, (1−ξ_i)s_ij/((1−ξ_i)s_ij + ξ_i y_ij)) (Prop 5); factor allocation multinomial via Poisson splitting (Prop 6). Novel contribution: infinite-mixture representation of EBeta as mixture of Beta(α, β+m) (γ≥0) or Beta(α+m, β) (γ<0) with recursive weights w_{m+1} = (β+m)γ/((α+β+m)(m+1))·w_m, truncated at M=200 (machine-precision accuracy even at γ=100) — cheaper than SIR.

## 4. Equations & assumptions
- GP pmf: p(y) = η(η+ξy)^{y−1} exp(−(η+ξy))/y!; restricted to 0<ξ<1 (overdispersion only; underdispersion/truncation cases excluded).
- GPMF mean/variance: E[y_ij]=s_ij, V=s_ij(1+θ_i)² (θ-param) or s_ij/(1−ξ_i)² (ξ-param).
- EBeta pdf: p(ξ) = ξ^{α−1}(1−ξ)^{β−1}exp(−γξ) / [B(α,β)·₁F₁(α;α+β;−γ)].
- Gibbs order: n_ij → (n_ij1..K) → W → H → ξ.
- Assumed: entries conditionally independent given factors; K known (no factor selection — listed as future work); ξ_i row-specific (team-level dispersion).

## 5. Features / target
Inputs: count matrix Y (teams × matchweeks). Target: posterior of latent factors (W: team loadings, H: temporal patterns) and row-wise overdispersion ξ_i. Descriptive, not predictive — no held-out forecasting of future counts.

## 6. Validation design
Simulations only: MSE of W,H,S,ξ vs GPMF (NNDSVD and random inits); empirical coverage of 95% credible intervals for S and ξ (100 reps); ESS/trace/ACF diagnostics for ξ chains; SIR vs finite-mixture comparison (time, MSE, coverage). Real-data: single EPL season, qualitative interpretation of factors. No out-of-sample prediction test on the soccer data; no comparison to any sports-forecasting baseline.

## 7. Numerical results / baselines
- Bayesian GPMF beats GPMF-MLE on MSE in all settings; gains grow with dispersion (e.g., ξ=2/3: W-MSE 84.1 vs 251 random-init / 335 NNDSVD; S-MSE 2.66 vs 7.61).
- 95% credible-interval coverage: S ≈ 0.954–0.966; ξ ≈ 0.934–0.953 — near nominal.
- Finite mixture (M=200) matches SIR(L=1000) accuracy with less compute (4706s vs 6202s on M5 MacBook); better ξ coverage (0.948 vs 0.941).
- EPL application: Factor 1 = league-wide pressing baseline (stable over season); Factors 2–3 = team-specific tactical signatures (peaks in congested fixture periods, matchweeks 20/25/28/29); ξ largest for Watford/Swansea/Chelsea/Spurs (volatile pressing), smallest for Leicester (stable).
- No predictive accuracy numbers for any sports outcome.

## 8. Code / data availability
No code link stated. Data: StatsBomb open EPL 2015–16 event data (public). Method references Ohashi et al. 2026 (GPMF, Computational Statistics).

## 9. Leakage & limitations
Adversarial read: (1) No predictive task whatsoever — the soccer application is retrospective description; nothing here predicts match outcomes, scores, or anything GSE bets on. (2) K fixed and known in simulations; no factor-selection on real data (K choice unexplained for the EPL matrix). (3) Simulations are congenial (data generated from the fitted model family) — MSE wins over MLE are expected, not informative about misspecification. (4) 5,000–10,000 Gibbs iterations on a 20×38 matrix; scaling to GSE-relevant dimensions untested (authors list faster inference as future work). (5) Row-specific dispersion ξ_i conflates team volatility with model misspecification. (6) The paper is a statistics-methods contribution (stat.ME), published 2026-09-11 — six days before this ledger; zero track record of applied use. (7) Even the descriptive findings (Leicester pressed stably in 2015-16) are post-hoc narratives without validation.

## 10. GSE overlap
No overlap with any existing-research-map lane: the map has no matrix-factorization, topic-modeling, or latent-factor lane for count data. The nearest conceptual neighbors are team-strength hierarchical models and the nflWAR attribution work, but neither uses NMF-style factorization. The paper's only sports content is soccer pressing counts. Status: **no overlap** — genuinely new method family, but without a demonstrated prediction use case it does not earn a lane.

## 11. GSE implementation spec
Speculative only (no adoption recommended): IF GSE ever wants latent-factor structure on overdispersed count matrices (e.g., teams × play-type call counts, teams × personnel-grouping frequencies, or defense × route-type target counts), Bayesian GPMF provides uncertainty-quantified factors with row-wise dispersion. Implementation would be: build a team×situation count matrix from nflverse 2020–2025, fit BGPMF with K selected by held-out likelihood, inspect W for team style clusters. Estimated effort: 2–3 days for a pilot. Not recommended ahead of the higher-EV items in ledgers 0429–0437.

## 12. Reproducible test
Dataset: nflverse 2020–2025; matrix = teams (32) × offensive play-type × down buckets (count data). Metric: held-out Poisson/GP log-likelihood of BGPMF vs plain Poisson NMF vs team fixed effects; qualitative check whether W factors recover known coaching-tree/style clusters. Test: BGPMF must beat Poisson NMF on held-out log-likelihood AND its factors must predict next-season play-type tendencies (correlation of H-projected factors with next-year counts) — description without prediction is insufficient.

## 13. Acceptance / rejection gate
REJECT for GSE adoption: the paper offers no prediction mechanism, no sports forecasting result, and no lane in the existing research map that needs it. Revisit only if a concrete GSE use case for uncertainty-quantified factorization of count matrices emerges (e.g., opponent tendency modeling with credible intervals) AND the pilot test in §12 shows predictive lift over fixed-effects baselines.

## 14. Improvement experiment
If ever revisited: (1) replace Gibbs with variational inference for scale (the authors' own future work); (2) automatic K selection via held-out likelihood or nonparametric prior; (3) tensor extension (team × situation × season) for tendency evolution; (4) couple the latent factors to a downstream win-probability or EPA model so the factorization serves prediction rather than description — the missing link that would make this paper relevant to GSE.
