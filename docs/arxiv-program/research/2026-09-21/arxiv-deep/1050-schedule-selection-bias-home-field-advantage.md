# 1050 — Avoiding Bias Due to Nonrandom Scheduling When Modeling Trends in Home-Field Advantage

## Citation / full-text source

- arXiv:1806.08059v2 — full text: https://arxiv.org/pdf/1806.08059
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- **arXiv ID**: 1806.08059v2
- **Full-text URL**: https://arxiv.org/pdf/1806.08059v2
- **Authors**: Andrew T. Karl
- **Lane**: bayesian_statespace
- **Verdict**: **ADAPT**
- **Replacement chain**: fresh-search replacement for 2409.08172v4 ("A Bayesian framework for analyzing alleged cheating in sports through hidden codes, with applications to bridge and baseball") — the assigned paper was already in `done-ids.txt` (assigned duplicate, not a REJECT verdict).
- **Fresh-search record**: On 2026-09-21 I ran 25 fresh arXiv queries over sports scheduling, tournament design, and fixture congestion (surviving verbatim records include `arxiv sports scheduling round robin tournament optimization paper`, `arxiv fixture congestion football prediction modeling paper`, `arxiv tournament design fairness sports optimization`, plus home-advantage/schedule-bias passes). From the deduped candidate pool, 1806.08059v2 was selected because (a) it directly quantifies how nonrandom scheduling corrupts home-field advantage trend estimates, (b) it gives a concrete fixed-vs-random-effects decision rule backed by simulation numbers, and (c) it is clear of `done-ids.txt` (verified 2026-09-21, version-stripped ID `1806.08059` = 0 hits). Full query/candidate/dedup audit is in the wave report.
- **Read depth**: FULL READ of the complete v2 PDF text via pdftotext: 24 pages, 1,358 lines — abstract, introduction, mixed/random/fixed-effects specifications, six-sport data 2000–2017, simulation study with true HFA = 3, results tables, discussion, conclusion that the ad hoc diagnostics are superseded by arXiv:2003.08087, and full references.
- **Wave**: wave2-reader-19
- **GSE overlap**: None found in phase-one tracker, existing-research-map, or wave-one reports.

## Research question

When teams are scheduled nonrandomly — strong teams systematically getting more (or fewer) home games — what happens to estimates of the home-field advantage (HFA) and its trend over time?

## Summary

The paper asks a deceptively simple question: when teams are scheduled nonrandomly — strong teams systematically getting more (or fewer) home games — what happens to estimates of the home-field advantage (HFA) and its trend over time? The answer: **mixed/random-effects models of team strength absorb scheduling bias and produce biased HFA estimates, while fixed-effects models stay unbiased.** The mechanism is endogeneity: when schedule strength correlates with team quality, the random-effects assumption (team effects independent of the design matrix) fails.

Evidence from simulations with true HFA = 3: mixed-effects estimates came out at **3.37 (FBS college football), 3.26 (men's college basketball), 3.13 (women's college basketball)**, while fixed-effects estimates recovered **3.00** exactly. Applied to six sports over 2000–2017, the paper shows that apparent HFA *trends* can be artifacts of changing scheduling practices rather than real changes in the value of playing at home. Core GSE lesson: **any GSE home-field estimate built on random/mixed team effects is vulnerable to schedule-selection bias** — and because NFL schedules are deliberately nonrandom (strength-of-schedule balancing, primetime flexing, divisional rotation), the fixed-effects specification is the safe default for HFA work.

## Method

- Simulation: true \(\mu = 3\); schedules generated with strength-dependent home/away assignment; comparison of \(\hat{\mu}\) under mixed vs fixed specifications across sports.

- Diagnostic: correlation between team strength and share of home games (and of rest/travel advantages) as a screening signal for bias risk.

## Equations / assumptions

- Score-differential model: \(y_{ijt} = \mu_t + \alpha_i - \alpha_j + \varepsilon_{ijt}\), where \(y\) is the score margin, \(\mu_t\) is the home-field advantage in season \(t\), and \(\alpha_i\) are team effects.

- Mixed-effects variant: \(\alpha_i \sim N(0, \sigma^2)\) (random team effects); the estimate of \(\mu_t\) is biased when \(E[\alpha_i \mid \text{schedule}_i] \neq 0\), i.e., when home-game assignment depends on team strength.

- Fixed-effects variant: \(\alpha_i\) estimated as free parameters; \(\hat{\mu}_t\) remains unbiased under the same scheduling because team effects are conditioned out.

## Features / target

Inputs: game score differentials; home/away schedule assignment per game (which team hosts); team identities; season index.

Target: the season-level home-field advantage \(\mu_t\).

## Validation

Simulation study with known true HFA = 3 under strength-dependent home/away assignment; mixed-effects vs fixed-effects specifications compared across sports.

