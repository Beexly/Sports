# [0611] Hierarchical Bayesian Bradley-Terry for Applications in Major League Baseball (arXiv:1712.05879v1)

**Citation:** Gabriel C. Phelan and John T. Whelan (2017). *Hierarchical Bayesian Bradley-Terry for Applications in Major League Baseball*. arXiv:1712.05879v1. URL: https://arxiv.org/abs/1712.05879v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3027 lines).
**Verdict:** ADAPT — the hierarchical BT with a data-driven Gamma hyperprior on league parity (Eq. 22, trained on the prior season) is a clean, cheap regularization recipe for GSE's team ratings; port the hierarchy with the previous-season σ̂ as hyperprior and replace their ad-hoc MAP point estimate with full HMC, but do not copy the 162-game MLB framing — the early-season win is exactly where the NFL's 17-game schedule hurts most.

## 1. Research question
Can a hierarchical Bayesian Bradley–Terry model with a principled prior (satisfying Whelan's four desiderata: team-interchange, win/loss-interchange, team-elimination invariance, properness) beat plain MLE both for ranking MLB teams and for predicting rest-of-season records? The paper derives the hyperprior from the previous season's data, fits with Hamiltonian Monte Carlo in Stan, and tests predictive accuracy by training up to a partition date and predicting the remainder of the season.

## 2. Dataset / schema
- MLB seasons 2010–2017, head-to-head win matrices V_ij (30 teams, 162 games/team/season). Data from baseball-reference.com and retrosheet.org (2017 event files).
- Hyperprior for season t built from season t−1's MLE (Table 1: σ̂ ranges 0.235 (2014) to 0.316 (2012); √ς̂ ≈ 0.030–0.041).
- Prediction experiment: fit on games up to a partition date (Apr 15 … Sep 15), predict wins for the rest of the season; repeated across 2011–2017 (Fig. 4).
- Schema: V = N×N win matrix; λ_i = log-strengths; σ = league-wide spread hyperparameter.

## 3. Method / model
Full hierarchical model (Eq. 22): σ ~ Γ(2N, 2N/σ̂²) where σ̂² is the estimated variance of λ_i in the previous season; λ|σ ~ N(0, σ²I); V|λ ~ Bradley–Terry(exp{λ}). Fitted by HMC in Stan (RStan 2.14.1). The prior family I_N (separable Gaussian in log-strengths) is chosen over the Beta-based I_β via a maximum-entropy argument (Eq. 13), after proving the Beta prior maps to a type-III generalized logistic GL(1,η,η) in λ-space with E=0, V=2ψ′(η) (Eq. 11; η=1 ≈ Gaussian-like prior with variance ≈ 3.3). Hyperprior construction: approximate MAP expansion → point estimate σ̂ = √(Σλ̂_i²/N) (Eq. 18) with variance ς̂ = σ̂²/(2N) (Eq. 21, block-diagonal approximation), then Gamma(shape,rate) with matched mean/variance. Predictions from the posterior predictive distribution p(Ṽ|V) = ∫ p(Ṽ|λ)p(λ|V)dλ (Eq. 23); point prediction E[Ṽ|V]. MLE comparison uses Ford's iterative algorithm (Eq. 17).

## 4. Equations & assumptions
BT likelihood (Eq. 1): P(i beats j) = π_i/(π_i+π_j); λ_i = log π_i. (Eq. 12): p(V|λ) ∝ ∏_{i,j} (e^{λ_i}/(e^{λ_i}+e^{λ_j}))^{V_ij}.
Desiderata priors: I_N: λ_i ~ N(0,σ²) (Eq. 3); I_β: ζ_i ~ β(η,η), ζ_i = π_i/(1+π_i) (Eq. 4) → p(λ_i|I_β) ∝ [e^{λ_i}/(1+e^{λ_i})²]^η, GL_3(η) (Eq. 8); GL(φ,η,γ) moments (Eq. 10): E = (1/φ)[ψ(γ)−ψ(η)], V = (1/φ²)[ψ′(γ)+ψ′(η)].
Log-posterior for MAP (Eq. 14): ℓ = Σ_i {Σ_j V_ij[λ_i − log(e^{λ_i}+e^{λ_j})] − λ_i²/(2σ²)} − N log σ + const.
MAP equations (Eq. 16–18): σ̂ = √(Σλ̂_i²/N); λ̂_i = log{(V_i − λ̂_i/σ̂²)/Σ_j(n_ij/[e^{λ̂_i}+e^{λ̂_j}])}; σ̂ ≈ √(Σ(λ̂_i^{MLE})²/N) with Σλ̂_i^{MLE} = 0.
Full model (Eq. 22): σ ~ Γ(2N, 2N/σ̂²); λ|σ ~ N(0,σ²I); V|λ ~ BT(exp{λ}).
Error metrics (Eq. 24–26): error_i^{Bayes} = |E[Ṽ_i^{test}|V_i^{train}] − V_i^{test}| (vs MLE analog); means and sds over teams.
Assumptions: 30 teams throughout; each team's games large vs λ̂_i/σ̂² (justifies the MLE-for-MAP substitution, Eq. 17→18); no home-field term; head-to-head records are a sufficient statistic; hyperprior from previous season only (no same-season data reuse).

## 5. Features / target
- Features: none beyond the head-to-head win matrix V (deliberately — "teams be evaluated only based on their performance against one another").
- Target: (a) ranking via E[λ_i|V]; (b) rest-of-season win totals. Horizon: from partition date to end of season.
- Baseline: MLE Bradley–Terry via Ford's iterative algorithm, predictions from plug-in λ̂^{MLE}.

## 6. Validation design
Time-ordered within-season splits: train on games up to partition dates Apr 15 … Sep 15, predict remaining wins; per-team absolute win error averaged over 30 teams, plus sds; 2017 table plus 2011–2017 averages (Fig. 4). No tuning set leakage: hyperprior always from the previous season. Rankings compared to actual win totals (Tables 3–4).

## 7. Numerical results / baselines
- 2017 prediction errors (Table 5, mean absolute win error; sd): Apr 15 — Bayes 8.82 (6.58) vs MLE 24.65 (17.34); May 1 — 7.31 (6.17) vs 12.49 (10.39); May 15 — 6.20 (5.68) vs 9.84 (5.84); Jun 1 — 4.72 (4.87) vs 6.90 (4.27); Jun 15 — 4.32 (4.65) vs 4.81 (4.79); Jul 1 — 4.04 (3.46) vs 4.17 (3.43); then essentially tied (Aug 1: 3.58 vs 3.89; Sep 15: 1.75 vs 1.83).
- Claim: Bayes beats MLE "significantly better during the first half of the season," converges after ~July; averaged over 2011–2017 (Fig. 4) Bayes matches or beats MLE for the entire season in both error and variability.
- Rankings: Bayesian E[λ|V] ordering (LAN 0.38, CLE 0.35, HOU 0.35) vs MLE (CLE 0.52, HOU 0.51, LAN 0.50) — Bayes shrinks toward actual records; prior acts as regularizer preventing overfitting.
- MLE pathologies (0/1/undetermined probabilities) avoided by construction.

## 8. Code / data availability
None stated. Computations in R and Stan (RStan 2.14.1); data from baseball-reference.com and retrosheet.org (public, re-scrapable). The Stan model is described but not published — the equations suffice to reimplement.

## 9. Leakage & limitations
- Clean design: previous-season hyperprior, time-ordered partitions, no same-season tuning. 
- The early-season Bayesian win relies on 162-game seasons and the "V_i large vs λ̂/σ̂²" assumption — in the NFL's 17-game schedule that approximation is much weaker and the shrinkage prior dominates, risking over-smoothing exactly when signal matters.
- The league-parity hyperprior (σ̂ ≈ 0.24–0.32 in MLB log-strength units) is estimated from a full previous season; NFL parity regime shifts (e.g., post-2020 offensive explosion) would make a stale prior actively harmful — needs a recency-weighted or multi-season estimate.
- No home field, no strength-of-schedule beyond head-to-head — fine for balanced MLB, poor for NFL's unbalanced 17-game slate; the desiderata framing forbids team-specific terms but GSE needs them.
- MLE baseline is a weak comparator (no regularization at all); beating unregularized MLE early-season is expected, not a breakthrough. No comparison vs Elo/Glicko/Colley-Massey.
- MLB-specific: 30 teams, near-round-robin-ish balance, no ties — transfer to NFL needs schedule-structure handling.

## 10. GSE overlap
The corpus already has: Bradley–Terry (inventoried), Massey/Sagarin/Colley ratings, Elo, Glicko (mentioned), TrueSkill (mentioned), Bayesian state-space team strength (1701.05976), conformal/uncertainty work. None of them use a hierarchical Bayesian BT with an empirically-derived parity hyperprior — **new capability / extension**: the paper's exact recipe (previous-season σ̂ → Γ(2N, 2N/σ̂²) hyperprior → Stan HMC → posterior-predictive win totals) slots directly into GSE's ratings layer as a regularized alternative to the current Elo, and the early-season shrinkage finding is directly relevant to GSE's Week 1–6 forecasts where Garrett's engine is thinnest.

## 11. GSE implementation spec
- Data: nflverse 2002–2026 games; per-season head-to-head win matrices for 32 teams (treat ties as half-wins, or drop — document choice).
- Model: copy Eq. 22 verbatim: σ ~ Γ(64, 64/σ̂²) (N=32) with σ̂² from previous season's MLE log-strengths; λ|σ ~ N(0,σ²I) plus a home-field offset τ (addition to the paper — needed for NFL; estimate with weakly informative prior N(0,1)); HMC via cmdstanpy. Weekly refits within season: hyperprior from previous season stays fixed, λ updated with games to date (the paper's exact partition protocol).
- Outputs: posterior mean log-strengths (ratings), posterior-predictive win probabilities per game (integrate over λ uncertainty — this is the calibration edge over plug-in Elo), posterior sd as a rating-uncertainty feed for Kelly sizing.
- Effort: 2–3 days (Stan model ~40 lines; data plumbing from nflverse; validation harness reusing the paper's partition scheme).

## 12. Reproducible test
Dataset: NFL 2015–2025, partition dates at Weeks 2, 4, 6, 8, 10, 13, 16 (NFL analog of Apr15…Sep15); train on games ≤ partition, predict remaining games' outcomes. Metric: log loss per game (primary) + Brier; report mean and sd across teams like Eq. 25–26. Baselines: GSE's current dynamic Elo (plug-in probabilities) and raw win% — the paper's MLE analog.

## 13. Acceptance / rejection gate
Adopt hierarchical BT as GSE's ratings backbone iff on 2015–2025 walk-forward partitions: (a) log loss beats dynamic Elo by ≥ 0.003 averaged over Weeks 2–8 partitions (the paper's early-season window where shrinkage matters); AND (b) log loss is no worse than Elo (within 0.001) at Weeks 13–16 partitions (shrinkage must not hurt late season); AND (c) posterior-predictive probabilities are better calibrated than Elo plug-in (reliability-diagram slope within [0.9,1.1]). If (a) fails, the NFL's 17-game schedule defeats the MLB result — reject and keep Elo.

## 14. Improvement experiment
The paper's hyperprior is a single previous season — fragile to parity regime shifts. Replace σ̂² with an exponentially-weighted multi-season estimate (half-life ~3 seasons) and, more ambitiously, learn a hierarchical prior over σ itself (σ ~ LogNormal(μ_σ, τ_σ) with league-level hyperparameters updated each season). Test whether the multi-season hyperprior beats the single-season one on log loss in transition years (2017, 2020, 2023). If the shrinkage strength itself is learnable, GSE gets a ratings model that auto-tightens in parity eras and auto-loosens in dynasty eras.
