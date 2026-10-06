# 1164 When Social Influence Promotes the Wisdom of Crowds (arXiv:2006.12471)

**Citation:** Abdullah Almaatouq, M. Amin Rahimian, Jason W. Burton, Abdulla Alhajri (2021). *When social influence promotes the wisdom of crowds*. arXiv:2006.12471v3. URL: https://arxiv.org/abs/2006.12471
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, v3, 16 pp + SI, via arxiv.org/pdf).
**Verdict:** ADAPT

Adapt the R (heavy-tailedness) diagnostic: measure whether each game's cross-model prediction distribution is heavy-tailed vs thin-tailed, and choose the aggregation regime per game — equal-weighted mean when thin-tailed, concentrated (top-skill-weighted) aggregation when heavy-tailed.

## 1. Research question
Under what conditions does a centralized influence structure (upweighting a few agents) produce better collective estimates than a fully decentralized one (equal weights)? The paper argues the answer depends on the interaction between network centralization and the distribution of initial estimates ("estimation context"), reconciling conflicting prior results on social influence.

## 2. Dataset / schema
Reanalysis of four published human experiments (Lorenz et al. 2011; Becker et al. 2017; Gürcay et al. 2015; Becker et al. 2019): 2,885 participants, 99 independent groups, 54 estimation tasks, 15,562 individual estimations, 687 collective estimations. Schema: per task, each participant's initial (pre-interaction) and revised (post-interaction) numeric estimate of a positive quantity; tasks span visual estimation, trivia, political facts, economic forecasts. Procedure: (1) independent estimates, (2) social interaction in groups, (3) revision. Analysis subsets: 678 group-level observations for the logistic regression (groups with social influence); 687 observations for the linear regression (582 with / 105 without social influence).

## 3. Method / model
- Collective estimate as convex combination of initial estimates: a_n(w̄) = Σ_i w_i a_{i,0}, w ordered decreasing. Simple mean = ω=0 case.
- Centralization parameter ω ∈ [0,1]: a_n(ω) = ω·a_{1,0} + (1−ω)·(1/n)Σ_i a_{i,0}. ω=0 fully decentralized; ω=1 dictatorial. ω matches Freeman centralization for star/circular-lattice networks (star → ω=(n−2)/(3n−2) → 1/3 as n→∞).
- Estimation context: initial estimates i.i.d. from F^θ_{μ,σ}, parametrized by truth θ, systematic bias μ (location), dispersion σ (shape/tail).
- Outcome of interest: Ω_n(ω, F^θ_{μ,σ}) = P(|a_n(ω)−θ| < |a_n(0)−θ|) — probability centralized beats decentralized.
- Empirical feature R: relative log-likelihood of a fitted log-normal vs a fitted normal on the initial estimates per task. R=0 → certainly normal (thin-tailed); R=1 → certainly log-normal (heavy-tailed); R=0.5 → indistinguishable. Needs no knowledge of θ.
- Regressions: logistic — y_ij = 1/(1+exp(β0 + β1 R_j + v_i + ε_ij)), y_ij = 1 if group i improved after social interaction (678 obs); linear — y_ij = β0 + β1 R_j + β2 I_i + β3 I_i R_j + v_i + ε_ij, y = z-scored absolute error of revised collective estimate, I_i = social-interaction indicator (687 obs).

