# 1792 An Analysis of an Alternative Pythagorean Expected Win Percentage Model: Applications Using Major League Baseball Team Quality Simulations (arXiv:2112.14846v1)

**Citation:** Justin Ehrlich, Christopher Boudreaux, James Boudreau, Shane Sanders (2021). *An Analysis of an Alternative Pythagorean Expected Win Percentage Model: Applications Using Major League Baseball Team Quality Simulations*. arXiv:2112.14846v1. URL: https://arxiv.org/abs/2112.14846v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arXiv).

## 1. Research question

Is Bill James's Pythagorean expected-win model — a Tullock (ratio-form) contest success function RS^α/(RS^α+RA^α) — the optimal functional form for mapping runs scored/allowed to expected win percentage, or does a difference-form contest success function (logistic in the run differential) fit better with less misspecification? Tested by simulating 1,000 iterations of the 2014 MLB season (2.43M games) and comparing the two specifications on R², RMSE, and AIC.

## 2. Dataset / schema

- **Simulated:** 1,000 iterations of the 2014 MLB regular season via the open-source Strategic Baseball Simulator (SBS; event-level, roster-statistics-driven). Automation: AutoHotKey script driving the SBS GUI + a Java app parsing season files to CSV. 2.43 million simulated game outcomes (>10× all real MLB games ever played, per the authors).
- **Unit of analysis:** 1,000 simulated team-seasons (30 teams × 1,000 iterations, team fixed effects). Columns: runs scored rs_{i,j}, runs allowed ra_{i,j}, win proportion.
- **Validity check:** fitted Tullock exponent 1.72 matches prior empirical MLB estimates (Dayaratna & Miller 2012), offered as evidence the simulator reproduces the real data-generating process.
- **Access:** replication data at doi:10.7910/DVN/X4ANKJ (Harvard Dataverse); SBS open source.

## 3. Method / model

Two contest success functions (CSFs) for expected win percentage:

1. **Tullock (ratio) form** — the Pythagorean: EWP = rs^α/(rs^α + ra^α), α > 0 = "noise"/determinism parameter (smaller α = noisier contest).
2. **Difference form** — logistic in differential: EWP = 1/(1 + e^{α(ra − rs)}). Novel application to win expectancy (no prior literature, per authors).

Estimation trick: the LHS is a season win *proportion* (non-binary), so logistic regression cannot be used directly. Both models are log-transformed into parameter-linear forms and estimated by OLS with team fixed effects. Model selection by AIC (misspecification-based information loss) via Stata's `estat ic`.

## 4. Equations & assumptions

Equations (quoted exactly as in the paper):

- (1) Original Pythagorean: EWP_{i,j} = rs_{i,j}²/(rs_{i,j}² + ra_{i,j}²).
- (2) General Tullock: EWP_{i,j} = rs_{i,j}^α/(rs_{i,j}^α + ra_{i,j}^α).
- (3) Difference-form CSF: EWP_{i,j} = 1/(1 + e^{α(ra_{i,j} − rs_{i,j})}).
- (4) Fitted Tullock: EWP = rs^{1.72}/(rs^{1.72} + ra^{1.72}).
- (5) AIC ratio: P_T/P_D = e^{(−50,128.41−(−49,671.95))/2} = e^{−228.23} ≈ 7.60×10^{−100}.
- (6) Fitted difference-form: EWP = 1/(1 + e^{0.003(ra − rs)}).

