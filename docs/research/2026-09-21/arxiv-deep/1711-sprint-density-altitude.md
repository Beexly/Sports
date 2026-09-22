# [1711] The Effects of Temperature, Pressure, and Humidity Variations on 100 Meter Sprint Performances (arXiv:physics/0505118)

**Citation:** Mureika, J. R. (Loyola Marymount Univ., 2005). *The Effects of Temperature, Pressure, and Humidity Variations on 100 Meter Sprint Performances*. arXiv:physics/0505118. URL: https://arxiv.org/abs/physics/0505118
**Ledger completed:** 2026-09-22. **Read:** full text (arXiv source .tex, complete short proceedings paper, ~3.7k chars).
**Verdict**: ADAPT
ADAPT — one sentence: the density-altitude framework plus the quantified corrections (0.02 s for temperature alone, 0.1+ s for combined pressure/temperature/humidity extremes) give GSE a ready-made, citable air-density correction for player-speed metrics and kick/punt distance modeling that goes beyond venue elevation, complementing 1699's humidor aerodynamics.

## 1. Research question
Beyond wind and venue elevation, how much do air temperature, barometric pressure, and humidity change 100 m sprint times through aerodynamic drag?

## 2. Dataset / schema
No empirical dataset — numerical simulation study. Sprint model from Mureika (Can. J. Phys. 2001) modified with hydrodynamic drag; parameter sweep: T = 15–35°C, RH = 0–100%, P = 85–105 kPa, wind −3…+3 m/s; compared against a standard race (no wind, sea-level pressure, 25°C).

## 3. Method / model
Quasi-physical sprint model: F_drag ∝ ρ_air (v − w)² with air density computed from temperature, pressure, and humidity (not just elevation); equations numerically integrated per condition; results expressed as time corrections vs the standard race — the **density altitude** concept (hot/humid air simulates higher physical altitude).

## 4. Equations & assumptions
- F_drag ∝ ρ(T, P, RH)·(v−w)²; ρ from ideal-gas + humidity correction.
- Assumes the underlying sprint power model is correct; drag is the only weather-coupled term; standard race defined at 25°C, sea level, no wind.

## 5. Features / target
Inputs: T, P, RH, wind, physical altitude. Target: 100 m time correction (seconds).

## 6. Validation design
Internal consistency: temperature-only corrections reproduce the earlier literature result (ref [3]); extreme-bound scenarios reported; no out-of-sample empirical validation — the numbers are model-derived.

## 7. Numerical results / baselines
- **Temperature alone: 0.02 s** differential over the 15–35°C range — small; wind/altitude corrections under these conditions match the literature.
- Humidity × temperature combined matters more (hot saturated air much less dense than cold dry air).
- **Combined extremes: 0.1+ s** variation between 85 kPa/100% RH/35°C and 105 kPa/0%/15°C — *after* wind correction. Non-negligible for "equivalent" performances at the same venue/altitude under different atmospheres.
- Direction: heat/humidity → higher density altitude → less drag → faster times (same as physical altitude effect).

## 8. Code / data availability
No code; model equations referenced to prior publications; fully reproducible in principle.

## 9. Leakage & limitations
Short proceedings paper; purely simulated (no race data fitted); 0.02 s figure is within real-world timing/measurement noise for single races; assumes drag is the only T/P/RH pathway (ignores physiology — heat effects on the athlete, which dominate in reality for endurance); wind range limited to ±3 m/s.

## 10. GSE overlap
Complements **1699** (humidor baseball aerodynamics): 1699 measured ball-level density effects; this gives the **athlete-level** drag correction and the density-altitude construct. No other ledger quantifies T/P/RH → air-density → speed effects. Together they cover both sides of air-density physics (ball and body).

## 11. GSE implementation spec
Add `weather/density_altitude.py`: (a) compute density altitude from game-day T/P/RH at each stadium (standard atmosphere formulas); (b) apply as a correction feature to NGS player-speed metrics (top speed, acceleration) before cross-game comparison — the paper's 0.02 s/100 m scale sets the prior on effect size (~0.2%); (c) feed density altitude into the kick/punt distance model alongside wind (kicks are the highest-leverage air-density application in football). Effort: ~1 day.

## 12. Reproducible test
Dataset: 2023–2024 NFL NGS ball-carrier top speeds + game-day T/P/RH. Test: regress top speed on density altitude controlling for player and play type. Expectation per the paper: small positive effect (higher density altitude → marginally higher speeds), on the order of 0.1–0.3% — detectable only in aggregate, not per-play.

## 13. Acceptance / rejection gate
ADOPT the density-altitude feature if it is statistically significant with the correct sign in the NGS regression AND improves kick-distance model RMSE on 2024 holdout (kicks are where the physics bites hardest). REJECT for player-speed use if the effect is indistinguishable from noise — but keep it for the kicking model, where projectile physics (cf. 1712) makes the prior stronger.

## 14. Improvement experiment
Close the loop with 1699: build a unified air-density module computing ρ(T, P, RH) once per game, feeding (a) the ball-flight model (kick/punt distance, 1699-style aerodynamics), (b) the athlete-drag correction (this paper), and (c) the ball-restitution model (1712). Test whether the unified module's predicted kick-distance adjustments beat a wind-only baseline on 2024 outdoor kicks. Hypothesis: the full ρ treatment adds 1–3 yards of explanatory power on extreme-temperature games (e.g., Denver in January vs Miami in September). Success = lower RMSE than wind-only; this becomes GSE's canonical pre-game weather→physics adjustment, citing all three papers as its foundation.

**Verdict:** ADAPT — density-altitude corrections and quantified T/P/RH effect sizes port to GSE's player-speed normalization and kicking models, completing the air-density trilogy with 1699 and 1712.
