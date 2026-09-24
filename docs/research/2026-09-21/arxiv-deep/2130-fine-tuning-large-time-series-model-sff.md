# [2130] Lost in the Non-convex Loss Landscape: How to Fine-tune the Large Time Series Model? (SFF) (arXiv:2606.08578v1)

**Citation:** SFF authors (2026). *Lost in the Non-convex Loss Landscape: How to Fine-tune the Large Time Series Model?* arXiv:2606.08578v1. URL: https://arxiv.org/abs/2606.08578
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML). Lane: `timeseries_foundation`.
**Verdict:** ADOPT — smoothed full fine-tuning is a two-line change (interpolate pretrained weights with random init), validated across 8 LTSMs × 9 datasets with code released; it becomes the default fine-tuning protocol for every GSE sports-TSFM adaptation.

## 1. Research question
Why does naive full fine-tuning of large time-series models often underperform, and can a simple weight-space smoothing operation — interpolating pretrained parameters with random initialization — find flatter, better-generalizing minima?

## 2. Dataset / schema
- **Evaluation:** 9 forecasting datasets (standard long/short-horizon benchmarks: ETT family, Electricity, Weather, Traffic, etc.).
- **Models:** 8 large time-series models (LTSMs): Timer, TimesFM, MOMENT, UniTS, Moirai, Chronos, TTMs, Sundial. Public.

## 3. Method / model
- **Smoothed Full Fine-tuning (SFF):** before fine-tuning, replace the initialization with Θ₃ = α·Θ₁* + (1−α)·Θ₂, where Θ₁* are the pretrained weights, Θ₂ a fresh random initialization, and α ∈ {0.3, 0.5, 0.7, 0.9} selected on validation.
- **Intuition:** pretrained weights sit in a sharp minimum of the pretraining loss; interpolating toward random init moves the starting point out of the sharp basin while retaining most pretrained knowledge, letting fine-tuning settle in a flatter minimum of the target loss.
- **Cost:** one extra forward-free arithmetic op; fine-tuning proceeds normally from Θ₃.
- Code: https://github.com/Meteor-Stars/SFF.

## 4. Equations & assumptions
- Θ₃ = αΘ₁* + (1−α)Θ₂, α ∈ [0,1].
- Claim: L_target(Θ₃) starts higher than L_target(Θ₁*) but converges to a flatter minimum with lower test error.
- Metric: MSE (and MAE) on standard horizons.
- Assumptions: weight-space linear interpolation is meaningful (true for same-architecture init); the optimal α is dataset-dependent (hence the grid); sharpness of the pretraining minimum is the binding constraint (not data scarcity or capacity).

## 5. Features / target
Model-agnostic fine-tuning protocol; inputs/targets are whatever the backbone uses. No feature changes.

## 6. Validation design
8 LTSMs × 9 datasets: SFF vs. standard full fine-tuning vs. frozen/linear-probe baselines; α selected from {0.3, 0.5, 0.7, 0.9} on validation; MSE/MAE reported.

## 7. Numerical results / baselines
- **SFF reduces MSE by 3% on average and up to 6.5%** versus ordinary full fine-tuning, aggregated across models and datasets.
- Gains consistent across architectures (encoder-only MOMENT, decoder-only TimesFM, tokenized Chronos, any-variate Moirai) — the effect is not architecture-specific.
- α sensitivity: best α varies by dataset/model; the 4-point grid suffices.

## 8. Code / data availability
Code: https://github.com/Meteor-Stars/SFF. Datasets: public benchmarks. All 8 backbone weights public.

## 9. Leakage & limitations
- α grid is coarse and selected on validation — with small sports validation windows (one season), α selection itself can overfit; prefer α=0.5–0.7 fixed or nested validation.
- 3% average gain is modest; on noisy sports data the signal may drown in season-to-season variance — needs multi-season aggregation to detect.
- No probabilistic-metric evaluation (MSE only); GSE needs the CRPS/WQL analog verified.
- Interpolation assumes identical architecture between Θ₁* and Θ₂ — trivially satisfied, but rules out cross-architecture smoothing.
- Doesn't address *what* to fine-tune on (corpus design still matters — cf. 2131).

## 10. GSE overlap
No fine-tuning-protocol research in the GSE corpus; the engine's models are trained from scratch or hand-tuned, with no systematic fine-tuning discipline for pretrained backbones. SFF slots directly into every other ledger in this lane (2122–2129, 2134): it is the *how* for all the fine-tuning steps those ledgers prescribe.

## 11. GSE implementation spec
1. **Default protocol:** every sports-TSFM fine-tune (Chronos 2123, Moirai 2126, Lag-Llama 2125, TimesFM 2122) uses SFF: Θ₃ = αΘ₁* + (1−α)Θ₂, α from {0.5, 0.7} (narrowed grid for small validation windows), selected on the season-before-test.
2. **Ablation harness:** always run standard full-FT alongside SFF on the seasonal holdout; log the delta — this builds the GSE-internal evidence base for the 3% claim on sports data.
3. **Combine with adapters:** SFF the backbone, then train ChronosX adapters (2127) on top — test additive vs. redundant gains.
4. **Cost:** negligible — one interpolation before training.
Effort: <1 engineer-week to integrate into the training harness; the ablation logging is the real work.

## 12. Reproducible test
Dataset: NFL 2015–2024 margins. Backbones: sports-fine-tuned Chronos-Small and Moirai-Small. Test: 2022–2024 walk-forward; SFF (α∈{0.5,0.7}) vs. standard full-FT vs. frozen. Metric: MSE and CRPS of margin forecasts. Success: SFF beats standard FT on MSE in ≥2 of 3 test seasons and never loses CRPS by >1%. Leakage audit: α selected on validation seasons only (2020–2021).

## 13. Acceptance / rejection gate
ADOPT SFF as the default fine-tuning initializer if it beats standard full-FT on MSE in the majority of test seasons with no CRPS regression >1%; keep it as an option (not default) if results are mixed; REJECT as default if it underperforms standard FT in 2+ seasons — the sharp-minimum story may not hold on small sports corpora. Hard reject if α-selection validation shows the grid choice flipping sign across seeds (selection noise > effect).

## 14. Improvement experiment
α-schedule: instead of a fixed α, anneal from low α (more random, more exploration) to high α (more pretrained, more exploitation) across fine-tuning epochs — a "smoothing curriculum." Compare against fixed-α SFF on the seasonal holdout. Hypothesis: early exploration escapes the sharp basin more reliably than a fixed interpolation point, especially with small sports fine-tuning sets.
