# [1484] The Craft of Selective Prediction: Towards Reliable Case Outcome Classification (arXiv:2409.18645v1)

**Citation:** T.Y.S.S. Santosh, Irtiza Chowdhury, Shanshan Xu, Matthias Grabmair (2024). *The Craft of Selective Prediction: Towards Reliable Case Outcome Classification — An Empirical Study on European Court of Human Rights Cases*. arXiv:2409.18645v1 [cs.CL], 27 Sep 2024. URL: https://arxiv.org/abs/2409.18645
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org/pdf).
**Verdict:** ADAPT

## 1. Research question
How do four design choices — (i) pre-trained model/corpus, (ii) confidence estimator, (iii) fine-tuning loss — affect the reliability of case-outcome classifiers in a **selective prediction** setting, where the model may abstain on uncertain cases to reduce error at high coverage?

## 2. Dataset / schema
LexGLUE ECtHR (European Court of Human Rights): 11k case fact descriptions, multi-label over 14 convention articles, chronologically split — train 2001–2016 (9k), val 2016–2017 (1k), test 2017–2019 (1k). Three task variants of increasing difficulty: **Task B** (identify alleged articles), **Task A** (identify court-decided violations), **Task A|B** (violations given allegations). Metrics: macro-F1 (classification); AURCC, RPP, Refinement for selective prediction.

## 3. Method / model
- Selective classifier h=(f,g): f standard classifier, g(x)=1[g̃(x)>γ] selection function; **coverage** C(h) = fraction predicted; **risk** R(h) = error on predicted subset; risk–coverage curve summarized by **AURCC** (area under risk–coverage curve; lower = better), **RPP** (reversed pair proportion, Kendall-tau-style confidence/error ranking), and **Refinement** Rf (Gu & Hopkins 2023: RPP normalized by worst-case Kendall-tau, interpretable 0/0.5/1 = best/random/worst).
- Confidence estimators: **Softmax Response (SR)** = max_y p(y); **MC Dropout** (10 runs): SMP (sample-mean max prob), PV (probability variance), BALD (mutual information, total uncertainty).
- Training losses: task-specific; **Confident Error Regularizer (CER)** (Xin et al. 2021) penalizing confidence on harder examples; **ECE loss** (10-bin); **Gambler's loss** (Liu et al. 2019: extra abstention class, rejection reward r).
- Multi-label extension: per-label binary confidence, per-label thresholds, macro-averaged metrics.
- 5 backbones × 4 losses × 4 estimators = 80 configs × 3 tasks, 5 random seeds each.

## 4. Equations & assumptions
- LCER = Σ_{i,j} Δ_{i,j} 1[e_i > e_j], Δ_{i,j} = max{0, max_y p_i(y) − max_y p_j(y)}² — penalizes confidence exceeding that of an easier example; weight ∈ {0.01, 0.05, 0.1, 0.5} tuned on AURCC.
- LECE = Σ_m (|B_m|/N)·|acc(B_m) − conf(B_m)| over 10 bins; Gambler: L = Σ I(y) log[p(y) + p(abs)]/r, r ∈ {1.0, 5.0, 6.5, 14.0}, 4 warm-up epochs.
- Refinement Rf = Σ 1[g̃(x_i)<g̃(x_j), l_i<l_j] / c(|D|−c), c = #correct.
- Assumptions: confidence rankings generalize iid within label; ECtHR results transfer across jurisdictions (authors explicitly hedge this).

## 5. Features / target
Inputs: fact text (hierarchical transformer, 64 paragraphs × 128 tokens). Target: abstention-aware reliability — maximize accuracy on predicted subset while covering as much as possible.

## 6. Validation design
All 240 configurations evaluated on chronological test split; selective metrics computed per label then macro-averaged; label-frequency bucket analysis (5 articles <1% violation rate; 4 at 1–10%; 4 at 10–20%; 1 at 20–40%).

