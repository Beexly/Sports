# [1572] Evaluating Movement Initiation Timing in Ultimate Frisbee via Temporal Counterfactuals (arXiv:2508.17611)

**Citation:** Shunsuke Iwashita, Ning Ding, Keisuke Fujii (2025). *Evaluating Movement Initiation Timing in Ultimate Frisbee via Temporal Counterfactuals*. arXiv:2508.17611. URL: https://arxiv.org/abs/2508.17611
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT

VTCS, a temporal-counterfactual framework that shifts a player's movement-initiation timing (±1 s) and scores each counterfactual with a pitch-control value function; a genuine causal-inference tool for tracking data, directly portable to NFL NGS (route-break timing, pass-rush timing: "what if the WR had cut 0.3 s earlier?"). Open dataset + code.

## 1. Research question
In invasion sports, off-ball movement initiations are unlabeled but tactically crucial. Can we quantify how good a receiver's initiation timing was by generating temporal counterfactuals (shifting only that player's initiation frame) and comparing spatial-control values between the actual play and the best counterfactual?

## 2. Dataset / schema
UltimateTrack (new, published): drone footage (DJI Mavic 3) of Nagoya University team scrimmages, manually tracked every frame — 18,075 frames at 15 FPS, 64 possessions, 15 entities (7 offense, 7 defense, 1 disc), normalized 94×37 m field coordinates, CSV with position/velocity/acceleration. 455 candidate initiation sequences detected by kinematic rules (acceleration burst aligned with velocity, preceded by non-possession) → 310 retained after visual review. Code: https://github.com/shunsuke-iwashita/VTCS.

## 3. Method / model
VTCS (Valuing Timing by Counterfactual Scenarios), three steps: (1) detect initiation frame t₀ per receiver; (2) generate counterfactuals by shifting initiation ξ ∈ [−15, 15] frames (±1 s at 15 FPS) with rule-based motion stitching — earlier shift replays trajectory |ξ| frames early with continuity correction Δp(ξ⁻) = p(t₀+ξ) − p(t₀) (Eq. 1); delayed shift fills the gap with linear motion at pre-initiation mean velocity v̄ (15-frame average) then replays delayed (Eqs. 2–3); all other players frozen; (3) score each scenario with wUPPCF (Ultimate pitch-control + distance weight w_d + marker-blocking weight w_s with virtual-arm obstruction, r = 1 − min(||p_t − p_d||/30, 1), Eqs. 4–5). Frame value V_frame(t) = mean wUPPCF over reachable region Ω(t) (disc-player rendezvous circle, Eqs. 6–8); scenario value V_scenario(ξ) = max 15-frame moving average of V_frame (Eq. 9); timing score V_timing = V_scenario(0) − max_{ξ≠0} V_scenario(ξ) (Eq. 10): how much worse actual timing was than the best alternative. Pass-target proxy: XGBoost classifier (spatial/kinematic features, 5-fold GroupKFold) for whether the detected player was the intended receiver, thresholded at ≥0.55 / ≤0.30 to avoid boundary ambiguity.

## 4. Equations & assumptions
- Counterfactual trajectories: Eqs. 1–3 (piecewise shift with continuity corrections).
- wUPPCF_i = UPPCF_i · w_d · w_s (Eq. 5); virtual arm length Eq. 4.
- V_frame(t) = |Ω(t)|⁻¹ Σ_{r∈Ω(t)} wUPPCF_i(t,r) (Eq. 6); rendezvous Eqs. 7–8.
- V_scenario(ξ) = max_t (1/15)Σ_{k=1}^{15} V_frame(t+k) (Eq. 9); V_timing Eq. 10.
- Assumptions: rule-based (not learned) motion model — interpretable but ignores reactive defender dynamics beyond the paired marker; all non-target players frozen (no equilibrium response); linear gap-fill for delays; disc speed known; pitch-control value ≈ tactical value.

## 5. Features / target
Features: per-frame positions/velocities/accelerations of all 15 entities; derived wUPPCF fields. Target: V_timing per sequence (continuous, ≤0; closer to 0 = nearer optimal) and the argmax ξ* (optimal shift direction/magnitude). Auxiliary target: pass-target probability (XGBoost proxy for ground truth).

