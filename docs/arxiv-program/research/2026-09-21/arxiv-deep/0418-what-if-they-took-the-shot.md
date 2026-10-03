# [0418] What If They Took the Shot? A Hierarchical Bayesian Framework for Counterfactual Expected Goals (arXiv:2511.23072v1)

**Citation:** Mikayil Mahmudlu, Oktay Karakuş, and Hasan Arkadaş (2025). *What If They Took the Shot? A Hierarchical Bayesian Framework for Counterfactual Expected Goals*. arXiv:2511.23072v1. URL: https://arxiv.org/abs/2511.23072v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 2577 lines).
**Verdict:** ADAPT — port the hierarchical player-effect + expert-prior + counterfactual reallocation framework to NFL receiving/rushing: estimate player-specific efficiency deviations with draft/college priors, then answer "what if WR X ran WR Y's routes" for trade and free-agency evaluation.

## 1. Research question
Standard expected-goals (xG) models treat all players as identical finishers. Can a hierarchical Bayesian model with expert-informed priors (Football Manager ratings) estimate player-specific finishing effects — and then support counterfactual "what if player B had taken player A's shots" analysis for transfer evaluation and tactical fit?

## 2. Dataset / schema
- StatsBomb open event data, 2015-16 season, Europe's top five leagues (Premier League, La Liga, Serie A, Bundesliga, Ligue 1), collected via the statsbombpy Python library.
- Final dataset: 9,970 shots by 148 distinct players, after applying a minimum threshold of 30 shots per player. 17 engineered features per shot.
- Expert priors: Football Manager 2017 ratings (standardized 1–20 scale → z-scores), using four attributes — Finishing, Technique, Long Shots, Heading — mapped to corresponding model coefficients (Finishing → one-on-one/penalty-area; Long Shots → distance; Technique → normal execution; Heading → body-part coefficients).
- Player-name linkage between StatsBomb and FM required automated plus manual matching (e.g., "Sergio Leonel Agüero del Castillo").
- Access: StatsBomb open data is public (github.com/statsbomb/open-data); FM17 ratings proprietary.

## 3. Method / model
- Three-model progression: (1) baseline Bayesian logistic regression (population-level, all players identical); (2) hierarchical Bayesian logistic with player-specific deviations γ_i ∈ ℝ^17, γ_i ~ N(μ_i, Σ), Σ = diag(σ_1²,…,σ_17²), μ_i = FM-informed prior means — yielding the partial-pooling estimator γ*_i ≈ [τ_i²/(τ_i²+σ²)]γ̂^MLE_i + [σ²/(τ_i²+σ²)]μ_i; (3) XGBoost non-linear benchmark (n_estimators=591, max_depth=4, learning_rate=0.0139, tuned by randomized search + 5-fold CV) validated against StatsBomb's proprietary xG.
- Inference in PyMC with NUTS: 4 chains × 2,000 warmup + 2,000 sampling (8,000 posterior draws); target acceptance 0.95; max tree depth 10; MAP initialization.
- Counterfactuals: for player A's shot contexts x_i, counterfactual xG_B(A) = Σ_i σ(α + (β + γ_B)ᵀx_i); ΔxG_{B←A} = xG_B(A) − xG_A(A), estimated by posterior predictive sampling → E[ΔxG], Pr(ΔxG>0), HDI_95%.
- Extensions: Context-Conditioned Counterfactual Transport (C³T) decomposes ΔxG across situational strata (Open-Play / Pressure); Fit-Adjusted Transfer Score FATS = Σ_c w_c Pr(ΔxG_c > 0), with w_c the target team's empirical context shares.

