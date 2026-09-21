# Deep-Read Ledger 0980 — Competitive Balance Measures and the Uncertainty of Outcome Hypothesis in European Football

## Citation / full-text source

- arXiv:1507.00634 — full text: https://arxiv.org/pdf/1507.00634
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- **Citation:** Manasis, V., Ntzoufras, I., & Reade, J.J. "Competitive balance measures and the Uncertainty of Outcome Hypothesis in European football." (Mathsport 2019 special issue.) arXiv:1507.00634v2 [stat.AP], published 2015-07-02.
- **Full-text source:** https://arxiv.org/pdf/1507.00634 (PDF via arXiv, read in full; ~112k chars)

## Research question
Which of 17 competitive-balance indices (seasonal, between-seasons, bi-dimensional) is most strongly associated with fan attendance across eight European football leagues over 60 years — i.e., which index best operationalizes the Uncertainty of Outcome Hypothesis (UOH)?

## Dataset / schema
- 8 leagues: Belgium (53 seasons, from 1966/67), England (60), France (60), Germany (56, from 1963/64), Greece (60), Italy (60), Norway (57, from 1962/63), Sweden (60). Seasons 1959/60–2018/19. Unbalanced panel: n=8, T≈53–60; **442 pooled observations** after adjustment.
- Per league-season: final table (points, rankings → indices), average attendance per game (log, lnATT), lnPOP, lnRGNI (real per-capita GNI), unemployment Un, post-1997/98 dummy d97 (Bosman + Champions League reform), time trend.

## Method
1. Compute 17 indices: 7 seasonal (NAMSI, HHI*, AGini, NCR1, ACRK, NCRI, SCRKI); 6 between-seasons (DNt, Kendall τ, DN1, ADNK, DNI, SDNKI); 4 new bi-dimensional (DC1=(NCR1+DN1)/2, ADCK=(ACRK+ADNK)/2, DCI=(NCRI+DNI)/2, SDCKI=(SCRIK+SDNKI)/2).
2. CIPS panel unit-root tests → lnATT non-stationary; use reparametrized ADL(3) in levels+differences to avoid spurious regression while preserving elasticity interpretation.
3. Estimate by EGLS-SUR (Seemingly Unrelated Regressions) with White cross-section covariance (heteroskedasticity + contemporaneous correlation); Breusch-Pagan LM test selects SUR over OLS; Durbin h-test for autocorrelation; Jarque-Bera normality OK (overall p=0.30); Ramsey RESET p>0.10.
4. Report long-run elasticities (all differences set to zero).

## Equations / math / assumptions
- Core ADL: **A(L)·lnATT_it = C_i + B_1(L)·lnCB_it + B_2(L)·lnPOP_it + B_3(L)·lnRGNI_it + B_4(L)·lnUN_it**, with country fixed effects C_i and country-specific trends.
- Example bi-dimensional index: **DC1 = (NCR1+DN1)/2 = (P1 − 2r1) / [4(N−1)]** (Eq. 1), P1 = champion points, r1 = |rank change| across seasons.
- ADCK (Eq. 2): **ADCK = (1/[2K])·[Σ_{i=1}^K w_i(P_i − 2r_i) − C_K] + 1/2**, K = UEFA-qualifying places; weights w_i decline down the table; bottom-I teams weighted above mid-table but below top-K.
- All indices normalized to [0,1]: 0 = perfect balance, 1 = complete imbalance. UOH supported iff coefficient < 0 (more imbalance → less attendance).
- Three-level league structure: (a) championship title, (b) K European-qualification places, (c) I relegation places.

## Features / target
- Target: ΔlnATT (first difference of log average attendance per game).
- Features: one lnCB index at a time + lnPOP, lnRGNI, Un, d97, trends, lagged ΔlnATT terms.

## Validation
- CIPS: competitive-balance indices stationary; economic vars non-stationary → ADL/cointegration framework justified; residuals stationary (CIPS p<1%).
- RESET specification test p>0.10 for all model versions; JB normality not rejected.
- Robustness: fixed-effects re-run gives roughly similar results; Wald tests for joint-index models (Appendix Tables 11–13).
- Adjusted R² ≈ 0.25–0.30 (Table 4 with ADCK: **R²_adj = 0.250**) — deliberately small (dependent variable in differences; ticket price, TV, weather unavailable).

