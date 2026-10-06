# 1053 — Tournament schedules and incentives in a double round-robin tournament with four teams

## Citation / full-text source

- arXiv:2204.08276v8 — full text: https://arxiv.org/pdf/2204.08276
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- **arXiv ID**: 2204.08276v8
- **Full-text URL**: https://arxiv.org/pdf/2204.08276v8
- **Authors**: László Csató, Roland Molontay, József Pintér
- **Lane**: calibration_uncertainty
- **Verdict**: **ADAPT**
- **Replacement chain**: fresh-search replacement for 1102.5031v2 ("Local proper scoring rules of order two") — the assigned paper was already in `done-ids.txt` (assigned duplicate, not a REJECT verdict).
- **Fresh-search record**: On 2026-09-21 I ran 25 fresh arXiv queries over sports scheduling, tournament design, and fixture congestion (surviving verbatim records include `arxiv sports scheduling round robin tournament optimization paper` and `arxiv tournament design fairness sports optimization`). From the deduped candidate pool, 2204.08276v8 was selected because (a) it quantifies how *schedule order* changes stakeless/dead-rubber probabilities with hard numbers, (b) it is built on real Champions League data, and (c) it is clear of `done-ids.txt` (verified 2026-09-21, version-stripped ID `2204.08276` = 0 hits). Full query/candidate/dedup audit is in the wave report.
- **Read depth**: FULL READ of the complete v8 PDF text via pdftotext: 30 pages, 1,577 lines — abstract, double round-robin schedule enumeration (12 schedules), five Poisson goal-model variants fit to 1,632 Champions League matches, one million simulations per schedule, weakly/strongly stakeless probability results, policy recommendations, appendices, and full references.
- **Wave**: wave2-reader-19
- **GSE overlap**: None found in phase-one tracker, existing-research-map, or wave-one reports.

## Research question

In a four-team double round-robin (the old Champions League group format), how does the fixture schedule order — which of the 12 possible schedules is used — change how many late group games are stakeless dead rubbers?

## Summary

In a four-team double round-robin (the old Champions League group format), the *order* of fixtures — which of the 12 possible schedules is used — materially changes how many late group games are "stakeless" (dead rubbers where at least one team has nothing to play for). The authors fit five Poisson goal-model variants to 1,632 Champions League matches, then simulate one million tournaments per schedule. Result: **the best schedule vs the worst schedule reduces the weakly-stakeless probability by 35% on Matchday 5 and 28% on Matchday 6, and the strongly-stakeless probability by 32%.**

Core GSE lesson: **schedule position is a predictive feature.** Teams in stakeless or weakly-stakeless games behave differently (rotation, effort), and the *probability* that a game becomes stakeless is computable before the tournament starts. GSE's models should include schedule-conditioned game-state and incentive features — especially for soccer tournaments, tennis round-robins, and any group-stage market.

## Method

- Five Poisson variants for goal scoring (independent, bivariate, team-strength parametrizations), fit to 1,632 UCL matches.
- 12 distinct double round-robin schedules enumerated for 4 teams × 6 matchdays.
- One million Monte Carlo tournaments per schedule; for each Matchday 5/6 game, compute:
  - *weakly stakeless*: at least one team's final rank cannot change regardless of result;
  - *strongly stakeless*: neither team's rank can change.
- Best-vs-worst schedule comparison on these probabilities.

## Equations / assumptions

The paper is simulation-based; no closed-form equations are given. Operative definitions (copied verbatim from the Method section):

- *weakly stakeless*: at least one team's final rank cannot change regardless of result;

- *strongly stakeless*: neither team's rank can change.

## Features / target

Inputs: fixture schedule (one of the 12 enumerated double round-robin schedules); team scoring rates from the fitted Poisson goal models; matchday (5/6).

Target: the probability that a given late group game is weakly or strongly stakeless.

## Validation

Five Poisson goal-model variants fit to 1,632 Champions League matches.

