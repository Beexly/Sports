# [0721] Distributed lag models to identify the cumulative effects of training and recovery in athletes using multivariate ordinal wellness data (arXiv:2005.09024v1)

**Citation:** Erin M. Schliep, Toryn L.J. Schafer, Matthew Hawkey (2020). *Distributed lag models to identify the cumulative effects of training and recovery in athletes using multivariate ordinal wellness data*. arXiv:2005.09024v1. URL: https://arxiv.org/abs/2005.09024v1
**Ledger completed:** 2026-09-21. **Read:** full text via local cache /tmp/arxiv750-cache/fulltext/2005.09024.txt (328 lines, full: abstract, §1 intro, §2 data, §3 model incl. identifiability/priors/inference, §4 application results, §5 discussion, references).
**Verdict:** ADAPT — hierarchical Bayesian distributed-lag model for cumulative workload/recovery effects on athlete wellness is directly transferable to GSE's injury/availability lane, with individual-specific lag structures replacing one-size-fits-all rest features.

## 1. Research question
Can we identify the short- and long-term cumulative effects of training workload and recovery on athlete wellness — without collapsing multivariate ordinal wellness data into an unweighted average — using a joint Bayesian latent-factor distributed-lag model with individual-specific effects?

## 2. Dataset / schema
Daily wellness/training/recovery for 20 professional MLS referees, 2015–2016 seasons (Feb 1–Oct 30), 170–467 days per individual. Wellness: 6 ordinal self-report metrics (energy, tiredness, motivation, stress, mood, appetite), raw 1–10 collapsed to 5 categories via individual-specific k-means (inference robust to transformation choice). Training: duration (hrs) + RPE (0–10); **workload = RPE × duration** (Foster et al.). Recovery: sleep quantity (hrs) + quality (1–10); **recovery = first PC of sleep metrics** (64–94% variance). 3–44 matches officiated per referee (avg 28). Bi-weekly training camps. No sports betting data; referees, not players.

## 3. Method / model
Cumulative probit (Albert & Chib 1993) on ordinal Z_ijt ∈ {1..5} via latent continuous Z̃_ijt = μ_ijt + ε_ijt, ε_ijt ~ N(0,σ²_ij), with ordered thresholds θ_ij^(k). **Univariate latent factor:** μ_ijt = β_0ij + β_1ij Y_it. **Bivariate:** μ_ijt = β_0ij + Σ_m β_mij Y_mit. **Distributed lag:** Y_it = Σ_{l=0}^{L} (X_1i,t−l α_1il + X_2i,t−l α_2il) + η_it, η_it ~ N(0,τ²_i), L=10 days. **Hierarchical borrowing:** α_mil ~ N(α_ml, ψ_ml) — global mean lag curves with individual-specific deviations. Priors: α_ml ~ N(0,10); variances Inverse-Gamma(0.01,0.01); Dirichlet(10,10) split on (σ²,τ²); log-gap N(0,1) thresholds. Inference: hybrid Metropolis-within-Gibbs, 100k iterations, 20k burn-in. Identifiability: θ^(1)=0, β_11=1, shared thresholds across individuals per metric. Inference measures: C_j = corr(Z̃_j, Y) and **relative importance R_j = |C_j|/Σ|C_j'|** (model-based metric weights, replaces equal 1/J averaging).

## 4. Equations & assumptions
- (2) Z̃_ijt = μ_ijt + ε_ijt, ε_ijt ~ N(0,σ²_ij); (1) ordinal mapping via thresholds.
- (5) Y_it = Σ_{l=0}^{L}(X_1i,t−l α_1il + X_2i,t−l α_2il) + η_it — smooth interpretable lag curves allowing positive and negative effects at different lags (deliberately NOT Dirichlet-constrained ecological memory).
- (9) R_j = |C_j|/Σ_j'|C_j'|; (10) R_jm for bivariate factors.
- Assumptions: lagged coefficients constant in time (authors flag as limitation — fitness changes seasonally); probit link; shared metric thresholds across individuals; referee cohort generalizes to athletes.

