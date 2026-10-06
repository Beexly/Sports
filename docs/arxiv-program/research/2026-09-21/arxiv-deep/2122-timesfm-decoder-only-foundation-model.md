# [2122] A decoder-only foundation model for time-series forecasting (arXiv:2310.10688v2)

**Citation:** Abhimanyu Das, Weihao Kong, Rajat Sen, Yichen Zhou (2024). *A decoder-only foundation model for time-series forecasting*. arXiv:2310.10688v2. URL: https://arxiv.org/abs/2310.10688
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML). Lane: `timeseries_foundation`.
**Verdict:** ADAPT — the decoder-only patch architecture is the canonical design to copy for a GSE sports-sequence foundation model, but it is point-forecasting only and needs a probabilistic head plus a sports-specific pretraining corpus to be GSE-usable.

## 1. Research question
Can a single pretrained time-series model trained on a massive corpus learn temporal patterns useful for forecasting on previously unseen datasets, i.e., achieve zero-shot forecasting performance close to state-of-the-art supervised models trained per dataset?

## 2. Dataset / schema
- **Pretraining corpus (O(100B) timepoints):** (a) Google Trends: ~22k head queries, hourly (Jan 2018–Dec 2019) and daily/weekly/monthly (Jan 2007–Dec 2021), ~0.5B timepoints; (b) Wiki pageviews: hourly Jan 2012–Nov 2023, aggregated to hourly/daily/weekly/monthly, filtered for excessive zeros, ~300B timepoints; (c) Synthetic: 3M series of length 2048 from ARMA generators, seasonal mixtures of sines/cosines, linear/exponential trends with change-points, step functions, and additive combinations; (d) M4 (~100k series, all granularities), hourly + 15-min Electricity, hourly Traffic, 10-min Weather datasets. Public; Trends via trends.google.com, pageviews via wikimedia.org API.
- **Zero-shot evaluation (held out from pretraining):** Monash archive (18 datasets, minutes-to-yearly granularities; finance, demand, weather, traffic), Darts (8 univariate series with seasonalities and additive/multiplicative trends), Informer ETT (ETTm1, ETTm2, ETTh1, ETTh2 electricity transformer temperatures). Public.

## 3. Method / model
TimesFM: decoder-only transformer with input patching. Pipeline per time series: break into contiguous non-overlapping patches of size `input_patch_len` p=32; each patch passed through an InputResidualBlock (MLP with one hidden layer + skip connection) to `model_dim` tokens, plus sinusoidal positional encodings and a padding mask m. Tokens pass through n_l stacked causal multi-head self-attention + FFN layers. An OutputResidualBlock maps each output token o_j to a prediction of the next `output_patch_len` h=128 points: ŷ_{pj+1:pj+h} = OutputResidualBlock(o_j). Inference is autoregressive over output patches (fewer steps than input patching would require). Random patch masking during training: sample r ∈ [0, p−1], mask first r points of the first patch, exposing all context lengths 1..512. Model sizes: 200M (20 layers, dim 1280, 16 heads, dropout 0.2), 70M (10 layers, dim 1024), 17M (10 layers, dim 512); output patch 128, input patch 32 for all. Training: standard minibatch gradient descent, decoder-only (predict next patch from all past patches in parallel). Training cost: 16 TPUv5e for 2 days (200M model).

## 4. Equations & assumptions
- Forecast map: f: y_{1:L} → ŷ_{L+1:L+H} (Eq. 1).
- Input token: t_j = InputResidualBlock(ỹ_j ⊙ (1−m̃_j)) + PE_j (Eq. 2), where ỹ_j = y_{p(j−1)+1:pj}.
- Output: o_j = StackedTransformer((t_1, ṁ_1), …, (t_j, ṁ_j)) (Eq. 3), causal; ṁ_j = min{m_{p(j−1)+1:pj}}.
- Prediction: ŷ_{pj+1:pj+h} = OutputResidualBlock(o_j) (Eq. 4).
- TrainLoss = (1/N) Σ_j MSE(ŷ_{pj+1:pj+h}, y_{pj+1:pj+h}) (Eq. 5).
- Assumptions: univariate only; no dataset-specific static or dynamic covariates (except possibly date-derived features, Appendix A.7); patch tokens are exchangeable within a series; MSE implies Gaussian point-forecast noise.

## 5. Features / target
Input: raw univariate time series y_{1:L} (patches of 32). Target: future values ŷ_{L+1:L+H}, horizon variable at inference (autoregressive decoding over 128-length output patches). Point forecasts only in this work (quantile heads / distribution logits suggested as future work).

## 6. Validation design
Zero-shot on held-out Monash (18 datasets; scaled MAE normalized per dataset by naive last-value baseline; aggregated by geometric mean per Fleming & Wallace 1986, arithmetic mean in appendix), Darts (8 datasets, official MAE per dataset), Informer ETT (last test window, horizons 96 and 192, context 512, averaged MAE over 8 tasks on standardized data). Baselines: N-BEATS, DeepAR, CatBoost, WaveNet, ETS, ARIMA, seasonal ARIMA, TCN, N-HiTS, PatchTST, FEDFormer, Autoformer, Informer, llmtime (GPT-3.5-Turbo prompted, zero-shot), naive. Ablations: model size (17M/70M/200M FLOPS curve), output patch length, input patch length, synthetic-data inclusion.

