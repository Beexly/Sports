# [1154] Bounded-Abstention Multi-horizon Time-series Forecasting (arXiv:2602.04714)

**Citation:** Luca Stradiotti, Laurens Devos, Anna Monreale, Jesse Davis, Andrea Pugnana (2026). *Bounded-Abstention Multi-horizon Time-series Forecasting*. arXiv:2602.04714v1 [cs.LG], KU Leuven / Univ. of Pisa / Univ. of Trento. URL: https://arxiv.org/abs/2602.04714
**Ledger completed:** 2026-09-21. **Read:** full text (main, 10 pages) plus appendices A–E in full (proofs of Thms. 1–3, continuity discussion, PAbFor/IntAbFor pseudocode, dataset table, extended results tables).
**Verdict:** ADAPT
Not the multi-horizon structure (GSE predicts single games, not horizons), but the *exact-coverage selection machinery*: the Lagrangian γ reward-per-accepted-pick calibrated by binary search on a calibration set to hit a target posting coverage exactly (with probabilistic mixing on ties). That is a principled replacement for fixed pick-posting thresholds.

## 1. Research question
Standard abstention treats each prediction independently, producing fragmented forecasts in multi-horizon settings. Can we formalize bounded abstention (minimize selective risk subject to a coverage constraint) for three structured abstention modes — full (accept/reject whole horizon), partial (accept prefix 1..e), interval (accept any contiguous s..e) — derive the optimal selection function for each, and learn it from data?

## 2. Dataset / schema
24 public time-series datasets (Table 2, App. D): 5 real-world (eeg: 38,400 trials×channels series, T=40/H=10; covid: 380 UK local-authority series, T=100/H=10; temperature: 832 US locations, T=698/H=30; ERA5: 2,048 grid locations, T=358/H=7) + 19 UCR benchmark datasets (UCR targets removed, forecasting horizons H ∈ [6, 50]). Min-max normalization; 60/20/20 train/calibration/test split; 10 random seeds. Schema: exchangeable series y_{1:T}, past observed, future y_{T+1:T+H} to forecast.

## 3. Method / model
**Formulation:** selective forecaster m = (f, g); g(y_{1:T}) = (s,e) selects accepted interval. Selective risk R(f,g) = E[Σ_{t=T+s}^{T+e} ℓ(y_t, f_t)] / E[e−s+1]; constraint: average accepted steps φ(g) ≥ cH.

**Theory:** optimal full-abstention rule (Thm. 1): accept iff Σ_t ρ_t(y) < τ_c, where ρ_t is conditional risk and τ_c is the c-quantile of the summed conditional-risk distribution (with randomized tie-break κ). Optimal partial rule (Thm. 2): e* = argmin_e [Σ_{t=T+1}^{T+e} ρ_t − γ*e], γ* = λ* + η* (optimal risk + KKT multiplier); accept an extra step iff its marginal risk < γ*. Optimal interval rule (Thm. 3): (s*,e*) = argmin_{s,e} [Σ_{t=s}^{e} ρ_t − γ*(e−s+1)].

**Learning (FAbFor / PAbFor / IntAbFor):** two-headed network — one MLP head predicts H steps, the other predicts H conditional variances σ̂²_t — trained jointly with β-NLL loss. Coverage enforced on a separate calibration set: empirical c-quantile (FAbFor) or binary search for γ̂ bounds with randomized mixing to hit coverage exactly (PAbFor/IntAbFor, eqs. 9–10; App. C Algorithms 1–2 pseudocode: binary-search γ on D_calib, then mix the γ̂_ℓ/γ̂_r policies with probability p = (cH − φ̂_{γ̂r})/(φ̂_{γ̂ℓ} − φ̂_{γ̂r})). **Theory (App. A):** Lemma 1 — minimizing the fractional objective R(e)=N(e)/D(e) ⇔ minimizing the linearized parametric problem N(e)−λ*D(e); Lemma 2 — the per-sequence optimal end step e(γ)=argmin_e[r_{1:e}−γe] is non-decreasing in γ, so binary search on γ hits the coverage target; Theorem 3 — interval abstention reduces to a two-step optimization (best start for each length, then best length); App. B notes the continuity assumption is handled by the randomized policy, which held up in empirical evaluation.

## 4. Equations & assumptions
- Selective risk (eq. 2): R(f,g) = E[Σ_{t=T+s}^{T+e} ℓ(y_t,f_t(y))] / φ(g), φ(g) = E[e−s+1].
- Objective (eq. 3): g* = argmin_g R(f,g) s.t. φ(g) ≥ cH.
- β-NLL loss (eq. 8): L = Σ_t s(σ̂^{2β}_t)( log σ̂²_t / 2 + (y_t − f̂_t)² / (2σ̂²_t) ), β = 0.5 in experiments; s(·) = stop-gradient.
- Partial selection (eq. 11): ĝ_PA(y) = (1, argmin_{e∈{0..H}} [Σ_{t=T+1}^{T+e} σ̂²_t − γ̂e]).
- Coverage satisfaction (eq. 12): ConSat(ε) = 1{φ̂(ĝ)/H ≥ c − ε}.
- **Assumptions:** exchangeability across series (no time-step dependence assumptions); all H predictions produced simultaneously (no autoregression); conditional risk = conditional variance (MSE loss); absolutely-continuous risk vector (Thms. 2–3).

