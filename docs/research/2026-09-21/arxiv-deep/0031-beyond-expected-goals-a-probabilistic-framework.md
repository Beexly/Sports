# [0031] Beyond Expected Goals: A Probabilistic Framework for Shot Occurrences in Soccer (arXiv:2512.00203)

**Citation:** Jonathan Pipping, Tianshu Feng, Paul Sabin (2026). *Beyond Expected Goals: A Probabilistic Framework for Shot Occurrences in Soccer*. arXiv:2512.00203. URL: https://arxiv.org/abs/2512.00203
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1450 lines — §1–5, references, Appendix A feature dictionary, Appendix B robustness analysis, all 8 figures and 12 tables, read in full).
**Verdict:** ADAPT — the xS×xG attempt-generation/attempt-conversion decomposition with possession-level aggregation is worth porting to NFL drive/play modeling, but the proprietary Gradient Sports tracking data and per-second frame structure do not transfer directly.

## 1. Research question
Standard expected-goals (xG) models estimate P(goal | shot) but condition on observed shots, ignoring shot-taking behavior entirely. The paper asks: can we build a possession-level framework ("xG+") that jointly models (a) the probability a shot occurs within the next second (xS) and (b) the probability it scores given it occurs (xG), aggregate that joint probability over a possession, and does this improve team-level goal forecasting and produce a more persistent player-skill signal than standard xG? Three motivating flaws in xG (§1.2, §2): (1) it ignores dangerous non-shot moments (Real Madrid vs Man City, Feb 19 2025: Rodrygo's speculative 35-yard shot ≈ 0.03 xG vs a six-yard-box cross that nearly connected — zero xG, clearly more dangerous); (2) independence assumption inflates values on rebound sequences (Orlando City vs Philadelphia Union, Feb 22 2025: four shots in the 78th minute totaling 1.63 xG, but only one goal was possible); (3) selection bias — better finishers take more shots, and the paper explicitly cites Brill et al. (2025) on the analogous EP selection bias in American football.

## 2. Dataset / schema
Video tracking, event, and team data provided by **Gradient Sports** for the **2022–23, 2023–24, and 2024–25 English Premier League seasons** (§3.2). Event data encodes on-ball actions (possession changes, shots, goals); tracking data includes synchronized ball and player positions. Per video frame (30 fps) the dataset includes: ball and player positions (x, y, z); possession indicators and shot outcomes; player and team IDs. Raw inputs are filtered to sequences where one team has clear possession in the attacking third. **Access: proprietary to Gradient Sports — not replicable; no public URL.** Frame/possession counts not stated in paper. Authors affiliations: University of Pennsylvania (Statistics & Data Science; Computer & Information Science).

## 3. Method / model
Two **separate XGBoost models** trained on engineered features (§3.3):
1. **xS**: predicts the probability that a shot will occur in the next second;
2. **xG**: predicts the probability that a shot taken in the current frame results in a goal.

Both use 5-fold cross-validation within each season, with log loss as the primary evaluation metric. **XGBoost hyperparameters: not stated in paper.** Logistic-regression baselines on four nested feature sets (ball distance only; all ball features; ball + goalkeeper; all features), evaluated on identical CV splits (§4.1).
Per-frame joint value xG+_t = xS_t × xG_t, aggregated over a possession of n frames via (1) at-least-one-per-possession `1 − ∏_t(1 − xG+_t)` or (2) max-per-possession `max_t(xG+_t)`; xG-only also tested with traditional sum-of-shots.
**Team-level evaluation (§4.3):** rolling-origin CV over 114 matchdays (38 × 3 seasons): each matchday is a fold, train on the other 113. Two-stage model in R/lme4: stage 1, mixed-effects Poisson `metric ~ (1|season) + (1|season:team) + (1|season:opp) + home` → season-specific team attack, opponent defense, season, and home effects; stage 2, Poisson `goals ~ home + season + team_off + opp_def` → predicted goals on the held-out matchday. Metrics: MSE, MAE, empirical 90% squared-error intervals across folds, and head-to-head win rate vs the sum-of-xG baseline.
**Player-level (§4.4):** year-to-year correlations of GOE_xG, SOE, GOE_xG+ at the player-season level.
**Robustness (Appendix B):** 20% of matchdays fixed hold-out; 10 replications of 90% subsamples of the remaining 80%; full pipeline re-run per replication.

## 4. Equations & assumptions
Frame-level joint probability (§3.1): `xG+_t = P_t(Shot) × P_t(Goal|Shot) = xS_t · xG_t`.
Possession-level aggregation: `xG+_poss = 1 − ∏_{t=1}^{n}(1 − xG+_t)` — "ensures that the total possession value is bounded by one and reflects both latent and realized scoring threats."
Max-per-possession: `max_t(xG+_t)`.
Stage-1 mixed-effects specification (lme4): `metric ~ (1|season) + (1|season:team) + (1|season:opp) + home`.
Stage-2 Poisson: `goals ~ home + season + team_off + opp_def`.
Player-season performance-over-expected (§4.4): `GOE_xG = Goals − xG`; `SOE = Shots − xS`; `GOE_xG+ = Goals − xG+` (xG and xG+ relative to goals; xS relative to shots). Per-match scaled versions: `GOE^xG+_pm = GOE_xG+/MP`, `GOE^xG_pm = GOE_xG/MP` (MP = matches played).
**Assumptions (stated or implied):** the possession product formula treats per-frame scoring events as independent across frames (independence not discussed); "clear possession in the attacking third" filter defines the analysis domain; xS and xG sub-models are estimated independently (no joint likelihood).

## 5. Features / target
Engineered features (Appendix A, Table 11 data dictionary): ball features — r (distance to goal center, m), theta (angle to goal center, rad), z (ball height, m), speed (m/s); goal feature — openGoal ([0,1]: unobstructed share of goalmouth, computed by modeling non-GK defenders as uniform 75 cm circles, taking tangent line pairs from ball to each defender between ball and goal, and measuring the unobstructed goal-line segments; Fig. 8); goalkeeper features — GK_r, GK_theta; outfield features — DefAngle_0..4 / DefDist_0..4 (bearing/distance to the 5 nearest non-GK defenders), OffAngle_0..4 / OffDist_0..4 (bearing/distance to the 5 nearest attackers, excluding the ball carrier — the carrier overlaps the ball and is excluded). Targets: xS = binary indicator that a shot occurs within the next second (per frame); xG = binary indicator that a shot taken in the current frame results in a goal. Horizon: 1 second ahead at frame level; possession level via aggregation.

## 6. Validation design
- **Sub-model training (§3.3):** 5-fold CV within each season, log-loss primary metric. Whether folds are time-ordered or shuffled frames: not stated in paper — if shuffled, adjacent-frame autocorrelation is a leakage risk (see §9).
- **Baseline comparison (§4.1):** logistic regression on four nested feature sets, identical CV splits, mean out-of-sample log loss ± SD.
- **Team-level forecasting (§4.3):** matchday-level rolling-origin CV (114 folds), two-stage mixed-effects Poisson, MSE/MAE/90% squared-error intervals/head-to-head win rate vs sum-of-xG.
- **Player-level (§4.4):** season-to-season correlations of GOE_xG, SOE, GOE_xG+; top/bottom-10 player-season tables.
- **Robustness (Appendix B):** fixed 20% matchday hold-out + 10 replications of 90% subsamples of the rest, full pipeline re-run.
- No time-ordered split for the sub-models; comparison-model hyperparameters not stated.

## 7. Numerical results / baselines
**Table 2 (mean out-of-sample log loss ± SD):** xG — XGBoost(all features) 0.326±0.0074 vs best logistic 0.337±0.0086 (improvement 0.011 = 3.3%); xS — XGBoost 0.0227±0.00089 vs best logistic 0.0251±0.00060 (improvement 0.0024 = 9.5%). XGBoost beats all logistic baselines on both tasks.
**Feature importance (Figs. 3–4, information gain):** ball distance r dominant for both models; ball speed ranks 2nd for xS, 3rd for xG; openGoal 2nd for xG, contributes little to xS. Partial dependence (Figs. 5–6): xS and xG decrease monotonically with distance (8–30 m for xS, 8–20 m for xG); higher ball speed → higher xS but lower xG (xG drops sharply from an idle ball); openGoal positively associated with xG; ball height negatively associated with xG (a proxy for body part used).
**Table 4 (MSE):** at-least-one — xG+ 2.84, xS 2.90, xG 2.94; max-per-possession — xG+ 2.84, xS 2.87, xG 2.91; sum-of-shots — xG 2.90.
**Table 5 (MAE):** at-least-one — xG+ 1.86, xS 1.87, xG 1.89; max-per-possession — xG+ 1.86, xS 1.86, xG 1.89; sum-of-shots — xG 1.87.
Paper: "Across all specifications, xG+ yielded the lowest error… The fact that xS also outperforms xG implies that short-horizon shot creation is a more stable team-level signal than shot quality."
**Table 6 (90% squared-error intervals):** at-least-one — xG+ (0.800, 2.25), xS (0.823, 2.28), xG (0.819, 2.32); max-per-possession — xG+ (0.792, 2.26), xS (0.817, 2.27), xG (0.802, 2.31); sum-of-shots — xG (0.822, 2.30). Intervals overlap; max-per-possession ≈ at-least-one for all metrics (paper: at-least-one "grows mechanically with possession length," max focuses on the single most dangerous moment).
**Table 7 (matchdays beating sum-of-xG, n=114):** at-least-one — xG+ 69 (0.605), xS 56 (0.491), xG 50 (0.439); max-per-possession — xG+ 70 (0.614), xS 60 (0.526), xG 56 (0.491). Under Binomial(114, 0.5): 69+ wins has p = 0.015, 70+ wins has p = 0.009 — "strong evidence that xG+ offers a genuinely better predictor of future team scoring."
**Table 8 (year-to-year correlations):** GOE_xG 0.12, SOE 0.63, GOE_xG+ 0.35.
**Table 9 (SOE extremes):** top — Rashford 22-23 (103 shots, xS 54.4, SOE +48.6, 35 matches), Salah 23-24 (+47.0), Semenyo 24-25 (+45.0), Haaland 23-24 (+44.5); bottom — Bernardo Silva 24-25 (27 shots, xS 43.1, SOE −16.1, 33 matches), Bruno Guimarães 22-23 (−15.1).
**Table 10 (per-match over-performance):** GOE_xG+ pm top-10 led by Haaland 22-23 (0.52, 36 goals, 35 matches), Haaland 23-24 (0.44), Marmoush 24-25 (0.41); GOE_xG pm top-10 led by Marmoush 24-25 (0.41), Wood 24-25 (0.31), Keane 24-25 (0.21) — the xG-only list is more sensitive to short finishing streaks; sample restricted to player-seasons with ≥10 matches with a shot opportunity.
**Appendix B Table 12 (min–max MSE difference vs sum-of-xG across 10 replications):** at-least-one — xG+ (−0.112, −0.0612), xS (−0.122, −0.0722), xG (−0.146, −0.0957); max-per-possession — xG+ (−0.0929, −0.0458), xS (−0.108, −0.0572), xG (−0.106, −0.0503). All uniformly negative — every possession-based approach beats sum-of-xG in every subsample, though the three cannot be cleanly ranked against each other.
All numbers are the paper's claims. Paper length: 12 tables, 8 figures.

## 8. Code / data availability
Raw data proprietary to Gradient Sports; no public URL. **No code link stated in the paper** (code availability: not stated in paper). Author affiliations (UPenn) stated; no repo or supplement link given in the text.

## 9. Leakage & limitations
- **Unreplicable data:** Gradient Sports tracking data is proprietary. No independent verification possible without a license.
- **Frame-shuffle leakage risk:** sub-models use 5-fold CV "within each season" — whether folds are matchday-blocked or shuffled frames is not stated; if shuffled, adjacent frames (1/30 s apart, near-identical features) land on both sides of the split, inflating sub-model diagnostics. The team-level matchday-blocked CV is clean.
- **Independence assumption:** the possession product formula assumes per-frame events are independent; xG+_t is strongly autocorrelated within a possession, so xG+_poss is better read as an index than a literal probability. The authors' own future-work section suggests temporal point processes or survival/hazard formulations as the fix.
- **Stated limitations (§5.2):** video-tracking measurement noise; trained only on 2022–2025 EPL (may not generalize to other leagues); 1-second xS horizon sensitive to timestamp misalignment (boundary effects); the "clear possession in the attacking third" filter depends on noisy possession indicators and can exclude genuine threats (dangerous crosses/through balls with no attackers nearby); openGoal treats players as identical 2D occluders (ignores reach, height, jumping); snapshot features omit sequential dependence (recovery runs, second balls, pass–shoot chains); possession-level xS summaries mechanically reward longer possessions; selection on opportunity persists (stronger teams reach dangerous states more often, not explicitly modeled).
- **Small absolute gains:** MSE 2.84 vs 2.90 (sum-of-shots) is a ~2% relative improvement; MAE differences are 0.01–0.03 goals. Real but modest.
- **External validity to NFL:** soccer has continuous possessions and a natural "shot" event; football has discrete plays. The frame-level machinery does not transfer; only the decomposition idea does (see §11).

## 10. GSE overlap
GSE's corpus already covers xG player/position-adjusted modeling (2301.13052, read in depth) and the football EP/selection-bias critique (2409.04889 Brill et al., read in depth), plus in-repo EPA/play, success rate, drive stats, and QB aggressiveness (attempt-generation-adjacent) from the 2026-09-17 gse-lab. What is **new** here: explicitly factorizing chance value into attempt-generation probability (xS) × conversion-given-attempt (xG) and the at-least-one-per-possession aggregation `1 − ∏(1 − p)` as a bounded drive/possession threat index. This is an **extension**, not a duplicate: GSE does not currently decompose EPA into attempt-rate vs. conversion components at the play level.

## 11. GSE implementation spec
NFL port of the decomposition (no tracking data needed):
1. **xS-analogue:** P(shot attempt | context) → P(aggressive play attempt | dropback): train XGBoost on nflverse 2020–2025 play-by-play to predict P(deep pass attempt, i.e., air_yards ≥ 15, | dropback) from down, distance, yardline, score differential, time, shotgun, defenders-in-box (where charted). This mirrors xS = shot-taking behavior.
2. **xG-analogue:** P(success | attempt): P(first down or TD | deep attempt) or P(completion | attempt) from the same features.
3. **Aggregation:** per-drive "threat" = 1 − ∏(1 − xS_t · xG_t) over the drive's plays; team-level drive-threat summed per game as a forward predictor.
4. **Validation:** week-blocked CV predicting team points/drive; baselines: EPA/play sums, success rate.
5. **Serving:** precompute per-play xS/xG from the fitted boosters; drive aggregation is O(plays). Estimated effort: 1–2 days (features exist in nflverse; no new data licensing).

## 12. Reproducible test
Dataset: nflverse play-by-play 2020–2024 (train), 2025 (test), plays filtered to dropbacks. Build the two XGBoost sub-models (deep-attempt occurrence; conversion given attempt), aggregate per drive via the product formula, and predict team offensive points per drive on held-out 2025 weeks (week-blocked). Baseline to beat: drive-level EPA/play sums and raw success rate. Metric: MAE/MSE of predicted vs. actual points per drive + head-to-head win rate vs. baseline across weeks (mirror of the paper's Table 7 design).

## 13. Acceptance / rejection gate
**Adopt** the attempt×conversion decomposition as a GSE feature family if, on the 2025 held-out weeks, the aggregated drive-threat metric beats the EPA/play-sum baseline on MAE with a paired week-level test at p < 0.05 **and** the attempt-generation component alone shows higher week-to-week stability (autocorrelation) than the conversion component — mirroring the paper's dual claim. Otherwise **reject** (the 2% MSE gain in soccer may not survive football's discrete-play structure).

## 14. Improvement experiment
Replace the frame/play-independence product with a **Hawkes self-exciting process**: let each play's attempt probability boost subsequent plays' probabilities within a drive (momentum/"hot offense" kernel), and compare the Hawkes-aggregated drive threat against the paper's independent product on the same week-blocked test. Rationale: the paper's own autocorrelation critique (§5.2–5.3, and the authors' suggested survival/hazard future work) implies independence is wrong; a self-exciting kernel directly models the within-drive dependence the product formula ignores, and GSE's gap list already flags Hawkes processes as absent from the corpus.
