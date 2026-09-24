# [0596] A Bayesian Hidden Semi-Markov Model with Covariate-Dependent State Duration Parameters for High-Frequency Data from Wearable Devices (arXiv:2010.10739v1)

**Citation:** Rojas-Salazar, S., Schliep, E. M., Wikle, C. K. & Hawkey, M. (2020). *A Bayesian Hidden Semi-Markov Model with Covariate-Dependent State Duration Parameters for High-Frequency Data from Wearable Devices*. arXiv:2010.10739v1. URL: https://arxiv.org/abs/2010.10739v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 3,415 lines).
**Verdict:** ADAPT — not for the wearable application, but for two methodological ideas: (1) covariate-dependent state durations in an HSMM — a template for modeling *how long* a team/player stays in a latent regime (pace, momentum, defensive shell) as a function of game context; (2) within-MCMC data subsampling to restore nominal coverage when high-frequency observations violate conditional independence — directly relevant to any GSE work on autocorrelated tracking/play-by-play time series.

## 1. Research question
Can the time a subject spends in each latent state of a hidden semi-Markov model be modeled as a function of covariates observed before the state transition (rather than as a state-constant parameter), and can random data subsampling inside the MCMC mitigate the conditional-independence violations typical of high-frequency wearable data?

## 2. Dataset / schema
Catapult minimax wearable data from one MLS referee in a 2017 game: raw 10 Hz for ~150 min (warm-up through full time), truncated to the 90-min game and thinned to 1 Hz (5,400 time points). Observation sequence: instantaneous heart rate (bpm), mean 150. Covariates: acceleration (mean 0.03 m/s², range −5.97 to 8.08), cumulative distance traveled (~10 km total), distance from field center (0.4–47.4 m, mean 19 m). Simulation study: AR(1)-correlated Gaussian emissions, M ∈ {2,3,4} states, ψ ∈ {0.3, 0.6, 0.86, 0.95}, n ≈ 1000/2600/4000, 45 scenarios × 100 realizations.

## 3. Method / model
Bayesian HSMM: segments q=1…Q with states S_q, durations τ_q ~ zero-truncated Poisson h_{S_q}(τ_q | φ_{S_q}); Gaussian emissions y ~ N(μ_{S_q}, σ²_{S_q}); Markov transitions P between segments. Innovation: the duration parameter is time-varying and state-specific, φ_{S_{q+1}}(X_{1:T_q}, β_{S_{q+1}}) = g(β_0 + Σ β_r f_r(x_{r,1:T_q})), modeled with covariates observed in the window before the transition. Inference: Metropolis-within-Gibbs (Gibbs for ρ, P rows, μ, σ²; random-walk Metropolis for duration coefficients β_j; Yu 2016 Viterbi extension to sample the state sequence). Second innovation: at each MCMC iteration, a fresh random subsample of observations (sampling rate tuned per application) is used for the emission updates. Diffuse priors: μ ~ N(0,10000), σ² ~ IG(3,3), Dirichlet(1,…,1) for ρ and P rows, β ~ N(0,10000).

## 4. Equations & assumptions
Complete likelihood (3): L = ρ_{S_1} · Π_{q=1}^{Q−1} h_{S_q}(τ_q|φ_{S_q}) p_{S_q,S_{q+1}} f(y_{τ_q}|μ_{S_q},σ²_{S_q}) × h_{S_Q}(τ_Q|φ_{S_Q}) f(y_{τ_Q}|μ_{S_Q},σ²_{S_Q}).
Duration regression (4): φ_{S_{q+1}}(X_{1:T_q}, β_{S_{q+1}}) = g(β_{0,S_{q+1}} + β_{1,S_{q+1}} f_1(x_{1,1:T_q}) + … + β_{r,S_{q+1}} f_r(x_{r,1:T_q})), g ensuring positivity.
Application form (7): φ = exp[β_0 + β_1 x̃_{1,T_q} + β_2 x_{2,T_q} + β_3 x_{3,T_q} + β_4 h_{T_{q+1}} + β_5(x̃_1·h) + β_6(x_2·h) + β_7(x_3·h)], where x̃_1 = 20-second average acceleration before transition, x_2 = cumulative distance, x_3 = distance from center, h = second-half indicator (8 coefficients per state).
Assumptions: conditional independence of observations given states (deliberately violated by the data — the subsampling fix); zero-truncated Poisson durations; halftime break handled by a fresh initial distribution for the second half; number of states fixed a priori.

## 5. Features / target
Features: heart-rate time series (1 Hz); covariates acceleration (20-s pre-transition average), cumulative distance, distance from center, half indicator + interactions. Targets: latent state sequence (physiological-response regimes), state durations, duration-covariate coefficients.

## 6. Validation design
Simulation: 45 scenarios × 100 realizations; fits HSMM assuming independence; evaluates empirical coverage of 90% CIs for emission means/variances at sampling rates 100%→10%. Application: no holdout; state count chosen by MPSRF ≤ 1.2 convergence diagnostic across 2–5-state chains (DIC always selected the largest model); 100,000 MCMC iterations (first 30,000 adaptive, discarded; 70,000 retained).

