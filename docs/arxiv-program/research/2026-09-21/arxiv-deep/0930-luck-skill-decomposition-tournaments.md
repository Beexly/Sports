# [0930] Inequalities, chance and success in sport competitions: simulations vs empirical data (arXiv:1910.03400)

## Citation / full-text source

- arXiv:1910.03400 — full text: https://arxiv.org/pdf/1910.03400
- (Section added during wave-2 reconciliation; full citation also appears in the title line above.)

**Citation:** Pawel Sobkowicz, Robert H Frank, Alessio E Biondo, Alessandro Pluchino, Andrea Rapisarda (2019). *Inequalities, chance and success in sport competitions: simulations vs empirical data*. arXiv:1910.03400 [physics.soc-ph]. URL: https://arxiv.org/abs/1910.03400 (published in Physica A, 2020, doi 10.1016/j.physa.2020.124899).
**Ledger completed:** 2026-09-21. **Read:** full text (arXiv PDF, 28 pages; cached abs-page file was abstract-only, full PDF fetched and read).

## 1. Research question
How much of success in winner-take-all tournament competitions is talent vs random luck? The paper builds an agent-based tournament model (performance = linear mix of talent and luck) and fits it to empirical 100-meter dash results from 13 Olympic Games (1968–2016), using one of the most tightly controlled sports as a lower bound on the role of chance in less controlled domains. A second thread quantifies the perceived injustice of steep reward gradients among near-equal finalists.

## 2. Dataset / schema
- **Olympic 100m dash:** 13 Olympic Games since 1968 (Mexico City 1968 → Rio 2016), men and women. Raw run times per round (RO, QF, SF, FIN; in London 2012/Rio 2016 RO merged with QF). Source: SportsReference web page (2018). Performance rescaled as p = t_WR / t (world-record time at race date divided by run time), so p = 1 is a world record; p ≈ 0.5 corresponds to ~20–22 s ("average man"). RO+QF combined into a single stage for averaging.
- **National championships:** 70 countries, 1980–2006, 100m champions. Source: GBRAthletics (2018). Reported averages: men 0.938 ± 0.017, women 0.898 ± 0.027. Excluding 6 lowest countries (Seychelles, Luxembourg, Egypt, Tunisia, Madagascar, Ethiopia) the women's average jumps to 0.905.
- Empirical average performances (their Table 3): Men — RO+QF 0.934 (SD 0.032), SF 0.959 (SD 0.014), FIN 0.975 (SD 0.013); Women — RO+QF 0.915 (SD 0.046), SF 0.947 (SD 0.020), FIN 0.959 (SD 0.022).
- **Individual run-to-run variability:** histogram of performance differences between subsequent runs of the same participant in the same Games (participants with ≥2 runs). Very nearly Gaussian. Empirical SD ≈ 0.012–0.013 for both men and women. Men's distribution shifted significantly positive (p < 0.0001) — men run faster in later rounds (coasting early); women's centered at zero.

## 3. Method / model
Agent-based tournament simulation. 1,000,000 agents, each with fixed talent T_j drawn from a shared bounded [0,1] distribution (uniform, or truncated Gaussian with σ_T = 0.1 or 0.2, mean 0.5). Agents are grouped in tens; at each round t the group member with the highest performance advances; 6 rounds select a single winner (round-5 winners = "finalists", 10 agents; round-4 winners = "semi-finalists", 100 agents). Per round, each agent gets luck L_j(t) ~ Uniform(0,1). Performance: P_j(t) = a·T_j + (1−a)·L_j(t). The entire tournament is repeated 1000 times per configuration. Only two parameters: σ_T (talent-distribution width) and a (talent importance). Fitted by matching simulated performance distributions/averages at stages 4–6 to the three Olympic stages (RO+QF, SF, FIN), plus matching run-to-run variability.

