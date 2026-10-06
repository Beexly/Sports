# [0067] MLFEF: Machine Learning Fusion Model with Empirical Formula to Explore the Momentum in Competitive Sports (arXiv:2402.12149v2)

**Citation:** Ruixin Peng, Ziqing Li (2024). *MLFEF: Machine Learning Fusion Model with Empirical Formula to Explore the Momentum in Competitive Sports*. ICSCIS 2024 (International Conference on Smart City and Information System, Kuala Lumpur, May 17–19, 2024); ACM DOI 10.1145/3685088.3685177. arXiv:2402.12149v2. URL: https://arxiv.org/abs/2402.12149v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF, 713 lines).
**Verdict:** REJECT — a COMAP student-competition paper whose headline result (XGBoost R² = 0.99985 on point winners) is label leakage, whose "empirical formula" is never printed, and whose momentum analysis never tests out-of-sample prediction; tennis-only and strictly weaker than the negative result Garrett's momentum lane already holds.

## 1. Research question
The paper tries to define and quantify "momentum" in tennis. Two models: (1) a **data-driven** ML fusion model (SVM + Random Forest + XGBoost, stacked) predicting the point winner (`point_victor`); (2) an **empirical-formula** model where feature weights are set from "the suggestions of many tennis players and enthusiasts" and a sliding window computes per-point momentum. Momentum fluctuations are then analyzed with CUSUM (turning-point detection) and a run test (randomness), plus Monte Carlo robustness checks. Contributions claimed: a fused ML model, feature-importance ranking, momentum visualization, CUSUM/run-test analysis showing momentum is "not random" while turning points are "random to a certain extent." **Provenance flag:** the acknowledgments state the work grew out of the authors' participation in the **COMAP-MCM competition** (2024 MCM Question C, "Momentum in Tennis") — this is an undergraduate modeling-competition paper later published at a minor conference whose topic (Smart City and Information Systems) does not match sports analytics.

## 2. Dataset / schema
- **Data:** 2023 Wimbledon men's singles, **31 matches** in the dataset (per Table 4). Public match data from the past five years + player personal info.
- **Schema:** point-level match data (50 features before reduction, grouped in Table 1 as `points_won_meta`, `match_no_meta`, `sets_meta`); sample matches analyzed: 2023-wimbledon-1312, 2023-wimbledon-1601.
- **Preprocessing:** drop columns with ~12% missing values (e.g., `return_depth`: 31 missing in one match, 48 in another) rather than impute; mode-impute other missing non-numeric values; one-hot encode categoricals; PCA reduces **50 → 44 features** (Table 1).

## 3. Method / model
- **Data-driven model:** regression framing on `point_victor` as label with **35 retained features**; models compared: Neural Network, Random Forest, AdaBoost, XGBoost (XGBoost `num_round` tuned to 126 via Bayesian optimization). Train/test split: **random 70/30** (not time-ordered; §2.4 uses finals as test, semifinals as validation, rest as train for the fusion model — inconsistent with the earlier 70/30).
- **Fusion model (§2.4):** base learners SVM, RF, XGBoost; 10-fold CV base accuracies **92.6%, 96.4%, 97.5%** → weight coefficients 0.323/0.336/0.340 (weighted average) and stacking with logistic regression meta-model: **F(x,y) = 0.926·SVM(x,y) + 0.964·RF(x,y) + 0.975·XGBoost(x,y)** (Eq. 1). Note the printed weights (0.926/0.964/0.975) differ from the weighted-average coefficients (0.323/0.336/0.340) stated just above — the paper uses both without reconciling them; **flagged as internally inconsistent.**
- **Empirical momentum:** weights from enthusiast suggestions + sliding window → per-point "momentum"/"potential energy" per player; stacked area charts (Figs. 9–10).
- **CUSUM (§3.2):** turning point = cumulative sum crossing zero again; marks "swings in play and runs of success" (Fig. 11).
- **Run test (§3.3):** on p1/p2_momentum and p1/p2_turning_points for two sample matches (2023-wimbledon-1312, -1601) and then all 31 matches.
- **Robustness (§4):** 1000 Monte Carlo simulations of random 70/30 re-splits; accuracy density peaks ~0.997 (RF), 0.987 (XGB), 0.97 (SVM).

## 4. Equations & assumptions
- **Eq. 1 (stacking), quoted verbatim:** F(x,y) = 0.926 ∗ SVM(x,y) + 0.964 ∗ RF(x,y) + 0.975 ∗ XGBoost(x,y). Note the printed weights differ from the weighted-average coefficients (0.323/0.336/0.340) stated just above — **internally inconsistent, flagged.**
- **No other equations.** The "empirical formula" weights are described only verbally ("based on the suggestions of many tennis players and enthusiasts," sliding window) — **no formula is actually printed.** The momentum definition is not mathematically specified anywhere in the paper.
- **Assumptions:** none stated mathematically; the empirical momentum weights rest on enthusiast opinion rather than estimation.

## 5. Features / target
- **Input features:** 35 retained features after PCA (50 → 44) — Table 1 groups: `points_won_meta`, `match_no_meta`, `sets_meta`. Point-level outcome-derived features.
- **Target:** `point_victor` (the point winner) — the label is predicted from features that include the same point-level outcome information used to construct "momentum" (points won, sets, etc.); the reported XGBoost R² = 0.99985 is a textbook leakage signature, not a modeling achievement.
- **Horizon:** concurrent-point prediction, not forecasting.

