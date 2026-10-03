# [0098] NFL Injuries Before and After the 2011 Collective Bargaining Agreement (CBA) (arXiv:1805.01271)

**Citation:** Zachary O. Binney, Kyle E. Hammond, Mitchel Klein, Michael Goodman, A. Cecile J.W. Janssens (2018). *NFL Injuries Before and After the 2011 Collective Bargaining Agreement (CBA)*. arXiv:1805.01271v1. URL: https://arxiv.org/abs/1805.01271
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 781 lines).
**Verdict:** ADAPT — not an injury-prediction paper, but its Poisson interrupted-time-series design is the right template for structural-break testing of NFL regime changes (17-game season, kickoff rules) in GSE backtests; the conditioning/non-conditioning taxonomy is directly reusable for injury-adjustment features.

## 1. Research question
Did the 2011 CBA's practice restrictions (OTAs 14→10 days, voluntary offseason program 14→9 weeks, elimination of two-a-day padded practices in camp, regular-season padded practices capped at 14 per 17-week season) cause a sustained increase in NFL injuries via poorer conditioning — or did rest/fewer exposures reduce them? (Abstract; Sec. 1–2)

## 2. Dataset / schema
- **Football Outsiders injury database** (prospective since 2007; public weekly injury reports + IR list + media supplements), 2007–2016: 19,803 player-seasons, 22,331 injuries.
- Analysis set after exclusions: **7,425 regular-season, game-loss, non-head, non-illness injuries**. Excluded: 2,643 preseason injuries (11.8%), 11,399 non-game-loss injuries (51.0%), 685 head injuries (4.1%), 179 illnesses (0.8%).
- Player-season covariates: age, height, weight, games played (Football Outsiders).
- Conditioning-dependent (soft-tissue: Achilles, calf, groin, hamstring, biceps/triceps, pectoral, quadriceps, ACL — 51-type taxonomy in Table A1, classified by an NFL team physician) vs non-conditioning (fractures, high ankle sprains, face/eye/Lisfranc/organ/neck/rib trauma); non-ACL knee/ankle = "unknown" category.
- **Access:** Football Outsiders database (public reports; aggregated tables printed; no player-level download link stated).

## 3. Method / model
- Descriptive counts per season + stratified curves (all / conditioning / non-conditioning / unknown), 2007–2016, pre-CBA (2007–2010) vs post-CBA (2011–2016).
- **Mixed Poisson interrupted time series** at player-season level (R 3.3.2; Poisson models in SAS 9.4):
  `ln(Y_ij) = ln(G_ij) + β0 + β1·t_ij + β2·CBA_ij + β3·PostCBA_ij + β4·Age_ij + b0i + e_ij`
  where t_ij = Year−2007; CBA_ij = 1 if ≥2011; PostCBA_ij = 0 for 2007–11 else Year−2011; ln(G_ij) = offset for games at risk; b0i = player random intercept.
- exp(β₂) = CBA level effect (% change post vs pre); exp(β₁) = pre-CBA annual trend; exp(β₁+β₃) = post-CBA annual trend.
- Deliberate use of **counts rather than rates** (practices fell → athlete-exposures fell → rates could rise even as counts fell).
- Four sensitivity analyses: include minor injuries; include preseason; reclassify knee/ankle unknown→non-conditioning; hamstrings only.

## 4. Equations & assumptions
- `ln(Y_ij) = ln(G_ij) + β0 + β1·t_ij + β2·CBA_ij + β3·PostCBA_ij + β4·Age_ij + b0i + e_ij` (Sec. 2.4)
- Rise/fall criterion: sustained change of ≥1 injury per 1,000 athlete-exposures (≈6.7% count change) for ≥3 seasons.
- Three-mechanism framework (Table 1): fewer practices → (1) more rest → fewer injuries; (2) poorer conditioning → more injuries; (3) fewer exposures → fewer injuries — differentially affecting conditioning vs non-conditioning counts.
- Assumptions: public injury reports are a consistent proxy for true injuries (authors note reporting improved over time — hence game-loss-only filter); counterfactual that the pre-CBA upward trend would have continued absent the CBA.

## 5. Features / target
- **Inputs:** CBA era indicator, calendar time, age, games-at-risk offset, player random effect.
- **Target:** season counts of game-loss injuries (all / conditioning / non-conditioning) and games missed; rate ratios for the CBA effect.

## 6. Validation design
- No holdout; inference via 95% CIs on rate ratios + visual inspection against the rise/fall criterion. Model fit checked by summing predicted player-season counts per year vs actual counts. Robustness via the four sensitivity analyses.

