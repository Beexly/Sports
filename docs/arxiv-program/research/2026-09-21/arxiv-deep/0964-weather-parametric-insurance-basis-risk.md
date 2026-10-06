# 0964 — Managing basis risks in weather parametric insurance: diversification + spatial ratio thresholds (2409.16599v1)

## Citation / full-text source
- Gao, Yang, Liu. "Managing Basis Risks in Weather Parametric Insurance: A Quantitative Study of Diversification and Key Influencing Factors." arXiv:2409.16599v1 [q-fin.RM] (25 Sep 2024).
- Full text read: https://arxiv.org/pdf/2409.16599.pdf (952 text lines via fetch; complete: abstract through references).
- Note: assigned to reader 15, initially BLOCKED (cache copy was abstract-page only); recovered and fully read via direct PDF fetch. Replacement-for: 2409.16599v1 BLOCKED record → this ledger (no reserve consumed).

## Research question
Can the basis risk of weather parametric insurance (payout/loss mismatch: "loss without payout" or "payout without loss") be managed through diversification like other risks, and what are its key influencing factors?

## Dataset / schema
- Pure Monte Carlo simulation (no empirical dataset). Setup per contract i, simulation year j:
  - Hazard footprint: circle, radius r(i,j) ~ Uniform[0, Rmax], centroid (x,y) ~ Uniform[0,1]².
  - Hazard severity s(i,j) ~ Uniform[0, Smax], uniform across the footprint.
  - Insured exposure: fixed point on [0,1]². Reference weather station: fixed point on [0,1]².
  - Trigger threshold t(i) fixed, < Smax. Premium = 1 per contract; portfolio premium = m.
- Payout = 1 iff s ≥ t AND station inside footprint; loss = -1 iff s ≥ t AND exposure inside footprint.

## Method
- Define per-contract-year basis risk BR(i,j) ∈ {+1, -1, 0} from the four coverage scenarios (both covered / station only / exposure only / neither) × trigger met/not.
- **AABRP** (Annual Average Basis Risk per Premium Ratio, introduced here): AABRP(i) = (1/n) Σ_j BR(i,j); uncertainty = std dev of BR(i,j).
- Portfolio: BR'(j) = Σ_i BR(i,j); AABRP' = (Σ_j BR'(j))/(m·n); portfolio uncertainty = std(BR').
- Experiments: (1) m = 100 contracts, n = 1000 years, thresholds ~ Uniform(0,10], severity ~ [0,20]; then m = 1→500 sweep. (2) Spatial ratio SR = d(exposure, station)/r_event, 500 tests × 1000 years, threshold regression (Hansen 2000). (3) Severity vs basis risk.

## Equations / assumptions
- BR(i,j) = +1 if (payout=1, loss=0); −1 if (payout=0, loss=−1); 0 otherwise.
- AABRP(i) = Σ_j BR(i,j) / n; σ(i) = std_j(BR(i,j)).
- Portfolio: AABRP' = Σ_j Σ_i BR(i,j) / (m·n); σ' = std_j(Σ_i BR(i,j)).
- Spatial ratio SR = ||x_exposure − x_station|| / r_event.
- Inverse-proportional fit: σ(m) = a/(m − b) + c.
- Assumptions: independent contracts; circular footprints; uniform severity; point exposures; random [0,1]² geometry; premium = 1.

## Features / target
- Inputs: contract count m, spatial ratio SR, trigger threshold t, severity s, footprint radius r.
- Targets: AABRP' (portfolio basis risk level), σ' (basis risk uncertainty).

## Validation
- Monte Carlo: 1000 simulation years per configuration; 500 spatial configurations; threshold regression with 99% significance tests; R² reported for fits.

