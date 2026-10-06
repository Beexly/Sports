# [1893] PETSA: Parameter-Efficient Test-Time Adaptation for Time Series Forecasting (arXiv:2506.23424)

**Citation:** Authors (Borealis AI) (2025). *PETSA: Parameter-Efficient Test-Time Adaptation for Time Series Forecasting*. arXiv:2506.23424v1. PUT ICML Workshop 2025. URL: https://arxiv.org/abs/2506.23424
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — the parameter-efficiency pattern is the transferable asset: freeze the big forecaster, adapt only tiny low-rank input/output calibration modules on delayed partial ground truth. For GSE that becomes a *frozen season model + small weekly calibration overlay* (per-team adjustments, tens of parameters, not thousands), updated on observed games with a Huber + structural loss — a principled, cheap alternative to full weekly refits that also composes with the lane's other update schemes.

## 1. Research question
Time-series forecasters degrade under non-stationarity; test-time adaptation (TTA) helps but existing methods update the full model (expensive) or need source data. Can we adapt at test time by updating only small calibration modules on the input and output of a *frozen* forecaster, using partial ground truth that arrives shortly after prediction (the TAFAS setup)? PETSA says yes: gated low-rank adapters + a three-part loss (Huber + frequency + patch-wise structural) beat full-model TTA (TAFAS) on 6 datasets × 6 backbones with up to 33.6× fewer parameters.

## 2. Dataset / schema
ETTh1, ETTm1, ETTh2, ETTm2, Exchange, Weather (multivariate TSF benchmarks). Backbones: iTransformer, PatchTST (transformer); DLinear, OLS (linear); FreTS, MICN (MLP). Input length 96; forecast windows {96, 192, 336, 720}. Setup: observe look-back window, predict horizon; partial ground truth arrives shortly after (Figure 1); full ground truth delayed. Metric: MSE; row-winner (RW) and column-winner (CW) counts.

## 3. Method / model
- **Calibration modules (Eq. 1):** X̂^cali = X + (tanh(α⊙X)·W + b), Ŷ^cali = Ŷ + (tanh(α⊙Ŷ)·W + b); α ∈ ℝ^V per-variable gating (DyT-inspired); W = A·B low-rank (A ∈ ℝ^{L×r}, B ∈ ℝ^{r×L×V}); A Xavier-init, B zero-init. Only these modules train at test time; forecaster frozen (Figure 2).
- **PETSA loss (Eqs. 2–6):** ℒ_PETSA = ℒ_T + ℒ_pt (delayed-full + partial labels); each = Huber (δ = 0.5, Eq. 2) + patch-wise structural ℒ_pw = Σ_{k∈{corr,mean,var}} ℒ_k (Eq. 4) + β·frequency ℒ_freq = ‖FFT(Ŷ^cali) − FFT(Y)‖_1 (Eq. 3, FreDF-style periodicity preservation).
- Adaptation window set from the dominant FFT period (TAFAS convention).

## 4. Equations & assumptions
- X̂^cali = X_{t*} + (tanh(α⊙X_{t*})·W + b); Ŷ^cali = Ŷ_{t*} + (tanh(α⊙Ŷ_{t*})·W + b). (Eq. 1)
- ℒ_Hub: 0.5·e² if |e|<δ else δ(|e|−0.5δ), δ=0.5. (Eq. 2)
- ℒ_freq = ‖ℱ(Ŷ^cali) − ℱ(Y)‖_1. (Eq. 3)
- ℒ_pw = Σ_{k∈{corr,mean,var}} ℒ_k. (Eq. 4)
- ℒ_PETSA = ℒ_T + ℒ_pt; each = ℒ_Hub + ℒ_pw + β·ℒ_freq. (Eqs. 5–6)
Assumptions: partial labels arrive fast enough to matter; dominant-period windowing captures the relevant non-stationarity; low-rank input/output correction suffices (core dynamics unchanged).

## 5. Features / target
Multivariate sensor/economic series (electricity, weather, exchange rates). Target: next-T-step values of the same series.

## 6. Validation design
6 datasets × 6 backbones × 4 horizons; baselines: no-adaptation checkpoint (✗) and TAFAS (full-model TTA, TF). Head-to-head MSE with RW/CW winner counts; parameter/memory comparison (Figures 4–10); ablations on rank r, gating init, loss components/β (Figures 11–13).

## 7. Numerical results / baselines
- **PETSA: 127 best-MSE wins vs TAFAS: 88** (column sums); PETSA wins the row count on nearly every dataset/window (Table 1). Gains hold across transformer, linear, and MLP backbones.
- **Parameter efficiency:** at window 720, PETSA uses 0.21MB vs TAFAS 3.70MB (OLS/ETTh1) — up to **33.6× fewer parameters** (iTransformer/ETTh1, Figure 4) at equal-or-better MSE.
- Ablations: MSE-only or Huber-only loss underperforms the full loss; the frequency term sometimes *hurts* (β = 0 optimal for ETTh1/OLS; β = 0.1 best for FreTS) — β must be tuned per model/dataset (Figure 13).
- Harder datasets (ETTh1/ETTh2) need more adapter memory than easier ones (ETTm1/ETTm2) — efficiency trades against difficulty.