## 4. Equations & assumptions
- P_j(t) = a·T_j + (1 − a)·L_j(t)  ...(1)
- T_j ∈ [0,1], fixed per agent; symmetric, centered at 0.5; uniform or truncated Gaussian σ_T ∈ {0.1, 0.2}.
- L_j(t) ~ U(0,1), i.i.d. per round.
- For a = 0 (pure luck) the expected average winner performance is 0.9, independent of stage.
- Run-to-run performance difference: since talent is fixed and the weighted luck component is U(0, 1−a), the difference of two subsequent runs has a symmetric triangular distribution on [−(1−a), (1−a)] with SD = (1 − a)/√6.
- Injustice metric: Z_t = Q / ΔTL_t, ΔTL_t = TL(t+1) − TL(t) (difference of average talent of stage-t losers vs stage-(t+1) losers), Q = 1 payoff step, normalized so Z_1 ≡ 1.
- Assumptions stated: social-circumstance effects deliberately omitted; talent bounded and symmetric; luck uniform; same a for all rounds; performance is a valid proxy scale; Olympic tournament attrition (3–4 of 8 advance) approximated by 1-of-10 model attrition (acknowledged slower real attrition); national championships ≈ model round 3.

## 5. Features / target
No ML features in the conventional sense. Inputs: talent-distribution width σ_T and talent weight a. Targets matched: stage-average performance at the last three tournament stages, full performance distributions per stage, and individual run-to-run performance-difference SD.

## 6. Validation design
No train/test split; this is simulation-to-empirical matching. Two independent empirical checks: (1) stage-average performances and full performance-distribution shapes at 3 stages vs simulated (their Tables 1/model vs Table 3/empirical, Figures 8 vs 11); (2) within-athlete run-to-run variability SD vs the analytic prediction (1−a)/√6; (3) national-championship winner averages vs simulated round-3 winner averages using the same fitted parameters. 1000 tournament replications per parameter configuration for statistical stability.

