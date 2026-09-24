# [0419] Expected by Whom? A Skill-Adjusted Expected Goals Model for NHL Shooters and Goaltenders (arXiv:2511.07703v2)

**Citation:** J.T.P. Noel (2025). *Expected by Whom? A Skill-Adjusted Expected Goals Model for NHL Shooters and Goaltenders*. arXiv:2511.07703v2. URL: https://arxiv.org/abs/2511.07703v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 861 lines).
**Verdict:** ADAPT — port the skill-adjusted expected-goal framework (recency-weighted shooter/goalie priors with spatial bins and similarity features) into NFL expected-yards/prop models, replacing raw ratios with shrunk, temporally-validated player adjustments.

## 1. Research question
Do hockey shooters and goaltenders systematically deviate from what a context-only expected-goals (xG) model predicts, and does injecting estimates of individual player skill — for both the shooter and the goalie — into the xG model improve its predictions of whether a shot becomes a goal? This is hockey's analogue of the "finishing skill" debate: whether observed goals-above-expected reflect repeatable talent or noise.

## 2. Dataset / schema
NHL shot data from the public NHL API accessed via the open-source `hockey-scraper` package. 5v5 shots only, seasons 2010–2022. Skill features are estimated on prior data (skill model trained on 2012–2020) and the adjusted xG model is evaluated on a held-out 2021–2022 window. Schema key columns: shot coordinates (x, y), distance, angle, shot type, prior event, rebound/flurry/fastbreak flags, score state, arena (for the two arena-bias adjustments), shooter ID, goalie ID, goal/no-goal label. Access: public (NHL API + hockey-scraper). Not proprietary.

## 3. Method / model
Baseline: LightGBM binary classifier trained on context-only shot features, tuned with Optuna. Skill-adjustment: separate shooter-skill and goalie-skill estimates computed from each player's full history of prior shots with linear recency weighting (recent shots count more), shot locations aggregated into nine spatial bins, and Gower similarity between players to stabilize estimates. The skill estimates (talent ratios and above-expected values, in total, locational, and situational variants) are added as features to the LightGBM model. Players are evaluated within skill brackets defined by the prior expectation value p: low (p ≤ 0.5), mid (0.5 < p ≤ 0.75), high (p > 0.75). The skill-adjusted model is compared against the baseline within each bracket on log loss, AUC, and Brier score.

## 4. Equations & assumptions
Stated in the paper:
- Shooter goals above expected (GAX): GAX = (weighted goals) − (cumulative weighted xG)
- Goaltender goals saved above expected (GSAX): GSAX = (cumulative weighted xG) − (weighted goals allowed)
- Shooter talent ratio: talent = (weighted goals) / (weighted xG)
- Goaltender talent ratio: talent = (weighted xG against) / (weighted goals against)
- "True" talent / above-expected: the sum of total, locational, and situational variants of the above quantities
- Recency weighting: each prior shot's contribution is weighted with linear decay in time (more recent shots weighted more heavily)
Assumptions: (a) skill is persistent enough that a recency-weighted history is informative; (b) nine spatial bins capture the relevant locational structure; (c) Gower similarity between players is a valid stabilizer for sparse player histories; (d) sparse-player talent ratios default to zero (no skill), which the paper acknowledges is a crude choice.

## 5. Features / target
Baseline features: shot coordinates, distance to goal, angle, shot type, prior event type, rebound flag, flurry flag, fastbreak flag, score state, and two arena-bias adjustments. Skill features: recency-weighted talent ratios and above-expected values for the shooter and goalie, each in total, locational (nine spatial bins), and situational forms, plus Gower-similarity-smoothed variants. Target: binary goal/no-goal per 5v5 shot. Prediction horizon: per-shot probability.

## 6. Validation design
Skill estimates trained on 2012–2020 NHL data; adjusted model evaluated on held-out 2021–2022 seasons. Metrics reported per skill bracket: log loss, AUC, Brier score. Baseline vs. adjusted comparison within each bracket. Optuna hyperparameter tuning on the training window. The baseline xG model is not state-of-the-art (acknowledged by the author), and the tuning/validation description suggests weak temporal cross-validation rather than strict walk-forward — see §9.

## 7. Numerical results / baselines
Table 5 (exact values, adjusted vs. baseline):
- High bracket (p > 0.75): baseline log loss 0.2982, AUC 0.7238, Brier 0.0849; adjusted 0.2844, 0.7616, 0.0816
- Mid bracket (0.5 < p ≤ 0.75): baseline 0.2831, 0.7424, 0.0809; adjusted 0.2792, 0.7519, 0.0798
- Low bracket (p ≤ 0.5): baseline 0.2126, 0.7531, 0.0567; adjusted 0.2100, 0.7630, 0.0560
Paper's claim: the skill adjustment improves all three metrics in all three brackets, with the largest gain in the high bracket (log loss −0.0138, AUC +0.0378). My reading: consistent directional improvement across 9 metric–bracket cells, but the low/mid bracket gains are small and the baseline is self-admittedly not state-of-the-art, so part of the gain may be the skill features compensating for an underfit baseline.

