# [0519] First Order Approximations of the Pythagorean Won-Loss Formula for Predicting MLB Teams' Winning Percentages (arXiv:1205.4750v1)

**Citation:** Dayaratna, K.D. and Miller, S.J. (2012). *First Order Approximations of the Pythagorean Won-Loss Formula for Predicting MLB Teams' Winning Percentages*. arXiv:1205.4750v1. URL: https://arxiv.org/abs/1205.4750v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, ~20,451 chars).
**Verdict:** ADAPT — the Taylor-linearized Pythagorean (β = γ/(4·R_avg)) gives a closed-form run-differential-to-win-% coefficient usable in NFL point-differential models, but must be re-fit per-sport (NFL γ and scoring scales differ from MLB).

## 1. Research question
Jones and Tappin (2005) showed the linear model WP = 0.500 + β(RS − RA) predicts MLB winning percentage well but β had no theoretical basis. The paper proves this linear model is simply the first-order (tangent-plane) multivariate Taylor approximation of Bill James's Pythagorean formula WP ≈ RS^γ/(RS^γ + RA^γ) expanded about (R_avg, R_avg), which pins the slope to β = γ/(4·R_avg), and verifies empirically on 20 MLB seasons (1991–2011) that implied γ̂ is consistent with the accepted γ ≈ 1.82.

## 2. Dataset / schema
- MLB seasonal team data, 1991–2011 (20 seasons, 30 teams/season → 600 team-seasons), scraped from BaseballAlmanac.com (script written by Eric Fritz; access: public baseball-almanac.com / MLB.com standings). Schema: per team-season: runs scored (RS), runs allowed (RA), observed winning percentage (WP), league average runs (R_avg). Secondary reference: Jones & Tappin (2005) β estimates from 1969–2003 (β ranged 0.00053–0.00078, mean 0.00065), cited not re-estimated.

## 3. Method / model
- Analytic proof: first-order multivariate Taylor expansion of f(x,y) = x^γ/(x^γ + y^γ) about (R_avg, R_avg), yielding WP ≈ 0.500 + [γ/(4R_avg)](RS − RA). A second, single-variable proof via the logit-style transform u = ln(RS), v = ln(RA), exponential/geometric-series/log(1+x) linearizations is given in the Appendix, arriving at the same result.
- Empirical: OLS of WP on (RS − RA) per season with intercept constrained/estimated at α = 0.500; per-season γ̂ recovered via γ̂ = β̂·4·R_avg; 95% CIs on γ̂ with Bonferroni correction (α = 0.05/20 = 0.0025).

## 4. Equations & assumptions
- Pythagorean: WP ≈ RS^γ / (RS^γ + RA^γ).
- Linear predictor: WP = 0.500 + β(RS − RA).
- Taylor result: β = γ / (4·R_avg).
- Partial derivatives at (R_avg, R_avg): ∂f/∂x = γ/(4·R_avg), ∂f/∂y = −γ/(4·R_avg).
- Appendix identity: WP = (1 + (RA/RS)^γ)^−1 ≈ 1/2 + (γ/4)(ln RS − ln RA) ≈ 1/2 + (γ/(4·RA))(RS − RA), with RA → R_avg to first order.
- Stated assumptions: some fixed exponent γ exists; RS, RA near league average so deviations (RS − R_avg) are small (Taylor valid); RA in the denominator replaceable by R_avg to first order; linear range stays in [0,1] for observed MLB data. (The paper's derivation assumes independence of RS/RA only in the referenced Miller 2007 derivation, not in the Taylor proof itself.)

## 5. Features / target
- Feature: per-season run differential (RS − RA) (single feature); R_avg is a league constant used in coefficient interpretation.
- Target: observed team winning percentage (WP), continuous in [0,1]; prediction horizon: full-season retrospective fit.

## 6. Validation design
- Retrospective per-season OLS fits over 1991–2011 (no forward prediction, no time-ordered train/test split); validation is the per-season R² of the linear fit plus coverage of the benchmark value 1.82 by the 95% CI of γ̂ (Bonferroni-corrected). Baseline comparison: implicit — the nonlinear Pythagorean form vs. its linear approximation, plus agreement with Jones & Tappin's 1969–2003 β range and Miller (2007) γ ≈ 1.82.

## 7. Numerical results / baselines
- Per-season β̂ ranges 0.084–0.126 (1991: β̂=0.119, R²=0.922; 2010: β̂=0.094, R²=0.950; 2011: β̂=0.104, R²=0.867); full table of 20 seasons reported (R² from 0.807 to 0.950).
- Recovered γ̂ ranges 1.634 (2010) to 2.108 (2004); every season's 95% CI except 2010 contains 1.82; with Bonferroni correction the 2010 CI widens to [1.399, 1.870], which also contains 1.82 (paper's claim: all 20 CIs consistent with 1.82 after correction).
- All coefficient estimates significant at the Bonferroni-corrected level 0.0025.
- Jones & Tappin historical check: β̄=0.00065 with γ=1.81 implies 696 runs/team/year (vs. observed scale ~4.3 runs/game — matches); 2010 AL average (721 runs) with β̄ implies γ̂ ≈ 1.88.

