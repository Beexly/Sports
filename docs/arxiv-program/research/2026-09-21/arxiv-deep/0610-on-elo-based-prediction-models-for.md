# [0610] On Elo based prediction models for the FIFA Worldcup 2018 (arXiv:1806.01930v1)

**Citation:** Lorenz A. Gilch and Sebastian Müller (2018). *On Elo based prediction models for the FIFA Worldcup 2018*. arXiv:1806.01930v1. URL: https://arxiv.org/abs/1806.01930v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3722 lines).
**Verdict:** ADAPT — the nested Poisson (score conditional on favorite's score, Eq. 2.4) and the two ordinal tournament scoring functions (E1/E2) transfer directly to GSE; port the nested-Poisson goal model to NFL score margins and use E1/E2-style scoring to evaluate bracket/pick'ems, but discard the tournament-simulation machinery (it failed to predict the actual 2018 winner, Germany, which finished last in its group).

## 1. Research question
Can simple Elo-covariate Poisson regression models, fitted only on neutral-ground matches of tournament participants, produce competitive forecasts of an entire World Cup — and how should such tournament forecasts be scored? The paper proposes four models of increasing complexity (independent Poisson, bivariate Poisson, diagonal-inflated bivariate Poisson, nested Poisson), validates them on the 2010 and 2014 World Cups with two novel ordinal score functions (E1, E2) plus Brier and RPS, and simulates the 2018 tournament 100,000 times per model.

## 2. Dataset / schema
- All matches on neutral ground between 01.01.2010 and 31.12.2017 involving 2018 World Cup participants (for France: post-01.01.2012 + EURO 2016 home matches, after a χ² goodness-of-fit failure on the 2010 window, p = 0.0011 → adapted p = 0.03).
- Elo ratings from eloratings.net (World Football Elo). Top-5 on 28 Mar 2018: Brazil 2131, Germany 2092, Spain 2048, Argentina 1985, France 1984.
- Validation windows: 2002–2014 for the 2014 World Cup, 2000–2010 for the 2010 World Cup (12-year windows needed because some teams, e.g., Belgium, had too few neutral-ground matches otherwise — with team-specific ad-hoc fixes: Slovenia only used vs-participant matches; Serbia folded in Yugoslavia/Serbia-and-Montenegro history; Germany added WC2006 home games for the bivariate model).
- Schema per match: teams, goals each, date, Elo of each team at match time. Elo updated dynamically after each simulated game during tournament simulation.
- Simulation: 100,000 tournament replications per model in R 3.3.1 (bivpois package, EM estimation); extra-time scores simulated with rates/3; group tables per FIFA rules (no fair-play criterion).

## 3. Method / model
Per-team Poisson regressions with opponent Elo as the sole covariate. (1) Independent Poisson: team A scores ~ Poisson(μ_A(Elo_B)), concedes ~ Poisson(ν_B(Elo_A)), combined rate λ_{A|B} = (μ_A(Elo_B) + ν_B(Elo_A))/2 with log μ_A(Elo_O) = α_0 + α_1·Elo_O and log ν_B(Elo_O) = β_0 + β_1·Elo_O. (2) Bivariate Poisson: shared covariance term τ_T (constant per team; Elo-dependent τ tested and rejected — AIC increased for most teams); λ_0 = (τ_A + τ_B)/2. (3) Diagonal-inflated bivariate Poisson: inflation probability p on 0:0/1:1/2:2 via (θ_0,θ_1,θ_2); top-5 teams' estimated p ∈ [0.00, 0.03], all (θ_0,θ_1,θ_2) essentially (0,0,1) — i.e., inflation collapses to the 2:2 outcome. (4) Nested Poisson: stronger team A scored first via independent model, then weaker B's score depends on A's Elo AND A's realized goals: log λ_B(E_A, G_A) = γ_0 + γ_1·E_A + γ_2·G_A. Rejected alternatives: generalized Poisson (φ ≈ 1, no gain), negative binomial (same), home-advantage covariate L ∈ {−1,0,1} (collapsed everything to 2–6% win probabilities — "matches during championships behave different than typical matches in the qualifier round").

## 4. Equations & assumptions
log μ_A(Elo_O) = α_0 + α_1·Elo_O (Eq. 2.1); log ν_B(Elo_O) = β_0 + β_1·Elo_O (Eq. 2.2); λ_{A|B} = (μ_A(Elo_B) + ν_B(Elo_A))/2. Bivariate: log μ_T(Elo_O) = α_{1,0} + α_{1,1} Elo_O; log ν_T(Elo_O) = α_{2,0} + α_{2,1} Elo_O; log τ_T(Elo_O) = α_{3,0} (Eq. 2.3); (G_A,G_B) bivariate Poisson with λ_1 = (μ_A(Elo_B)+ν_B(Elo_A))/2, λ_2 = (μ_B(Elo_A)+ν_A(Elo_B))/2, λ_0 = (τ_A+τ_B)/2 (Eq. 3). Nested: log λ_B(E_A, G_A) = γ_0 + γ_1·E_A + γ_2·G_A (Eq. 2.4); P[G_A=i,G_B=j] = P[G_A=i]·P[G_B=j|G_A=i]. Diagonal inflation: P inflated on {0:0, 1:1, 2:2} with probabilities (θ_0,θ_1,θ_2), inflation probability p. Score functions: result(T) ∈ {1..6} (champion=1 … group-stage exit=6); E1 = Σ_T |result(T) − argmax_j p_j(T)|; E2 = Σ_T Σ_j p_j(T)|j − result(T)|; BS = Σ_T Σ_j (p_j(T) − 1_{result(T)=j})²; RPS = Σ_T (1/5) Σ_{i=1..5} (Σ_{j≤i} p_j(T) − 1_{result(T)=j})². Assumptions: goals are Poisson (validated by χ² tests, Tables 1–3); neutral-ground matches only; stronger team dominates tactics (nested model); Elo from eloratings.net is a sufficient strength summary; matches independent conditional on rates.

## 5. Features / target
- Features: opponent Elo (the only covariate used in all final models; team-specific attack/defense parameters estimated per team; home-advantage covariate tested and rejected).
- Target: exact match scoreline (G_A : G_B), which then implies win/loss/draw and group-stage points; ultimately per-team probabilities of reaching each tournament stage (champion/final/semi/quarter/R16/group exit).
- Prediction horizon: entire tournament simulated pre-tournament; validation on historical 2010/2014 tournaments.

## 6. Validation design
Two historical validations (World Cups 2010, 2014): models refit on data available before each tournament (2000–2010 and 2002–2014 windows respectively), tournament simulated 100,000× with dynamic in-tournament Elo updating, then scored against actual outcomes using E1, E2, Brier, RPS. Goodness-of-fit: χ² tests per team (Table 1: Brazil 0.56, Germany 0.39, Spain 0.40, Argentina 0.14, France 0.03 after adaptation); null vs residual deviance analyses (Tables 2–3). Note: validation windows were chosen adaptively per tournament (8 years failed for 2010/2014, extended to 10–12) — a design degree of freedom, acknowledged in §8.

## 7. Numerical results / baselines
- 2014 validation scores (Table 7): nested Poisson best on E1 (25), Brier (21.89), RPS (5.42); bivariate best on E2 (34.16 vs nested 34.32). 2010 validation (Table 10): nested Poisson best on all four (E1=24, E2=30.50, Brier=17.51, RPS=4.93).
- 2018 forecast (Tables 11–14): all four models rank Germany #1 (nested: 30.50% champion, 41.80% final, 92.10% R16 survival) ahead of Brazil (nested: 18.30%). Actual 2018: France won; Germany finished last in its group — the flagship forecast was badly wrong. (Paper's own caveat: dynamic Elo updating during simulation changes probabilities by up to 5 percentage points and models underdog runs.)
- Diagonal inflation added nothing (Tables 7, 10; p ≈ 0 for top teams despite lower AIC — authors reject it).
- Germany's 2018 ELO on 11 June 2014-style reference: paper notes Elo-driven reordering (Spain 21.80% → 16.70% champion probability between independent and nested models in 2014).

## 8. Code / data availability
None stated (no repository, no data URL). Simulation in R 3.3.1 with the `bivpois` package of Karlis & Ntzoufras (EM algorithm). Equations are fully reproducible by hand.

## 9. Leakage & limitations
- Massive lookahead-free design, but the validation windows were tuned per tournament (8 yrs → 12 yrs for 2010/2014) and team-specific hacks applied (France's post-2012 window + EURO 2016 home games, Serbia's historical folding, Slovenia's restricted sample) — the authors admit sensitivity: "we had to adapt the time range of historical match data before each of the different World Cup simulations."
- Home-advantage experiment reveals a fragility: including qualifiers with a home covariate collapsed all win probabilities to 2–6% — the covariate structure, not the data, drives conclusions.
- The headline 2018 forecast (Germany 30.5%, actual: group-stage exit) is a live demonstration that even the best-fitting model in-sample fails on single-tournament realization — tournament outcomes are dominated by variance; the E1/E2 scores paper this over only slightly.
- Only 32 teams, ~few hundred neutral-ground matches per team; Poisson rate estimates per team have wide CIs; extra-time rates/3 is an ad-hoc assumption.
- Generalised-Poisson/negative-binomial checks show φ ≈ 1 (no overdispersion) — convenient but means the model is essentially the simplest possible one.
- NFL external validity: soccer scores are low-count Poisson-amenable; NFL scores are higher and correlated through game script; the nested model (favorite's score conditions underdog's) is the closest analog but needs re-derivation for ~20–50 point totals.

## 10. GSE overlap
The corpus map covers: Elo, Dixon-Coles, Skellam, Poisson (all inventoried in the 26-metric catalog, 2026-09-17), market-implied ratings, and GSE's own engine (model v5.2.7, picks table). Team-specific attack/defense Poisson regression with Elo covariates is an **extension**: GSE has no per-team attack/defense Poisson decomposition with a shared strength covariate, and the nested model (Eq. 2.4 — weaker team's score conditional on favorite's realized score) is genuinely new to the corpus. The E1/E2 ordinal tournament scoring functions are also new — the corpus has Brier, RPS, log loss but no stage-reaching ordinal scorers, which map directly onto GSE's playoff/survivor/pick'em evaluations. The Sankey visualization is noted but not needed.

## 11. GSE implementation spec
- Data: nflverse 2010–2026 regular-season games; team offensive/defensive ratings from GSE's existing Elo or benbbaldwin objective ratings (instead of eloratings.net).
- Model: nested-score analog — (1) favorite's points ~ quasi-Poisson/NB regression on opponent defensive strength; (2) underdog's points ~ regression on favorite's Elo + favorite's realized points (game-script dependence, Eq. 2.4 analog); evaluate against independent bivariate baseline. Win probability derived from simulated scorelines; spread/total lines derived from score quantiles.
- Training: per-team attack/defense parameters, walk-forward by season (train on seasons ≤ t−1, predict season t), neutral-field handling replaced by HFA covariate (the paper's HFA-collapse warning argues for testing whether qualifier-style regular-season games distort playoff forecasting — use separate playoff-only validation).
- Effort: ~1 week (Poisson/NB GLMs are standard; the novelty is the nested conditioning and E1/E2 evaluation harness).

## 12. Reproducible test
Dataset: NFL regular seasons 2015–2025 (nflverse), walk-forward by season (train ≤ t−1 → predict season t). Metric: log loss on win probability (primary) + mean absolute error on total points; secondary: E2-style ordinal score on playoff stage reached per team (adapt result(T) ∈ {1..7}: SB winner … miss playoffs). Baseline: independent bivariate Poisson (same covariates) and GSE engine's current moneyline probabilities.

## 13. Acceptance / rejection gate
Adopt the nested formulation iff on the 2015–2025 walk-forward: (a) nested log loss beats independent Poisson by ≥ 0.005 (paper's margin was ~1% relative on the tournament scores); AND (b) E2 ordinal score on playoff-stage probabilities beats the engine baseline (strict improvement, any margin); AND (c) the model is stable to ±2-year training-window shifts (the paper's window-sensitivity is the failure mode to rule out). Otherwise keep independent Poisson and note nested conditioning as overfit on soccer.

## 14. Improvement experiment
The paper's home-advantage collapse (2–6% win probabilities for everyone) hints the real lesson is regime separation: fit the nested model separately on playoff games vs regular-season games and test whether playoff-only parameters (tighter spreads, favorite-heavy script) predict postseason outcomes better than full-season fits — i.e., formalize their qualitative "championship matches behave differently" claim into a measurable test, which directly serves GSE's playoff betting edge.
