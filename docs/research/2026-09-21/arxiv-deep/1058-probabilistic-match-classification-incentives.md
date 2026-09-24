# 1058 — A probabilistic match classification model for low-scoring sports

## Citation / full-text source

- arXiv:2601.09673v3 — full text: https://arxiv.org/pdf/2601.09673
- (Section added during wave-2 reconciliation; citation details also appear in the ledger front matter/title above.)

- **arXiv ID**: 2601.09673v3
- **Full-text URL**: https://arxiv.org/pdf/2601.09673v3
- **Authors**: László Csató, András Gyimesi
- **Lane**: calibration_uncertainty
- **Verdict**: **ADAPT**
- **Replacement chain**: fresh-search replacement for 1311.1131v1 ("Compatible Weighted Proper Scoring Rules") — the assigned paper was already in `done-ids.txt` (assigned duplicate, not a REJECT verdict).
- **Fresh-search record**: On 2026-09-21 I ran 25 fresh arXiv queries over sports scheduling, tournament design, and fixture congestion. From the deduped candidate pool, 2601.09673v3 was selected because (a) it gives a complete incentive-aware match taxonomy (six classes, incentive-strength κ) with a simulation recipe, (b) it is the companion to ledger 1056's attacking-incentive work, and (c) it is clear of `done-ids.txt` (verified 2026-09-21, version-stripped ID `2601.09673` = 0 hits). Full query/candidate/dedup audit is in the wave report.
- **Read depth**: FULL READ of the complete v3 PDF text via pdftotext: 25 pages — abstract, gain/loss-from-offensive-play definition via simulated prize probabilities, indifference threshold, six match classes, incentive strength κ, 500 pre-final-round scenarios × 1,000 final-round outcome simulations, fixed-Elo independent-Poisson setup, results (fewer unimportant but more offensive and defensive/collusion-vulnerable matches under incomplete round robins), limitations discussion, appendices, and full references.
- **Wave**: wave2-reader-19
- **GSE overlap**: None found in phase-one tracker, existing-research-map, or wave-one reports.

## Research question

Can matches be classified probabilistically by incentive structure — who gains from attacking, who is indifferent, who might prefer a particular scoreline — and does the tournament format change the mix of match classes?

## Summary

Not all matches are created equal: some teams need a win, some are indifferent, some might prefer a *loss* (or a particular scoreline) for strategic reasons. The paper formalizes this with a **probabilistic match classification**: define each team's *gain* and *loss* from offensive play using simulated prize probabilities under win/draw/loss outcomes, derive an **indifference threshold**, and sort matches into **six classes** (competitive, unimportant, offensive-incentive, defensive-incentive, collusion-vulnerable, asymmetric). An **incentive strength κ** quantifies how far a match is from indifference.

Simulation evidence (500 pre-final-round scenarios × 1,000 final-round outcomes, fixed Elo + independent Poisson): incomplete round robins produce **fewer unimportant matches but more offensive and more defensive/collusion-vulnerable matches** than complete ones. Core GSE lesson: **match class is a model input, not a narrative overlay.** GSE's soccer models should condition goal expectancy and outcome probabilities on the probabilistically computed match class — especially identifying collusion-vulnerable fixtures where standard form analysis fails.

## Method

- Six match classes from the two teams' (G, L) positions; incentive strength \(\kappa\) = distance from indifference.

- Simulation: 500 scenarios × 1,000 outcomes; fixed Elo strengths; independent Poisson scores.

## Equations / assumptions

- For each team and each possible result (W/D/L): simulated prize probability \(P(\text{prize} \mid \text{result})\).

