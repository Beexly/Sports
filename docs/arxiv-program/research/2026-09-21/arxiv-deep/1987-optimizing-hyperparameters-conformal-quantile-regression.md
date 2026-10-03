# [1987] Optimizing Hyperparameters with Conformal Quantile Regression (arXiv:2305.03623)

**Citation:** David Salinas, Jacek Golebiowski, Aaron Klein, Matthias Seeger, Cedric Archambeau (2023). *Optimizing Hyperparameters with Conformal Quantile Regression*. arXiv:2305.03623. URL: https://arxiv.org/abs/2305.03623
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, converted to text).
**Lane:** nas_automl.
**Verdict:** ADOPT — replaces the Gaussian-process HPO surrogate with a conformalized quantile-regression surrogate that handles heteroskedastic noise and doubles as the bridge between GSE's HPO loop and its conformal calibration program.

## 1. Research question
GP surrogates dominate model-based HPO but assume homoskedastic Gaussian observation noise — violated in practice (HPO noise spans orders of magnitude and is heteroskedastic). Can a conformalized quantile regression (CQR) surrogate, which makes minimal noise assumptions, model the objective more realistically and converge faster? And can multi-fidelity be reduced to a simple aggregation trick instead of joint fidelity models?

## 2. Dataset / schema
13 tasks from FCNet, NAS-Bench-201, LCBench (5 most expensive of 35: airlines, albert, covertype, christine, Fashion-MNIST; k=1 nearest-neighbor surrogate for missing grid points), and NAS301 via YAHPO. All methods run asynchronously with 4 workers. No sports data.

## 3. Method / model
1. **CQR surrogate:** fit quantile regression for the HPO objective, then conformalize the quantile predictions to get calibrated uncertainty intervals. Surrogate fit by marginal likelihood maximization analog; next config maximizes expected improvement (with 20 fantasy samples for pending async evaluations).
2. **Simple multi-fidelity extension (§5):** instead of joint fidelity models, train ANY single-fidelity surrogate on the LAST fidelity observed per hyperparameter, and stop bad configs with asynchronous successive halving. The paper shows this trivial extension applied to REA, GP, BORE, QR all match/improve dedicated multi-fidelity methods.
3. Baselines for single-fidelity: random search, GP-BO, TPE (multivariate KDE, Falkner et al.), REA, BORE.

## 4. Equations & assumptions
- Normalized regret = (y_t − y_min)/(y_max − y_min), y_t = best value found by time t.
- Assumption: quantile regression captures heteroskedastic noise; conformal correction yields calibrated intervals given sufficient data; last-fidelity observations are an adequate fidelity aggregation.

## 5. Features / target
Inputs: hyperparameter vectors (per-benchmark spaces; LCBench details in Appendix B). Target: validation loss/accuracy of the trained model.

## 6. Validation design
Single- and multi-fidelity HPO on the 13 tasks; metrics: normalized regret over time, average rank across tasks, critical diagrams; async 4-worker. Calibration study (Table 1): RMSE, calibration error, runtime of GP vs QR vs CQR at n = 16/64/256/1024 samples.

## 7. Numerical results / baselines
- Table 1 (surrogate quality): at n=1024, RMSE — GP 0.58, QR 0.37, CQR 0.37; calibration error — GP 0.11, QR 0.04, CQR 0.03; runtime — GP 20.03s, QR 2.23s, CQR 2.16s. CQR matches QR on RMSE but improves calibration given sufficient data, at ~10× lower runtime than GP at n=1024.
- Multi-fidelity: CQR+MF "offers statistically significant improvements over ASHA at all times and over all other model-based multi-fidelity methods after spending 50% and 100% of the total budget." Ablation: QR+MF "much worse than CQR+MF" — the conformal correction, not QR alone, drives the gain. The naive last-fidelity extension of REA/GP/BORE/QR also beats ASHA on average rank/regret (except REA).

## 8. Code / data availability
Benchmarks via YAHPO (Pfisterer et al. 2022); method code link not extracted from converted text ("not stated in paper" as extracted — verify).

## 9. Leakage & limitations
- Adversarial notes: (1) Benchmark tasks are vision/tabular-ML HPO — the heteroskedastic-noise argument is plausible for GSE's seasonal HPO but untested there. (2) LCBench evaluations use a k=1 NN surrogate for missing grid points — introduces approximation error into the benchmark itself. (3) CQR's calibration edge needs "sufficient data" (n≥256 in Table 1); early-HPO regime (n<100) shows calibration error 0.13 vs GP 0.06 at n=16 — CQR is WORSE calibrated than GP in the small-data regime where HPO actually starts. (4) The "simple MF extension" discards inter-fidelity learning-curve information that methods like DyHPO exploit.

## 10. GSE overlap
Direct bridge to the corpus's conformal program: CQR (conformalized quantile regression) is already a GSE calibration primitive (ML brief topic; conformal WP 2208.08598 read). This paper applies the SAME machinery as the HPO surrogate — unifying two lanes: one calibrated-uncertainty stack serves both model selection and probability calibration. No one has read an HPO-surrogate paper in depth before; this is new.

## 11. GSE implementation spec
- **Replace the GP surrogate** in GSE's Optuna/BO HPO loop with a CQR surrogate: quantile GBM (LightGBM quantile objective) over the config space + conformal calibration on a held-out config set; EI acquisition over the conformalized predictive distribution.
- **Multi-fidelity for free:** aggregate each config's last-fidelity observation (fidelity = training seasons, per ledger 1984's lookback-window idea) + async successive halving — no joint fidelity model to maintain.
- **Dual use:** the same CQR model class already used for the engine's prediction intervals — shared code, shared calibration diagnostics (reliability diagrams).
- **Effort:** ~1 week (surrogate swap + async halving scheduler); reuses existing CQR code.

## 12. Reproducible test
Dataset: HPO over LightGBM for ATS cover (nflverse game-level, 2015–2025), 4 workers, budget 200 config-evaluations. Compare CQR-surrogate BO vs GP-BO vs TPE vs random search: normalized regret vs wall-clock, plus surrogate calibration error at n=64/256. Fidelity = training seasons (2→full); halving schedule shared.

## 13. Acceptance / rejection gate
**ADOPT if:** CQR-BO reaches the GP-BO final regret in ≤70% of the wall-clock time on the 2023–2025 test HPO runs, AND surrogate calibration error at n≥256 is ≤ GP's. **REJECT if:** no wall-clock win (the Table-1 runtime edge doesn't materialize at GSE's config dimensionality), or CQR's early-regime (n<100) miscalibration causes worse candidate selection than GP in the first 50 evaluations.

## 14. Improvement experiment
Feed the CQR surrogate *market-relative* features of configs: for each evaluated config, record not just its log-loss but its log-loss minus the market-implied baseline (de-vigged) — i.e., optimize edge-over-market directly with a heteroskedastic-aware surrogate. Hypothesis: configs are noisier exactly where market efficiency is highest; CQR's heteroskedasticity handling should allocate search away from efficient markets toward soft ones. Test: compare edge-over-market of the CQR-selected config vs the log-loss-selected config on 2024–2025.