## 7. Numerical results / baselines
- Game-loss injuries: **701 (2007) → 804 (2016), +15%**; minor injuries 754 (2007) → 1,169 (2012), +55%, then flat.
- Conditioning injuries: **197 (2007) → 271 (2011), +38%**, then plateau **220–240/season (2012–2016)**; non-conditioning **−37% in the first 3 CBA years**, back to historic levels 2014–2016.
- Table 2 rate ratios (injury counts): All — pre trend 1.03 (1.00–1.07), **CBA 0.93 (0.83–1.03)**, post trend 1.03 (1.01–1.04); Conditioning — CBA **1.05 (0.87–1.27)** ns; Non-conditioning — CBA **0.90 (0.69–1.16)** ns. Games missed: All — CBA 0.90 (0.85–0.96); pre trend 1.13 (1.11–1.16) → post trend 1.04 (1.03–1.05).
- Hamstrings (Table 3): pre-CBA trend 1.12 (1.02–1.23) → post 0.96 (0.92–1.01); games-missed CBA effect **0.73 (0.61–0.88)** — the one clearly beneficial signal.
- 2011-only bump in conditioning injuries consistent with the lockout Achilles spike (12 ruptures in 29 days post-lockout, Myer et al. 2011) — transient, not sustained.
- **Conclusion: no sustained increase** in conditioning or non-conditioning injuries post-2011 CBA; the ITS counterfactual assumption (trend continues vs plateaus) is decisive for interpretation; concurrent rule changes (kickoff moved up, expanded defenseless-player list) confound causal claims.

## 8. Code / data availability
Not stated (R/SAS analyses; Football Outsiders source data public in principle).

## 9. Leakage & limitations
- **Counterfactual dependence:** models assuming no pre/post time trends make the CBA look detrimental ("results not presented") — the headline null depends on the continued-trend counterfactual.
- Concurrent safety changes (kickoff touchback incentive, defenseless-player expansion) bias toward finding CBA benefits.
- Body-part-only coding → conditioning misclassification (authors show hamstring-only analysis gives stronger beneficial effects, implying attenuation bias in the full taxonomy).
- Preseason analysis infeasible: 80→90-man camp rosters break pre/post exchangeability; practice-squad expansion 8→10 adds minor upward bias.
- Unexplained 2014 jump in "unknown-conditioning" injuries (knee/ankle/foot/back/shoulder) with no identified cause.

## 10. GSE overlap
**Explicit overlap, not duplication:** the repo's already-read **2408.10867** found the bye-week advantage vanished post-2011 CBA — same regime change, different question (rest advantage in outcomes vs injury burden). The two papers are complementary, not redundant: 2408.10867 is about *performance* effects of the CBA era; this is about *injury* mechanisms. Neither is about predicting games. The ITS design here is new to the repo's method inventory.

## 11. GSE implementation spec
1. **Adopt the interrupted-time-series Poisson design as GSE's structural-break harness:** every suspected regime change (2021 17-game season, 2023/2024 kickoff rule changes, 2011 CBA itself in long backtests) gets a formal ITS test on GSE's backtest residuals — same parameterization (level shift β₂ + trend-break β₃ + offset for games at risk).
2. **Injury-adjustment features:** port the conditioning/non-conditioning taxonomy to weekly availability modeling — soft-tissue (hamstring/calf/groin) absences carry different predictive information than contact injuries; weight a team's injury discount by the conditioning share of its inactive list.
3. Data: nflverse injury reports 2009–2025 + GSE backtest logs. Effort: ~1 week for the ITS harness; ~2 weeks for the injury-taxonomy feature.

## 12. Reproducible test
Dataset: nflverse injuries + GSE (or public Elo) backtest residuals 2009–2025. ITS test of the 2021 17-game-season break on weekly upset rate and on soft-tissue injury counts (same model form as Sec. 2.4). Success = the harness reproduces this paper's qualitative result on 2007–2016-style data (no significant CBA level effect on all-injury counts, |log RR| < 0.10) and detects the known 2011 bye-week regime effect from 2408.10867 as a positive control.

## 13. Acceptance / rejection gate
**Adopt** the ITS harness into GSE's backtest QA if the positive-control test detects the 2011 regime break (p < 0.05 on the trend-break term) without flagging spurious breaks in stable eras (2012–2019); **reject** the injury-taxonomy feature if conditioning-share of inactives adds no holdout log-loss improvement (≥0.002) to the spread model over a simple starter-out count.

## 14. Improvement experiment
The paper's key weakness — counterfactual dependence — is fixable with a **synthetic-control ITS**: build a donor pool of "no-break" eras/teams to estimate the counterfactual trend non-parametrically instead of assuming the pre-trend continues. Apply to the 2024 kickoff-rule change: synthetic control on touchback rates and return-TD rates to isolate the rule's causal effect on totals — a number GSE's totals model currently absorbs blindly.
