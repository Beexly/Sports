# [1529] An Interval–Score ROC Curve for Assessment, Calibration and Ensembling of Probabilistic Forecasts (arXiv:2607.28178)

**Citation:** Simone Milanesi, Marco Capelletti, Flavio Bobba, Giuseppe De Nicolao (2026). *An Interval–Score ROC Curve for Assessment, Calibration and Ensembling of Probabilistic Forecasts.* arXiv:2607.28178v1 [stat.ME]. URL: https://arxiv.org/abs/2607.28178
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv; all sections 1–6 incl. full theorem proofs, both numerical examples, appendices A/B with closed-form tables).
**Verdict:** ADAPT — an actionable diagnostic layer for GSE: IS–ROC curves reveal per-coverage dominance regimes among competing interval forecasters that single scalar scores hide, and the tangent calibration + convex-hull ensembling gives a principled way to select and recalibrate the engine's predictive distributions.

## 1. Research question
How can probabilistic forecasters be compared, calibrated, and ensembled without collapsing the intrinsic trade-off between forecast concentration (sharpness) and predictive accuracy into a single scalar score?

## 2. Dataset / schema
Methodological paper; numerical illustrations only: Example 1 — DGP N(0,1), forecasters Gaussian (oracle), Laplace(0,1), LogNormal(−0.2,1); Example 2 — Bernoulli(0.5) covariate DGP mixing Laplace(0.3,0.6) and N(−0.3,2), forecasters F1, F2, oracle. No real datasets.

## 3. Method / model
- **Tunable Interval Predictor (TIP):** P(β,x)=[l_β(x),u_β(x)] with nesting property and merging at β=1 (point forecast); every predictive distribution induces a TIP via central intervals l_β=q_{β/2}, u_β=q_{1−β/2}.
- **IS–ROC curve:** β ↦ (MS^P(β), MAD^P(β)) — mean interval width vs. mean absolute miss distance.
- **Calibration:** g(α)=argmin_β IS(α,β)=MS(β)+2/α·MAD(β) (Eq. 1); tangent method for convex curves (tangency of iso-score lines slope −α/2); convex hull (Lemma A.1, randomized interpolating forecaster) + step calibration for non-convex curves; quantile-level recalibration τ̃=g(2τ)/2 (τ≤1/2) (Eq. 2) transforms the whole predictive distribution.
- **Ensembling:** global convex hull over the (convexified) curves of competing TIPs — per α pick the TIP minimizing IS(α,g(α)); isotonic regression restores nesting.

## 4. Equations & assumptions
- IS^P(α,β)=MS^P(β)+(2/α)MAD^P(β); iso-score lines MAD=−(α/2)MS+(α/2)IS.
- Thm 2.9/2.10: oracle's IS–ROC curve is Pareto optimal (from IS propriety). Thm 2.11/2.12: it is convex — covariate-free proof via dMAD/dS=−β/2, d²MAD/dS²>0 (quantile-derivative identity dq/dγ=1/f(q(γ))). Thm 2.13: non-uniqueness — symmetric distributions sharing the median generate the same curve (calibration-equivalence).
- Assumes TIP nesting; convex-hull segments need randomized interpolation and step calibration (calibration undefined exactly at the segment's slope).

## 5. Features / target
Interval width S_β(x_i) and absolute miss distance AD_β(x_i,y_i)=(y_i−u_β)_+ +(l_β−y_i)_+ per observation; curves estimated by sample means over β∈(0,1].

## 6. Validation design
Two synthetic examples; closed-form (S,MAD) expressions tabulated for Normal/Lognormal/Exponential/Uniform as functions of both β and s (Appendix B.5); recommended monotone-chain algorithm for hull extraction. No real-data benchmark.

## 7. Numerical results / baselines
- Example 1: Gaussian oracle dominates LogNormal; Gaussian and Laplace curves coincide exactly (Thm 2.13); tangent calibration of the Laplace TIP recovers the true Gaussian predictive distribution visually.
- Example 2: F1 better at small sharpness (median-centered intervals), F2 better at large sharpness; convexified hull strictly improves the combined frontier; step calibration restores the α↔β correspondence along hull segments.
- No scalar metrics reported — graphical/methodological contribution.

## 8. Code / data availability
No code or data links stated; closed-form tables enable reimplementation.

## 9. Leakage & limitations
- No leakage issues (synthetic). But: no real-data validation anywhere in the paper; curve estimates are sample means subject to sampling noise at extreme β (the forbidden triangular region below slope −1/2 from (0,MAD^G(1)) flags impossible frontiers — a useful diagnostic).
- Pareto-optimality non-uniqueness (Thm 2.13) means curves alone cannot identify the distribution — calibration step is required.
- Nesting can break under convexification (isotonic fix proposed but not demonstrated).

## 10. GSE overlap
No prior ledger introduces a graphical dominance framework for forecast comparison; current engine ranking is scalar (CRPS/MAE). This fills the diagnostic gap: competing sub-models may each dominate at different tightness regimes, and single scores average that away.

## 11. GSE implementation spec
- For each engine sub-model producing predictive distributions (spread, total): compute empirical IS–ROC curves on the backtest (β grid of quantile intervals, mean width vs. mean miss distance).
- Compare curves: identify global dominance; if none, build the global convex hull and assign per-coverage-level α the best sub-model (e.g., 80% intervals from model A, 95% from model B).
- Apply tangent calibration g(α) to the selected curve; transform each sub-model's quantile forecasts via Eq. 2 to correct systematic over/under-confidence before publishing.
- Effort: 1 day (pure post-processing of existing backtest outputs).

## 12. Reproducible test
Dataset: engine sub-model predictive distributions 2021–2024, backtest 2025. Plot IS–ROC curves per sub-model for spread and total; check whether curves cross (dominance regimes) and whether the convex-hull per-α selection beats each single sub-model on Winkler/interval score out-of-sample.

## 13. Acceptance / rejection gate
ADOPT IS–ROC calibration as the engine's standard interval-diagnostic if (a) at least one sub-model pair shows crossing curves (regime-specific dominance the scalars hid), or (b) tangent calibration reduces 90% interval score by ≥3% on held-out games; otherwise keep as a diagnostic-only tool.

## 14. Improvement experiment
The paper's proposed-but-untested extension is *conditional* IS–ROC curves (Sec. 6) — implement them conditioned on game-state covariates (home/away, weather bin, playoff implications) and test whether per-regime dominance/calibration beats the pooled calibration. This turns the engine's calibration from one-size-fits-all into regime-aware, directly extending the authors' future-work section.
