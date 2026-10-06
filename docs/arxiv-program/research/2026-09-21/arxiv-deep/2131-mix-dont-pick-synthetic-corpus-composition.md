# [2131] Mix, Don't Pick: Why Synthetic Corpus Composition Matters for Time Series Foundation Model Pretraining (arXiv:2606.09912v1)

**Citation:** Aaryan Nagpal, Debdeep Sanyal, Murari Mandal, Dhruv Kumar, Saurabh Deshpande (2026). *Mix, Don't Pick: Why Synthetic Corpus Composition Matters for Time Series Foundation Model Pretraining*. arXiv:2606.09912v1. URL: https://arxiv.org/abs/2606.09912
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML). Lane: `timeseries_foundation`.
**Verdict:** ADAPT — the "equal-weight mixture over generator families" recipe is the right way to build GSE's synthetic sports pretraining corpus, but the 11 generator families are generic-series; GSE must design sports-native generators (score dynamics, possessions, injuries, volatility regimes) before the recipe applies.

## 1. Research question
Under a fixed pretraining budget, how much does the choice of synthetic data generator matter for TSFM zero-shot performance — and does a simple equal-weight mixture over generators beat picking the best single one?

## 2. Dataset / schema
- **11 synthetic generator families:** ARIMA, ETS, fractional Brownian motion (fBm), SDEs, GARCH, chaotic systems, TimeSynth, TSI (trend-seasonality-irregularity), StepFunction/Waveform-inspired, KernelSynth (GP kernel compositions). Total pool: 11.2B time points; each single-generator corpus: 1M univariate windows × length 1024.
- **Mixtures:** Mixed11 (equal-weight over all 11); real+synthetic mixes at 75/25, 50/50, 25/75 ratios (real = GIFT-Eval pretraining reference corpus).
- **Models trained from scratch:** Chronos-T5-Mini and Moirai-Small, matched training budgets per corpus.
- **Evaluation:** zero-shot on 28-dataset GIFT-Eval → 97 dataset–horizon tasks; normalized CRPS and normalized MASE (geometric means; normalized vs. seasonal naive).

## 3. Method / model
- **Design:** fix corpus size (1M×1024) and training budget; vary only the generator (11 single-generator corpora) or the mixture (Mixed11, real+synthetic ratios); train both architectures from scratch on each; compare zero-shot GIFT-Eval.
- **Statistics:** paired bootstrap over the 97 dataset–horizon tasks as resampling units.
- Code: https://github.com/birla-ai-labs/mix-dont-pick.

## 4. Equations & assumptions
- Metrics: nCRPS = CRPS/CRPS_seasonal-naive; nMASE likewise; aggregated by geometric mean over 97 tasks (lower better; <1 beats naive).
- Assumptions: matched budgets make generator choice the only varying factor; GIFT-Eval zero-shot is the right target (not fine-tuned); 1024-length windows suffice to expose generator differences; real reference corpus is representative.

## 5. Features / target
Corpus-composition study; inputs are synthetic windows, targets are next-window forecasts under the TSFM's native objective. No exogenous features.

## 6. Validation design
11 single-generator corpora × 2 architectures + Mixed11 + 3 real/synthetic ratios + real-only reference; all evaluated zero-shot on GIFT-Eval (97 tasks); paired bootstrap significance.

## 7. Numerical results / baselines
- **Generator choice is first-order:** CRPS varies **1.6×** across generators for Moirai-Small and **2.1×** for Chronos-T5-Mini under identical budgets.
- **Rankings don't transfer:** KernelSynth best for Moirai-Small (CRPS 0.734 / MASE 1.049); for Chronos-T5-Mini the best single generators differ (SDE second-best; ETS catastrophic: CRPS 1.976 / MASE 2.694). Real reference: Moirai 0.814/1.149, Chronos 0.791/1.061.
- **Equal-weight mixture matches or beats the best single generator** for both architectures — "don't pick."
- **Real+synthetic is strongest overall**, but the optimal ratio is architecture-dependent.
- Table 1 (sorted by Moirai-Small CRPS): KernelSynth 0.734/1.049; ETS 0.820/1.154; Waveform 0.870/1.240; SDE 0.910/1.306; StepFunction 0.958/1.391; TSI 0.969/1.369; ARIMA 0.988/1.430; fBm 1.036/1.419; GARCH 1.055/1.466; Chaotic 1.154/1.636; TimeSynth 1.194/1.659; Real Reference 0.814/1.149.

