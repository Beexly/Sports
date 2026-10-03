# [0236] Doubly-online changepoint detection for monitoring health status during sports activities (arXiv:2206.11578v1)

**Citation:** Stival, M., Bernardi, M., Dellaportas, P. (2022). *Doubly-online changepoint detection for monitoring health status during sports activities*. arXiv:2206.11578v1. URL: https://arxiv.org/abs/2206.11578
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 7,436 lines; model §2, online-EM inference §3, simulation §4, real-data application §5, conclusion §6 read in full; supplementary proofs referenced but not reproduced).
**Verdict:** ADAPT — port the doubly-online changepoint framework to detect regime changes in NFL player workload/performance time series (injury/fatigue early warning for props, snap-count and role changes); the wearable-running application itself doesn't transfer.

## 1. Research question
Can distributional changes in an athlete's physical condition (discomfort, de-training, device malfunction) be detected online from smartwatch multivariate time series, both *between* activities (after each session) and *within* an activity (in real time)?

## 2. Dataset / schema
- 85 consecutive warm-up running activities from one well-trained athlete: first 10 minutes of running on flat routes (altitude range < 10 m), sampled every second (T = 600) by Polar v800 watch + Polar H10 HR monitor.
- Variables: heart rate (bpm), speed (m/s); cadence/geolocation noted as extendable.
- Simulation: N = 1000 activities, T ∈ {60, 120, 200/240}, P = 2, 50 randomly placed changepoints; 20 replications per setting.

## 3. Method / model
- Latent changepoint chain S_1:N with S_1 = 1, S_n − S_{n−1} = 1 iff changepoint at activity n; transition p(S_n|S_{n−1}) = λ for a new segment (λ = 0.5 in application).
- Gaussian state-space per segment: measurement y_{n,t} = [Z^(S), Z^(A)] [α_t^(s); α_{n,t}] + ε_{n,t} (Eq. 1); state transition block-diagonal with segment-specific α_t^(s) (shared trend within segment) and activity-specific α_{n,t} (disturbance) (Eqs. 2–4).
- Three dependence sources: between-activity (segment states), within-activity autocorrelation, contemporaneous cross-variable covariance (full unstructured Σ, Ψ, Δ).
- Inference: online EM (Yildirim et al. 2013) with SMC approximation of changepoint predicted probabilities (constant complexity); Kalman filter/smoother for latent states.
- Doubly-online: between-online (process each completed activity, update parameters, retrospective segmentation) and within-online (during an activity, posterior P(D_n = 1 | y_{n,1:t}, past) at every time point t).
- Application specification: HR = linear trend + random walk; speed = local level + AR(1) with coefficient ρ_sp; θ = {Σ, Ψ, Δ, ρ_sp} estimated by 30 EM restarts; diffuse initialization; λ = 0.5.

## 4. Equations & assumptions
- Measurement: y_{n,t} = [Z^(S)_θ  Z^(A)_θ] [α_t^(s); α_{n,t}] + ε_{n,t}, ε ~ N_P(0, Σ_θ) (Eq. 1).
- State: block-diagonal transition T^(S), T^(A) with disturbances η^(s) ~ N(0, Ψ), η_{n,t} ~ N(0, Δ) (Eq. 2); segment-stacked forms Eqs. 3–4.
- Augmented likelihood with conditional independence structure p_θ(y, α, S) (Eq. ~5).
- Offline EM E-step: Q(θ, θ̂) = E_{θ̂}[log p_θ(y_{1:N}, α, D_{1:N}) | y_{1:N,1:T}] (Eq. 8); online version via stochastic approximation with SMC (Yildirim et al. 2013).
- Changepoint rule: p̂(D_n = 1 | y_{1:n,1:T}) > δ, δ = 0.5 in application (Eq. 14 referenced).
Stated assumptions: linear-Gaussian; segment/activity states independent (block-diagonal, no interaction); design matrices fixed in t and n (no terrain/elevation covariates — noted as limitation); equal-length activities T; changepoint prior λ constant (covariate-dependent λ(X_n) proposed as future work); diffuse priors.

## 5. Features / target
- Features: multivariate time series per activity (HR, speed at 1 Hz).
- Target: binary changepoint indicator D_n per activity; within-online: changepoint probability as a function of elapsed time t.
- Horizon: real-time (within activity) and sequential (between activities).

## 6. Validation design
- Simulation: sensitivity/specificity of changepoint detection vs threshold δ and series length T (20 replications; medians + 90% CIs); within-online sensitivity/specificity vs (δ, t).
- Real data: 85 activities, segmentation at δ = 0.5; qualitative validation against known device problems; four within-online case studies (activities 21, 32, 33, 39).
- No comparison to competing changepoint methods on the real data (only claim of unique within-online capability vs Xie et al. 2021).

