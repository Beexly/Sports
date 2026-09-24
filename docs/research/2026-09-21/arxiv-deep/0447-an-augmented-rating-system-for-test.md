# [0447] An Augmented Rating System for Test cricket: adapting the Glicko rating system (arXiv:2603.02574v3)

**Citation:** Rhitankar Bandyopadhyay, Diganta Mukherjee (2026). *An Augmented Rating System for Test cricket: adapting the Glicko rating system*. arXiv:2603.02574v3. URL: https://arxiv.org/abs/2603.02574v3
**Ledger completed:** 2026-09-21. **Read:** full text (§§1–5, Appendix A.1–A.3, references; 6,513 text lines).
**Verdict:** ADAPT — four portable mechanics for GSE's team-strength ratings: (1) recalibrate the logistic scale to the sport's rating dispersion instead of inheriting chess's d=400; (2) fold home-field (and travel/rest analogues) into the expected-score function as additive adjustments with copula-combined dependence; (3) scale rating updates by margin of victory via S_A=(1±MOV)/2; (4) bootstrap-permutation robustness checks on rating stability. The cricket specifics (toss, innings, draws) do not transfer; the rating machinery does.

## 1. Research question
Can Glicko's rating system — ratings plus Rating Deviation (RD) uncertainty, recalibrated for a team sport — produce a more predictive and fairer ranking for Test cricket than the ICC's Kendix points system and the WTC points table, once home advantage, toss advantage, scheduling imbalance, and margin of victory are modeled explicitly? The paper argues the ICC system ignores home/toss effects and scheduling asymmetries, producing inconsistent rankings.

## 2. Dataset / schema
Two datasets, both Test cricket match results with no stated public URL (scores are public record; the paper gives no download link or scraper):
- Training: 4-year window June 17, 2017 – June 17, 2021 (~150 matches; 19 draws = 12.67%). Chosen to mirror the ICC's maximum historical look-back horizon; window ends at the final ICC update before the WTC cycle to avoid regime-dependent scheduling effects.
- Test: ICC World Test Championship 2021–23 cycle — 70 matches among 9 teams (Australia, Bangladesh, England, India, New Zealand, Pakistan, South Africa, Sri Lanka, West Indies), August 4, 2021 – June 11, 2023; 12 draws = 17.14%.
- A simulated dataset of 150 Test matches is also used for scaling-factor calibration (§3.1; generation procedure not detailed).
- Per-team schema: matches played/won/lost/drawn, rating, RD, toss-win/toss-loss impacts per host country, pairwise home impacts (Table 5).
Schema columns per match (Appendix Table 14): date, teams A/B, toss winner, E_A, E_B, winner, R_A, R_B, RD_A, RD_B — full chronological listing provided.

## 3. Method / model
Glicko's system (ratings + RD) adapted in four steps:
1. Recalibrate the logistic scale d (chess default 400) by grid search over loss functions (Brier, MAE, log loss, ECE) on training + simulated data → d = 85.
2. Add home-ground and toss effects as additive rating adjustments inside the expected score: E_{i,home} = 1/(1+10^{−(R_i−R_j+h_{i,j})g(RD_j)/85}), E_{i,toss} = 1/(1+10^{−(R_i−R_j+t_{i,i})g(RD_j)/85}), where h_{i,j} = (matches won by i vs j − matches lost by i vs j)/(matches played between i and j) and a_{j,i} = −h_{i,j}; toss impacts defined per host country. K-S tests accept logistic marginals for both (home: stat 0.09386, p = 0.1696; toss: stat 0.03595, p = 0.9936).
3. Combine home (H) and toss (T) via a Farlie–Gumbel–Morgenstern copula with association ω = −0.5436 (from empirical Spearman ρ = −0.1812 = ω/3; feasible since |ρ| ≤ 1/3), chosen over Gaussian/Frank/Plackett by log-likelihood and AIC (Table 9: FGM loglik 1.89, AIC −2.29 vs Gaussian −1.71, Frank −1.55, Plackett −1.77). Closed-form E(R_A,R_B,RD_B,h,t) = F(H)G(T)[1+ω(1−F(H))(1−G(T))] (eq 17), plus analytic delta-method 95% CIs for expected scores (eqs 20–23).
4. Margin-of-victory augmentation: redefine actual score S_A = (1+MOV)/2 (win), (1−MOV)/2 (loss), 1/2 (draw), preserving mean 0.5; MOV_i = ((R_i−R_min)/range_R)^{β_i}·((W_i−W_min)/range_W)^{1−β_i} + I_i·(E4P_i+ERM_i)/TR_i, where β_i selects runs- vs wickets-margin, I_i flags innings wins, and the 4th-innings expectation uses Mean Residual Life survival estimates under a negative-binomial innings-score model (E4R = 233.619 ≈ 234; upper integration limit 952, highest recorded innings total).

