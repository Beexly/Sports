# [0323] Time-Aware Synthetic Control (arXiv:2601.03099v1)

**Citation:** Saeyoung Rho, Cyrus Illick, Samhitha Narasipura, Alberto Abadie, Daniel Hsu, Vishal Misra (2026). *Time-Aware Synthetic Control*. arXiv:2601.03099v1. URL: https://arxiv.org/abs/2601.03099v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 1066 lines).
**Verdict:** ADOPT — directly fills the corpus's thinnest gap (causal inference / synthetic controls for injury impact, gap #9 in the existing-research map): a concrete, implementable state-space SC estimator with closed-form EM updates, validated on sports score trajectories, that exploits temporal trends classical SC discards and is robust to the high-observation-noise regime sports data lives in.

## 1. Research question
Classical synthetic control (SC) and its variants are invariant to permutations of pre-intervention time indices — they discard temporal ordering information. Can a state-space generative model with a constant trend (TASC) that preserves the low-rank structure of panel data exploit learnable temporal trends to produce better counterfactual predictions than permutation-invariant SC, especially under strong trends and high observation noise?

## 2. Dataset / schema
Four evaluations, all univariate panel time series (target unit + n donor units, pre/post intervention split at T0):
(a) **Simulated data**: linear-Gaussian state-space DGP with controllable hidden-state perturbation covariance Q (a=0.01/0.1 settings) and observation noise covariance R (avg |noise| ≈ 0.0839 small / 0.8365 large); small Q → stronger trend A; pre-intervention T0=50, horizon T0+1..100.
(b) **Proposition 99 (California tobacco tax, 1988)**: classic Abadie et al. dataset; univariate target = per-capita cigarette sales (packs); 38 donor states; single predictor only (deliberately, for fair method comparison); d=2.
(c) **Cricket (IPL)**: ball-by-ball data 2008-04-18 → 2025-03-25; 1524 innings with ≥120 legal deliveries; cumulative score per ball, T=120, intervention at T0=72 (placebo — no real intervention); donor pools n ∈ {18, 36, 72, 144} most recent prior matches; d=5; 100 random-target repeats.
(d) **NBA**: play-by-play from Kaggle (wyattowalsh/basketball), cumulative score sampled every 15 s → T=192 per game (48 min), games Jan 2020 → Jun 2023, 7574 eligible games; T0=96 (halftime placebo); n ∈ {24, 48, 96, 192, 384}; d=5; 100 repeats.
Data access: Prop 99 data is public (Abadie et al.); Kaggle basketball data public URL given; IPL ball-by-ball source not URL-specified.

## 3. Method / model
**TASC model** (linear Gaussian state space): x_t = A x_{t−1} + q_{t−1}, q ∼ N(0, Q); y_t = H x_t + r_t, r ∼ N(0, R); x_0 ∼ N(m_0, P_0). Hidden state dim d ≪ min(n, T) preserves low-rank signal Y ≈ HX + E with full-rank (omnidirectional) noise E. Variants: time-invariant state portion x*, seasonality term s_t 1, stacked multiple time series.
**Learning (EMpre, Algorithm 2)**: E-step = Kalman filter forward (Algorithm 4) + RTS smoother backward (Algorithm 6); M-step = closed-form MLE of the expected complete-data log-likelihood (Algorithm 7): A′ = CΦ⁻¹, H′ = BΣ⁻¹, Q′ = Diag(Σ − 2CA⊤ + AΦA⊤), R′ = Diag(D − 2BH⊤ + HΣH⊤), m′_0 = m^s_0, P′_0 = P^s_0 + (m^s_0 − m_0)(m^s_0 − m_0)⊤ (sufficient statistics Σ, Φ, B, C, D from smoothed moments). Complexity O(N1 T0 N³) dominated by EM.
**Counterfactual inference (Algorithm 3)**: refit filter/smoother with learned θ; handle missing post-intervention target by setting target observation variance r_1 → ∞ (Algorithm 5: Kalman gain for the target coordinate becomes zero; RTS smoothing unchanged since it doesn't use R or y); predict ŷ_{0,t} = h_1⊤ m^s_t for t > T0. Also yields 95% CIs from latent-state covariance (narrower than CIM's MCMC intervals).
**Theory (Appendix A, Proposition A.1)**: Kalman filtered state/covariance are minimal sufficient statistics for forecasting; permutation-invariant SC uses only the unordered multiset σ-algebra, so by the data processing inequality the Kalman-based predictor weakly MSE-dominates any permutation-invariant predictor (strict when A ≠ 0).

## 4. Equations & assumptions
Paper's stated equations, copied faithfully:

(1) Classical SC factor model: Y_{i,t} = δ_t + θ_t Z_i + λ_t μ_i + ε_{i,t}.

(2) x_t = A x_{t−1} + q_{t−1}, q_{t−1} ∼ N(0, Q); (3) y_t = H x_t + r_t, r_t ∼ N(0, R); x_0 ∼ N(m_0, P_0).

