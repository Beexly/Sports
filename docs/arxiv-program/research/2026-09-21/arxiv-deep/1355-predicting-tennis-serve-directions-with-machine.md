# [1355] Predicting Tennis Serve Directions with Machine Learning (arXiv:2602.22527v1)

**Citation:** Zhu, Y., & Naikar, R. (2026). *Predicting Tennis Serve Directions with Machine Learning*. arXiv:2602.22527v1 [cs.LG]. URL: https://arxiv.org/abs/2602.22527
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org, 11 pages, complete).
**Verdict:** ADAPT — per-player serve-direction models hitting ~49–50% accuracy on 6 targets (vs ~16.7% chance) from point-charting features give GSE a directly reusable blueprint for serve/return prop features and live in-play serve-tendency priors; the paper's random point-level 70/30 split is not match-grouped, so GSE must re-validate with grouped chronological splits and recalibrate the classifiers into probabilities before any use in pricing.

## 1. Research question
Can the direction of a tennis first serve (wide / body / down-the-T, on deuce or ad side — 6 targets) be predicted from point-charting data with standard machine learning, and which features (rally/run dynamics, scoreboard-pressure "performance anxiety," surface, opponent handedness) carry the signal? The authors build per-player models for selected ATP/WTA players and compare five classifiers. (Secs. 1, 6)

## 2. Dataset / schema
Tennis Match Charting Project (public, charted by volunteers): 3,424 matches of 655 male players and 1,916 matches of 422 female players. Analysis restricted to players with at least 30 matches; results presented for 10 selected men (Djokovic, Federer, Kyrgios, Medvedev, Murray, Nadal, Thiem, Tsitsipas, Wawrinka, Zverev) and 10 selected women, chosen by ranking/achievements; authors state other players' results are "generally consistent." No date range stated for the charted matches. (Secs. 5, 6)

## 3. Method / model
- Per-player models (one model per player, not pooled): multinomial logistic regression, decision tree, random forest (200 trees, max depth 150), multiclass SVM, neural network (sklearn MLPClassifier, two hidden layers (200, 100)). Also tried bagging (50 estimators), AdaBoost (70 estimators), XGBoost (K=10) — "no better than the models mentioned above," results omitted.
- Target: first-serve direction among 6 (wide/body/T × deuce/ad); deuce-side and ad-side serves modeled separately.
- Features (Sec. 5): (a) **run index** — estimated court movement per point inferred from charted shot type/direction/depth (includes running, unlike raw rally count; less accurate than Hawkeye, which is not public); (b) **performance anxiety index** from the OCC emotion model: anxiety = uncertainty × (hope + fear) computed at game, set, and match levels (3 features) plus overall anxiety = game + set + match anxiety (1 feature); uncertainty from score gaps at each of tennis's three hierarchical levels, hope from closeness to winning, fear from closeness to losing (hope and fear not treated as negatives of each other); (c) court surface; (d) opponent handedness.
- Train/test: random 70/30 point-level split per player, same splits reused across models; accuracy on test points. (Sec. 6)

## 4. Equations & assumptions
- performance anxiety = uncertainty × (hope + fear) (eq. 1), computed separately at game/set/match level; overall anxiety = game anxiety + set anxiety + match anxiety (eq. 2).
- Assumptions: charted serve-direction labels are ground truth; each serve is an independent observation conditional on features (point-level i.i.d. — the key weakness, see Sec. 9); OCC-model anxiety is a valid proxy for scoreboard pressure; 6 serve directions (vs 14 used in some prior work) is the right granularity; per-player models with ≥30 matches have enough data.

## 5. Features / target
Inputs: run index, game/set/match anxiety indices, overall anxiety, court surface, opponent handedness (plus rally-context features from charting, Sec. 5.1–5.2). Target: first-serve direction (6 classes: wide/body/down-the-T on deuce side; wide/body/down-the-T on ad side), predicted separately for deuce-side and ad-side serves.

## 6. Validation design
Random 70/30 split of each player's serve points (NOT match-grouped, NOT chronological — see Sec. 9). Same train/test partitions across all five classifiers; accuracy compared across models and players. No cross-validation, no calibration analysis, no reported baselines beyond implicit chance (~1/6 ≈ 16.7%). Tables 1–4 report per-player per-model accuracies.

