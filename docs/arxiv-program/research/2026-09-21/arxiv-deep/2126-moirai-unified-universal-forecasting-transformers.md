# [2126] Unified Training of Universal Time Series Forecasting Transformers (Moirai) (arXiv:2402.02592v2)

**Citation:** Gerald Woo, Chenghao Liu, Akshay Kumar, Caiming Xiong, Silvio Savarese, Doyen Sahoo (2024). *Unified Training of Universal Time Series Forecasting Transformers*. arXiv:2402.02592v2. URL: https://arxiv.org/abs/2402.02592
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML). Lane: `timeseries_foundation`.
**Verdict:** ADAPT — any-variate attention plus LOTSA-scale pretraining is the strongest architectural template for joint multi-stat sports forecasting (margins + totals + usage together), but LOTSA is generic-series; the GSE value is in the architecture + training recipe, not the released weights.

## 1. Research question
Can a single transformer trained on a massive multi-domain corpus (LOTSA) handle arbitrary-variate, arbitrary-length, arbitrary-frequency forecasting in one model — including multivariate and multi-distribution targets?

## 2. Dataset / schema
- **LOTSA (Large-scale Open Time Series Archive):** 27B+ observations across 9 domains (energy, transport, climate, cloud ops, web, sales, economics/finance, healthcare, nature), multiple frequencies (sub-hourly to yearly), assembled from public sources (Monash, LibCity, UCR/UEA, etc.). Public release.
- **Evaluation:** Monash benchmark + standard long-horizon (ETT, Electricity, Weather, Traffic) + probabilistic benchmarks; zero-shot and fine-tuned protocols. Public.

## 3. Method / model
- **Architecture:** masked encoder transformer with **multi-scale patching** (multiple patch sizes per series to handle mixed frequencies) and **any-variate attention**: flatten multivariate series into a single sequence with variate indices, using attention biases that allow arbitrary numbers of variates at inference.
- **Covariates:** supports future-known covariates (calendar, known events) via the patching scheme.
- **Output:** **mixture distribution** head (mixture of Student-t / Gaussian components) trained with NLL — native probabilistic, multi-modal capable.
- **Sizes:** Moirai-Small / Base / Large (exact param counts per the paper's size ladder).
- **Code/weights:** https://github.com/SalesforceAIResearch/uni2ts — model, LOTSA, training scripts.

## 4. Equations & assumptions
- Any-variate flattening: X ∈ ℝ^{T×V} → patches with variate-index bias b(i,j) in attention; attention over (time × variate) tokens.
- Multi-scale patches: series split at patch sizes {p_1,…,p_k}; embeddings concatenated.
- Output: p(y) = Σ_{m} π_m · Dist(y; θ_m) (mixture), trained with −log p(y_future).
- Metrics: CRPS (probabilistic), MSIS, sMAPE/MASE (point).
- Assumptions: flattened any-variate attention scales as O((T·V)²) — expensive for many variates; mixture components are parametric (Student-t), may miss discrete key-number effects; LOTSA domain coverage substitutes for sports domain knowledge only partially.

## 5. Features / target
Input: multivariate series of arbitrary variate count + future-known covariates, arbitrary frequency. Target: full predictive mixture distribution over the horizon. Native probabilistic.

## 6. Validation design
Zero-shot on Monash + long-horizon benchmarks; fine-tuning comparisons; probabilistic metrics (CRPS) primary. Baselines: PatchTST, TiDE, TFT, DeepAR, AutoARIMA, SeasonalNaive, N-BEATS.

## 7. Numerical results / baselines
Electricity benchmark CRPS table (representative, lower better):
- Moirai-Small 0.072, Moirai-Base 0.055, Moirai-Large 0.050
- PatchTST 0.052±0.00, TiDE 0.048±0.00, TFT 0.050±0.00, DeepAR 0.065±0.01, AutoARIMA 0.327, SeasonalNaive 0.070
Read: Moirai-Large matches the best supervised models (TiDE 0.048 vs Moirai-Large 0.050); Small lags; scaling helps monotonically. Zero-shot results competitive across Monash; fine-tuning closes remaining gaps.

## 8. Code / data availability
Full release: https://github.com/SalesforceAIResearch/uni2ts — pretrained Small/Base/Large weights, LOTSA dataset, training/eval code. Among the most reproducible TSFM papers in this lane.

## 9. Leakage & limitations
- LOTSA is generic series; sports sequences (17-game seasons, playoff discontinuities, roster turnover) are a tiny/no fraction — zero-shot sports transfer is speculative.
- Any-variate attention is O((T·V)²): joint team+player modeling explodes compute; needs sparse/grouped attention (cf. Chronos-2 group attention, 2134).
- Mixture-of-t output can't express discrete key-number mass (margins landing exactly 3/7) — sports may need a discrete-continuous hybrid head.
- Pretraining on 27B observations is out of reach for a GSE-internal rerun; adaptation must be fine-tuning or distillation, not from-scratch replication.

## 10. GSE overlap
No Moirai/TSFM in GSE corpus (same grep). This is the multivariate counterpart to Chronos/TimesFM (univariate): GSE's engine forecasts correlated quantities (margin, total, player props from the same game) and currently treats them with separate machinery; any-variate attention is the principled way to model them jointly. Closest existing work: Mimo's calibration lane (post-hoc, univariate).

## 11. GSE implementation spec
1. **Zero-shot probe (1 day):** run released Moirai-Base on NFL weekly multivariate series (margin + total + home/away EPA as 3 variates), score CRPS vs. GSE engine — pure eval.
2. **Fine-tune:** continue training Moirai-Base on the sports pile with multivariate game-day groups (margin, total, QB EPA, RB/WR usage as variates) + future-known covariates (rest, dome, spread); expanding-window seasonal fine-tuning.
3. **Head:** keep mixture head; add discrete key-number components in v2 if CRPS near 3/7 is poor.
4. **Serving:** joint predictive distributions per game → consistent spread/total/prop pricing (no more independent models disagreeing with each other).
Effort: 1 day probe → 3–4 weeks fine-tune + integration.

## 12. Reproducible test
Dataset: NFL 2002–2024, per-game multivariate (margin, total, team EPA). Test: 2021–2024 walk-forward; forecast margin + total jointly, horizon 1 game. Metric: mean CRPS (margin) and CRPS (total) vs. independent univariate baselines (fine-tuned Chronos, 2123) — the joint model must beat or match the independent models (joint modeling must not hurt). Baselines: Moirai zero-shot, seasonal naive. Leakage audit: future-known covariates only (rest/weather known pre-kickoff); no post-game info in covariate channels.

## 13. Acceptance / rejection gate
ADOPT for joint spread/total pricing if fine-tuned Moirai's margin CRPS ≤ best univariate variant AND total CRPS ≤ best univariate variant on 2021–2024 (joint ≥ independent, plus consistency wins); ADAPT further if joint beats on one target but not both; REJECT the zero-shot weights for live use if they trail seasonal naive on either target. Hard reject on any covariate-leakage flag.

## 14. Improvement experiment
Key-number discrete head: augment the mixture output with point masses at margins {3, 7, 10} (learned weights) and measure CRPS + calibration near key numbers vs. the pure mixture head. Hypothesis: NFL margins have genuine discrete mass that continuous mixtures smear; the hybrid head should cut CRPS specifically on games lined near 3/7 — the highest-leverage pricing region.
