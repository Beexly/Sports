# [0329] Kicking for Goal or Touch? An Expected Points Framework for Penalty Decisions in Rugby Union (arXiv:2512.00312v2)

**Citation:** Kenny Watts and Jonathan Pipping-Gamón (2026). *Kicking for Goal or Touch? An Expected Points Framework for Penalty Decisions in Rugby Union*. arXiv:2512.00312v2. URL: https://arxiv.org/abs/2512.00312v2
**Ledger completed:** 2026-09-21. **Read:** full text (PDF text extract, 649 lines).
**Verdict:** ADAPT — rugby-specific EP decision-map machinery, but the ΔEP indifference-frontier + regret-evaluation design ports directly to NFL 4th-down and kickoff decisions with NFL data.

## 1. Research question
After a penalty in rugby union, a team must choose between kicking at goal (3 points) and kicking to touch (lineout, try pursuit). The paper builds the first comprehensive, data-driven expected-points framework for this decision: two context-aware EP surfaces — expected points of a possession beginning with a lineout, and expected points of a penalty kick including the continuation value of a miss — compared to produce field-position decision maps (indifference frontiers), sensitivity to game context (cards, team strength), and a regret-based evaluation of real decisions in a New Zealand vs. South Africa case study.

## 2. Dataset / schema
- **Phase-level event logs, 2018/19 Premiership Rugby season** (compiled by Martinez-Arastey et al. 2025): 132 matches, 35,199 phases of play. Each record: initiating event type, zonal field location and side, score differential, next score in points for/against team in possession. Restricted to opening phases (Phase = 1) whose initiating event is a lineout; after cluster subsampling (one retained observation per `run_id` group), **2,046 lineout observations**. Derived variables: `meter_line` (continuous meters from own goal line), `Sec_Remain_Half`, `Points_Difference`, `Card_Diff` (net yellow/red-card player advantage), `WinPct_Diff` (running win-% difference at kickoff), `Points` (next score). Public via the Martinez-Arastey et al. 2025 benchmark (Journal of Sports Analytics).
- **Penalty-kicking data, Quarrie & Hopkins (2015)**: 582 international rugby matches, 2002–2011; **3,802 penalties** aggregated into a 5 m × 5 m grid over the pitch with observed success proportions per cell.
- **Case study**: authors-collected penalty decisions from New Zealand vs. South Africa, played September 16, 2025 (13 penalties within 60 m of the opponent try line).
- Kick-restart table for miss continuation: 93 kick-restart entries from the phase data (n=4/17/27/45 by zone).

## 3. Method / model
Two EP surfaces, then a difference surface:
1. **Lineout EP** — multiple linear regression on next-score value: `EPlineout = β̂0 + β̂1·meter_line + β̂2·Card_Diff + β̂3·WinPct_Diff`, fit on the 2,046 retained lineout observations. Cluster subsampling: within each `run_id` group (n consecutive lineouts for the same team, same score differential, same eventual outcome), one observation drawn uniformly `Ỹ ∼ Uniform{Y1,...,Yn}` and the rest discarded — conceptually similar to cluster-level subsampling in Brill et al. (2025).
2. **Kick success** — `P(make | d, θ) = logit⁻¹{β0 + f(d, θ)}`, a 2D spline `f(d,θ)` in distance and lateral angle fit by GAM with logistic link and quasi-binomial family (overdispersion), smoothing chosen by Restricted Maximum Likelihood; calibration diagnostics and cross-validation reported (no numeric CV scores given in text).
3. **Kick EP** — `EPkick(d,θ) = Pmake(d,θ)·3 + (1−Pmake(d,θ))·EPmiss(d,θ)`, where `EPmiss` is approximated from the expected next-score value of 22 m drop-out restarts (93 observations, zone-averaged; Table 5), under the simplifying assumption that every miss leads to a 22 m drop-out.
4. **Decision quantity** — `ΔEP(x, y; dtouch) = EPlineout(xLO) − EPkick(x, y)`, with `xLO = max{5, x − dtouch}` (penalty x in meters from opposition try line; truncation at 5 m per rugby laws; lateral coordinate unchanged). Decision maps drawn for `dtouch ∈ {0, 5, 10, 15, 20, 25}` m; positive ΔEP favors the lineout, zero traces the indifference frontier.

