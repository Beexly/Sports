# [1709] Cyber-Physical System for Energy Efficient Stadium Operation: Methodology and Experimental Validation (arXiv:1807.05059)

**Citation:** Schmidt, M. et al. (NEC Laboratories Europe, 2018). *Cyber-Physical System for Energy Efficient Stadium Operation: Methodology and Experimental Validation*. arXiv:1807.05059. URL: https://arxiv.org/abs/1807.05059
**Ledger completed:** 2026-09-22. **Read:** full text (arXiv source, Sections 1–5.3 + abstract/conclusions skimmed, ~100k chars).
**Verdict**: ADAPT
ADAPT — one sentence: the heating-degree-day (HDD) weather-normalization technique with median-based bootstrap inference is a portable, principled way for GSE to compare team/stadium performance across different weather regimes (before/after, across seasons), and the finding that air temperature dominates soil temperature while solar/wind/precipitation are minor is direct feature-selection evidence — but the CPS/control-strategy machinery itself does not transfer.

## 1. Research question
Can a data-driven cyber-physical system controlling a soccer stadium's under-soil grass heating cut energy use while keeping grass-root temperatures in the agronomic target band? (Commerzbank Arena, Frankfurt; winters 2013/14–2015/16.)

## 2. Dataset / schema
BMS data at 10-min resolution since Aug 2013 (~13,500 variables; relevant: T_root at 15 cm depth, T_external, supply set-point T_Gset, heating indicator HDI, energy Q_grass); Frankfurt airport weather forecasts; heating/cooling events defined by 6 h uniform histories (87 activation events under strict definition).

## 3. Method / model
Seven control strategies (reactive → predictive → context-aware); weather normalization via heating degree days; inference on medians with bootstrap CIs; MLP vs Deep Belief Network for 6-hour T_root trajectory prediction (36 steps), with/without perfect weather forecast, 5-fold CV, grid-searched hyperparameters.

## 4. Equations & assumptions
- HDD = max(T_HDD,base − T̄_external, 0), T_HDD,base = **7°C** (German standard; equals the system's activation threshold); Q_grass,HDD7 = Q_grass/HDD; zero-HDD days excluded.
- Medians (not means) for robustness; Student-t CIs when Shapiro-Wilk passes, else bootstrap percentile with 10,000 replicates.
- Under-Performance Ratio (UPR) = fraction of time T_root below minimum.
- Assumes daily-mean-temp HDD represents the relevant thermal forcing given soil thermal inertia; event-independence via 6 h cooling/heating histories.

## 5. Features / target
Predictors: T_root history (36 lags), T_external, HDI, T_Gset (+ forecast T_external). Targets: 36-step ΔT_root trajectory; per-event energy.

## 6. Validation design
Three-winter live experiments vs 2013/14 status-quo baseline (795 MWh); weather-normalized medians with 95% CIs; pairwise strategy differences inferred; expert spot-checks of pitch quality; grid search on test set for model selection.

## 7. Numerical results / baselines
- **66% savings** of median daily weather-normalized energy (95% CI) in winter 2014/15 → **775 MWh / 148 t CO₂** per average heating season; predictive nighttime heating at lowered target band reached **85%** → **1 GWh / 197 t CO₂** in 2015/16, with target temperatures still met.
- Grass heating consumed up to **50%** of the arena's peak thermal supply (the bottleneck motivating the work).
- DBN beat MLP by < 0.1 K; best 6-hour point RMSE **0.4 K** with uniform cooling history; weather-forecast input gave only small gains (delayed T_external impact on soil).
- Prior literature: daily-mean air temperature is the **dominant** met variable for soil temperature; solar radiation, humidity, wind, precipitation play minor roles.
- Target bands: 12–14°C (2014/15, 2 K safety margin) → 10–12°C (2015/16).

## 8. Code / data availability
Python/Theano implementations described, not shared; BMS data proprietary; no public dataset.

## 9. Leakage & limitations
Hyperparameters grid-searched "on the test set" (test-set tuning); single stadium; no soil-humidity sensing; energy-regression on events unsatisfactory (omitted); HDD base-temperature choice is use-case-specific and degree-day stats are fragile near the threshold (authors' own warning).

## 10. GSE overlap
No other ledger uses degree-day normalization or median-based bootstrap inference for weather comparisons. Complements 1699 (humidor before/after): 1699 did a raw before/after, this paper gives the *normalization machinery* for fair before/after across weather regimes. The control-strategy/CPS content has no GSE counterpart and is not transferred.

## 11. GSE implementation spec
Add `weather/normalize.py`: (a) define GSE weather-severity indices analogous to HDD — e.g., Cold-Degree-Days below 40°F, Wind-Exposure = Σ max(wind−12,0), Precip-Flag days — computed per game from the vendor feed (1708); (b) when comparing team efficiency metrics across seasons or before/after a change (rule, coordinator, stadium), report **weather-normalized medians with bootstrap 95% CIs** (10k replicates, percentile method) instead of raw means; (c) feature-selection rule for surface/field-condition models: lead with air temperature, treat solar/humidity/wind/precip as secondary per the paper's evidence. Effort: ~1–2 days.

## 12. Reproducible test
Dataset: 2020–2024 NFL team offensive EPA/game with game-day weather. Compute raw vs cold-degree-day-normalized EPA medians per team-season; bootstrap 95% CIs. Expectation: normalization shrinks apparent "cold-weather team" effects and narrows CIs vs raw means; teams whose ranking moves ≥ 3 places under normalization are flagged as weather-artifacts in current ratings.

## 13. Acceptance / rejection gate
ADOPT weather-normalized medians in the team-rating pipeline if normalization changes ≥ 10% of team-season EPA rankings by ≥ 2 places (i.e., weather confounding is material) AND bootstrap CIs are tighter than raw-mean CIs on average. REJECT if rankings barely move — then the added machinery isn't worth it. Never adopt the paper's control-strategy content.

## 14. Improvement experiment
Combine with 1703 (lagged precipitation effects): build a weather-normalized EPA+ metric where each game's EPA is divided by a fitted weather-severity index (cold + wind + precip terms, coefficients from 1703-style mixed model), then test whether weather-normalized EPA predicts next-game spread cover better than raw EPA (2024 holdout, logistic regression). Hypothesis: normalized EPA adds 1–2 pp accuracy on outdoor games because it strips weather noise from the team-strength signal. Success = statistically significant likelihood-ratio improvement; failure keeps raw EPA and records that weather normalization doesn't survive contact with NFL data.

**Verdict:** ADAPT — the HDD weather-normalization + median-bootstrap inference recipe ports to fair cross-weather performance comparisons, and the air-temp-dominance finding guides feature selection; the CPS control content does not transfer.