## 5. Features / target
Inputs: workload (RPE×duration) and recovery (sleep PC1), 10 lag days. Targets: 6 ordinal wellness metrics via latent factors.

## 6. Validation design
Fit on full referee data; posterior 95% credible intervals on lag coefficients; individual-level inference; no holdout prediction test — this is an inference paper, not a forecasting benchmark.

## 7. Numerical results / baselines
(quoted exactly)
- Global: **workload negatively related to wellness; lag 1 most significant** (acute effect — heavy workload yesterday → lower wellness today). **Recovery positively related, significant at lags 1–5** (longer-lasting than workload).
- Individual variation large: Athletes A and B show significant negative workload effects at lags 1–2; Athlete C and D do not; **Athlete D shows a positive workload→wellness relationship**; some athletes show positive workload effects at long lags (lag 9 for A, lags 7–9 for B).
- Relative importance: **energy exceeds 1/6 for all four profiled athletes**; appetite negatively correlated for Athlete B; A/B unequal weighting (mood/energy/tiredness), C/D near-equal; stress high for workload / low for recovery (Athlete D); none of the six metrics uniformly insignificant.
- Match-day patterns: Athlete A wellness highest on match day; B lower the day after; D higher the day after.
- No predictive accuracy numbers — inference via credible intervals only.

## 8. Code / data availability
None stated. Data: proprietary referee program (not shared).

## 9. Leakage & limitations
- Paper's own: lagged coefficients assumed constant in time (fitness/recovery needs change seasonally — planned future work); **subjects are referees, not competing athletes** (match-day physical demands differ); no out-of-sample predictive validation.
- Additional: MCMC 100k iterations is slow for production; k-means category collapse is individual-specific (not portable); n=20 small cohort.

## 10. GSE overlap
New territory in the corpus: the **injuries/causal lane**. GSE's injury features are currently heuristics; this supplies the formal hierarchical structure: cumulative workload distributed lags + individual-specific lag curves + hierarchical borrowing across players. Directly applicable to NFL injury-risk and availability modeling (snap counts, travel, rest days, short weeks). The relative-importance R_j is a principled replacement for any unweighted averaging of availability signals. Bayesian hierarchical — matches the replacement-keyword territory too.

## 11. GSE implementation spec
1. Build per-player availability model: inputs — snap counts × intensity proxy (workload), days since last game + travel + short-week flags (recovery); 10-game rolling lags; hierarchical partial pooling across players within position group (α_mil ~ N(α_ml, ψ_ml)).
2. Target: binary availability / injury designation (or ordinal practice-participation status: full/limited/DNP — probit matches the paper exactly).
3. Use posterior relative importance R_j to weight multiple availability signals instead of equal weights.
4. Operationalize: flag players whose current workload-lag profile sits in the high-risk region (posterior predictive probability of limited/DNP above threshold) → adjust or withhold picks on their games.
Effort: 1–2 weeks Bayesian modeling + data assembly.

## 12. Reproducible test
Dataset: NFL injury reports 2022–2025 with snap counts, rest/travel features. Fit hierarchical distributed-lag model on 2022–2024; held-out 2025 test: does the model's posterior injury/availability probability predict DNP/limited status better than a pooled logistic baseline (AUC) and does it add signal to the pick engine when used as an availability adjustment?

## 13. Acceptance / rejection gate
ADOPT if held-out 2025 availability AUC beats the pooled baseline by ≥3 pp AND individual lag curves show meaningful heterogeneity (ψ_ml significantly >0) — the heterogeneity is the paper's core claim. REJECT if lag curves collapse to a single global curve with no individual signal — then pooled features suffice.

## 14. Improvement experiment
Implement the paper's own planned future work: **time-varying lag coefficients** α_ml(t) that change with season phase (early vs mid vs late season) — the paper explicitly says fitness-dependent lag effects are the open question, and NFL season phases make this testable. Also: replace MCMC with variational inference for weekly production runs.
