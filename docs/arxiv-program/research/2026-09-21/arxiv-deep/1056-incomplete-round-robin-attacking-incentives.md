# 1056 — A hidden benefit of incomplete round-robin tournaments: Encouraging offensive play

## Citation / full-text source

- arXiv:2509.13141v1 — full text: https://arxiv.org/pdf/2509.13141
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- **arXiv ID**: 2509.13141v1
- **Full-text URL**: https://arxiv.org/pdf/2509.13141v1
- **Authors**: László Csató
- **Lane**: calibration_uncertainty
- **Verdict**: **ADAPT**
- **Replacement chain**: fresh-search replacement for 1112.6390v3 ("Early Warning with Calibrated and Sharper Probabilistic Forecasts") — the assigned paper was already in `done-ids.txt` (assigned duplicate, not a REJECT verdict).
- **Fresh-search record**: On 2026-09-21 I ran 25 fresh arXiv queries over sports scheduling, tournament design, and fixture congestion. From the deduped candidate pool, 2509.13141v1 was selected because (a) it quantifies attacking incentives under the new Champions League format with large effect sizes, (b) it is built on one million simulations per design, and (c) it is clear of `done-ids.txt` (verified 2026-09-21, version-stripped ID `2509.13141` = 0 hits). Full query/candidate/dedup audit is in the wave report.
- **Read depth**: FULL READ of the complete v1 PDF text via pdftotext: 14 pages — abstract, four-parameter pot-based independent Poisson model, one-million-simulation design, attacking-incentive metric, old-vs-new Champions League format comparison, results, discussion, and full references.
- **Wave**: wave2-reader-19
- **GSE overlap**: None found in phase-one tracker, existing-research-map, or wave-one reports.

## Research question

Does the incomplete round-robin format (the new 36-team Champions League league phase, each team playing 8 of 35 possible opponents) increase teams' incentive to play offensively compared with the old complete group format?

## Summary

Incomplete round-robin tournaments (like the new 36-team Champions League league phase, where each team plays only 8 of 35 possible opponents) have a hidden benefit: **they encourage offensive play.** Because goal difference and goals scored break ties among teams with unequal schedules, teams have stronger incentives to run up the score than in complete round-robins. The author builds a four-parameter pot-based independent Poisson model and simulates one million tournaments per design and match type.

Effect sizes are large: the new Champions League phase increased attacking incentives by **119% for direct Round-of-16 qualification** and **58% for avoiding elimination**, on average. Core GSE lesson: **format changes move goal expectancy, not just qualification probability.** GSE's soccer totals and goal-supremacy models need format-aware attacking-incentive adjustments — the same fixture under the old group format and the new league phase has different expected goal dynamics.

## Method

- One million replications per (design, match type); designs: old 8×4 group format vs new 36-team incomplete round-robin.

- Reported averages: +119% attacking incentive (direct R16 qualification), +58% (avoiding elimination).

## Equations / assumptions

No explicit equations are given; the formal specification is stated verbally (copied verbatim from the Method section):

- Four-parameter pot-based independent Poisson: team scoring rates parametrized by pot (strength tier) membership.

- Attacking incentive: marginal increase in qualification/elimination-avoidance probability from an additional goal — computed by simulation.

## Features / target

Inputs: tournament design (old 8×4 group format vs new 36-team incomplete round-robin); pot (strength-tier) membership; match type.

Target: attacking incentive — the marginal increase in qualification/elimination-avoidance probability from an additional goal.

## Validation

One million simulations per (design, match type), calibrated to the Champions League pot structure.

Old-vs-new format comparison on the attacking-incentive metric.

## Exact results / baselines

The new Champions League phase increased attacking incentives by 119% for direct Round-of-16 qualification and 58% for avoiding elimination, on average.

Baselines: the old 8×4 group format (comparator for the new-format incentive gains).

## Code / data

Not stated in the paper.

## Dataset / schema

- Pure simulation study calibrated to Champions League pot structure; no new empirical match dataset.

## Implementation (GSE adaptation)

1. **Format-aware totals adjustment**: GSE's soccer totals model should include an attacking-incentive covariate derived from the paper's recipe — the marginal qualification value of a goal given format, matchday, and table position. **Implementation**: precompute incentive surfaces by simulation (as the paper does) for each competition format GSE prices; feed the incentive value as a feature into the goal-expectancy model.
2. **New-format priors**: when competitions change format (UCL 2024/25, World Cup 2026 expansion), historical goal data from the old format is stale. The paper's +119%/+58% numbers give GSE a principled prior for how much attacking output shifts.
3. **In-play application**: attacking incentive varies within a tournament round — late group games with tiebreakers at stake deserve higher goal expectancy than the raw team strengths imply.

**Implementation difficulty** (folded in from the original standalone section):

Low–Medium. The incentive-surface simulation is a one-time compute per format; the feature wiring is standard.

## Leakage

- Simulation study; no empirical leakage. Applying pot-based parameters to new seasons assumes stability of pot-strength mappings.

## Limitations

- Simulation only — the incentive effect is derived, not measured from actual post-reform goal data.
- Four-parameter Poisson is coarse; ignores team-specific attacking styles.
- Only Champions League structures studied.

## GSE overlap

None in the tracked corpus. The map covers Poisson/Dixon-Coles/Skellam goal models as *methods* but has **nothing on format-driven incentive effects on goal expectancy**. This is the mechanism behind ledger 1058's match classification — the two papers are companions. Novel for the corpus.

## Reproducible test

- Reimplement the four-parameter pot-based Poisson and the one-million-simulation comparison; verify the new-format attacking incentive exceeds the old format by ≈119% (R16 qualification) and ≈58% (avoiding elimination) on average.

## Numeric gate

**ADAPT iff the incentive predicts real goals: on post-reform UCL league-phase data, matches with high computed attacking incentive must show higher total goals (or higher goal-supremacy vs market) than low-incentive matches with similar team strengths;** if the simulated incentive doesn't manifest in real scores, it's a theory without a market.

## Improvement experiment

(1) Validate against actual 2024/25 UCL league-phase goal data — the first real test of the prediction; (2) extend the incentive metric to in-play (minute-by-minute marginal goal value); (3) test whether bookmaker totals already price the incentive (compare closing totals in high- vs low-incentive fixtures). Success criterion: high-incentive matches beat the closing total at a rate distinguishable from chance, or the incentive feature improves GSE's totals log-loss.

## Verdict

**ADAPT** — Format changes move goal expectancy: +119% attacking incentive for R16 qualification under the new UCL phase. GSE adapts the incentive-surface simulation into a format-aware totals feature and uses the effect sizes as priors whenever competitions change format. Companion to ledger 1058.
