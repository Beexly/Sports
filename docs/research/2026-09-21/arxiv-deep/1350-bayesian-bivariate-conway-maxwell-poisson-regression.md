# [1350] Bayesian Bivariate Conway-Maxwell-Poisson Regression Model for Correlated Count Data in Sports (arXiv:2409.17129v1)

**Citation:** Mauro Florez, Michele Guindani, Marina Vannucci (2024). *Bayesian Bivariate Conway-Maxwell-Poisson Regression Model for Correlated Count Data in Sports*. arXiv:2409.17129v1. URL: https://arxiv.org/abs/2409.17129v1
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF, 1128-line extraction; all sections read, appendices included). **Replaces:** ledger 1190 (REJECT).
**Verdict:** ADAPT

A Bayesian bivariate Conway-Maxwell-Poisson regression with team-level dispersion parameters and game-level correlated random effects, fit by Exchange-algorithm MCMC, that matches or beats Poisson and negative-binomial on DIC across over-, equi-, and under-dispersed sports count data — a flexible, code-backed count-modeling framework directly adaptable to GSE's totals and score-distribution modeling.

## 1. Research question
Can a bivariate Conway-Maxwell-Poisson (CMP) regression — with team- and venue-specific dispersion parameters and game-level correlated random effects — model sports count data (soccer goals, baseball runs) more robustly than Poisson or negative-binomial models across all dispersion regimes, and what does it reveal about home advantage before, during, and after COVID-19 crowd restrictions?

## 2. Dataset / schema
- **English Premier League**: **1,237 games**, 2019/20–2021/22 (football-data.co.uk). Home goals: mean **1.49**, variance **1.79**; away: mean **1.27**, variance **1.49**; dispersion statistic σ_p < 1.04 (near-equidispersed); Spearman home–away correlation **−0.143**.
- **MLB**: **5,756 games**, regular seasons 2019–2021 (retrosheet.org). Home runs: mean **4.72**, variance **10.24**; away: mean **4.63**, variance **11.01**; σ_p > 2.1 (strongly over-dispersed); Spearman correlation **0.004**.
- Simulations: 20 teams, 380 games/season, 40 replicates × 3 dispersion scenarios × 1/3/5 seasons.

## 3. Method / model
- **CMP with Guikema & Goffelt (2008) mean-parametrization**: P(Y=y|μ,ν) = (μ^y/y!)^ν / Z(μ,ν); ν<1 over-dispersed, ν>1 under-dispersed, ν=1 Poisson. E(Y) ≈ μ + 1/(2ν) − 1/2; Var(Y) ≈ μ/ν.
- **Bivariate regression**: log(μ_i1) = β_H + β^ω_{Hi} + β^δ_{Ai} + c_H + c′_H + b_i1 (home); log(μ_i2) = β_A + β^ω_{Ai} + β^δ_{Hi} + c_A + c′_A + b_i2 (away) — team offensive/defensive random effects, COVID and post-COVID effects. **Dispersion also regressed**: log(ν_ij) on team/venue/COVID effects (γ parameters) — dispersion is team-specific, motivated by index-of-dispersion heatmaps differing by team and venue.
- **Within-game correlation**: b_i = (b_i1, b_i2) ~ N_2(0, D), D^−1 ~ Wishart; cov(y_i1, y_i2) ≈ λ̃_i1(e^{d_12}−1)λ̃_i2 (proved in appendix; sign follows d_12).
- **Inference**: doubly-intractable posterior handled by the **Exchange algorithm** (Murray et al. 2012) with Benson & Friel (2021) rejection sampler; block updates for b, β, γ (robust adaptive Metropolis proposals, ~40% acceptance target), direct Wishart update for D. Priors: β,γ ~ N(0, 10I) (B_0 = G_0 = 0.1I), ν_0 = 50, R_0 = I.
- Model comparison by **DIC** using Benson & Friel's unbiased likelihood estimator (r = 1000 acceptances).

## 4. Equations & assumptions
- CMP pmf (1); E(Y) ≈ μ + 1/(2ν) − 1/2; Var(Y) ≈ μ/ν; mode = ⌊μ⌋.
- log(μ_i1), log(μ_i2), log(ν_i1), log(ν_i2) linear predictors as above; b_i|D ~ N_2(0,D) (2).
- HA (log scale) = log(μ_1/μ_2) = β_H − β_A (+ COVID terms).
- Assumptions: CMP mean-parametrization asymptotics adequate except small μ/ν; game outcomes conditionally independent given random effects; Wishart/independent-normal priors weakly informative (prior-sensitivity appendix: diffuse priors B_0 = 10I degrade MSE and convergence — R̂ up to 4–5); COVID effects as simple intercept shifts.

## 5. Features / target
Features: team identities (as random-effect levels), home/away indicator, COVID era (pre/during/post). Targets: home and away scores (counts) per game — joint bivariate prediction.

## 6. Validation design
- **Simulation**: true HA = 0.5 (β_H = 0.6, β_A = 0.1); 40 replicates per scenario; 30K MCMC (10K burn-in); compares CMP vs independent Poisson vs NB on HA recovery (95% credible intervals vs truth) and DIC.
- **Real data**: 180K MCMC iterations, 50K burn-in, ESS > 400–500; posterior predictive checks (empirical vs predictive distributions, hanging rootograms per Kleiber & Zeileis 2016); DIC vs Poisson and NB.
- No out-of-sample forecasting or betting evaluation — model comparison is in-sample (DIC) plus simulation truth-recovery.

