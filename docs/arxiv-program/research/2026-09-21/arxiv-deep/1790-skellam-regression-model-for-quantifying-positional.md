# 1790 A Skellam Regression Model for Quantifying Positional Value in Soccer (arXiv:1807.07536v5)

**Citation:** Konstantinos Pelechrinis, Wayne Winston (2020). *A Skellam Regression Model for Quantifying Positional Value in Soccer*. arXiv:1807.07536v5. URL: https://arxiv.org/abs/1807.07536v5
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).

## 1. Research question

Can the final score differential of a soccer game be modeled directly — sidestepping the correlation between the two teams' goal processes — with a Skellam regression on lineup-strength covariates, producing well-calibrated win/draw/loss probabilities that (a) serve as a pre-game win-probability model sensitive to starting lineups, and (b) translate into an expected-league-points-above-replacement (eLPAR) metric for valuing positions and players against their salaries?

## 2. Dataset / schema

- **Games:** Kaggle European Soccer Database — 21,374 games across 11 European leagues (EPL, Bundesliga, Serie A, Scottish PL, La Liga, Swiss Super League, Jupiler League, Ligue 1, Eredivisie, Liga Zon Sagres, Ekstraklasa), seasons 2008-09 to 2015-16. Per game: final score, starting lineups.
- **Player ratings:** FIFA video-game overall ratings (0–100), ~11,060 players, ~2 readings/season, positions scraped from sofifa.com.
- **Salaries:** Spotrac actual 2015-16 EPL contract values (used for replacement-level definition and salary analysis).
- **Schema:** per game i: goal differential z_i (home−away); covariates x_D, x_M, x_A, x_GK = home-minus-away average FIFA rating of defensive line, midfield, attack, goalkeeper.
- **Access:** public — data + code at https://github.com/kpelechrinis/eLPAR-soccer; Kaggle European Soccer Database.

## 3. Method / model

**Skellam regression on the score differential.** Let X, Y = home/away goals (each ~Poisson), Z = X−Y. Instead of a bivariate Poisson (which cannot handle the observed *negative* home–away goal correlation of −0.06), model Z directly: Z ~ Skellam(λ1, λ2) with log(λ1) = b1^T x, log(λ2) = b2^T x, fit by MLE. Win/draw/loss probabilities come from summing the Skellam PMF: P(HomeWin)=P(Z>0), P(Draw)=P(Z=0), P(HomeLoss)=P(Z<0). Key theoretical point (§2.2): the Skellam PMF for Z does not depend on the covariance of (X,Y) — it is identical to the difference of two *independent* Poissons — so no copula is needed.

**Positional grouping:** players collapsed to four lines (defense/midfield/attack/GK) to avoid formation-mismatch and sparsity; covariates are line-average rating differences.

**eLPAR:** replacement level per line = mean FIFA rating of the bottom salary decile (EPL 2015-16): GK 68.3, defense 64.4, midfield 64.5, attack 67.5. eLPAR_p(φ) = 3·δP_w + 1·δP_d (change in win/draw probs when player p replaces a replacement player in formation φ); time-weighted eLPAR_p = (1/T)Σ_φ t_φ·eLPAR_p(φ).

## 4. Equations & assumptions

Equations (quoted exactly as in the paper):

- Bivariate Poisson PMF (eq. 1): P(X=x,Y=y) = e^{−(λ1+λ2+λ3)} (λ1^x/x!)(λ2^y/y!) Σ_{k=0}^{min(x,y)} C(x,k)C(y,k)k!(λ3/(λ1λ2))^k.
- Skellam PMF (eq. 2): P(z) = e^{−(λ1+λ2)}·(λ1/λ2)^{z/2}·I_z(2√(λ1λ2)), I_z = modified Bessel function. (The ar5iv extraction renders the exponent ambiguously; the standard Skellam form with e^{−(λ1+λ2)} is the mathematically correct reading, consistent with Skellam 1946.)
- Model (eqs. 3–5): Z ~ Skellam(λ1,λ2); log(λ1) = b1^T·x; log(λ2) = b2^T·x.
- Brier (eq. 6): B_s = (1/N)Σ_i Σ_{j=1}^{R}(p_{ij} − o_{ij})².
- eLPAR (eq. 7): eLPAR_p(φ) = 3·δP_w + 1·δP_d; (eq. 8): eLPAR_p = (1/T)Σ_φ t_φ·eLPAR_p(φ).

