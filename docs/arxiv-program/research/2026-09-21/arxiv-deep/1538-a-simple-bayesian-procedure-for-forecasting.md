# [1538] A simple Bayesian procedure for forecasting the outcomes of the UEFA Champions League matches (arXiv:1501.05831)

**Citation:** Jean-Louis Foulley (2015). *A simple Bayesian procedure for forecasting the outcomes of the UEFA Champions League matches*. arXiv:1501.05831. URL: https://arxiv.org/abs/1501.05831
**Ledger completed:** 2026-09-21. **Read:** full text (pdftotext of PDF).
**Verdict:** ADAPT — a cumulative-probit team-strength model whose priors regress on an external rating and are recursively updated season-to-season, plus a Dirichlet-multinomial mechanism for blending expert (odds-setter) views, is directly portable to GSE's engine rating layer: anchor team strengths on market-implied ratings, roll posteriors forward as next season's priors, and blend analyst/market views via implicit-data weights.

## 1. Research question
Can a deliberately simple Bayesian cumulative-probit (Glenn–David) model forecast UEFA Champions League match outcomes (win/draw/loss) for the group and knock-out stages, where team strength is a Gaussian random effect whose mean is a linear regression on an external rating (UEFACR or FCWR), and where priors are updated each season from the previous season's posteriors? Demonstrated on the 2013–14 UCL season.

## 2. Dataset / schema
2013–14 UEFA Champions League: 32 teams in 8 groups (Table 1 pots/UEFA coefficients; Table 2 group assignments with UEFACR and FCWR values at end of August 2013). Match outcomes (win/draw/loss) for group stage (96 matches) plus knock-out rounds; 2012–13 season results used only to calibrate priors. External ratings: UEFA Club Ranking (5-year UEFA competition history) and Football Club World Ranking (52-week weighted, national + international), correlated r = 0.807 [0.628, 0.905]. Access: ratings public; match outcomes public; no code repo.

## 3. Method / model
Latent cumulative probit: P(home win) = Φ-survival(d − Ds − h) etc., with cut-off d, home effect h, strength difference Ds = s_i − s_j. Hierarchical Bayes: X_ij|θ ~ Cat(Π_ij) (4); s_i|η_i, σ_s² ~ iid N(η_i, σ_s²) (5); d ~ N(d_0, σ_d²) (6); h ~ N(h_0, σ_h²) (7); η_i = β x_i with β ~ N(β_0, σ_β²) (8), x_i the standardized external rating; log σ_s = γ_s ~ N(γ_0, σ_γ²) (9, lognormal SD per Barnard et al.). Priors for d, h, β, γ_s refreshed each season from the previous season's posteriors — recursive Bayesian learning. Fit by Gibbs sampling in WinBUGS/OpenBUGS. Prediction via posterior predictive distribution; efficiency by Brier score (posterior-expectation form, Eq. 10) and Accuracy/exact-forecasting-rate (Eq. 11). Expert views blended as implicit Dirichlet-multinomial data: l(m) = Σ_k a_{m,k} log p_{m,k}, a_{m,k} = w_m p^ex_{m,k} − 1 (12), demonstrated on Bayern–Real Madrid semifinal 2nd leg with weights 10/20/50/200.

## 4. Equations & assumptions
- p_ij,1 = Pr(Z_ij > d) (1a); p_ij,2 = Pr(−d ≤ Z_ij ≤ d) (1b); p_ij,3 = Pr(Z_ij < −d) (1c); Z_ij ~ N(m_ij, 1).
- m_ij = Ds_ij + h; p_ij,1 = Φ̄(d − Ds_ij − h) (3a); p_ij,3 = Φ̄(d + Ds_ij + h) (3b); p_ij,2 = 1 − p_ij,1 − p_ij,3 (3c); Φ̄ = survival function.
- X_ij|θ ~ Cat(Π_ij) (4); s_i|η_i,σ_s² ~ N(η_i, σ_s²) (5); d ~ N(d_0,σ_d²) (6); h ~ N(h_0,σ_h²) (7); η_i = βx_i, β ~ N(β_0,σ_β²) (8); γ_s = log σ_s ~ N(γ_0,σ_γ²) (9).
- B_m = Σ_{k=1..3} [P_{m,k}(θ) − O_{m,k}]² (10), range 0–2; estimated as E(B_m|y_av).
- A_m = Pr(X_m^new = X_m^obs|θ) (11); A = mean over matches.
- l(m) = Σ_{k=1..3} a_{m,k} log p_{m,k} (12); a_{m,k} = w_m p^ex_{m,k} − 1.
Assumptions: strengths Gaussian and static within season (dynamics flagged as future work: Glickman–Stern, Coulom, Cattelan et al.); home effect constant; external rating enters only through prior mean; expert weights subjective.

## 5. Features / target
Inputs: team identities, home/away/neutral, external rating (UEFACR or FCWR, standardized). Target: ordered ternary outcome (win/draw/loss). Horizon: pre-match forecasts for group stage (using prior-season posteriors + current ratings) and knock-out rounds (adding observed rounds so far); finalists' ratings reproduced the actual 2014 final (RMA vs AMA ranked 1–2).