## 4. Equations & assumptions
Assumptions: team performance differences follow a logistic distribution (Elo's original assumption, retained); H and T are logistic-margined (K-S accepted); FGM copula captures their (negative) dependence with no tail dependence; truncated 4th innings are censored observations handled by MRL under a negative-binomial model; draws are handled by the D_{α,A,B} convex combination rather than the expected-score model alone.

Key equations, quoted faithfully:
- E_A = 1/(1+10^{−(R_A−R_B)g(RD_B)/400}) (1); g(RD) = 1/√(1+3RD²/π²) (2); RD_A′ = 1/√(1/RD_A² + 1/d²) (3); d² = 1/(g(RD_B)²E_A(1−E_A)) (4); r_A′ = r_A + g(RD_B)(S_A−E_A)/√(1/RD_A² + 1/d²) (5).
- Recalibrated form: E_A = 1/(1+10^{c(R_B−R_A)/d}) (6) with d = 85 for Test cricket.
- Partial expected scores with home/toss (7)–(10), e.g. E_{i,home} = 1/(1+10^{−(R_i−R_j+h_{i,j})g(RD_j)/85}).
- Copula-combined expected score (17): E = F(H)G(T)[1+ω(1−F(H))(1−G(T))], ω = −0.5436.
- MOV score (18): S_A = (1+MOV)/2 win; (1−MOV)/2 loss; 1/2 draw. MOV_i formula (19) as in §3 above.
- MOV-augmented rating update (25): r_A′ = r_A + g(RD_B)((1±MOV_i)/2 − E_A)/√(1/RD_A² + 1/d²) (win/loss), r_A′ = r_A + g(RD_B)(1/2 − E_A)/√(1/RD_A² + 1/d²) (draw).
- Draw predictor (26): D_{α,A,B} = α(1−E_A−E_B) + (1−α)|E_A−E_B|; sensible choice (α,q) = (0.6, 0.67); α ∈ [0.55, 0.6] correctly flags 9 of 12 test draws in the top 33–35% quantile.
- MRL (27): MRL_A = E[X_A | X_A > x_A] = ∫_{x_A}^∞ t f_A(t)dt / ∫_{x_A}^∞ f_A(t)dt.

## 5. Features / target
Inputs ("features"): pre-match ratings R_A, R_B; rating deviations RD_A, RD_B; pairwise home impact h_{i,j} (win–loss differential rate vs that opponent at home); toss-win/toss-loss impacts per host country; margin of victory components (runs margin, wickets margin, innings-win flag, MRL-estimated 4th-innings expectations). Target: match outcome coded as S_A ∈ {0, 0.5, 1}, generalized to the MOV-continuous (1±MOV)/2. Prediction horizon: per-match, updated chronologically. Note the model predicts win/draw/loss only via the expected score; draw probability itself is handled by the separate D_{α,A,B} diagnostic, not integrated into E_A.

## 6. Validation design
Train on June 2017–June 2021 (~150 matches); test chronologically on WTC 2021–23 (70 matches), updating ratings/RDs/impacts after each match — a genuine time-ordered walk-forward. Baselines: ICC published rankings and the WTC points table. Metrics: Brier score, log loss, MAE, ECE for scale calibration (Table 13); winner-prediction accuracy on non-drawn matches; Spearman rank correlation vs ICC rankings; bootstrap robustness (100 permutations of the 70 test matches, plus a repeat on WTC 2023–25). Draw-prediction accuracy via the quantile trade-off table (Table 10).

## 7. Numerical results / baselines
- Scale calibration (Table 13): d = 85 gives Brier 0.1601, log-loss 0.5946, MAE 0.3629, ECE 0.1594 vs d = 400's Brier 0.1929, log-loss 0.6645, MAE 0.4047, ECE 0.1844 — a 17% Brier improvement, 10.52% log-loss, 10.33% MAE, 13.56% ECE over d = 400 (paper's percentages).
- Home advantage: 82 home wins vs 41 away wins; Pearson χ² (df=1) p = 3.386×10⁻⁷. Toss: 75 wins after winning toss vs 50 after losing; p = 0.002399. Both nulls (no association) rejected.
- Predictive accuracy: model correctly predicts the winner in 44 of 56 non-drawn matches (~78.6%) during WTC 2021–23.
- Ranking agreement: Spearman rank correlation 0.9624 between the improvised-Glicko ranks and ICC ranks (Table 6). Notable outlier: Bangladesh's win in New Zealand on Jan 5, 2022 — NZ had been unbeaten in 19 home matches over 58 months prior.
- MOV augmentation (Table 7): final ratings Australia 131.90, India 126.10, England 114.28, South Africa 108.32, New Zealand 100.96, Sri Lanka 85.80, Pakistan 82.43, West Indies 82.15, Bangladesh 66.68 — rankings identical to the non-MOV Glicko, but ratings shift (MOV updates are steeper; trend curves in Appendix Fig. 1 are visibly less smooth).
- Bootstrap robustness: 100 permutations of the 70 WTC matches → average coefficient of variation 0.44%, SD ≈ 0.436 rating points; all final ratings inside the 95% bootstrap CIs; differences typically < 0.6 rating points (< 0.5%). Repeat on WTC 2023–25: avg CV 0.31%, MAD < 0.26 rating points.
- The paper's own caveat: the delta-method 95% CIs for expected scores are "of very short ranges, effectively not providing predictors with an idea of fluctuations" — Var(p) too low to be useful.
- Innings model: E4R = 233.619 ≈ 234 via negative-binomial MRL; CRPS test shows negative binomial beats alternatives by 1.8 runs.