Empirical application to six sports over seasons 2000–2017 (college football FBS, men's and women's college basketball among the named series).

The paper's ad hoc diagnostics were superseded by arXiv:2003.08087 (noted in the paper itself) — the follow-up read before productionizing the diagnostic.

## Exact results / baselines

True HFA = 3 in simulation; mixed-effects estimates: 3.37 (FBS college football), 3.26 (men's college basketball), 3.13 (women's college basketball).

Fixed-effects estimates recovered 3.00 exactly.

Baselines: the mixed/random-effects specification is the biased baseline under nonrandom scheduling; the fixed-effects specification is the unbiased comparator.

## Code / data

Not stated in the paper.

## Dataset / schema

- Six sports, seasons 2000–2017 (college football FBS, men's and women's college basketball among the named series; pro and college coverage).
- Simulated schedules with known true HFA = 3 for the bias quantification.

## Implementation (GSE adaptation)

1. **HFA specification rule**: GSE's home-field estimates (used in spread/total baselines) must use **fixed team effects**, not random/mixed effects, whenever the schedule is strength-dependent. NFL schedules are explicitly nonrandom (division rotation, placement games, flex scheduling) — this paper is directly on point. **Implementation**: in the HFA estimation module, switch the hierarchical/random team-strength prior off for the HFA parameter and estimate team intercepts as fixed effects; keep hierarchical pooling only for team *strength* rating (separate parameter).
2. **Schedule-selection-bias diagnostic** (cheap nightly check): compute the correlation between a team's estimated strength and its home-game share / rest-differential over the season. If |correlation| is large, flag any mixed-effects HFA estimate as suspect and fall back to fixed effects. This is the paper's diagnostic, operationalized.
3. **Trend correction**: GSE's historical HFA trend series should be recomputed with fixed effects — published HFA trends may partly reflect scheduling-practice changes (e.g., neutral-site games, international games) rather than real home advantage erosion.

**Implementation difficulty** (folded in from the original standalone section):

Low. The diagnostic is a correlation check; the fixed-effects switch is a modeling-specification change, not new infrastructure.

## Leakage

- Observational design; no predictive test set — but the simulation study is leakage-free by construction (true HFA known).
- Empirical HFA trends are descriptive; applying them to future seasons assumes scheduling practices are stable.

## Limitations

- The paper itself notes its ad hoc diagnostics were **superseded by arXiv:2003.08087** — the right follow-up read before productionizing the diagnostic.
- Linear score-differential framework; no possession-level or in-game dynamics.
- Simulation uses stylized scheduling processes, not actual NFL schedule mechanics.
- Does not address rest/travel/home interactions (treated as extensions).

## GSE overlap

None in the tracked corpus. Thematic neighbours: dynamic Elo and nested AR(1) team strength (1701.05976), Massey/Sagarin/Colley ratings inventoried in the map — but **no existing research covers the nonrandom-scheduling bias mechanism for home-field estimates**. The map's state-space section assumes schedules are exogenous; this paper says that assumption fails and tells you which estimator survives. Genuinely novel for the corpus.

## Reproducible test

- Reimplement the simulation: true HFA = 3, strength-dependent scheduling, N teams × S seasons. Verify mixed-effects \(\hat{\mu}\) inflates (paper reports 3.37/3.26/3.13 for the three college series) while fixed-effects \(\hat{\mu}\) = 3.00.
- Run the diagnostic on NFL 2015–2025 schedules: correlate end-of-season team strength with home-game share; confirm nonzero correlation (expected from placement-game mechanics).

## Numeric gate

**ADAPT iff the bias replicates on NFL data: a mixed-effects HFA estimate on 2020–2025 NFL seasons must differ from the fixed-effects estimate by a material margin (direction and magnitude consistent with the paper's simulation) before GSE rewrites its HFA module;** if the two estimators agree on NFL data, adopt the diagnostic only.

## Improvement experiment

Port to NFL with actual schedule mechanics: (1) model the NFL's scheduling formula (division rotation, same-place finish games, flex) as the nonrandom assignment process; (2) quantify the bias in a random-effects HFA estimate season by season 2015–2025; (3) test whether fixed-effects HFA improves out-of-sample spread prediction vs mixed-effects HFA. Success criterion: fixed-effects HFA yields ≥0.2-point lower MAE on closing-spread prediction, or the diagnostic reliably flags the high-bias seasons.

## Verdict

**ADAPT** — A sharp, actionable methods result: nonrandom scheduling biases mixed-effects home-field estimates (3.37 vs true 3.00 in simulation) while fixed effects stay clean. GSE's HFA inputs should move to fixed team effects, and the strength-vs-home-share correlation becomes a cheap nightly bias diagnostic. Follow up with arXiv:2003.08087 before productionizing.
