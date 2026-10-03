# 0983 — Impact of three-point rule change on competitive balance in football: a synthetic control method approach (2510.15405)
**Ledger:** 0983 | **arXiv:** 2510.15405 (2025) | **Lane:** win_spread_total
**Title:** "Impact of Three-Point Rule Change on Competitive Balance in Football: A Synthetic Control Method Approach" — Ajay Sharma (IIM Indore)
**Replacement context:** Fresh-search replacement (query: `abs:"competitive balance" AND abs:football`) for an original-assignment duplicate already in the corpus map. Duplicate skips are not REJECTs — see wave summary.

---

## Citation / full-text source
Full citation: "Impact of Three-Point Rule Change on Competitive Balance in Football: A Synthetic Control Method Approach" — Ajay Sharma (IIM Indore). Full text: arXiv 2510.15405 (2025), https://arxiv.org/abs/2510.15405.

## Research question
A causal-inference paper applying the **synthetic control method (SCM)** — the first use of SCM in football, per the author — to measure whether the English FA's 1981 switch from 2 points to 3 points for a win actually increased competitive balance. The 1981–1993 window is a clean natural experiment: England adopted the three-point rule in 1981/82 while the other five major European leagues did not (Germany/Spain/Netherlands adopted 1995/96; Italy/France 1994/95).

## Dataset / schema
Match-level data for six domestic leagues (England First Division, Germany, Spain, Netherlands, Italy, France) from 1963/64 to 1993/94, aggregated to league-level indicators. Pre-treatment period: 1963–1980 (18 seasons); post-treatment: 1981–1993 (13 seasons). Donor pool: the 5 non-English leagues. Note: underlying match data is **not publicly available** ("obtained from the authors upon request") — reproducibility is method-level only.

## Method
1. **Competitive balance measure — DCB (Distance to Competitive Balance, Triguero Ruiz & Avila-Cano 2019):** DCB(s) = sqrt((HHI − HHI_min)/(HHI_max − HHI_min)), where HHI = Σ_i s_i² with s_i = each team's share of total points; HHI_min = all-draws configuration (uniform 1/I), HHI_max = maximum concentration. Ranges 0 (minimum concentration) to 1 (maximum); normalized so it is comparable across leagues with different team counts and across the 2-point vs 3-point scoring regimes.
2. **SCM (Abadie & Gardeazabal 2003; Abadie et al. 2010):** choose non-negative donor weights G (Σg_i=1) minimizing (X1 − X0G)'V(X1 − X0G), where X1 = pre-treatment predictors for England, X0 = same for donors, V = diagonal predictor-importance matrix chosen to minimize pre-treatment RMSE. Synthetic England = Y0G*. ATE = actual England DCB minus synthetic England DCB, 1981–1993.
   - Predictors: average share of wins and draws, number of teams, plus all two-period lag values of DCB (t0, t2, t4, ...). Predictor (V) weights in the chosen spec: DCB(1969) 0.3485, DCB(1965) 0.2119, avg win share 0.1587, team count 0.1544, avg draw share 0.0777, DCB(1979) 0.0488.
   - Donor weights in the chosen spec: **France 0.6010, Spain 0.3350, Netherlands 0.0650** (Germany and Italy zero). French and Dutch leagues appear in every alternative specification.
3. **Robustness:** placebo treatment assigned to each donor league; placebo treatment year (1969 instead of 1981); leave-one-out donor tests; three alternative lag specifications (1-, 3-, 5-period gaps); alternative outcome NAMSI-hat index; DID estimate with equal donor weights; goals-per-match as a second outcome.

**Hyperparameters.** Pre-treatment window 1963–1980; post 1981–1993; two-period DCB lags; V chosen by pre-treatment RMSE minimization (Ferman et al. 2020 guidance); donor pool restricted to the 5 other leagues.

## Equations / assumptions
- DCB(s) = √[(HHI − HHI_min)/(HHI_max − HHI_min)], HHI = Σ_i s_i².
- G* = argmin_G (X1 − X0G)'V(X1 − X0G) s.t. g_i ≥ 0, Σg_i = 1.
- Counterfactual: Y1* = Y0G*; treatment effect τ_t = Y1t − Y1*t; ATE = mean over 1981–1993.
- Assumptions: no interference (donor leagues unaffected by England's rule — plausible pre-1994); no anticipation; convex-hull condition (England's pre-treatment predictors within donor span — evidenced by good pre-fit and the all-near-zero placebos); stable donor composition.