## 4. Equations & assumptions
Stated equations (copied faithfully):
- `ΔEP (x, y; dtouch ) = EPlineout (xLO ) − EPkick (x, y)`
- `EPlineout = β̂0 + β̂1 · meter_line + β̂2 · Card_Diff + β̂3 · WinPct_Diff`
- `Ỹ ∼ Uniform {Y1 , . . . , Yn }` (cluster subsampling)
- `P(make | d, θ) = logit−1 {β0 + f (d, θ)}`
- `EPkick (d, θ) = Pmake (d, θ) · 3 + (1 − Pmake (d, θ)) · EPmiss (d, θ)`
- `xLO = max{5, x − dtouch }`
- Regret: `R = EPoptimal − EPactual`
Stated assumptions: (i) only opening phases of possessions entering the EP model (no phase-level double counting); (ii) one retained observation per run_id group; (iii) missed penalties lead to a 22 m drop-out (in-play returns ignored); (iv) kick-to-touch gains a fixed `dtouch` meters along the field, lateral position unchanged, truncated at the 5 m line; (v) club-phase data and international kicking data combined despite different competition levels; (vi) only two options (scrum and tap-and-go excluded); (vii) linear EP model in meter_line, Card_Diff, WinPct_Diff; (viii) objective is expected points, not win probability.

## 5. Features / target
- Lineout model inputs: `meter_line`, `Card_Diff`, `WinPct_Diff` (+ intercept). Target: `Points` — expected value of the next scoring event (points for minus points against, from Table 1 values like ±3, ±7) following a possession beginning with a lineout.
- Kick model inputs: `d` (distance from penalty spot to post center), `θ` (lateral angle). Target: binary make/miss per grid cell (quasi-binomial on cell proportions).
- Miss continuation: target = expected next-score value of 22 m drop-out restarts by zone (Table 5: values 2.75, 1.24, −0.63, 1.24; overall 0.76 on n=93).
- Decision surface: no new targets; ΔEP is derived.

## 6. Validation design
- Lineout regression: coefficient t-tests (Table 4); no held-out test set or out-of-sample validation reported.
- Kick GAM: "standard calibration diagnostics and cross-validation" reported qualitatively; no numeric CV results in the text.
- No time-ordered train/test split, no backtesting protocol, no numeric baselines compared against; the case study (NZ vs SA, 13 penalties) serves as an applied evaluation rather than a validation.
- Scenario analyses (varying Card_Diff; WinPct_Diff at −25 pp / 0 / +25 pp) test sensitivity of the decision frontier.

## 7. Numerical results / baselines
- Lineout EP regression (Table 4): Intercept 3.2545 (SE 0.2093, t=15.553, p<2e-16); meter_line −0.0586 (SE 0.0044, t=−13.283, p<2e-16); Card_Diff 0.8802 (SE 0.3052, t=2.884, p=0.00397); WinPct_Diff 0.6503 (SE 0.3430, t=1.896, p=0.05809).
- Miss-continuation values (Table 5): 10m–22m (opp) n=4 → 2.75; Half–10m (opp) n=17 → 1.24; 10m–Half (own) n=27 → −0.63; 22m–10m (own) n=45 → 1.24; overall n=93 → 0.76.
- Case study (NZ vs SA, Sept 16 2025): at 15 m from left touch line, 30 m from try line (22nd min, even match, no cards), the lineout becomes preferable once expected touch gain exceeds ≈16 m; with a conservative 20 m gain: EP lineout 2.67, EP kick 2.42, ΔEP = +0.25 favoring the lineout.
- Aggregate over all 13 in-range penalties: **total regret R = 1.39 points; proportion of optimal decisions = 0.46**. Individual regrets (Table 7): SA rows 0.31, 0.25, 0.25, 0.10, 0.22, 0.17; NZ rows 0.00, 0.00, 0.00, 0.09, 0.00, 0.00, 0.00. Final score 24–17 NZ — the authors note the 1.39 regret would not have swung the outcome, and that most "wrong" decisions sat near the indifference frontier.
- Sensitivity: kicks preferred more often when the attacking team is down a player; lineouts preferred more with a numerical advantage; stronger teams get larger lineout EP across much of the pitch (weaker teams relatively better taking the kick) — no numbers given, figures only.

## 8. Code / data availability
"All code used to process the data, fit the models, and generate the figures and tables in this article is available on GitHub" — **no URL stated in the paper**. Phase data from Martinez-Arastey et al. (2025) is public (Creative Commons); kicking data from Quarrie & Hopkins (2015) — availability not stated.

