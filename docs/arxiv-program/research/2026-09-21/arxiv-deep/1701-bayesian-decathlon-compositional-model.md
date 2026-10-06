# [1701] Quantifying the Limits of Human Athletic Performance: A Bayesian Analysis of Elite Decathletes (arXiv:2602.17043)

**Citation:** Nguyen, P.-H. V., Smoliga, J. M., Lindaman, B. & Deshpande, S. K. (2026). *Quantifying the Limits of Human Athletic Performance: A Bayesian Analysis of Elite Decathletes*. arXiv:2602.17043. URL: https://arxiv.org/abs/2602.17043
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, Sections 1–4 + Appendix A + references, ~44k chars).
**Verdict**: ADAPT
ADAPT — one sentence: the compositional Bayesian event model (sequential performance depending on preceding events + nonlinear age curves + athlete random effects) is a directly adaptable scaffold for modeling player/game performance with weather as an explicit covariate — which the authors themselves flag as the natural extension — but the paper contains no actual weather analysis since temperature/wind data were unavailable.

## 1. Research question
What is a realistic maximal decathlon score, and what athlete profile could achieve it? The authors build a Bayesian compositional model of per-event performance over athletes' careers (age curves + dependence on preceding events in the fixed event order), then simulate careers of real and synthetic athlete profiles to estimate the probability of breaking 9,200 points. Data: 8,668 decathlon performances from 1,007 athletes, 2001–2022 (World Athletics via Battles et al.).

## 2. Dataset / schema
- World Athletics decathlon results 2001–2022, distributed at github.com/Battles186/DecathlonCareerBest; filtered to athletes with ≥4 performances at 6400+ points: 8,668 performances × 10 events, 1,007 unique decathletes; each event standardized to mean 0 / sd 1.
- Event order fixed: Day 1 (100m, LJ, SP, HJ, 400m), Day 2 (110mH, DT, PV, JT, 1500m); World Athletics scoring table (Table A2 coefficients a, b, c per event) converts performances to points.
- Explicitly missing: temperature, wind speeds, shoe/surface technology — authors note these affect performance but were unavailable.

## 3. Method / model
Three Bayesian hierarchical models fit in rstan (4 chains × 2,000 iterations, 1,000 burn-in; weakly informative N(0,1) / Inv-Gamma(2,1) priors):
- Eq. 1 (baseline): total points P_{i,j} = α̃_i + Σ_d β̃_d φ_d(age) + ε — athlete random intercept + nonlinear age basis.
- Eq. 2 (simple): per-event Y_{i,j,e} = α_{i,e} + Σ_d β_{d,e} φ_d(age) + ε_{i,j,e} — event-specific age curves and intercepts.
- Eq. 3 (compositional): Eq. 2 + Σ_{m<e} γ_{m,e} Y_{i,j,m} — performance in each event depends linearly on all preceding events in the same decathlon (captures fatigue/similarity).
Posterior predictive career simulation: sequentially sample each event conditional on simulated preceding events, convert to points via scoring table, repeat over ages 19–30 × posterior samples.

## 4. Equations & assumptions
- P_{i,j} = α̃_i + Σ_d β̃_d φ_d(age_{i,j}) + ε, ε ~ N(0,σ) (Eq. 1).
- Y_{i,j,e} = α_{i,e} + Σ_d β_{d,e} φ_d(age) + ε_{i,j,e} (Eq. 2).
- Y_{i,j,e} = α_{i,e} + Σ_d β_{d,e} φ_d(age) + Σ_{m=1}^{e−1} γ_{m,e} Y_{i,j,m} + ε_{i,j,e} (Eq. 3).
- Points = a(b−y)^c (track), a(y−b)^c (field) (Eq. A1).
- φ_d: cubic polynomial or cubic spline with knots at age deciles.
- Assumptions: linear inter-event dependence; event models fit separately (athlete intercepts independent across events a posteriori); age curves shared across athletes (only intercepts athlete-specific); selection bias acknowledged (only elite observed at age extremes).

## 5. Features / target
Features: athlete identity, age, performances in preceding events (compositional). Target: per-event performance (time/distance) and derived total decathlon points.

## 6. Validation design
- 10-fold CV under two frameworks: "general" (random 90/10 observation splits) and "tail" (hold out last decathlon of 10% of athletes); metric = standardized MSE (MSE / test variance), cubic vs spline bases.
- Simulation study: 200 synthetic datasets, 95% posterior credible-interval coverage of true parameters.
- Posterior predictive checks: 2,000 simulated datasets; compare posterior predictive inter-event correlations vs observed.

