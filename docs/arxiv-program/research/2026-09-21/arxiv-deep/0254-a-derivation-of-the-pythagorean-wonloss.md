# [0254] A Derivation of the Pythagorean Won-Loss Formula in Baseball (arXiv:math/0509698v4)

**Citation:** Miller, S. J. (2007). *A Derivation of the Pythagorean Won-Loss Formula in Baseball*. Journal of Theoretical Probability. arXiv:math/0509698v4. URL: https://arxiv.org/abs/math/0509698
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3874 lines).
**Verdict:** REJECT — a rigorous but purely theoretical derivation of baseball's Pythagorean formula from Weibull score distributions; the NFL analogue (points-differential win expectancy) is a decades-old known quantity and the derivation adds no estimable parameter, data, or edge to GSE's rating stack.

## 1. Research question
Can Bill James' Pythagorean won-loss formula, W% = RS_obs^γ / (RS_obs^γ + RA_obs^γ), be derived from first principles rather than treated as an empirical curiosity — specifically, by modeling runs scored and allowed per game as independent Weibull draws — and does the theoretically implied exponent γ match the empirically best-fit value (≈1.82) on real MLB data?

## 2. Dataset / schema
2004 American League season, all 14 teams' game-by-game runs scored and runs allowed (public baseball data, read from the web by the author's script; input by Kevin Dayaratna). Schema per game: runs scored (integer), runs allowed (integer); binned for fitting. National League left as an exercise.

## 3. Method / model
- Runs scored and runs allowed per game modeled as independent continuous random variables drawn from three-parameter Weibull distributions with shared shape γ and shift β but team-specific scales α_RS, α_RA; β fixed at −0.5 (continuity correction for integer scores).
- Theoretical derivation: P(Win) = P(X > Y) for independent Weibulls X ~ (α_RS, β, γ), Y ~ (α_RA, β, γ) yields, via the Weibull CDF and the change of variables in Lemma 2.1 / Theorem 2.2, the Pythagorean form (RS−β)^γ / ((RS−β)^γ + (RA−β)^γ), where RS, RA are the Weibull means and (RS−β), (RA−β) estimate the observed per-game averages.
- Empirical fitting per team: (a) least squares on binned run distributions (minimizing squared error of runs-scored bins + runs-allowed bins, 3 free parameters α_RS, α_RA, γ); (b) maximum likelihood on the same bins.
- Validation: χ² goodness-of-fit of the fitted Weibulls (bins [0,1),[1,2),…,[11,12),[12,∞); 20 df, 95% critical threshold 31.41), and a modified χ² independence test for runs scored vs allowed on a 12×12 contingency table with structural zeros on the diagonal (baseball games cannot end tied; df = (12−1)² − 12 = 109), using the Bishop–Fienberg iterative proportional fitting procedure (Eq. 3.7) for expected cell counts.

