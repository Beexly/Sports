# [2123] Chronos: Learning the Language of Time Series (arXiv:2403.07815v2)

**Citation:** Abdul Fatir Ansari, Lorenzo Stella, Caner Turkmen, Xiyuan Zhang, Pedro Mercado, Huibin Shen, Oleksandr Shchur, Syama Sundar Rangapuram, Sebastian Pineda Arango, Shubham Kapoor, Jasper Zschiegner, Danielle C. Maddix, Michael W. Mahoney, Kari Takanen, Andrew J. Gordon, Lorenzo Perini, Yuyang Wang (2024). *Chronos: Learning the Language of Time Series*. arXiv:2403.07815v2. URL: https://arxiv.org/abs/2403.07815
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML). Lane: `timeseries_foundation`.
**Verdict:** ADAPT — probabilistic by construction (sampled paths, WQL-native), which maps directly onto GSE's calibration needs; adapt means borrowing the tokenization + T5-recipe for a sports model and pairing it with covariate extensions (ChronosX) rather than deploying univariate-only Chronos for sports.

## 1. Research question
Can time-series forecasting be reframed as next-token prediction on quantized, scaled series, so that a pretrained language-model architecture (T5, GPT-2) trained with cross-entropy becomes a probabilistic zero-shot forecaster competitive with supervised models?

## 2. Dataset / schema
- **Training:** 28 datasets, ~890K univariate time series, ~84B observations (energy, transport, nature, web, sales, economics/finance, healthcare, web/cloud ops, synthetic). Chronos: data publicly released (Hugging Face `autogluon/chronos-t5-*`).
- **Evaluation:** (i) 15 datasets seen in training (in-domain), (ii) 27 datasets not used for training (zero-shot), spanning standard benchmarks (Monash, GluonTS, LibCity, etc.). Public.
- **Augmentation:** TSMixup — 10M mixup augmentations combining k∈{2,3} series with Dirichlet weights; 1M synthetic series from Gaussian processes (kernel-combination "KernelSynth" recipe, 1024 length, 9:1 real:synthetic sampling). Context length 512, horizon 64 at train time.

## 3. Method / model
- **Preprocessing:** mean scaling: x_i / ((1/C)Σ|x_i|), then **uniform quantization into 4096 bins** with centers c_i spanning −15..15; values outside [c_1,c_B] clipped.
- **Modeling:** series → sequence of tokens z_{1:C} (from quantized values); train T5 encoder-decoder (sizes: 20M, 46M, 200M, 710M — "Chronos-T5 Mini/Small/Base/Large") or GPT-2 (90M "Chronos-GPT2") with **categorical cross-entropy** L = −Σ_i log p_θ(z_{C+i+1} | z_{1:C+i}) on the forecast horizon, with label smoothing.
- **Inference:** sample autoregressive paths (temperature or categorical samples) from the token distribution, map tokens back to values, unscale — yielding empirical predictive distributions; point forecast = median path.
- **Training config:** 200K steps, batch 256, AdamW, LR 0.001 → 0 (linear decay), weight decay 0.01, dropout default. Context 512, prediction length 64, vocab 4096.

## 4. Equations & assumptions
- Scaling: s = (1/C)Σ_{i=1}^C |x_i|; x̃_i = x_i/s.
- Quantization: q(x̃) = argmin_b |x̃ − c_b|, c_b uniformly spaced over [−15,15], B=4096.
- Objective: θ* = argmin_θ −Σ_{t=1}^{H} log p_θ(z_{C+t} | z_{1:C+t−1}).
- Point metrics: WQL over quantiles {0.1,…,0.9}; MASE vs seasonal-naive.
- Assumptions: mean-scale statistics make series dimensionless and comparable across domains (fails if a series is constant → degenerate s=0, handled by fallback); 4096-bin quantization sacrifices sub-bin precision (acceptable at 64-step horizons); autoregressive sampling accumulates error; no cross-series or covariate information.

## 5. Features / target
Input: raw univariate series (C=512 context at inference, any length in practice). Target: tokenized future H tokens → dequantized to continuous paths; output is a full empirical predictive distribution (e.g., 100 sample paths), from which quantiles, intervals, and point forecasts derive. No exogenous features.

## 6. Validation design
42 datasets total: 15 in-domain, 27 zero-shot; metrics WQL (probabilistic) and MASE (point), aggregated by geometric mean (relative to seasonal naive). Baselines: local statistical (SeasonalNaive, AutoETS, AutoARIMA, Theta, CES, CrostonSBA, NPTS, DynamicOptimizedTheta), deep (DeepAR, PatchTST, TFT, TiDE), and pretrained LLMs-for-time-series (llmtime via GPT-3.5, GPT-4). Also fine-tuning study: Chronos-T5 (Small) fine-tuned on the single training split of each evaluation dataset vs. training from scratch.

