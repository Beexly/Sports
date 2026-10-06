# [0552] Empirical parameterization of the Elo Rating System (arXiv:2512.18013v1)

**Citation:** Shirsa Maitra, Tathagata Banerjee, Anushka De, Diganta Mukherjee, Tridib Mukherjee (2026). *Empirical parameterization of the Elo Rating System*. arXiv:2512.18013v1. URL: https://arxiv.org/abs/2512.18013v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1411 lines).
**Verdict:** ADAPT — the tuning protocol (grid-search the experience-based K-function by maximizing a rating-difference classifier's accuracy, with quantile-based game-count cutoffs) ports directly to GSE's NFL Elo-family ratings; the Ludo application is irrelevant.

## 1. Research question
How to tune Elo parameters empirically from game data rather than convention: the authors propose a data-driven framework that selects the K-factor schedule (experience-based stepwise decay) and game-count cutoffs by computing ratings under candidate configurations and choosing the configuration that maximizes the predictive accuracy of a classifier trained on rating differences.

## 2. Dataset / schema
Two datasets of 3-dice, 2-player Ludo (rules per the Wowzy platform): (1) simulated: 184,000 games between 7 bots/strategy profiles (Full-Information, Limited-Information, Deliberately-suboptimal etc., described in the appendix); (2) real: 320,978 players, 4,640,765 games over 2.5 months in 2024, acquired from Games24x7 — early post-release data where skill levels had not stabilized. Access: proprietary (Games24x7); the simulated data is described but not linked. Not replicable from public sources.

## 3. Method / model
Standard Elo with an experience-sensitive K-function (eq. 1): K_i = K_a if n_i ≤ n_{c1}; K_b if n_{c1} < n_i ≤ n_{c2}; K_c if n_i > n_{c2}, where n_i = games played by player i. Tuning procedure: (a) enumerate candidate parameter configurations — K triples {(60,30,16) [online-chess baseline], (30,30,30) [constant-K control], (30,16,8) [stability], (100,50,25) [responsiveness]} × cutoff pairs {(5,10), ([q10]+1,[q25]+1), ([q25]+1,[q50]+1)} where q_k are percentiles of the game-count distribution; (b) compute full rating histories under each config; (c) fit logistic regression of match outcome on pre-match rating difference; (d) select the config maximizing classification F1/accuracy. The fitted logistic regression is also used as an empirical replacement for the theoretical expected-score function E (learning the scale equivalent of the 400 divisor from data). Expected-score form kept fixed (logistic, D=400) — deliberately not tuned, since D only rescales rating dispersion.

## 4. Equations & assumptions
- Expected score: E_A = 1/(1 + 10^{(R_B − R_A)/400}) (logistic performance distribution assumption).
- Update: R' = R + K_i(S − E), S ∈ {1, 0} (win/loss; draws not discussed).
- K-function (eq. 1, as tuned): K_i = 60 if n_i ≤ 5; 30 if 5 < n_i ≤ 10; 16 if n_i > 10.
- Tuner: logistic regression P(Player 1 wins) = σ(β_0 + β_1 · (R_1 − R_2)); fitted on real data: β_0 = −0.0623 (se 0.001), β_1 = 0.0046 (se 9.49e-06), t = 489.545; on simulated data: β_0 = −0.1298 (se 0.008), β_1 = 0.0056 (se 2.56e-05), t = 219.460 (all p ≈ 0.000 per the paper).
- Stated assumptions: player performance follows a logistic distribution around latent skill; K-factor decay by game count proxies learning-rate differences across players; rating difference is a sufficient statistic for win probability (the tuner's core premise, citing Hvattum & Arntzen 2010 on football); D=400 fixed.

## 5. Features / target
Input feature for the tuner: pre-match rating difference (R_1 − R_2) computed under each candidate parameter configuration. Target: match outcome (win/loss). The rating histories themselves are computed from the game-outcome sequences; no game-content features are used.

## 6. Validation design
No held-out time split — ratings are computed on the full history and the logistic regression is fit/evaluated in-sample (evaluation protocol: F1-score of the rating-difference classifier across configurations; simulated data uses the config selected on real data). The "validation" is comparative across the 12 parameter configurations rather than out-of-sample. Accuracy-vs-rating-difference curve reported: rating gaps 0–30 → ~52% accuracy (near random); accuracy and F1 rise monotonically with larger gaps.

## 7. Numerical results / baselines
Paper's stated claims (Table 1, real data, logistic-regression F1 by config): (60,30,16)/(5,10): 0.554; (30,30,30)/(5,10): 0.548; (30,16,8)/(5,10): 0.554; (100,50,25)/(5,10): 0.548; quantile cutoffs give 0.548–0.554 across all configs — four configs tie at the top; authors "randomly" pick (60,30,16) with cutoffs (5,10). Simulated data with the chosen config: F1 = 0.87 (vs 0.554 real). Rating distribution on real data (Table 3): min 776, 10% 977, 25% 1028, median 1094, mean 1096, 75% 1162, 90% 1216, max 1452 — near-symmetric, bell-shaped around the 1000 initial rating. Interpretation: modest predictive power on real data attributed to early-release instability and unobserved prior experience; simulated bots show clean skill separation.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
Be adversarial: (a) The tuner is fit and evaluated in-sample — F1 differences across configs (0.548 vs 0.554) are tiny and likely within noise; selecting among ties "randomly" is not a principled model-selection rule, and no significance testing or cross-validation is reported. (b) In-sample tuning of K on the same outcomes used for evaluation is data snooping by construction; no out-of-sample or walk-forward check. (c) Ludo is a high-luck dice game — external validity to low-luck domains is asserted via one football citation, not demonstrated. (d) The experience-based K (game count) conflates learning with rating certainty; Glicko's RD handles this more principledly. (e) Real-data noise sources (cross-platform prior skill, early-release churn) are acknowledged but unmodeled — the chosen config may just fit noise. (f) Accuracy 0.554 is barely above chance; the rating system "works" mainly on simulated bots where strategies are fixed.

## 10. GSE overlap
Extension, not duplicate. The existing-research-map lists Elo (and nfelo) among inventoried methods and notes Hermes's opp-adjusted EPA work, but no repo work tunes rating-system parameters empirically: GSE has no K-factor/experience-decay tuning protocol and no rating-difference classifier calibration. Not in the 64-ID dedup list. The tuning *protocol* (not the Ludo numbers) is the transferable artifact, and it composes directly with paper 0549's score-driven rating framework (tune K and α of the Skellam-margin Elo the same way).

## 11. GSE implementation spec
1. Data: nflverse game results 1999–2026. 2. Candidate space: replace game-count cutoffs with NFL-meaningful experience bins (e.g., rookie-QB starts, coach tenure) or keep it simple: K grid {4,…,32} × margin-model variants from 0549 (plain Elo, Skellam-margin, ATS ordered-probit). 3. For each config, compute rating histories 1999–2015, then fit logistic regression of next-game win (and separately ATS cover) on rating difference, evaluated walk-forward on 2016–2025 — fixing the paper's in-sample flaw. 4. Select config maximizing out-of-sample log-loss/Brier (prefer proper scoring over F1). 5. Also fit the empirical expected-score map (rating-diff → win prob) and compare its implied scale to the theoretical 400-divisor curve; ship the empirical map if it wins. 6. Serving: nightly rating updates with the tuned K; the empirical win-prob map becomes the rating-implied probability source for the pick engine. Effort: ~1 day (script + harness).

## 12. Reproducible test
Dataset: nflverse regular-season games 1999–2025. Metric: walk-forward out-of-sample Brier score of win probability from rating difference (train ratings through season t, predict season t+1, t = 2015…2024). Baseline: convention Elo (K=16, D=400) with the theoretical expected-score map. Runnable: single Python script, no charting data.

## 13. Acceptance / rejection gate
ADOPT the empirically tuned K/config if walk-forward Brier on 2016–2025 improves on convention Elo by ≥ 0.002 AND the empirical expected-score map is monotone and within ±3pp of the theoretical curve across rating diffs (sanity against overfit wiggles). REJECT otherwise — keep convention Elo and note the null result.

## 14. Improvement experiment
Tune K as a function of rating *uncertainty* rather than game count: weight each update by the posterior variance of the team's rating (a Glicko-style RD estimated from the score-driven Fisher information, linking to 0549's §14 scaled-score idea), then run the same walk-forward tuner over the uncertainty-weighting hyperparameter. Hypothesis: uncertainty-weighted K adapts faster to regime changes (new QB, coaching change) than game-count decay, which in the NFL is nearly constant across teams.
