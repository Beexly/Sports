# [1982] AutoGluon-Tabular: Robust and Accurate AutoML for Structured Data (arXiv:2003.06505)

**Citation:** Nick Erickson, Jonas Mueller, Alexander Shirkov, Hang Zhang, Pedro Larroy, Mu Li, Alexander Smola (2020). *AutoGluon-Tabular: Robust and Accurate AutoML for Structured Data*. arXiv:2003.06505. URL: https://arxiv.org/abs/2003.06505
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, converted to text).
**Lane:** nas_automl.
**Verdict:** ADOPT — a battle-tested, open-source tabular AutoML system whose multi-layer stacking + repeated bagging recipe directly applies to GSE's game/team tabular modeling with minimal adaptation.

## 1. Research question
How should an AutoML framework for tabular data be designed so that a fixed compute-time budget is used as effectively as possible? The paper argues the field's dominant focus — the CASH problem (combined algorithm selection and hyperparameter search) — allocates time poorly, and tests whether ensembling (multi-layer stacking, repeated k-fold bagging) plus robust preprocessing beats CASH-centric frameworks on real datasets.

## 2. Dataset / schema
Two benchmark suites (50 datasets total):
- OpenML AutoML Benchmark: 39 datasets (binary/multiclass classification + regression), each run on m5.2xlarge EC2 (32 GiB RAM, 8 vCPU); 4h training budget per dataset/fold.
- 11 Kaggle competitions (secret test labels scored by Kaggle), each framework run under a 4h time limit on raw data.
Both suites are public (OpenML; Kaggle competitions listed in Appendix B). No single schema — heterogeneous structured data; this is the point (framework must handle raw CSV with zero feature engineering).

## 3. Method / model
AutoGluon-Tabular pipeline (fit() call):
1. **Robust preprocessing:** infer column types (numeric/categorical/text/datetime); impute + rescale numerics to zero mean/unit variance; special handling of text fields; rare categories bucketed; unknown categories at inference handled.
2. **Fixed strong model zoo (no CASH search):** LightGBM, CatBoost, XGBoost (added), Random Forest, ExtraTrees, kNN (scikit-learn), custom PyTorch/tabular neural network with entity embeddings and skip connections. Models ordered cheap→expensive so tight time budgets still finish.
3. **Repeated k-fold bagging:** base models trained on k-fold out-of-fold (OOF) splits, repeated with multiple seeds; OOF predictions become stacker-layer features, curbing overfit.
4. **Multi-layer stacking:** layer-1 = base models; their concatenated outputs feed layer-2 stackers (which reuse the SAME model types as stackers — not simpler models as in classical stacking), optionally layer-3; skip connections concatenate raw features at each layer.
5. **Ensemble selection** (Caruana) at the top, or weighted average of stackers.
6. Key options: `hyperparameter_tune=True` (optional per-model HPO, off by default), `auto_stack=True`, `time_limits`, `eval_metric`. Training is resumable (`continue_training`).
Design principles: simplicity (1 line of Python on raw CSV), robustness (survives individual model failures), fault tolerance, and time-budget efficiency.

## 4. Equations & assumptions
No equations stated. Assumptions (stated): (a) diversity of strong base models + stacking is a better use of a fixed budget than exhaustive model/HPO search; (b) OOF bagged predictions prevent stacker overfitting; (c) reusing base model types as stackers does not reintroduce a CASH problem. Loss rescaling for cross-dataset aggregation: per dataset, rescale losses to [0,1] with champion=0, worst=1, linear interpolation between.

## 5. Features / target
Not applicable in the usual sense — input is any raw tabular dataset; framework auto-detects feature types. Targets in the benchmark: binary/multiclass labels and regression targets across the 50 datasets. Preprocessing is fully automatic (type inference, imputation, scaling, text handling).

