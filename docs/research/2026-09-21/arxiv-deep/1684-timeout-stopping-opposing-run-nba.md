# 1684 The causal effect of a timeout at stopping an opposing run in the NBA (arXiv:2011.11691)

**Citation:** Connor Gibbs, Ryan Elmore, Bailey Fosdick (2021). *The causal effect of a timeout at stopping an opposing run in the NBA*. arXiv:2011.11691. URL: https://arxiv.org/abs/2011.11691
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all 6 sections + appendices A–C and supplement references).
**Verdict:** ADAPT — the Rubin-model + genetic-matching pipeline with the integrated centered-score-difference outcome is directly portable to NFL in-game decisions (4th-down go-for-it, 2-pt conversion, challenge, onside kick), but the NBA timeout estimand itself is not a GSE product input.

## 1. Research question

Does calling a timeout causally stop an opposing team's scoring run in the NBA? Coaches hold two philosophies — (1) call timeout to rest/regroup vs (2) save it and play through — and the paper estimates the average treatment effect on the treated (ATT) of a timeout called during a run, explicitly framing the analysis in the Rubin causal model with careful SUTVA justification.

## 2. Method / model

- **Causal framework:** Rubin potential-outcomes model; estimand is the ATT (effect on plays where a coach chose to call a timeout).
- **Run definition:** a run at time t is a ≥9-point change in score difference Δ(t) within the prior 2 minutes (pre-treatment window); run duration δt is the shortest time to attain the most extreme net change in that window.
- **Units:** each play time tj meeting 4 criteria: (1) a run is occurring, (2) no timeout in the 2-min pre-treatment window, (3) no timeout in the 1-min post-treatment window, (4) windows not truncated by period end. Final sample: 4,684 runs (834 RwT treated, 3,850 RwoT controls). Moneyline |·|>2400 units dropped to support positivity.
- **Propensity score:** generalized additive model (GAM) on pre-treatment covariates (Table 1: BiT team, opposing team, run point total, run duration, time left, win probability, signed score difference at beginning/end of run, possession indicator, home indicator, week in season, over/under, spread, moneyline). 70/30 Monte Carlo validation (1,000 splits): PPV 0.612, NPV 0.847.
- **Matching:** genetic matching (Diamond & Sekhon 2013; R Matching package, Sekhon 2011) minimizing generalized Mahalanobis distance on covariates + propensity score, one-to-many with replacement; balance checked via Love plot (standardized bias < ±0.2), bootstrapped KS tests, t-tests, chi-squared with FDR 0.05.
- **Novel outcome:** integrated centered-score difference (Eq. 5).
- **Franchise-level ATT:** per-franchise ATTf via within-matched-set mean differences, non-parametric bootstrap 95% CIs, paired permutation tests + Benjamini–Hochberg FDR.
- **Sensitivity:** alternative run definitions (point thresholds 7/8/9/10 × duration caps 1.5/2/2.5/3 min) and Rosenbaum Γ sensitivity to unmeasured confounding.

## 3. Mathematics / equations / assumptions

- Run duration: δt = min{argmax_d(|Δ(t)−Δ(t−d)| : 0<d≤2)}.
- Signed run point total: s(t) = Δ(t)−Δ(t−δt) if |·|≥9, else NA; run point total r(t)=|s(t)|.
- Potential outcomes: Yi = Yi(0) if Ti=0, Yi(1) if Ti=1.
- ATT = E[Yi(1)−Yi(0) | Ti=1].
- Novel outcome (Eq. 5): yi = −sgn(s(ti)) ∫_{ti}^{ti+1} [Δ(x)−Δ(ti)] dx — the integrated, centered score difference over the 1-minute post-treatment window; positive = run stopped/reversed, zero = even exchange, negative = run continued.
- Franchise ATT (Eq. 6): ATTf = E[Yi(1)−Yi(0) | Ti=1, Bi=1], Bi = indicator f is the BiT team.
- Assumptions: strong ignorability (conditional on covariates), SUTVA — defended at length: criterion 2 (no timeout in pre-window) preserves "no hidden variation" among treated/controls (back-to-back timeouts = different treatment version); criterion 3 (no timeout in post-window) preserves "no interference" from a second intervention; Appendix A enumerates residual minor SUTVA violations (e.g., overlapping 3-minute windows across nearby plays).

