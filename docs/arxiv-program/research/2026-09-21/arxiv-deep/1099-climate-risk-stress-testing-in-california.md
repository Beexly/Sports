# [1099] Climate Risk Stress Testing in California: A Geospatial Framework for Banking and Climate-Exposed Sectors (arXiv:2604.16716v1)

**Citation:** Panda, S. N., Saha, A. (2026). *Climate Risk Stress Testing in California: A Geospatial Framework for Banking and Climate-Exposed Sectors*. arXiv:2604.16716v1. URL: https://arxiv.org/abs/2604.16716
**Ledger completed:** 2026-09-21. **Read:** full text (PDF).
**Verdict:** REJECT — a conceptual design paper that explicitly presents no empirical exercise ("not a finished reduced-form estimation exercise"); banking/climate-finance framing with no data, no results, no sports applicability.

## 1. Research question
How should banks and investors structure geospatial climate-risk stress tests linking local physical hazards (wildfire, drought, flood, heat) to portfolio expected loss and valuation?

## 2. Dataset / schema
None used. A "data strategy" section lists inputs a future implementation *would* merge (NOAA/state climate records, CAL FIRE/FEMA hazard layers, HMDA, bank call reports, assessor files) — none are actually assembled or analyzed.

## 3. Method / model
Three-layer framework: (1) hazard measurement H_{g,s} per geography/scenario; (2) exposure mapping to loans/properties; (3) balance-sheet transmission. Illustrative equations: scenario-contingent expected loss `EL_{i,s} = PD_{i,s} × LGD_{i,s} × EAD_i`; `PD_{i,s} = PD_{i0}·exp(β1·H_{g,s} + β2·T_{j,s} + β3·U_g − β4·A_i)`; Climate-VaR `= Σ w_i·ΔV_{i,s} + λ·Σ EL_{i,s}`. Plus a practitioner survey instrument (in a companion supplement). No estimation performed.

## 4. Equations & assumptions
- `EL_{i,s} = PD_{i,s} × LGD_{i,s} × EAD_i`.
- `PD_{i,s} = PD_{i0} exp(β1 H_{g,s} + β2 T_{j,s} + β3 U_g − β4 A_i)`.
- `Climate-VaR_s = Σ_i w_i ΔV_{i,s} + λ Σ_i EL_{i,s}`.
- Assumptions: exponential hazard-to-default mapping; adaptation capacity enters linearly in the exponent; scenarios are "disciplined stress narratives, not point forecasts."

## 5. Features / target
Proposed (not implemented): hazard intensity, transition risk, local fragility, adaptation capacity per borrower/asset. Target: scenario-contingent expected loss / repricing.

## 6. Validation design
None. Three "testable predictions" are stated (high-hazard borrowers show higher spreads; collateral discounts in stressed areas; concentrated institutions face larger stress losses) but none are tested.

## 7. Numerical results / baselines
None. No numbers of any kind beyond illustrative notation.

## 8. Code / data availability
None stated.

## 9. Leakage & limitations
No empirical content at all — the paper is a research-design proposal. Banking/climate-finance domain with no mechanism connecting to sports prediction. Even within its domain it contributes no evidence.

## 10. GSE overlap
Consulted `/home/hatch/workspace/arxiv-sweep/existing-research-map.md`. No climate-finance lane; the weather lane is about game-day effects. No overlap, no transferable method.

## 11. GSE implementation spec
Not applicable — REJECT.

## 12. Reproducible test
Not applicable — REJECT (no empirical claims).

## 13. Acceptance / rejection gate
REJECT: no data, no results, no experiments, wrong domain. Replaced by ledger 1304.

## 14. Improvement experiment
Not applicable — see replacement ledger 1304 for the same-lane (climate/weather risk) substitute.