## 6. Validation design
- **Splits:** random 70/30 (not time-ordered); §2.4 alternatively uses finals as test, semifinals as validation, rest as train for the fusion model — inconsistent with the earlier 70/30 scheme.
- **Baselines:** Neural Network, RF, AdaBoost, XGBoost compared singly; then fused (SVM/RF/XGB) with 10-fold CV base accuracies.
- **Metrics:** MAPE, MAE, R² (Table 2); run-test z-statistics and p-values (Tables 3–4); Monte Carlo accuracy densities (§4).
- **Critical gap:** no predictive test of momentum itself — the paper never tests whether momentum (or turning points) predicts *future* outcomes; it only tests whether the constructed momentum series is non-random in-sample.

## 7. Numerical results / baselines
All numbers quoted exactly as in the paper; all are the paper's claims, not this ledger's.
- **Table 2 (single-match model comparison):** XGBoost train MAPE 0.191 / test MAPE 0.168, MAE 0.000876, **R² 0.999851105**; RF R² −0.089; AdaBoost R² −0.032; Neural Net R² −5.367. (The near-perfect XGBoost fit with negative R² for all competitors confirms the label is effectively in the features.)
- **Base-learner 10-fold CV accuracies (§2.4):** SVM 92.6%, RF 96.4%, XGBoost 97.5%; fusion weights 0.323/0.336/0.340.
- **Table 3 (run test, one match, n=170):** p1_momentum z=−9.385, p=0.000***; p2_momentum z=−8.923, p=0.000***; p1_turning_points p=0.943; p2_turning_points p=0.696. Conclusion stated: momentum non-random, turning points random.
- **Table 4 (run test, all 31 matches):** momentum non-random in **31/31 (mean 1.0, std 0.0)** for both players; turning points non-random in **38.7%** (p1) / **25.8%** (p2). The paper's headline: "momentum is not random but the turning points in matches is hard to predict based on previous behavior."
- **Monte Carlo (§4):** 1000 random 70/30 splits; accuracy peaks ≈ 0.997 (RF), 0.987 (XGB), 0.97 (SVM).

## 8. Code / data availability
- **Code:** Not stated in paper. **Data:** 2023 Wimbledon via the MCM competition dataset; no links given. **No equations to implement** (the empirical formula is never specified). Nothing here is reproducible from the paper alone.

## 9. Leakage & limitations
- **Stated:** §5 lists only future work (combining with sports-betting analysis).
- **Reviewer view (adversarial — fatal):**
  1. **Label leakage:** predicting `point_victor` from point-outcome-derived features with R² = 0.99985 — the model "predicts" what is already in its inputs. Nothing here transfers to forecasting.
  2. **Momentum is never tested as a predictor:** the run-test result (momentum is non-random in-sample) says nothing about whether momentum predicts future points — the only question that matters for GSE. This is the same trap Garrett's momentum lane already rejected: in-sample structure ≠ predictive signal (cf. Koopman/DMD momentum rejected at p=0.89, AR(1) wins).
  3. **The empirical formula is never printed** — weights "from enthusiasts' suggestions" are not a reproducible method.
  4. **Internal inconsistency:** two different fusion weightings (0.323/0.336/0.340 vs. 0.926/0.964/0.975) with no reconciliation; two different train/test schemes (70/30 random vs. finals/semifinals/rest).
  5. **Tennis-only, 31 matches, student-competition provenance, mismatched venue** (Smart City conference), 1 citation.
  6. **No NFL carryover:** no team-sport dynamics, no betting application tested (only gestured at in future work, citing Vizard's "Betting Against Momentum").

## 10. GSE overlap
- **Garrett's momentum lane:** Koopman/DMD momentum already REJECTED (p=0.89; AR(1) beats DMD). This paper tests nothing beyond in-sample non-randomness and is strictly weaker evidence than that rejection.
- **This batch:** 0062 TCDformer (REJECT) — also tennis momentum; same verdict, same reason (no out-of-sample predictive validation, tennis-only).
- **Cited by the paper:** Chen et al. 2021 (basketball momentum, Journal of Applied Statistics), Vizard 2023 "Betting Against Momentum" (SSRN) — neither is in GSE's corpus per the existing-research map; both would need the same AR(1)-null treatment before adoption.
- Assessment: duplicate of an already-rejected lane at strictly lower evidentiary quality.

## 11. GSE implementation spec
Not recommended (REJECT). No component worth implementing — the paper offers no transferable method: its "momentum" is a tennis-specific, in-sample construct with no demonstrated predictive value, and its headline ML result is label leakage. GSE's momentum lane already has a harder negative result (Koopman/DMD rejected, AR(1) wins) than anything this paper tests.

## 12. Reproducible test
Skipped — REJECT. If a future momentum claim of this shape appears, the correct test is the one Garrett's lane already ran: out-of-sample, time-ordered, against an AR(1) null. This paper ran no such test.

## 13. Acceptance / rejection gate
1. **Numeric criterion:** none can be anchored to this paper's reported numbers. The only candidates — XGBoost R² = 0.99985 on `point_victor` (Table 2) and the 10-fold fusion accuracies 92.6%/96.4%/97.5% (§2.4) — are label-leakage artifacts per §9 (the label is effectively in the features), and the empirical-formula momentum was never tested out-of-sample. No legitimate baseline exists from which to derive a pass threshold.
2. **Comparison that would be required:** out-of-sample, time-ordered prediction of future point/serve outcomes from pre-point momentum features vs. an AR(1)/Elo null — the exact test Garrett's lane already ran (Koopman/DMD rejected at p=0.89, AR(1) wins). This paper ran no such test.
3. **Decision rule:** the acceptance gate FAILS by construction — no adoption criterion is satisfiable from this paper. REJECT.

## 14. Improvement experiment
Not applicable — REJECT. A legitimate version of this paper would: (a) define momentum from *pre-point* information only, (b) test out-of-sample prediction of future points/sets vs. an Elo/AR(1) null, (c) publish the empirical formula. The current paper does none of these.