Assumptions stated: goals per team ~Poisson (verified: Pearson dispersion 1.01 home / 1.10 away ≈ 1, so no negative binomial needed); line-average ratings are sufficient statistics for lineup strength (formation unknown in data); FIFA video-game ratings proxy true player quality (cites Cotta et al. 2016); replacement = cheapest-decile contracts; salary analysis assumes teams spend salary and transfer fees with the same logic.

## 5. Features / target

Inputs: four line-rating differentials (x_D, x_M, x_A, x_GK), home minus away. Target: integer goal differential Z (can be negative). Derived outputs: P(win/draw/loss) by PMF summation; eLPAR per player per formation. No in-game features — purely pre-game, lineup-based.

## 6. Validation design

- **Fit:** MLE on full 21,374 games (Table 2 coefficients with SEs and significance stars).
- **Holdout:** 80/20 train/test split (random, not time-ordered — noted as a weakness).
- **Checks:** (a) predicted-vs-actual differential distribution (Stern 1991): centered at 0, SD = 1.6 goals, χ² cannot reject Normal(0, 1.6); (b) out-of-sample 3-class Brier vs base-rate climatology; (c) calibration curves per outcome in 0.1 bins vs y=x; (d) alternative feature spec (attack-vs-opposing-defense lines) as robustness.
- Baselines: climatology (home 46% / away 29% / draw 25%).

## 7. Numerical results / baselines

All numbers are the paper's, quoted exactly:

- **Coefficients (Table 2, N=21,374):** log(λ1): intercept 0.36776*** (0.012); x_D 0.01761*** (0.01); x_M 0.02559*** (0.01); x_A 0.00747*** (0.001); x_GK 0.00142 (0.001, n.s.). log(λ2): intercept 0.07303*** (0.015); x_D −0.02607*** (0.002); x_M −0.01759*** (0.002); x_A −0.01095*** (0.001); x_GK −0.00313** (0.002). (***p<0.01, **p<0.05.)
- **Brier:** model 0.58 out-of-sample vs baseline 0.65.
- **Calibration:** all three outcome curves "practically on top of the y=x line"; model never predicts draw probability >30% (base rate 25%).
- **Alternative spec Brier:** 0.59 — "for all practical purposes identical."
- **eLPAR findings:** same-rated defender adds the most eLPAR, then midfielder, then attacker, GK least; every EPL team underpays defenders (all d_D < 0 in Table 3); mean absolute salary-performance deviation ≈ 0.095 (~9.5% misallocation); budget example: £6M split 45% GK (£2.7M → eLPAR 0.045) / 55% defender (eLPAR 0.166) totals 0.211 eLPAR per 90 min.

## 8. Code / data availability

Stated: https://github.com/kpelechrinis/eLPAR-soccer (data + code); Kaggle European Soccer Database. Reproducible in principle.

## 9. Leakage & limitations

- **Random 80/20 split, not time-ordered:** ratings evolve and teams persist across the split; mild leakage via team identity. A walk-forward split would be cleaner.
- **FIFA ratings as quality proxy:** video-game ratings embed popularity/media bias; the GK coefficient is insignificant on log(λ1), suggesting rating noise at some positions.
- **Formation blindness:** line averages wash out within-line heterogeneity (e.g., a 90-rated striker + 70-rated winger = same x_A as two 80s); the paper acknowledges this.
- **NFL transfer gap:** soccer goals are ~Poisson; NFL scores are lumpy (3/7/8-point chunks, 2-pt conversions). A literal Skellam-on-points will misfit the NFL margin distribution's spikes at ±3, ±7. The *framework* (difference-of-processes → full margin PMF → spread/total probabilities) transfers; the *likelihood* needs NFL-specific treatment (e.g., Skellam on "scores" rather than points, or a discretized compound distribution).
- **Draw handling:** draws don't exist in NFL regular season (ties ~1%); the P(Z=0) mass must be redistributed — trivial fix, but the paper's calibration story leans on draws.
- **Salary conclusions are EPL-2015-16-specific** and the authors flag incomplete roster coverage; not directly portable to the NFL cap system (though the *method* — ePAR vs cap hit — is).

