# [1309] A Bayesian circular mixed-effects model for explaining variability in directional movement in American football (arXiv:2507.06122)

**Citation:** Nguyen, Q. & Yurko, R. (2025). *A Bayesian circular mixed-effects model for explaining variability in directional movement in American football*. arXiv:2507.06122. URL: https://arxiv.org/abs/2507.06122
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — new Bayesian circular-statistics capability for NFL tracking data; player turn-angle-variability random effects transfer directly to YAC / broken-tackle / evasion modeling in the GSE fantasy and engine pipelines.

## 1. Research question
How can in-game change-of-direction ability be objectively evaluated in American football? The paper proposes a Bayesian mixed-effects model of frame-level turn angles (angular deviation between consecutive displacement vectors) for NFL ball carriers, with primary interest in turn-angle *variability* (the von Mises concentration parameter κ), and uses it to identify the "shiftiest" ball carriers with full uncertainty quantification.

## 2. Dataset / schema
NFL Big Data Bowl 2025 tracking data (Kaggle: https://www.kaggle.com/competitions/nfl-big-data-bowl-2025/data), first 9 weeks of the 2022 NFL regular season: 9,480 plays across 136 games, ball-carrier sequences only (frames between handoff-to-end-of-play for runs; catch-to-end-of-play for passes). 5,431 rushing attempts (all RB), 4,049 pass plays (2,074 WR / 1,061 RB / 914 TE as ball carrier after the catch). Attributes per frame at 10 Hz: x, y coordinates, speed, acceleration, distance, orientation, direction, event tags. 40-yard dash combine times via nflreadr for the speed-and-turn analysis.

## 3. Method / model
Frame-level turn angle φ_ijt (change in bearing between successive [t−1,t] and [t,t+1] intervals) modeled as von Mises(μ_ijt, κ_ijt). Both mean and concentration are modeled with fixed effects: μ via a tan-half link on tracking/contextual covariates (including previous-frame turn angle for directional persistence); κ via a log link on speed, acceleration, cumulative distance, play type, position, plus a **ball-carrier random intercept u_j on the concentration** with position-specific variance σ²_p[j] (RB/WR/TE). Fit with Stan via brms in R, NUTS sampler, 4 chains × 3,500 iterations (1,500 burn-in) = 8,000 posterior draws; weakly informative half-t₃ priors on variance parameters; R̂ ≈ 1, no convergence issues.

## 4. Equations & assumptions
- φ_ijt ~ vonMises(μ_ijt, κ_ijt)
- tan(μ_ijt / 2) = α₀ + x_ijtᵀ β (mean)
- log κ_ijt = γ₀ + z_ijtᵀ ψ + u_j (concentration); u_j ~ N(0, σ²_p[j])
- b_t = atan2(y_{t+1} − y_t, x_{t+1} − x_t); φ_t = b_t − b_{t−1}
- Assumptions: von Mises is adequate for turn angles; higher κ = less variability; linear fixed effects suffice; position-nested Gaussian random effects; 10 Hz sampling captures true turning; higher turn-angle variability is the *good* trait (shifty = better).

## 5. Features / target
Target: frame-level turn angle φ_ijt (radians). Mean covariates: previous turn angle, ball-carrier positional/trajectory features (speed, acceleration, distance, yards from endzone/first-down, lateral position), closest-defender features (speed, relative angle/position, distance), counts of defenders/teammates in front/left. Concentration covariates: speed, acceleration, cumulative distance, play type (run/pass), position (RB/TE/WR), player-varying intercept grouped by position.

## 6. Validation design
No train/test predictive split — descriptive Bayesian inference on the full 9-week sample; convergence diagnostics (R̂, effective sample size, trace plots). Player comparisons use posterior distributions and 95% credible intervals of concentration random effects. External sanity checks: correlation with combine 40-yard dash (r = 0.135 overall) and alignment with "eye test" (Justice Hill most variable RB, Jonathan Taylor least, DK Metcalf straight-line, George Pickens most variable WR, Kittle/Pitts/Kelce top-5 most variable TEs).

## 7. Numerical results / baselines
- Speed → higher concentration: ψ̂_s = 0.709, 95% CI [0.705, 0.713] (faster = straighter)
- Acceleration → lower concentration: ψ̂_a = −0.094, CI [−0.101, −0.087]
- Distance covered: ψ̂_dis = −0.015, CI [−0.016, −0.014]
- Run plays: ψ̂_run = 0.044, CI [0.011, 0.078]; WR: ψ̂_WR = −0.134, CI [−0.200, −0.065]; TE: ψ̂_TE = 0.064, CI [−0.021, 0.151] (overlaps 0)
- Random-effect SD: σ̂_RB = 0.135 [0.111, 0.164]; σ̂_TE = 0.300 [0.234, 0.378]; σ̂_WR = 0.304 [0.257, 0.355] — WR/TE far more heterogeneous than RB
- No overlap between 95% CIs of top vs bottom players within RB and WR — estimates discriminate reliably.

## 8. Code / data availability
Code: https://github.com/qntkhvn/turn-angle. Data: Kaggle Big Data Bowl 2025 (public).

## 9. Leakage & limitations
Descriptive, not predictive — no out-of-sample validation of player rankings, so rankings could reflect unmeasured context (scheme, box counts, defensive spacing) rather than a stable trait; 9-week sample only, no year-over-year stability analysis; ball-carrier-only sequences (no pre-catch route running, no defenders); 10 Hz may alias the fastest cuts; "variability is good" is an assumption, not an established causal link to points/EP; some random-effect posteriors include zero (TE CIs wide); the model doesn't test whether turn-angle variability predicts future performance.

## 10. GSE overlap
New capability: no existing GSE research invents a circular-statistics Bayesian model of tracking movement. Adjacent material: the 48-post NGS inventory (agility metrics exist but none model turn-angle concentration hierarchically); same authors' STRAIN pass-rush work is referenced but is pressure, not ball-carrier movement. This is an extension, not a duplicate — GSE's tracking-data pipeline gains a player-level evasion/shiftiness feature.

## 11. GSE implementation spec
Data: nflverse / Big Data Bowl tracking data (public through 2023 seasons). Build: reimplement von Mises mixed model in Stan via cmdstanpy or PyMC; fit per-season on ball-carrier sequences; extract posterior means of player concentration random effects as a per-season "shiftiness" feature; extend per the authors' note to route running (pre-catch WR sequences) and DB movement. Effort: ~2-3 days reimplementation; code exists in R/brms as reference.

## 12. Reproducible test
Fit the model on 2021-2023 nflverse/BDB tracking; compute player season-level shiftiness posteriors; regress next-season YAC per target / missed-tackle rate / broken tackles on shiftiness with controls; gate on out-of-sample R² gain.

## 13. Acceptance / rejection gate
ADOPT if adding the shiftiness feature improves out-of-sample prediction of next-season YAC/attempt or missed-tackle rate over GSE's current RB/WR feature set by ≥0.02 R² (or significant at α=0.05 in a hierarchical logistic model of broken tackles). REJECT if no stable year-over-year signal.

## 14. Improvement experiment
Jointly model turn angle and speed in a multivariate movement model (the paper models speed only as a covariate), or fit a time-varying concentration via a hidden-state (state-space) extension where a player toggles between "structured" and "improvising" regimes mid-play — regime probabilities would be a direct predictor of explosive-play probability.