## 7. Numerical results / baselines
- Men, deuce side (Table 1, mean over 10 players): LR 0.50, RF 0.49, DT 0.46, SVM 0.49, NN 0.50, overall MEAN 0.49. Standouts: Murray 0.55–0.58 (mean 0.55), Kyrgios 0.50–0.55 (0.53), Thiem 0.43–0.55 (0.51).
- Men, ad side (Table 2): LR 0.51, RF 0.49, DT 0.47, SVM 0.51, NN 0.51, MEAN 0.50. Standouts: Thiem 0.52–0.58 (0.56), Federer 0.52–0.59 (0.55), Medvedev 0.49–0.60 (0.53).
- Abstract reports average accuracy "around 49% for male players and 44% for female players" (women's tables follow the same pattern at slightly lower levels).
- No single classifier dominates: LR, RF, SVM, NN all cluster within ~1–3 points of each other per side; decision trees consistently worst.
- Authors note some players are more predictable from one side than the other (deuce vs ad asymmetry).

## 8. Code / data availability
None stated for code. Data: Tennis Match Charting Project (public; https://github.com/JeffSackmann/tennis_MatchChartingProject — standard public source, not restated in paper).

## 9. Leakage & limitations
- **Critical:** random point-level 70/30 split means serves from the SAME match appear in both train and test. Serve tendencies are match- and opponent-specific (surface, opponent handedness, tactical game plan), so test accuracy is inflated by within-match leakage; true out-of-match generalization is unmeasured and certainly lower.
- No chronological split: a model trained partly on later matches predicting earlier ones is unusable for forward betting.
- Accuracy only — no predicted probabilities, no calibration, no log-loss; classifiers are not directly usable for pricing without recalibration.
- Selected-player reporting (10+10 of 655/422) risks cherry-picking; "generally consistent" is unverifiable.
- Anxiety index is a hand-built heuristic on top of score state, not a learned representation; its incremental value over raw score features is not ablated.
- Charting data is volunteer-coded with unknown label error; no inter-rater reliability reported.

## 10. GSE overlap
Garrett's corpus has tennis modeling work but nothing on point-level serve-direction prediction from charting features — the serve-tendency prior is new capability, not duplication (existing-research-map.md: no serve-direction entries). It plugs directly into GSE's tennis props lane (serve-based markets: aces, double faults, service holds) and live in-play modeling, where a serve-direction prior conditions return-position and rally-length expectations.

## 11. GSE implementation spec
- Data: Match Charting Project point-level data (public) merged with GSE's odds feeds; rebuild features (run index, anxiety indices, surface, opponent handedness) per the paper's Sec. 5 recipes.
- Model: per-player gradient-boosted multinomial classifiers (start with the paper's five, then XGBoost/LightGBM), but with **match-grouped, chronological splits** (train on matches before date T, test after); calibrate with isotonic/Platt scaling and evaluate log-loss alongside accuracy.
- Serve as: (a) pre-match feature for serve-prop pricing (ace/DF/hold probabilities conditioned on predicted direction mix vs opponent return tendencies); (b) live prior updated point-by-point for in-play serve/return markets.
- Effort: ~2 weeks for data pipeline + grouped-validation harness; 1 week per model iteration.

## 12. Reproducible test
Dataset: Match Charting Project, matches before 2025-01-01 train / after test, grouped by match. Baseline: per-player empirical direction frequencies (no features). Metric: multiclass log-loss and top-1 accuracy on the post-cutoff matches. The paper's feature set must beat the empirical-frequency baseline on log-loss to justify the complexity.

## 13. Acceptance / rejection gate
ADAPT if grouped-chronological log-loss beats the per-player empirical-frequency baseline by ≥5% AND calibration slope on held-out matches is within [0.85, 1.15]; otherwise REJECT the ML layer and use empirical direction frequencies as the serve prior.

## 14. Improvement experiment
Replace the hand-built OCC anxiety index with learned score-state embeddings (a small neural net over the full hierarchical score tensor: sets/games/points/break points) trained end-to-end with the direction classifier — test whether learned pressure representations beat the anxiety = uncertainty × (hope+fear) heuristic on grouped log-loss, and inspect which score states the model finds most predictive.