## 10. GSE overlap

The metrics catalog in the existing-research map already lists "Skellam, Poisson, Dixon-Coles" as known quantities, and the corpus holds a Bayesian bivariate-conditional-Poisson ledger (0014) plus Fischer/Heuer soccer Poisson-vs-ML (2408.08331). What is new here: (a) an actual **Skellam regression with published coefficients, SEs, and calibration curves** — a concrete recipe, not just a named distribution; (b) the **covariance-free argument** (Skellam PMF independent of the bivariate correlation) with the negative-correlation empirical justification — directly relevant because NFL home/away scoring also shows weak correlation; (c) the **eLPAR construction** (replacement level from salary deciles + formation-weighted probability deltas) — a template for an NFL "expected points/wins above replacement vs cap dollar" metric GSE does not have. Not a duplicate: first full margin-distribution regression with positional economics in the corpus.

## 11. GSE implementation spec

Build an NFL margin-distribution model on the Skellam-regression template:

1. **Data:** nflverse play-by-play + rosters, 2015–2025. Covariates per game: unit-strength differentials — offense EPA/play, defense EPA/play allowed, QB efficiency, pressure rate, kicking — for home/away (the analog of the four soccer lines: pass offense, run offense, pass defense, run defense, special teams).
2. **Target:** final score differential Z (home−away points). Fit Z ~ Skellam(λ1, λ2), log-links on the covariate differentials, MLE. Validate against a binned empirical margin distribution; expect misfit spikes at key numbers (±3, ±7) — document them.
3. **Outputs:** full margin PMF → P(home win), P(cover | spread), P(total over | line) by summation. This gives GSE a **closed-form spread/total probability surface** per game, complementary to the engine's Monte Carlo.
4. **ePAR extension:** define NFL replacement level per position group from veteran-minimum/bubble-roster players; compute expected wins-above-replacement per player via probability deltas — a cap-efficiency metric for content ("which $/WAR signings beat the market").
5. **Serve:** per-game (λ1, λ2) → precomputed margin CDF tables; O(1) lookup for spread/total pricing.

Estimated effort: 3–4 days (model fit + calibration validation + key-number misfit analysis).

## 12. Reproducible test

Dataset: 2024–2025 NFL regular seasons (holdout; fit on 2015–2023). Baselines: (a) empirical margin histogram (climatology); (b) normal approximation N(spread-implied mean, 13.5). Metrics: 3-class Brier (home win/loss/tie→win/loss), log-loss on exact-margin buckets, calibration of P(cover) in 5% bins vs the closing spread. The Skellam model must beat climatology on Brier and show calibration slope ∈ [0.9, 1.1] on P(cover) to proceed.

## 13. Acceptance / rejection gate

**Adopt if** out-of-sample Brier < climatology by ≥0.02 (the paper's margin was 0.07 on a 3-class problem; scale to binary) AND P(cover) calibration slope ∈ [0.9, 1.1] with ≥80% of bins within 2pp of y=x; **reject** (stay with engine Monte Carlo) otherwise. If the key-number spikes (±3, ±7) break calibration, the gate fails and the improvement experiment becomes the required next step rather than optional.

## 14. Improvement experiment

**Key-number-aware Skellam mixture:** fit Z as a mixture — with probability π, the margin is drawn from a Skellam; with probability 1−π, from a "key-number" distribution placing extra mass at ±3, ±7, ±10 (weights learned). Equivalently, model scoring *events* (not points): possessions → {no score, FG, TD, TD+2} multinomial per team, then convolve to a margin PMF. Hypothesis: the event-level model nails the key-number spikes while the Skellam handles the tails. Test on the same 2024–2025 holdout; success = exact-margin log-loss improvement ≥5% over the plain Skellam with no calibration degradation on P(cover).

**Verdict:** ADAPT