## 8. Code / data availability
None stated. No code link, no data URL; match results are public record (ICC/ESPNcricinfo) but the paper provides no retrieval script. The 150-match simulated dataset's generator is undescribed.

## 9. Leakage & limitations
- The home-impact estimator h_{i,j} = (won−lost)/played per pair is extremely noisy for rare pairings (many Table 5 cells are exactly 0 by default when teams never met); these noisy estimates feed directly into expected scores — shrinkage or hierarchical pooling is never applied, and pairs with 1–2 meetings get extreme ±1 values.
- Toss impacts are estimated per host country on tiny samples (e.g., Pakistan's ±0.5714 from 24 matches) — high-variance plug-ins treated as known constants.
- The scale d = 85 is selected on the same training data used to fit initial ratings/RDs (Table 13) — selection bias in the reported 17% Brier gain; no held-out confirmation of the scale choice itself.
- Draws (12.67% train, 17.14% test) are bolted on via the D_{α,A,B} diagnostic rather than modeled — E_A + E_B need not sum to 1 and draw probability is unmodeled, so the "expected scores" are not coherent probabilities.
- The 95% CIs are admitted to be uninformatively tight — the delta method ignores estimation uncertainty in ratings, RDs, and impacts, understating true uncertainty.
- MOV values in Table 17 exceed 1 (e.g., 1.886, 1.754, 1.656) because of the additive innings term — so (1+MOV)/2 can exceed 1, breaking the score's probabilistic interpretation (the paper never renormalizes).
- External validity to NFL: toss has no NFL analogue (coin toss confers only deferred-choice value); innings structure is cricket-specific; but home-field, rest/travel, and MOV-scaled updates do transfer.
- Small-n: 9 teams, 70 test matches — ranking agreement (ρ = 0.9624) is easy when the field stratifies into obvious tiers.

## 10. GSE overlap
Extension, not duplicate. The existing-research-map inventories Elo, Glicko ("mentioned"), Massey/Sagarin/Colley, nfelo/nfelounits, and Bradley-Terry as known rating families, and the 2026-09-18 ML brief commissioned "state-space team strength" work whose results are not yet in the repo — but the map shows no Glicko-style implementation with RD uncertainty, no calibrated logistic scale selection, no MOV-scaled rating updates, and no copula-combined situational factors in GSE's codebase. This paper's machinery slots into the gap between the inventoried-but-unbuilt rating families and GSE's EPA-based team metrics.

## 11. GSE implementation spec
Build a Glicko-style NFL team-strength rater as a complement to (not replacement of) the EPA metrics:
1. Data: nflverse 2020–2025 game results with scores, home/away, rest days, travel distance, dome/outdoor, weather.
2. Initialize all 32 teams at R = 1500, RD = 350 (standard Glicko scale; keep 400-scale or rescale — the paper's lesson is to calibrate, not inherit).
3. Calibrate the logistic scale d by grid search minimizing Brier score on 2020–2022 games (walk-forward), exactly the paper's Table 13 protocol; NFL rating dispersion differs from both chess and cricket, so expect a different optimum.
4. Expected score with situational adjustments: E_home = 1/(1+10^{−(R_i−R_j+h) g(RD_j)/d}) where h is a home-field term estimated hierarchically (partial pooling across teams — fixing the paper's noisy per-pair estimator), plus rest-differential and travel terms combined via the same FGM-copula form (test Gaussian/Frank/Plackett by AIC as the paper does).
5. Update with MOV scaling: S_A = (1+MOV)/2 with MOV = normalized margin capped at 1 (fixing the paper's >1 overflow), using diminishing-returns normalization (e.g., MOV = 1 − exp(−margin/14)) so blowouts don't dominate.
6. RD dynamics: standard Glicko RD inflation between seasons/weeks for roster turnover (the paper's empirical RD initialization is a starting point; use time-based RD growth).
7. Serving: ratings update weekly after games; expose R, RD, and E(A beats B) as features to the main engine. Effort: ~1 week for the core rater + calibration; ~1 more week for the situational-factor hierarchy.

## 12. Reproducible test
Dataset: nflverse 2022–2024 regular seasons. Baseline: standard Elo (d = 400, K-factor tuned, no MOV) predicting home-team win probability. Metric: Brier score and log loss on 2023–2024 games (train/calibrate scale + situational terms on 2022, walk-forward through 2023–2024). Test: the Glicko-MOV rater must beat baseline Brier on the 2023–2024 window; secondary: accuracy on non-blowout games and calibration (ECE) in 5 probability bins. Also run the paper's bootstrap-permutation check: 100 random orderings of each season's games, require rating CV < 2% (looser than the paper's 0.44% given NFL parity).

## 13. Acceptance / rejection gate
ADOPT the Glicko-MOV rater as a GSE engine feature iff on 2023–2024 walk-forward it beats tuned-Elo Brier by ≥ 0.004 (absolute) with ECE no worse than baseline in every probability bin; the bootstrap CV must be < 2% for all 32 teams. REJECT (stay with current ratings) if Brier gain < 0.004, if any ECE bin degrades by > 0.01, or if the MOV term's fitted blowout weight implies > 2× the rating swing of a close win — a sign the margin scaling is overfit to garbage-time scores. Gate fixed before running.

## 14. Improvement experiment
Go beyond the paper: replace the paper's static per-pair home impacts with a hierarchical Bayesian home-field model (team-specific home edge shrunk toward a league mean, with dome/weather/rest interactions), and estimate the FGM copula association ω jointly with the ratings by maximum likelihood instead of the paper's two-stage plug-in (Spearman ρ → ω). Then test whether joint estimation improves Brier over the two-stage version on the §12 window — the paper's plug-in ω = −0.5436 ignores estimation uncertainty that joint fitting would propagate, and the NFL's richer situational covariates (rest, travel, weather) make the dependence structure worth estimating properly rather than inheriting.
