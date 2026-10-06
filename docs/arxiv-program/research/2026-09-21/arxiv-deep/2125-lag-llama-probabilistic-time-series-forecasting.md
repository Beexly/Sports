# [2125] Lag-Llama: Towards Foundation Models for Probabilistic Time Series Forecasting (arXiv:2310.08278v1)

**Citation:** Kashif Rasul, Arjun Ashok, Andrew Robert Williams, Hena Ghonia, Rishika Bhagwatkar, Arian Khorasani, Mohammad Javad Darvishi Bayazi, George Adamopoulos, Roland Riachi, Nadhir Hassen, Marin Bilos, Achille Nazaret, Yusuf Roohani, Marc Rußwurm, Nadine Schneider, Colleen Gillon, Bryan Rumbo, Felipe Hoffa, Andrey Kan, Zhiguang Wang, Aaron Courville, Omar Chapelle, Dmitriy Simakov, Joumana Ghosn, Irwan Bello, Sercan Arik, Akshay Garg, Tim Januschowski, Yuriy Nevmyvaka (2023). *Lag-Llama: Towards Foundation Models for Probabilistic Time Series Forecasting*. arXiv:2310.08278v1. URL: https://arxiv.org/abs/2310.08278
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML). Lane: `timeseries_foundation`.
**Verdict:** ADAPT — lag-based covariates plus a Student-t head make this the most sports-shaped of the univariate TSFMs (weekly lags are natural for NFL), but it needs fine-tuning to be competitive, so the GSE use is as a lag-covariate recipe inside a larger sports model, not a standalone zero-shot deployment.

## 1. Research question
Can a decoder-only transformer that uses explicit lag covariates and date-time features, trained on a diverse multi-domain corpus, serve as a probabilistic time-series foundation model — with zero-shot, few-shot, and fine-tuned adaptation?

## 2. Dataset / schema
- **Pretraining corpus:** 27 datasets across 6 domains (energy, transportation, economics, nature, air quality, cloud operations), 7,965 univariate series, ~352M windows (tokens) of training data. Public datasets, preprocessed into a unified format.
- **Evaluation:** held-out datasets unseen during pretraining; standard probabilistic-forecasting protocol (context/prediction splits per dataset). Public.

## 3. Method / model
- **Input construction:** at each time step, build a feature vector of **lagged values** (lags chosen per frequency: e.g., for hourly data, lags at 1, 2, …, 7, 24, 48, …) plus **date-time features** (second-of-minute, …, day-of-week, week-of-year, etc., encoded appropriately).
- **Architecture:** vanilla decoder-only transformer (causal) over the lag-covariate sequence; final model selected after a **100-configuration hyperparameter search**, with **2,449,299 parameters**.
- **Output head:** Student's-t distribution head — predicts degrees of freedom ν, mean μ, scale σ per forecast step; trained with **negative log-likelihood** of the Student-t. Heavy-tailed head gives robustness to extreme observations.
- **Adaptation modes:** zero-shot (frozen), few-shot (a few gradient steps on target history), full fine-tuning.

## 4. Equations & assumptions
- Lag feature vector: x_t = [y_{t−l_1}, y_{t−l_2}, …, y_{t−l_k}, dtf_t] for lag set L per frequency.
- Head: (ν_t, μ_t, σ_t) = head(h_t); likelihood p(y_t) = StudentT(y_t; ν_t, μ_t, σ_t).
- Objective: minimize Σ_t −log StudentT(y_{C+t}; ν_{C+t}, μ_{C+t}, σ_{C+t}) over prediction horizon.
- Metrics: CRPS of the predictive distribution; point metrics from the median.
- Assumptions: lag set must be hand-specified per frequency (weekly NFL → lags at 1, 2, 4, 8, 16 games); Student-t tails approximate real extreme-value behavior; date-time features carry seasonality (weak in sports — bye weeks, rest days are not calendar-periodic).

## 5. Features / target
Input: lagged target values + calendar/date-time features. Target: predictive Student-t distribution parameters per future step. Probabilistic by construction; CRPS-native.

