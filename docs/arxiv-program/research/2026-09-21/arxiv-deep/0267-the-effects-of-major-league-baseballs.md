# 0267 The Effects of Major League Baseball's Ban on Infield Shifts: A Quasi-Experimental Analysis (arXiv:2411.15075v1)

**Citation:** Lee Kennedy-Shaffer (2024). *The Effects of Major League Baseball's Ban on Infield Shifts: A Quasi-Experimental Analysis*. arXiv:2411.15075v1. URL: https://arxiv.org/abs/2411.15075v1
**Ledger completed:** 2026-09-21. **Read:** full text (local extract, 1,511 lines, including appendices A–B).
**Verdict:** ADOPT — the DID + synthetic-control quasi-experimental protocol, with its pre-registered treatment/control construction, placebo battery, and full technical appendix, is the strongest directly reusable template in this wave for evaluating NFL rule changes, injuries, and coaching changes; it directly targets the corpus's causal-injury-impact gap.

## 1. Research question

MLB banned the infield shift starting in the 2023 season. The paper asks: what was the causal effect of the ban, (a) league-wide, via difference-in-differences comparing bases-empty plate appearances of left-handed batters (heavily shifted, treated) vs right-handed batters (rarely shifted, control) in 2023 vs 2022; and (b) player-specifically, via the synthetic control method on 30 heavily-shifted players vs 58 rarely-shifted donors? It also tests persistence into 2024 and runs in-unit and in-time placebo analyses.

## 2. Dataset / schema

- **League-wide (DID):** FanGraphs splits leaderboard, bases-empty PAs, seasons 2015–2024 excluding 2020; outcomes BABIP and OBP (plus batting average, BB%, K%, OPS, slugging, wOBA in the companion Shiny app). Treatment group: left-handed batters; control: right-handed batters.
- **Player-level (SCM):** Baseball Savant Statcast Custom Leaderboard + Batter Positioning Leaderboard; players with ≥ 250 PAs. Targets: 30 players with ≥ 75% shift rate in 2022; donors: 58 players with ≤ 15% shift rate in 2022; required seasons 2021–2023 (persistence subset: 27 targets, 42 controls with ≥ 250 PAs through 2024). Outcomes: OBP, OPS, wOBA.
- **SCM covariates (exact list):** (1) player age in 2022; (2) the outcome's value in each pre-intervention season; (3) plate appearances; (4) hits; (5) singles; (6) home runs; (7) walk percentage; (8) strikeout percentage — items 3–8 for 2022, 2021, and the pre-2020 average (seasons where the target had ≥ 250 PAs).
- **Access:** all data from public sources (FanGraphs, Baseball Savant); code and interactive results public (see §8). Fully replicable.

## 3. Method / model

