# 0265 Framing Causal Questions in Sports Analytics: A Tutorial on Estimand Choice Illustrated Through Crossing in Soccer (arXiv:2505.11841v2)

**Citation:** Shomoita Alam, Erica E. M. Moodie, Lucas Y. Wu, Tim B. Swartz (2025). *Framing Causal Questions in Sports Analytics: A Tutorial on Estimand Choice Illustrated Through Crossing in Soccer*. arXiv:2505.11841v2. URL: https://arxiv.org/abs/2505.11841v2
**Ledger completed:** 2026-09-21. **Read:** full text (local extract, 1,130 lines, including appendices).
**Verdict:** ADOPT — the estimand-first causal protocol (ATE vs ATT vs ATNT, propensity-score matching with overlap diagnostics and dual SEs) should become GSE's standard template for any causal sports question; it is the most directly usable causal-methods paper in this wave.

## 1. Research question

The paper is a tutorial on a question sports analysts usually skip: *before* choosing an estimator, which causal estimand are you actually targeting? Using the running example "does crossing the ball (vs not crossing) cause more shots in soccer?", it walks through defining the ATE (average treatment effect), ATT (effect on the treated), and ATNT (effect on the non-treated), the identification assumptions each requires (consistency, positivity, no interference, no unmeasured confounding), and how the choice changes both the analysis and the interpretation. The empirical illustration estimates the causal effect of crossing on shot creation for Shandong Taishan Luneng FC.

## 2. Dataset / schema

- **Source:** Shandong Taishan Luneng FC (Chinese Super League), 30 matches from the 2017 season.
- **Units:** 2,225 crossing opportunities — 692 plays where a cross was attempted (treated), 1,533 where it was not (control).
- **Outcome:** binary — whether the play resulted in a shot.
- **Confounders (exact list):** score differential; distance of nearest defender; space controlled by the sender; distance of nearest teammate; distance to the endline; offensive-to-defensive player ratio in the box; player position (midfielder/defender indicators); final-ten-minutes indicator.
- **Schema (per opportunity):** treatment indicator (cross/no cross), the 8 confounders above, binary shot outcome.
- **Access:** proprietary club data; no public download. The small, single-team sample is the paper's main external-validity limit.

## 3. Method / model

1. **Estimand-first framing:** define ATE, ATT, ATNT explicitly and match the estimator to the question (e.g., ATT answers "what was the effect on the plays where crosses actually happened").
2. **Propensity-score estimation:** logistic regression of treatment (cross) on the 8 confounders (coefficients in the appendix; see §7).
3. **Matching:** nearest-neighbor matching with replacement and ties, via R's `Matching` package — separately for ATE (matching both directions) and ATT (matching controls to treated).
4. **Balance diagnostics:** standardized mean differences (SMDs) before and after matching; post-match target is all SMDs < 10%.
5. **Effect estimation with two standard errors:** Abadie–Imbens SEs and bootstrap SEs (1,000 resamples), reported side by side.
6. **Identification assumptions stated:** consistency, positivity (overlap), no interference (SUTVA), no unmeasured confounding — each discussed in the soccer context.

## 4. Equations & assumptions

Paper's mathematics, quoted faithfully:

- Potential-outcomes notation with treatment indicator; ATE, ATT, and ATNT defined as the corresponding mean differences in potential outcomes (average effect over all units / over treated units / over untreated units).
- Identification assumptions stated explicitly: (1) consistency; (2) positivity — every unit has nonzero probability of each treatment level within confounder strata; (3) no interference — one play's cross does not affect another play's shot outcome; (4) no unmeasured confounding (conditional exchangeability given the 8 confounders).
- Propensity score: logistic regression P(cross | confounders) with the appendix coefficients.
- Estimators: nearest-neighbor matching with replacement (and ties); Abadie–Imbens variance estimator and nonparametric bootstrap (1,000 resamples) for SEs.
- Balance criterion: standardized mean difference < 10% per covariate after matching.

## 5. Features / target

**Features (confounders):** score differential; nearest-defender distance; sender-controlled space; nearest-teammate distance; endline distance; offensive:defensive ratio in box; player position; final-ten-minutes indicator. **Treatment:** cross attempted (yes/no). **Target:** binary shot occurrence on the play. **Horizon:** the same play (immediate outcome, no forecasting horizon).

## 6. Validation design

