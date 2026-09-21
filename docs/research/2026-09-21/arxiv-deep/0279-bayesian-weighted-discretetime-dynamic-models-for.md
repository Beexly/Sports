# [0279] Bayesian weighted discrete-time dynamic models for association football prediction (arXiv:2508.05891v1)

**Citation:** Macrì-Demartino, R., Egidi, L., & Torelli, N. (2025). *Bayesian weighted discrete-time dynamic models for association football prediction*. arXiv:2508.05891v1. URL: https://arxiv.org/abs/2508.05891v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 5519 lines).
**Verdict:** ADAPT — adaptive period-specific shrinkage via commensurate priors is worth porting as the time-weighting mechanism for GSE's NFL team-strength models; the soccer goal-count likelihood itself does not transfer.

## 1. Research question
Can a Bayesian dynamic goal-based model that adaptively weights how much attack and defence information to borrow from the previous period — via period-specific commensurate priors with spike-and-slab hyperpriors — outperform existing discrete-time dynamic models (Owen 2011; Egidi et al. 2018) in predicting association football match outcomes, especially after structural breaks like transfer windows or coaching changes?

## 2. Dataset / schema
- Source: football-data.co.uk (public).
- Three leagues × five seasons: German Bundesliga, English Premier League, Spanish La Liga, seasons 2020/2021 through 2024/2025.
- Each season split into two periods (first half / second half), yielding 10 discrete time periods per league.
- Rows: match-level goal counts (home goals, away goals) per match per period. Exact match counts not stated in paper; Bundesliga 306 matches/season × 5, EPL 380 × 5, La Liga 380 × 5.
- Prediction scenarios: entire second half, last three rounds, and last round of the 2024/2025 season.

## 3. Method / model
Six goal-based likelihoods are each fitted with three evolution (dynamic-prior) variants: the proposed weighted-dynamic, Owen (2011) single constant evolution precision, and Egidi et al. (2018) constant but attack/defence-specific precisions.
- Goal models: double Poisson (Maher 1982), bivariate Poisson (Karlis & Ntzoufras 2003), diagonally-inflated bivariate Poisson (Karlis & Ntzoufras 2009), negative binomial, Skellam (difference of goals), zero-inflated Skellam.
- Innovation: each team's attack and defence ability in period τ gets a normal prior centred on its ability in period τ−1 with period- and ability-type-specific precision φ_att,τ and φ_def,τ (commensurate priors), each assigned a continuous spike-and-slab (half-normal mixture) hyperprior.
- Estimation: Stan MCMC, 4 chains × 2000 iterations, 1000 burn-in. Spike/slab settings: spike N⁺(100, 0.1), slab N⁺(0, 5), prior slab probability p_l = 0.99.
- Baselines: Owen 2011 with σ ~ Cauchy⁺(0,5) common precision; Egidi et al. 2018 with σ_att, σ_def ~ Cauchy⁺(0,5). Home effect ~ N(0,5). Zero-sum identifiability constraints on attack and defence effects within each period.

## 4. Equations & assumptions
Double Poisson rates (Eq. 2): log(λ_1,n) = β_0 + home + β^att_{h_n} + β^def_{a_n}; log(λ_2,n) = β_0 + β^att_{a_n} + β^def_{h_n}.
Owen (2011) evolution (Eq. 5): β^att_{i,τ} | β^att_{i,τ−1}, σ ~ N(β^att_{i,τ−1}, 1/σ); β^def_{i,τ} | β^def_{i,τ−1}, σ ~ N(β^def_{i,τ−1}, 1/σ).
Weighted dynamic prior (Eq. 10): β^att_{i,τ} | β^att_{i,τ−1}, φ_att,τ ~ N(β^att_{i,τ−1}, 1/φ_att,τ); β^def_{i,τ} | β^def_{i,τ−1}, φ_def,τ ~ N(β^def_{i,τ−1}, 1/φ_def,τ).
Spike-and-slab hyperprior (Eq. 11): φ_{k,τ} | μ_s, μ_l, ψ_s, ψ_l, p_l ~ N⁺(μ_s, ψ_s)(1−p_l) + N⁺(μ_l, ψ_l) p_l, with μ_s=100, ψ_s=0.1, μ_l=0, ψ_l=5, p_l=0.99 (i.e., φ_att,τ, φ_def,τ | p_l ~ N⁺(100,0.1)(1−p_l) + N⁺(0,5)p_l).
Brier score: Brier = (1/M) Σ_m Σ_{r=1..3} (p_{r,m} − δ_{r,m})². ACP = (1/M) Σ_m p_{o,m}. RPS = 1/(3−1) Σ_{r=1..2} (Σ_{l≤r} p_{l,m} − Σ_{l≤r} δ_{l,m})². Pseudo-R² = (Π_m p_{o,m})^{1/M}.
Stated assumptions: conditional independence of goal counts given abilities (in DP/Skellam); periods exchangeable conditional on evolution; p_l = 0.99 fixed; zero-sum constraints within periods (Eq. 7); covariance parameter λ_3,n constant (not dynamic) in bivariate Poisson variants.