## 7. Numerical results / baselines
- Monash (scaled MAE, geometric mean): TimesFM best overall; slightly better but within significance of N-BEATS; outperforms supervised DeepAR; **improves on llmtime (GPT-3.5) by more than 25%**.
- Darts (8 series): TimesFM within statistical significance of best models (llmtime, seasonal ARIMA); standard errors not sharp (n=8); seasonal ARIMA required manual seasonality encoding.
- Informer ETT (4 datasets × 2 horizons): TimesFM best; supervised PatchTST within significance; other long-horizon methods "quite a bit worse".
- Ablations: performance improves monotonically with model size/FLOPS; synthetic data addition helps (Fig 3d, average scaled MAE down both for Monash and ETT).
- All figures carry one-standard-error bars; no raw numbers quoted in text beyond ">25%" improvement over llmtime. (Paper claims are qualitative relative rankings, not absolute metric tables.)

## 8. Code / data availability
Code availability: "we plan to do an open weights release of our model" — in the paper, only llmtime code referenced (github.com/ngruver/llmtime). Data: Trends via trends.google.com, pageviews via wikimedia.org API, M4/HuggingFace monash_tsf, Informer datasets. Not stated as single download link. (Subsequent public release exists outside this paper; not stated here.)

## 9. Leakage & limitations
- Wiki pageviews corpus runs to Nov 2023 and is "roughly 300B time-points" — this dwarfs other sources; the model's zero-shot strength on Wikipedia-like data is partly domain familiarity (cf. 2609.10357 ledger). For GSE, pretraining on public sports data with this recipe risks the same familiarity artifact.
- Evaluation contamination: paper admits Google Trends is "differentially private" but pageviews are not deduplicated against evaluation series; Monash filtering (missing-value datasets dropped) could bias toward cleaner domains.
- MSE-only training: no calibrated uncertainty — unsuitable as-is for a picks engine that must quote probabilities.
- No covariates: cannot consume weather, injuries, line movement — the GSE-critical inputs.
- Context limited to 512 points; NFL seasons are ~17 games — patching a 17-game sequence requires degenerate patch sizes; cross-season/context design needed.
- Results reported as relative rankings from figures; no absolute MAE tables in main text → hard to reproduce exact comparisons.

## 10. GSE overlap
No existing TSFM work in the GSE research corpus: repo grep over docs/research/ + AGENTS.md shows no TimesFM/Chronos/Moirai references (only an unrelated "momentum" hit in the 2026-09-17 benchmark audit). GSE's engine (v5.2.7) produces spread/moneyline/total picks from non-foundation-model machinery; calibration work (Mimo CQR lane) is conformal-based, not generative. This paper's contribution is a NEW capability: a pretrained zero-shot time-series backbone. Duplicate of nothing; extension of the benchmark lane's accuracy-comparison discipline.

## 11. GSE implementation spec
1. **Data:** Build an NFL-specific corpus: weekly team-level sequences 2002–2024 (offensive/defensive EPA per play/game, success rate, score margin, pace, injuries proxy via QB-starter flags), plus NCAA FBS game margins, plus market lines. ~50k–200k univariate windows. Supplement with the paper's synthetic recipe adapted to sports: ARMA+seasonality+trend generators calibrated to NFL margins (mean ~0, σ~13.5).
2. **Architecture:** Copy TimesFM exactly: decoder-only transformer, input patch 8 (weekly games; keep patch << context), output patch 16 (forecast ~full season half), model dim 1024, 12 layers, random masking over context lengths. Add multi-quantile output head (timesfm-2.5 style, 10 quantiles) instead of MSE — GSE needs distributions, not points.
3. **Training:** Pretrain on synthetic + NFL history; fine-tune per-season on expanding windows. Train on 1×A100-class or TPU equivalent; expect hours-days, not weeks.
4. **Serving:** Weekly batch inference Tuesday (line release) and Sunday morning (final); zero-shot for new teams/coaches; CRPS-gated rollout.
Effort: ~3–5 engineer-weeks for corpus + training harness; 1–2 weeks for quantile head + serving.

## 12. Reproducible test
Dataset: NFL games 2002–2023 (nflverse), team margin-per-game sequences. Test window: 2022–2023 seasons walk-forward, forecast next 4 games per team per week (context = all games to date that season + last 16 prior season). Metric: mean CRPS of margin distribution (from quantile head) vs naive seasonal baseline (team's rolling 16-game margin distribution). Baseline to beat: naive CRPS. Leakage audit: no games after the forecast date anywhere in pretraining windows; teams with <8 games context excluded.

## 13. Acceptance / rejection gate
ADOPT the sports-TimesFM into the engine if, on the 2022–2023 holdout, the fine-tuned quantile model achieves ≥0.005 lower mean CRPS than the naive seasonal-margin baseline AND beats it in both seasons individually; REJECT (keep researching, do not ship) if it fails either season or the gain is <0.005. Reject unconditionally if any leakage audit flag fires (future game found in a pretraining window).

## 14. Improvement experiment
Hybrid synthetic-real pretraining curriculum: pretrain on cheap synthetic sports-like series (NFL-margin ARMA family with regime shifts for coaching changes), then continue pretraining on real NFL/NCAA sequences, testing whether the paper's "synthetic helps" ablation (Fig 3d) compounds with a sports-real second stage. Hypothesis: regime-shift synthetic generators teach the model faster adaptation to new coaching staffs/QBs — the hard case for NFL forecasting.
