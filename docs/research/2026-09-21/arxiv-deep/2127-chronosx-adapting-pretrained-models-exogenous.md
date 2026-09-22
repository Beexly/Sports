# [2127] ChronosX: Adapting Pretrained Time Series Models with Exogenous Variables (arXiv:2503.12107v1)

**Citation:** Abdul Fatir Ansari, Lorenzo Stella, Tommaso Colella, Suman Bokka, Ali Caner Turkmen, Shenghao Wu, Xiyuan Zhang, Pedro Mercado, Huibin Shen, Oleksandr Shchur, Syama Sundar Rangapuram, Daniel Fersing, George Karypis, Yuyang Wang, Michael Bohlke-Schneider (2025). *ChronosX: Adapting Pretrained Time Series Models with Exogenous Variables*. arXiv:2503.12107v1. URL: https://arxiv.org/abs/2503.12107
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML). Lane: `timeseries_foundation`.
**Verdict:** ADOPT — covariate adapters on a frozen TSFM backbone are the cheapest credible path to weather/injury/rest-aware sports forecasting; the Input/Output Injection Block design ports almost verbatim to a Chronos- or Moirai-backed GSE forecaster.

## 1. Research question
Can pretrained univariate TSFMs (Chronos, and by extension MOMENT/TimesFM) be extended with past and future exogenous covariates via lightweight adapters — without retraining the backbone — and does this beat both the frozen model and full fine-tuning?

## 2. Dataset / schema
- **Benchmark:** 32 synthetic datasets constructed by the authors; each dataset has 100 daily series of length 1827 with a prediction horizon of 30; covariates include past-only and future-known exogenous variables with known ground-truth effects (so adapter recovery can be measured). Synthetic, generation code in paper repo.
- **Model-agnosticism tests:** adapters applied to Chronos, MOMENT, and TimesFM backbones.

## 3. Method / model
- **Input Injection Block (IIB):** residual feed-forward network over token embeddings plus past covariates — injects past-observed exogenous information into the backbone's input space: h̃_t = h_t + FFN([h_t; x^{past}_t]).
- **Output Injection Block (OIB):** adjusts the backbone's output logits/distribution parameters from future-known covariates: θ̃_{t} = θ_t + FFN([θ_t; x^{future}_t]).
- **Training modes:** adapter-only (backbone frozen) and full fine-tuning (backbone + adapters); compared against frozen zero-shot and covariate-free fine-tuning.
- The design is backbone-agnostic: demonstrated on Chronos (tokenized), MOMENT (patched encoder), TimesFM (patched decoder).

## 4. Equations & assumptions
- IIB: ẽ_t = e_t + W_2·σ(W_1·[e_t; x^{past}_t] + b_1) + b_2 (residual FFN; identity when covariates are zero/uninformative).
- OIB: logits̃_t = logits_t + FFN([logits_t; x^{future}_t]).
- Objective: same as backbone (cross-entropy for Chronos; MSE for TimesFM/MOMENT variants) on the target with covariates observed.
- Metrics: WQL (quantiles 0.1–0.9, 100 sample paths), MASE; aggregated by geometric relative to baseline.
- Assumptions: covariates are correctly aligned in time (no lookahead in the "past" channel); future covariates are truly known at forecast time (weather forecasts, rest days, venue — true in sports; injury reports are *not* future-known and belong in the past channel or as nowcasts); residual form means adapters can't hurt much when covariates are noise.

## 5. Features / target
Input: target series + past covariates (observed history only) + future covariates (known over the horizon). Target: predictive distribution over horizon (paths/quantiles). Covariate-aware probabilistic forecasting.