(4–6) Constant-state variant: x′_t = A x′_{t−1} + q_{t−1}; x_t = x* + x′_t; y_t = H x_t + r_t.

(7–8) Seasonality: x_t = A x_{t−1} + q_{t−1}; y_t = H x_t + s_t 1 + r_t.

Classical SC baseline: f* = argmin_{f ∈ Δ_{n−1}} ‖y_0⁻ − f⊤ Y⁻‖² (simplex); RSC: HSVT denoise then ridge.

Stated assumptions: (a) panel signal is low-rank (d ≪ min(n,T)); (b) latent factors evolve with a **constant, time-invariant linear trend A**; (c) Gaussian noise, diagonal Q/R in the M-step; (d) donors are untreated and their post-intervention data is informative about the counterfactual; (e) univariate series (multivariate deferred to future work); (f) trend A persists past the intervention point (key for long-horizon advantage).

## 5. Features / target
Input: panel matrix Y (N = n+1 units × T time points); target = row 1, pre-intervention data Y_1⁻ ∈ R^{T0}; donor matrix Y ∈ R^{n×T}. Hyperparameters: hidden dim d, EM iterations N1. Target: counterfactual post-intervention trajectory ŷ_{0,T0+1..T} and the causal effect Y_1⁺ − ŷ_1⁺ (plus 95% CIs from latent covariance).

## 6. Validation design
No train/test split in the ML sense — SC validation is via (a) simulation with known DGP across Q/R/d/donor-size/horizon ablations; (b) **placebo tests** (treat a donor as the target, reconstruct its observed series) on Prop 99, IPL, NBA; (c) permutation stress test (shuffle pre/post time indices separately — SC/RSC provably unchanged, TASC should degrade); (d) hyperparameter sweeps over d and donor-pool size n; (e) horizon-segmented RMSE (5 future blocks in simulation; per-over in cricket; per-half-quarter in NBA). Benchmarks throughout: classical SC (simplex), RSC (HSVT + ridge), CIM/Bayesian structural time series.

## 7. Numerical results / baselines
All numbers quoted from the paper (paper's claims):
- Permutation stress test: TASC post-intervention RMSE mean **+48.5%**, std **+25.7%** when time indices permuted (SC/RSC unchanged by design) — confirms TASC exploits temporal order.
- Simulation Q/R ablation: under **high observation noise + small Q (strong trend), TASC is best** of the four; under low noise, RSC is best and TASC trails; underestimation of d hurts more than overestimation, and TASC is more robust to overestimating d than RSC; at matched d = d_true, TASC beats RSC for all d_true ∈ {3,5,10,20}.
- Donor-size ablation (T0=50): all methods best near N = T0 = 50; N=200 degrades everything (curse of dimensionality); TASC nearly flat between N=10 and N=50.
- Horizon: with small Q, TASC stable across all five future blocks; with large Q it degrades at far horizon (periods 91–100 vs 51–60).
- Prop 99: all four counterfactuals broadly consistent, diverging near 2000; TASC 95% CI **considerably narrower than CIM's** (CIM's interval contains the observed California series → no causal conclusion possible from CIM); placebo tests: TASC lowest median RMSE and smallest variance; d-sweep optimal at d=2 for both TASC and RSC, RSC degrades rapidly as d grows, TASC stays stable; California's learned observation variance 2.58 (median across states 12.95, std 36.17, max 170.79).
- IPL cricket: TASC lowest median RMSE for n ∈ {36, 72, 144}; SC best at n=18; best overall **TASC at n=72: median RMSE 7.88**; RSC degrades as n grows (overfitting); TASC strongest at long horizons; TASC CIs narrower than CIM's.
- NBA: TASC lowest median RMSE across all n ∈ {24,…,384}; SC/RSC worsen as n grows; best at n=192; horizon analysis: TASC lowest in nearly every half-quarter block, gap widening in Q4's second half.

## 8. Code / data availability
Code: none stated (no repository link in the paper). Data: Prop 99 public data (Abadie et al. 2010); NBA play-by-play via Kaggle https://www.kaggle.com/datasets/wyattowalsh/basketball/data; IPL ball-by-ball source not URL-specified. Funding: ONR grants N00014-24-1-2687, N00014-24-1-2700; Columbia-Dream Sports AI Innovation Center PhD Fellowship.