## 7. Numerical results / baselines
- MC Dropout beats SR on **every** task/metric consistently (e.g., Task B LexLM-large task-loss: SR AURCC 17.92 vs BALD 14.42; RPP 0.914 vs 0.745; mac-F1 64.31). Among MC variants, BALD leads slightly, then PV, then SMP (BALD captures total incl. aleatoric uncertainty).
- CER improves all selective metrics without harming accuracy (Task B LexLM-base: mac-F1 61.42 → 65.21 with CER; AURCC 16.86 → 16.85 SMP / 15.37 PV). ECE regularizer hurts both calibration and accuracy (non-differentiable). Gambler's loss: comparable accuracy, worse selective metrics.
- Domain-specific pre-training helps calibration (legal models < BERT-base on selective metrics), BUT more ECtHR corpus in pre-training → more overconfidence (InCaseLawBERT, no ECtHR, best selective metrics; LegalBERT worse than LexLM). LexLM-large best Task-B accuracy (64.31–65.82 mac-F1) yet overconfident on harder tasks A|B and A. Larger = more accurate, more overconfident.
- CER's gain concentrates in frequent-label buckets; overconfidence rises with label frequency; LexLM-large suffers on rare articles (<1%) but wins on frequent ones.

## 8. Code / data availability
Authors state they release code including pipelines to evaluate design choices on selective prediction; dataset is public (LexGLUE/HUDOC).

## 9. Leakage & limitations
Chronological split guards leakage; retrospective-classification caveat (facts finalized after outcome known). Limitations stated: ECtHR-only; spurious correlations in downstream data; no pre-training-from-scratch ablations (fine-tuning only); not all selective-prediction techniques covered. ECE's failure attributed to non-differentiability.

## 10. GSE overlap
Abstention/pick-selection lane (designated thin lane) and calibration lane. Existing-research-map check: corpus has calibration and temperature-scaling work (incl. this wave's 1480) but no selective-prediction / abstention framework — no duplication. The pick-posting decision ("should this pick go up publicly?") maps exactly to selective classification.

## 11. GSE implementation spec
Build `gse_selective_picks.py`:
1. Train the engine's pick head with a **CER-style regularizer**: within each batch, penalize any case where a pick's confidence exceeds a lower-error pick's confidence (exact Δ_{i,j} formula above; weight swept on AURCC).
2. Replace single-pass probability output with **MC-dropout confidence at inference** (10 stochastic passes; report BALD-style total uncertainty). Do NOT trust raw softmax of the calibrated head.
3. Operate as a selective classifier: choose threshold γ on validation to hit a target coverage (e.g., 70% of candidate picks posted) minimizing risk; report the **risk–coverage curve + AURCC** for every weekly pick set, not just accuracy/ROI.
4. Watch the paper's pre-training warning: if GSE pretrains on historical line data heavily, check for overconfidence on in-domain-but-hard games (analogous to the ECtHR-overfit effect); keep a diverse training mix.

## 12. Reproducible test
Backtest on two seasons of engine picks: apply SR vs MC-dropout confidence and task-loss vs CER training; compare AURCC, RPP, and realized ROI at fixed coverage (e.g., top-70%-confidence picks). Selective metrics computed per market type (spread/ML/total) then macro-averaged, mirroring the paper's per-label treatment.

## 13. Acceptance / rejection gate
ADAPT bar: MC-dropout + CER must beat the current single-pass baseline on AURCC **and** realized ROI at fixed coverage on a hold-out season; if only the metrics move but ROI doesn't, adopt the abstention machinery as a monitoring layer (risk–coverage reporting) rather than a selection change.

## 14. Improvement experiment
(a) Learn γ per market type (the paper's per-label thresholds); (b) test a differentiable ECE surrogate (Karandikar et al. 2021; Bohdal et al. 2021) since raw ECE failed; (c) track label-frequency analog: does CER help GSE most on frequent market types (spreads) and least on rare ones (longshot MLs)? — replicate the paper's bucket analysis on pick frequency.