## Exact results / baselines
- **Diversification (m=100, n=1000)**: individual AABRP ∈ [−0.201, 0.203], quartiles −0.053 / 0.007 / 0.054; **portfolio AABRP' = 0.005** (→ 0, hedging effect). Individual σ ∈ [0.118, 0.589]; **portfolio σ' = 0.041**.
- **m = 1→500**: |AABRP'| decreases and converges to 0; σ(m) inverse-proportional fit **a = 0.482, b = 2.126, c = 0.003, R² = 0.993**; Pearson(m, σ) = **−0.611, R² = 0.373, p < 0.01**.
- **Spatial ratio thresholds**: AABRP threshold γ = **0.85** (R² = 0.821 below, 0.388 above, p < 0.01); σ threshold γ = **1.93** (R² = 0.597 below, 0.233 above, p < 0.01). Below threshold: basis risk rises with SR; above: falls toward 0. Mechanism: SR→0 guarantees both covered (risk 0); SR→∞ guarantees neither covered (risk 0); intermediate SR maximizes mismatch.
- **Severity**: below trigger → risk 0; above trigger → no significant correlation between severity and basis risk level or volatility. Severity does not escalate basis risk.
- Basis risk taxonomy used: design / temporal / spatial (Dalhaus et al. 2018).

## Code / data
- No public code. Pure simulation — reproducible from the stated setup.

## Leakage
- N/A (simulation study). One note: threshold-regression thresholds (0.85, 1.93) are estimated on the same simulated data they describe — descriptive, not validated out-of-sample.

## Limitations
- Authors' own: (1) weather parametric only — other perils need re-parameterization; (2) **point exposures** — unsuitable for area exposures (agriculture) without refinement; (3) **circular footprints, uniform severity, random [0,1]² geometry** — shape/geometry assumptions affect specific numbers; (4) uniform severity across footprint is a simplification.
- My observation: contracts assumed **independent** — real weather books have correlated perils (one hurricane hits many contracts), which weakens the diversification result precisely when it matters; the σ(m) ~ 1/m decay is the independent-case rate and is optimistic under correlation.

## GSE overlap
- Checked against `arxiv-program/state/existing-research-map.md`: no existing basis-risk/diversification-of-uncertainty framework; weather lane has forecasting/calibration papers but nothing on portfolio construction of uncertain positions. No duplication.

## Implementation (GSE adaptation)
- The paper is a **portfolio theory for positions with binary mismatch risk** — directly analogous to a GSE pick portfolio where each bet has model-edge uncertainty and the "basis risk" is edge-realization mismatch.
- Adapt the math: treat each posted pick as a contract with BR = realized − expected edge sign; AABRP' over the pick portfolio measures systematic edge bias; σ' measures portfolio volatility. The 1/m diversification decay gives a **minimum portfolio size** rule: with per-pick σ ~ 0.3–0.6 (their individual-contract range), ~100 positions drive portfolio bias noise to ~0.04.
- Adapt the **spatial ratio threshold regression** as a regime detector: define an analog "distance" (e.g., model disagreement / market distance) and test for the rise-then-fall signature to find the sweet spot where edge is maximally distinguishable from noise.
- Weather-stadium lane: the severity-independence finding supports using parametric-style weather adjustments (wind/temperature thresholds) for totals without fearing that extreme weather "breaks" the adjustment — the trigger, not the magnitude, is what matters.

## Reproducible test
- Reimplement the Monte Carlo (m = 1→500, n = 1000) in ~50 lines; verify σ(m) fit recovers a ≈ 0.48, R² > 0.99. Then re-run with **correlated footprints** (shared event centroids across contracts) and measure how much the diversification benefit degrades — the number GSE actually needs.

## Numeric gate
- **σ' = 0.041 vs individual 0.118–0.589**: diversification cuts basis-risk volatility by ~3–14× at m = 100. Gate: GSE pick-portfolio realized-bias volatility must fall within 2× of the 1/√m prediction; if it doesn't, per-pick edges are correlated and the sizing model must change.

## Improvement experiment
- Replace independent contracts with a Gaussian-copula correlation structure over event centroids; re-estimate the effective diversification rate and the SR thresholds under correlation; derive the **correlation-adjusted minimum portfolio size** for GSE's bankroll.

## Verdict
**ADAPT** — the AABRP construct and the diversification-decay quantification give GSE a principled pick-portfolio sizing rule, and the threshold-regression technique is a reusable regime-detection tool. The severity-independence result directly licenses parametric weather adjustments for totals.
