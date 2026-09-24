# [2128] GITCO: Gated Inference-Time Context Optimization in TSFMs (arXiv:2606.05332v1)

**Citation:** Aaryan Nagpal, Debdeep Sanyal, Murari Mandal, Dhruv Kumar, Saurabh Deshpande (2026). *GITCO: Gated Inference-Time Context Optimization in TSFMs*. arXiv:2606.05332v1. URL: https://arxiv.org/abs/2606.05332
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML). Lane: `timeseries_foundation`.
**Verdict:** ADOPT — it is training-free, model-agnostic (demonstrated on frozen TimesFM 2.5), and directly targets the sports failure mode (one anomalous game poisoning the context); the gate's high precision makes it safe to deploy as a serving-time wrapper.

## 1. Research question
Can a frozen time-series foundation model's forecasts be improved at inference time — with no retraining — by detecting and repairing a single harmful context patch, gated by a classifier that predicts when intervention helps?

## 2. Dataset / schema
- **Evaluation:** 53 GIFT-Eval datasets, strict K=11 cross-validation protocol. Public benchmark.
- **Method development:** TimesFM 2.5 (frozen) as the base forecaster. Public weights.

## 3. Method / model
- **Gate:** binary classifier predicting whether context intervention will improve the forecast for this series (precision 78.0%, recall 57.6%; intervened on 24/53 datasets).
- **Router:** given an intervention decision, chooses among three probes — ShapeProbe, StatProbe, UniProbe — each diagnosing context pathology differently (shape distortion, statistical anomaly, univariate irregularity). Router classification accuracy only 33.3%±28.4% — but the improvement surface is flat enough that mis-routing still captures 89.9% of oracle gain.
- **Critic:** identifies the single most harmful context patch.
- **Repair:** 5-point simple moving average (SMA) denoising applied to that patch only.
- **Pipeline:** Gate → (if intervene) Router → probe → Critic → SMA repair → forecast with repaired context. Everything at inference time; backbone untouched.

## 4. Equations & assumptions
- Gate: g(x) ∈ {0,1}; intervene iff P(improvement|x) > τ.
- Critic: j* = argmax_j harmfulness(patch_j) (leave-one-patch-out influence proxy).
- Repair: ỹ_{j*} = SMA_5(y_{j*}) (5-point moving average over the harmful patch).
- Metric: MASE; reported as total improvement +1.032 summed over datasets.
- Assumptions: at most one harmful patch per series (single-patch repair); SMA is a sufficient denoiser (true for point anomalies, not for regime shifts); the gate's training distribution matches deployment.

## 5. Features / target
Input: the frozen model's context window (a raw series). Target: improved point forecast via context repair. Inference-time only; no parameter updates.

## 6. Validation design
53 GIFT-Eval datasets, K=11 strict cross-validation; MASE vs. frozen TimesFM 2.5 baseline; ablations: gate on/off, oracle router vs. learned router, repair variants. Captured-improvement ratio (achieved gain / oracle gain) as the routing-quality metric.

## 7. Numerical results / baselines
- **Total MASE improvement: +1.032** summed across datasets vs. frozen TimesFM 2.5.
- **Mean MASE reduction: 1.95%** across all 53 datasets; **4.30%** among the 24 intervened datasets.
- **Gate:** precision 78.0%, recall 57.6% — conservative, intervenes selectively.
- **Captured improvement ratio: 0.899** — despite a weak router (33.3% accuracy), the flat improvement surface means routing errors cost little.
- Code: https://github.com/birla-ai-labs/gitco.

## 8. Code / data availability
Code released: https://github.com/birla-ai-labs/gitco. GIFT-Eval public. TimesFM 2.5 weights public.

## 9. Leakage & limitations
- Single-patch assumption: a team with two anomalous games (e.g., backup-QB stretch) gets only one repair — the paper doesn't test multi-patch.
- SMA repair assumes point-anomaly structure; a genuine regime shift (new coach) repaired by SMA would *destroy* signal — the gate must learn to abstain there, and 57.6% recall means it misses nearly half of improvable cases.
- Router accuracy 33.3% is near-chance; the 0.899 capture ratio is the saving grace but may not transfer to sports contexts where probes behave differently.
- MASE-only evaluation; no probabilistic extension (repair changes the distribution, not just the point).
- GIFT-Eval is generic series; sports anomalies (blowouts, weather games, backup QBs) have structure the probes weren't designed for.

## 10. GSE overlap
No inference-time TSFM work in the GSE corpus. GSE's engine has no serving-time context-repair concept; its nearest analog is manual feature overrides. GITCO is a new serving-layer capability: a safety wrapper around any frozen sports TSFM (2122–2126 backbones) that suppresses poisoned context games. Complements ChronosX (2127): adapters add covariates, GITCO repairs context.

## 11. GSE implementation spec
1. **Wrapper:** implement Gate→Router→Critic→SMA as a serving-time module around the frozen sports TSFM; train the gate on GSE's historical series with leave-one-game-out influence labels (did removing game X improve the forecast?).
2. **Sports probes:** add a fourth probe family — regime-shift detector (coaching/QB change flags) that forces gate abstention (never SMA a genuine regime change).
3. **Training cost:** gate/router are tiny classifiers; train on CPU in minutes from logged forecasts.
4. **Serving:** runs in the batch pipeline before backbone inference; abstains by default (gate precision > recall is the safe direction).
Effort: 1–2 engineer-weeks.

## 12. Reproducible test
Dataset: NFL 2015–2024 team sequences with logged frozen-backbone forecasts. Test: 2022–2024 walk-forward. Metric: MASE of backbone+GTECO vs. backbone alone; plus intervention rate and gate precision measured against leave-one-game-out oracle labels. Baselines: no-repair backbone, naive SMA-everything (to show gating matters). Success: ≥1.5% mean MASE reduction with intervention rate ≤50% (selective). Leakage audit: gate trained only on pre-2022 seasons.

## 13. Acceptance / rejection gate
ADOPT as a default-on serving wrapper if the sports gate achieves ≥70% precision on 2022–2024 AND mean MASE reduction ≥1.5% with no season worse than baseline; keep it default-off (opt-in per series) if precision is 60–70%; REJECT if precision <60% or any season degrades — a misfiring repair is worse than none. Hard reject if the regime-shift abstention probe is not implemented (SMA-ing a coaching change is the catastrophic failure mode).

## 14. Improvement experiment
Multi-patch critic: extend the Critic to rank all patches by harmfulness and repair the top-k (k chosen by a second gate), testing on backup-QB stretches and post-bye anomalies where 2–3 consecutive games are jointly anomalous. Hypothesis: single-patch repair leaves correlated anomalies (the common sports case) half-fixed; top-k repair should roughly double the captured gain on multi-game anomaly stretches.
