# [0649] NFL Career Success as Predicted by NFL Scouting Combine (arXiv:2303.05774)

**Citation:** Brian Szekely, Christian Sinnott, Savannah Halow, Gregory Ryan (2023). *NFL Career Success as Predicted by NFL Scouting Combine*. arXiv:2303.05774v1. URL: https://arxiv.org/abs/2303.05774
**Ledger completed:** 2026-09-21. **Read:** full text (local full-text cache, `/tmp/arxiv750-cache/fulltext/2303.05774.txt`).
**Verdict:** ADAPT — a clean null result with genuine GSE value: combine drills predict draft matriculation (83%) but NOT career success (R²=0.17). The actionable finding is the feature-importance discrepancy: the 3-cone drill (most important for getting drafted) is the WORST predictor of actual NFL snaps — scouts overweight it, which is a market-inefficiency signal for rookie props and draft markets. GSE should down-weight combine metrics in rookie projections.

## 1. Research question
Can machine learning on NFL Scouting Combine drills predict (a) whether a draft prospect plays a single NFL snap (matriculation) and (b) how many total NFL snaps they play (career success)? Which combine drills matter most?

## 2. Dataset / schema
- NFL draft classes 2013–2017; 1,973 prospects → 805 with complete combine data (listwise deletion).
- Features: 6 combine drills — 40-yard dash (s), broad jump (in), bench press (reps @225), vertical jump (in), 20-yard shuttle (s), 3-cone drill (s). All positions pooled.
- Labels: matriculation (binary: ≥1 NFL snap); success (total career NFL snaps, all phases).
- 80/20 train/test split; 10-fold CV for model selection.

## 3. Method / model
- Classification (matriculation): SVM, multivariate logistic regression, gradient boosting, random forest, decision tree. Regression (snaps): SVM, gradient boosting, random forest, decision tree, linear regression.
- 10-fold CV selected random forest (classification) and linear regression (regression); RF tuned: 944 estimators, min_samples_split=2, min_samples_leaf=2, max_features=√n=3, max_depth=97, bootstrap.
- Feature importance: RF importances (classification) and linear-regression beta coefficients (regression).
- Code: https://github.com/bszek213/nfl_combine/tree/publish

## 4. Equations & assumptions
- No novel equations; standard RF/linear-regression machinery. Metrics: accuracy (classification), RMSE (regression).
- Assumptions: total snaps = career success proxy (position-agnostic); combine drills comparable across positions; listwise deletion doesn't bias (questionable — invites only, already selected sample); 2013–2017 classes representative.

## 5. Features / target
- Target: (a) binary matriculation; (b) continuous total snaps.
- Inputs: 6 combine drill measurements.

## 6. Validation design
80/20 split; model selection by 10-fold CV on training; final evaluation on held-out test set. No temporal/out-of-class validation.

## 7. Numerical results / baselines
- Matriculation: RF test accuracy 0.83 (CV 0.81); logistic 0.75, GB 0.77, SVM 0.76, tree 0.73.
- Snaps: linear regression best, CV RMSE 1,210.1; test RMSE 904.6, R² = 0.17 (others: SVM 1,298.8, GB 1,289.3, RF 1,276.0, tree 1,731.3).
- Feature importance (classification): 3-cone drill most important. Feature importance (regression betas): broad jump most important; 3-cone drill LEAST important for snaps.
- Headline: combine predicts getting INTO the league (83%) but explains only 17% of variance in career snaps — effectively a null result for success prediction.

## 8. Code / data availability
Code: https://github.com/bszek213/nfl_combine/tree/publish. Data: combine + draft data 2013–2017 (sources described, presumably Pro Football Reference / NFL.com).

## 9. Leakage & limitations
- R²=0.17 is the finding, not a flaw — but it means the regression model itself is useless as a predictor.
- Listwise deletion (1,973→805) selects on combine completeness; invite-only sample already range-restricted → attenuates all correlations.
- Snaps conflate special-teamers with starters; position-pooled analysis mixes QBs with long snappers.
- No college production features — the obvious missing predictor (the authors note this).
- 2013–2017 classes; combine training industry has evolved since.
- No calibration or uncertainty quantification; accuracy 83% on matriculation partly reflects base rate.

## 10. GSE overlap
Per ~/workspace/arxiv-sweep/existing-research-map.md: Garrett's corpus has draft/prospect coverage but no dedicated combine-predictive-validity study with the matriculation-vs-success split and the drill-level importance discrepancy. The NGS/tracking lane doesn't cover combine drills. This fills a specific gap: an evidence-based prior on combine-metric weights. Extension, not duplicate.

## 11. GSE implementation spec
- Use as a NEGATIVE prior in GSE's rookie model: cap combine-feature weights in rookie-season projections; do not let 40-yard dash / 3-cone standouts move rookie fantasy projections materially.
- Draft-market angle: draft position embeds scout overweighting of the 3-cone (most important for matriculation, least for success). For rookie-season props (rookie of the year, season-long yardage props on rookies), fade rookies whose draft slot was driven by combine testing over college production; favor productive college players with mediocre testing (the paper implies the market-relevant signal is elsewhere).
- Concrete rule: in GSE's rookie projection blend, weight = α·college production + β·draft position + γ·combine with γ ≤ 0.1 and 3-cone excluded or signed near-zero for RB/WR/TE; broad jump allowed small positive weight (only drill with any success signal).
- Effort: low — a weighting-policy change plus a one-page note in the rookie-model docs; optionally re-run the paper's pipeline on 2018–2023 classes with college production added to confirm.

## 12. Reproducible test
Dataset: draft classes 2018–2022, combine data + college production (sports-reference/cfb), rookie-season fantasy points. Test 1 (replication): re-run paper's RF/logistic pipeline; gate = matriculation accuracy 0.78–0.88 (replicates) and snaps R² < 0.25 (null replicates). Test 2 (improvement): add college dominator rating + breakout age; gate = snaps R² ≥ 0.35 (college production carries the signal) and 3-cone importance rank drops out of top-4 when production features present — confirming the weighting policy.

## 13. Acceptance / rejection gate
ADAPT if Test 1 replicates (combine predicts matriculation, not success) — the negative prior stands regardless of Test 2. REJECT only if combine metrics strongly predict success on modern classes (R² ≥ 0.35 without production features), which would overturn the paper. The adaptation is a modeling constraint, not a predictor — judge it on whether GSE's rookie projections avoid the combine trap, not on a new edge.

## 14. Improvement experiment
Position-specific combine validity: re-run per position group (RB/WR/TE/QB/OL/DL/LB/DB) with position-relevant success metrics (e.g., WR: career receiving yards; EDGE: sacks) instead of pooled snaps. Teramoto et al. (2016) found vertical/40 signal for RB/WR specifically — test whether the null is a pooling artifact and whether any drill × position cell has real predictive power worth a nonzero GSE weight.