## 7. Numerical results / baselines
- **Zero-shot:** Chronos models occupied **2nd–4th in probabilistic (WQL) rankings**; Chronos-T5 (Large) ranked **2nd on point forecasting (MASE)** — all while competing zero-shot against models trained per dataset. SeasonalNaive normalized to 1.0 baseline.
- **In-domain:** Chronos models beat almost all task-specific models on both WQL and MASE; the largest (710M) was best.
- **Fine-tuning:** fine-tuned Chronos-T5 (Small) was **the best method on average across both metrics**, beating supervised PatchTST/DeepAR — with far cheaper training (fewer steps) than training from scratch.
- **llmtime (GPT-3.5/4):** far behind Chronos on both metrics despite being a much larger language model — text-tokenization is a poor time-series tokenizer.
- **TSMixup ablation:** removing mixup/synthetic hurt zero-shot performance; synthetic GP data with realistic kernels helped most on small-data regimes.

## 8. Code / data availability
Code + weights + training data: Hugging Face `autogluon/chronos-t5-mini/small/base/large`, `chronos-bolt-*` successors; training scripts in the `autogluon` Chronos repository. Data: public datasets listed in the appendix; augmented/synthetic generation recipes included. Weights for the fine-tuned variants are reproducible via released scripts.

## 9. Leakage & limitations
- Uniform quantization to 4096 bins caps precision; for tight-margin NFL games (±3) the quantization grain relative to a spread market (~0.5 pt resolution) is acceptable but must be validated against market granularity.
- Mean scaling is fragile on constant or near-constant sequences (e.g., a team's kickoff counts) — degenerate denominators.
- Zero-shot results confound pretraining overlap: many evaluation archives (Monash) predate the model; the paper's in-domain/zero-shot split partially addresses this but Wikipedia-style familiarity effects (cf. 2609.10357) apply to its web/econ data.
- No covariates: cannot ingest weather, injuries, rest, line movement — the very inputs that separate sportsbooks' models.
- Autoregressive sampling is slow for many series × many paths; latency matters for Sunday-morning odds refresh.

## 10. GSE overlap
No Chronos/TSFM references in the GSE corpus (checked benchmark-audit-2026-09-17, AGENTS.md, docs/research tree — only unrelated "momentum" hits). GSE's current calibration work (Mimo CQR lane) is conformal post-hoc on top of point forecasts; Chronos-style generative distributions would give *native* probabilistic outputs and a direct WQL/CRPS training signal — a new, complementary lane. The fine-tuning result (small Chronos fine-tuned beats big supervised models) is directly relevant to GSE's per-season adaptation strategy.

## 11. GSE implementation spec
1. **Baseline experiment:** zero-shot Chronos-T5-Small/Base on weekly NFL team-margin series (2002–2024); score WQL/MASE vs. GSE engine's current margins — pure evaluation, no code, one engineer-day.
2. **Sports adaptation:** fine-tune Chronos-T5-Small on GSE's sports corpus (team margins, totals, player usage) using the paper's recipe (AdamW, low LR, early stopping on seasonal holdout); use sampled paths as the probabilistic engine input for spread/total pricing.
3. **Covariate extension:** adopt ChronosX (2127) adapters on top of the fine-tuned Chronos to inject weather, rest, injuries — do not reinvent covariate handling.
4. **Serving:** batch-infer quantile paths per game; feed WQL-calibrated distributions to the existing moneyline/CLV pricing layer. Sampling cost ~100 paths × 32 games ≈ trivial.
Effort: 1 day baseline → 2–3 weeks fine-tune + serving integration.

## 12. Reproducible test
Dataset: NFL margins 2002–2024, weekly team sequences. Protocol: expanding walk-forward, test = 2021–2024 seasons; forecast horizon = next 1 game per team (H=1; then next-4 as H=4 variant). Metric: mean WQL (quantiles 0.1–0.9, 100 sample paths) relative to SeasonalNaive; plus MAE of median. Baselines: SeasonalNaive, AutoETS, GSE engine v5.2.7 margins. Leakage audit: pretraining corpus excludes any NFL data (stock Chronos has never seen sports series — pure zero-shot); fine-tuning split strictly season-ordered.

## 13. Acceptance / rejection gate
ADOPT into the engine's probabilistic path if fine-tuned Chronos beats GSE's current margin MAE by ≥0.3 points AND its WQL is ≤0.95× the SeasonalNaive baseline on 2021–2024; ADAPT (keep researching) if it only matches; REJECT the covariate-free variant for live pricing if WQL does not beat naive — univariate alone cannot ship. Hard reject if any sample-path distribution fails a calibration check (empirical coverage of 80% intervals deviates >5 pts from nominal).

## 14. Improvement experiment
Tokenization resolution study: re-quantize with finer vocab (8192 bins) or learned quantization on sports series and measure whether sub-point precision (matters for key numbers 3/7) improves WQL; combine with a mean-scale replacement (robust scale = median absolute deviation) to handle constant/degenerate sequences. Hypothesis: NFL-margin-optimal tokenization beats the paper's generic 4096-bin recipe on WQL while preserving zero-shot transfer.
