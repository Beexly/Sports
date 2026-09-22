# [1582] ENS-10: A Dataset For Post-Processing Ensemble Weather Forecasts (arXiv:2206.14786)

**Citation:** Ashkboos, S., Huang, L., Dryden, N., Dueben, P., Gianinazzi, L., Kummer, L. & Hoefler, T. (2022). *ENS-10: A Dataset For Post-Processing Ensemble Weather Forecasts*. arXiv:2206.14786. URL: https://arxiv.org/abs/2206.14786
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, Sections 1–5 + appendices on EFI/minimum-CRPS, ~1,450 lines).
**Verdict**: ADAPT
ADAPT — one sentence: ENS-10 is the standard public benchmark for ML ensemble post-processing with a validated differentiable-CRPS Gaussian recipe and a novel extreme-event metric (EECRPS) that GSE can adopt directly to train and score kickoff-weather ensemble correction, though the 3 TB / 20-year global dataset is heavier infrastructure than a stadium-scale use needs.

## 1. Research question
Can the community get a unified, cheap, standard ensemble dataset for training and benchmarking ML post-processing ("prediction correction") models, plus baselines and a metric that isolates skill on extreme weather events?

## 2. Dataset / schema
- ENS-10: ECMWF IFS reforecasts (Cy43r1 before June 5, Cy45r1 after; 91 vertical levels; cubic octahedral ~36 km native) mapped to structured 0.5° lat/lon; 10 ensemble members; lead times 0, 24, 48 h; two dates per week; 1998–2017 (20 years); ~3 TB; CC BY 4.0.
- Variables: 11 surface fields (SST, TCW, TCWV, CP, MSL, TCC, U10m, V10m, T2m, TP, SKT) + 7 variables (U, V, Z, T, Q, W, D) at 11 pressure levels (10–1000 hPa); ground truth = ERA5.
- Splits: train 1998–2015, test 2016–2017. Task: correct the 48 h forecast distribution.
- Python interfaces to download, train, compare models are provided.

## 3. Method / model
- Baselines: raw ensemble, EMOS (min–max normalized), MLP (per-grid-point), LeNet-style CNN (full grid), U-Net (per Grönquist et al.), per-pixel transformer (self-attention over ensemble members).
- All NN baselines learn Gaussian parameters (μ, σ) of the corrected distribution and minimize a differentiable closed-form CRPS for Gaussians (Baringhaus–Franz identity): CRPS(F,x) = σ[2ψ((x−μ)/σ) + ((x−μ)/σ)(2φ((x−μ)/σ) − 1) − 1/√π].
- Extreme Event Weighted CRPS (EECRPS, novel): EECRPS(F,y) := |EFI(i,j)| × CRPS(F,y), where EFI (Extreme Forecast Index) ∈ [−1,1] measures ensemble deviation from climatology (|EFI| 0.5–0.8 unusual, >0.8 very unusual); EFI precomputed from the dataset.
- Training: Adam, lr 1e-5 (transformer 1e-3), no scheduler, 10 epochs, batch-by-time-index slices, single A100; per-lat/lon time-ensemble standardization for MLP/U-Net.

## 4. Equations & assumptions
- CRPS(F,x) = ∫(F(y) − 𝟙_{x≤y})² dy; Gaussian closed form above.
- EECRPS = |EFI| × CRPS; EFI from ensemble-vs-climatology deviation.
- Assumptions: corrected distribution is Gaussian; ground truth ERA5 is treated as exact; test is two specific years; models trained to minimize CRPS only (except EMOS which uses minimum-CRPS estimation per appendix); ensemble members exchangeable.

## 5. Features / target
Features: full ENS-10 fields for 5 or 10 members. Target: corrected distribution (μ, σ) of Z500, T850, T2m at 48 h lead, scored against ERA5.

## 6. Validation design
Fixed split 1998–2015 train / 2016–2017 test, global mean CRPS + EECRPS over all grid points, 10-ENS vs 5-ENS ablation, ± standard deviations over repeats.