## 4. Dataset / schema

- **Source:** NBA official API via R package nbastatR (Bresler 2019).
- **Sample:** all regular-season games 2017-18 and 2018-19; 1,230 unique games; 1,144,461 raw events (18 variables each, ~465 events/game, SD 33.9) collapsed to 778,828 plays (multi-row plays collapsed to last scoring event; timeout indicator recorded).
- **Runs:** 31,081 run plays identified; 1,149 run plays with timeout; 29,932 without.
- **Schema per unit:** tj (game time), treatment Ti, outcome yi, 13 covariates (Table 1), team identities, period.
- **Access:** public (NBA API; nbastatR). Replicable in principle; the supplement details 5-second grid expansion and "plotting plays" preprocessing.

## 5. Features / target

- **Features (propensity covariates):** BiT team, opposing team, run point total, run duration, time left (48−t), BiT win probability at treatment, signed score difference at beginning and end of run, possession indicator (BiT has ball), home indicator, week in season, Las Vegas over/under, spread, moneyline (proxies for team skill).
- **Target (outcome):** integrated centered-score difference yi over the 1-minute post-treatment window (Eq. 5), signed so positive = the run was stopped/reversed.

## 6. Validation design

- **Design:** observational causal study with genetic matching; balance diagnostics before/after matching (Love plot, KS/t/chi-squared tests with FDR control).
- **Propensity model validation:** 1,000 Monte Carlo 70/30 splits; PPV 0.612 / NPV 0.847.
- **Matching stability:** 20 re-runs of the genetic matching; ATT estimates consistent across realizations.
- **Sensitivity:** (a) 4×4 grid of alternative run definitions; (b) Rosenbaum Γ bounds for unmeasured confounding.
- **Franchise analysis:** per-team ATT with bootstrap CIs and permutation tests with FDR control.
- No train/test split on the outcome; this is an estimation study, not a predictive one.

## 7. Exact results and baselines (numbers)

- **Naïve (unmatched) estimate:** −0.08 (insignificant).
- **Matched ATT:** **−0.35**, Abadie–Imbens SE **0.07**, p < 0.001 — calling a timeout during an opposing run is slightly disadvantageous on average (opposing team continues to outscore at a faster rate than in matched no-timeout runs).
- **Balance:** before matching, propensity standardized bias "well past ±0.2"; after matching, all covariates < 0.2 absolute; KS/t/chi-squared tests find no distributional discrepancy post-matching (FDR 0.05).
- **Franchise ATTs:** 20 of 30 franchises have negative point estimates; after FDR control, **Indiana Pacers and Utah Jazz** have significant negative ATTs; no positive franchise effect survives multiple-testing correction.
- **Robustness:** estimated effect negative and significant for every alternative run definition (7–10 points × 1.5–3 min).
- **Rosenbaum sensitivity:** 95% CI includes 0 at Γ ≈ 1.50 (authors note this bound is conservative and likely overstates sensitivity).
- **Sample:** 4,684 final units (834 RwT, 3,850 RwoT); Chicago Bulls most RwTs (41); median 27.5 RwTs/franchise.

## 8. Code / data availability

Data: NBA API (public) via nbastatR R package (Bresler 2019). Code: **none stated** — no GitHub repo linked in the paper (methods reference the R Matching package and mgcv-style GAM fitting; appendices give algorithm arguments: genetic matching population 8,000, wait generation 4, max generation 100, tolerance 1e-5).

## 9. Leakage and limitations

