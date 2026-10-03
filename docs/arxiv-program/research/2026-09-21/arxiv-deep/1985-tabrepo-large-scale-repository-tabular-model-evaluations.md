# [1985] TabRepo: A Large Scale Repository of Tabular Model Evaluations and its AutoML Applications (arXiv:2311.02971)

**Citation:** David Salinas, Nick Erickson (2024, v-work; arXiv 2023). *TabRepo: A Large Scale Repository of Tabular Model Evaluations and its AutoML Applications*. arXiv:2311.02971. URL: https://arxiv.org/abs/2311.02971
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML, converted to text).
**Lane:** nas_automl.
**Verdict:** ADAPT — zero-shot portfolio learning from dense offline model evaluations gives GSE a principled way to warm-start each season's model search with complementary configurations instead of re-running full HPO from scratch.

## 1. Research question
Can a large, dense repository of precomputed tabular model evaluations replace expensive online AutoML? Two uses are demonstrated: (1) studying HPO vs AutoML systems at marginal cost via precomputed predictions (including ensembling effects), and (2) transfer learning — learning a portfolio of complementary configurations offline that beats state-of-the-art AutoML in accuracy, training time, and inference latency on new datasets.

## 2. Dataset / schema
TabRepo itself: 786,000 model predictions; 1,310 models from 10 families (CatBoost, XGBoost, LightGBM, FT-Transformer, MLP, RandomForest, ExtraTrees, KNN, LinearModel, TabPFN-ish variants per Table 10) densely evaluated (all models on all datasets) across 200 classification+regression datasets × 3 seeds. Public dataset of evaluations. Reference benchmark cost context: full AMLB evaluation of one method = ~40,000 CPU hours.

## 3. Method / model
1. **Dense evaluation protocol:** every one of 1,310 configurations evaluated on all 200 datasets (vs prior work with sparse matrices), enabling unbiased offline analysis.
2. **Offline HPO-vs-AutoML analysis:** compare default hyperparameters vs 4h random search vs ensemble of top-20 searched configs, per family, at zero marginal compute.
3. **Portfolio learning (zero-shot HPO):** greedily select N < M complementary configurations:
   j_1 = argmin_{j_1} E_{i}[ l_{i,j_1} ],  j_n = argmin_{j_n} E_i[ min_{k≤n} l_{i,j_k} ]
   i.e., each added config minimizes expected loss where the portfolio's loss on dataset i is the best member's loss (Caruana-style greedy, after Xu et al. 2010 Hydra). On a new dataset: evaluate only the portfolio, pick the best (optionally ensemble them).
4. Analysis tools: model-rank cluster maps, fANOVA hyperparameter importance per family, normalized error = (l_method − l_topline)/(l_baseline − l_topline) with topline=top score, baseline=median, clipped to [0,1].

## 4. Equations & assumptions
- Portfolio greedy selection (above); normalized error formula (above).
- Assumption: offline task distribution (200 datasets) is representative enough that the learned portfolio transfers to new tasks; greedy complementarity approximates the optimal subset.

## 5. Features / target
Meta-level: inputs are (dataset, configuration) pairs; target is the configuration's loss on the dataset. The 10 model families span GBDTs, transformers (FT-Transformer), MLPs, forests, KNN, linear. Base datasets are generic tabular (OpenML-style); no sports content.

## 6. Validation design
Comparisons over all 200 tasks: normalized error, rank, fit time, per-row inference time. Methods: Portfolio (ours), Portfolio (ensemble), AutoGluon, Autosklearn2, LightAutoML, FLAML — 4h training budget. Portfolio learned offline, evaluated zero-shot (only portfolio members run on the new task). Ensemble variant adds Caruana ensemble selection over portfolio members.