## Features / target
Features (predictors X1): average share of wins and draws, number of teams, plus all two-period lag values of DCB (t0, t2, t4, ...). Target (outcome): the league-season DCB value; treatment effect τ_t = Y1t − Y1*t, averaged over 1981–1993 to give the ATE. Goals per match is a secondary outcome.

## Validation
SCM is itself the estimator; the DID (−0.0545) is the methodological baseline/comparator. Robustness battery: placebo treatment assigned to each donor league (Dutch 0.0097, Spanish 0.0124, French 0.0026, German −0.0219, Italian 0.0145 — all near zero); placebo treatment year 1969 (−0.0175); leave-one-out donor tests (unchanged); three alternative lag specifications (1-, 3-, 5-period gaps); alternative outcome NAMSI-hat index; goals-per-match as a second outcome. Tables 1–4 and Figures 1–3 are **placeholders in this version** ("[Insert table N here]") — the numeric table bodies are not embedded; all quoted numbers come from the running text. Literature baseline: Dilger & Geyer (2009) DID on German league-vs-cup (contaminated control, per this author), Dewenter & Namini (2013), Hon & Parinduri (2014), Guedes & Machado (2002), Moschini (2010) 35-country panel (more goals, fewer draws — contrasts with this paper's null on goals).

## Exact results / baselines
- Main ATE (SCM, 1981–1993): **−0.051** on DCB — a ~5-point reduction in concentration toward the balanced end, i.e. the three-point rule **increased competitive balance** in the English league.
- Alternative specifications: ATE range **−0.0571 to −0.073** — same direction, similar magnitude.
- DID (equal donor weights): **−0.0545** — near-identical to SCM.
- Placebo donor-league ATEs: Dutch 0.0097, Spanish 0.0124, French 0.0026, German −0.0219, Italian 0.0145 — all near zero. Placebo year 1969: −0.0175. Leave-one-out: unchanged.
- Alternate balance measure NAMSI-hat: ATE **−0.0297** — same direction.
- **Goals per match: ATE −0.0131, no significant change** — the rule changed point dispersion without changing scoring volume.
- Proposed mechanism: higher win reward makes teams (especially lower-end teams) play more aggressively, dispersing points more evenly.
- **Baselines:** SCM is itself the estimator; the DID (−0.0545) is the methodological baseline/comparator. Literature baseline: Dilger & Geyer (2009) DID on German league-vs-cup (contaminated control, per this author), Dewenter & Namini (2013), Hon & Parinduri (2014), Guedes & Machado (2002), Moschini (2010) 35-country panel (more goals, fewer draws — contrasts with this paper's null on goals).

## Code / data
No code or data released. Underlying match data is not publicly available ("obtained from the authors upon request") — reproducibility is method-level only. Numeric tables/figures are placeholders in this manuscript version ("[Insert table N here]"); quoted numbers come from the running text.

## Leakage
No leakage discussion in the paper; the design is pre-treatment fitting only (predictors and V-weights are selected on the 1963–1980 pre-treatment window, effects estimated on 1981–1993), so post-treatment information does not enter the counterfactual construction. English football 1981–1993 coincided with other shocks (post-Heysel European ban 1985–1990, hooliganism-era attendance collapse, early commercialization) that the synthetic control may not fully absorb; single-treated-unit causal claims are inherently fragile.

## Limitations
- Data not public — the headline −0.051 cannot be independently recomputed; only the method is reproducible.
- Numeric tables/figures are placeholders in this manuscript version; quoted ATEs come from prose, so standard errors, pre-treatment RMSE values, and exact placebo distributions are unavailable.
- Donor pool of five leagues is thin; synthetic England loads 60% on France, a league the author admits is hard to justify as comparable — good pre-fit does not guarantee a valid counterfactual.
- Macro-only: by the author's own admission SCM cannot speak to team-level effects (which teams benefited).
- The mechanism (aggression helps weak teams) is asserted, not tested — no team-level or match-level mediation analysis.
- English football 1981–1993 coincided with other shocks (post-Heysel European ban 1985–1990, hooliganism-era attendance collapse, early commercialization) that the synthetic control may not fully absorb; single-treated-unit causal claims are inherently fragile.
- 3-point adoption elsewhere (1994–1996) caps the post window at 13 seasons — long-run effects unobserved.

## GSE overlap
- Complements 0980/0981/0982 (balance measurement) without duplicating: none of those estimate a causal effect of a rule change, and none use SCM.
- Moschini (2010)'s 35-country panel found the rule *increased* goals; this paper finds no goals effect — a genuine tension worth noting (different samples/methods).
- No overlap with the map's betting-market microstructure or forecasting clusters; this is sports-economics policy evaluation, a new method (SCM) for the corpus.
- Extends the competitive-balance trilogy (ledgers 0980/0981/0982): 0980 (1507.00634) tests the UOH with balance metrics; 0981 (2102.09288) builds a goal-based balance index; 0982 (2107.08732) models balance structurally with an SBM — this paper adds the **causal** layer (rule changes move balance; DCB quantifies it) that none of the three attempt. DCB is also a cleaner cross-era balance metric than HHICB because its normalization is regime-invariant.

## Implementation (GSE adaptation)
- **What to build:** a reusable **synthetic-control toolkit** for GSE's league-analytics layer: given any league-level intervention (rule change, playoff expansion, schedule-format change, salary-cap introduction), construct a donor pool of untreated leagues, fit Abadie's SCM with predictor-weight (V) selection by pre-treatment RMSE, and estimate the ATE on any balance/entertainment metric (DCB, NAMSI-hat, or GSE's own).
- **Concretely:** Python module `gse_causal/scm.py` implementing (X1−X0G)'V(X1−X0G) optimization (scipy, simplex constraints), V-selection loop over lag specs, placebo and leave-one-out diagnostics, and DCB/NAMSI-hat calculators from standings data. Validate by replicating the paper's qualitative pattern on public data: England 1963–1993 DCB from published final tables (reconstruct points shares — no author data needed).
- **First GSE application:** quantify format/rule shocks GSE actually cares about — e.g., the NFL's overtime-rule changes or playoff expansion on competitive-balance metrics, or the NBA play-in tournament's effect on late-season competitiveness — with donor pools of unaffected leagues/eras.
- **Where it plugs in:** season-preview content ("what rule changes actually did to parity"), league-health dashboards, and long-horizon simulation calibration (regime-shift adjustments to balance priors).

## Reproducible test
- Rebuild season-level DCB for England + 5 donor leagues 1963–1993 from public final-table data (points shares are computable without the author's match data); run the SCM spec (predictors and lags as above); confirm (a) donor weights concentrate on France/Spain/Netherlands, (b) pre-treatment RMSE fit is tight, (c) post-1981 ATE is negative and in the −0.03 to −0.08 band, (d) placebo donor ATEs are an order of magnitude smaller in absolute value.

## Numeric gate
- The replication's SCM ATE on DCB for 1981–1993 must be negative and within [−0.10, −0.02] (paper: −0.051), with every placebo donor-league ATE smaller in absolute value than the England ATE. Miss the band or fail the placebo ordering → the toolkit is not a faithful SCM implementation.

## Improvement experiment
- **Team-level mediation (the author's stated gap):** extend beyond macro-SCM by decomposing the DCB shift into within-tier vs between-tier components (e.g., point-share variance of top-6 vs bottom-6): test the paper's asserted mechanism — success if ≥60% of the DCB reduction comes from compression in the bottom half's point shares (weak teams gaining), not top-half parity.
- **Modern replication:** apply the toolkit to a recent natural experiment with full public data — e.g., the NBA play-in (2020/21) effect on late-season tanking/balance using other leagues as donors — demonstrating the toolkit generalizes beyond 1980s football.

## Verdict
**ADAPT** — The paper's value to GSE is methodological, not topical: a clean, fully-specified synthetic-control blueprint (predictor selection, V-weighting, placebo/leave-one-out discipline, DCB as a regime-invariant balance metric) that ports directly to quantifying any league rule/format shock GSE wants to analyze. The −0.051 headline is secondary; the toolkit and the DCB/NAMSI metric pair are the durable assets. Weakest of the balance quartet on raw reproducibility (no public data, placeholder tables), but the method spec is complete enough to re-implement from scratch.