- Gain from offensive play: \(G = P(\text{prize} \mid W) - P(\text{prize} \mid D)\); loss: \(L = P(\text{prize} \mid D) - P(\text{prize} \mid \text{loss avoided})\) (definitions per the paper's prize structure).

- Indifference threshold: the (G, L) point where a team is indifferent between attacking and defending.

## Features / target

Inputs: pre-round standings; simulated prize probabilities under W/D/L for every team; fixed Elo strengths (the paper's setup).

Target: match class \u2014 one of six (competitive, unimportant, offensive-incentive, defensive-incentive, collusion-vulnerable, asymmetric) \u2014 plus incentive strength \(\kappa\), the distance from indifference.

## Validation

500 pre-final-round scenarios × 1,000 final-round outcome simulations; fixed Elo strengths; independent Poisson scores.

Complete vs incomplete round-robin designs compared on the resulting class mix.

## Exact results / baselines

Incomplete round robins produce fewer unimportant matches but more offensive and more defensive/collusion-vulnerable matches than complete ones (directional result; no hard numeric given in the file).

Baselines: complete round-robin designs (comparator for the incomplete-format class mix).

## Code / data

Not stated in the paper.

## Dataset / schema

- Simulation study; scenario space built from UEFA-style tournament structures.

## Implementation (GSE adaptation)

1. **Match-class features for soccer models**: **Implementation**: before each round, simulate prize probabilities under W/D/L for every team (using GSE's own outcome model, not fixed Elo), compute (G, L) and κ per match, and feed match class + κ into the goal-expectancy and 1X2 models. Collusion-vulnerable fixtures get a model flag and a staking caution.
2. **Integrity overlay**: collusion-vulnerable classification is directly useful for GSE's market-integrity awareness (and content) — the paper gives the detection recipe.
3. **Companion to ledger 1056**: the attacking-incentive surfaces from 2509.13141 feed naturally into this classification's gain computation — implement them as one pipeline.

**Implementation difficulty** (folded in from the original standalone section):

Medium. The prize-probability simulation per match is the compute cost; the classification itself is arithmetic.

## Leakage

- Ex-ante simulation from pre-round standings — no result leakage.
- Prize structure is simplified; real prize gradients are richer.

## Limitations

- **Static pre-match incentives** — no in-match updating (a team leading 2–0 has different incentives than the pre-match class says).
- **Naïve/level-1 behavior** assumed: teams maximize own prize probability without strategic interaction.
- Simplified prizes, fixed Elo, trained on old UEFA formats.
- Six classes are a discretization of a continuous incentive space.

## GSE overlap

None in the tracked corpus. The map has no match-classification or incentive-taxonomy coverage; ledger 1053's stakeless probabilities are binary and ex-ante-schedule-based, while this paper's classification is continuous, prize-based, and scenario-conditioned. **Incentive strength κ as a model feature is novel for the corpus.**

## Reproducible test

- Reimplement the (G, L) computation and six-class taxonomy on a UEFA-style scenario set; verify that incomplete round-robin designs yield fewer unimportant but more offensive and defensive/collusion-vulnerable matches than complete round robins, matching the paper's directional results.

## Numeric gate

**ADAPT iff match class predicts scoring behavior: on historical final-round group matches, high-κ offensive-class fixtures must show elevated total goals and collusion-vulnerable fixtures must show anomalous scoreline clustering (e.g., mutually beneficial draws) vs competitive-class matches;** if classes don't separate real outcomes, keep the taxonomy as content only.

## Improvement experiment

(1) Make incentives dynamic: recompute (G, L) in-play as scores evolve; (2) replace level-1 behavior with a game-theoretic best-response layer for collusion-vulnerable fixtures; (3) use GSE's calibrated outcome model instead of fixed Elo for the prize simulations. Success criterion: dynamic match class improves in-play goal-expectancy log-loss and flags at least one historically suspicious fixture the static model misses.

## Verdict

**ADAPT** — A rigorous incentive taxonomy (six match classes, incentive strength κ) with a simulation recipe GSE can run. Adapt the (G, L) computation into the pre-match feature pipeline, flag collusion-vulnerable fixtures, and pair it with ledger 1056's attacking-incentive surfaces. The static/level-1 limitations are explicit improvement targets, not blockers.