## 9. Leakage & limitations
- **Placebo-test validity**: cricket/NBA "interventions" are placebos (no real treatment) — they validate forecasting, not causal identification; the causal claim rests on Prop 99 only.
- **Mean-centering**: cricket and NBA data are mean-centered using donor means prior to fitting — mild lookahead within the donor pool (uses full donor series including post-T0 donor data to compute the centering mean); acceptable for forecasting benchmarks but not a strict causal protocol.
- **Author-acknowledged limitations**: univariate only; strictly linear time-invariant trend A (misspecification risk when dynamics are complex — authors note TASC is more misspecification-prone than flexible factor models); EM is slow and initialization-sensitive ("often leading to poor fits").
- **Simplex-free weights**: unlike classical SC, TASC has no non-negativity/sum-to-one constraints — counterfactuals can extrapolate outside the donor convex hull (more flexible, less "synthetic control" in the Abadie sense; extrapolation risk unquantified).
- **Donor selection unaddressed**: uses most-recent-n games; no donor-screening (their own ClusterSC work [18] is cited but not used).
- **Complexity**: O(N1 T0 N³) — EM iterations × time × cubic in units; fine for tens of donors, heavy for hundreds.
- NFL external validity: strong for the causal-inference use case (injury impact, rule changes, schedule effects); the sports-trajectory validations (cricket/NBA scores) are the closest existing proof that the method works on game data. The linear-trend assumption fits team-strength drift over a season but not abrupt regime changes (e.g., QB injury mid-series — ironically the target application needs the intervention point handled carefully).

## 10. GSE overlap
Existing map coverage: **causal inference is ML-brief area 10 (commissioned, no papers read)**; gap #9 explicitly names "player-level causal injury effect estimation (synthetic controls on QBs/OL)" as thin. The repo has state-space machinery (Kalman filters, nested AR(1) team strength from 1701.05976, temporal fusion transformers) but **zero synthetic-control work** — no SC, RSC, or CIM anywhere in the corpus. **Verdict: new capability and a direct gap-fill** — TASC unifies the two existing in-house threads (state-space dynamics + causal inference need) into one implementable estimator.

## 11. GSE implementation spec
Build a TASC injury-impact / intervention-analysis module in the Sports repo:
- **Data**: nflverse play-by-play 2020–2025; panel = 32 teams × weekly EPA/play (or per-team-game scoring margin); interventions: starting-QB injuries (e.g., Rodgers 2023 Week 1, Burrow 2023 Week 11), mid-season coordinator changes, rule changes.
- **Pipeline**: (1) construct donor pool = teams/seasons without the intervention, aligned by week; (2) fit TASC via EM (Algorithms 2/4/6/7 — all closed-form; implement in NumPy/SciPy, ~300 lines); d chosen by the paper's placebo-test sweep (expect d=2–5); (3) counterfactual post-intervention trajectory + 95% CI; (4) placebo validation on untreated teams as the acceptance gate.
- **Product uses**: (a) causal QB-injury impact estimates for content ("losing QB X costs Y EPA/play vs the no-injury counterfactual") — a genuinely differentiated GSE metric; (b) rest-of-season forecast adjustment when a QB is injured (replace naive "backup = historical backup EPA" with the TASC counterfactual gap); (c) schedule-maker / bye-week effect estimation.
- **Effort**: 3–5 engineer-days (EM implementation + placebo harness); no new data licenses; validate against the paper's sports results first by replicating the NBA-score placebo test on NFL scoring-margin trajectories.

## 12. Reproducible test
Dataset: nflverse 2020–2025, team-game EPA/play panel (32 teams × 18 weeks × 6 seasons). Protocol: for each of 10 documented starting-QB injuries (list fixed before running), build donor pool of the 30–60 most similar team-weeks without QB change, fit TASC with d ∈ {2,3,4,5} on pre-injury weeks, predict post-injury counterfactual; compare against classical SC (simplex) and a naive baseline (team's pre-injury mean EPA/play carried flat). Metric: placebo-test RMSE — for 50 randomly chosen non-injury team-weeks, RMSE of the counterfactual vs realized post-window EPA/play. Baseline to beat: classical SC placebo RMSE. Window: 2020–2025 seasons, fixed injury list.

## 13. Acceptance / rejection gate
**Adopt** if, on the NFL placebo harness, TASC's median placebo RMSE beats classical SC by ≥ 10% relative AND beats the flat-carry baseline by ≥ 15% in at least 4 of 6 seasons, with the d-sweep showing the paper's stability signature (performance flat or improving for d ≥ d_true, no cliff). **Reject** if TASC cannot beat classical SC on NFL data (the paper's advantage came from strong linear trends + high noise; NFL weekly EPA may be too close to white noise for the trend component to help) or if EM fails to converge reliably (< 90% of placebo runs converge within 200 iterations from 3 random inits).

## 14. Improvement experiment
Beyond the paper: fix its two acknowledged weaknesses together — (a) replace the linear time-invariant A with a **regime-switching trend** (two-state: stable vs post-shock drift), which directly models the injury application where the intervention itself may change the trend; (b) replace batch EM with **gradient-based EM** (paper's own suggestion: neural-net E-step forward pass + gradient ascent on the Q-function), enabling the multivariate extension (stack EPA/play, success rate, and market spread as the m-series variant in §3.1.3). Test whether regime-switching TASC on the QB-injury list produces counterfactual gaps that predict the *market's* post-injury line move (de-vigged spread change) — if the causal estimate anticipates the market, it's a tradable edge, not just a descriptive metric.
