# [0724] Probability Calibration Trees (arXiv:1808.00111v2)

**Citation:** Tim Leathart, Eibe Frank, Geoffrey Holmes, Bernhard Pfahringer (2017). *Probability Calibration Trees*. ACML 2017. arXiv:1808.00111v2. URL: https://arxiv.org/abs/1808.00111v2
**Ledger completed:** 2026-09-21. **Read:** full text via local cache /tmp/arxiv750-cache/fulltext/1808.00111.txt (232 lines, full: abstract, §1–§6, all tables).
**Verdict:** ADAPT — localized probability calibration: Platt scaling fitted in different regions of the input space (logistic-model-tree variant), outperforming global Platt scaling and isotonic regression on average. Complements 0723's temperature scaling: use global temperature when miscalibration is uniform, calibration trees when it varies by regime.

## 1. Research question
Do global calibration methods (Platt scaling, isotonic regression) fail because miscalibration is not uniform across the input space — and can a logistic-model-tree variant that learns different calibration models in different regions beat them?

## 2. Dataset / schema
32 UCI datasets (24 classic + 8 recent: bankruptcy, colposcopy, htru2, hand-postures, mice-protein, news-popularity, phishing, taiwan-credit). Instances 226–78,095, attributes 6–240, classes 2–24. Base learners calibrated: naive Bayes, boosted stumps, boosted decision trees (LogitBoost, 100 iterations), SVMs with RBF kernels.

## 3. Method / model
**Probability calibration trees**: C4.5 tree on original attributes for structure; LogitBoost logistic models on base-learner output scores at each node (parent model as warm start); prune by CART cost-complexity minimizing RMSE (sqrt Brier/m), not 0-1 loss; boosting iterations chosen via CV optimizing RMSE; input probabilities transformed to log-odds (eq 4) before calibration; natively multiclass (no one-vs-rest); trained on held-out internal 5-fold CV scores to avoid overfitting. Effectively: **Platt scaling in different regions of the input space**, falling back to global Platt when that fits better.

## 4. Equations & assumptions
- Platt target smoothing: y₊=(N₊+1)/(N₊+2), y₋=1/(N₋+2) (1).
- Leaf logistic model: P(y=j|x) = e^{F_j(x)} / Σ_i e^{F_i(x)}, Σ_i F_i(x)=0 (2).
- RMSE = sqrt((1/nm) Σ_i Σ_j (p_ij − y_ij)²) (3) — square root of Brier score over classes.
- Log-odds transform: z_j = ln(p_j/(1−p_j)) (4).
- SVM input vector: [S_1(x),...,S_m(x)] concatenated one-vs-rest scores (5).
- Assumptions: calibration set independent of training; miscalibration varies regionally; held-out scores for calibration fitting.

## 5. Features / target
Inputs: original attributes (tree structure) + base-learner output scores/probabilities (leaf logistic models). Target: calibrated class probabilities.

## 6. Validation design
10 runs of stratified 10-fold CV; corrected resampled t-test, p=0.01; metric: RMSE of calibrated probabilities. Significance marks: ∙ significant improvement over PCT, ∘ degradation.

## 7. Numerical results / baselines
(quoted exactly)
- **Naive Bayes** (Table 2): PCT wins or ties Platt scaling on ALL 32 datasets; vs isotonic: PCT wins on many, loses on 3 (optdigits 0.123 vs 0.116, led24 0.194 vs 0.194∘, yeast 0.239 vs 0.236∘).
- **Boosted stumps** (Table 3): PCT ≥ Platt and ≥ isotonic on all datasets; significant wins e.g. hand-postures 0.074 vs 0.090/0.089, kr-vs-kp 0.085 vs 0.157/0.153.
- **Boosted trees** (Table 4): PCT outperforms/equal on all datasets; significant wins e.g. taiwan-credit 0.369 vs 0.380/0.378, nursery 0.005 vs 0.018/0.006.
- **SVM RBF** (Table 5): PCT better on average, several significant wins (news-popularity 0.468 vs 0.474/0.470; sick 0.102 vs 0.167/0.162; bankruptcy 0.180 vs 0.212/0.207), no significant losses.
- Artificial example (§4.3): global Platt/isotonic cannot improve a constant-prior classifier; the calibration tree recovers a full decision tree — **local calibration compensates for base-learner bias**.
- Reliability diagrams for 5 datasets confirm visual calibration quality.

## 8. Code / data availability
WEKA package manager: probabilityCalibrationTrees and plattScaling packages (implemented by authors). Datasets: UCI public.

## 9. Leakage & limitations
- Paper's own: internal CV scores used for calibration fitting (correct practice, but noisy on small sets); only compared against global Platt/isotonic, not the robust variants of §2.3.
- More complex than global methods: tree structure + LogitBoost iterations add hyperparameters; needs enough calibration data per region (min 15 instances/node) — sparse regimes may overfit.

## 10. GSE overlap
Second calibration instrument after 0723's temperature scaling — and the first *localized* calibrator in the corpus: Platt scaling and isotonic regression are inventoried globally, but nothing in the repo learns different calibration models for different input regions. The decision rule is the transfer: **first fit global temperature scaling; then test whether miscalibration varies by regime.** GSE's data is regime-heavy (division games vs conference games, primetime, weather-affected, playoff-caliber matchups) — exactly the "different regions of input space" the paper targets. Where 0723 treats miscalibration as low-dimensional and global, 0724 handles regional miscalibration: e.g., the engine might be well-calibrated on favorites but overconfident on underdogs, or calibrated in fair weather and miscalibrated in wind — a calibration tree on game-context attributes (line, total, weather band, rest differential) finds those regions automatically. Fits the calibration lane with 0723, and the abstention lane (0714–0720): calibrated probabilities feed every abstention gate.

## 11. GSE implementation spec
1. After global temperature scaling (0723), fit a probability calibration tree on game-context attributes: spread magnitude, total, weather band, rest differential, primetime flag, divisional flag — using out-of-sample model scores (internal CV on past seasons) as the calibration input.
2. Prune by RMSE as in eq (3); require ≥15 games per leaf; if the tree collapses to a single node, keep the global temperature model (paper's fallback behavior).
3. Refresh each season; log per-leaf calibration models for interpretability (which regimes need correction is itself an analytical product).
Effort: 2–3 days (WEKA packages exist as reference; port to GSE's stack).

## 12. Reproducible test
Dataset: GSE engine 2022–25 NFL pick logs with model scores and game-context attributes. Fit calibration tree on 2022–23 internal-CV scores; evaluate RMSE/ECE on 2024–25 vs global temperature scaling alone. Pass if the tree reduces RMSE on the test window with statistically significant wins in at least one regime (e.g., underdogs) and never significantly degrades overall.

## 13. Acceptance / rejection gate
ADOPT if regional calibration improves test-window RMSE/ECE over global temperature scaling alone, with no overall degradation. REJECT if the tree collapses to a single node every season (i.e., GSE miscalibration is genuinely global — then 0723 suffices).

## 14. Improvement experiment
Combine the two papers: **temperature scaling at the leaves** — fit the tree on context attributes, then fit a temperature parameter per leaf instead of full LogitBoost, marrying 0723's low-dimensionality finding with 0724's regional structure. Second: online/rolling calibration trees that re-fit on a 2-season sliding window to track regime drift.
