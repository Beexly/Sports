# [1528] Halo: Improving Forecast Accuracy through Heteroscedastic Estimation (arXiv:2609.10589)

**Citation:** Adam Cataldo (2026). *Halo: Improving Forecast Accuracy through Heteroscedastic Estimation.* arXiv:2609.10589v1 [cs.LG]. URL: https://arxiv.org/abs/2609.10589
**Ledger completed:** 2026-09-21. **Read:** full text (PDF via pdftotext; abstract, related work, full Halo method, 4 result tables, conclusion, references, implementation appendix).
**Verdict:** ADAPT — a cheap, architecture-agnostic way to make the engine's point predictions better by forcing them to learn uncertainty: give any existing deep forecaster a scale head and train under matching NLL. Point gains are free on top of the uncertainty layer.

## 1. Research question
Does heteroscedastic estimation (location + scale heads trained under negative log likelihood) improve the *point* estimate of a deep time-series forecaster — not just quantify uncertainty?

## 2. Dataset / schema
Five electricity price forecasting (EPF) markets (Lago et al. 2021 benchmark): Nord Pool, PJM, Belgian, French, German EPEX SPOT — day-ahead electricity prices with diverse exogenous signals. Three base models: TimeXer (transformer, MSE/Gaussian), GCGNet (GNN+VAE, MAE/Laplacian), CrossLinear (single-layer CNN, MSE/Gaussian). Chronological train/validation/test; Apple M2 Max, ≤50 epochs, early stopping patience 5.

## 3. Method / model
Halo = take an existing deep forecaster, add a second output for the scale of its implied distribution (softplus for positivity), train under the matching NLL. Two wirings: dual-head (second projection from the same learned representation) and full parallel network. Gaussian case trained with β-NLL (Seitzer et al. 2022, Eq. 7, β=0.5 fixed, stop-gradient stabilization); Laplacian case with standard NLL. Handles nonstationarity adjustment conflict: Series Standardization scale v must rescale both heads (â=â'v+m, b̂=b̂'v).

## 4. Equations & assumptions
- MSE ≡ Gaussian NLL with constant variance (Eq. 5); MAE ≡ Laplacian NLL with constant scale (Eq. 6); heteroscedastic models learn per-sample σ̂_i or b̂_i.
- β-NLL = (1/2N)Σ sg(|σ_i|)log(σ_i²) + (1/2N)Σ sg(|σ_i|)(y_i−μ_i)²/σ_i² (Eq. 7), same optimum as NLL with stabler backprop.
- Assumes location–scale family; scale head interacts with any input-standardization layer; no future exogenous inputs (deliberate anti-leakage choice).

## 5. Features / target
Endogenous history x_endo (lookback T) + exogenous channels x_exo; target next-H day-ahead prices.

## 6. Validation design
Baselines with author-tuned hyperparameters vs. Halo variants (untuned and retuned); both MSE and MAE metrics under each architecture (parallel vs. dual-head); separate test holdout after tuning; validation-set full-NLL comparison for distribution choice.

## 7. Numerical results / baselines
- Halo improves MSE and MAE in 28 of 30 model–market–metric comparisons; every model's market-average improves on both metrics.
- Average MSE cut 2.6%–16.5%, average MAE cut 1.7%–11.0% (per model).
- Finding 1: dual-head vs. parallel within ~1.5% of each other on both models — what matters is estimating scale at all; dual-head preferred (half the parameters).
- Finding 2: retuning helps in 2/5 markets, hurts in 3/5; test averages within 0.5% — retuning optional.
- One exception: TimeXer on DE market (baseline MSE 0.4527 beats Halo-tuned 0.4790).
- Reconciles Stirn et al. (2023): heteroscedastic point-estimate gains appear when data carry time-varying volatility (electricity prices do; their small non-time-series models did not).

## 8. Code / data availability
No code link stated; implementation appendix details compute stack. EPF benchmark data public (Lago et al. 2021).

## 9. Leakage & limitations
- No leakage in the headline experiments (future exogenous deliberately excluded despite GCGNet default using them; chronological splits; retuning only on validation).
- Every number is a single training run; no variance across seeds reported — the 28/30 and percentage ranges carry unquantified run-to-run noise.
- Electricity prices only; five markets; horizons not varied systematically. "Testing Halo on other benchmarks and horizons, and across seeds, is the next step" (author's own).

## 10. GSE overlap
Existing research map has heteroscedastic uncertainty work but no result showing that *adding a scale head improves point accuracy itself*. This is new: a justification for upgrading the engine's deep components from point heads to (location, scale) heads — you get uncertainty quantification AND better points for one training change.

## 11. GSE implementation spec
- For each engine deep component currently emitting point predictions (spread, total): add a dual-head scale output with softplus, train under β-NLL (Gaussian) — no retuning required per finding 2.
- Sports carry exactly the time-varying volatility the paper's reconciliation hypothesis needs (garbage-time blowouts, weather-affected games, late-season rest games), so the point-estimate gain mechanism should transfer.
- Effort: 1–2 days per component (dual-head wiring + loss swap; retuning optional).

## 12. Reproducible test
Dataset: engine features 2021–2024 with 2025 held out; metric MSE/MAE vs. current point heads on spread and total; also check 90% coverage of the implied (μ̂, σ̂²) intervals. Expect a few-percent MSE reduction and valid-ish intervals per the paper; run ≥3 seeds to fix the paper's no-seed-variance gap.

## 13. Acceptance / rejection gate
ADOPT dual-head Halo on any engine component where β-NLL training cuts held-out MSE by ≥2% across ≥3 seeds AND the scale head's intervals show monotone coverage behavior (wider scale ↔ higher |error| rank correlation >0.3); reject the component wiring if no gain survives multi-seed testing.

## 14. Improvement experiment
The paper never tests heteroscedastic *ensemble* combination — train Halo heads on each of GSE's existing sub-models, then pool the resulting (μ, σ) pairs as a heteroscedastic mixture (inverse-variance-ish or learned weights) and test whether the pooled point estimate beats both the pooled deterministic ensemble and each member's Halo estimate — extending the paper's single-model claim to the ensemble setting GSE actually runs.
