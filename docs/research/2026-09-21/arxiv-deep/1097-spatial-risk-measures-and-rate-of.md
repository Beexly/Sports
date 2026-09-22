# [1097] Spatial Risk Measures and Rate of Spatial Diversification (arXiv:1803.07041v6)

**Citation:** Koch, E. (2018). *Spatial Risk Measures and Rate of Spatial Diversification*. arXiv:1803.07041v6. URL: https://arxiv.org/abs/1803.07041
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** REJECT — pure actuarial theory (theorems on when VaR/ES satisfy spatial axioms for max-stable fields), no data, no experiments, no code; no operational path to GSE value.

## 1. Research question
For an insurer covering a geographic region against a spatially distributed hazard (cost field C(x)), how do classical risk measures (expectation, variance, VaR, expected shortfall) applied to the normalized spatially aggregated loss behave as the region grows — i.e., what is the *rate* of spatial diversification?

## 2. Dataset / schema
None. This is a pure mathematics paper: definitions, theorems, proofs. No empirical data, no simulations, no case study executed (a winter-storm application is described as "ongoing work").

## 3. Method / model
Defines the normalized spatially aggregated loss `L_N(A,P) = ν(A)^{-1} ∫_A C_P(x) ν(dx)` and spatial risk measures `R_Π(A,P) = Π(L_N(A,P))`. Proposes axioms: translation invariance, spatial sub-additivity (`R_Π(A1∪A2,C) ≤ min(R_Π(A1,C), R_Π(A2,C))`), asymptotic spatial homogeneity of order −γ. Proves sufficient conditions (CLT + mixing assumptions on max-stable/Brown–Resnick/Smith fields) such that expectation has order 0, variance order −2, VaR and ES order −1.

## 4. Equations & assumptions
- `L_N(A,H_ω) = ν(A)^{-1} ∫_A H_ω(x)ν(dx)`; `R_Π(A,C) = Π(L_N(A,C))`.
- Axiom 3: `R_Π(λA,C) = K1(A,C) + K2(A,C)/λ^γ + o(1/λ^γ)` as λ→∞.
- Insurance application: `EL` decomposition, premium condition `pr > K1(A,C) = E[C(0)]`.
- Assumptions: stationary max-stable cost fields, CLT conditions, strong mixing, law-invariance of Π. All results are asymptotic (λ→∞).

## 5. Features / target
Not applicable — no features, no prediction target. Theoretical objects: cost fields, risk measures, regions.

## 6. Validation design
None. No experiments, no simulations, no empirical validation of any kind.

## 7. Numerical results / baselines
None. The "results" are theorem statements (diversification orders 0/−2/−1/−1).

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
Not applicable (no data). Limitations for GSE: the entire apparatus serves insurance portfolio geography; the only conceivable sports analogue (aggregating weather-tail risk across game locations) would require building the spatial-extremes machinery the paper deliberately leaves as "ongoing/future work." Nothing here is implementable as-is.

## 10. GSE overlap
Consulted `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. No actuarial/spatial-risk lane exists; the weather lane (gap 8) is about game-day effects on scoring, not tail-risk aggregation across venues. No overlap and no transferable operational method.

## 11. GSE implementation spec
Not applicable — REJECT.

## 12. Reproducible test
Not applicable — REJECT (no empirical claims to reproduce).

## 13. Acceptance / rejection gate
REJECT: theory-only, no data or experiments, insurance-domain, no actionable GSE application. Replaced by ledger 1303.

## 14. Improvement experiment
Not applicable — see replacement ledger 1303 for the same-lane (weather/spatial-extremes) substitute.