## 6. Validation design
Two validations on held-out folds (5-fold GroupKFold, no leakage): (i) V_frame discriminates actual pass targets from non-targets — KS test on distributions, plus team-relative ranking (Mann–Whitney U, Cliff's δ); (ii) V_timing distributions compared across skill groups (Group 1: males 1–3 yrs; Group 2: females ≤3 yrs + males <1 yr). No outcome prediction (completions) tested; no baseline method comparison (first of its kind).

## 7. Numerical results / baselines
XGBoost target predictor: RMSE ≈ 0.316, R² ≈ 0.163 (moderate). V_frame target vs non-target: KS D = 0.3147 (p = 0); Group 1 D = 0.3159, Group 2 D = 0.3120. Team-relative rank: Mann–Whitney p = 0, Cliff's δ = −0.339 (medium); Group 1 −0.329, Group 2 −0.382. Skill-group surprise: Group 2 (novices) V_timing concentrated closer to zero than Group 1 — authors interpret as novices' homogeneous movement constraining counterfactual range, and experts facing heavier defensive pressure; i.e., V_timing captures context-adaptive decision quality, not raw skill. No baselines (novel task).

## 8. Code / data availability
Code public (GitHub VTCS); UltimateTrack dataset published (CSV). Fully reproducible.

## 9. Leakage & limitations
Single university team, practice matches, 64 possessions / 310 sequences — small and non-competitive. Frozen-teammate assumption breaks under real defensive reactions; the paired-marker-only adjustment is a first-order fix. The counterintuitive skill-group result warns that V_timing conflates decision quality with defensive context — needs defender-proximity covariates (acknowledged). No link to actual pass completions or points. 15 FPS limits timing resolution (±1 frame ≈ 67 ms granularity fine, but ξ grid is frame-level).

## 10. GSE overlap
Fills a tracking-data causal gap: GSE has NGS but no counterfactual machinery for "what if the timing differed." Directly complements 2412.08840 (2-for-1 causal effects) as the tracking-data counterpart — both estimate causal effects of timing decisions, one from play-by-play, one from trajectories. No existing corpus work does trajectory counterfactuals.

## 11. GSE implementation spec
Build `gse_vtcs.py` on NGS tracking: (1) detect WR route-break initiations (acceleration-burst rule adapted from Appendix 0.E); (2) generate ξ-shifted counterfactuals (±0.5 s at 10 Hz NGS) for the WR + nearest DB, freezing others; (3) score with an NFL pitch-control analogue (expected completion value surface from GSE's catch-probability model instead of wUPPCF); (4) compute V_timing per route and ξ* (early/late tendency) per receiver-season; (5) serve receiver ξ*-bias as a feature in GSE's reception/prop models (chronically late breakers underperform vs market) and as @GalaxySportsHQ film-room content ("WR X's breaks are 0.2 s late vs optimal — here's the counterfactual"). Validate the value surface against actual targets/completions first (the paper's KS-test protocol, ported).

## 12. Reproducible test
Port the paper's validation to 2024 NGS: for detected WR breaks, test whether the NFL-adapted V_frame separates actual targets from non-targets (KS D ≥ 0.25, p < 0.01) — pass gate for the value surface. Then: does receiver-level mean V_timing predict next-season target share / yards per route run beyond the baseline model? Pass gate: +1.5% out-of-sample R² on YPRR. If the value surface fails the KS gate, the counterfactual scores are meaningless — stop there.

## 13. Acceptance / rejection gate
Accepted: genuine causal-inference method (temporal counterfactuals) for tracking data, statistically validated metric (KS D = 0.31, p = 0), open data + code, explicit cross-sport portability claim, and a concrete NGS application GSE can build. The small single-team sample limits the paper's own conclusions but not the method's portability.

## 14. Improvement experiment
Replace frozen teammates with a learned reactive-defender model (the authors' stated future work; cf. Fujii et al. 2024 TNNLS counterfactual treatment outcomes, ref [10]) — estimate DB response as a function of WR trajectory shift, then recompute V_timing under equilibrium response. Test whether equilibrium-adjusted V_timing predicts completions better than frozen-teammate V_timing; if yes, GSE adopts the equilibrium version.