## 6. Validation design
- OpenML AutoML Benchmark: 39 datasets, head-to-head vs TPOT, H2O AutoML, Auto-WEKA, auto-sklearn, GCP-Tables; metrics = average rank, rescaled loss (defined above), champion count, wins/losses/failures, wall time. Averages only over dataset/folds where all methods ran.
- Kaggle suite: 11 competitions, metric = percentile rank (proportion of leaderboard teams beaten), 4h limit, all frameworks default settings, AutoGluon on raw data.
- Ablation: sequential removal of repeated bagging (NoRepeat), multi-layer stacking (NoMultiStack), all bagging (NoBag), neural network (NoNetwork).
- Not time-ordered — cross-sectional tabular benchmark (relevant limitation for GSE's temporal data).

## 7. Numerical results / baselines
- **OpenML Benchmark (4h):** AutoGluon champion (best of 6 frameworks) on 23 of 39 datasets; avg rank 1.8438; avg rescaled loss 0.1385; avg time 201 min; only 1 failure. Next best: H2O AutoML — champion 2, avg rank 3.1250, rescaled loss 0.2447, 8 failures. Auto-WEKA avg rescaled loss 0.8001 (6 failures), TPOT 0.47-ish, auto-sklearn 0.48-ish (exact: TPOT 0.4711 Kaggle-table value is the Kaggle suite; on OpenML the ordering is AutoGluon << H2O < others).
- **Kaggle suite (4h, 7 competitions where all ran):** AutoGluon avg rank 1.7143, avg percentile 0.7041 (beats ~70% of human teams), 0 failures, 7 champions. GCP-Tables avg percentile 0.6281; H2O 0.5129; TPOT 0.4711; auto-sklearn 0.4819; Auto-WEKA 0.2056.
- **Ablation (Table 5, AutoML Benchmark, 4h):** AutoGluon avg rescaled loss 0.1660 (avg rank 1.9324) → NoRepeat 0.2199 → NoMultiStack 0.5237 → NoBag 0.7199 → NoNetwork 0.8171. Multi-layer stacking is the single biggest contributor. Claim: "Even after 4h of training, the NoMultiStack variant could usually not outperform the full version of AutoGluon trained for only 1h."
- Abstract claim: in two popular Kaggle competitions AutoGluon "beat 99% of the participating data scientists after merely 4h of training on the raw data."

## 8. Code / data availability
Code: github.com/awslabs/autogluon (open source). Benchmark reproduction code: github.com/Innixma/autogluon-benchmarking. Datasets: OpenML AutoML Benchmark + listed Kaggle competitions (public).

## 9. Leakage & limitations
- Adversarial notes: (1) Cross-sectional benchmark — no temporal validation; GSE's data is sequential (seasons/weeks) and the framework has no native time-aware splitting (must wrap it: purged/embargoed folds done outside). (2) The "beats 99% of data scientists" headline is 2 cherry-picked Kaggle competitions; the honest number is avg percentile 0.7041 across 7 competitions. (3) Fixed model zoo = CASH-free is a feature, but it also means no search over genuinely novel architectures — the "self-improving" aspect is limited to stacking/bagging configuration. (4) 201 min avg training time for small datasets is heavy for weekly in-season retrains — needs the time-limit discipline the paper itself provides. (5) Rescaled-loss metric is benchmark-relative, not absolute — small absolute gaps may be inflated. (6) Authored by Amazon team evaluating their own framework; but the benchmark harness and competitor defaults are disclosed and reproducible.

## 10. GSE overlap
GSE's engine work (per existing-research map) covers metrics (EPA family, calibration, state-space) and an ML research brief lists "automated discovery" as a commissioned-but-not-yet-in-repo topic — nothing in the corpus implements an automated model-selection/ensembling pipeline over tabular game features. AutoGluon's multi-layer stacking recipe complements (does not duplicate) the existing calibration work: stackers output probabilities that feed GSE's isotonic/temperature scaling. Tabular foundation-model reads (TabPFN 2402.06971) exist in the corpus but no AutoML system paper has been read in depth.

## 11. GSE implementation spec
- **Use case:** offseason (and monthly in-season) search over the win-probability / spread / total tabular models. Feature matrix = game-level rows (team efficiency, luck, market, rest features — already in gse-lab CSVs) or team-week rows; target = cover/margin/total binaries or regression on margin.
- **Build:** wrap `autogluon.tabular.TabularPredictor` with (a) custom time-aware bagging — replace random k-fold with rolling-origin folds (train ≤ season t, validate season t+1) to respect chronology; (b) add GSE's hand-tuned LightGBM/XGBoost configs as extra base models in the zoo; (c) stacker layers output calibrated probabilities (add isotonic layer on top, reusing existing calibration code).
- **Search cadence:** full 4h-style search once per offseason on all historical seasons; lightweight 30-min refit weekly in-season with `fit(..., time_limit=1800)`.
- **Serving:** export the winning stack as a serialized predictor artifact per market; inference is a single forward pass per game row (cheap).
- **Effort:** ~2-3 days to build the time-aware wrapper + backtest harness; compute is CPU-only.

## 12. Reproducible test
Dataset: nflverse game-level tabular features 2006–2025 (team efficiency + market features from gse-lab). Target: ATS cover (binary). Protocol: rolling-origin — train on seasons ≤2021, validate 2022, test 2023–2025 (three held-out seasons). Metric: log-loss and CLV. Baselines: (a) GSE's current hand-tuned model, (b) AutoGluon default `TabularPredictor` without time-aware wrapper (to measure the wrapper's value).

## 13. Acceptance / rejection gate
**ADOPT if:** the AutoGluon-based stack beats the hand-tuned baseline by ≥0.003 log-loss on the 2023–2025 held-out seasons AND the search costs ≤100 GPU/CPU-hours total (m5.2xlarge-equivalent). **REJECT if:** improvement <0.003 log-loss, or any season shows the wrapper leaking future information (positive control: shuffling season labels must destroy the edge), or inference latency >1s/game.

## 14. Improvement experiment
Replace the fixed stacker zoo with a *learned* stacking policy: run a small DARTS-style differentiable search over the stacker layer (which base-model outputs get which stacker types, how many layers) on the OOF predictions matrix only — cheap (no refitting base models), and it turns the paper's fixed multi-layer recipe into a genuine architecture search. Success criterion: the searched stacker beats fixed multi-layer stacking by ≥0.002 log-loss on the held-out seasons.
