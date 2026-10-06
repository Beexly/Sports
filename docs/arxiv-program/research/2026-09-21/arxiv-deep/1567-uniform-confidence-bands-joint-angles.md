# [1567] Uniform confidence bands for joint angles across different fatigue phases (arXiv:2502.08430)

**Citation:** Patrick Bastian, Rupsa Basu, Holger Dette (2025). *Uniform confidence bands for joint angles across different fatigue phases*. arXiv:2502.08430. URL: https://arxiv.org/abs/2502.08430
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** REJECT

a pure functional-data-theory note (bootstrap confidence bands around phase means after change-point detection) on lab treadmill knee-angle curves; no predictive component, no injury outcome, and it requires per-stride functional biomechanical curves that GSE does not have and cannot obtain at NFL scale. Replaced by 2309.00756.

## 1. Research question
Given a functional time series of joint angles already segmented into fatigue phases (rested / pre-fatigued / exhausted) by the authors' earlier change-point work, how can one construct simultaneous (uniform) confidence bands for the mean curve within each phase, so a biomechanist can read off range-of-motion changes under fatigue? A theoretical statistics note, not an empirical study.

## 2. Dataset / schema
Marker-based optical motion-capture knee-angle data from runners on a treadmill under a lab fatigue protocol (collaboration "Sports, Data, and Interaction", University of Twente). Example: runner A, n=1830 strides, 3 phases detected at Δ=6.6; runner B (experienced), one change at Δ=8. Data not public in the paper (from collaborators R. van Middelaar and A. Balasubramaniam). Schema: functional observations X_{n,j}(t) ∈ C[0,1], one curve per stride, ~1200+ strides per runner. No injury labels; no performance outcomes.

## 3. Method / model
Three-step pipeline: (i) change-point detection via BINSEG from Bastian et al. 2024 (Annals of Applied Statistics); (ii) relevant-change selection (Algorithm 2, ibid.) keeping only jumps with ‖μᵢ−μᵢ₋₁‖∞ > Δ, with data-driven Δ = ‖μ̂_final − μ̂_initial‖∞/3 (mean of first vs last 5% of data); (iii) this note's contribution: simultaneous confidence bands μ̂ᵢ±(t) = μ̂ᵢ(t) ± σ̂(t)q̂*_{1−α/2}/√n̂ᵢ for all i in Î. The quantile comes from a multiplier (Gaussian) block bootstrap: residuals Y_{n,j} = X_{n,j} − μ̂ᵢ, block length L, iid N(0,1) multipliers νⱼ on block sums; bootstrap statistic T*_n = max_{i∈Î} √n̂ᵢ‖μ̂*ᵢ/σ̂‖∞; empirical (1−α) quantile over R replications. Long-run variance σ² = Σ_{j∈ℤ}E[ε₀εⱼ] estimated by kernel-smoothed lag covariances σ̂² = Σ_{l=−c}^{c}σ̂²_l K(l/c) (Lemma 1: consistent when c→∞, c³/n→0). Theorem 2.1: liminf coverage ≥ 1−α−β (β = change-selection level), strengthening to exactly 1−α when no jump sits exactly at Δ.

## 4. Equations & assumptions
- Model: X_{n,j}(t) = μ_{n,j}(t) + ε_{n,j}(t), piecewise-constant μ in j (Eq. 1-2).
- Coverage target: lim_{n→∞}P(∩_{i∈I}{∀t: μ̂⁻ᵢ(t) ≤ μᵢ(t) ≤ μ̂⁺ᵢ(t)}) = 1−α (Eq. 3); relevant set I = {0} ∪ {i: ‖μᵢ−μᵢ₋₁‖∞ > Δ} (Eq. 4).
- T_n = max_{i_l∈Î} √n̂_{i_l}‖(μ̂_{i_l}−μ_{i_l})/σ̂‖∞ (Eq. 6); bands μ±ᵢ(t) = μ̂ᵢ(t) ± σ̂(t)q_{1−α/2}/√n (Eq. 7).
- Bootstrap: μ̂*ᵢ = n̂ᵢ⁻¹Σ νⱼ(L^{−1/2}Σ_{l=0}^{L−1}Y_{n,j+l}) (Eq. 9); T*_n = max √n̂ᵢ‖μ̂*ᵢ/σ̂‖∞ (Eq. 10); final bands (Eq. 11).
- Long-run variance: σ̂² = Σ_{l=−c}^{c}σ̂²_lK(l/c), σ̂²_l the lag-l sample covariance (Eq. 15-17).
- Assumptions: Conditions (A1)-(A4) from Dette & Kokot 2022 (stationarity, mixing, moment conditions); σ(t)²>0 ∀t; consistent σ̂²; change-point estimators consistent (imported from Bastian et al. 2024 Theorems 4.1-4.2).