## 6. Validation design
Genuine pre-match forecasting: group-stage forecasts use only 2012–13 posteriors + August-2013 external ratings; knock-out forecasts add each completed round. Benchmarks: Zero adjustment (all teams equal a priori), UEFACR, FCWR. Metrics: Brier (posterior-expectation form) and Accuracy. External reference: Forrest et al. (2005) Brier 0.633 on English football.

## 7. Numerical results / baselines
Paper's reported numbers (quoted): overall (Group+Knockout) — Zero: Brier 0.685, Accuracy 38.3%; UEFACR: 0.595 / 43.3% (+13.1% accuracy); FCWR: 0.530 / 47.4% (+23.8% accuracy, +22.6% Brier). Group stage — Zero 0.695/37.7%, UEFACR 0.594/43.4% (+15.1%), FCWR 0.524/47.9% (+27.0%). Round of 16 — Zero 0.637/41.3%, UEFACR 0.531/45.9% (+11.1%), FCWR 0.476/51.2% (+24.0%). QF/SF/F — advantage vanishes (FCWR 0.635/38.7% vs Zero 0.667/38.7%). Priors (Table 3): δ ~ N(0.335, 1/300); h ~ N(0.225, 1/100); β: UEFACR N(0.250, 1/100), FCWR N(0.430, 1/120); γ: Zero N(−1.00, 1/5.79), UEFACR N(−1.13, 1/5.00), FCWR N(−2.00, 1/2.30). Posterior team ratings (Table 6): RMA 2.049 (SEP 0.968), AMA 1.964, PSG 1.226, BAR 1.223, BAY 1.037; Porto (Pot 1) ranked 24th, Marseille last at −1.967.

## 8. Code / data availability
WinBUGS/OpenBUGS implementation described; no code repository. Data (UCL results, UEFACR/FCWR ratings) public but no download links given.

## 9. Leakage & limitations
Adversarial notes: (1) Team strength static within season — the external-rating prior does the heavy lifting early; once ~10+ matches are observed the likelihood dominates and the external info adds nothing (QF onward). (2) The knock-out "forecasts" reuse the same season's group-stage data — honest but a small sample (29 knock-out matches). (3) Accuracy (argmax) is a weak proper criterion; Brier is the serious metric. (4) No comparison against odds-implied probabilities (the natural baseline; Forrest et al. cited only as a reference number). (5) The expert-blending weight w_m is hand-set (Table 7 sweeps 10–200) with no calibration of what weight is "right."

## 10. GSE overlap
Existing map: Glickman–Stern state-space NFL score model and Bradley-Terry-Davidson variants are inventoried; but no cumulative-probit outcome model with external-rating regression priors, no season-recursive prior updating discipline, and no Dirichlet-multinomial expert-blending mechanism exist in the corpus. GSE's engine already blends model + market; this paper supplies the Bayesian formalism for doing it.

## 11. GSE implementation spec
1. Replace win/draw/loss with NFL ordered outcomes where useful (e.g., cover/push/fail vs spread; over/push/under) using the same cumulative-probit skeleton: m_ij = (s_i − s_j) + h.
2. Prior mean of team strength = regression on a pre-season external rating: market-implied power ratings (e.g., from lookahead lines) or a composite — the paper's key empirical lesson is that a good external prior is worth ~24% accuracy early in the season when data are scarce.
3. Recursive updating: end-of-season posteriors become next pre-season's priors for d, h, β, γ_s — implement as the engine's off-season roll-forward.
4. Expert blending: encode analyst or odds-setter views as implicit Dirichlet-multinomial pseudo-data with a calibrated weight w_m; calibrate w_m on 2020–2024 by maximizing held-out log-likelihood.
5. Effort: ~3–5 days in Stan/PyMC on nflverse.

## 12. Reproducible test
Dataset: nflverse 2018–2025, pre-season external ratings (market-implied or composite), weekly expanding in-season fits. Metric: Brier on win probability and Accuracy vs a zero-prior model and vs GSE v5.2.7. Gate: external-rating prior must beat zero-prior Brier on weeks 1–8 (the paper's regime where priors matter); expert-blending must not hurt held-out Brier vs the pure model.

## 13. Acceptance / rejection gate
ADOPT the external-rating regression prior + recursive season roll-forward if, on 2025 weeks 1–8, it beats the zero-prior cumulative-probit on Brier by ≥5% (the paper's early-season effect); ADOPT the expert-blending module only if a calibrated w_m improves held-out Brier vs the model alone; REJECT the static-strength assumption for in-season use (the paper shows the prior's value decays as data accumulate — pair it with a dynamic extension like Glickman–Stern instead).

## 14. Improvement experiment
Beyond the paper: make team strength dynamic within season (random-walk state-space à la Glickman–Stern, which the author flags), re-estimate the external-rating regression coefficient β monthly to capture rating decay, and calibrate the expert weight w_m by cross-validation rather than hand-sweeping; test whether the dynamic version preserves the FCWR-style early-season edge into the playoffs where the static model's advantage vanished.
