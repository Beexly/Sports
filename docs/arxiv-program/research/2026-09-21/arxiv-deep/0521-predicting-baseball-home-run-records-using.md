# [0521] Predicting Baseball Home Run Records Using Exponential Frequency Distributions (arXiv:physics/0608228v1)

**Citation:** Kelley, D.J., Mureika, J.R., and Phillips, J.A. (2006). *Predicting Baseball Home Run Records Using Exponential Frequency Distributions*. arXiv:physics/0608228v1. URL: https://arxiv.org/abs/physics/0608228v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, ~9,211 chars).
**Verdict:** REJECT — the Gutenberg-Richter-inspired exponential-tail record model is clever but rests on unvalidated stationarity assumptions and a now-falsified prediction (Bonds's 73 HR record still stands 20 years later), with no transfer path to NFL prediction.

## 1. Research question
Can annual home-run totals in MLB be modeled as an exponential frequency distribution (inspired by the Gutenberg-Richter earthquake law), so that the tail of the full population's distribution predicts the likelihood of extreme "large event" performances — specifically, whether Barry Bonds's 73-HR single-season record will be broken and how impressive past records (Ruth 1927, Maris) are relative to their era?

## 2. Dataset / schema
- Annual individual home-run totals for MLB players, 1903–2005 (103 years), from thebaseballcube.com (public). Filter: only players with ≥100 at-bats (per Figure 1 caption, "to ensure that all players were playing under similar conditions"). Per year: frequency distribution of players hitting N home runs; exponential fit on the 95% of players with the lowest HR totals. No other schema details stated.

## 3. Method / model
- For each year, fit the lower-95% player HR counts with an exponential curve N → b·e^(−rN) (r = rate parameter, b = scale; Figure 1 caption gives the form). Extrapolate the tail: a performance's annual/all-time rarity = its deviation from the year's exponential (e.g., 2005 distribution implies 1/3 of a player hits 51 HR → Andruw Jones's 51 = once-in-3-year event; Bonds 73 (2001) = once-in-10-year event; Ruth 60 (1927) = once-in-10,000-year event).
- Record forecasting: track the exponential parameters' evolution since 1903; note the rate of change of each parameter is approximately constant since 1948; extrapolate those rates into the future. Add an "exceedance" adjustment: the top player of a year often outperforms the lower-95% prediction (attributed to financial/motivational payoffs), included in the model (mechanism not detailed).

## 4. Equations & assumptions
- Exponential frequency fit: frequency(N) ≈ b·e^(−rN) (r = rate parameter, b = scale, N = home runs) — per Figure 1 caption.
- Stated assumptions: (a) the full population's small-event frequency predicts large-event likelihood (Gutenberg-Richter analogy); (b) exponential parameters' rates of change have been ~constant since 1948 and will continue; (c) 95%-of-players cutoff separates the bulk from the elite tail; (d) ≥100 AB filter gives comparable conditions; (e) top-player exceedance beyond the lower-95% fit is a stable, includable correction.

## 5. Features / target
- Features: per-year exponential rate parameter r and scale b (population-level distributional parameters).
- Target: probability that some player hits ≥74 HR (breaks Bonds's record) within a given future window. Prediction horizon: 5 and 10 years ahead of the 2005/2006 writing date.

## 6. Validation design
- No backtesting, no train/test split, no baseline comparison reported. Validation is a single forward prediction (to be judged by events after 2006) plus face-validity checks (era-relative rarity of Ruth vs. Bonds performances). Previously applied to track & field, weightlifting, baseball (manuscript in preparation, Kelley et al. [5]) — no numbers reported here.

## 7. Numerical results / baselines
- Probability of someone hitting 74 HR within next 5 years: >50%; after 10 years: >80% (Figure 1d).
- Era-relative rarities: Bonds 73 HR (2001) = once-in-10-year event; Andruw Jones 51 HR (2005) = once-in-3-year event; Ruth 60 HR (1927) = once-in-10,000-year event ("far more impressive than that of Bonds, even though the latter hit 73").
- Distribution property: rate of change of exponential parameters approximately constant since 1948 (no numeric slope given).
- Post-hoc check (my inference, from public record): Bonds's 73 HR record still stands as of 2026 — the paper's headline prediction (>80% chance of being broken by ~2016) did NOT come true; the model failed on its own test case.

## 8. Code / data availability
None stated (no code; data source cited as thebaseballcube.com).

## 9. Leakage & limitations
- The headline prediction failed: no player has hit 74+ HR since 2006 (record still 73), directly falsifying the >50%/5-yr and >80%/10-yr claims — the exponential-parameter stationarity assumption (constant rate of change since 1948) did not hold (likely confounded by the steroid era inflating the 2001-era parameters, which the paper itself notes changed continuously without addressing cause).
- Ad hoc choices: the 95% cutoff, the ≥100 AB filter, and the top-player "exceedance" correction are asserted, not estimated or sensitivity-tested; no uncertainty on the probability estimates.
- Extrapolating a 58-year parameter trend forward is fragile to regime changes (expansion, ball/juicing changes, testing era) — classic survivorship of a trend.
- No comparison to the record-only or best-annual-performance approaches it criticizes; no null model (e.g., Poisson/EVT on record counts).
- NFL transfer: single-player season extremes in football (e.g., single-season receiving yards record) are dominated by scheme/target-concentration changes, and the population "small events" (players with few yards) are not generated by the same process as elite performances — the Gutenberg-Richter analogy is weakest where player roles are heterogeneous.

## 10. GSE overlap
- New but not useful — no duplicate. Existing research map: extreme-value/outlier modeling is essentially absent from the repo corpus (gap list items on Hawkes processes, diffusion cover related but distinct ground). The only near-overlap is the general "rare events" theme in calibration work. Still rated REJECT because the method failed its own prediction and the transfer path to NFL is absent.

## 11. GSE implementation spec
- Not recommended for implementation (REJECT). If any element were salvaged: the era-relative rarity idea (expressing a record as a "once-in-N-year event" relative to the contemporary population distribution) could appear as a content/stat graphic for GSE social posts (e.g., "a 2,000-yard rushing season in 2025 is a once-in-N-year event"), computed empirically from season-total distributions — but this is a media framing device, not a predictive model. Effort: ~0.5 day for the content framing; zero for the forecasting model.

## 12. Reproducible test
- Dataset: MLB player-season HR totals 1948–2005 (the paper's own domain), or NFL receiving-yard season totals 2000–2025 for the transfer attempt.
- Test: implement the stated method literally (per-year exponential fit on lower 95% of qualifiers; extrapolate parameter trends at 1948–2005 rates) and evaluate the predicted probability of a record being broken in 2006–2016 against the actual outcome (it did not happen → falsified). Any NFL transfer would need a pre-registered window before the same judgment.
- Baseline: naive "record broken in last 20 years" base rate (~0 for HR records 1962–2005).

## 13. Acceptance / rejection gate
- The gate is already evaluated: the paper's own forward prediction (>80% record broken within 10 years) FAILED (record intact 2026). REJECT stands unless a re-estimated version with post-2005 data produces calibrated, backtested record probabilities that beat the naive base-rate model on a held-out era — which the paper never attempted.

## 14. Improvement experiment
- Replace the ad-hoc exponential extrapolation with proper extreme value theory (GEV/GP fit to annual maxima or peaks-over-threshold) with a backtest: fit on 1903–1985, predict record probabilities for 1986–2005, and compare calibration to the paper's approach; include a regime-change indicator (pre/post-1994 expansion & testing era) instead of the blind constant-rate extrapolation — the falsified prediction is the natural test bed for whether EVT survives where the exponential-Gutenberg analogy did not.