## 5. Features / target
Features: per-stride knee-angle curves (functional data). Target: the mean curve μᵢ(t) per fatigue phase — an estimation/inference target, not a prediction target. No labels, no horizon, no forecasting.

## 6. Validation design
Theoretical validation only: Theorem 2.1 (asymptotic coverage guarantee) with proof sketch. Empirical illustration: two runners' knee-angle bands (Figures 2-3), showing reduced knee bending at the second peak in the fatigue phase (consistent with Zandbergen et al. 2023 "protection mechanism"). No train/test split, no baselines, no numeric accuracy metrics, no comparison to alternative band constructions. Sample: single-runner illustrations (n=1830 strides).

## 7. Numerical results / baselines
No numeric results beyond illustration parameters: runner A Δ=6.6 (3 phases), runner B Δ=8 (1 change), left-knee comparison Δ=5.9. Qualitative finding: fatigue phase shows lesser knee bending while foot is in the air (second peak shift). No tables of metric values, no baselines.

## 8. Code / data availability
None stated. Data from named collaborators, not public. Methods build on Bastian et al. 2024 and Dette et al. 2020; no repository link.

## 9. Leakage & limitations
No prediction task exists, so leakage analysis is moot — the deeper issue is relevance: the "fatigue phases" come from lab treadmill running to exhaustion, a world away from NFL game fatigue; the input is per-stride joint-angle curves from optical motion capture, which GSE cannot obtain for NFL players (NGS provides aggregate speed/acceleration, not stride curves). The note contributes only the band construction, not the change-point detection itself (that's the 2024 predecessor). The Δ threshold is ad hoc (‖final−initial‖∞/3). Coverage is asymptotic; finite-sample behavior on short NFL-relevant series is unstudied. Excluding Δ-boundary jumps from the exact-coverage result is a convenient technicality.

## 10. GSE overlap
No overlap and no gap filled: GSE has no functional biomechanical data and no fatigue-phase segmentation need at the stride level. The existing-research map's workload/injury gaps concern game-level load and injury risk, not lab gait analysis. Change-point detection for workload regime shifts is conceivably useful, but this note's specific contribution (uniform bands around phase means) has no GSE application — GSE needs point predictions and calibrated probabilities, not simultaneous bands on stride curves.

## 11. GSE implementation spec
None — no build recommended. The closest conceivable adaptation (change-point detection on weekly workload series) is better served by the predecessor paper (Bastian et al. 2024) or standard PELT/BINSEG implementations, not by this note.

## 12. Reproducible test
Not applicable — no predictive claim to test. Any "test" would be a pure statistical replication of coverage on simulated functional data, which validates the theorem, not a GSE capability.

## 13. Acceptance / rejection gate
Rejected at the gate: requires per-stride functional biomechanical curves (unavailable for NFL), produces inference bands rather than predictions, and has no injury or performance outcome. Fails the lane's "directly tied to prediction accuracy" criterion.

## 14. Improvement experiment
None for GSE. For the statistics literature, the natural extension is finite-sample coverage validation and adaptation to sparsely observed functional data (e.g., wearable IMU in the field rather than lab motion capture) — but that is academic follow-up, not GSE work.
