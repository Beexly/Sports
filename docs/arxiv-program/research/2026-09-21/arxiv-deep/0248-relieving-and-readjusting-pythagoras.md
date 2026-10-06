# [0248] Relieving and Readjusting Pythagoras: An Empirical Study (arXiv:1406.3402v2)

**Citation:** Luo, V., & Miller, S. J. (2016). *Relieving and Readjusting Pythagoras: An Empirical Study*. Williams College. arXiv:1406.3402v2. URL: https://arxiv.org/abs/1406.3402
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, ~3,000 lines; theory, curve-fitting results, χ² tests, conclusions, and Appendix A moments).
**Verdict:** REJECT — a baseball (MLB) paper whose headline improvement evaporates against the baseline that matters, and whose method cannot transfer to the NFL's 17-game seasons.

## 1. Research question
Can the Pythagorean win-loss formula be improved by modeling runs scored/allowed as drawn from a *linear combination* (mixture) of Weibull distributions rather than a single Weibull, while keeping closed-form tractability — and does the improvement beat the simple exponent-tuned formula actually in use?

## 2. Dataset / schema
MLB team-season runs scored/allowed, all 30 teams, 2004–2012 (fit); comparison vs baseball-reference.com's pythWL statistic extended 1979–2013. Per-game runs binned in half-integer bins [−1/2, 1/2), [1/2, 3/2), … (β = −1/2 puts discrete scores at bin centers). 162 games per team-season.

## 3. Method / model
1. **Prior theory (Miller et al.):** runs scored/allowed ~ independent 3-parameter Weibulls (1.2) with common shape γ; gives closed-form P(X>Y) = (RS_obs − 1/2)^γ / ((RS_obs − 1/2)^γ + (RA_obs − 1/2)^γ), γ ≈ 1.8 — the theoretical justification for the empirical 1.83 exponent.
2. **This paper (Theorem 2.2):** model runs scored and allowed as linear combinations of two independent Weibulls (2.4)–(2.5) with common β, γ and weights c_1 + c_2 = 1, c′_1 + c′_2 = 1. Closed-form win probability: P(X>Y) = Σ_{i=1}^{2}Σ_{j=1}^{2} c_i c′_j · α_{RS_i}^γ / (α_{RS_i}^γ + α_{RA_j}^γ) (2.6), proved via the exponential change-of-variables X^{1/γ} (2.8)–(2.9). Generalizes to more components.
3. **Fitting:** 7 free parameters per team-season (α_{RS_1}, α_{RS_2}, α_{RA_1}, α_{RA_2}, γ, c_1, c′_1) by least squares on the binned per-game runs distributions (3.1); method of moments was tried and abandoned as intractable (moments in Appendix A). χ² goodness-of-fit (16 df, Bonferroni-adjusted thresholds 37.7/42.5) and independence tests with structural zeros (109 df; ties impossible).

## 4. Equations & assumptions
- James: W-L% = RS²/(RS² + RA²) (1.1); empirical best exponent ≈ 1.83.
- Weibull density f(x;α,β,γ) = (γ/α)((x−β)/α)^{γ−1} e^{−((x−β)/α)^γ}, x ≥ β (1.2); mean αγ(1+γ^{−1}) + β (2.2); variance α²Γ(1+2γ^{−1}) − α²Γ(1+γ^{−1})² (2.3).
- Mixture win probability (2.6) above; mean constraints (2.7).
**Assumptions:** runs scored/allowed are continuous and mutually independent (χ²-tested, holds modulo structural zeros on the diagonal); common β = −1/2 and common γ across the mixture components required for closed form (unequal γ → incomplete Gamma functions); 162-game samples adequate for 7-parameter fits.

## 5. Features / target
Inputs: season totals and per-game distributions of runs scored/allowed. Target: team win-loss percentage. No horizon (retrodictive fit, not forecasting).

## 6. Validation design
Least-squares fit per team-season 2004–2012; |predicted − observed| wins vs single-Weibull baseline (two-sample t-test, unequal variances); head-to-head vs baseball-reference pythWL 1979–2013 (two-sample t-test); χ² goodness-of-fit and independence tests with Bonferroni correction.