## 5. Features / target
Features: raw series y_{1:T}. Targets: future values y_{T+1:T+H} + their conditional variances (learned as auxiliary regression of squared residuals).

## 6. Validation design
6 coverage levels c ∈ {0.70,…,0.95}; baselines: AdaptiveCF (sum of conformal-interval widths), MQ-RNN (multi-quantile, q=0.05), DP-RNN (MC dropout, 100 samples), Accept-cH (naive first-cH-steps). Backbone fixed: 1-layer LSTM (20 hidden) + MLP heads (40 neurons, ReLU); 500 epochs, Adam 0.001. Metrics: selective risk per accepted step, ConSat coverage satisfaction. 10 seeds.

## 7. Numerical results / baselines
- FAbFor beats baselines on **22/24 datasets**; average selective-risk reduction **14% vs AdaptiveCF/MQ-RNN, 19% vs DP-RNN**; wins ~80% of experiments vs the two runners-up.
- Hierarchy of control (Table 1 avg. ranks, lower=better): IntAbFor ≈1.54–1.64, PAbFor ≈1.65–1.73, FAbFor ≈2.58–2.79, Accept-cH ≈3.85. PAbFor −7% risk vs FAbFor; IntAbFor −2% further vs PAbFor. On ITpower/sonyaiborobot IntAbFor sets s>1 for ~40% of series (uncertainty not always front-loaded).
- Coverage: PAbFor/IntAbFor satisfy ConSat best (except the constraint-by-construction Accept-cH); all methods meet coverage at tolerance ε ≥ 0.05.

## 8. Code / data availability
Datasets public (Table 2). No code link in the text I read.

## 9. Leakage & limitations
- **Exchangeability assumption** across series is strong; in sports, games are not exchangeable (opponent strength, injuries, rest).
- **Contiguity has no sports analogue:** partial/interval abstention exploits horizon structure that doesn't exist in GSE's slate-of-independent-games setting. Only full abstention's machinery transfers.
- Joint forecaster+variance training is "context-dependent" per the authors; novelty (not ambiguity) rejection is future work — in sports, regime novelty (new QB, coaching change) is exactly when abstention matters most.
- Baselines are all uncertainty-score variants; no comparison against selective-prediction classics (e.g., SelectiveNet, deep gamblers).
- Results are all on the authors' 24-dataset suite; App. E gives full numeric tables (Tables 3–4) for Q1 (FAbFor vs AdaptiveCF/DP-RNN/MQ-RNN) and Q2 (PAbFor/IntAbFor vs FAbFor vs Accept-cH) plus Critical Difference diagrams confirming FAbFor's significance — the headline percentages/ranks in §7 are backed by these tables.

## 10. GSE overlap
Existing-research map gap item 4 (coverage-constrained selective loss). Ledgers 1150/1151 gave GSE threshold rules; this paper adds the **exact-coverage calibration layer** those lack: binary-search γ on a calibration set + randomized mixing to hit a target posting coverage *exactly*, rather than hoping a fixed threshold lands there. Extension of the same lane, not a duplicate.

## 11. GSE implementation spec
1. **Weekly pick posting as bounded abstention:** fix target coverage c = fraction of slate games GSE posts (e.g., c=0.5 → post ~half the games). For each game compute engine edge/confidence score; calibrate τ̂_c as the empirical c-quantile of the score on a rolling calibration window (last N weeks); post games with score below/above τ̂_c (risk < τ̂_c). Use the probabilistic tie-break only if needed.
2. **γ-formulation alternative:** post game iff marginal expected loss < γ, binary-searching γ on the calibration set to hit coverage c exactly — this generalizes the quantile rule when games have heterogeneous stakes (e.g., primetime vs early slate).
3. **Two-headed uncertainty (optional):** attach a variance head to the selection model trained with β-NLL (eq. 8, β=0.5) so the abstention score is a learned conditional variance, not a hand-built confidence.
4. **Effort:** ~2 days for the quantile/threshold calibration layer (pure post-processing of existing engine scores); +2 days for the variance head.

## 12. Reproducible test
Dataset: GSE graded-picks history, chronological. For c ∈ {0.3, 0.5, 0.7}: calibrate τ̂_c on weeks 1–W, evaluate selective ROI and *realized* coverage on weeks W+1 onward. Baseline: fixed hand-set threshold. Success = realized coverage within ±0.05 of c (ConSat analogue) with selective ROI ≥ baseline at matched realized coverage.

## 13. Acceptance / rejection gate
ADAPT the calibration layer iff realized posting coverage lands within 0.05 of target c across ≥3 consecutive weeks *and* selective ROI at that coverage is ≥ the fixed-threshold baseline. REJECT the partial/interval machinery (no horizon structure in GSE slates) and REJECT joint variance-head retraining unless the plain quantile rule on existing engine scores fails the gate.

## 14. Improvement experiment
Make c **adaptive to slate quality**: instead of fixed c, set c_w = c_base + α·(mean calibration-set edge) — post more games in high-edge weeks, fewer in low-edge weeks, while keeping *season-average* coverage at c. This beats the paper's fixed-c (which is coverage-rigid by design) because sports slates have strongly varying information content week to week. Test: season-average coverage within 0.05 of c with selective ROI ≥ fixed-c.