## 8. Code / data availability
Data: public NHL API via hockey-scraper. Code: none stated.

## 9. Leakage & limitations
Adversarial notes: (a) The talent ratio (weighted goals / weighted xG) uses the same weighted xG model being evaluated — a self-referential feature that risks circularity; a player who is overrated by the baseline automatically looks "skilled" if the baseline's errors persist. (b) Sparse players' talent set to exactly zero is a harsh prior; shrinkage toward league average would be the standard choice. (c) Only 5v5 shots — power-play/penalty-kill contexts excluded, limiting generality. (d) No non-shooter tracking data (no defender proximity, no screen information), so "skill" absorbs omitted defensive context. (e) Baseline admittedly not state-of-the-art; improvement claims are relative to a weak comparator. (f) Temporal validation structure is loose — possible leakage if the base model CV was not strictly time-ordered. External validity to NFL: hockey shots are discrete events with a binary outcome; NFL props (yards, receptions) are continuous accumulations, so the framework transfers as player-context residuals, not directly.

## 10. GSE overlap
Extension, not duplicate. The existing-research-map covers an xG player/position-adjusted paper (2301.13052) as a deeply covered standout, plus Elo/Glicko/TrueSkill/Plackett-Luce rating mentions in the metric catalog — but the map shows no skill-adjusted expected-goal framework ported to NFL props, no recency-weighted player talent priors on expected-metric residuals, and no goalie/defender-side adjustment analogue. Relevant gaps the map names: "methods that transfer player/context adjustment to NFL props." This paper is a direct template for that gap. Not in `docs/research/2026-09-21/` NGS taxonomy; props-reverse-engineering docs do not contain a player-skill-prior residual method.

## 11. GSE implementation spec
Build a "player/context-adjusted expected yards" module for NFL props: (1) Data: nflverse play-by-play 2020–2025 + FTN charting for defender proximity. (2) Baseline expected yards per play model (gradient boosting) on context features: down, distance, yard line, score state, time, formation, personnel. (3) Player adjustment features: recency-weighted (linear decay over trailing ~2 seasons) per-player yards-above-expected ratios for the ball carrier and the primary defender/unit faced, aggregated into spatial bins (field zones: short left/middle/right, deep, behind LOS) mirroring the nine hockey bins, with similarity smoothing across players by role (empirical-Bayes shrinkage toward positional mean instead of the paper's zero-default). (4) Model: LightGBM with Optuna tuning, same as paper. (5) Serve as a feature in the props engine for anytime-TD, yardage overs/unders, and first-TD markets. Effort: ~2–3 days for the baseline + skill module; ~1 day to wire into the props pipeline.

## 12. Reproducible test
Dataset: nflverse play-by-play, rushing + receiving plays, 2022–2024 train, 2025 holdout (through Week 3 of the 2026 season for recency, strictly time-ordered). Metric: log loss on binary "exceeds line" outcomes is not available historically; use RMSE and mean absolute error on actual yards vs. predicted yards, plus Brier score on a derived binary target (play gains ≥ 10 yards). Baseline to beat: context-only expected-yards model without player adjustments. Time window: 2025 season holdout, minimum 5,000 plays.

## 13. Acceptance / rejection gate
ADOPT the player-adjustment module if the skill-adjusted model beats the context-only baseline by ≥ 0.02 RMSE yards/play reduction AND ≥ 0.005 Brier improvement on the 2025 holdout, with gains in at least 3 of 4 position groups (QB, RB, WR, TE). REJECT if gains are confined to a single position group or vanish under strict walk-forward (train-through-2024, predict 2025 week by week with expanding window).

## 14. Improvement experiment
Replace the paper's linear recency weighting and zero-default for sparse players with a hierarchical Bayesian skill model: player talent ~ Normal(positional mean, τ), with τ learned, and exponential time decay with a learned half-life per position. Then test whether jointly modeling the offensive player AND the defensive unit faced (the hockey paper's shooter+goalie pairing is exactly the NFL's ball-carrier+defender pairing) beats single-sided adjustment — the paper does this for goalies, but never tests the interaction term; a shooter×goalie interaction feature is the natural next experiment and maps to NFL matchup-specific props (e.g., WR vs. specific CB).
