# [2183] Unsupervised Feature Construction for Anomaly Detection in Time Series — An Evaluation (arXiv:2501.07999v2)

**Citation:** Marine Hamon, Vincent Lemaire, Nour Eddine Yassine Nair-Benrekia, Samuel Berlemont, and Julien Cumin (2025, Orange Innovation). *Unsupervised Feature Construction for Anomaly Detection in Time Series — An Evaluation*. arXiv:2501.07999v2. URL: https://arxiv.org/abs/2501.07999
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

*Rationale:* proves (with statistical significance across 5 datasets) that a window→tsfresh→tabular-detector pipeline beats raw temporal representations for Isolation Forest; directly reusable as GSE's anomaly detector for line-move / injury-news shocks and as a concrete windowed auto-feature-construction recipe for odds-trajectory sequences.

## 1. Research question
For unsupervised time-series anomaly detection, is it better to (a) build the detector on the initial temporal representation (sliding windows as raw vectors) or (b) first convert windows into a tabular representation using an automatic feature-construction library (tsfresh), then apply a tabular anomaly detector? Tested with two detectors: Isolation Forest (tree-based, rank statistics) and Local Outlier Factor (density-based, distances). Strictly agnostic setting: no expert feedback loop, no hyperparameter tuning, no anomaly-type distinction.

## 2. Dataset / schema
Five public benchmark datasets (387 series total after filtering):
- **SVDB** (MIT-BIH Supraventricular Arrhythmia, ECG): 76 series, length 230–400, anomaly rate 0.008–0.34%. Two series discarded for contamination > 50%.
- **NAB** (Numenta Anomaly Benchmark, servers/tweets/traffic/advertising): 46 series (synthetic-only groups and one anomaly-free series removed), variable lengths 1127–22695, anomaly rate 8.30–10.29%.
- **AIOPS 2018** (web-service performance indicators, Sogou/Tencent/eBay): 13 series (29 → 13 after removing pairwise-correlated series, r < 0.3), lengths 16441–295414, anomaly rate 0.06–7.50%.
- **NormA** (aerospace/health/body-language/electricity): 5 series (14 synthetic discarded; one kept of 3 highly correlated real series), lengths 2000–35040, anomaly rate 3.08–9.13%.
- **UCR Anomaly Archive 2020** (medical/meteorology/biology/industry): 247 series (3 overly long series excluded for compute), lengths 6674–300262, anomaly rate 0.0005–4.9%.
TimeEval datasets portal used for access (ref [35]). Series treated independently (no cross-series knowledge — agnostic assumption).

## 3. Method / model
Seven-step pipeline applied per series:
1. Divide series into sliding windows of size W (tested W = 32, 64, 128, 256 — doubling from 32).
2. Place F windows in a tabular database (rows = windows, columns = raw time points).
3. Preprocess: horizontal normalization within windows — tested no-normalization vs Min-Max vs Median-IQR vs Mean-Std (preliminary study on SVDB/NormA/AIOPS selected the best per dataset; note IF needed no normalization, LOF did).
4. Feature extraction with **tsfresh** ("Efficient" version, q = 777 features); columns with missing values (uncomputable at small W, e.g. W=32) dropped.
5. Windows now described by q tsfresh features (tabular).
6. Apply detector: **Isolation Forest** or **LOF**, PyOD 1.1.3, default settings, no tuning.
7. Window-level anomaly prediction.
Labels for evaluation: window labeled anomalous if any anomaly point falls inside it; AUC computed per series from detector confidence scores (no threshold — threshold-free metric chosen deliberately for the agnostic setting).

## 4. Equations & assumptions
No equations stated for the core method (uses library defaults). Evaluation: AUC from window-level (predicted score, ground-truth window label) pairs; paired comparisons across series via Wilcoxon signed-rank test (ref [38]); mean ranks + critical diagrams. Assumptions: (i) window inherits anomaly label if any point inside is anomalous; (ii) each series independent — no cross-series knowledge; (iii) offline/exploratory analysis — models trained and evaluated on all data (no held-out deployment); (iv) unsupervised: anomalies can occur anywhere, no labels during training; (v) default detector hyperparameters are a fair comparison basis.

## 5. Features / target
Input features: tsfresh "Efficient" extraction (q = 777 features: autocorrelation, FFT coefficients, entropy, distributional statistics, etc.) computed per sliding window; raw temporal representation = the W raw values per window as baseline. Target: window-level binary anomaly label (anomaly anywhere in window → anomalous). Prediction horizon: point-wise/segment detection within each window.

## 6. Validation design
No train/test split — offline exploratory protocol (train and evaluate on all data, explicitly stated). 16 experimental cells (4 datasets × 4 window sizes; AIOPS+NormA merged). Per series: AUC for TS (raw) vs FE (tsfresh) × IF vs LOF. Statistical comparison: Wilcoxon test on per-series AUCs within each dataset×window cell; mean ranks; critical diagrams averaged over window sizes. p < 0.05 bolded as significant.

