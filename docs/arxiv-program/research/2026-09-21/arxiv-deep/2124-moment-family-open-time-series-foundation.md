# [2124] MOMENT: A Family of Open Time-series Foundation Models (arXiv:2402.03885v2)

**Citation:** Mononito Goswami, Konrad Szafer, Arjun Choudhry, Yifu Cai, Shuo Li, Artur Dubrawski (2024). *MOMENT: A Family of Open Time-series Foundation Models*. arXiv:2402.03885v2. URL: https://arxiv.org/abs/2402.03885
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML). Lane: `timeseries_foundation`.
**Verdict:** ADAPT — the open, encoder-only masked-pretraining design (plus the Time Series Pile data recipe) is the right template for a GSE sports model, but its evaluation is point-forecast oriented and the sports corpus must be built from scratch.

## 1. Research question
Can an open, encoder-only time-series foundation model pretrained with a masked-prediction objective on a large, diverse public corpus match task-specific models across forecasting, classification, anomaly detection, and imputation?

## 2. Dataset / schema
- **Time Series Pile** (public release): multi-domain pretraining corpus aggregated from the Monash forecasting archive, TSB-UAD anomaly archive, UCR/UEA classification archives, and the Informer benchmark — "the largest public collection of time series data for model pre-training," spanning long-horizon forecasting, anomaly detection, classification, and imputation. Long-horizon subset: 25,959,994 observations over 1,247 series; classification subset: 634,084,943 observations over 290,226 series. Public.
- **Evaluation:** long-horizon forecasting (ETTm2/ETTh2/Electricity/Weather/Traffic-style datasets from the Informer suite, horizons 96/192/336/720), short-horizon (M4), classification (UCR), anomaly detection (UCR anomaly/TSB-UAD), imputation (masked-input reconstruction).

## 3. Method / model
- **Architecture:** encoder-only T5-style transformer with patching (fixed input length 512, patch length 8, stride 8 → 64 tokens); **reversible instance normalization (RevIN)** applied to the raw signal before patching; channel-independent handling of multivariate series (each channel treated independently); random patch masking during pretraining.
- **Pretraining objective:** masked time-series prediction — reconstruct randomly masked patches from context (denoising/autoencoding objective rather than next-token prediction).
- **Sizes:** MOMENT-small 40M, MOMENT-base 125M, MOMENT-large 385M parameters.
- **Downstream adaptation:** (i) linear probing (frozen encoder + linear head), (ii) fine-tuning (all weights), (iii) zero-shot via a forecasting head on the pretrained encoder.
- **Multi-task heads:** forecasting head (linear decoder), classification head, anomaly head (reconstruction error), imputation head.

## 4. Equations & assumptions
- RevIN normalization: x̃ = (x − μ)/σ per instance, reversible at output.
- Masked pretraining loss: MSE over masked patches only, L = (1/|M|)Σ_{j∈M} ||ŷ_j − y_j||².
- Forecasting fine-tuning: standard MSE on future window.
- Assumptions: patch-level masked reconstruction learns transferable temporal structure; channel independence (no cross-channel attention) — multivariate correlations must be re-learned by heads; fixed 512 input length requires resampling/interpolation of shorter series (e.g., 17-game NFL seasons get upsampled).

## 5. Features / target
Input: univariate (or channel-independent multivariate) series, fixed length 512. Targets vary by task: future values (forecasting), class label (classification), reconstruction error score (anomaly), missing values (imputation). No exogenous covariates in the pretrained backbone.

## 6. Validation design
Long-horizon forecasting: standard Informer protocol (context 512, horizons 96/192/336/720, MSE/MAE). Baselines: state-of-the-art task-specific (TimesNet, N-HiTS, N-BEATS, Informer/Autoformer/FEDformer family, PatchTST), statistical (NPTS, ARIMA). Classification: UCR benchmark. Anomaly detection: TSB-UAD. Modes: zero-shot, linear probe, full fine-tune.

