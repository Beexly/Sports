# [0674] Application of the Pythagorean Expected Wins Percentage and Cross-Validation Methods in Estimating Team Quality (arXiv:2201.01168)

**Citation:** Christopher Boudreaux, Justin Ehrlich, Shankar Ghimire, Shane Sanders (2021). *Application of the Pythagorean Expected Wins Percentage and Cross-Validation Methods in Estimating Team Quality*. arXiv:2201.01168. URL: https://arxiv.org/abs/2201.01168
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF via https://arxiv.org/pdf/2201.01168, all 8 pages incl. appendix; local cache only had abstract page — full fetched from PDF).
**Verdict:** ADAPT — the serial contest-success function dramatically outperforms the classic Pythagorean exponent on LOOCV; test it as an alternative Pythagorean win-probability form in GSE ratings.

## 1. Research question
Do alternative contest-success functions (CSFs) from contest theory — the difference form and the serial form — improve estimation of team quality (expected wins) over Bill James' original Pythagorean model (restricted Tullock CSF with α=2) and an exponent-optimized version, using MLB 2003–2015 data?

## 2. Dataset / schema
390 team-season observations (13 seasons × 30 MLB teams, 2003–2015): season win proportion, runs scored, runs allowed, sourced from ESPN. Summary: mean wins 80.98 (SD 11.15, range 43–105); mean runs scored 729.24 (SD 81.46); mean runs allowed 729.24 (SD 85.91). Access: public (ESPN standings).

## 3. Method / model
Transform each CSF to be linear in the noise parameter α and estimate via OLS, plus leave-one-out cross-validation for predictive comparison. Forms: (a) original Tullock EWP = rs^α/(rs^α+ra^α) with α=2 restricted; (b) same with OLS α; (c) difference form EWP = 1/(1+e^{α(ra−rs)}); (d) serial form: estimates min(EWP, 1−EWP) = min(rs,ra)^α/(2·max(rs,ra)^α), recovered via anonymity property, α=1.032. Log-linear transforms: Tullock → ln(1/EWP − 1) = α·ln(ra/rs); difference → ln(1/EWP − 1) = α(ra − rs); serial → ln(min(rs,ra)^α/(2max(rs,ra)^α) form per eq. 4b.

## 4. Equations & assumptions
- General Pythagorean: EWP_{i,j} = rs_{i,j}^α / (rs_{i,j}^α + ra_{i,j}^α); James restricted α=2.
- Linearized Tullock: ln(1/EWP − 1) = α·ln(ra/rs).
- Difference form: EWP = 1/(1 + e^{α(ra−rs)}).
- Serial form: min(EWP, 1−EWP) = min(rs,ra)^α/(2·max(rs,ra)^α), α=1.032.
- Assumptions: season = proportional-prize labor contest between a team and its opponents; runs as contest inputs; α>0 as determinism/noise parameter; OLS on transformed linear model is a consistent estimator; LOOCV MSE unbiasedly estimates generalization.

## 5. Features / target
Features: season runs scored, runs allowed (single parameter α per model). Target: season win proportion (or wins).

## 6. Validation design
OLS on all 390 obs (fit: R², RMSE in wins) plus leave-one-out cross-validation over all 390 observations (train on 389, validate on 1, repeat 390×; report root MSE and MAE in wins).

## 7. Numerical results / baselines
OLS estimates (α): Tullock 1.859 (t vs H0=0: 50.07***, vs H0=2: 3.79***), R²=0.866, RMSE 4.069/4.0722 wins; difference 0.00254 (t vs 0: 49.88***), R²=0.865, RMSE 4.081; serial 1.032 (t vs 0: 52.56***, vs 2: 49.31***), R²=0.877, RMSE 3.6836. LOOCV root MSE: Tullock 4.0836, difference 4.0926, serial 3.6964; LOOCV MAE: 3.2807, 3.2932, 2.9357. Serial reduces root MSE ~0.39 wins vs optimized Tullock — 5× the root-MSE reduction achieved by moving from James' restricted α=2 to the OLS-optimized α. Authors: "estimates of team win proportion are typically within approximately .025 units of the true win proportion" (~4 wins/162 games).

## 8. Code / data availability
No code; data from ESPN standings (public).

## 9. Leakage & limitations
MLB only — not yet tested in other leagues (authors flag NFL/NBA as future work). Serial CSF is anonymous/symmetric; can't absorb sport-specific asymmetries (e.g., NFL home field, schedule strength) without modification. LOOCV is within-sample in time (no forward-chaining); α estimated on full sample including future seasons. Single-input (runs) model — ignores everything else. Runs-scored/allowed analog in NFL is points for/against — coarser signal over 17 games vs 162.

## 10. GSE overlap
Existing-research-map has Bradley–Terry/Elo/market-implied ratings but no Pythagorean/CSF treatment. This is new territory for GSE: a principled alternative functional form for points-based win probability, not a duplicate.

## 11. GSE implementation spec
Fit all three CSF forms on NFL points-for/points-against (2015–2024, season-level, 320 team-seasons) with OLS α and compare LOOCV RMSE vs GSE's current Pythagorean exponent; if serial CSF wins, replace the exponent form in the ratings prior. Also test the serial form on per-game spread residuals as a calibration of "luck" (actual minus expected wins) for regression-to-mean features. Effort: ~1 day.

## 12. Reproducible test
Dataset: NFL team seasons 2015–2024. Protocol: fit Tullock/difference/serial CSFs via OLS on points for/against; metric: LOOCV root MSE of season wins. Baseline to beat: optimized Tullock (NFL exponent ~2.37 literature value). Pass criterion: serial CSF root MSE lower with paired difference p<0.05; also report whether expected-wins residual predicts next-season win improvement (slope>0, p<0.05).

## 13. Acceptance / rejection gate
Adopt the serial CSF in GSE ratings if on 2015–2024 NFL data its LOOCV win-RMSE beats optimized Tullock by ≥0.2 wins with p<0.05; keep Tullock form otherwise. Reconsider only with a hierarchical version pooling α across teams.

## 14. Improvement experiment
Hierarchical Bayes extension: team-season random effects on α plus schedule-strength adjustment (opponent points rates) inside the serial form; test on 2020–2024 whether posterior expected-wins residual adds predictive signal for second-half ATS performance beyond the point estimate.