Assumptions stated: SBS event simulation faithfully reproduces the empirical DGP (validated only via the 1.72 exponent match); holding the season constant removes time-series non-stationarity; log-linearization preserves the model comparison; team fixed effects absorb persistent quality differences; a simulated season is "a model of a season, not an actual season" (authors' own caveat).

## 5. Features / target

Inputs: season runs scored, runs allowed (differentials/ratios thereof). Target: season win proportion (continuous in [0,1]). No game-level, opponent-adjusted, or situational features.

## 6. Validation design

No train/test split — this is a model-specification horse race on 1,000 simulated seasons. Comparison metrics: R², AIC, RMSE, all in-sample on the simulated data. The "validation" is the specification test itself (does difference-form minimize AIC?). Realism check is indirect (exponent ≈ empirical 1.72–1.83 range).

## 7. Numerical results / baselines

All numbers are the paper's, quoted exactly (Table 1):

- **Tullock form:** estimated exponent 1.722**** (SE 0.005); R² = 0.826; AIC = −49,671.95; RMSE = 0.106.
- **Difference form:** estimated parameter 0.003**** (SE 0.000006); R² = 0.829; AIC = −50,128.41; RMSE = 0.105.
- **AIC ratio:** P_T/P_D ≈ 7.60×10^{−100} — "exceedingly unlikely" the Tullock form is the best fit.
- (****p < 0.001, two-tailed t-test; N = 1,000 team-seasons.)

Practical note (my inference, labeled as such): the R² gap (0.826 → 0.829) and RMSE gap (0.106 → 0.105) are tiny — the AIC verdict is decisive only because N is effectively huge via simulation. Statistical significance here is not practical significance.

## 8. Code / data availability

Replication data: doi:10.7910/DVN/X4ANKJ. SBS is open source; the AutoHotKey/Java automation scripts are described but no link given. Stata `estat ic` for AIC.

## 9. Leakage & limitations

- **Simulated, not empirical:** all inference is about which CSF best describes *SBS's* data-generating process. If SBS mis-specifies real baseball (e.g., bullpen leverage, platooning), the "better" form may just better approximate the simulator.
- **Tiny practical gap:** ΔR² = 0.003, ΔRMSE = 0.001 — the astronomical AIC ratio is a large-N artifact. For applied win-expectancy work the two forms are near-interchangeable.
- **MLB-only:** baseball's 162-game season makes season win proportion a smooth target; the NFL's 17-game season is far noisier, and the paper says nothing about short-season behavior.
- **No uncertainty on the comparison:** single simulation design (2014 rosters); no bootstrap over simulator randomness reported.
- **Estimation hack:** log-transform + OLS on a fractional outcome is expedient, not efficient — fractional logit (Papke–Wooldridge) would be the modern choice and might shift the AIC comparison.

## 10. GSE overlap

The existing-research map lists Pythagorean expectation as known territory, and the corpus has Elo/Bradley-Terry rating work, but no ledger tests the *functional form* of win expectancy itself. GSE's engine uses team-strength → win-probability mappings (moneyline picks); the choice between ratio-form and difference-form (logistic) mappings is a live modeling decision. The paper's contribution is narrow but real: on 2.43M simulated contests, the logistic-in-differential form wins the specification test. Also notable: the cited Caro & Machtmes (2013) reference tested Pythagorean expectation on **Division I college football** vs the Morey model — a football-specific thread GSE could pull. Not a duplicate: first CSF-specification bake-off in the corpus.

## 11. GSE implementation spec

1. **Win-expectancy form test on NFL data:** using nflverse 2000–2025 team-seasons (points scored/allowed, 17-game seasons), fit both forms — Tullock PF^α/(PF^α+PA^α) and difference-form 1/(1+e^{α(PA−PF)}) — by fractional logit (improvement over the paper's OLS hack), with SOS adjustments.
2. **Use the winner** as GSE's expected-win% feature for luck decomposition (actual − expected wins) in team-strength content and as a prior for early-season ratings when samples are tiny (the logistic form is better-behaved at extreme differentials — relevant for 2–3 game samples).
3. **Short-season stress test:** re-fit on rolling 4-game windows to check which form degrades more gracefully — the paper's MLB result may not survive NFL sample sizes; this is the actual decision-relevant test.
4. Cost: ~1 day (nflverse team-season aggregates already exist in the research stack).

## 12. Reproducible test

Dataset: NFL team-seasons 2010–2024 from nflverse (fit 2010–2019, test 2020–2024). Fit both CSF forms by fractional logit; baselines: each other + a constant (mean win%). Metrics: out-of-sample RMSE on win proportion, log-loss on game-level implied probabilities derived from the expectancy, AIC on the fit sample. Runnable in an afternoon.

## 13. Acceptance / rejection gate

**Adopt the difference-form CSF as GSE's win-expectancy function if** it beats the Tullock form on out-of-sample RMSE by ≥0.005 win-proportion points on 2020–2024 team-seasons AND wins the 4-game rolling-window stress test (lower RMSE in ≥60% of windows); **reject** (keep ratio-form/empirical mappings) otherwise. Either way, the fractional-logit re-estimation replaces the paper's OLS hack before any production use.

## 14. Improvement experiment

**Score-differential CSF with home-field and rest terms:** extend the difference form to EWP = 1/(1+e^{−(α·PD + β·HFA + γ·rest_edge)}), where PD = point differential, HFA and rest_edge are game-level covariates — i.e., turn the season-level expectancy into a *game-level* win-probability function estimated directly on 2000–2025 game outcomes. Hypothesis: the difference form's real advantage appears at game level, where ratio forms blow up on shutouts (division by zero/near-zero). Test: game-level log-loss vs the engine's current moneyline model on 2024–2025; success = log-loss improvement ≥0.002 with no calibration degradation. This converts a descriptive season stat into a predictive game primitive.

**Verdict:** ADAPT