- **Positivity trimming is ad hoc:** dropping |moneyline|>2400 removes extreme mismatches; residual positivity concerns for rare coach×situation cells.
- **Unmeasured confounding:** Γ≈1.50 sensitivity — an unmeasured confounder with 1.5× odds effect on timeout choice kills significance (e.g., coach's read of player body language/fatigue, which plausibly drives both timeouts and outcomes).
- **Residual SUTVA violations:** overlapping 3-minute windows across plays (Appendix A concedes minor violations).
- **Outcome window is short:** 1-minute post-treatment window may miss delayed effects (a timeout's regrouping benefit could accrue over 5+ minutes).
- **Timeout heterogeneity:** all timeouts treated as identical; 20-second vs full timeouts, what the coach actually drew up, and who was on the floor are unmodeled ("hidden variation" partially waved away).
- **External validity to NFL:** timeouts don't exist the same way in football; the estimand is basketball-specific, though the pipeline transfers.

## 10. GSE overlap

GSE's engine is a prediction system (spread/moneyline/total picks); the repo has causal-inference material (causal-forest HTE paper 2206.10323, infield-shift quasi-experiment 2411.15075, counterfactual combine 2602.23233). No existing GSE work estimates causal effects of *in-game coaching decisions* from play-by-play with matching — this paper's exact contribution (formal run definition + SUTVA-aware unit construction + genetic matching + integrated outcome) is a new capability: **causal play-calling analysis** (e.g., does going for it on 4th causally shift win probability vs matched punt situations?).

## 11. GSE implementation spec

- **Data:** nflverse play-by-play (1999–present) — the NFL analogue of the NBA API feed.
- **Units:** 4th-down decisions (go-for-it vs punt/FG) or 2-point conversion attempts; pre-treatment window = game state to decision point; post-treatment = next drive or rest of half (integrated centered win-probability difference as outcome — direct analogue of Eq. 5 with WP replacing score difference).
- **Covariates:** yard line, yards to go, score differential, time remaining, timeouts remaining, pre-game spread/total, weather, team identities, coach identity.
- **Propensity:** GAM or gradient-boosted propensity of "aggressive decision"; genetic matching (R Matching or Python pymatch/causalml).
- **Estimand:** ATT of aggressive 4th-down decisions on drive/half outcome; heterogeneity by coach (franchise analogue).
- **Serving:** offline research artifact feeding GSE's 4th-down recommendation content and "coaching edge" features; could become a public "Was it the right call?" causal series for @GalaxySportsHQ.
- **Effort:** 2–3 weeks (data wrangling + matching pipeline + sensitivity).

## 12. Reproducible test

- **Dataset:** nflverse pbp 2019–2024 regular seasons; 4th-down plays with 1–10 yards to go, excluding end-of-half kneels.
- **Metric:** matched ATT of "go for it" vs "kick" on change in win probability over the remainder of the half (integrated centered WP, NFL analogue of Eq. 5), Abadie–Imbens SE.
- **Baseline to beat:** naïve unmatched difference-in-means; the causal pipeline must (a) achieve post-match standardized bias < 0.2 on all covariates, and (b) produce an ATT whose sign and magnitude are stable across 2 alternative unit definitions (e.g., including/excluding FG attempts as controls).
- **Window:** 2019–2024 seasons, time-ordered (fit propensity on 2019–2022, estimate on 2023–2024 as a pseudo-out-of-sample check).

## 13. Acceptance / rejection gate + improvement experiment

- **Gate (numeric):** ADOPT the pipeline if on the NFL 4th-down replication (a) post-match |standardized bias| < 0.2 for all covariates, (b) ATT estimate has |t| > 2 and the sign is unchanged when FG attempts are excluded from the control pool, and (c) Rosenbaum Γ for loss of significance ≥ 1.5. REJECT the transfer if balance fails or Γ < 1.2.
- **Improvement experiment:** replace the single 1-minute-style outcome window with a *dose-response over outcome horizons* (rest-of-drive, rest-of-half, rest-of-game) to trace how the causal effect decays — the paper fixes one horizon; a horizon curve would reveal whether timeouts (or 4th-down decisions) have delayed regrouping benefits the 1-minute window misses. Second: swap genetic matching for double machine learning (Chernozhukov et al.) with cross-fitted nuisance models and compare ATTs — if DML agrees within 1 SE, the result is method-robust.

**Verdict:** ADAPT — the Rubin-model + genetic-matching pipeline and integrated-outcome construction transfer directly to causal analysis of NFL in-game coaching decisions, a new GSE capability.