## 8. Code / data availability
Code: https://github.com/birla-ai-labs/mix-dont-pick. Generator families are standard (TimeSynth, KernelSynth recipes documented); corpora regenerable from the released code.

## 9. Leakage & limitations
- Generic generators (fBm, chaotic systems) have no sports semantics — a GSE corpus needs sports-native families; the paper gives the *method* (matched-budget comparison), not the generators.
- 1024-length windows vs. 17-game NFL seasons: generator dynamics at sports timescales are untested.
- Real+synthetic optimal ratio is architecture-dependent → GSE must re-run the ratio sweep per backbone, not copy a number.
- GIFT-Eval has no sports datasets; zero-shot sports transfer of the mixture finding is assumed, not shown.
- 11.2B-point pool is large; GSE's synthetic sports corpus will be smaller — scaling behavior at small budgets untested.

## 10. GSE overlap
No synthetic-corpus research in the GSE corpus; the engine trains on real historical games only. This paper supplies the missing pretraining-data methodology for every sports-TSFM ledger (2122–2126): *how* to compose the synthetic half of the sports pile. Complements 2130 (SFF, the *how* of fine-tuning) — together they define the full train recipe.

## 11. GSE implementation spec
1. **Sports generator families** (design first, ~2 weeks): score-dynamic generators (Poisson/binomial play-by-play → game margins with key-number effects), possession/pacing generators, usage generators (target-share random walks), injury-shock generators (regime shifts mid-season), volatility-regime generators (weather-game variance), market-line generators (synthetic spreads with known inefficiencies for edge calibration).
2. **Matched-budget sweep:** replicate the paper's protocol — 1M windows × fixed length per family, train a small sports TSFM per family, evaluate zero-shot on held-out real NFL seasons (the GSE analog of GIFT-Eval).
3. **Mixture:** equal-weight MixedSports + real+synthetic ratio sweep per backbone (Chronos vs. Moirai separately).
4. **Deliverable:** the GSE synthetic sports corpus + the winning mixture recipe, versioned as the pretraining input for 2122–2126.
Effort: 4–6 engineer-weeks (generator design dominates).

## 12. Reproducible test
Dataset: synthetic sports corpora (per above) + real NFL 2002–2024. Protocol: replicate paper — matched budgets, train-from-scratch small backbones per corpus, zero-shot on held-out NFL seasons 2021–2024 (97-task analog: team-season–horizon tasks). Metric: normalized CRPS vs. seasonal naive; paired bootstrap over tasks. Success: MixedSports ≥ best single sports generator (replicating "don't pick") AND real+synthetic beats real-only. Leakage audit: synthetic generators must not be fit on test seasons' parameters (fit generator hyperparameters on pre-2021 only).

## 13. Acceptance / rejection gate
ADOPT the MixedSports recipe for all sports-TSFM pretraining if the mixture matches/beats the best single generator on the held-out-season sweep AND real+synthetic beats real-only; use the winning ratio per backbone (don't force one ratio); REJECT individual generator families whose single-corpus CRPS is worse than naive (they're dead weight — e.g., the paper's ETS-for-Chronos analog); REJECT the whole synthetic program if real-only beats every synthetic-inclusive corpus — then pretrain on real data only. Hard reject if generator hyperparameters were fit on test seasons.

## 14. Improvement experiment
Adversarial generator mining: after the initial sweep, fit a *new* generator family specifically to the residual errors of the MixedSports model (where does the mixture still lose to naive?) — e.g., if blowouts are the residual, add a heavy-tailed margin generator; iterate mixture → error analysis → new generator. Hypothesis: 2–3 rounds of error-driven generator design beat the static 11-family mixture, turning corpus composition into an active learning loop.
