# 1687 Bunting and the ghost runner: a causal inference approach (arXiv:2404.06587)

**Citation:** Kevin Cummiskey, Lucas Villanti, Ira Crofford (2024). *Bunting and the ghost runner: a causal inference approach*. arXiv:2404.06587. URL: https://arxiv.org/abs/2404.06587
**Ledger completed:** 2026-09-21. **Read:** full text (ar5iv HTML, all 6 sections + references).
**Verdict:** ADAPT — a compact IPW case study showing how a counter-conventional strategy (bunt with ghost runner) survives confounding adjustment; the template ports to NFL "conventional wisdom vs data" strategy questions (e.g., kneel-downs, fair catches, touchback decisions).

## 1. Research question

With the ghost runner (runner starting on 2nd) in tied extra innings, should the home team's leadoff batter bunt? Managers bunted only 21% of the time in 2021–22 despite raw win rates favoring bunting (74% vs 57%). The paper asks whether that gap is real or confounded (bunters are better bunters; non-bunters are better hitters), estimating the causal odds ratio of bunting vs swinging away on winning the game in that inning.

## 2. Method / model

- **Design:** observational causal study of a binary intervention (A=1 bunt vs A=0 swing away) on the first PA of the home half of tied extra-inning games.
- **Consistency check:** BUNT_FL field only records whether the PA *ended* in a fair bunt; pitch-level strategy switching would violate consistency. Authors hand-audited 30 bunt + 30 non-bunt PAs pitch-by-pitch and found "very few cases" of switching — violation deemed minor.
- **Propensity model:** logistic regression of P(bunt) on batter OPS, sacrifice-bunt rate per 100 PA, pitcher ERA.
- **Outcome model:** IPW logistic regression of home-team win on bunt indicator, weights = inverse propensity score, trimmed to propensity ∈ [0.1, 0.9] (method of [6]); OPS, sac rate, ERA also entered as covariates for residual confounding (doubly-robust-flavored).
- **Estimand:** causal odds ratio θ_BUNT = [E(Y1)/(1−E(Y1))] / [E(Y0)/(1−E(Y0))].

## 3. Mathematics / equations / assumptions

- θ_BUNT = {E(Y1)/(1−E(Y1))} / {E(Y0)/(1−E(Y0))}; Y1, Y0 = potential win indicators under bunt / swing away.
- Crude (confounded) OR = {E(Y|X=1)/(1−E(Y|X=1))} / {E(Y|X=0)/(1−E(Y|X=0))}.
- IPW pseudo-population: each PA weighted by 1/π̂(X) (treated) or 1/(1−π̂(X)) (control); trimming π̂ ∉ [0.1, 0.9].
- Assumptions: consistency (audited), exchangeability conditional on {OPS, sac-bunt rate, pitcher ERA} (authors flag bunting *skill* as the key unmeasured confounder — no good metric exists), positivity (enforced by trimming).

## 4. Dataset / schema

- **Source:** Retrosheet play-by-play (via baseballr R package + Chadwick tools) for first PAs of home half of tied extra-inning MLB games, 2021–2022; batter/pitcher yearly stats from the Lahman database.
- **Schema per PA:** BUNT_FL indicator, home-win-in-inning Y, batter OPS, sac-bunt rate/100 PA, pitcher ERA.
- **Bunt rate:** 21% of such PAs were bunts.
- **Access:** public (Retrosheet, Lahman, baseballr).

## 5. Features / target

- **Features (confounders):** batter OPS (hitting quality), sacrifice-bunt rate per 100 PA (bunting aptitude proxy), pitcher ERA (pitcher quality).
- **Target:** Y = 1 if home team wins the game in that inning, 0 otherwise.

## 6. Validation design

- **Design:** IPW estimation with trimming + covariate adjustment; unadjusted vs adjusted OR comparison as the confounding diagnostic.
- **Consistency audit:** 60-PA manual pitch-by-pitch review.
- **Propensity diagnostics:** Figure 10 distribution of propensity scores by group; trimming bounds [0.1, 0.9].
- No train/test split; no sensitivity analysis to unmeasured confounding (noted as limitation).

## 7. Exact results and baselines (numbers)