## 5. Features / target
- Features: none besides team identities, period index, and home/away indicator — abilities are latent. No covariates (market value, injuries, xG/shots) used; paper notes this as a future direction.
- Target: full bivariate goal counts (x, y) for prediction scenarios; three-way match outcome probabilities (home win/draw/away win) derived from the goal predictive distribution.

## 6. Validation design
- Training: seasons 2020/21 through first half of 2024/25 (9 periods), refit per scenario; predictions are genuine out-of-sample forecasts for (a) entire second half, (b) last three rounds, (c) final round of 2024/25 season.
- Baselines: Owen (2011) constant precision; Egidi et al. (2018) attack/defence-specific constant precision.
- Metrics: Brier score, Average of Correct Probabilities (ACP), Ranked Probability Score, pseudo-R² — all proper/distance-sensitive scoring rules.
- Convergence: Gelman–Rubin R̂ ≈ 1.00, large bulk/tail ESS verified for all scenarios.

## 7. Numerical results / baselines
All paper claims; best-per-league figures quoted below (scenario-specific):
- Final-round 2024/25 (Figure 1): Bundesliga BP — Brier 0.593, ACP 0.409 (weighted dynamic best). EPL — Skellam Brier 0.545; DIBP ACP 0.449. La Liga — DIBP Brier 0.462, ACP 0.485.
- Last-three-rounds scenario (Table 1): Bundesliga BP — weighted dynamic Brier 0.678 vs Egidi 0.683 vs Owen 0.687; ACP 0.359 (best). EPL DIBP — Brier 0.602, ACP 0.421 (best). La Liga DIBP — Brier 0.499, ACP 0.454 (best).
- Second-half scenario (Table 2): Bundesliga BP — Brier 0.661, ACP 0.387. EPL BP — Brier 0.579; DIBP ACP 0.429. La Liga DIBP — Brier 0.583, ACP 0.425.
- Appendix (Table 3): Bundesliga BP last-three RPS 0.216 vs Egidi 0.217; pseudo-R² 0.328. La Liga DIBP last-three RPS 0.189, pseudo-R² 0.421.
- Computation (Appendix C): weighted dynamic consistently fastest to convergence; EPL zero-inflated Skellam 32% faster than Owen, 55% faster than Egidi; Bundesliga DP ~32% faster than Owen, ~31% faster than Egidi; La Liga NB 40% faster than both. R̂ ≈ 1.00 with bulk ESS typically 3000–5000.
- Note: gains over baselines are consistent but modest (Brier deltas ~0.002–0.02).

## 8. Code / data availability
- Data: football-data.co.uk (public). Reproduction code: https://github.com/RoMaD-96/BayesWDFM. Method implemented in the open-source R package footBayes (≥ v2.1.0). Analyses run in R 4.4.3 on an i7-1260P/16GB laptop.