## 4. Equations & assumptions
- Baseline: y_{ij} ~ Bernoulli(p_{ij}); p_{ij} = σ(η_{ij}); η_{ij} = α + βᵀx_{ij}. (paper's eqs. 1–3)
- Hierarchical: η_{ij} = α + (β + γ_i)ᵀx_{ij}; γ_i ~ N(μ_i, Σ). (eqs. 4–5)
- Partial pooling: γ*_i ≈ (τ_i²/(τ_i²+σ²))γ̂^{MLE}_i + (σ²/(τ_i²+σ²))μ_i. (eq. 6)
- XGBoost: p̂_{ij} = f_{xgb}(x_{ij}; θ); tree residuals r_{ij}^{(t)} = ∂ℓ(y_{ij}, f^{(t-1)}(x_{ij}))/∂f. (eqs. 7–8)
- Counterfactuals: η_{i,A} = α + (β+γ_A)ᵀx_i; p_{i,A} = σ(η_{i,A}); η_{i,B|A} = α + (β+γ_B)ᵀx_i; p_{i,B|A} = σ(η_{i,B|A}); xG_B(A) = Σ_{i=1}^{N} σ(α+(β+γ_B)ᵀx_i); ΔxG_{B←A} = xG_B(A) − xG_A(A). (eqs. 9–15)
- Posterior predictive: ΔxG_s = xG_{B,s}(A) − xG_{A,s}(A) → E[ΔxG], Pr(ΔxG>0), HDI_95%. (eq. 16)
- FATS = Σ_c w_c Pr(ΔxG_c > 0).
- Prior specs (paper's Table 2): intercept Normal(−3, 0.5); coef_shot_distance SkewNormal(−0.5, 1, α=−4); coef_gk_distance SkewNormal(0.3, 1, α=4); coef_shot_angle SkewNormal(0.3, 1, α=3); technique coefficients Normal(0, 5); hyperpriors sigma_physics HalfNormal(0.3), sigma_situation HalfNormal(0.5), sigma_common_techniques HalfNormal(0.7), sigma_rare_techniques HalfNormal(2.0).
- Assumptions: (a) shot contexts are fixed under counterfactual reallocation (no change in shot creation); (b) FM ratings are valid priors after z-scoring; (c) player effects are constant within the season; (d) 30-shot threshold suffices for identification with prior help.

## 5. Features / target
- 17 features: geometric (3) — shot distance, shot angle, GK distance; contextual (2) — defenders in triangle, penalty area; situational (3) — under pressure, first time, one-on-one; categorical (9) — body part (3: left foot, right foot, other), technique (6: normal, volley, half volley, lob, diving header, overhead kick).
- Target: binary goal/no-goal per shot.

## 6. Validation design
- Baseline-vs-hierarchical prediction scatter: R² ≈ 0.75 with mean absolute deviation ~0.05 probability units (some >0.10).
- External benchmark: XGBoost vs StatsBomb proprietary xG: R² = 0.833.
- MCMC convergence: all 25 reported parameters R̂ < 1.1 (max 1.004, mean 1.001); bulk ESS mean 5,340 (min 1,579); tail ESS mean 4,973 (min 1,673); BFMI 0.77–0.85 across 4 chains; composite score 5/5.
- Real-world validation: counterfactuals checked against subsequent events — Sansone's €13M transfer to Villarreal; Immobile's and Belotti's later-season scoring resurgence after the model flagged latent finishing ability during underperforming spells.

## 7. Numerical results / baselines
- XGBoost hyperparameters: n_estimators=591, max_depth=4, learning_rate=0.0139; R²=0.833 vs StatsBomb xG.
- XGBoost feature importance: defenders in triangle 27.6%, shot distance 18.3%, shot angle 14.2%, one-on-one 7.3%, body part 7.2%, penalty area 7.1%, GK proximity 6.5%, under pressure 5.3%, technique 4.3%, first time 2.1%.
- Agüero prior–posterior (paper's Table 4): Finishing 17/20 (z=+1.406) → posterior +1.494 ± 0.529 log-odds (one-on-one); Long Shots 15/20 (z=+0.955) → +1.069 ± 0.312 (distance).
- Player effects (log-odds posterior means): one-on-one — Agüero +1.48, Suárez +1.43; distance — Bale and Robben >+1.7, Pogba +1.43, Mertens +0.64, Wijnaldum −0.11; first-time — Insigne +0.92, Salah +0.64, Agüero ≈−0.6, Modeste ≈−0.6; penalty area — Higuaín +1.79, Bale +1.78, Suárez +1.60.
- Berardi→Sansone: Berardi baseline 4.0 xG on 75 shots (95% HDI [1.5, 6.9]); Sansone counterfactual 6.2 xG (HDI [1.5, 12.8]); Δ=+2.2, of which +1.1 from pressured shots (Berardi 0.5 → Sansone 1.4 on 21 pressured attempts).
- Vardy–Giroud (paper's Table 5): Giroud→Vardy(Leicester) E[ΔxG]=−7.25, 95% HDI [−12.44, 1.87], Pr(ΔxG>0)=0.07, FATS=0.10; Vardy→Giroud(Arsenal) E[ΔxG]=−0.75, HDI [−9.31, 5.64], Pr=0.41, FATS=0.42.
- Aubameyang–Lewandowski: Lewandowski→Dortmund +6.49, HDI [−1.99, 11.51], Pr=0.92, FATS=0.85; Aubameyang→Bayern −5.32, HDI [−13.07, 3.36], Pr=0.14, FATS=0.21.
- Pogba–B. Fernandes: Bruno→Pogba(Juventus) −1.88, HDI [−5.90, 4.25], Pr=0.26, FATS=0.29; Pogba→Bruno(Udinese) −0.10, HDI [−2.25, 1.48], Pr=0.49, FATS=0.47. (Note: §4.4.3 describes this as Serie A 2015-16, Juventus/Udinese; §5.4 item 3 labels it "Manchester United 2021" — an internal inconsistency in the paper, reported as stated.)

## 8. Code / data availability
No code link stated. Data via statsbombpy + StatsBomb open-data GitHub; FM17 ratings proprietary; models implemented in PyMC.

## 9. Leakage & limitations
- Single-season data: no test of temporal stability of player effects; "latent ability" claims (Immobile, Belotti) are retrospective narratives, not preregistered predictions.
- Counterfactuals hold shot contexts fixed — but a different player changes shot creation (teammates pass differently, defenses react). The do(Player=B) intervention is only valid if contexts are exogenous, which they are not.
- FM priors come from a single expert system (Sports Interactive's scout network); no multi-source prior comparison.
- The 30-shot inclusion threshold plus partial pooling means low-sample players are mostly prior — the "data-driven" posterior for sparse players is largely FM repackaged.
- Name-matching required manual fixes; replication would need the same manual curation.
- The Vardy–Giroud asymmetry is substantially tactical (transition vs possession systems), not pure finishing — the model attributes system effects to player γ_i.
- External validity to NFL: the framework ports to any player-context efficiency problem (receiving, rushing), but NFL contexts (routes, coverages) are far less standardized than shot features.

## 10. GSE overlap
Per the existing-research map (2026-09-21): GSE's corpus has EPA/play, QB aggressiveness, unit matchups, and success-rate splits — all *population-level* efficiency metrics. Nothing in the corpus estimates hierarchical *player-specific* deviations with expert priors, and nothing does counterfactual personnel reallocation ("what if WR X ran these routes"). The map's methods list (Bradley–Terry, Poisson/Dixon–Coles, state-space, calibration) has no hierarchical-Bayesian player-effect component. This is a **new capability**: uncertainty-aware player-effect estimation fused with scouting priors, plus a transfer-evaluation (FATS-style) framework for trades/free agency.

## 11. GSE implementation spec
- Data: nflverse play-by-play + NGS route/coverage data 2021–2025; "contexts" = targets with route type, coverage, field zone, down/distance (the analog of shot features); "players" = receivers with ≥30 targets (the paper's threshold).
- Expert priors: draft capital + college dominator rating + preseason scouting grades, z-scored and mapped to coefficients (the FM17 analog).
- Model: hierarchical Bayesian logistic (catch) / EPA (linear) model in PyMC with player deviations γ_i ~ N(μ_i, Σ); NUTS, 4 chains, R̂/ESS diagnostics per the paper.
- Counterfactual use: reallocate a free agent's γ onto a team's actual target contexts → E[ΔEPA], Pr(ΔEPA>0), FATS-style scheme-fit score weighted by the team's route-distribution.
- Serving: batch in offseason/preseason for trade/FA target lists; weekly during season for waiver claims.
- Estimated effort: 3–4 weeks for a single engineer (PyMC model + prior construction is the long pole).

## 12. Reproducible test
- Dataset: WR/TE seasons 2021–2024 (nflverse + NGS); fit hierarchical model on 2021–2022; identify receivers who changed teams in 2023.
- Procedure: counterfactual-predict each team-switcher's 2023 EPA/target using his γ on his new team's 2023 target contexts; compare against actual 2023 EPA/target.
- Metric: RMSE of counterfactual predictions; baseline to beat: a no-player-effect (population) model's RMSE on the same switchers.

## 13. Acceptance / rejection gate
ADOPT the hierarchical player-effect + counterfactual framework for GSE personnel evaluation IF (a) player effects improve held-out log-loss by ≥ 1% over the no-player-effect baseline on 2023 data, AND (b) counterfactual predictions for team-switchers beat the population baseline by ≥ 5% RMSE; otherwise REJECT as overfit storytelling. Gate fixed before running.

## 14. Improvement experiment
Add explicit team-scheme covariates (offensive scheme, QB, play-action rate) and multi-season panels with temporal drift on γ_i — the paper's single-season, context-fixed model cannot separate player skill from system fit over time. Test whether scheme-conditioned player effects are more stable year-to-year (higher autocorrelation of γ_i) than the paper's version; if so, the FATS-style fit score becomes a genuine leading indicator of post-trade production rather than a retrospective narrative.