## 8. Code / data availability
None stated (no code link, no downloadable dataset; data source cited as BaseballAlmanac.com and MLB.com).

## 9. Leakage & limitations
- Retrospective in-sample OLS per season: no out-of-sample prediction tested; R² is descriptive fit on the same data used to estimate β — data-snooping risk if used as a "predictor" claim.
- MLB-only: the γ ≈ 1.82 constant and R_avg scale are baseball-specific; the paper suggests other sports in future work but does not test them — NFL point differentials have different scales, and the linear approximation degrades farther from league average (extreme differentials).
- Cross-reference (my inference, not a paper flaw): Miller (2007)'s Weibull-derivation assumes independent RS/RA; the Taylor proof here does not require independence, but any practical use inherits the usual Pythagorean caveat (close-game/clustered-scoring effects).
- Twenty per-season regressions with Bonferroni: per-season n=30 teams is small; CIs are wide (e.g., 2010 uncorrected [1.489, 1.780] spans 0.29).

## 10. GSE overlap
- New capability — no duplicate. Existing research map: Pythagorean-style formulas are inventoried (Harville, Stern, Bradley-Terry, Poisson, Dixon-Coles listed among "metrics inventoried") and Garrett's repo has Pythagorean-type expected-win work (competitor-scrape), but no ledger covers the linearized β = γ/(4·R_avg) form or a derived closed-form differential-to-win% coefficient with CI verification. Extension of the existing expected-win/ratings lane, not a duplicate.

## 11. GSE implementation spec
- Re-fit the linearized Pythagorean on NFL: OLS of season (or rolling N-game) win% on point differential for 2000–2025 nflverse seasons; recover γ̂_NFL = β̂·4·P_avg (P_avg ≈ NFL league-average points/team/season ≈ 22.5×17). Compare γ̂_NFL to football-accepted ~2.37 and to a direct nonlinear Pythagorean fit; check CI overlap like the paper.
- Use: (a) sanity-check/regularization target for GSE team-strength ratings — shrink rating-implied win% toward the Pythagorean expectation; (b) quick expected-win conversion for point-differential projections in moneyline modeling; (c) luck metric: actual wins − Pythagorean expected wins (turnover-luck lane already exists; Pythagorean residual is a standard complement).
- Effort: ~0.5 day (one nflverse script, one doc page).

## 12. Reproducible test
- Dataset: nflverse play-by-play/team data 2015–2024 seasons, team-season points for/against and win%.
- Metric: mean absolute error of predicted win% (a) linear-Taylor form with γ̂ fit in-sample on 2015–2019, tested forward on 2020–2024, vs. (b) direct nonlinear least-squares Pythagorean fit with the same protocol.
- Baseline: naive β from the per-season OLS of the test window itself (in-sample ceiling).

## 13. Acceptance / rejection gate
- ADAPT-accept if γ̂_NFL estimated from the Taylor inversion on 2015–2019 falls within [2.0, 2.8] (football-plausible range) AND forward MAE on 2020–2024 is within 0.01 wins-equivalent of the nonlinear fit; REJECT for GSE use if the linear form's forward MAE is >0.02 worse than the nonlinear fit (Taylor breakdown at NFL scoring scale).

## 14. Improvement experiment
- Second-order Taylor expansion (the paper explicitly lists this as future work): add the Hessian term (½·f_xx·(RS−R_avg)² + f_xy·(RS−R_avg)(RA−R_avg) + ½·f_yy·(RA−R_avg)²) and test whether the quadratic correction captures close-game clustering effects on NFL data better than the first-order form — a quadratic Pythagorean could beat both forms on teams with extreme differentials.