## 6. Validation design
32 synthetic datasets × adapter variants (IIB only, OIB only, both) × training modes (adapter-only, full FT) × backbones (Chronos, MOMENT, TimesFM). Baselines: frozen backbone zero-shot, backbone fine-tuned without covariates, and covariate-aware supervised models. Metrics WQL + MASE, geometric aggregation. (Headline numbers: adapters beat frozen backbone consistently; adapter-only ≈ full fine-tuning at a fraction of the parameters — exact deltas are in the paper's result tables.)

## 7. Numerical results / baselines
- Adapter-augmented models beat the frozen backbones on covariate-driven datasets across all three backbones (Chronos, MOMENT, TimesFM).
- Adapter-only training matches or approaches full fine-tuning performance — the "freeze the foundation model, train the covariate bridge" claim holds.
- IIB and OIB are complementary: past-covariate effects recovered by IIB, future-known effects by OIB; the combination is best.
- (Exact WQL/MASE deltas are tabulated in the paper; the consistent directional finding is adapters ≫ frozen, adapters ≈ full-FT.)

## 8. Code / data availability
Paper references a code release (ChronosX adapters in the authors' repository — verify live at implementation; the Chronos ecosystem repos are the fallback). Synthetic dataset generation described in the paper.

## 9. Leakage & limitations
- Synthetic benchmark: ground-truth covariate effects are clean and strong; real sports covariates (weather, injuries) are noisy, partially observed, and confounded — expect smaller gains.
- Future-known channel is only as good as the forecast inputs (weather forecasts have error; injury "known" values leak if the report comes after lineup lock — operational discipline required).
- Adapter-only ≈ full-FT is shown on synthetic; on real sports data the backbone may need unfreezing too (budget both).
- No treatment of missing covariates or ragged alignment (bye weeks, postponed games) — GSE must add masking.

## 10. GSE overlap
No TSFM/covariate-adapter work in the GSE corpus. GSE's engine consumes weather/rest/injuries through handcrafted features; ChronosX offers the pretrained-model equivalent: keep a frozen sports TSFM backbone and learn only the covariate bridge. This is the missing piece that makes 2122/2123/2126 deployable for sports — the covariate problem those papers punt on.

## 11. GSE implementation spec
1. **Backbone:** fine-tuned sports Chronos (2123) or Moirai (2126), frozen.
2. **IIB (past covariates):** team rolling EPA differential, injury-derived ELO adjustments, line-movement history, rest-day differential history — residual FFN over backbone embeddings.
3. **OIB (future covariates):** forecast weather (temp/wind/precip), dome flag, days rest, travel miles, known QB starter, opening/closing spread — residual FFN over output logits.
4. **Training:** adapter-only first (cheap, 1 GPU-day); full-FT comparison on the seasonal holdout. Strict channel discipline: nothing in the future channel that isn't known pre-kickoff (injury reports timestamped before lineup lock go to past channel).
5. **Serving:** adapters add negligible latency to the batch pipeline.
Effort: 2–3 engineer-weeks on top of the 2123/2126 backbone.

## 12. Reproducible test
Dataset: NFL 2015–2024 with covariates (weather from stadium feeds, rest/travel from schedule, injuries from reports, lines from odds history). Test: 2022–2024 walk-forward, horizon 1 game, margin distribution. Metric: WQL vs. (a) frozen backbone, (b) backbone fine-tuned without covariates, (c) GSE engine. Success: adapter model beats (b) — proving the covariate bridge adds value beyond fine-tuning. Leakage audit: future-channel values timestamped ≤ kickoff − 60 min; any post-kickoff value in the future channel = fail.

## 13. Acceptance / rejection gate
ADOPT into the engine if adapters beat the covariate-free fine-tuned backbone by ≥0.01 WQL on 2022–2024 AND the ablation (adapters with shuffled covariates) shows no gain (proving the gain is real signal, not capacity); keep the frozen backbone + adapters (don't full-FT) if adapter-only is within 0.005 WQL of full-FT (cheaper serving). REJECT the adapter design if it fails to beat (b) — the covariates aren't carrying signal in this form. Hard reject on any future-channel leakage.

## 14. Improvement experiment
Covariate nowcasting head: injuries and lineup news arrive between the batch run and kickoff; add a lightweight "late-news" IIB update that re-runs only the adapter blocks (not the backbone) on fresh injury/covid/weather-nowcast inputs in the final 60 minutes. Measure WQL delta of late-update vs. batch-only. Hypothesis: most covariate value is in the last hour (injury inactives), and adapter-only re-inference makes it operationally feasible.
