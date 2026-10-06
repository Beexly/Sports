# [1831] Symbolic regression outperforms other models for small data sets (arXiv:2103.15147)

**Citation:** Casper Wilstrup, Jaan Kasak (2021). *Symbolic regression outperforms other models for small data sets*. arXiv:2103.15147v3. URL: https://arxiv.org/abs/2103.15147
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

The core empirical claim (SR generalizes best at n=250 across 48 real datasets) is the strongest justification for GSE's metric-invention program, since sports data is perpetually small (32 teams, 17 games); needs adaptation because the result is QLattice-specific and the authors are the vendor, so GSE must replicate with PySR before citing it as doctrine.

## 1. Research question
On small tabular datasets (n=250 training observations — typical of health science and, by extension, sports), does symbolic regression generalize better out-of-sample than interpretable models (linear/Lasso, decision trees) and strong black-box ensembles (random forests, gradient boosting), when all are restricted to typical hyperparameters?

## 2. Dataset / schema
Penn Machine Learning Benchmarks (PMLB): all 122 regression datasets filtered to ≥1000 observations → 48 datasets kept (features and n vary; Fig. 1 log-log scatter). Protocol: 5 random draws of 250 training rows per dataset, remainder (≥750 rows) as out-of-sample validation → 48×5 = 240 experiments. Metric: out-of-sample R².

## 3. Method / model
Models (Table 1): QLattice/Feyn v1.5.3 symbolic regression (Abzu's QFT-inspired SR: samples the infinite list of expressions as a superposition of spatial paths; path interactions = binary ops, self-interactions = unary ops; probability fields updated toward best-fitting equations; returns ranked list of Y=f(X); configs: criterion="aic"/"bic", max_edges=11) vs scikit-learn 0.24.1 LinearRegression, Lasso (α grid incl. 0.1), DecisionTree (depth grid), RandomForest, GradientBoosting (estimator grids) — 4 hyperparameter settings each (2 for QLattice: AIC/BIC sorting). Two scoring schemes: (a) first-places count (R² winner takes all), (b) weighted scoring rewarding runners-up.

## 4. Equations & assumptions
Metric: out-of-sample R². QLattice returns argmax over expression posterior approximated by path probabilities.
Assumptions: (1) 250-row subsamples are representative; (2) PMLB datasets represent "small-data research problems"; (3) typical hyperparameters = fair comparison (no per-dataset tuning); (4) R² ranking captures generalization; (5) 5 resamples control draw bias.

## 5. Features / target
48 heterogeneous PMLB regression problems (varied features/targets). GSE analog: team-season (n≈32/season) and QB-season stat tables.

## 6. Validation design
240 experiments (48 datasets × 5 draws); each model trained on 250 rows, evaluated on ≥750 held-out rows; first-place counts + weighted scores; sub-analysis restricted to best config per model family and to interpretable-only comparison.

## 7. Numerical results / baselines
- All configs: **QLattice-BIC best in 77/240** experiments (most first places of any config); QLattice-AIC second; best non-SR = Lasso α=0.1; worst = decision tree.
- Weighted scoring: QLattice-BIC 644 points, ranking unchanged (RF/GB still below Lasso).
- Best-config-per-family: QLattice-BIC **132/240 first places** (over half); RF-400 37; Lasso 32. Weighted: GB 821, RF 787, Lasso 511 — ensembles beat Lasso here but still lose to QLattice on first places.
- Interpretable-only (QLattice-BIC vs Lasso α=0.1 vs depth-2 tree): **QLattice best in 184/240**, Lasso 49.
- Paper's interpretation: concise expressions fight overfitting via Occam's razor; ensembles' complexity hurts at n=250.

## 8. Code / data availability
QLattice/Feyn v1.5.3 (Abzu, commercial at the time); scikit-learn 0.24.1; PMLB public. Paper is vendor-authored (authors employed by Abzu).

## 9. Leakage & limitations
- **Vendor paper**: authors employed by Abzu, maker of QLattice — strong conflict of interest; no independent replication in the paper.
- "Typical hyperparameters" is doing work: ensembles with tuned hyperparameters might close the gap; the comparison handicaps methods that benefit most from tuning.
- max_edges=11 and AIC/BIC criteria are QLattice defaults but still choices; no ablation.
- PMLB datasets are heterogeneous but not sports-like (no time series, no adversarial/regime structure).
- R² on 250-row trains with 750-row tests is a fair generalization test, but 5 draws per dataset with overlapping test sets → correlated experiments; no significance testing reported.
- QLattice's QFT framing is marketing gloss; empirically it's another stochastic expression search.

## 10. GSE overlap
Directly relevant: GSE's perennial constraint is small n (32 teams, 17 games, ~300 team-seasons of history). If SR genuinely generalizes best at n=250, it validates the whole metric-invention lane against the "just fit XGBoost" objection. But the 2026-09-18 brief's skepticism ("earlier internal SR effort produced no surviving finding") means this claim must be REPLICATED with PySR on nflverse, not taken on vendor authority.

## 11. GSE implementation spec
- Replicate the protocol on sports data: build ~20 team-season/QB-season regression problems from nflverse (targets: wins, points/drive, EPA/play); 5 random 250-row... (adapt: use leave-seasons-out splits instead, since n is small); compare PySR vs Lasso vs RF vs GB on out-of-sample R².
- If replication holds, it becomes the cited justification for SR-first metric invention in GSE docs.
- Effort: ~2 engineer-days.

## 12. Reproducible test
Dataset: nflverse team-season 2000–2023 (n≈768); 5 random 250-row trains, rest test (mirror the paper); models: PySR (BIC-equivalent selection), Lasso, RF, GB. Metric: out-of-sample R² first-place counts + weighted scores, exactly per the paper.

## 13. Acceptance / rejection gate
ADOPT the "SR-first for small-n" doctrine if PySR wins the plurality of first places (≥40% of experiments) AND beats Lasso's weighted score on this sports replication; REJECT (keep ensembles as default) if PySR finishes outside the top 2 — the vendor claim does not transfer.

## 14. Improvement experiment
"Sample-size curve": repeat the replication at train sizes n ∈ {32, 100, 250, 500, 1000} and plot each method's win-rate vs n. Hypothesis: SR's advantage peaks at small n and decays as ensembles get enough data — locating the crossover n* tells GSE exactly when to use SR (team-season metrics) vs ensembles (play-level predictions), turning a blanket claim into an operating rule.

---
Lane: symreg_equation_discovery · Block 1822–1841