## 7. Numerical results / baselines
- Long-horizon forecasting: MOMENT-large competitive with TimesNet/PatchTST across horizons; within top ranks on MSE/MAE tables. (Exact per-dataset numbers live in the paper's result tables; headline: encoder-only masked pretraining matches supervised SOTA without per-dataset architecture tuning.)
- Zero-shot forecasting head: non-trivial transfer, below fine-tuned performance (expected).
- Classification/anomaly/imputation: pretrained encoder transfers across all four tasks with linear probes — the "one backbone, many heads" claim.
- Fine-tuning vs. linear probing: full fine-tune generally best for forecasting; linear probe suffices for classification.
- Ablation: removing RevIN or random masking degrades transfer; larger models (385M) better than 40M on forecasting.

## 8. Code / data availability
Claimed open: "MOMENT" repository (github.com/mononito/MOMENT) with model weights for small/base/large, the Time Series Pile, and downstream scripts. Data: all constituent archives public (Monash, UCR/UEA, TSB-UAD, Informer). (Verify repo/weights live at implementation time.)

## 9. Leakage & limitations
- Fixed 512-length input: NFL sequences (17 games) need upsampling/padding — wastes capacity and distorts the temporal scale the model learned.
- Channel-independent: cannot learn cross-series structure (QB EPA ↔ WR usage ↔ team margin) without a new attention mechanism — a real gap for sports.
- Point-forecast metrics (MSE/MAE) dominate evaluation; no calibrated uncertainty — GSE needs distributions.
- Masked-reconstruction pretraining is weaker than autoregressive objectives for multi-step forecasting in some ablations (paper's own comparison).
- Pretraining corpora are general time series (energy, traffic, UCR) — no sports sequences; domain transfer to NFL margins unproven.
- Reported results are relative rankings/tables; reproduction needs the released Pile + weights.

## 10. GSE overlap
No MOMENT/TSFM entries in the GSE corpus (same repo-wide grep as 2122/2123 — only unrelated "momentum" hits). GSE's engine has no encoder-pretrained sequence backbone; its closest analogs are the handcrafted rating/stat features and Mimo's calibration lane. The Time Series Pile recipe (aggregating heterogeneous public series into one pretraining corpus) is directly reusable for a sports pile — this is a data-recipe contribution, not a duplicate.

## 11. GSE implementation spec
1. **Data recipe:** build a "Sports Time Series Pile": NFL/NCAA team margins + totals (2002–2024), player weekly usage/fantasy points, NGS-derived team metrics, odds-line histories — all normalized to fixed windows, released internally as the GSE pretraining corpus.
2. **Model:** MOMENT-style encoder, patched, RevIN, masked pretraining on the sports pile (base size 125M is a sane start); forecasting + classification (injury-out? regime-shift?) heads on one backbone.
3. **Adaptation:** fine-tune per task (spread/total/prop) on expanding seasonal windows; linear-probe ablations to measure what pretraining adds.
4. **Timeline:** corpus 2–3 weeks; pretraining on 1–2 GPUs days; heads + evaluation 1–2 weeks.
Effort: ~5–7 engineer-weeks end to end.

## 12. Reproducible test
Dataset: sports pile (NFL margins/totals 2002–2024). Test: walk-forward 2021–2024, context 512 resampled from up to 64 prior games per team, horizon 4 games. Metric: MSE/MAE of margin forecast vs. N-BEATS and vs. GSE engine. Success = fine-tuned MOMENT-base beats N-BEATS MSE by ≥2% in both 2022–2023 and 2023–2024. Leakage audit: pretraining windows strictly pre-test-season; no team-season appears in both.

## 13. Acceptance / rejection gate
ADOPT the sports-MOMENT backbone if it beats the N-BEATS baseline on the two-season holdout with ≥2% MSE gain AND the masked-pretraining ablation (no pretraining → same architecture) shows pretraining contributes ≥1 pt of that gain (else the gain is just architecture, and a simpler model ships); REJECT for live use if fine-tuned MAE does not beat GSE's current engine margin MAE. Hard reject on any pretraining-window leakage into test seasons.

## 14. Improvement experiment
Cross-channel attention probe: MOMENT's channel-independence is its biggest sports weakness (QB↔WR↔team correlations). Pretrain a variant with cross-variate attention over grouped series (team margin + total + QB EPA as one multivariate patch set) and test whether the multivariate variant beats channel-independent on same-team multi-target forecasting — measuring exactly how much sports structure the independence assumption leaves on the table.