## 7. Numerical results / baselines
- Simulation between-online: high specificity maintained across δ; sensitivity decreases as δ increases, significantly for T = 60/120, stable for T = 240; sensitivity prioritized over specificity (missing a health problem worse than false alarm).
- Within-online: detection hard at t = 40 (early), "satisfactory" after observing 2/3 of series (t = 80); sensitivity drops with δ and with smaller t.
- Real data: 34 estimated changepoints in 85 activities, of which 19 are single-activity segments (high between-activity variability); 15 of 19 in the last 43 activities attributed partly to systematic measurement errors (probable device malfunction) — the method detected the device problem, not just physiology.
- Within-online cases: activity 21 flagged (P ≈ 1 after ~20 s — elevated HR at same speed); activity 33 flagged after ~2 min (low HR + low speed = low effort); activity 39 (low HR, normal speed = improved fitness); activity 32 correctly not flagged (P ≈ 0 throughout).

## 8. Code / data availability
No code or data links in the text; "supplementary material (proofs, data, derivations) — write mattia.stival@unipd.it." Not open-source.

## 9. Leakage & limitations
- No leakage issue per se (online/expanding-window by construction), but: single-athlete real-data study (n = 1) — no population validation.
- No head-to-head against simpler alternatives (CUSUM, BOCPD, offline PELT) on real data; the "unlike competitors" claim rests on the within-online capability being unique, not on better accuracy.
- k* = 0 truncation "necessary practical choice" for large T; within-online becomes infeasible for large T as k* grows — scalability caveat.
- λ = 0.5 fixed arbitrarily; sensitivity to λ investigated only in supplement.
- 34 changepoints in 85 activities is a very high rate — suggests over-segmentation or that δ = 0.5 is too aggressive; 19 single-activity segments may be noise, not signal.
- Linear-Gaussian only; block-diagonal (no segment×activity interaction) acknowledged as restrictive.
- Computational cost not reported; SMC + 30 EM restarts per new activity could be heavy for real-time deployment.

## 10. GSE overlap
Per existing-research-map.md: GSE has injury/workload-adjacent material and extensive time-series/EPA work, but no formal online changepoint/regime-detection framework for player or team performance series. This is an **extension** (new capability): (a) between-online changepoint detection on player weekly time series (EPA/play, snap share, NGS speed metrics) as an injury/fatigue or role-change early warning for props; (b) between-online detection of team regime changes (coordinator/QB changes, scheme shifts) to trigger model refits; (c) within-online analog: in-game real-time changepoint probability for live betting (momentum/injury events). None of these exist formally in the GSE corpus.

## 11. GSE implementation spec
- Build a between-online changepoint monitor over weekly player series: multivariate observations per player-week (EPA/play, snap share, NGS top speed / acceleration, target share); segment-specific latent trend (player's underlying form) + week-specific disturbance (game script, opponent); changepoint = regime change (injury onset, role change, fatigue).
- Alert logic: P(changepoint) > δ triggers a prop-model flag (fade or investigate) and a features freeze for that player until the new segment has ≥3 weeks.
- Second use: team-level regime detection on offensive EPA/play to trigger GSE model refits (rather than fixed retraining windows).
- Implementation: linear-Gaussian state space + online EM per Yildirim et al. 2013; start with univariate (EPA/play) then multivariate; δ tuned for high sensitivity (the paper's health-monitoring argument applies: missing an injury is worse than a false flag).
- Effort: 2–3 engineer-weeks (state-space module + EM + alerting pipeline on nflverse weekly data).

## 12. Reproducible test
Dataset: nflverse 2019–2024 weekly player stats + injury reports as ground truth. Run between-online changepoint detection on RB/WR weekly EPA/play + snap share series. Metric: precision/recall of detected changepoints against injury-report weeks (within ±1 week) and role-change weeks (snap share shifts >15pp); compare to a CUSUM baseline. The paper's bar: high specificity maintained, sensitivity prioritized — require recall ≥ 0.6 on injury weeks at specificity ≥ 0.8.

## 13. Acceptance / rejection gate
Accept the monitor if it beats CUSUM on F1 against injury/role-change ground truth on 2019–2023 and the within-±1-week precision justifies the alert volume (≤2 flags per team-week on average — operational constraint). Reject if the changepoint rate is as high as the paper's (40% of activities) on NFL data — that would be pure noise for betting purposes — or if EM fails to converge reliably on short NFL series (17 games vs the paper's 85 activities); in that case fall back to BOCPD (Bayesian online changepoint detection), which the paper doesn't compare against but is the standard simpler alternative.

## 14. Improvement experiment
Beyond the paper: (a) the paper fixes λ = 0.5 — make the changepoint prior covariate-dependent λ(X_n) (their own proposed future work): injury history, age, snap load, days rest — directly implementable for NFL; (b) the paper's block-diagonal restriction (no segment×activity interaction) — allow game-script covariates (spread, pace) to modulate week-specific states, since NFL week-to-week variance is dominated by script, not physiology; (c) close the loop to betting: measure whether flagged-regime player props show systematic line value (books slow to adjust to role changes) — the paper stops at detection, but GSE's edge is in the market response lag.
