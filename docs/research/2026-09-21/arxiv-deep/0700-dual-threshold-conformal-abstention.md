# [0700] Beyond Confidence: Adaptive Abstention in Dual-Threshold Conformal Prediction for Autonomous System Perception (arXiv:2502.07255v2)

**Citation:** Divake Kumar, Nastaran Darabi, Sina Tayebati, Amit Ranjan Trivedi (2025). *Beyond Confidence: Adaptive Abstention in Dual-Threshold Conformal Prediction for Autonomous System Perception*. arXiv:2502.07255v2. URL: https://arxiv.org/abs/2502.07255v2
**Ledger completed:** 2026-09-21. **Read:** full text from local full-text cache (`/tmp/arxiv750-cache/fulltext/2502.07255.txt`, ar5iv-converted HTML text; complete paper §§I–V including the dual-threshold mechanism, all metrics, and result tables, read in full).
**Verdict:** ADAPT — dual-threshold conformal abstention (coverage-guaranteed prediction sets + ROC-tuned abstention threshold) is a new abstention angle for GSE's corpus: it replaces ad-hoc confidence cutoffs with a distribution-free coverage guarantee plus a Youden-J-optimal abstain threshold. Note: the authors disclose ChatGPT-4o was used to polish the text.

## 1. Research question
Can a dual-threshold conformal framework — one threshold for valid prediction sets (coverage ≥ 1−α), one ROC-optimized threshold for abstention — deliver reliable uncertainty quantification and adaptive abstention across camera and LiDAR modalities under environmental perturbations?

## 2. Dataset / schema
CIFAR-100, ImageNet1K (camera), ModelNet40 (LiDAR point clouds); four perturbations (rain, fog, snow, motion blur) at severities S1–S5; evaluation at fixed coverage α=0.9. No sports data.

## 3. Method / model
Calibration phase: nonconformity scores s_i = −log p_i(y_i); conformal threshold q̂_conf = Quantile({s_i}, (n+1)(1−α)/n) → prediction sets Ĉ(X) = {y : −log p(y) ≤ q̂_conf} with P(y_true ∈ Ĉ(X)) ≥ 1−α. Abstention threshold q̂_abs = argmax_τ {TPR(τ) − FPR(τ)} (Youden's J on calibration set). Prediction phase: abstain iff −log p(y) > q̂_abs. Metrics: normalized entropy, set size, confidence, margin, coverage; ROC/AUC for should-abstain detection.

## 4. Equations & assumptions
- s_i = −log p_i(y_i) (Eq. 2); q̂_conf = Quantile({s_i}, (n+1)(1−α)/n) (Eq. 3).
- Coverage: P(y_true ∈ Ĉ(X)) ≥ 1−α (Eq. 4).
- q̂_abs = argmax_τ {TPR(τ) − FPR(τ)} (Eq. 5); abstain iff −log p(y) > q̂_abs (Eq. 7).
- TPR/FPR defined on (abstained ∧ should_abstain) events (Eqs. 14–15); AUC = ∫TPR dFPR (Eq. 13).
- H_norm(p) = −(1/log K)Σ p log p (Eq. 8); S(X) = |{y : −log p(y) ≤ q̂_conf}| (Eq. 9); M(X) = p(y_(1)) − p(y_(2)) (Eq. 11).
- Assumptions: exchangeable calibration data (standard conformal); a labeled calibration set on which "should_abstain" can be defined.

## 5. Features / target
Perception inputs (images, point clouds) → object classes. For GSE: game features → outcome classes; conformal sets over {cover, no-cover} with 90% coverage; abstain (withhold pick) when nonconformity exceeds the ROC-tuned threshold.

## 6. Validation design
Cross-modality (camera vs LiDAR) × 4 perturbations × 5 severities; baselines STARNet and likelihood-based OOD scores (Table I); AUC for abstain-detection, coverage, set size, entropy tracked across severity.

## 7. Numerical results / baselines
- ImageNet1K rain: AUC 0.993 → 0.995 (moderate→heavy); fog AUC 0.9704 → 0.9865; beats STARNet (e.g., rain moderate 0.922, heavy 0.975) and likelihood methods.
- Coverage: ImageNet1K fog 90.0% → 91.1% (stable); ModelNet40 LiDAR >84.5% under heavy perturbations; CIFAR-100 motion blur degrades 92.3% → 77.2%.
- Abstention scales adaptively: 13.5% → 63.4% ± 0.5 with severity (CIFAR-100 motion blur 27%→58%; ImageNet1K rain peaks 63.4%).
- Heavy-perturbation detection: AUC 0.995 ± 0.001.

## 8. Code / data availability
Code: https://github.com/divake/Conformal_Prediction_based_Sensor_Trustworthiness_Detection. Datasets public.

## 9. Leakage & limitations
- Perturbations are synthetic corruptions; "should_abstain" labels in TPR/FPR are defined by the authors' own severity protocol — mildly circular for the AUC metric.
- Autonomous perception domain; the abstention semantics (safety fallback) don't map 1:1 to pick publishing.
- Conformal coverage is marginal, not conditional — the known limitation (cited as [18]); GSE needs per-game-type reliability.
- No comparison against simpler single-threshold conformal selective prediction baselines.
- LLM-polished text (disclosed) — read the numbers, not the adjectives.

## 10. GSE overlap
Existing-research map: Garrett's corpus has conformal prediction work (Drive deep reads; the cqr.ts coverage bug was caught by the conformal audit) but no dual-threshold conformal abstention — new capability. Pairs with ledger 0699's selective calibration as the two calibration-lane abstention methods.

## 11. GSE implementation spec
1. On GSE's outcome classifier, compute nonconformity s = −log p(ŷ) on a calibration season; set q̂_conf for 90% coverage prediction sets over {cover, no-cover}.
2. Set the publish/abstain threshold q̂_abs = argmax_τ {TPR(τ) − FPR(τ)} on the calibration season, where "should_abstain" = games the model got wrong ex post (or high-loss games).
3. Publish rule: publish iff −log p(ŷ) ≤ q̂_abs; report the conformal set {cover}, {no-cover}, or {both} as the pick's uncertainty statement.
4. Refit both thresholds each season (rolling calibration window).
Effort: ~2 days (post-hoc; no retraining).

## 12. Reproducible test
Dataset: nflverse 2015–2025, ATS cover. Train classifier ≤2023; calibrate thresholds on 2024 (sweep α ∈ {0.8, 0.9, 0.95}); test 2025. Metrics: coverage of conformal sets, abstention rate, ROI on published games vs (a) fixed-confidence cutoff, (b) no abstention. Baseline to beat: (a).

## 13. Acceptance / rejection gate
ADAPT if the ROC-tuned abstention threshold beats a fixed 70%-confidence cutoff on test-window published ROI by ≥1pp at comparable coverage, with empirical coverage within ±3pp of the 1−α target; reject if coverage collapses (non-exchangeable seasons) or the ROC threshold adds nothing over the fixed cutoff.

## 14. Improvement experiment
Condition the thresholds on game regime (the paper's marginal-coverage limitation): fit separate (q̂_conf, q̂_abs) per regime (divisional/non-divisional, weather-affected, short-week) and test whether regime-conditional conformal abstention improves published ROI vs the single global threshold — a direct attack on the marginal-vs-conditional coverage gap the paper cites.
