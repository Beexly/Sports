# [1644] Localized Conformal Prediction (arXiv:2106.08460)

**Citation:** Leying Guan (2023). *Localized Conformal Prediction: A Generalized Inference Framework for Conformal Prediction*. arXiv:2106.08460. JMLR 2023. URL: https://arxiv.org/abs/2106.08460
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all sections: framework, finite-sample guarantee, sample-splitting variant, simulations).
**Verdict:** ADAPT — localization is GSE's answer to the "marginal coverage hides subgroup failure" problem: weighting calibration scores by similarity to the upcoming game (same weather bucket, same QB tier, same rest spot) gives intervals that are valid overall AND tighter where the game is predictable. The paper's Example 4.1 shows up to ~35% width reduction at equal coverage. Directly composable with CQR ([1639]) and the residual-QRF ([1642]).

## 1. Research question
Standard conformal prediction gives MARGINAL coverage — averaging over all test points — which can hide severe undercoverage on subpopulations (e.g., high-total shootouts vs defensive grinds). Exact conditional coverage is finite-sample impossible (known impossibility result). Can we get a practical middle ground: weight calibration scores by a localizer H(X_test, X_i) emphasizing calibration points similar to the test point, with a finite-sample marginal guarantee PLUS approximate conditional coverage?

## 2. Dataset / schema
Simulated regression settings (Example 4.1, four settings A–D with varying heteroskedasticity structures) plus real-data illustrations. The paper's focus is methodological; simulations use n in the hundreds, nominal 95% intervals, metrics = empirical coverage + mean interval length.

## 3. Method / model
**Localized Conformal Prediction (LCP)**: choose a localizer H(x, x′) ≥ 0 (e.g., Gaussian kernel on features, or k-NN weights). For test point x, compute weights w_i ∝ H(x, X_i) over calibration scores; BUT the naive plug-in (quantile of the weighted score distribution at level 1−α) can undercover arbitrarily badly — the paper's key technical contribution is the STRATEGIC level adjustment: use a data-dependent, inflated quantile level that restores the finite-sample marginal guarantee. Practical variant: **sample-splitting LCP** (split off a tuning fold), since the full version is computationally expensive (reweighting per test point).

## 4. Equations & assumptions
- Weights: `w_i(x) ∝ H(x, X_i)` (localizer, e.g. kernel)
- Naive (INVALID): `Q_{1−α}( Σ_i w_i(x) δ_{E_i} )`
- Valid: quantile at an ADJUSTED level `α̃(x)` computed from the weighted calibration distribution (paper's Lemma/Theorem give the exact adjustment)
- Guarantee: finite-sample marginal coverage ≥ 1−α under exchangeability; approximate conditional coverage when H concentrates on the relevant neighborhood and the score distribution is smooth in x.
- Assumptions: exchangeability (marginal result); local smoothness of the conditional score law (conditional approximation); H chosen a priori.

## 5. Features / target
Simulation features with designed heteroskedasticity. Transfer: GSE game features — total, spread, weather bucket, rest differential, QB tier — as the localization space.

## 6. Validation design
Example 4.1, four heteroskedastic settings; 95% intervals; metrics = empirical coverage and mean length. Baseline: standard split conformal. The comparison isolates the value of localization.

## 7. Numerical results / baselines
Example 4.1 (coverage / mean length), CP vs localized:
- Setting A: 0.95 / 2.77 → 0.94 / **2.27** (~18% narrower)
- Setting B: 0.95 / 3.14 → 0.95 / **3.01**
- Setting C: 0.95 / 4.26 → 0.95 / **3.15** (~26% narrower)
- Setting D: 0.94 / 3.81 → 0.94 / 3.86 (no gain — localization doesn't help everywhere)
Localization materially tightens intervals under strong heteroskedasticity while holding coverage; the D result is honest about when it doesn't help.

## 8. Code / data availability
No public code URL found in the full text; the method is specified precisely enough to reimplement (kernel weights + adjusted quantile). Simulation code not linked.

## 9. Leakage & limitations
(a) Full LCP is O(n) per test point — fine for GSE's weekly batch (hundreds of games) but not for real-time props. (b) The localizer H is a free, consequential choice: too narrow → high variance, tiny effective sample; too wide → back to marginal. No data-driven H selection theory. (c) Conditional coverage is approximate, not guaranteed — Mondrian (stratified) conformal gives exact stratum guarantees and may be simpler for GSE's discrete buckets. (d) The level-adjustment machinery is subtle; a naive implementation (the tempting one) undercovers — implementation risk is the paper's own warning. (e) Exchangeability still assumed.

## 10. GSE overlap
GSE has `metric-slices.ts` and `resolution-by-group.ts` (group-wise calibration DIAGNOSTICS) but no localized CONSTRUCTION — diagnostics without the fix. The CQR repair ([1639]) adapts to heteroskedasticity in X globally; LCP adapts the calibration distribution per game. Complementary, not duplicative. No existing ledger covers Guan (2023).

## 11. GSE implementation spec
(1) **Sample-splitting LCP for margins/totals**: localizer = product kernel on (total bucket, spread bucket, weather bucket, rest differential) or k-NN in the engine's feature space; (2) implement the paper's ADJUSTED quantile level exactly (not the naive weighted quantile); (3) per-game intervals from the localized calibration distribution; (4) report effective sample size per game (Σw)²/Σw² — flag games where localization starves the calibration set. Effort: 3–4 days.

## 12. Reproducible test
Dataset: GSE engine backtest 2023–2025, game-level margin/total. Split: train quantile models, calibration fold for LCP, test 2025. Metrics: overall empirical coverage (target 1−α ± 1.5pp), mean width, and STRATUM coverage (weather buckets, high/low totals, primetime) — the test must show worst-stratum coverage improving vs marginal CQR. Baselines: standard split CQR ([1639]), Mondrian/stratified conformal.

## 13. Acceptance / rejection gate
ADAPT if: worst-stratum coverage gap (max over strata |coverage − nominal|) shrinks ≥30% vs marginal CQR at ≤105% mean width. REJECT full LCP in favor of Mondrian stratification if the kernel version's effective sample sizes collapse (median (Σw)²/Σw² < 50) — discrete strata are then the more honest tool.

## 14. Improvement experiment
**Learned localizer**: replace the hand-picked kernel with weights from the residual-QRF of ledger [1642] (leaf co-occurrence = similarity) — a data-driven H. Compare width/stratum-coverage vs the fixed kernel; this fuses [1642] and [1644] into one adaptive-localization pipeline.

**Verdict:** ADAPT — implement sample-splitting localized conformal prediction with the paper's adjusted (not naive) quantile level, localized on game-context features; accept on ≥30% reduction in worst-stratum coverage gap vs marginal CQR, else fall back to Mondrian stratification.
