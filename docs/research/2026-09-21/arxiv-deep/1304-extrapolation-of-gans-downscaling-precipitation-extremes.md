# [1304] On the Extrapolation of Generative Adversarial Networks for Downscaling Precipitation Extremes in Warmer Climates (arXiv:2409.13934v1)

**Citation:** Rampal, N., Gibson, P. B., Sherwood, S., & Abramowitz, G. (2024). *On the Extrapolation of Generative Adversarial Networks for Downscaling Precipitation Extremes in Warmer Climates*. arXiv:2409.13934v1 [physics.ao-ph]. URL: https://arxiv.org/abs/2409.13934
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** ADAPT — conditional GANs trained only on historical climate retain 77% of the future increase in extreme precipitation (vs 63–65% for deterministic downscalers), proving generative downscaling extrapolates tail behavior out of distribution; the recipe ports to synthetic extreme-weather scenario generation for GSE's tail-risk modeling. (Replacement for REJECT 1099.)

## 1. Research question
When downscaling coarse climate-model output to fine scales, do generative adversarial networks extrapolate changes in precipitation extremes under future warming better than deterministic (regression) downscalers — even when trained only on the historical climate?

## 2. Dataset / schema
CCAM regional climate model output over the New Zealand region (165°E–184°W); five independent SSP370 simulations; historical vs end-of-century warming scenarios. Evaluation focuses on the 99.5th percentile of precipitation (extreme tail). Deterministic CNN baselines vs conditional GAN (CGAN) downscalers.

## 3. Method / model
Conditional GAN downscaling: a generator maps coarse-resolution fields to fine-scale precipitation, trained adversarially against a discriminator (initial learning rate 2×10⁻⁴ for both). Three training regimes compared: GAN trained on historical climate only, GAN trained on future climate, and deterministic CNN baselines. Skill = fraction of the RCM-projected warming-driven increase in extreme precipitation captured by each downscaler.

## 4. Equations & assumptions
- RCM-projected ground truth: ~5.8%/°C average increase in 99.5th-percentile precipitation across five simulations.
- Capture fraction: downscaler's projected increase ÷ RCM projected increase.
- Assumptions: RCM tail response is the reference truth; the CGAN's learned fine-scale physics transfers across climate regimes; 99.5th percentile is the decision-relevant tail.

## 5. Features / target
Features: coarse-resolution climate fields. Target: fine-scale precipitation fields whose tail (99.5th percentile) responds correctly to warming.

## 6. Validation design
Train on historical period, evaluate the warming-driven tail change against end-of-century RCM truth; repeat with future-climate training; compare against deterministic CNN baselines trained both ways.

## 7. Numerical results / baselines
- Future-trained GANs capture 97% of the warming-driven increase in extreme precipitation vs 65% for the deterministic baseline.
- Historically trained GANs still capture 77% — substantially better than deterministic CNNs (63–65%), which underestimate future tail increases even when trained on future climates.
- Key result: generative downscaling extrapolates tail behavior out of distribution where regression downscaling cannot.

## 8. Code / data availability
CCAM simulation data (research access). Code: not stated in paper.

## 9. Leakage & limitations
No leakage: historical-trained models are evaluated on a genuinely unseen warmer climate. Limitations: single region (New Zealand), single RCM family, precipitation only; GAN training instability is not quantified; 99.5th percentile is one tail slice.

## 10. GSE overlap
Consulted `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. Gap 8 (weather physics for totals): this is the generative-scenario complement to ledgers 1301/1303/1305 — it answers whether a generative weather model trained on today's climate can produce credible extreme scenarios. No GAN/downscaling-extrapolation material in the corpus. No duplicate.

## 11. GSE implementation spec
1. Train a conditional GAN to downscale coarse reanalysis to stadium-scale gust/precipitation fields, trained on historical data only.
2. Validate the tail-extrapolation property on held-out extreme-weather seasons (e.g., unusually stormy years) using the paper's capture-fraction metric before trusting synthetic extremes.
3. Use the validated generator inside GSE's Monte Carlo engine to produce extreme-weather game scenarios for tail-risk pricing of totals and weather-sensitive props.

## 12. Reproducible test
Replicate on US data: coarse ERA5 → fine-scale station precipitation with a CGAN; train on pre-2015, evaluate the tail-change capture on post-2015 extreme seasons vs a deterministic CNN baseline; require the GAN to beat the CNN's capture fraction before production use.

## 13. Acceptance / rejection gate
ADAPT: the 77%-vs-65% historical-training result is exactly the evidence GSE needs to justify generative extreme-weather simulation — tails that extrapolate without future data.

## 14. Improvement experiment
Condition the generator on large-scale circulation indices (ENSO/NAO phase) for regime-aware extremes; ensemble multiple GAN seeds and measure tail-spread calibration; test diffusion-based downscalers against the GAN on the same capture-fraction metric.