## 7. Numerical results / baselines
Key numbers (Table III, mean ranks over series per dataset; FE wins = lower rank):
- **Isolation Forest:** FE beat TS (raw) in all 16 cells; 14/16 statistically significant (p-values e.g. SVDB/W=32: p = 1.522×10^-12; UCR/W=128: p = 1.792×10^-32). Non-significant: SVDB/W=256 (p=0.1161), NAB/W=32 (p=0.05059).
- **LOF:** FE best mean rank in only 4/16 cells, 2 significant — no consistent benefit.
- Headline effect: on UCR, IF's AUC jumped **0.586 → 0.746 (+36%)** with tsfresh features.
- Preprocessing finding: IF needed no normalization and no hyperparameter tuning; LOF needed normalization and still lagged. Vertical (column) normalization of extracted features helped LOF-FE on NAB (surpassed LOF-TS) but hurt on SVDB — inconclusive overall.
- Critical diagrams: IF-FE ranked first on 3 of 4 datasets; on UCR, LOF-TS (raw) still best overall.

## 8. Code / data availability
Paper's reproduction code: anonymized for double-blind review at time of writing (ref [34]); datasets public via TimeEval portal (https://timeeval.github.io/evaluation-paper/notebooks/Datasets.html). tsfresh and PyOD are open source. Supplementary "Additional material" file referenced in the (anonymized) repo.

## 9. Leakage & limitations
Adversarial read: (i) explicitly offline — train-on-all-data protocol means results do not measure generalization to future data; for GSE's live use this is a deployment gap, not a flaw in the comparison; (ii) window-level labeling (any anomaly point → whole window anomalous) inflates effective anomaly mass and eases detection vs point-wise scoring; (iii) tsfresh "Efficient" still computed up to 777 features/window — the dimensional blowup that hurt LOF will also hurt any distance-based GSE model unless tree-based models are used; (iv) W ∈ {32,64,128,256} was fixed, not tuned — conclusions may shift at GSE's natural windows (8-game, 17-game); (v) no hyperparameter tuning for LOF (k unexplored) — the IF-vs-LOF gap is partly a tuning gap; (vi) external validity: ECG/server/electricity series, not sports; anomaly semantics differ; (vii) anomaly labels in NAB/NormA are known to be noisy (authors did manual inspection to mitigate).

## 10. GSE overlap
GSE has no unsupervised anomaly-detection lane in the existing-research map (calibration/uncertainty covered: CQR, grouping loss, temperature scaling; online learning and automated discovery are commissioned topics in the 2026-09-18 ML brief, results "not yet in repo"). Hand-built gse-lab metrics are the feature program today; auto feature construction per window is new capability. The paper's recipe is directly applicable to two GSE problems: (a) **anomalous line-move detection** — windows of odds-trajectory series (opening→closing spreads/totals per game) fed through the same 7-step pipeline to flag steam/sharp-action shocks before kickoff; (b) **team-performance regime breaks** — windows of rolling EPA series to flag injury/weather-driven structural breaks that should down-weight stale priors in the engine.

## 11. GSE implementation spec
1. Data: odds-trajectory series per game (spread/total sampled every 15 min from open to close, 2023–2026 seasons, from OddsAPI archive) + per-team rolling EPA/play windows (nflverse).
2. Pipeline: replicate the 7 steps — sliding windows (W = 32 samples for intraday odds moves; W = 8 games for EPA), tsfresh "Efficient" extraction, PyOD Isolation Forest with default settings (no tuning, per the paper's agnostic success).
3. Flag rule: window anomaly score in top 1% of the trailing-4-week distribution → "shock" event; for odds, cross-check against news/weather feed before routing to the engine as a prior-reset trigger.
4. Serving: batch job every 15 min on game days for odds series; weekly for EPA series. tsfresh cost is the constraint (~seconds per window) — cache feature columns, only recompute the newest window.
5. Effort: ~2 engineer-days (pipeline script + backtest against known injury/steam events).

## 12. Reproducible test
Dataset: closing-line and in-week spread trajectories for all 2024–2025 NFL games (5-min or 15-min sampling from the odds archive), plus injury-report timestamps as ground truth for "shock" events. Protocol: run the paper's pipeline (W = 32, 64; tsfresh Efficient; PyOD Isolation Forest defaults) on each game's spread trajectory; label windows anomalous if a starting-QB injury report or >2-point steam move occurs within the window. Metric: AUC of window anomaly scores vs labels, per-game then averaged; baseline = raw-window IF (the paper's TS condition). Success replicates the paper's finding if IF-FE significantly beats IF-TS (Wilcoxon p < 0.05) with ≥ +20% relative AUC on the steam-event subset.

## 13. Acceptance / rejection gate
**Adopt the window→tsfresh→IF shock detector iff** on the 2024–2025 odds-trajectory test it achieves AUC ≥ 0.70 on steam/shock windows AND beats raw-window IF with Wilcoxon p < 0.05, with per-window inference cost < 5 s (batch-feasible). Reject if IF-FE fails to significantly beat IF-TS (the LOF outcome in the paper — distance-based detectors on 777-dim features), or if precision@top-1%-flagged < 0.30 (too many false alarms to route to the engine). Per-window recompute cost above budget also rejects.

## 14. Improvement experiment
Beyond the paper: (a) replace the fixed W grid with the paper's own suggestion — jumping (non-overlapping) windows plus an automatic W selection via FFT-based periodicity detection (ref [26]) adapted to weekly sports cadence (7-day seasonality in odds movement, 1-game cadence in EPA); (b) swap tsfresh for **catch22** (22 features, ~0.1 ms each per ledger 2182) in the same pipeline and re-run the 16-cell comparison — if catch22-FE matches tsfresh-FE on AUC at 1/30th the feature count, GSE gets a real-time-capable shock detector instead of a batch one.

---
*Lane: auto_feature_eng | Block: 2182–2201 | Dedup: 2501.07999 not in wave5-dedup-baseids.txt (verified 2026-09-22)*
