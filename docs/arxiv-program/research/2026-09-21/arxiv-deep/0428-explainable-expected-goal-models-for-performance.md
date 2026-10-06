# [0428] Explainable expected goal models for performance analysis in football analytics (arXiv:2206.07212v2)

**Citation:** Mustafa Cavus and Przemysław Biecek (2022). *Explainable expected goal models for performance analysis in football analytics*. arXiv:2206.07212v2. URL: https://arxiv.org/abs/2206.07212v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1648 lines).
**Verdict:** ADAPT — adopt the aggregated-profiles (AP) "semi-global explainer" as GSE's standard what-if tool for player/team prop analysis (per-player and per-team ceteris-paribus profiles over distance/angle-like features), while rejecting the paper's ROSE-oversampled random forest as a model (its probability calibration is suspect and its behavior shifts under resampling — the paper's own finding).

## 1. Research question
Can an accurate expected-goals model be trained on a large multi-season, multi-league shot dataset that performs well on both the majority (no goal) and minority (goal) classes, and can explainable-AI tools — specifically aggregated ceteris-paribus profiles — turn that black-box model into a practical team/player performance-evaluation and what-if analysis instrument?

## 2. Dataset / schema
315,430 shots (33,656 goals, ~10.66%) from 12,655 matches across 7 seasons (2014–15 to 2020–21) of the top-five European leagues, scraped from Understat via the worldfootballR R package; 1,012 own-goal shots excluded. League summary (matches/shots/goals/conversion): Bundesliga 2,141/55,129/6,161/11.2%; EPL 2,650/66,605/6,951/10.4%; La Liga 2,648/62,028/6,854/11.0%; Ligue 1 2,557/61,053/6,438/10.5%; Serie A 2,659/70,615/7,252/10.3%. Features: minute, home/away, situation (direct free kick, corner, open play, penalty, set play), shot type (head, left foot, right foot, other), last action (pass, cross, rebound, head pass + 35 more levels), distance to goal ([0.295, 84.892] m), angle to goal ([0.10°, 90°]). Distance/angle computed from normalized pitch coordinates on a standardized 105m × 68m pitch (Eqs. 2–3).

## 3. Method / model
forester AutoML over tree-based classifiers (random forest, XGBoost, LightGBM, CatBoost), 80/20 train/test split. Imbalance handled by ROSE random over-sampling (smoothed bootstrap). Best model: random forest on over-sampled data. Explanation: aggregated profiles (AP) — for a group of observations (a team's shots in a match, a player's shots in a season), average the ceteris-paribus profiles over the group: ĝ_AP^j(z) = (1/k) Σ_i f(x_i^{j|z}). AP sits between local CP profiles (one observation) and global PDP (whole dataset) — the paper calls it a "semi-global explainer." Applications: Schalke 04 vs. Bayern Munich (2021-01-24) team what-ifs; Burak Yilmaz / Messi / Lewandowski 2020–21 season player comparisons.

## 4. Equations & assumptions
Stated in the paper:
- Classifier: f: X → Y minimizing L(f) = P[Y ≠ f(X)] (Eq. 1)
- Distance to goal: X_i^{DTG} = sqrt([105 − (L_i×105)]² + [34 − (W_i×68)²]) (Eq. 2)
- Angle to goal: X_i^{ATG} = |a_i/b_i × 180/π|, a_i = arctan[7.32×[105−(L_i×105)]], b_i = [105−(L_i×105)]² + [34−(W_i×68)]² − (7.32/2)² (Eq. 3)
- Aggregated profile: g_AP^j(z) = E_{X}^{−j}[f(X^{j|z})] (Eq. 4); estimator ĝ_AP^j(z) = (1/k) Σ_{i=1}^k f(x_i^{j|z}) (Eq. 5)
- xG_{player/team} = Σ_{i=1}^{n_i} f(X_i) (Algorithm 1)
Assumptions: (a) the standardized 105×68 pitch is valid for all stadiums; (b) ROSE over-sampling preserves the feature–response relationship (the paper's own §4 discussion undermines this — PDP curves shift after balancing); (c) averaging CP profiles over a player's shots is meaningful despite the shots being non-independent; (d) the forester AutoML defaults are adequate (no tuning reported).

## 5. Features / target
Features listed in §2 (minute, home/away, situation, shot type, last action with 39 levels, distance to goal, angle to goal). Target: binary goal/no-goal per shot. AP analysis features: distance to goal and angle to goal (the two dominant features). Prediction horizon: per-shot goal probability.

## 6. Validation design
80/20 train/test split (random, not time-ordered — seven pooled seasons). Three sampling arms: original, over-sampled (ROSE), under-sampled. Metrics in two families: standard (recall, precision, F1, accuracy, AUC) and imbalance-appropriate (MCC, Brier score, log-loss, balanced accuracy). Literature comparison (Table 4) against Eggels et al., Pardo, Tippana, Anzer & Bauer, Haaren, Umami et al., Fernandez et al. — though many cells are empty because those papers did not report the same metrics. Behavior check: PDP curves for distance-to-goal across the three sampling arms (Fig. 5).

## 7. Numerical results / baselines
Table 3 — random forest (the winning model; exact):
- Over-sampled: recall 0.958, precision 0.922, F1 0.940, accuracy 0.939, AUC 0.985, MCC 0.879, Brier 0.071, log-loss 0.270, balanced accuracy 0.939
- Under-sampled: 0.858, 0.882, 0.870, 0.871, 0.954, 0.743, 0.104, 0.352, 0.871
- Original: 0.304, 0.888, 0.453, 0.921, 0.975, 0.493, 0.051, 0.173, 0.649
Table 4 — literature comparison: the paper's over-sampled random forest is bolded best in precision (0.922), F1 (0.940), AUC (0.985), Brier (0.071), MAE (2.0); Fernandez et al.'s XGBoost has lower log-loss (0.254 vs. 0.270).
Table 5 — Schalke 04 vs. Bayern Munich, 2021-01-24 (exact): Schalke 0 goals, xG 2.67, 13 shots, μ_ATG 25.23°, μ_DTG 17.99m; Bayern 4 goals, xG 9.59, 31 shots, μ_ATG 27.79°, μ_DTG 16.96m. AP what-ifs: Schalke reducing mean distance 18m→15m raises per-shot xG ~40%; mean angle 25°→35° raises per-shot xG ~20%.
Table 6 — 2020/21 player seasons (exact): Burak Yilmaz 24 games, 16 goals, xG 24.77, 66 shots, μ_ATG 22.33°, μ_DTG 19.43m; Messi 35 games, 30 goals, xG 70.00, 195 shots, 21.66°, 19.23m; Lewandowski 28 games, 40 goals, xG 65.71, 132 shots, 34.69°, 12.94m. AP what-ifs: all three shooting from 15m raises per-shot xG ~20%; Lewandowski's AP rises after 25° and reaches ~0.5 average xG at 50°.
Discussion finding: PDP curves for distance-to-goal differ across original/over/under-sampled models — resampling changes model behavior, not just class balance (the paper's own cautionary result).
My interpretation: the over-sampled model's headline metrics (AUC 0.985, F1 0.940) are inflated by evaluating on over-sampled test data — note the ORIGINAL-data model has better Brier (0.051) and log-loss (0.173) than the "winning" over-sampled model (0.071, 0.270). For a probability model used in betting, Brier/log-loss on untouched data is what matters, and by those metrics the original-data model wins. The paper optimizes the wrong scoreboard for GSE's purposes.

## 8. Code / data availability
R code: https://github.com/mcavs/Explainable_xG_model_paper. Data: Understat via worldfootballR (public scraping path).

## 9. Leakage & limitations
Adversarial: (a) Random 80/20 split over seven pooled seasons — future seasons in train, past in test; no temporal validity. (b) The "best" model is selected on metrics computed after over-sampling, which the paper itself shows distorts model behavior (Fig. 5) — the selection criterion is contaminated by the treatment. (c) Brier/log-loss on original data favor the non-sampled model, but the paper still crowns the over-sampled one — metric shopping. (d) forester AutoML with no reported hyperparameter tuning; the literature comparison (Table 4) compares tuned-by-others models against defaults. (e) AP what-if claims (e.g., "+40% per-shot xG") are read off profile curves without uncertainty bands — extrapolation beyond observed feature support is not flagged. (f) Own goals excluded (1,012 shots) — fine, but noted. External validity to NFL: the AP machinery is fully general — per-player/per-team aggregated profiles over any expected-metric model. The sampling lesson transfers directly: do not over-sample rare NFL outcomes (turnovers, explosive plays) and then select models on distorted metrics.

## 10. GSE overlap
Extension with a genuinely new tool. The map's deeply covered xG paper (2301.13052) covers player/position-adjusted xG values; the map's XAI/interpretability coverage is not named as a gap explicitly, but nothing in the corpus provides a per-player or per-team "semi-global" what-if instrument — the closest are global feature-importance and local single-play explanations. The props-reverse-engineering docs contain no ceteris-paribus profiling. AP is new capability: a what-if engine ("what would this WR's expected yards look like if his average target depth were 2 yards shorter?") built on models GSE already has. The paper's modeling choices (ROSE, random forest) are NOT adopted — only the explanation layer.

## 11. GSE implementation spec
Build "AP what-if" as a layer over existing GSE expected-metric models (no new model training): (1) Take the house expected-yards-per-target model (or CPOE model). (2) For any player/team and any feature (aDOT, distance, angle-equivalent like target location, defensive front), compute aggregated CP profiles: fix the feature at a grid of values, average predictions over that player's actual targets from the current season. (3) Serve in two surfaces: internal prop-research notebook ("show me Jefferson's expected-yards profile over aDOT 6–14") and content graphics ("what if the Chiefs threw 2 yards deeper on average"). (4) Guardrails from §9: profiles computed on the original data distribution only; shade regions outside the player's observed feature support; bootstrap CIs on the profile curves. Effort: 2 days (the models exist; this is a prediction-averaging harness + plotting).

## 12. Reproducible test
Dataset: nflverse 2024 season. For 20 high-volume WRs/TEs: compute AP curves over aDOT (grid 4–16 yards) from the house expected-yards model; extract each player's predicted per-target yards at his observed mean aDOT vs. at ±2 yards. Test 1 (fidelity): the AP value at observed mean aDOT must match the player's actual season yards-per-target within ±0.5 (the profile is a faithful summary, not a fantasy). Test 2 (stability): split the season halves; the AP curves from half 1 must rank players' half-2 efficiency with Spearman ≥ 0.5. Baseline: global PDP (whole-dataset profile) — AP must beat it on Test 2 to justify the per-player machinery.

## 13. Acceptance / rejection gate
ADOPT the AP what-if layer if Test 1 fidelity holds for ≥ 16 of 20 players AND Test 2 shows AP beats the global PDP by ≥ 0.10 Spearman points on half-2 efficiency ranking. REJECT (or keep internal-only) if AP curves are unstable across halves (median player curve correlation < 0.7) — unstable profiles produce content that will embarrass the brand when the "what-if" doesn't reproduce. Separately and permanently: REJECT ROSE-style over-sampling for any GSE probability model on the paper's own evidence (Brier/log-loss worse on untouched data; behavior shift in Fig. 5).

## 14. Improvement experiment
Go beyond the paper's static profiles: build conditional aggregated profiles — AP curves conditioned on a second feature (e.g., aDOT profile split by man vs. zone coverage, or by home/away). The paper only ever varies one feature marginally; coverage-conditional profiles answer the sharper prop question ("is his deep-target efficiency a coverage artifact?"). Test whether coverage-conditional AP explains week-to-week target-efficiency variance better than the marginal AP on the §12 Test 2 harness. If it wins, GSE's what-if engine is strictly more informative than the paper's; if not, the marginal AP stands and the experiment cost an afternoon of groupby-aggregations.