## 4. Equations & assumptions
- Weibull pdf: f(x; α, β, γ) = (γ/α)·((x−β)/α)^{γ−1}·e^{−((x−β)/α)^γ} for x ≥ β, 0 otherwise.
- Pythagorean formula: W% = RS_obs^γ / (RS_obs^γ + RA_obs^γ) (Eq. 1.1); derived form: (RS−β)^γ / ((RS−β)^γ + (RA−β)^γ) (Theorem 2.2).
- Lemma 2.1: mean μ_{α,β,γ} and variance σ²_{α,β,γ} of the three-parameter Weibull (used to connect fitted α to observed RS/RA means).
- χ² fit statistic: Σ_k (RS_obs(k) − #Games·A(α_RS,−.5,γ,k))² / (#Games·A(…)) + same for RA (Eq. 3.x).
- Independence test: Σ_{r≠c} (O_{r,c} − E_{r,c})² / E_{r,c} with E fitted iteratively (Eq. 3.7).
- Assumptions: runs scored and allowed are independent given they cannot be equal; both Weibull with identical β and γ; games are exchangeable within a season; β = −0.5 fixed.

## 5. Features / target
Inputs: team's observed per-game runs scored and allowed distributions (binned). Target: team's won-loss percentage; intermediate estimands: Weibull parameters (α_RS, α_RA, γ) per team. No covariates, no time dynamics.

## 6. Validation design
No train/test split and no out-of-sample prediction; validation is goodness-of-fit (χ² for the Weibull marginals, modified χ² for independence) on the same 2004 AL data used for fitting, plus a parameter-recovery check: the fitted γ's mean vs the independently known empirical best exponent 1.82, and predicted vs observed win totals per team.

## 7. Numerical results / baselines
Fitted exponent: least squares mean γ = 1.79 (SD 0.09, median 1.79); maximum likelihood mean γ = 1.74 (SD 0.06, median 1.76) — both within noise of the empirical best 1.82 ("agree beautifully"). Win-total accuracy: LS mean signed error +0.19 wins (SD 5.69, median 0.07), mean absolute error 4.19 (SD 3.68, median 3.22); ML mean signed error −0.13 (SD 7.11, median 0.19), mean absolute error 5.77 (SD 3.85, median 6.04) — "accurate to about four games in a 162-game season."
GOF: Weibull marginal fits pass at 95% for all teams except Toronto Blue Jays' runs scored/allowed (χ² 41.18 vs 41.14 threshold — a bare miss); independence of RS/RA passes for all teams except the Chicago White Sox (164.8 vs 171.6 at 99%; 153.07 vs 152.9 at 95% — bare misses), with a multiple-comparisons adjustment noted. The author concludes the independence assumption is validated. Future-work note: football's 16-game season is too short for this analysis; basketball/hockey (82 games) are suggested as follow-ups. All numbers are the paper's claims on 2004 AL data.

## 8. Code / data availability
No code or data link stated; data read from the web (public baseball scores).

## 9. Leakage & limitations
- In-sample everything: parameters fit and validated on the same 14 team-seasons; no out-of-sample win prediction is ever tested, so the "derivation" is validated only as a distributional fit, not as a forecasting tool.
- β = −0.5 is fixed by fiat (continuity correction), not estimated; γ absorbs any misspecification.
- Independence is tested with a heavily modified χ² on binned data with structural zeros — the two near-misses (Blue Jays, White Sox) are waved through with a multiple-comparisons argument that cuts both ways.
- Home-team-doesn't-bat-in-bottom-9th truncation (cited from [Ci]) biases run distributions and is acknowledged but not modeled.
- Baseball-specific: 162-game seasons make the asymptotics comfortable; the paper itself notes football's 16-game season is too short for the analysis — a direct admission of non-transferability to the NFL.
- External validity to GSE: none. NFL win expectancy from point differential is a textbook quantity (covered by Massey/Sagarin/Elo in the repo inventory); no GSE lane needs a Weibull derivation of it, and the paper offers no data, parameter, or code to import.

## 10. GSE overlap
Duplicate concept, no new capability. Point-differential-based win expectancy is ancient NFL analytics and sits inside the inventoried ratings family (Massey, Sagarin, Elo, SRS — all point-differential methods) in the existing-research map. The Weibull derivation is a theoretical nicety about baseball run distributions, not an estimation technique GSE can reuse: NFL scores are not Weibull-distributed in the paper's sense and the 17-game season breaks the asymptotics (the author's own caveat). Nothing to build on.

## 11. GSE implementation spec
None — REJECT, no build.

## 12. Reproducible test
Not applicable — REJECT. (Reproduction: re-fit Weibull γ on 2004 AL game scores and compare predicted vs observed wins; public data, but the exercise has no GSE application.)

## 13. Acceptance / rejection gate
REJECT stands. Reconsider only if a theoretical result of this form were shown to tighten an NFL win-expectancy estimate beyond current point-differential methods on a real prediction task — the paper itself provides no such test.

## 14. Improvement experiment
Within the paper's own frame: run the identical Weibull-fit + independence-test pipeline on the National League 2004 (the paper's "exercise for the reader") and on multiple seasons pooled, then test out-of-sample: fit γ on seasons 1995–2003, predict 2004 team win totals, and compare against the naive empirical-γ=1.82 Pythagorean baseline on MAE — this would convert the paper from an in-sample derivation into an actual forecasting claim, which it currently never makes.
