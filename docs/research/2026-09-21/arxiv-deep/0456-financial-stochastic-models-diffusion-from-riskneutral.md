# [0456] Financial Stochastic Models Diffusion: From Risk-Neutral to Real-World Measure (arXiv:2409.12783v1)

**Citation:** Ben Alaya, M., Kebaier, A., Sarr, D. (2024). *Financial Stochastic Models Diffusion: From Risk-Neutral to Real-World Measure*. arXiv:2409.12783v1. URL: https://arxiv.org/abs/2409.12783v1
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv HTML→text extract, 7688 lines, incl. appendices).
**Verdict:** REJECT — quantitative-finance measure-change machinery (risk-neutral → real-world) for credit-spread diffusion; no transferable mechanism to GSE's sports-prediction problem.

## 1. Research question
Derivative pricing is done under the risk-neutral (RN, ℚ) measure, but risk management, regulatory stress tests, and forecasting need the real-world (RW, ℙ) measure with risk premia. Can a *generic* framework convert any diffusion model — including non-additive-noise models like CIR++ — from RN to RW via Girsanov's theorem, such that the RW model (1) is arbitrage-free, (2) produces realistic term structures, and (3) exactly fits any arbitrarily given market curve for a chosen maturity?

## 2. Dataset / schema
No public ML dataset. Calibration data: Crédit Agricole credit spreads, survival probabilities, default intensities, cumulative hazard rates as of 2024-01-01 (parameters from Alaya et al. 2024, "global scenario", Table 4, Appendix B). Case studies: (1) Goldman Sachs 2024 Global Credit Outlook Euro-financial credit-spread forecasts (Q4 2023: 201/194/190/187/184 bp across quarters → translated to Crédit Agricole 5Y: 113/109/107/105/103 bp); (2) EBA 2023 EU-wide stress test: +133 bp absolute stress for French financial counterparties rated 1–2 by ECAIs, applied as linear progression over one year. Simulations: 20,000 draws, 1-week time step, 52 steps.

## 3. Method / model
1. **Generic RN→RW framework (Section 2)**: start from RN SDE dY_t = b(Y_t)dt + σ(Y_t)dW_t; eliminate non-additive noise via the Lamperti transform φ(y)=∫ dy/σ(y), giving dX_t = L(X_t)dt + ζdW_t with L = (b/σ − σ′/2)(φ^{−1}(·)). Under ℙ (Girsanov), the transformed process is expressed as a function of (i) the RN expression and (ii) a parametric calibration function α_u. **Theorem 2.1**: the RW process (X*_t) solves dX*_t = [−ϑ[(X*_u − X_u) − α_u]]-type drift-shifted SDE (mean-reverting spread toward the RN path plus the parametric function). **Corollary 2.1.1** (practical form): Y*_t = φ^{−1}(φ(Y_t) + ϑ∫_s^t α_u e^{−ϑ(t−u)} du). Calibrating α_u forces the RW indicator to hit any prescribed curve.
2. **Application (Section 3)**: CIR++ intensity model for default intensity y_t (noncentral chi-square solution); **Theorem 3.1** gives the RW default intensity, **Theorem 3.2** the RW term structure of credit spreads Sp*(t,T), **Theorem 3.3** the RW cumulative hazard rate Λ*(t,T). Pipeline: simulate default intensity under RN → cumulative hazard rate Λ(t,T) = −ln[S(t,T)] via survival probabilities (eq. 23) → infer Λ*(t,T) (eq. 24) → RW credit-spread term structure (eq. 27).
3. **Numerical tests (Section 4)**: Monte Carlo under ℙ for both scenarios; expectation of simulated 5Y spreads "almost exactly matches" targets; term-structure inversion under stress (realistic stressed-market behavior).

## 4. Equations & assumptions
- dY_t = b(Y_t)dt + σ(Y_t)dW_t, Y_0 = y (eq. 1); Lamperti X_t = φ(Y_t), dX_t = L(X_t)dt + ζdW_t (eq. 2).
- Theorem 2.1: RW drift = −ϑ[(X*_t − X_t) − α_t] (mean-reversion to RN path shifted by α).
- Corollary 2.1.1: Y*_t = φ^{−1}(φ(Y_t) + ϑ∫_s^t α_u e^{−ϑ(t−u)} du) (eq. 9).
- Λ(t,T) = −ln[S(t,T)]; credit spreads from cumulative hazard rates via eqs. 24/27/28.
Assumptions: locally Lipschitz b, σ with 1/σ locally integrable; σ ∈ C¹ for Lamperti; Girsanov (Novikov) conditions for the measure change; CIR Feller condition for intensity positivity; the parametric α_u can be calibrated to hit arbitrary targets (demonstrated numerically, not proven in general).

