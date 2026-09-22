# 1794 Modeling and Prediction of the UEFA EURO 2024 via Combined Statistical Learning Approaches (arXiv:2410.09068v1)

**Citation:** Andreas Groll, Lars Magnus Hvattum, Christophe Ley, Jonas Sternemann, Gunther Schauberger, Achim Zeileis (2024). *Modeling and Prediction of the UEFA EURO 2024 via Combined Statistical Learning Approaches*. arXiv:2410.09068v1. URL: https://arxiv.org/abs/2410.09068v1
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).

## 1. Research question

Can three fundamentally different learners — a LASSO-regularized Poisson GLM, a conditional-inference random forest (Cforest), and XGBoost — be linearly combined into one joint model that forecasts international football tournament matches (expected goals per team, then W/D/L probabilities via the Skellam distribution, then 100,000-tournament simulations for stage probabilities) better than any single learner, using classical covariates plus three "enhanced" team-strength variables derived from separate statistical models?

## 2. Dataset / schema

- **Training:** match results of UEFA EUROs 2004–2020 (195 matches), each match split into two team-observations; features are *differences* of the two teams' covariates from the first-named team's perspective. Target: goals scored by the team in 90 minutes.
- **Classical covariates (top-8 after importance screening):** log GDP per capita, log average market value (transfermarkt), FIFA rank, UEFA association club coefficients, number of Champions League semifinalists in squad (normalized to 23-man squad).
- **Enhanced variables (separately estimated, the paper's core trick):** (1) *HistAbility* — team ability from weighted historic international matches (last 8 years); (2) *logability* — ability from bookmaker tournament-winning odds via "inverse" tournament simulation; (3) *ave.PM* — mean plus-minus player rating of the squad (ridge regression on segment-level club + international data with line-ups, substitutions, red cards).
- **2024 prediction:** covariates/abilities re-estimated shortly before EURO 2024 (28 bookmakers via oddschecker/bwin); bookmaker three-way odds (betexplorer) used as benchmark.
- **Access:** data tables partially in appendices; no public repo link given. Replicable from public sources (match archives, transfermarkt, FIFA rankings, bookmaker odds).

## 3. Method / model

Pipeline: (a) estimate three enhanced strength variables from auxiliary data; (b) train LASSO-Poisson, Cforest, XGBoost on EUROs 2004–2020 to predict each team's expected goals λ; (c) grid-search convex weights (step 0.05, Σw=1) minimizing a min-max-normalized average of ML/CR/RPS; (d) convert λ₁,λ₂ to W/D/L probabilities via Skellam (difference of independent Poissons); (e) simulate the full tournament 100,000 times (extra time at λ/3, 50/50 shootouts) for stage probabilities. XGBoost tuned by 10-fold CV (η = 0.1 fixed); LASSO ξ via cv.glmnet; Cforest mtry tuned ∈ {1,2,3,4} (selected mtry = 1).

## 4. Equations & assumptions

Equations (quoted exactly as in the paper):

- HistAbility: λ_{i,m} = exp(β₀ + (rᵢ − rⱼ) + hᵢ·𝟙(team i at home)), identifiability Σᵢrᵢ = 0; weighted likelihood L = Πₘ P(G_{i,m}=g_{i,m},G_{j,m}=g_{j,m})^{wₘ}.
- Time decay: w_{time,m}(xₘ) = (1/2)^{xₘ/1095.75} (half-period 3 years); match-importance weights: 4 (World Cup), 3 (confederation tournament), 2.5 (qualifiers), 1 (friendlies).
- Overround removal: quoted_oddsᵢ = oddsᵢ·δ + 1, median δ-margin 16.8%; pᵢ = 1/(exp(lᵢ)+1) from averaged log-odds.
- Inverse-simulation ability update: abilities_{iter+1} = abilities_{iter} − (l̃ᵢ − lᵢ)/(|l̃ᵢ − lᵢ|·(0.01/iter^{0.1})), stop when RMSE(l̃,l) < 0.05; β₀ = 0.15, h = 0 fixed.
- Plus-minus: yᵢ = Σⱼβⱼxᵢⱼ + εᵢ (xᵢⱼ ∈ {1,−1,0} by side), ridge-estimated with HFA/competition/age/segment-duration/game-state adjustments.
- LASSO-Poisson: λᵢⱼ = exp(xᵢⱼᵀβ); l_p(β) = l(β) − ξΣₖ|βₖ|.
- Combined: ŷᵢ = w₁·exp(β₀+xᵢβ) + w₂·(1/B)Σ_b ŷᵢ^{(b)} + w₃·Σₖηfₖ(xᵢ), Σw = 1.
- Skellam: P(K=k) = e^{−(λ₁+λ₂)}(λ₁/λ₂)^{k/2} I_k(2√(λ₁λ₂)); π̂₁ᵢ = P(G₁ᵢ>G₂ᵢ), π̂₂ᵢ = P(G₁ᵢ=G₂ᵢ), π̂₃ᵢ = P(G₁ᵢ<G₂ᵢ).
- Metrics: MLᵢ = Πᵣ π̂_{ri}^{δ_{r,ỹᵢ}}; CRᵢ = 𝟙(ỹᵢ = argmax_r π̂_{ri}); RPSᵢ = (1/2)Σ_{r=1}^{2}(Σ_{l=1}^{r}(π̂_{li} − δ_{l,ỹᵢ}))².

Assumptions stated: team scores are conditionally independent Poissons (Skellam bridge); abilities constant within a tournament; the three enhanced variables estimated on auxiliary data are plugged in without propagating their uncertainty; bookmaker consensus is "expert knowledge" and a valid benchmark.

## 5. Features / target

Features: 8 team-covariate differences (5 classical + 3 enhanced). Target: team goals in 90 minutes (nonnegative integer); derived targets: goal differential, W/D/L outcome.

## 6. Validation design

Tournament-level leave-one-out CV: train on 4 of 5 EUROs, predict the held-out EURO, rotate; metrics averaged over 195 matches. Weights for the combined model tuned on the same CV predictions (a mild selection bias the paper does not correct — see §9). Bookmakers compared on ML/CR/RPS only.

## 7. Numerical results / baselines

All numbers are the paper's, quoted exactly (Table 7, leave-one-tournament-out):

| Model | ML↑ | CR↑ | RPS↓ | MAE_goals↓ | MAE_goaldiff↓ |
|---|---|---|---|---|---|
| LASSO | 0.3983 | 0.4872 | 0.2028 | **0.8550** | 1.1796 |
| Cforest | 0.3996 | 0.4872 | 0.2016 | 0.8686 | **1.1669** |
| XGBoost | 0.3738 | 0.4769 | 0.2105 | 0.8713 | 1.1968 |
| **Combined** | 0.3994 | **0.4923** | **0.2015** | 0.8662 | 1.1674 |
| Bookmakers | **0.4047** | **0.5179** | **0.1973** | — | — |

- Best weights: **0.15 LASSO + 0.85 Cforest + 0.00 XGBoost** (Table 8; Avg_norm = 91.46). XGBoost appears in only 2 of the top-10 combos.
- Final LASSO coefficients (Table 9): intercept 0.1308, logability 0.4037, market.value 0.0943, GDP 0.0876, CL.players 0.0162, FIFA.rank −0.0017; UEFA.points = 0, ave.PM = 0, HistAbility = 0 (LASSO-dropped); ξ ≈ 0.0183.
- Variable importance (permutation, combined model): logability and market value top, then GDP and ave.PM.
- EURO 2024 simulation (100,000 tournaments): France 19.2% champion, England 16.7%, Germany 13.7%, Spain 11.4%, Portugal 10.8%, Netherlands 7.6%, Italy 5.6%, Belgium 4.9%. Bookmaker consensus: England 20.5%, France 17.6%, Germany 14.0%.
- Reality check (my addition, labeled): Spain won EURO 2024 — the model's 4th favorite at 11.4%, bookmakers' 5th at 9.7%. A useful calibration anecdote, not a refutation (single draw from the distribution).

## 8. Code / data availability

No code repo linked; methods fully specified (R packages: glmnet, party/cforest, xgboost). Covariate sources are public; bookmaker odds tables in appendices. Reproducible with effort.

## 9. Leakage & limitations

- **Weight-tuning selection bias:** the convex weights were chosen on the same CV predictions used for the final comparison — the combined model's edge over Cforest (RPS 0.2015 vs 0.2016, CR 0.4923 vs 0.4872) is within noise and partly selected.
- **Combination gains are tiny:** the honest story is "Cforest ≈ combined ≫ XGBoost," and bookmakers beat all models on every metric. The paper's real contribution is the *enhanced-variable pipeline*, not the ensemble.
- **LASSO dropped two of three enhanced variables** (ave.PM, HistAbility = 0) — collinearity among the three ability measures means they cannibalize each other in a linear model; the RF uses them better.
- **Independence assumption:** Skellam bridge assumes independent team scores; the corpus's handball paper (1791) shows copula dependence matters at halftime — same caveat applies.
- **No uncertainty propagation** from the three auxiliary ability estimators into the final model.
- **Football-specific:** draws exist; 90-minute target; tournament structure. Porting to NFL needs the draw-free, 17-game adaptation.

## 10. GSE overlap

The corpus has Skellam (1790, 1791), Bayesian win probability (1789), and Poisson score models, but no ledger builds the **full pipeline this paper demonstrates: auxiliary strength estimators → ML score models → Skellam outcome probabilities → Monte Carlo tournament/playoff simulation**. GSE needs exactly this for NFL: expected-points models → spread/total probabilities → playoff-bracket simulation content. The three enhanced-variable recipes are each portable: (1) HistAbility = weighted Poisson ability with 3-year half-life time decay (cf. Elo variants in the corpus, but this is the explicit formula); (2) logability = market-consensus ability via inverse simulation — a principled way to convert futures odds into team strengths that the corpus lacks; (3) ave.PM = ridge plus-minus player ratings aggregated to team level — relevant to GSE's player-impact/injury content. Not a duplicate.

## 11. GSE implementation spec

1. **NFL score-model ensemble:** train on 2010–2025 regular-season games: LASSO-Poisson (team points scored) + random forest + (optionally) gradient boosting on team-level features including three NFL enhanced variables: (a) HistAbility — weighted-Poisson team ability, half-life 3 years, weights 4 playoffs / 3 primetime? (adapt: 4 playoff, 2.5 divisional, 1 regular season); (b) logability — from Super Bowl futures odds via the paper's inverse-simulation loop; (c) ave.PM — ridge plus-minus player ratings from snap-level data aggregated to roster (injury-adjusted team strength).
2. **Skellam → spread/total:** convert (λ₁,λ₂) to P(home win), P(cover spread s), P(over total t) via the Skellam CDF — replaces normal-approximation spread math in the engine's probability layer.
3. **Playoff simulator:** 100,000 bracket simulations from the fitted score models, with the paper's exact stage-probability table format — a ready-made content product (weekly "paths to the Super Bowl" graphics).
4. Cost: ~1 week (snap-level PM ratings are the heavy lift; everything else is game-level).

## 12. Reproducible test

Dataset: NFL 2015–2024 (fit 2015–2022, test 2023–2024). Build the three enhanced variables + classical features (market value → salary-cap spend; FIFA rank → Elo; GDP → market size — adapt sensibly). Baselines: engine's current spread/total model, Pinnacle-implied probabilities. Metrics: RPS on W/L (adapted: Brier on win, CR on cover), MAE on margin and total. Success gate below.

## 13. Acceptance / rejection gate

**Adopt the enhanced-variable + ensemble pipeline if** the combined score model beats the engine's current spread/total probability layer on Brier score for game winner AND margin MAE over 2023–2024 by ≥0.003 / ≥0.15 points respectively, with the logability (market-consensus) variable showing positive permutation importance; **reject** if bookmaker-implied probabilities alone still dominate (the paper's own finding) — in which case adopt only the playoff-simulation presentation layer (§11.3) and park the ensemble. Kill the XGBoost arm early if it trails the RF after one tuning round, per the paper's evidence.

## 14. Improvement experiment

**Bivariate-Poisson + live in-game extension:** replace the independent-Poisson Skellam bridge with a bivariate Poisson (correlation ρ estimated per matchup-total band) for the score model, then extend the whole pipeline in-game: re-estimate (λ₁,λ₂) from the pregame ensemble plus live score/clock state each minute, and re-run a *short* Monte Carlo (10k sims) for live win/cover/total probabilities. Hypothesis: the paper's static pipeline becomes GSE's live-probability engine, and the bivariate correction captures the garbage-time correlation the independence assumption misses (favorites run clock, shrinking totals). Test: log-loss on live win probability vs the pregame-only model over 2024 games at 5 checkpoints (Q1–Q4 + 2-min warning); success = ≥0.005 log-loss improvement in H2 with no H1 degradation.

**Verdict:** ADAPT