## 7. Numerical results / baselines
Simulation (Tables B.1–B.3, n≈4000): with autocorrelation ψ=0.86 and no subsampling, empirical coverage of 90% CIs collapses to 35–38% (M=2: 36%; M=3: 35%; M=4: 38%); at ψ=0.95, 24–28%. Subsampling restores coverage: at ψ=0.86, 20% sampling → 82–86%, 10% → 94–96%; at ψ=0.3, 70% sampling already gives ~nominal coverage. Effect consistent across M=2,3,4 and n=1000/2600/4000.
Application (3 states): emission means S1=133.6 (132.3,134.9) var 59.7; S2=150.5 (149.8,151.1) var 14.2; S3=165 (164,166) var 28.1 — non-overlapping intervals (mild/moderate/strenuous). Transitions: 1→2 0.91 (0.81,0.98), 2→1 0.56 (0.45,0.68), 2→3 0.44 (0.32,0.55), 3→2 0.97 (0.88,1) — adjacent-state moves dominate (cardiac lag). Segments: 41/69/32; mean duration parameters S1=45.9 (24.1–121), S2=27.8 (11.6–70.4), S3=48.1 (15.2–114.0).
Duration coefficients (Table 4, significant): 1st half — distance traveled lengthens S1 (0.21 [0.12,0.31]) and shortens S2 (−0.27 [−0.36,−0.19]) and S3 (−0.64 [−0.74,−0.55]); large decelerations lengthen S3 (−0.74 [−1.32,−0.23] on acceleration); distance from center shortens S1 (−0.11) and S3 (−0.09). 2nd half — distance traveled lengthens S1 (0.09 [0.02,0.17]) and S2 (0.34 [0.21,0.49]); large accelerations shorten S2 (−1.85 [−2.55,−1.18]); distance from center lengthens S1 (0.34 [0.26,0.42]) and shortens S2/S3. Subsampling rate for the application: 15% (matched to observed autocorrelation 0.83–0.89 at segment-length scales).

## 8. Code / data availability
No code or data link stated in the paper. MCMC algorithm fully specified in Appendix A (Algorithms 1–2). Data: single-game Catapult proprietary wearable recording.

## 9. Leakage & limitations
- Single referee, single game — no replication; all covariate effects are one-match anecdotes.
- State count selected by a convergence heuristic (MPSRF), not a principled criterion; DIC failed (always picked max states).
- Zero-truncated Poisson durations are a strong parametric choice; no comparison against negative-binomial or nonparametric durations.
- Subsampling discards data to fix a misspecification — valid for coverage of emission parameters but its effect on duration/transition inference is not studied.
- Covariate window functions (20-s averages, cumulative distance) are ad hoc.
- No predictive validation (e.g., forecasting next state/duration).

## 10. GSE overlap
Extension. Per the existing-research map (`/home/hatch/workspace/arxiv-sweep/existing-research-map.md`, §1), the repo has regime/momentum work (MOVE-37 Koopman/DMD momentum lane — rejected, p=0.89) and state-space team models, but nothing with an HSMM whose *durations* are regressed on covariates, and nothing on subsampling-within-MCMC for autocorrelated sports time series. The duration-regression idea is new structure in the regime-modeling lane; the wearable application itself has no GSE counterpart (GSE does not ingest player wearable data).

## 11. GSE implementation spec
Port the duration-regression HSMM to game-state regimes: define latent pace/aggressiveness regimes from play-by-play (e.g., pass-heaviness or tempo states), with segment durations modeled as zero-truncated Poisson whose parameter depends on pre-transition covariates (score differential, time remaining, timeouts, weather, QB). Fit on nflverse 2018–2025 with the subsampling protocol (tune rate by segment-scale autocorrelation per the paper's Table B.2 procedure). Use: (a) expected-regime-duration forecasts as features for in-game/live models, (b) covariate effects to quantify what extends or shortens aggressive regimes (e.g., do trailing teams stay in pass-heavy states longer?). Effort: ~3 engineer-weeks (custom MCMC).

## 12. Reproducible test
Dataset: nflverse play-by-play 2020–2025, drives as segments. Fit 2–3-state HSMM on drive-level pass rate with duration regression on (score differential, quarter, timeouts remaining). Metric: held-out 2025 log-likelihood of drive sequences vs a constant-duration HSMM and vs a plain HMM; plus calibration of predicted vs actual regime durations.

## 13. Acceptance / rejection gate
Adopt if the covariate-duration HSMM beats the constant-duration HSMM on held-out 2025 log-likelihood by ≥1% AND at least two duration covariates have 95% CIs excluding zero (the paper's Table 4 standard). Reject if durations are effectively memoryless (covariates add nothing) — then a plain HMM suffices and the extra machinery is unjustified.

## 14. Improvement experiment
The paper models durations but leaves transition probabilities homogeneous; extend to covariate-dependent transitions too (their own suggested extension), testing whether game context predicts *which* regime comes next, not just how long it lasts. If transition covariates dominate duration covariates predictively, GSE's regime model becomes a transition-driven rather than duration-driven system — a structural finding the paper never tests.