## 9. Leakage & limitations
- Effect sizes are small: most Brier/ACP improvements over constant-precision baselines are in the 3rd decimal — real but marginal; no betting simulation or CLV/ROI analysis, so predictive-skill ≠ betting edge.
- Soccer-only validation; NFL transfer path exists in principle (strengths evolve; injuries/mid-season regime changes) but is untested — paper's own extension suggestion.
- No covariates: uses only goals; ignoring shots/xG/market value/injuries discards known signal, and the half-season period granularity is coarse (10 periods).
- Fixed p_l = 0.99 and fixed spike/slab settings are not sensitivity-analysed; conclusions may depend on these hyperparameters.
- Overfitting risk on φ posterior interpretation: figures show plausible team trajectories (Girona, Man Utd) but these are post-hoc narratives, not pre-registered hypotheses.
- Comparisons are against weak baselines (Owen 2011 constant precision) rather than against state-of-the-art ML or bookmaker lines.

## 10. GSE overlap
Per the existing-research-map: GSE already covers Poisson, Dixon–Coles, Skellam, Bradley–Terry, dynamic Elo, Kalman filters, nested AR(1) team strength, and the state-space paper 1701.05976 (read in depth). The commensurate-prior spike-and-slab mechanism for adaptive borrowing across periods is NOT covered — this is an extension: a new adaptive-shrinkage device for time-varying strength models, distinct from the fixed random-walk variance in existing dynamic Elo/Kalman approaches. The 15-area ML brief lists state-space team strength as commissioned (results pending). Relevant repo anchor: AGENTS.md benchmark inventory (state-space/dynamics methods); gse-lab metric computation work (2026-09-17).

## 11. GSE implementation spec
- Port the φ (commensurate precision) machinery, not the soccer likelihood. Replace goal counts with an NFL-appropriate likelihood: bivariate-ish Poisson on team scores (points), or Skellam on margin with a totals component — GSE already computes EPA-based strengths, so the strength parameter can be an EPA/play-derived latent or a directly-modelled team rating.
- Data: nflverse play-by-play 2014–2025 aggregated to weekly periods (17+ game weeks × seasons — far more periods than the paper's 10, so borrow priors pool more aggressively; consider hierarchical team-level p_l).
- Model: Bayesian hierarchical model in Stan/PyMC or numpyro with separate φ_att,τ, φ_def,τ per week; spike-and-slab as paper; home-field term; include rest-days, dome/outdoor covariates (repo has weather work).
- Training: fit weekly rolling with posterior predictive for moneyline/spread/total implied probabilities; compare vs bookmaker de-vigged lines via Brier/RPS/CLV.
- Serving: batch weekly refresh; cheap relative to current pipeline (paper shows 30–55% faster convergence than constant-variance Stan fits).
- Effort estimate: 3–5 days for a Stan prototype + 2–3 days for backtest harness.

## 12. Reproducible test
- Dataset: nflverse pbp 2020–2024, weekly team-level latent-strength fit; test window: 2025 NFL regular season weeks 1–17 (or through Week 3 available by test date).
- Metric: RPS on three-way moneyline outcomes vs bookmaker consensus; secondary: Brier on spread cover / total over-under as binary outcomes.
- Baselines: (a) GSE current engine probabilities, (b) constant-variance random-walk strength model (Owen-style).
- Pass bar (per §13 gate) decided before running; protocol: walk-forward weekly refit, no lookahead.

## 13. Acceptance / rejection gate
Adopt the commensurate-prior time-weighting if, on the 2025-season walk-forward test, the weighted-dynamic model's RPS beats BOTH baselines (GSE current + constant-variance RW) by ≥0.003 absolute AND its mean |edge vs de-vigged close| improves CLV hit-rate by ≥1.0 percentage point. If it fails either, reject the mechanism but keep the spike-and-slab shrinkage idea logged. REJECT the soccer goal-count likelihood entirely for NFL (margin/totals structure differs).

## 14. Improvement experiment
Team-specific hierarchical p_l: the paper uses a single p_l = 0.99 for all teams and periods. Give each team its own p_l with a hierarchical prior (volatile teams like injury-prone QBs' teams get higher slab probability), and make p_l an explicit function of observable regime-change signals (QB injury, head-coach change, bye week, rest differential). Expected gain: the borrowing adapts not just when the data disagree but *why* — letting the model pre-discount history before the scoreboard confirms a regime break, which is where the betting edge over slow bookmaker adjustments would live.