## 7. Numerical results / baselines
- **Simulations**: CMP captures the true HA in ~all scenarios (Poisson/NB miss under over-/under-dispersion); at n = 1900 CMP has the **lowest DIC** in every dispersion regime (e.g., over-dispersed y_1: CMP 7269.45 vs NB 7314.27 vs Poisson 7470.95).
- **EPL DIC**: CMP **3635.61 / 3475.99** vs NB 3759.98/3562.15 vs Poisson 3738.67/3543.99 (home/away) — CMP best.
- **EPL home advantage**: pre-pandemic **0.238** (home scores 26.8% more), during **0.0916** (9.6%), post **0.288** (33.4%); P(HA_during < HA_before) = **0.8525**; P(HA_during < HA_after) = **0.9527**. Home win %: 45% → 39% → 44% (ANOVA p = 0.154, not significant by that test).
- **MLB DIC**: CMP **27943.03 / 28135.32** vs NB 28516.47/28564.52 vs Poisson 65994.64/30906.11 — CMP decisively best under over-dispersion.
- **Cost**: 1,000 iterations ≈ 30 s vs ~15 s for Poisson/NB; Exchange algorithm needs more iterations per ESS.

## 8. Code / data availability
Code: **https://github.com/mauroflorez/cmp** (stated "upon acceptance"). Data: football-data.co.uk (EPL), retrosheet.org (MLB) — both public.

## 9. Leakage & limitations
- **No out-of-sample forecast or market test**: all real-data comparison is in-sample DIC + posterior predictive checks; nothing is predicted forward or bet.
- MCMC is expensive (180K iterations, ESS only 400–500) and prior-sensitive — diffuse priors break convergence (appendix); the Exchange algorithm adds implementation complexity vs Stan-friendly alternatives.
- COVID-era findings rest on short windows (one pre-season for MLB — authors flag this); the ANOVA on home-goal differences is non-significant (p = 0.154), softening the headline HA claim.
- Soccer/baseball count scales; the bivariate structure assumes exactly two correlated counts per game.

## 10. GSE overlap
Fills the **Bayesian count-modeling gap**: the map inventories Poisson, Dixon-Coles, Skellam, and NBD, plus Bayesian hierarchical ratings (Rue & Salvesen) — but no CMP/double-Poisson-family model with **team-specific dispersion parameters**. GSE's totals work would benefit from a dispersion-flexible default: NFL team totals and game totals can be over- or under-dispersed by matchup, and the paper's index-of-dispersion heatmaps give a diagnostic GSE can copy. The correlated-random-effects trick for home/away (or team1/team2) score dependence is likewise absent from the corpus. Not a duplicate.

## 11. GSE implementation spec
- **Adapt as GSE's flexible count-data default for totals**: (1) implement bivariate CMP for (home points, away points) — or (team points, opponent points) — with log-links on μ (team offensive/defensive effects + rest/weather covariates) and on ν (team/venue dispersion effects); (2) start from the authors' GitHub implementation, then reimplement the Exchange sampler in GSE's stack or prototype in Stan with a truncated-Z approximation for speed; (3) use index-of-dispersion heatmaps by team×venue as a standard diagnostic before choosing Poisson vs NBD vs CMP per market; (4) derive totals and spread distributions from the joint posterior predictive, with calibration checked by proper scoring rules.
- Data: nflverse 2015–2025. Effort: 2–4 weeks (MCMC tuning dominates).

## 12. Reproducible test
- Dataset: nflverse regular-season games 2018–2024; target = home/away points (bivariate).
- Fit: bivariate CMP (team offense/defense + venue on μ; team/venue on ν) vs independent Poisson vs NB, expanding-window by season.
- Metrics: out-of-sample log-loss on the joint score distribution + DIC in-sample; calibration of implied totals probabilities.
- Baseline to beat: GSE's current totals model (or Dixon-Coles-style bivariate Poisson). Success: CMP matches-or-beats on log-loss with better-calibrated tail probabilities, at acceptable compute cost.

## 13. Acceptance / rejection gate
**Adopt** CMP as a totals-modeling option if, on the reproducible test, its out-of-sample joint log-loss beats bivariate Poisson and NB (or ties with demonstrably better tail calibration) and a full-season fit runs in <24 h on GSE hardware. **Reject** (stay with Poisson/NB mixtures) if the Exchange-algorithm compute cost is prohibitive or the dispersion regression adds no out-of-sample skill — the paper's gains are in-sample DIC, so the out-of-sample bar is the real gate.

## 14. Improvement experiment
Beyond the paper: (1) **time-varying dispersion** — the authors' ν is static per team/era; add a dynamic (random-walk) dispersion process and test whether dispersion itself is predictable (e.g., weather-driven variance inflation), which would directly improve totals pricing in wind games; (2) **more-than-two counts** — extend the correlated random-effects structure to a multivariate CMP over (home points, away points, home turnovers, away turnovers) for a joint spread/total/turnover model, which the authors note is feasible but don't attempt.

**Verdict:** ADAPT