## 7. Numerical results / baselines
- Best-fit parameters: men σ_T = 0.15, a = 0.96; women σ_T = 0.14, a = 0.94.
- Model stage averages (their Table 1): Men — stage 4 (RO+QF) 0.935, stage 5 (SF) 0.968, stage 6 (FIN) 0.975; Women — 0.908, 0.949, 0.962. Empirical (Table 3): Men 0.934 / 0.959 / 0.975; Women 0.915 / 0.947 / 0.959. Agreement within ~0.007 everywhere.
- Headline: random luck accounts for ~4% of performance for men and ~6% for women at the Olympic level — presented as a strong lower bound for less controlled domains.
- Individual variability check: model-predicted SD = 0.04/√6 ≈ 0.016 (men), 0.06/√6 ≈ 0.024 (women), vs empirical 0.012–0.013 for both. "Remarkably close" (paper's words); women's empirical value is notably below the model prediction.
- National-championship check: simulated round-3 winner averages 0.939 (men) / 0.915 (women) vs empirical 0.938 ± 0.017 (men) / 0.898 ± 0.027 (women).
- Lucky-streaks result (Table 0, σ_T = 0.2, a = 0.5): of 1000 final winners, 852 were "moderately lucky" (L > 0.5) in all 6 rounds; 232 were "very lucky" (L > 0.75) in all 6; almost no final winner was moderately lucky in fewer than 5 of 6 rounds.
- Talent among winners (σ_T = 0.2, a = 0.5): practically no agent with talent < 0.5 won round 3; cutoff ~0.7 for round 4, ~0.8 for round 5 — despite 50% luck weight per round.
- Injustice metric: with linear payoff growth, for a = 1, σ_T = 0.2, the normalized unjust payoff disadvantage Z_t reaches 2700 for finalists vs the winner (2700× the bottom-of-hierarchy disadvantage); Z_t grows at late stages for all a.

## 8. Code / data availability
None stated. Data sources named: SportsReference (sports-reference.com/olympics), GBRAthletics (gbrathletics.com/nc), Alfano et al. 2017, Hopkins 2005, Malcata & Hopkins 2014, Paton & Hopkins 2006, Pyne et al. 2004.

## 9. Leakage
Not an ML paper; no leakage concept applies directly. Analogous concern: the two-parameter model was selected to fit the same Olympic data it is compared against (in-sample fit, no held-out Games). The run-to-run variability check is a genuinely independent moment, strengthening the claim.

## Limitations
- In-sample fit: parameters (σ_T, a) chosen to match the Olympic data they are evaluated on; no out-of-sample prediction demonstrated.
- Olympic attrition (3–4 of 8 advance per heat) vs model attrition (1 of 10) — different selection pressure, acknowledged but not modeled.
- Assumes talent fixed across rounds, luck i.i.d. uniform; no form/injury/heat-draw effects, no lane effects, no within-round strategic effort (the men's coasting effect is documented but not modeled).
- p = t_WR/t rescaling conflates era effects with talent; women's talent distribution width difference (0.14 vs 0.15) is thin evidence.
- Individual-variability check misses for women (0.024 predicted vs 0.012–0.013 observed) — under-explained.
- External validity: 100m is a near-zero-interaction, maximum-control discipline; transferring the 4% luck floor to team sports is the paper's stated extrapolation, not a demonstrated one.
- The injustice metric Z_t is admitted as arbitrary; results are illustrative.

## 10. GSE overlap vs existing-research-map
- Repo already covers "turnover luck (occurrence vs recovery)" and luck-layer metrics in gse-lab, plus Stuart's fumble-recovery findings — but none of them decompose outcome variance into a talent share vs irreducible luck share via a fitted generative model. The 750-program's goal ("most accurate and calibrated") makes the noise floor the central quantity: this paper gives a method to estimate it.
- Not overlapping with: 1701.05976 (nested AR(1) state-space team strength, already read), grouping loss (2210.16315), or the conformal WP work — all of which assume or measure uncertainty without estimating the irreducible luck component.
- Gap-list item 1 (Kelly sizing under uncertainty) and calibration lane benefit directly: the estimated (1−a) is the floor under which no model's Brier/log-loss can go, and the honest scale for Kelly fraction.

## 11. Implementation spec (GSE adaptation)
- **Noise-floor estimator ("luck share"):** For a chosen prediction target (e.g., NFL game margin), fit a and σ_T of an analogous team-tournament model to the empirical distribution of team performances across playoff-elimination stages (Wild Card → Divisional → Conference → Super Bowl), or simpler: estimate the triangular-difference SD identity on back-to-back same-opponent-strength games. Steps: (1) build per-team per-game "performance" = standardized margin vs spread expectation; (2) compute within-team consecutive-game differences, estimate SD; (3) invert: (1−a) ≈ SD·√6 under the uniform-luck assumption, then relax to fitted Beta/Gaussian luck via moment matching; (4) report luck share 1−a as the irreducible noise floor. Data: nflverse play-by-play 2000–2025 + spread closes (existing Odds API / historical odds lists in repo).
- **Calibration floor:** use the estimated noise floor as a hard floor on predicted outcome entropy — no team-game probability may imply less variance than the luck share permits (shrink toward the noise floor instead of toward 0/1).
- **Kelly sizing:** cap fractional-Kelly growth rates at the talent-share a — never size as if the talent component were the whole edge.
- Effort: 1–2 days for the moment-matching estimator; a week for the full ABM fitted to NFL playoff stages.

## 12. Reproducible test
Dataset: nflverse regular-season game margins vs closing spreads, 2010–2025. Compute within-team consecutive-game spread-residual differences; estimate the luck share 1−a via the (1−a)/√6 identity. Baseline to beat: the naive "all variance is talent" view predicts run-to-run difference SD → 0 for same-strength matchups; the paper's framework predicts SD ≈ (1−a)/√6 > 0. Test window: 2020–2025 seasons, pre-registered before computing. Success: estimated (1−a) ∈ [0.5, 0.8] for NFL point margins (plausible given NFL parity), stable across 5-year rolling windows within ±0.1.

## 13. Numeric gate
ADAPT confirmed if the NFL luck-share estimate is stable (±0.1 across rolling 5-year windows 2010–2025) and implies a calibration entropy floor that improves log-loss on 2023–2025 holdout by ≥0.005 vs the current engine probabilities. Reject the adaptation if the estimated luck share is unstable or the entropy floor does not improve holdout log-loss.

## 14. Improvement experiment
Replace the uniform luck assumption with a heavy-tailed luck distribution (e.g., a small probability of a large |L| shock — injuries, weather) and fit via the full run-to-run difference distribution (not just SD). Hypothesis: NFL outcomes have fatter tails than the triangular model; a two-component luck mixture (routine noise + rare shocks) will fit the consecutive-game difference kurtosis, and the shock component maps directly onto GSE's causal-injury and weather lanes. This also extends the paper: they never tested non-uniform luck.

## 15. Verdict

**ADAPT** — the luck-vs-talent decomposition via simulation fitted to empirical performance distributions gives GSE a principled noise-floor estimator: the irreducible luck share (1−a) estimated from within-unit run-to-run variability. Directly adaptable to team-strength uncertainty and calibration floors.