No train/test split — this is causal estimation on one observational sample, not prediction. Validation consists of: (1) pre/post-matching SMD balance checks (target < 10%); (2) matched sample sizes reported (ATE: 3,589 vs 3,589; ATT: 1,486 vs 1,486); (3) dual standard errors (Abadie–Imbens analytic + 1,000-sample bootstrap) as a robustness cross-check; (4) explicit discussion of assumption plausibility (notably that no-interference is strained in soccer — a cross changes the defense's positioning for subsequent plays). No placebo test or sensitivity analysis for unmeasured confounding is reported in the extract.

## 7. Numerical results / baselines

All numbers are the paper's:

- **Sample:** 2,225 crossing opportunities (692 crosses, 1,533 no-cross), 30 matches, 2017 season.
- **Pre-matching SMDs (cross vs no-cross):** defender distance 70.06; controlled space 75.51; teammate distance 66.98; endline distance 102.33; player ratio 90.87 (all far above the 10% balance threshold — strong selection into crossing).
- **ATE analysis:** matched sample 3,589 vs 3,589; all post-match SMDs < 10%. ATE estimate 0.016; Abadie–Imbens SE 0.045; bootstrap SE 0.026 (1,000 resamples).
- **ATT analysis:** matched sample 1,486 vs 1,486. ATT estimate 0.050; both reported SEs 0.034.
- **Appendix logistic-regression coefficients (treatment = cross):** intercept −2.131; score differential −0.103; defender distance 0.309; controlled space 1.689; teammate distance 0.030; endline distance −0.125; offensive:defensive ratio 1.885; midfielder 0.537; defender 0.753; ten-minute warning 0.262.
- **Authors' interpretation:** crossing shows a small positive effect on shot creation that is not statistically distinguishable from zero (ATE 0.016 ± 0.045; ATT 0.050 ± 0.034) — the tutorial's point is the *framing*, not a significant finding.

## 8. Code / data availability

None stated in the extract. No repository, no data download; the analysis uses R's `Matching` package (public), but the club dataset is proprietary and the authors' scripts are not linked.

## 9. Leakage & limitations

- **No-interference is implausible in soccer.** A cross changes defensive shape and affects subsequent plays' outcomes; SUTVA violations bias both ATE and ATT in an unquantified direction. The authors acknowledge the tension but do not address it.
- **Single team, single season.** 692 treated plays from one club in 2017 — no basis for generalizing to other teams, leagues, or eras; opponent quality is unmodeled.
- **No sensitivity analysis for unmeasured confounding.** The entire causal claim rests on 8 measured confounders; no Rosenbaum-bounds or similar sensitivity check is reported, despite this being the standard complement to matching.
- **Matching with replacement inflates effective reuse** — the ATE matched sample (3,589 vs 3,589) exceeds the raw sample (2,225), meaning controls are heavily reused; variance estimates account for this (Abadie–Imbens) but the design is fragile.
- **No unmeasured-confounding discussion for the ATT either**, though ATT is the more policy-relevant estimand here.
- **NFL transfer:** soccer plays are fluid and interference-prone; NFL plays are discrete, which actually *helps* SUTVA — but NFL confounding (personnel, score, field position) is richer than 8 covariates, and the propensity model would need to be far more careful.

## 10. GSE overlap

**Extension of covered ground, new as a protocol.** The existing-research map shows causal inference is a commissioned topic of the 2026-09-18 ML brief, and the corpus already covers Yam & Lopez 2019, Daly-Grafstein 2023 (Heckman selection), the fourth-down correction literature, and FineCausal (2503.23911). What none of those provide — and this paper does — is an **estimand-first protocol**: explicitly choosing ATE vs ATT vs ATNT *before* estimating, with matching, SMD < 10% balance gates, and dual SEs as a reusable template. The map's gap #9 (causal injury impact) is exactly the kind of question this protocol serves. So: the causal-inference *topic* is covered, but the *estimand-first discipline* is a genuine extension that upgrades how GSE runs every causal analysis.

## 11. GSE implementation spec

1. **Adopt as GSE's causal-analysis SOP:** every causal question (injury impact, coaching changes, rule changes, scheme shifts) starts with a written estimand choice (ATE/ATT/ATNT) and its identification assumptions, before any code.
2. **NFL instantiation — causal injury impact (map gap #9):** treatment = starting QB (or LT) missing a game; outcome = offensive EPA/play; confounders = spread-implied team strength, opponent strength, rest, home/away, weather. Propensity model on 2016–2024 nflverse; nearest-neighbor matching with replacement; SMD < 10% gate; Abadie–Imbens + bootstrap SEs.
3. **NFL-ize the protocol:** cluster SEs by team-season (the paper's SEs ignore within-team correlation — with 32 teams × seasons of plays, this matters); add Rosenbaum-style sensitivity bounds for unmeasured confounding (the paper's missing piece); pre-register the confounder set.
4. **Tooling:** R `Matching` or Python equivalent (e.g., `causalml`/`pymatch`); pipeline lives in the repo next to the 2026-09-17 gse-lab tables so causal estimates join the metric suite.
5. **Effort:** 3–5 days for the SOP + first injury-impact analysis on existing nflverse data.

## 12. Reproducible test

Replicate the paper's *protocol* (not its soccer numbers) on an NFL question: does missing the starting QB causally reduce offensive EPA/play? Treatment: games with backup QB starting (2016–2024, nflverse + injury reports). Confounders: pre-game spread, opponent EPA/play allowed, rest days, home/away, dome/outdoor. Steps: (1) write the estimand (recommend ATT — effect on the games where backups actually played); (2) logistic propensity model; (3) nearest-neighbor matching with replacement; (4) require all SMDs < 10% post-match or declare failure; (5) report ATT with Abadie–Imbens and 1,000-sample bootstrap SEs. Baseline to beat: the naive unadjusted backup-vs-starter EPA gap — success = the matched ATT differs from the naive gap (showing selection was material) *and* the balance gate passes.

## 13. Acceptance / rejection gate

ADOPT the estimand-first protocol as GSE's causal SOP if the QB-injury replication (§12) passes its balance gate (all SMDs < 10%) and produces an ATT with bootstrap SE that is stable across two independent season-blocks (2016–2020 vs 2021–2024, same sign, overlapping CIs). REJECT the paper's specific estimators as a default (keep the framing): if matching cannot achieve balance on NFL confounders, fall back to doubly robust / causal-forest estimators rather than forcing a bad match — the protocol survives even when the estimator changes.

## 14. Improvement experiment

Go beyond the paper in the two places it is weakest: (1) **interference-aware estimands.** The paper assumes SUTVA and moves on. For NFL, plays within a game interfere by construction (a successful play changes the next play's state). Design the experiment around *exposure mappings* — e.g., the causal effect of a run-heavy game script on fourth-quarter EPA, where treatment is defined at the game level to sidestep within-game interference. (2) **Sensitivity-first reporting.** Add Rosenbaum bounds / E-values to every causal estimate as standard output, so each GSE causal claim ships with "how strong would unmeasured confounding need to be to kill this result." The paper's tutorial would be strictly better with this, and it is the difference between a causal estimate GSE can publish and one it cannot defend.