- **Raw win rates:** bunted → home team won in 74% of innings; swung away → 57%; crude OR = **2.13** (95% CI: 1.13, 4.30).
- **IPW-adjusted OR = 1.86** (95% CI: 1.07, 3.27) — bunting still significantly better after confounding adjustment, though attenuated.
- **Confounder pattern (Table 2):** bunters had more bunt experience; non-bunters were better hitters (higher OPS); pitcher ERA did not differ — "the quality of the pitcher [did] not appear to impact the decision to bunt."
- **Practical magnitude:** a typical team would win ~2 more games/season by bunting in these spots — "worth millions in player salary."
- **Context:** >90% of extra-inning games end within the first 2 extra innings; <8% reach the 12th.

## 8. Code / data availability

Data: Retrosheet (public), Lahman database (public), baseballr (public R package). Code: **none stated**.

## 9. Leakage and limitations

- **Exchangeability is thin:** only 3 confounders; bunting *skill* (the most decision-relevant variable per the authors) is unmeasured — sac-bunt rate is a frequency proxy, not a skill metric. Pitcher–batter matchup specifics unmodeled.
- **Small sample:** only 2 seasons of a rare situation; CI is wide (1.07–3.27) and just excludes 1.
- **No unmeasured-confounding sensitivity analysis** (no Rosenbaum bounds / E-value).
- **IPW trimming** drops the most deterministic cases (the very situations where the decision is obvious), so the estimand is effectively the effect in "marginal" situations.
- **External validity:** ghost-runner extra innings only; says nothing about bunting in regulation.

## 10. GSE overlap

No GSE work on sacrifice-strategy causal effects. The paper's real value is as a *template for overturning conventional wisdom with IPW*: GSE publishes picks and strategy content; a "the data says bunt" style finding (e.g., "NFL teams should fair-catch more kickoffs" or "kneel-down EP is mispriced") is exactly the content genre @GalaxySportsHQ runs. The ghost-runner situation is also a nice analogue of NFL overtime-possession strategy questions.

## 11. GSE implementation spec

- **Target estimand:** causal effect of fair-catching (vs returning) kickoffs on drive expected points — same IPW structure.
- **Data:** nflverse pbp kickoffs 2018–2024; treatment = fair catch / touchback (no return); outcome = EP of ensuing drive.
- **Confounders:** returner quality, kicking-team coverage quality (DVOA-style), weather, score/time, kicker hang-time/distance.
- **Propensity:** logistic/GBM; IPW with [0.1, 0.9] trimming; doubly robust (outcome regression + IPW).
- **Product:** "NFL teams are leaving points on the field by returning kickoffs" causal content + a fair-catch recommendation feature in GSE's kickoff model.
- **Effort:** 1 week.

## 12. Reproducible test

- **Dataset:** nflverse kickoff plays 2019–2024, non-onside, non-end-of-half.
- **Metric:** IPW causal risk difference in drive EP (fair catch vs return), with 95% CI.
- **Baseline to beat:** crude (unadjusted) EP difference; the IPW estimate must retain the same sign with CI excluding 0 AND the propensity model must achieve AUC ≥ 0.65 (evidence it captures the decision process); balance check |SMD| < 0.1 on all confounders post-weighting.
- **Window:** 2019–2024; placebo: same analysis on punts (where fair-catch decisions are less strategic — expect null).

## 13. Acceptance / rejection gate + improvement experiment

- **Gate (numeric):** ADAPT the IPW template if the kickoff replication achieves |SMD| < 0.1 on all confounders, propensity AUC ≥ 0.65, and the doubly robust EP difference has 95% CI excluding 0 with |effect| ≥ 0.15 EP/drive (a practically meaningful edge). REJECT if the CI includes 0 or the placebo punt analysis shows a "significant" effect (indicating residual confounding in the design).
- **Improvement experiment:** the paper's weak point is the unmeasured bunting-skill confounder — fix it with **player-tracking-derived skill proxies**: for the NFL analogue, use Next Gen Stats returner top-speed / coverage-team closing-speed metrics as confounders the paper's box-score stats can't capture. Second: run a **Rosenbaum-style sensitivity analysis** (absent from the paper) to report the Γ at which the OR=1.86 finding breaks — giving GSE a robustness number to quote alongside the headline.

**Verdict:** ADAPT — compact IPW template for data-vs-conventional-wisdom strategy findings, directly reusable for NFL special-teams causal content.