One million Monte Carlo tournaments simulated per schedule; best-vs-worst schedule comparison on stakeless probabilities (ex-ante: computed from pre-tournament strengths only).

Sanity check (reproducible test): stakeless probabilities must be exactly 0 before Matchday 4.

## Exact results / baselines

Best vs worst schedule: weakly-stakeless probability reduced by 35% on Matchday 5 and 28% on Matchday 6; strongly-stakeless probability reduced by 32%.

Baselines: the worst of the 12 enumerated schedules (comparator for the best-schedule reductions).

## Code / data

Not stated in the paper.

## Dataset / schema

- 1,632 UEFA Champions League matches (model fitting).
- Simulated: 12 schedules × 1,000,000 tournaments.

## Implementation (GSE adaptation)

1. **Stakeless-probability features**: for any group-stage or round-robin competition GSE prices, precompute each game's ex-ante probability of being weakly/strongly stakeless (via the paper's Poisson-simulation recipe with GSE's own team strengths). **Implementation**: add `p_stakeless_weak` and `p_stakeless_strong` as features to the match model; interact them with team-news/rotation signals.
2. **Effort-discount modeling**: stakeless games have different goal/point distributions. Fit separate outcome models conditional on stakeless status (the paper's framework gives the classifier; GSE supplies the conditional distributions from historical dead rubbers).
3. **Schedule-design advisory**: for GSE content/consulting, the best-vs-worst schedule numbers (35%/28%/32% reductions) are citable evidence that fixture order matters for competition integrity.

**Implementation difficulty** (folded in from the original standalone section):

Low–Medium. The simulation recipe is straightforward Monte Carlo; the work is wiring stakeless-probability computation into the pre-match feature pipeline for each competition format.

## Leakage

- Simulations are ex-ante: stakeless probabilities computed from pre-tournament strengths only — no result leakage.
- Poisson parameters fit on historical UCL data applied forward; standard train/predict separation.

## Limitations

- Four-team double round-robin only; larger groups and the new Swiss-style UCL format need re-derivation (see ledgers 1056, 1058).
- Poisson goal models are simple; no team-specific motivation parameters.
- Stakeless is binary (can/can't change rank) — ignores partial incentives (seeding within qualification).

## GSE overlap

None in the tracked corpus. The map's gap list notes thin coverage of contest/tournament theory; **schedule-conditioned incentive probabilities appear nowhere in the existing research**. The Drive dossiers cover match-outcome models, not the meta-question of which games matter. Novel.

## Reproducible test

- Refit a Poisson model on the UCL sample and re-enumerate the 12 schedules; verify the best schedule cuts weakly-stakeless probability by ≈35% (MD5) and ≈28% (MD6), strongly-stakeless by ≈32%, vs the worst schedule.
- Sanity check: stakeless probabilities must be exactly 0 before Matchday 4 (ranks cannot be decided yet).

## Numeric gate

**ADAPT iff stakeless status predicts outcomes: in GSE's historical group-stage data, weakly/strongly stakeless games must show a statistically significant shift in goal/point distributions or favorite cover rates vs matched non-stakeless games;** if dead rubbers are indistinguishable from live games, the feature adds nothing.

## Improvement experiment

(1) Extend the stakeless-probability computation to the new 36-team Swiss-style Champions League and to World Cup groups; (2) replace binary stakeless with a continuous "incentive gradient" (expected prize-money/rank movement at stake); (3) test whether betting markets already price stakelessness (compare closing lines in stakeless vs non-stakeless games). Success criterion: the incentive-gradient feature improves log-loss on group-stage matches and identifies at least one mispriced stakeless-game pattern.

## Verdict

**ADAPT** — Schedule order changes dead-rubber probability by 28–35%, and that probability is computable ex ante. GSE should add stakeless-probability features to every group-stage/round-robin model and model effort-discounted outcome distributions for dead rubbers. Clean simulation methodology, directly portable.
