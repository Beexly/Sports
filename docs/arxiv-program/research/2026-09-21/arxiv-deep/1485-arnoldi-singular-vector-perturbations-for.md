# [1485] Arnoldi Singular Vector perturbations for machine learning weather prediction (arXiv:2506.22450v1)

**Citation:** Jens Winkler, Michael Denhard (2025). *Arnoldi Singular Vector perturbations for machine learning weather prediction*. arXiv:2506.22450v1 [physics.ao-ph], 13 Jun 2025. URL: https://arxiv.org/abs/2506.22450
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via arxiv.org/pdf).
**Verdict:** ADAPT

## 1. Research question
Can dynamically meaningful initial-condition perturbations for ML weather prediction (Pangu Weather) be found **without** tangent-linear/adjoint models — by an adjoint-free Arnoldi singular-vector method (A-SV) that builds a Krylov subspace purely from nonlinear forward runs?

## 2. Dataset / schema
Daily 00 UTC DWD-ICON global analyses, Dec 2024–Feb 2025, northern hemisphere latitudes > 35°. Variables: temperature, U/V wind on Pangu's 13 input pressure levels + surface (2m T, 10m U/V); total-energy (massless) measure for distances; surface pressure excluded. 24h Pangu Weather model as the forecast operator.

## 3. Method / model
- **Evolved increment**: I_{τ,x0,h}(v) = M_τ(x0 + hv) − M_τ(x0); **evolved increment matrix (EIM)**: A_{τ,x0,h} = (I(e1),…,I(en)) — linear map of local error growth from nonlinear runs, justified by local smoothness.
- **A-SV (Arnoldi)**: start from Gaussian noise; iterate M_τ on perturbed states; Gram–Schmidt orthonormalization builds Krylov basis Q (n×m) and low-dim projection H (m×m) with AQ = QH + RES; SVD of H; leading right SVs (×Q) are directions of fastest error growth. Block version (blocksize 8, Ruhe variant) parallelizes.
- Contrast with Lanczos-SV (needs tangent-linear + adjoint) and with GenCast (diffusion-based: K stochastic trajectories); A-SV runs **once** at initial time and yields a K-member ensemble from the K leading SVs.

## 4. Equations & assumptions
- Growth rate: log(‖δτ‖/‖δ0‖) = ½ log(δ0ᵀAᵀAδ0 / δ0ᵀδ0) → eigenvectors of AᵀA = right SVs of A.
- EGR/MEGR: (1/Δt)·log(‖M_t(x0+hv)−M_t(x0)‖ / ‖M_{t−Δt}(x0+hv)−M_{t−Δt}(x0)‖), averaged over runs.
- Amplitude h=500 (range guidance 100–10000; calibrate against nearby real states × [0.1, 0.6]); diagnostic: if A-SVs don't grow from t=0, h was too large. Optimization window τ = 24h = Pangu timestep.
- Assumptions: smoothness of dynamics near x0 (EIM linearity); secants approximate the flow within τ; leading Krylov modes capture relevant unstable modes even in a 96-dim subspace of ~13M variables.

## 5. Features / target
Features: full atmospheric state fields. Target: perturbation directions maximizing 24h error growth (SVs) as ensemble initial conditions.

## 6. Validation design
Case studies (14–15 Jan 2025) with spatial/cross-section plots; three-month daily runs for amplitude/MEGR statistics; comparison vs Gaussian-noise perturbations of same amplitude over 168h forecasts.

## 7. Numerical results / baselines
- Singular spectrum (96 SVs): outstanding leading SV; **somewhat less than one third** of values > 1 (growing inside Krylov subspace); tail shows blocksize-8 steps (information gain from iterations).
- SV patterns: physically sensible — near-surface temperature, upper-troposphere jet-stream winds (~75°N polar-front shift); global run concentrates perturbations in mid-latitudes, vanishes from tropics automatically.
- Growth: A-SVs grow **right from the beginning**; random perturbations are **heavily dampened by Pangu in the first 24h** (latent-space bottleneck = implicit denoiser; no "butterfly effect" in Pangu per Selz & Craig 2023), take **~4 days to recover initial amplitude**, and only organize into SV-like patterns after ~48h.
- Caveat: MEGR values small; SV growth rates similar across SVs (limited Krylov diversity); no skill-score comparison against NWP ensembles presented.

## 8. Code / data availability
A-SV pseudocode given in appendix (both standard and Ruhe block versions); Pangu Weather public; ICON analyses via DWD. No repo link stated.

## 9. Leakage & limitations
Descriptive/perturbation study, no predictive modeling → no leakage. Limitations: ensemble construction itself left to future work (need zero-mean clusters, e.g. ± pairs); amplitude tuning is heuristic; no forecast-skill validation of the resulting ensemble; "regression to the mean" smoothing affects SV ensembles as it does deterministic MLWP; 24h window limits nonlinear-growth fidelity.

## 10. GSE overlap
Weather lane (designated thin lane). Existing-research-map check: this wave's 1474 (BEEP blending) is the only other weather ledger; no ensemble-perturbation or MLWP content anywhere in the corpus. No duplication.

## 11. GSE implementation spec
`gse_weather_ensemble.py` — probabilistic game-day weather for outdoor venues:
1. Run the public Pangu Weather 24h model (10,000× cheaper than IFS per the paper) from the latest GFS/ICON analysis over the stadium region.
2. Apply A-SV (block size 8, ~12 loops, amplitude tuned per variable set) to generate K≈16 leading SV perturbations; form ± pairs for zero-mean initial conditions.
3. Roll each member to game time; extract stadium grid point: wind speed/direction, temperature, precipitation → an **ensemble distribution**, not a point forecast.
4. Feed the distribution (not the mean) into the game model: e.g., P(wind > 15 mph) adjusts totals via GSE's wind elasticity; use the full distribution to widen/narrow totals confidence — the paper's key lesson is that ML models damp extremes, so tail weather events are systematically understated by deterministic MLWP.

## 12. Reproducible test
Over one NFL season's outdoor games: compare totals-model calibration using (a) deterministic forecast, (b) A-SV ensemble mean, (c) full A-SV distribution. Test: does the ensemble spread predict totals residual variance (spread–skill relationship) and do tail-wind games show the expected totals shift?

## 13. Acceptance / rejection gate
ADAPT bar: ensemble spread must show positive spread–skill correlation on hold-out games and tail-wind detection must beat the deterministic baseline on totals residuals; otherwise keep only the deterministic Pangu input and record the negative.

## 14. Improvement experiment
(a) Shorten τ to 6h (Pangu has 1/3/6/24h models) for game-day nowcasts — the paper notes longer windows degrade secant quality; (b) blend A-SV with the BEEP blending idea from 1474 for multi-model weather inputs; (c) learn stadium-specific wind elasticities from the ensemble distribution quantiles rather than a single threshold.
