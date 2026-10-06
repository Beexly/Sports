# [2167] T-SHRED: Symbolic Regression for Regularization and Model Discovery with Transformer Shallow Recurrent Decoders (arXiv:2506.15881v3)

**Citation:** Alexey Yermakov, David Zoro, Mars Liyao Gao, J. Nathan Kutz (2026). *T-SHRED: Symbolic Regression for Regularization and Model Discovery with Transformer Shallow Recurrent Decoders*. arXiv:2506.15881v3. URL: https://arxiv.org/abs/2506.15881
**Ledger completed:** 2026-09-22. **Read:** full text (ar5iv HTML).
**Verdict:** ADAPT — embeds symbolic regression directly inside transformer attention heads as a trainable regularizer, so each head learns an interpretable coupled ODE for the latent dynamics; the blueprint for an interpretable neural momentum/forecasting model for GSE.

## 1. Research question
SHRED (shallow recurrent decoder) models reconstruct full spatio-temporal states from sparse sensors, but their RNN encoders don't exploit transformer advances — while vanilla transformer attention just queries historical patterns rather than learning physical laws. Can we (a) build a transformer-based SHRED (T-SHRED) that scales to large datasets, and (b) force each attention head to learn structured, interpretable latent dynamics by embedding SINDy symbolic regression *inside* the attention mechanism itself (SINDy-Attention), rather than as a post-hoc analysis?

## 2. Dataset / schema
Three dynamical systems, low- to high-data regimes; 50 random persistent sensors as input, temporal lag 50, next-step full-state prediction; 80/10/10 time splits:
- **Sea Surface Temperature** (NOAA): 1,400 weekly snapshots 1992–2019, 180×360 grid (44,219 ocean points), 179 MB, min-max normalized to [0,1].
- **Complex plasma physics**: 2,000 timesteps × 14 fields of 257×256 points, rSVD-reduced to a 280-dim ROM, 785 MB.
- **Rotating shallow water equations (PlanetSWE, from "The Well")**: ∂u/∂t = −u·∇u − g∇h − ν∇⁴u − 2Ω×u; ∂h/∂t = −H∇·u − ∇·(hu) − ν∇⁴h + F (Eqs. 15–16); 10 tracks, 15.5 GB total.
Code: https://github.com/yyexela/T-SHRED. All data public (NOAA; plasma [31]; The Well [44]).

## 3. Method / model
**T-SHRED** = SHRED with transformer encoder (replacing LSTM) + MLP or CNN decoder. **SINDy-Attention** (the core novelty): standard MHSA computed per head (Eqs. 2–5), then each head's attention output T^(h) is passed through a SINDy library Θ_SINDy and sparse coefficients Ξ^(h): S^(h) = Θ_SINDy(T^(h)′)Ξ^(h) (Eq. 12), concatenated across heads and fed through the FFN (Eqs. 13–14). Grounded in the result that attention can be written as a system of ODEs (Eq. 9, Geshkovski et al. 2024). Training: ℓ₂ + pruning on Ξ^(h) every 10 epochs (approximation of the ℓ₀ SINDy loss, Eq. 1 with forward-Euler mini-steps). After training, each head is readable as a coupled ODE over the latent space. The paper also studies plain SINDy-loss regularization (loss term only, no architectural change) and CNN vs MLP decoders. Interpretability experiment: latent dim shrunk 100 → 6, 2 layers × 2 heads, linear polynomial library (Koopman SINDy-Attention), 200 epochs.

## 4. Equations & assumptions
- SINDy latent loss: Ξ^(i) = argmin ‖z_{t+1} − (z_t + Σ Θ(z_{t+ih})Ξ^(i)h)‖²₂ + ‖Ξ^(i)‖₀ (Eq. 1).
- Standard attention (Eqs. 2–7); CNN decoder y = σ(Conv₁(σ(Conv₂(z)))) (Eq. 8); attention-as-ODE formulation (Eq. 9).
- SINDy-Attention: Q^(h)=xW_{h,q}, K^(h)=xW_{h,k}, V^(h)=xW_{h,v} (Eq. 10); T^(h)=rowsoftmax(QKᵀ/√k)V (Eq. 11); S^(h)=Θ_SINDy(T^(h)′)Ξ^(h) (Eq. 12); S=concat(S^(h)) (Eq. 13); z=(SW_ff1)W_ff2 (Eq. 14).
- Shallow-water ground truth (Eqs. 15–16); separation-of-variables motivation u(x,t)=T(t)X(x) for SHRED.
- Assumptions: Takens-embedding regime (lag 50 suffices); sensors fixed in space; ℓ₂+pruning ≈ ℓ₀ under regularity conditions.

## 5. Features / target
Inputs: time series of 50 sparse sensor measurements (lag-50 windows). Targets: next-step full state (SST field; plasma fields — azimuthal E-field, electron density, ion temperature; shallow-water velocity/height fields). Latent space: 100-dim (experiment 1), 6-dim (experiment 2).

## 6. Validation design
Experiment 1: 8 encoders (GRU/LSTM/vanilla-transformer/SINDy-loss-transformer/SINDy-attention-transformer/SINDy-attention+loss) × 2 decoders (MLP/CNN) × layers {1–4} × lr {1e-2, 1e-3} = 128 configs per dataset, 5 seeds, best-by-validation reported as mean±std test loss. Experiment 2 (interpretability): one SINDy-Attention T-SHRED per dataset, coefficients printed as ODEs. Baselines: GRU/LSTM SHRED variants (same protocol).