## 5. Features / target
Inputs: calibrated CIR++ parameters, initial credit spreads/survival probabilities. Targets: prescribed cumulative-hazard-rate values c_i per time step (forecast or stress values); outputs: full RW term structure of credit spreads and its expectation/10th/90th percentiles.

## 6. Validation design
Two Monte Carlo case studies (20,000 draws each, weekly steps, 52 steps): (1) forecast scenario — GS 2024 forecasts translated to Crédit Agricole 5Y targets (113→103 bp); (2) stress scenario — EBA +133 bp linear ramp. Validation is qualitative: simulated expectation "almost exactly matches" the target curve; term-structure shapes judged "realistic" (incl. inversion under stress, with market examples in Appendix). No statistical test, no holdout, no comparison against alternative RW methods (e.g., Esscher transform of Barker et al. 2016).

## 7. Numerical results / baselines
- Forecast scenario: expectation of simulated 5Y spreads matches targets 113/109/107/105/103 bp "almost exactly"; 10th–90th percentile bands encompass the expectation; whole term structure shifts down realistically.
- Stress scenario: targets c_i = 113 + 133·t_i (bp); expectation again fits "almost perfectly"; term structure inverts as stress increases — matches observed stressed-market behavior.
- No baselines, no error metrics (no RMSE/MAE reported — fit is by construction through α_u calibration, so numerical error is a calibration residual, unquantified).

## 8. Code / data availability
None stated. (EBA 2023 stress test is public; GS forecasts are a commercial report; Crédit Agricole spread data from Alaya et al. 2024.)

## 9. Leakage & limitations
- The "exact fit to any curve" is by construction (α_u is calibrated to the targets) — the numerical results demonstrate the calibration machinery works, not predictive skill. There is no out-of-sample forecasting test.
- Single-issuer (Crédit Agricole), single-maturity (5Y) demonstration; generality across the "wide range of models" claimed is asserted via the general theorem, not demonstrated.
- CIR++ intensity parameters taken as given from a companion paper; sensitivity to miscalibrated RN parameters unexamined.
- EBA stress applied as a linear 1-year ramp "for the sake of illustration" — regulators require instantaneous stress; the paper's version is a toy.
- No comparison with existing RW approaches (Berninger & Pfeiffer 2021 G2++; Barker et al. 2016 Esscher/minimum-entropy).
- **No sports content whatsoever**; the RN/RW distinction has no GSE analogue — GSE models real-world outcome probabilities directly from data and compares against market prices, with no risk-neutral pricing layer to convert from.

## 10. GSE overlap
**No overlap — out of domain.** The existing-research map's finance-adjacent entries are market-microstructure/odds-movement papers, not measure-change theory. The one abstractly similar idea — "convert market-implied probabilities to true probabilities" — is handled in GSE by de-vigging/calibration, which is a static transformation, not a diffusion measure change. The Girsanov/Lamperti/CIR++ machinery answers a question GSE never asks (how to simulate realistic term structures of a risk indicator under ℙ given an RN pricing model). Not a duplicate, extension, or new capability for a sports-betting engine.

## 11. GSE implementation spec
None — rejected. No component (Lamperti transform of a default-intensity diffusion, cumulative-hazard-rate curve fitting, EBA stress scenarios) has an NFL input or output.

## 12. Reproducible test
N/A (rejected). A domain-faithful check would be: implement Corollary 2.1.1 for a CIR intensity, calibrate α_u to the GS 2024 targets, and confirm the Monte Carlo expectation matches 113/109/107/105/103 bp — i.e., verify the authors' calibration claim. This validates quant-finance machinery with no GSE application, so it was not run.

## 13. Acceptance / rejection gate
**Rejected at triage.** Gate that would reverse this: GSE launches a derivative-pricing or risk-management product on its own bankroll (e.g., pricing structured sports bets / portfolio VaR under ℙ with ℚ-calibrated inputs) — then revisit for the generic RN→RW conversion theorems. Until then, no action.

## 14. Improvement experiment
Within its own domain: replace the illustrative linear EBA ramp with the regulator's actual instantaneous stress and test whether the α_u calibration still yields a realistic (non-oscillating) term structure; benchmark against the Esscher-transform RW simulation of Barker et al. (2016) on the same Crédit Agricole data with a proper divergence metric (e.g., KL between simulated and historical spread distributions). Not a GSE experiment.