## 7. Numerical results / baselines
- CV SMSE (general): baseline 0.234, simple/compositional 0.235 (cubic); essentially tied. Tail: baseline 0.358 vs compositional 0.362 — baseline marginally better on pure prediction; compositional chosen for interpretability.
- Parameter recovery: near-nominal 95% coverage across predictors (exceptions: JT and PV columns at 90.5%).
- Inter-event dynamics: 100m–1500m antagonistic — 0.1 s improvement in 100m ↔ +0.45 min worse 1500m (age- and sequence-adjusted); empirical correlations (Table A6): 100m–LJ −0.54, 100m–400m +0.66, SP–DT +0.73.
- Posterior predictive correlations: observed correlations fall inside the compositional model's predictive intervals but outside the simple model's (Fig. 2).
- 9,200-point probabilities: Mayer 7.7%, Eaton 5.65%, Šebrle 10.3%, Warner 1.8%, Dvořák 0.6%; Day-1 specialist 2.4%, Day-2 specialist 0%; "unicorn" (95th pct all events) ~100%; "good" (80th pct) 0.075% (avg max 8,671 vs unicorn 9,561).
- Theoretical ceilings: all world records in one decathlon = 12,676; all decathlon-bests = 10,669.

## 8. Code / data availability
Data: public (github.com/Battles186/DecathlonCareerBest). Model code: rstan, no repo link stated.

## 9. Leakage & limitations
- No weather data at all — the lane's core variable is absent; the weather extension is a stated future direction, not an executed analysis.
- Event models fit separately → athlete intercepts independent across events a posteriori; authors flag a joint model with non-diagonal intercept covariance as the better approach.
- Linear inter-event dependence only; nonlinear compositional left to future work.
- Tail-CV shows the compositional structure adds no predictive accuracy over the simple age-curve baseline — its value is interpretive.
- Selection bias at age extremes; decathlon-only population (elite generalists), so γ coefficients aren't causal.

## 10. GSE overlap
Fills a modeling-architecture gap rather than duplicating inventory. GSE's Bayesian lane (per the research map) has state-space team models but no compositional sequential-performance scaffold of this form; the paper gives the exact template for adding weather as a covariate to a performance model — Y = athlete effect + experience curve + preceding-performance dependence + weather terms. The antagonistic-tradeoff finding (100m vs 1500m) is also a cautionary template: environmental or strategic adjustments that help one phase of a game (e.g., pass-heavy in dome conditions) can hurt another. No overlap with GSE's existing weather metrics (which are feature inventories, not hierarchical models).

## 11. GSE implementation spec
- Module `weather/compositional_performance.py`: adapt Eq. 3 to NFL — model a player's game-level fantasy output (or a team's drive outcomes) as: y_{i,g,e} = α_{i,e} + Σ_d β_{d,e} φ_d(experience_{i,g}) + Σ_{m<e} γ_{m,e} y_{i,g,m} + **δ_e · weather_{g}** + ε, where e indexes game phases (Q1–Q4 / drive sequence), and weather_g = (temp, wind speed, precipitation, dome indicator) at game time. The δ_e terms are the paper's stated extension, executed.
- Fit in Stan/PyMC on 3 seasons of player-game data; athlete random intercepts per phase; cubic experience curves.
- Output: posterior distributions of weather coefficients per game phase (e.g., wind hurts Q4 passing more than Q1 — fatigue × weather interaction), usable as calibrated adjustments to projections.
- Effort: ~4 days (Stan model + nflverse/weather join + validation).

## 12. Reproducible test
Dataset: nflverse 2021–2025 player-game stats (QB passing yards/TD by quarter where available, else game-level) + game-time weather (temp, wind, precip, dome). Baseline: player mean + experience curve only. Test: full compositional model with weather covariates; metric: out-of-sample RMSE on 2025 games (tail-CV style: hold out each player's last 4 games). Secondary: 95% posterior predictive interval coverage of actual game scores should be near-nominal (paper's calibration standard).

## 13. Acceptance / rejection gate
ADOPT the weather-covariate layer if (a) tail-CV RMSE improves ≥ 2% over the no-weather baseline, (b) posterior predictive 90% intervals achieve 88–93% empirical coverage, and (c) at least one weather coefficient (e.g., wind on passing) has a 95% credible interval excluding zero with a stable sign across seasons. REJECT if weather terms add nothing — mirroring the paper's own finding that extra structure (compositional) didn't beat the baseline on pure prediction; interpretability alone doesn't justify the complexity.

## 14. Improvement experiment
Fix the paper's self-flagged weakness: fit the joint model with a non-diagonal covariance on athlete-phase intercepts (multivariate normal population) instead of independent per-event fits, and allow nonlinear inter-phase dependence via a GP or spline on preceding-phase performance. Hypothesis: the joint model recovers cross-phase weather interactions the paper's linear form misses (e.g., wind's effect on Q4 passing depends nonlinearly on Q1–Q3 pass volume — arm fatigue × conditions). Test: compare tail-CV RMSE of linear vs nonlinear compositional on windy vs calm games separately; success = nonlinear wins specifically in high-wind games (≥15 mph), proving the interaction is real and exploitable for in-game live adjustments.

**Verdict:** ADAPT — the compositional Bayesian scaffold with athlete random effects and nonlinear experience curves is the right architecture for weather-covariate performance modeling (the paper's own stated extension), but it must be rebuilt for football phases with actual weather data the paper lacked.