1. **Difference-in-differences:** θ̂(j,t) = (Y(j,1,t) − Y(j,1,t−1)) − (Y(j,0,t) − Y(j,0,t−1)) for outcome j, LHB group i=1, RHB group i=0; 2023 vs 2022 primary, 2024 vs 2023 persistence; placebo estimates for all pre-2023 years as a parallel-trends check.
2. **Synthetic control (tidysynth R package):** per target player and outcome, nonnegative weights summing to 1 over donors, chosen to minimize RMSE between weighted donor covariates and target covariates, with covariate importance weights selected by validation on pre-intervention MSPE (full 2015–2022 ex 2020 where the target had ≥ 250 PAs). Effect θ̂(j,n,2023) = observed − synthetic.
3. **Placebo battery:** in-unit (25 players with 15–30% 2022 shift rates as fake targets — expect small effects), in-time (rerun as if 2022 were the intervention year, dropping 2022 data — expect null), and donor placebo distribution for inference (58 donors each treated as a fake target).
4. **Estimation details:** donor pool varies per target (only donors with ≥ 250 PAs in the target's qualifying seasons); weights re-estimated per outcome; 2024 extension re-runs with 2024-qualified pools.

## 4. Equations & assumptions

Technical appendix mathematics, quoted faithfully:

- Potential outcomes: Y⁰(j,i,t), Y¹(j,i,t) for outcome j, population i (1 = LHB bases-empty, 0 = RHB bases-empty), season t; ATT estimands θ(j,1,2023) = E[Y¹(j,1,2023) − Y⁰(j,1,2023)] and θ(j,2024) − θ(j,2023).
- DID estimator: θ̂(j,t) = (Y(j,1,t) − Y(j,1,t−1)) − (Y(j,0,t) − Y(j,0,t−1)).
- Assumptions: (1) consistency and no anticipation (Y = Y⁰ for t < 2023, Y = Y¹ for t ≥ 2023); (2) no spillover (ban does not affect RHB PAs); (3) parallel trends: E[Y⁰(j,1,t) − Y⁰(j,1,t−1)] = E[Y⁰(j,0,t) − Y⁰(j,0,t−1)] for t ≥ 2023.
- Unbiasedness result: under (1)–(3), E[θ̂(j,2023)] = θ(j,2023); and E[θ̂(j,2024)] = θ(j,2024) − θ(j,2023) (i.e., the 2024 DID estimates the *incremental* effect).
- SCM: θ̂(j,n,2023) = Y(j,1,n,2023) − Ŷ⁰(j,1,n,2023), Ŷ⁰ = Σₘ w(j,n,m)·Y(j,0,m,2023), Σₘ w = 1, w ≥ 0; weights minimize (Σₖ vₖ[X(k,1,n) − Σₘ w(j,n,m)X(k,0,m)])^½ with importance weights v chosen to minimize pre-intervention MSPE over τ.
- SCM assumptions: target's pre-intervention characteristics in the convex hull of donors; stable weights over time; effect larger than outcome volatility.
- League-wide rescaling: multiply the ATT by the share of PAs in the treated category (23.3%) to get the aggregate league effect.

## 5. Features / target

**DID:** groups (LHB/RHB bases-empty), seasons; targets BABIP and OBP (main text), plus average, BB%, K%, OPS, slugging, wOBA (app). **SCM:** per-player covariates listed in §2; targets OBP, OPS, wOBA at the player-season level. **Horizons:** 2023 (primary), 2024 (persistence); placebos at pre-2023 years.

## 6. Validation design

No train/test split — quasi-experimental identification. Validation: (1) pre-2023 DID placebo series as parallel-trends evidence (2021–2022 estimates "tend to be somewhat negative," flagged by the author as a possible negative pre-trend biasing toward the null); (2) donor-placebo null distribution for SCM inference (Seager p = 0.017 on all three outcomes); (3) in-unit sensitivity (15–30% shift players, expect attenuated effects); (4) in-time sensitivity (fake 2022 intervention, expect null); (5) persistence re-estimation on 2024 data with a re-qualified sample; (6) full technical appendix with the unbiasedness proof. Time ordering is inherent (pre/post 2023).

## 7. Numerical results / baselines

All numbers are the paper's:

- **Table 1 (DID, bases-empty):** LHB BABIP 0.275 → 0.287 (diff 0.012); RHB BABIP 0.291 → 0.294 (diff 0.003); DID 0.009. LHB OBP 0.299 → 0.315 (diff 0.015); RHB OBP 0.303 → 0.309 (diff 0.006); DID 0.009.
- **SCM sample:** 30 targets (≥ 75% 2022 shift rate), 58 donors (≤ 15%); ≥ 250 PAs; 2021–2023 required. Persistence: 27 targets, 42 controls through 2024.
- **Corey Seager (92.8% 2022 shift rate):** OBP synthetic 0.305 vs observed 0.390, effect 0.085; OPS 0.742 vs 1.013, effect 0.271; wOBA 0.304 vs 0.419, effect 0.115; in-time/donor placebo p-values 0.017 for all three.
- **Distribution:** over 75% of target players had positive estimated effects. A 10-percentage-point higher 2022 shift rate corresponded to estimated increases of 11 points of OBP, 31 points of OPS, and 17 points of wOBA.
- **Largest effects:** four players with wOBA effects over 80 points and OPS effects over 200 points: Corey Seager, Matt Olson, Yordan Alvarez, Shohei Ohtani.
- **Aggregate league effect:** bases-empty LHB PAs were 23.3% of all 2023 PAs → implied aggregate effect ≈ 2 points of OBP/BABIP, i.e., about one extra on-base event per 500 PAs.
- **Author-stated caveats:** possible negative pre-trend in 2021–2022 (bias toward null); no-spillover assumption imperfect (pitching behavior may have changed league-wide); 250-PA selection; donor-fit quality varies; ATT is context-specific to 2023 baseball.

## 8. Code / data availability

Paper states: analysis code at `https://bit.ly/QE-Baseball` (GitHub repository) and interactive results at `https://bit.ly/SCM-baseball` (Shiny app with additional outcomes). Data from public FanGraphs/Baseball Savant leaderboards. This is the most reproducible paper in the wave.

## 9. Leakage & limitations

- **No-spillover is shaky.** The ban plausibly changed pitcher behavior against RHBs too (different pitch mixes with no shift behind them), which would contaminate the control group and bias the DID — the author flags this.
- **Possible negative pre-trend.** 2021–2022 placebo DID estimates trend negative; if that continued into 2023 absent the ban, the 0.009 estimates are biased *downward* (conservative, but still biased).
- **250-PA selection.** Both targets and donors must clear playing-time bars, selecting for established major leaguers; effects on fringe players are unmeasured.
- **Donor-pool dependence.** The pool is redefined per target (PA-qualified seasons), so each synthetic control is a bespoke construction; comparability across the 30 estimates is approximate.
- **ATT context specificity.** The estimates are for 2023 MLB with its specific ball, parks, and pitching meta; they do not transport to other seasons' run environments without adjustment.
- **NFL transfer:** baseball PAs are near-independent trials; NFL plays have sequential dependence and tiny treated samples (one team changes scheme), so the DID half transfers better than the SCM half, which needs a credible donor pool of comparable teams.

## 10. GSE overlap

**New capability filling a named gap.** The existing-research map's gap #9 is "causal injury impact — player-level causal injury effect estimation (synthetic controls on QBs/OL) is thin," and gap #3-adjacent needs cover rule-change evaluation. The corpus has causal-inference topics (fourth-down literature, FineCausal, the ML brief) but **no DID/SCM quasi-experimental protocol with a sports application** — this paper is the first complete, reproducible blueprint: pre-registered treatment/control construction, dual DID+SCM identification, placebo battery, persistence check, and a technical appendix with proofs. It pairs directly with this wave's 0265 (estimand-first framing) and 0266 (sPoRT positivity diagnostics): 0265 says what to target, 0266 checks support, 0267 executes. The 2026-09-20 sweep's ngreenberg 4th-down go-for-it estimates are descriptive, not causal — this paper upgrades that lane to causal.

## 11. GSE implementation spec

1. **Clone the protocol, not the sport.** Port the repo's structure: (a) DID half for league-wide policy questions; (b) SCM half for unit-specific effects (teams/players).
2. **First NFL application — 2024 kickoff rule change (the paper cites the NFL's 2024 kickoff overhaul as a motivating example):** DID on touchback rate / average starting field position / return TD rate, 2024 vs 2023, with a control series unaffected by the rule (e.g., punts, or college kickoffs as a no-change comparison); pre-trend placebos 2015–2023.
3. **Second application — causal injury impact (gap #9):** SCM on team offensive EPA/play when a starting QB is lost: treated team-seasons vs donor pool of teams with stable QB play, covariates = prior-year EPA, roster strength proxies, schedule; donor placebos for inference exactly as the paper does.
4. **Pre-registration standard:** treatment/control definitions, covariate lists, and the placebo battery are written *before* estimation — adopt the paper's discipline of reporting the in-unit and in-time placebos regardless of outcome.
5. **Tooling:** R `tidysynth` or a Python SCM implementation; DID via standard panel regressions with the paper's exact estimator as the headline number.
6. **Effort:** 1 week for the kickoff-rule DID on nflverse data; 2–3 weeks for the QB-injury SCM with donor-pool engineering.

## 12. Reproducible test

Reproduce the paper's *league-wide half* on NFL data before trusting the player half: 2024 NFL kickoff rule — DID estimate of the change in touchback rate (2024 vs 2023) for kickoffs (treated) vs punts out of bounds / fair catches (control series, untreated by the rule), with 2015–2023 placebo DIDs. Metric: the 2024 DID with a placebo-based p-value (rank among the placebo distribution). Baseline to beat: the naive 2024-vs-2023 kickoff-only difference — success = the DID survives the placebo distribution (p < 0.10 two-sided) *and* the in-time placebo (fake 2022 intervention) is null. Time window: 2015–2024 seasons, nflverse play-by-play. Fully runnable with no new data.

## 13. Acceptance / rejection gate

ADOPT the DID+SCM protocol as GSE's standard quasi-experimental toolkit if the kickoff replication (§12) passes its placebo gates — the method is sound independent of the sport, and the paper's own reproducibility (public code + data) makes verification cheap. REJECT any *substantive* conclusion about the shift ban itself as a GSE input (it is baseball history, not NFL signal), and REJECT the SCM half for any NFL question where a credible donor pool cannot be assembled — the paper's convex-hull requirement is the binding constraint, and a synthetic control built from non-comparable donors is worse than no estimate.

## 14. Improvement experiment

Go beyond the paper with **modern staggered DID.** The paper's DID is a clean 2×2 (one treatment date), but most NFL "interventions" are staggered (injuries hit different teams in different weeks; coaches are fired mid-season). Extend the protocol with a stacked/event-study DID: align each treated unit on its own event week, include never-treated and not-yet-treated controls, and report the full event-time path with uniform confidence bands instead of a single post coefficient. Then re-run the paper's own baseball analysis in the staggered form (players crossing the 75% shift threshold is not needed — but for NFL injuries it is essential). This upgrades the paper's 2×2 into the tool GSE actually needs, and the comparison of classic vs staggered estimates on the same data would itself be publishable.