## 4. Equations & assumptions
- a_n(ω) = ω a_{1,0} + (1−ω)(1/n)Σ a_{i,0}; Ω_n := P^θ_{μ,σ}[|a_n(ω)−θ| < |a_n(0)−θ|].
- Lower bound (SI §S2.1, proved): Ω_n(ω, F^θ_{μ,σ}) ≥ sup_{β > θ/(1−ω)} F^θ_{μ,σ}(β)·(1 − F^θ_{μ,σ}(nβ)^{n−1}).
- Phase transitions (paper's claim): for heavy-tailed F (Pareto, log-normal, log-Laplace), the bound's limit transitions 0→1 or 1/2 as shape σ crosses a critical value. Intuition: decentralized mean is dominated by egregious tail errors; a centralized weight guarantees some agents exert non-vanishing influence, damping tail risk. This violates the Golub–Jackson "vanishing influence" condition — deliberately.
- Log-normal simulations (n=50, ω=1/3, θ=2): Ω_n > 1/2 (centralization wins) under overestimation bias or large dispersion; reversed (decentralization wins) under low dispersion + underestimation bias.
- Assumptions: initial estimates i.i.d. given context; collective estimate is a convex combination (covers DeGroot consensus, many aggregation rules); non-negative estimation tasks; random placement of agents in the network; truth fixed per task.

## 5. Features / target
Inputs: per-task vectors of initial estimates (humans). Derived feature: R (log-normal vs normal relative likelihood). Target: (a) Ω (binary improvement after social interaction), (b) z-scored absolute error of revised collective estimate.

## 6. Validation design
Theory: analytic lower bound + numerical phase-transition plots for Pareto/log-normal/log-Laplace vs thin-tailed families. Empirics: mixed-effects regressions on the reanalysis (random group effects for nesting); two-tailed tests; robustness checks in SI §S4 (including ω sensitivity). No train/test split — reanalysis of completed experiments; the R feature is computed from initial estimates only (pre-interaction), so no post-hoc leakage into the treatment indicator.

## 7. Numerical results / baselines
- Majority of the 54 empirical estimation contexts are better described by heavy-tailed (log-normal) than thin-tailed (normal) distributions (Fig. 3B).
- Logistic regression: R substantially explains probability of group improvement after social interaction — z-statistic = 5.26, p < 0.001 (exact).
- Linear regression: interaction of centralization × R on absolute error: β = −4.97, t = −3.95, p < 0.001 (exact). Effect reversal: when R < 0.5, error lower in decentralized structures; when R > 0.5, error lower in centralized structures (Fig. 3D, 95% CIs).
- Log-normal numerical: Ω_n > 1/2 regions = high dispersion or overestimation bias; Ω_n < 1/2 = low dispersion + underestimation bias.
- No single influence structure is best in all contexts — the context-dependent framework reconciles prior conflicting findings.

## 8. Code / data availability
Data and code: https://github.com/amaatouq/task-dependence (stated in paper).

## 9. Leakage & limitations
- Human estimation tasks (trivia, visual estimation), not probabilistic sports forecasts; models are not humans and don't have "influence" dynamics.
- The paper's "centralization" maps to deliberately concentrating weight on one agent — for GSE, the analog is weighting, not social process; the mechanism story doesn't transfer, only the statistical selection rule.
- R requires a batch of initial estimates per task (per game, GSE has ~5–15 model probabilities — small for distribution fitting).
- i.i.d. assumption: GSE models are correlated (shared data/features), violating the clean theory; the empirical R rule is the usable part, not the bound.
- Only non-negative estimation tasks studied; outcome of interest is P(centralized closer), not expected MSE (authors acknowledge).
- ω=1/3 choice motivated by star topology; robustness checks in SI but the exact threshold R=0.5 crossover is empirical, not sharp.

## 10. GSE overlap
Extension, not duplicate. Complements ledger 1163's γ=ε−δ diversity diagnostic: 1163 decomposes where ensemble error comes from (variance of predictions); 1164 prescribes which weighting regime to use based on the shape (heavy-tailedness) of the prediction distribution. No GSE repo file currently selects ensemble weights per game from the cross-model prediction distribution.

## 11. GSE implementation spec
Adapt R as a per-game aggregation-regime switch:
1. For each game and market, collect the M model probabilities {p_j} (M ≈ number of GSE component models + market-implied + analyst picks).
2. Fit normal and log-normal distributions to {p_j} by MLE; compute R = LL_lognormal − LL_normal mapped to (0,1) via the paper's relative-likelihood convention (or simply the likelihood-ratio statistic). No truth needed.
3. Regime: R < 0.5 → equal-weighted mean aggregation; R ≥ 0.5 → concentrated aggregation (e.g., softmax weights on recent model skill, or top-3 skill-weighted mean).
4. Log-normal on probabilities in (0,1): transform via logit first, then compare normal vs log-normal on |logit| — adapt because the paper's support is positive reals.
5. Backtest both regimes vs fixed-regime baselines on 2024–2025 seasons. Effort: ~1 day (scipy MLE + harness).

## 12. Reproducible test
Dataset: 2024–2025 NFL regular-season games, per-game component-model probabilities from the picks table. Protocol: for each game-week, compute R from that week's cross-model probabilities; apply regime rule; aggregate; score Brier/log-loss vs (a) always-equal-weight and (b) always-concentrated. Time-ordered: R and any skill weights use only past weeks. Metric: full-season mean Brier per market; headline = improvement over the better of the two fixed regimes.

## 13. Acceptance / rejection gate
ADOPT the regime switch if 2025-season mean Brier beats the better fixed regime by ≥2% on at least 2 of 3 markets (spread/ML/total) AND the R≥0.5 fraction of games is between 10% and 60% (the rule must actually discriminate, not collapse to one regime). REJECT if the switch matches the better fixed regime within noise (<1%) or if R is degenerate (nearly always <0.5 or ≥0.5) — the heavy-tailed regime may simply not occur with M≈10 correlated models.

## 14. Improvement experiment
Beyond the paper: make ω continuous in R — use weight concentration as a smooth function of heavy-tailedness, e.g., softmax temperature τ(R) decreasing in R (colder = more concentrated when tail risk is high). Compare against the paper's binary R≥0.5 switch. Hypothesis: the binary switch misfires near the boundary; a smooth τ(R) interpolates and should weakly dominate on log-loss, which punishes misfires hardest.
