# [1708] Decision-oriented benchmarking to transform AI weather forecast access: Application to the Indian monsoon (arXiv:2602.03767)

**Citation:** Masiwal, R. et al. (2026). *Decision-oriented benchmarking to transform AI weather forecast access: Application to the Indian monsoon*. arXiv:2602.03767. URL: https://arxiv.org/abs/2602.03767
**Ledger completed:** 2026-09-22. **Read:** full text (arXiv HTML, Abstract through Discussion + Methods, ~95k chars).
**Verdict**: ADAPT
ADAPT — one sentence: the operational benchmarking protocol — decision-relevant metrics (miss rate, false alarm rate) over generic skill scores, hindcasts initialized to expose false alarms, probabilistic calibration checks, and multi-model blending when no model dominates — ports directly to how GSE selects, calibrates, and blends weather data feeds for game-day decisions, complementing ledger 1702's decision-calibration result with an operational recipe.

## 1. Research question
How should AI weather-prediction models be benchmarked so the benchmark actually informs operational adoption — here, choosing models for monsoon-onset forecasts disseminated to 38 million Indian farmers — rather than just ranking meteorological skill?

## 2. Dataset / schema
Six open AIWP models (AIFS, FuXi, FuXi-S2S, GraphCast, GenCast, NeuralGCM) + ECMWF IFS NWP; ground truth = IMD 1° rain-gauge gridded data (1901–2024); agriculturally relevant local onset index (first 5-day rainy period typical of local wet season, modified agronomic index) on 4° grid; core monsoon zone ≈ 10 grid cells; hindcasts initialized twice-weekly from early May (matching IFS S2S cadence), including pre-satellite 1965–1978 to enlarge the out-of-sample set.

## 3. Method / model
Decision-oriented operational benchmarking: (a) stakeholder-relevant index instead of generic fields; (b) deterministic metrics MAE / miss rate (MR) / false alarm rate (FAR) vs climatology baseline; (c) probabilistic metrics — Brier skill score, AUC, ranked probability skill score, reliability diagrams; (d) operational initialization exposing forecasts to false alarms and misses; (e) multi-period evaluation addressing tiny test samples.

## 4. Equations & assumptions
AIWP training loss L = ‖x_i(t+Δt) − N(x_i(t), b_i(t), θ)‖ (autoregressive rollout); onset index = first 5-day period exceeding local wet-season-typical rainfall with MOK-median constraint against false onsets; fair BSS/RPSS for unequal ensemble sizes. Assumes IMD gridded rain is ground truth; climatological mean onset is the decision-relevant baseline.

## 5. Features / target
Target: local monsoon onset date per 4° cell. Evaluation dimensions: lead time (1–15 vs 16–30 days), region, deterministic vs probabilistic skill.

## 6. Validation design
Out-of-sample across four periods (recent 2019–2024 + extended 1965–1978 + common 2004–2021); models compared against climatology with standard errors; operational 2025 season as a live out-of-sample test (early onset + 2–3-week dry pause captured by AIFS/NGCM at 3–4-week lead).

## 7. Numerical results / baselines
- Deterministic: most models beat climatology by ~**2 days MAE** at 1–15-day leads in the core monsoon zone; IFS and GenCast retain skill to ~**3 weeks** on all three deterministic metrics.
- Probabilistic: IFS ensemble + GenCast + NGCM skillful to 15 days on BSS/AUC/RPSS; IFS and NGCM positive BSS aggregated over 1–30 days.
- **All ensemble models overconfident** — reliability diagrams show predicted probabilities above observed frequencies; needs calibration/multi-model blending.
- **No single model dominates** across metrics/regions/periods → operational choice was a calibrated AIFS+NGCM blend (practical filters excluded others: real-time init capability, low total-miss rate).
- FuXi-S2S: skillful deterministic but negative BSS at 15 days — deterministic/probabilistic skill can disagree.
- Framework informed real 2025 dissemination to **38 million farmers**; models captured the anomalous early-onset-then-pause evolution weeks ahead.

## 8. Code / data availability
Open-source model weights used for hindcasts (except FuXi-S2S, public hindcasts only); IMD data public; dissemination blending algorithm in companion paper (Aitken et al.).

## 9. Leakage & limitations
Tiny test samples (one onset/year; ~6 recent out-of-sample events); some models evaluated partly in-sample (marked); ERA5-trained models verified against IMD (different source — honest but distribution-shifted); pre-1979 initial conditions less accurate; GenCast excluded from some periods on compute cost — selection partly practical, not purely skill-based.

## 10. GSE overlap
Complements ledger **1702** (decision-calibrated forecasts): 1702 proves forecast-metric rankings can disagree with decision rankings; 1708 provides the *operational protocol* for acting on that insight — which metrics (FAR/MR over MAE), how to initialize hindcasts (expose false alarms), calibration via reliability diagrams, and blending when no source dominates. No other ledger covers probabilistic forecast calibration or multi-source blending procedure.

## 11. GSE implementation spec
Build `weather/vendor_benchmark.py`: (a) define GSE's decision-relevant weather events per game (e.g., sustained wind > 15 mph, active precipitation, wind chill < 20°F, heat index > 95°F); (b) for each candidate feed/vendor, run operational-style hindcasts over 3+ seasons of game-days, scoring **miss rate and false alarm rate** on those events (not just RMSE of temperature) against station observations; (c) reliability diagrams for probabilistic feeds; (d) blend rule: no single vendor dominates all event types/regions → inverse-FAR-weighted multi-vendor consensus. Effort: ~3–4 days.

## 12. Reproducible test
Dataset: 2021–2024 NFL regular-season game-days, candidate feeds (e.g., Open-Meteo, NOAA, commercial) vs ASOS station obs at stadium coordinates. Metrics: event-MR/FAR, BSS on precipitation probability. Expectation per the paper: vendors disagree most on extremes; the blended feed wins on FAR-weighted score; at least one vendor shows overconfidence on precipitation probability.

## 13. Acceptance / rejection gate
ADOPT the blended vendor feed if it reduces game-day weather-event FAR by ≥ 20% vs the current single feed with no MR increase on 2024 holdout season. REJECT vendor-switching if the decision-metric ranking matches the RMSE ranking (then 1702's warning doesn't bite and the protocol adds no value). Always keep the reliability-diagram calibration step regardless.

## 14. Improvement experiment
Test whether decision-weighted vendor selection improves *downstream* GSE accuracy, closing the 1702→1708 loop: run the engine's spread/total picks on 2024 games twice — once with the RMSE-best feed, once with the FAR/MR-best blended feed — and compare CLV and Brier score on weather-affected games (wind > 12 mph or precip). Hypothesis: the decision-benchmarked feed wins on weather-game CLV even if its temperature RMSE is worse. Success = +1.5% CLV on the weather-game subset; that result turns two adapted papers into one validated GSE pipeline (vendor selection → decision calibration) and is worth writing up as the program's first cross-paper validation.

**Verdict:** ADAPT — the operational benchmarking protocol (decision metrics, false-alarm-exposing hindcasts, calibration, blending) ports directly to GSE's weather-feed selection and calibration, complementing 1702 with an implementable recipe.