## 7. Numerical results / baselines
- CRPS, 10-ENS (Table 2): T2m — raw 0.733, EMOS 0.749 (worse), MLP 0.672, LeNet 0.659, U-Net 0.644, Transformer **0.626** (best, ~15% under raw); T850 — Transformer 0.665 best; Z500 — LeNet 74.41 best (raw 78.24).
- EECRPS, 10-ENS: T2m — raw 0.25 → Transformer 0.214 best; Z500 — LeNet 27.30 (raw 28.78).
- Trends match across CRPS and EECRPS (extreme-event skill tracks average skill; no special extreme-event breakthrough).
- 5-ENS vs 10-ENS: all models degrade with 5 members (e.g., T2m Transformer CRPS 0.649 vs 0.626), confirming member count matters.
- Training cost: 0.75 h EMOS, 0.25 h MLP, 1.25 h LeNet, 1 h U-Net, 1 h transformer on one A100.
- Appendix: minimum-CRPS estimation details for EMOS; EFI computation from dataset climatology.

## 8. Code / data availability
Dataset CC BY 4.0 (3 TB); paper states Python interfaces for download/train/compare are provided (repo referenced in paper). ~3 TB download.

## 9. Leakage & limitations
- 48 h global benchmark ≠ stadium-scale nowcasting; ERA5 as "truth" inherits reanalysis bias; two-year test window (2016–2017) is short.
- Gaussian output assumption: can't represent multimodal precipitation or bounded quantities.
- Only three variables baselined (Z500, T850, T2m) — no wind speed, no precipitation, the two variables GSE needs most.
- 3 TB / 20-year infrastructure is overkill for a stadium-lane use; model cycle changes (Cy43r1/Cy45r1) mean reforecasts can't be pooled across eras — a temporal-consistency caveat.
- EMOS beats nothing (even raw) in these tests, which says more about the naive EMOS setup than the method.

## 10. GSE overlap
Resource paper, not a duplicate of 1580/1581. It gives GSE (a) the differentiable-CRPS Gaussian recipe to train probabilistic post-processing cheaply (complements 1580's flow-based distributions and 1581's deterministic LGBM), (b) the EECRPS metric — a principled way to score weather edges on extreme games (blizzards, hurricanes), and (c) a standard benchmark GSE can use to vet any post-processing model before adapting it to stadium data. No existing GSE research cites it.

## 11. GSE implementation spec
- Adopt the EECRPS-style metric: score all GSE weather-edge models with an extreme-weighted CRPS on the NFL stadium dataset (high-wind, heavy-precip, cold games), not just average CRPS/RMSE — extreme games are where weather edges pay.
- Train the baseline ladder (MLP → LeNet → per-pixel transformer) on GEFS/HRRR ensemble reforecasts over stadium neighborhoods as the cheap warm-start before the ANET2-style flow (1580); the paper shows transformer is strongest on temperature fields, LeNet on geopotential — informs architecture choice per variable.
- Don't download 3 TB: implement the recipe on GEFS reforecast data for 30 stadium neighborhoods only.

## 12. Reproducible test
Dataset: GEFS v12 reforecast ensembles over 30 NFL stadiums + ERA5/NOAA ground truth, 1998–2019. Baselines: raw ensemble, EMOS, MLP, LeNet, transformer per paper. Test: fixed holdout 2017–2019; metrics CRPS and |EFI|-weighted CRPS on T2m, 10 m wind speed, precipitation at kickoff windows; 10-member vs 5-member ablation. Gate below.

## 13. Acceptance / rejection gate
ADOPT if any NN baseline cuts CRPS ≥ 10% vs raw on wind speed AND the EECRPS ranking matches the CRPS ranking (extreme skill not traded away). REJECT if Gaussian-CRPS post-processing can't beat raw on wind speed — then GSE goes straight to the flow/LGBM recipes (1580/1581) and this paper remains only a metric citation.

## 14. Improvement experiment
Combine the paper's two contributions: train the Gaussian baselines with an EECRPS-weighted loss (optimize what extreme games need) instead of plain CRPS, and test whether EECRPS-optimized models beat CRPS-optimized ones on heavy-precip/high-wind kickoff games without losing average CRPS — the paper defined the metric but never used it as a training objective. Second: replace the Gaussian output with the 1580 spline-flow head inside the ENS-10 benchmark ladder and see whether non-Gaussian outputs close the wind-speed gap the paper didn't test.