## 9. Leakage & limitations
- **Selection bias (acknowledged by authors):** stronger teams generate more attacking lineouts and more penalties; coaches kick only when makeable — inflates lineout EP near the try line and kick-success estimates.
- **Cross-competition mismatch:** club-level phase data (2018/19 Premiership) fused with international kicking data (2002–2011, a different decade) — player quality, context, and kicking trends (longer-range kicking in 2026 vs 2002–2011) differ; the authors flag this explicitly.
- **Tiny continuation samples:** EPmiss rests on n=93 kick restarts, with one cell at n=4 (value 2.75) — high variance driving the kick surface.
- **Two-option restriction:** scrums and tap-and-go (material near the goal line) excluded.
- **Crude miss assumption:** every miss → 22 m drop-out; live-ball returns ignored by assumption.
- **No temporal or held-out validation** of either EP surface; regression coefficient significance is the only formal check.
- **EP vs WP:** optimizes expected points, not win probability — the authors' own closing critique; decisions late in a match or at given score differentials should be on WP scale.
- **NFL transfer note (my inference):** none of the rugby numbers transfer; the artifact is the ΔEP/regret *method*, not the values.

## 10. GSE overlap
Extension, not duplicate. Per the existing-research map: GSE has deep NFL 4th-down coverage — Brill/Yurko/Wyner "Analytics, have some humility" (2311.03490, read in depth), Romer 2006, Sandholtz et al. 2309.00756 (risk preferences in 4th-down MDPs), Yam & Lopez 2019, nfl4th WP models, and ngreenberg 4th-down go-for-it estimates (2002–2026, in the 2026-09-20 full-tables). No rugby content exists in the repo, and none of the NFL decision work uses the paper's specific two-surface ΔEP-indifference-frontier + per-decision regret accounting. Closest existing capability: NFL 4th-down WP models, which this would extend with (a) a kick-vs-alternative decision-map design portable to kickoffs/onside decisions, and (b) the regret-evaluation accounting for coaching decision quality.

## 11. GSE implementation spec
Port the machinery to NFL, not the rugby numbers:
1. **Data:** nflverse play-by-play 2009–2025 (WP/EP models already standard); FTN charting for kick-return formations.
2. **Decision problems to port to:** (a) 4th-down go/punt/FG as ΔEP/ΔWP indifference frontiers with sensitivity grids (kicker strength, weather, team quality) — complements nfl4th; (b) **kickoff decisions under the new dynamic kickoff** — return vs. touchback vs. fair catch as the closest analogue of "lineout vs. kick," with the kick-success surface replaced by return-distribution modeling; (c) **2-point conversion** decision maps by score differential and time remaining.
3. **Regret accounting:** per the paper's R = EPoptimal − EPactual, build a season-long coaching-decision regret ledger per team/coach — a content product ("coaching decision quality" weekly cards for @GalaxySportsHQ).
4. **Team-specific calibration:** mirror the paper's stated personalization extension — fit kicker-specific success surfaces (their dtouch/kicker translation point) using per-kicker FG data.
5. **Effort:** 1–2 weeks for a 4th-down regret ledger on nflverse; 3–4 weeks for the kickoff-return decision maps (requires return-outcome distribution modeling).

## 12. Reproducible test
Dataset: nflverse play-by-play, 2022–2025 regular seasons, all 4th-down plays. Metric: Brier score / log-loss of a ΔWP decision-frontier recommendation model vs. actual go-for-it outcomes; secondary: realized-WP regret per team-week. Baseline: nfl4th WP model's recommendations. The test: replicate the paper's Δ-frontier + regret accounting on NFL 4th downs and compare per-team regret rankings to actual 4th-down conversion outcomes.

## 13. Acceptance / rejection gate
**Adopt** the Δ-frontier/regret framework for the GSE coaching-decision product only if, on 2022–2025 4th downs, the per-team regret rankings are stable year-over-year (Spearman ρ ≥ 0.4 across season pairs) AND the ΔWP-based recommendations beat nfl4th on realized-WP regret by ≥0.05 points per decision. **Reject** (as an NFL product) if regret rankings don't replicate across seasons or the framework adds nothing over nfl4th — the rugby-specific surfaces stay as method reference only.

## 14. Improvement experiment
Extend the paper's framework to the NFL **dynamic-kickoff return decision** — return vs. touchback as the "kick for touch vs. kick at goal" analogue — but replace their fixed-`dtouch` translation assumption with a modeled return-distribution: estimate the full expected-point distribution of returns (not just the mean) conditional on kickoff hang time, coverage formation (from FTN charting), and return-unit quality, then optimize on **win probability** rather than EP, addressing the paper's own EP-vs-WP critique. If the return distribution's tail risk (TD allowed) dominates the mean, the frontier will shift versus the rugby-style mean-only map — that comparison is the publishable result.