## Exact results with baselines
- Table 5 long-run elasticities (index → attendance), selected: **lnADCK −0.414%***; lnSDCKI −0.395%***; lnDC1 −0.303%***; seasonal lnACRK −0.274%***; lnNCR1 −0.253%***; lnSCRKI −0.246%***; between-seasons lnSDNKI −0.314%***, lnADNK −0.301%***, lnDN1 −0.044%***.
- **Conventional indices all insignificant:** NAMSI −0.093, HHI* −0.043, AGini +0.035, τ −0.020 (ns); DNt +0.137** and DNI +0.174%***, DCI +0.175%*** have the *wrong* (anti-UOH) sign — relegation-level competition reduces attendance (fewer fans of bottom teams; top-K race is what draws crowds).
- Economic controls (stable across indices): population elasticity ≈ **8.4–9.8** (1% pop → ~9% attendance); income ≈ **0.4–0.56**; unemployment ≈ −0.09 to −0.18 (equilibrium ≈ −0.15% at 7.5% EU unemployment); d97 ≈ +0.07 to +0.118 (**~10% attendance boost** from Bosman + UCL reform).
- Practical magnitude: ADCK best→worst season swings: England 0.373 (1961/62) → 0.783 (2018/19) = **+6,352 fans/game**; Greece 0.517 → 0.837 = +1,096 fans/game; Germany +6,043; Italy +4,192.
- Season ACRK illustration: Greece worst (2018/19) vs best (1985/86) competitive-balance seasons = **13.8% annual attendance swing**.

## Code / data availability
- No code or dataset download. Index formulas fully specified in text + appendix (reproducible from league tables).

## Leakage
- Indices are computed from *final* season tables while attendance is contemporaneous season average — mild simultaneity, acknowledged as demand-equation convention; no forward-looking features otherwise.

## Limitations
- Attendance ≠ total fan interest (TV/streaming/merch ignored; capacity-utilization % unavailable).
- Ticket price, televised games, weather — the three biggest demand drivers — entirely omitted.
- Pooled common-effect assumption across 8 heterogeneous leagues (efficiency-over-bias trade explicitly defended).
- ADCK weighting scheme is "intuitively plausible benchmark," not optimized; no causal identification (associational demand equation).

## GSE overlap vs existing-research-map
- Map's gap list and covered metrics: competitive balance per se appears only via market-implied tiers (benbbaldwin) and generic "competitive balance" mentions. **No coverage of level-weighted balance indices or the UOH demand literature.**
- Directly relevant: map has referee/crew effects on totals work and engagement-oriented thinking, but nothing quantifying *which structural races* (title vs playoff spots vs relegation) move fan/market attention. This paper's top-K finding maps to NFL playoff-race intensity.

## Implementation spec (GSE adaptation)
- Adapt the three-level index design to the NFL: build weekly "prize-level competitive intensity" indices — (L1) division-title race concentration, (L2) wild-card race concentration, (L3) #1-draft-pick "race" — as weighted concentration measures over remaining-schedule strength-adjusted win probabilities. Use as features in live totals / engagement models: the paper's core finding (fans respond to top-K races, not overall balance) predicts handle/volume concentrates in playoff-race games.
- Use ADCK-style weighting (decreasing weights by prize rank) as a template for GSE's own "stakes weighting" of games in ensemble training: up-weight games with high playoff-leverage concentration when calibrating late-season models.

## Reproducible test
- NFL 2002–2025: compute weekly division-title and wild-card race concentration (HHI over teams' playoff probabilities from nflverse); regress weekly TV ratings / betting handle proxy on race-concentration indices with team and week fixed effects. Predict: negative coefficient (more concentrated = less interesting), mirroring ADCK's −0.414.

## Numeric gate
- **−0.414% long-run attendance elasticity for ADCK (p<0.01)** — the best of 17 indices, and conventional indices (NAMSI/HHI*/Gini) all statistically zero. The single number that says *which* balance measure matters.

## Improvement experiment
- Replace the hand-set weighting scheme with weights learned by regressing attendance (or NFL handle) on per-rank concentration components with monotonicity constraints; compare out-of-sample fit vs ADCK. Also test the capacity-utilization dependent variable the referee requested, on the subset of seasons where stadium data exists.

## Verdict
**ADAPT** — the level-weighted (title/top-K/relegation) competitive-balance index family is a genuinely new feature-engineering idea for GSE: prize-level competitive intensity features for late-season and live models; plus the empirical lesson that overall balance is noise while *race* concentration is signal.