## 7. Numerical results / baselines
- **2011 season:** fitted γ mean 1.83 (sd 0.18, median 1.79) — reproduces the empirical exponent from theory; mean |games off| 2.89 (sd 2.34, median 2.68).
- **2004–2012:** mixture mean games off 3.11 (sd 2.33) vs single Weibull 4.22 (sd 3.03) — ~25% improvement, statistically significant (t-test p < 0.01, 95% CI excludes 0).
- **vs baseball-reference pythWL (1979–2013):** mixture 3.03 (sd 2.21) vs pythWL 3.09 (sd 2.26) — only **0.06 games better, NOT statistically significant** (very large p-value, fail to reject). Era split: pythWL better 1979–1989 (7/11 years); mixture better 1990–2013 (15/24 years, by ~0.3 games when it wins).
- **Simplification attempts failed:** mixture weights highly volatile across teams (c_1 mean 0.21, sd 0.39); fixing γ, c_1, c′_1 and solving moments for the α's gave "significantly worse" predictions — no usable simple formula exists.
- χ² tests: goodness-of-fit passes (only 2011 Texas Rangers marginally out, within Bonferroni bounds); independence of runs scored/allowed holds.

## 8. Code / data availability
Code in the first author's thesis [Luo]; data from publicly available season data (baseball-reference). No package released.

## 9. Leakage & limitations
- **Baseball-only:** run-scoring distributions, 162-game seasons, no-clock dynamics — none of the fitted quantities transfer to football.
- **The comparison that matters fails:** the paper beats the single-Weibull strawman significantly but does *not* significantly beat the one-line formula everyone actually uses (0.06 games, n.s.).
- **Unusable complexity:** 7 parameters per team, volatile weights, minutes of computation per team-season, and the authors' own simplification attempts failed — all the cost of James' formula's simplicity is lost for no significant gain.
- **Sample-size requirement:** the least-squares distributional fit needs ~162 games per team; an NFL season has 17 — a 7-parameter per-team mixture fit on 17 points is not identified in any practical sense.

## 10. GSE overlap
- **Nothing to duplicate:** no Pythagorean-expectation machinery is inventoried in the map, but NFL Pythagorean win expectation (PF^2.37/(PF^2.37 + PA^2.37)) is a textbook baseline, not a research gap — and GSE's team-strength models (Elo-family, EPA-based, market-implied) strictly dominate point-differential summaries.
- **What would have been novel** (a theoretically justified, significantly better Pythagorean) is exactly what the paper fails to deliver: the significant win is over its own single-Weibull variant, not over the deployed formula.

## 11. GSE implementation spec
None — rejected. If a future lane revisits expected-wins-from-point-differential as a luck/regression signal, the correct baseline is the plain exponentiated Pythagorean on NFL data, not this paper's mixture apparatus.

## 12. Reproducible test
- **Data:** nflverse 2020–2025, per-game points for/against (17-game seasons).
- **Test (had it been ADAPT):** fit the 2-Weibull mixture per team-season by least squares and compare |predicted − actual| wins vs plain NFL Pythagorean (exponent fit by least squares, ≈ 2.37). Pre-registered expectation: with 17 games the 7-parameter fit overfits — out-of-sample (leave-one-season-out) it should lose to the 1-parameter formula. This test is documented here as the reason for rejection, not run, since the paper's own MLB result (n.s. vs the simple formula with 162 games) already bounds the upside.

## 13. Acceptance / rejection gate
REJECT stands unless all three hold: (a) a replication on NFL-length seasons shows the mixture significantly beats plain Pythagorean out-of-sample (the paper's MLB evidence says it won't); (b) a stable, low-parameter simplification is found (the authors failed at this); (c) a GSE use case needs distributional run/point modeling beyond what EPA-based team strength already provides. None holds.

## 14. Improvement experiment
- The paper's open problem — a linearizable simplification à la Dayaratna–Miller/Jones–Tappin for the *mixture* formula — is the only path that could make this useful; if solved generally, re-test on NFL point distributions.
- For GSE's purposes, the cheaper experiment with real expected value: Pythagorean residual (actual wins − expected wins) as a next-season regression feature for win-total bets — a classic signal that needs no Weibull machinery and can be tested directly against GSE's existing team-strength features in an ablation.