## 6. Validation design
Zero-shot on unseen datasets: average rank across datasets **6.714**. Fine-tuned: average rank **2.786**, ~2 rank points better than the best supervised baseline, **SOTA on 3 datasets**. Few-shot intermediate. Baselines: DeepAR, PatchTST, TFT, N-BEATS, ETS-family, seasonal naive. CRPS primary; point metrics secondary. Hyperparameter search of 100 configs for the final model (architecture fixed thereafter).

## 7. Numerical results / baselines
- Zero-shot mean rank: **6.714** (competitive but not leading — supervised models ahead).
- Fine-tuned mean rank: **2.786** — best on average, SOTA on 3 individual datasets.
- Key message: lags + date-time + Student-t gets a 2.4M-parameter model to near-SOTA after fine-tuning; zero-shot is decent but not the headline.

## 8. Code / data availability
Code: Time-Series-Library style implementation referenced in paper; model weights and training code released (GluonTS ecosystem — `lag-llama` in GluonTS). Datasets: public (list in appendix). Reproducibility: hyperparameter search space documented.

## 9. Leakage & limitations
- Lag sets are hand-designed per frequency — the "foundation" generality is weaker than claimed; weekly sports lags must be re-engineered.
- Date-time features are near-useless for sports (no daily/weekly seasonality in game outcomes; rest-day effects are not calendar-cyclical) — the covariate channel must be replaced with sports-native features (rest days, travel, opponent strength).
- Student-t is univariate and symmetric-ish in practice; NFL margins have skew/key-number effects the t-distribution can't express.
- 2.4M params is small; capacity may underfit a rich sports corpus.
- Zero-shot rank 6.7 means: do not deploy frozen for sports; fine-tuning is mandatory.

## 10. GSE overlap
No Lag-Llama/TSFM in GSE corpus (same grep). GSE engine currently builds features by hand; the lag-covariate recipe is a formalization of what lag features *should* look like for a pretrained model, and the Student-t NLL training is directly relevant to GSE's need for heavy-tailed predictive distributions (blowouts, key-number landings). Complements Chronos (token-based) with a continuous-likelihood alternative.

## 11. GSE implementation spec
1. **Recipe adoption:** implement the lag-covariate constructor for weekly sports: lags {1,2,3,4,8,16} games for margins/totals/usage, plus sports-native covariates: rest-day differential, travel distance, dome/outdoor, opponent rolling EPA, line movement — replacing date-time features.
2. **Model:** decoder-only transformer, ~2–10M params (scale up from 2.4M), Student-t head; pretrain on the sports pile (2124), fine-tune per season/task.
3. **Head upgrade path:** replace Student-t with a mixture or quantile head in v2 for key-number effects; keep t-head as the calibrated baseline.
4. **Serving:** per-game-step NLL/CRPS evaluation; distributions feed the same pricing layer as Chronos paths.
Effort: 2–3 engineer-weeks (smaller than a full foundation-model build).

## 12. Reproducible test
Dataset: NFL team margins 2002–2024, weekly lags. Test: 2021–2024 walk-forward; forecast next game margin distribution per team. Metric: CRPS of Student-t forecast vs. DeepAR-style baseline and vs. GSE engine. Baselines: seasonal naive (CRPS=1.0 normalized), Chronos fine-tuned (2123). Success: CRPS ≤ 0.92× naive AND beats the 2123 variant or loses by <1% (recipe comparison). Leakage audit: lags strictly from past games; no future-season data in fine-tune windows.

## 13. Acceptance / rejection gate
ADOPT the lag-covariate recipe if the sports Lag-Llama variant's CRPS beats seasonal naive by ≥8% on 2021–2024 AND its 80% prediction intervals are calibrated within ±4 pts; ADAPT further (head/covariate upgrades) if it beats naive but misses calibration; REJECT the frozen/zero-shot variant for any live use (paper's own rank 6.7 forbids it). Hard reject if interval coverage deviates >8 pts (miscalibrated tails are worse than no model for bet sizing).

## 14. Improvement experiment
Sports-native covariate swap: keep the architecture fixed and compare three input recipes — (a) paper's lags + date-time, (b) sports lags + rest/travel/weather/opponent covariates, (c) (b) + market line as a covariate — measuring CRPS deltas. Hypothesis: (b) >> (a), and (c) tests how much signal the market already contains; the residual (b)−(c) gap is the model's edge over the line, directly quantifying GSE's forecasting alpha.