## 7. Numerical results / baselines
- **SST:** best overall = 1-layer GRU SHRED + MLP decoder, test loss **1.50×10⁻³** (25.14 MB); best T-SHRED = 1-layer SINDy-Attention + CNN decoder, **1.87×10⁻³** (75.31 MB).
- **Plasma:** best = 3-layer GRU SHRED + MLP, **2.10×10⁻⁴** (0.74 MB); best T-SHRED = SINDy-Attention + CNN, **4.90×10⁻⁴** (1.23 MB).
- **PlanetSWE:** best = 1-layer SINDy-loss GRU SHRED + MLP, **2.49×10⁻³** (151.86 MB); best T-SHRED = SINDy-Attention + CNN, **3.58×10⁻³** (452.52 MB).
- Within T-SHRED, SINDy-Attention (SA-T, SASL-T) beat all other transformer variants on all three datasets; CNN decoders paired best with transformer latents.
- Interpretability run: latent 100→6 cost only ~2× test loss on PlanetSWE (7.76×10⁻³) while model size fell 16× (28.51 MB vs 452.52 MB) and every head emitted a readable 3-variable linear ODE (e.g. SST L₀H₀: ż₀=−0.699z₀+0.275z₂, etc.).
- Honest headline: transformers still lose to GRUs on next-step state prediction (consistent with prior literature [14, 58]) — the win is interpretability + SINDy-Attention dominance among transformer variants.

## 8. Code / data availability
Code: https://github.com/yyexela/T-SHRED. Datasets public: NOAA SST, plasma dataset [31], The Well PlanetSWE [44].

## 9. Leakage & limitations
Adversarial notes: (a) The headline result is negative for transformers — GRU-SHRED won all three datasets; the paper's real contribution is the regularization mechanism, not SOTA forecasting. (b) ℓ₂+pruning is only an approximation of ℓ₀ SINDy; the "interpretable ODEs" inherit that approximation. (c) The linear polynomial library in experiment 2 (Koopman) restricts discovered dynamics to linear ODEs — readable but expressively limited; nonlinear libraries were not shown at latent-6. (d) 128 configs × 5 seeds × 3 datasets is heavy tuning; best-model selection on validation is fine but the T-SHRED-vs-GRU gap may partly reflect tuning effort. (e) Sensors are fixed/random — no sensor-placement optimization. (f) For GSE: sports "sensor" data is nothing like gridded PDE fields; the mapping is conceptual (sparse observations → full game-state), not direct.

## 10. GSE overlap
GSE has no interpretable neural forecasting model — the engine's neural components are black boxes, and ledger 2162's SymTorch distills them only post-hoc. T-SHRED is the *during-training* alternative: bake symbolic dynamics into the architecture so interpretability is a training objective, not an autopsy. No GSE work embeds SR as a network regularizer. The direct sports analog: a "GameSHRED" model that takes sparse observations (a handful of box-score/team-stat sensors per week) and predicts next-week full game state, with attention heads constrained to learn symbolic momentum/injury/rest dynamics — an interpretable alternative to the black-box engine components.

## 11. GSE implementation spec
1. Build GameSHRED: input = lag-8 weekly "sensor" vector per team (EPA margin, success rate, explosive-play rate, turnover luck, rest days — ~10 sensors, the sports analog of sparse measurements); transformer encoder with SINDy-Attention heads (library: linear + quadratic terms in sensor latents + Fourier terms for season periodicity); shallow MLP decoder to next-week full team-state (predicted EPA, predicted spread vs market).
2. Train on 2015–2024 nflverse weekly team data; latent dim 6–10; ℓ₂+pruning on Ξ^(h) every 10 epochs per the paper.
3. Read out each head's ODE as GSE's "momentum laws" — e.g. a head might learn ṁ = −0.3m + 0.5·rest_advantage (mean-reverting momentum), published as interpretable findings.
4. Compare forecast accuracy (Brier/MAE on spreads) vs the engine's black-box components; the interpretability is the product even at parity accuracy.
Effort: ~2 weeks (adapt open T-SHRED code to tabular sports data; no PDE machinery needed). No new data cost.

## 12. Reproducible test
Dataset: 2015–2024 nflverse weekly team stats; test = 2025 season. Metric: MAE on next-week point spread and Brier score on win prob vs (a) GRU-SHRED equivalent (the paper's own finding that RNNs win), (b) the engine's current neural forecaster. Interpretability check: ≥ 2 of the learned head-ODEs must be human-readable (≤ 4 terms each) and stable across 3 seeds (coefficient cosine similarity ≥ 0.8).

## 13. Acceptance / rejection gate
**ADOPT if:** GameSHRED's spread MAE is within 0.5 points of the engine's neural forecaster on 2025 AND ≥ 2 heads yield stable, human-readable ODEs (stability criterion above) AND total model size < 100 MB (keeps the SHRED efficiency story). **REJECT if:** forecast MAE trails the engine by > 1.0 point, or learned ODEs are seed-unstable (cosine < 0.5), or SINDy-Attention collapses to dense coefficients (pruning fails — interpretability void). Gate pre-registered.

## 14. Improvement experiment
Beyond the paper: **cross-team SINDy-Attention with shared heads** — the paper trains one model per dynamical system; for NFL, train a single GameSHRED across all 32 teams with *team-agnostic* SINDy-Attention heads (shared Ξ) but team-specific sensor embeddings. This tests whether there exist universal symbolic "laws of football momentum" (e.g. a shared mean-reversion ODE) vs team-specific dynamics. If shared heads match team-specific accuracy within 0.2 spread-MAE points, GSE can publish genuinely universal equations of NFL team dynamics — the "F = ma" of football — which is a far stronger content and product asset than 32 bespoke models.