## 8. Code / data availability
https://github.com/BorealisAI/PETSA (PyTorch, built on TAFAS). Datasets: standard public TSF benchmarks.

## 9. Leakage & limitations
- MSE on sensor/economic series ≠ Brier on NFL games; the loss components (especially ℒ_freq) are designed for periodic physical signals — the NFL "period" (weekly season cycle) is far less regular.
- Partial-ground-truth timing is generous in TSF (next-step labels arrive quickly); in NFL, "partial" labels = early-slate results before late games — a 3-hour gap, usable but thin (only ~10 games).
- The paper's ablations show the frequency term can hurt and β needs per-dataset tuning — the loss is not plug-and-play.
- Freezing the forecaster assumes the core dynamics are stable and only calibration drifts; under true regime change (new coaching staff, rule changes) the frozen core is the problem, not the calibration.
- No uncertainty/calibration metrics — MSE only.

## 10. GSE overlap
Per the existing-research map, online/continuous learning was commissioned-but-unfilled — no duplication. This is the lane's *efficiency* paper: 1887–1891 all assume refitting or growing models; PETSA offers the opposite trade — keep the expensive model frozen and adapt a tiny overlay. It composes with 1890's teacher-student framing (the "student" can be exactly this kind of calibration adapter) and 1889's frozen experts (adapters per expert).

## 11. GSE implementation spec
- **Frozen season model + weekly calibration overlay:** freeze GSE's main win-prob model after the preseason fit. Each week, update only a tiny overlay: per-team offensive/defensive adjustment terms (64 parameters) plus 2–3 global calibration parameters (Platt-style slope/intercept on the log-odds) — the low-rank-adapter analog. Update on the previous week's observed games with Huber loss on log-loss residuals (robust to fluke blowouts, per Eq. 2) + a structural term keeping team adjustments mean-zero (the ℒ_pw analog: preserve the league-average structure). Gating analog: scale each team's adjustment by a learned confidence in [0,1] (tanh gate) so noisy early-season data can't yank adjustments.
- **Within-week partial-label adaptation:** Sunday 1pm ET games finish before SNF/MNF — use their outcomes as the "partial ground truth" ℒ_pt to nudge the overlay before the late games (Figure 1's setup, directly applicable). Small sample, so cap the step size.
- **Frequency-term analog:** replace FFT periodicity with a seasonal-structure term penalizing overlay drift from the team's prior-season baseline — preserves the "dominant period" (yearly team identity) the way ℒ_freq preserves periodic signals.
- Serving cost: ~70 parameters updated weekly — negligible; no refit pipeline needed.

## 12. Reproducible test
Dataset: nflverse 2015–2025, game-level features, home-win target; walk-forward 2020–2025. Arms: (A) frozen preseason model, (B) A + weekly overlay (Huber + mean-zero structural), (C) B + Sunday partial-label nudge for late games, (D) full weekly GBM refit (1888 P3, the expensive baseline). Metrics: 1887's 4-metric suite; late-game-only Brier for (C). Gate: (B) must beat (A) on anytime Brier by ≥0.002 (the overlay must earn its keep); (C) must beat (B) on late-game Brier by ≥0.003 over the 2020–2025 sample; (B) is adopted over (D) only if it reaches ≥80% of (D)'s anytime-Brier gain at <5% of the compute — otherwise the refit stands.

## 13. Acceptance / rejection gate
ADOPT the frozen-model + weekly-overlay architecture if on 2020–2025 walk-forward: (i) the overlay (B) beats the frozen model (A) on anytime Brier by ≥0.002 with ECE neutral-or-better, (ii) the overlay captures ≥80% of the full-refit (D) gain (parameter efficiency is the claim), (iii) worst-week Brier is no worse than (D)'s by >0.002. ADOPT the Sunday partial-label nudge (C) if late-game Brier improves by ≥0.003 over (B) across 2020–2025 (small-sample, so demand a real effect). REJECT the frequency/seasonal-structure term if tuning β is knife-edge (paper's own ablation: it sometimes hurts) — keep Huber + structural only. REJECT the overlay entirely if a regime-change season (e.g., 2020 COVID) shows the frozen core failing while the overlay can't compensate — that's the paper's core assumption breaking.

## 14. Improvement experiment
Make the overlay *hierarchical*: team adjustments drawn from division-level and league-level priors (partial pooling), with the gating confidence controlling shrinkage — early season shrinks to league prior, late season trusts team data. This is the Bayesian upgrade of PETSA's flat per-variable gating. Hypothesis: hierarchical shrinkage beats flat gating specifically in weeks 1–4 (when team data is thinnest), measurable as a ≥0.003 Brier improvement over flat (B) in weeks 1–4 across 2020–2025. If confirmed, the overlay becomes GSE's early-season engine.