## 7. Numerical results / baselines
Table 1 (4h budget, averaged over all tasks): Portfolio (ensemble) — normalized error 0.365, rank 168.7, fit 6275.5s, infer 0.050s/row. AutoGluon — 0.389, rank 208.2, fit 5583.1s, infer 0.062s. Portfolio (no ensemble) — 0.434, rank 232.5, infer 0.012s. Autosklearn2 — 0.455, fit 14415.9s. LightAutoML — 0.466. FLAML — 0.5+.
Figure 2 findings: CatBoost dominates families with defaults; FT-Transformer and LightGBM are runners-up; 4h tuning + ensembling improves every family; ensembling lets LightGBM match CatBoost accuracy. No single model is best everywhere (rank cluster map shows dataset-dependent winners).

## 8. Code / data availability
TabRepo dataset of evaluations released (public). AutoGluon/Auto-sklearn/LightAutoML/FLAML are open-source baselines. Exact TabRepo download URL not extracted from converted text — verify before use.

## 9. Leakage & limitations
- Adversarial notes: (1) Portfolio transfer assumes new tasks resemble the 200-dataset offline distribution; NFL season-to-season data is a narrow, non-stationary slice — portfolio learned on generic OpenML tasks may not contain the right inductive biases, and the paper doesn't test transfer under distribution shift. (2) "Beats AutoGluon" is on normalized error averaged over 200 generic tasks — sports relevance unproven. (3) Dense evaluation is expensive upfront (786k predictions); GSE must build its own mini-TabRepo per market. (4) Zero-shot selection picks one config; the ensemble variant reintroduces inference cost (0.050s/row vs 0.012s).

## 10. GSE overlap
New capability — nothing in the corpus builds a persistent, growing repository of model evaluations across seasons or does portfolio/zero-shot HPO. Complements ledger 1982 (AutoGluon runs the search) and ledger 1984 (warm-starting): TabRepo's portfolio is the principled version of warm-starting. Connects to the "automated discovery" ML-brief topic (commissioned, not in repo).

## 11. GSE implementation spec
- **Build "GSE-TabRepo":** every model config ever evaluated on every season/market task gets logged (config, OOF predictions, log-loss, fit/inference time) into a permanent evaluations table. Markets: spread/total/moneyline × game/team-week granularities.
- **Offseason portfolio learning:** run the greedy complementarity algorithm over the accumulated table to learn a portfolio of ~15-30 configs; each new season, evaluate ONLY the portfolio on the most recent season (zero-shot), then ensemble-select the top members.
- **Guard against non-stationarity:** learn the portfolio on rolling 5-season windows, not all history; re-derive each offseason.
- **Effort:** ~1 week (logging schema + greedy portfolio script + evaluation harness). Compute: portfolio evaluation is cheap by construction.

## 12. Reproducible test
Dataset: GSE game-level tabular tasks 2015–2025, ATS cover target. Protocol: build TabRepo-log from 2015–2021 evaluations (random-search configs across LightGBM/XGBoost/CatBoost/MLP); learn portfolio; zero-shot evaluate portfolio on 2022 (select best); ensemble top members; test on 2023–2025. Metric: log-loss. Baselines: (a) full 4h random search per season, (b) single default CatBoost, (c) AutoGluon-Tabular (ledger 1982).

## 13. Acceptance / rejection gate
**ADOPT if:** the portfolio-ensemble matches the full-search log-loss within 0.002 on 2023–2025 while using ≤25% of the compute, AND the learned portfolio is stable (≥60% member overlap between consecutive offseason derivations). **REJECT if:** portfolio log-loss is worse than full search by >0.002, or a regime-shift season (e.g., major rule change) makes the portfolio pick a catastrophically bad member (worst-quartile) — evidence the offline distribution doesn't transfer.

## 14. Improvement experiment
Condition the portfolio on dataset meta-features (GSE version of the paper's idea): learn a *conditional* portfolio — a small decision rule mapping season meta-features (pace, scoring environment, market efficiency stats) to a subset of configs — instead of one static portfolio. This is portfolio learning meets the paper's own meta-learning thread (auto-sklearn 2.0). Test whether the conditional portfolio beats the static one by ≥0.001 log-loss on held-out seasons with regime variation.
