# [0486] A duality method in prediction theory of multivariate stationary sequences (arXiv:math/0106056v1)

**Citation:** Michael Frank, Lutz Klotz (2001). *A duality method in prediction theory of multivariate stationary sequences*. arXiv:math/0106056v1. URL: https://arxiv.org/abs/math/0106056v1
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 50,144 chars).
**Verdict:** REJECT — pure functional-analytic prediction theory for stationary sequences; no data, no sports application.

## 1. Research question
Generalizing Nakazi (1984) and Miamee–Pourahmadi from q = 1 to the multivariate case: for a q-variate weakly stationary sequence over a discrete abelian group G (in particular G = ℤ) with integrable positive Hermitian q×q matrix-valued spectral weight W on the dual group G* such that W⁻¹ is also integrable, can approximation problems in L²(W) be related via duality to approximation problems in L²(W⁻¹)? The paper establishes this correspondence and applies it to prediction problems (projections P_S I, prediction error matrices Δ_S, and Szegő-type infimum quantities δ_S) for q-variate stationary processes.

## 2. Dataset / schema
No datasets. Pure mathematics paper (2000 MSC Primary 60G25, 60G10; Secondary 42A10). The "data" is an abstract q-variate stationary process with spectral weight W; no observations, no simulations.

## 3. Method / model
- **Duality correspondence (Theorem 3.2, the core):** for W ∈ W̃_q(G*) and index sets S ⊆ G∖{0}, the projection of the identity onto the past-subspace and the prediction error matrix satisfy
  **P_S I = I − (I − Ĩ_S, I)_~⁻¹ (I − Ĩ_S) W⁻¹** and **Δ_S = (I − Ĩ_S, I)_~⁻¹ = (I − Ĩ_S, I − Ĩ_S)_~⁻¹**,
  linking trigonometric approximation in L²(W) to approximation in L²(W⁻¹) (Lemma 3.1, 3.3, 3.4 supporting).
- **Applications:** Theorem 3.6, 3.7, 3.9, Corollary 3.10 (general prediction formulas); Theorem 4.1 (Szegő infimum formula analog): for S = G∖{0}, **P_S I = I − (∫W⁻¹dλ)⁻¹W⁻¹**, **Δ_S = (∫W⁻¹dλ)⁻¹**, **δ_S = [det(∫W⁻¹dλ)]^{−1/q}**; Theorem 4.2, 4.4, Corollary 4.5; Section 5 (Theorems 5.4, 5.5, 5.6): explicit formulas for Nakazi's prediction problem — e.g., **Δ_{S₂} = (Σ_{j=0}^n B_j B_j*)⁻¹**, **δ_{S₂} = [det(Σ_{j=0}^n B_j B_j*)]^{−1/q}** — in terms of matrix coefficients (B_j, A_j) of outer factorizations.

## 4. Equations & assumptions
- Duality: **(F, G)_~** inner products pairing L²(W) and L²(W⁻¹) (Section 2–3).
- Prediction formulas: P_S I, Δ_S, δ_S as quoted above.
- **Assumptions:** q-variate weakly stationary sequence over discrete abelian group G; spectral measure absolutely continuous with matrix weight W integrable and W⁻¹ integrable (W ∈ W̃_q(G*)); classical Kolmogorov–Wiener prediction setup (infinite past observed). The integrability of W⁻¹ excludes purely deterministic components.

## 5. Features / target
Not applicable — theory paper. Abstract "past observations" (the index set S) and "predictand" (the present, index 0); no features or concrete targets.

## 6. Validation design
Not applicable — no data, no experiments; validation is by proof.

## 7. Numerical results / baselines
None stated in the paper — zero numerical results.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
- No empirical claims → no leakage concerns. Adversarial notes: the theory assumes infinite past and known spectral weight W — in practice W must be estimated, and the paper says nothing about estimation error; the W⁻¹-integrability assumption rules out deterministic components common in real series. The results are closed-form prediction-error expressions for stationary linear models — elegant but a century downstream from anything a sports bettor computes.
- **External validity to NFL:** none. NFL game outcomes are not a stationary linear sequence amenable to Wiener–Kolmogorov spectral prediction; there is no multivariate stationary time series being forecast here (no team-strength dynamics model of this form exists in GSE — the state-space lane in the corpus, e.g., 1701.05976, is estimated empirically, not via spectral duality).

## 10. GSE overlap
Checked against `existing-research-map.md`: Garrett's state-space/dynamics lane covers Kalman filters, particle filters, dynamic Elo, nested AR(1) team strength (1701.05976), Gaussian processes — all estimated empirically from nflverse. No spectral-domain or Wiener–Kolmogorov prediction theory anywhere in the corpus. Not a duplicate; out of scope.

## 11. GSE implementation spec
None — closed-form spectral prediction formulas with no estimation component cannot be operationalized for NFL data. No build recommended.

## 12. Reproducible test
Not applicable — no empirical claim.

## 13. Acceptance / rejection gate
REJECTED: abstract prediction theory for stationary sequences; no sports application. Closed.

## 14. Improvement experiment
If GSE ever models team strength as a stationary vector process (it doesn't — its dynamics are nonstationary by design): the concrete follow-up would be to estimate a spectral weight matrix W from weekly EPA differentials and compare the duality-based prediction-error formula Δ_S against the empirical out-of-sample error of the nested AR(1) model (1701.05976) on 2020–2025 nflverse — a first test of whether spectral prediction theory has any bite on sports data. Currently out of scope.
