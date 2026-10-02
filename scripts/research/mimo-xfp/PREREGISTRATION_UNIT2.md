# MIMO Program Unit 2 Pre-Registration

Written 2026-09-18 BEFORE any Unit 2 holdout score was computed.
Unit 1 has already returned FAIL on its own kill line (see RESULT_UNIT1.md).
Unit 2 is an independent hypothesis and is still allowed to run.

Data: nflverse FTN charting subset, 2022 onward.
Attribution: FTN Data via nflverse, CC BY-SA 4.0 (share alike).
Compute our own numbers. Never republish proprietary charts as ours.
Not DVOA.

## Hypothesis (falsifiable)

Catchable air yards predict receiving-yard outcomes better than raw air yards.

Motivating case (from program brief, Week 1 class of examples): a receiver with
high raw air yards can be generating uncatchable targets or dropped catchable
targets. Raw air yards cannot see that split; catchable air yards can.

## Definitions

- Raw air yards: nflverse/FTN intended or completed air-yard measure on targets
  in week t (use the FTN/nflverse column that is the play target air yards sum
  for the receiver-week; record the exact column in results).
- Catchable air yards: sum of air yards on targets charted catchable.
- Wasted: raw minus catchable (uncatchable + drop-class targets as charted).
- Outcome: next-week receiving yards (week t+1), consecutive weeks only.
- Floor claim variant (secondary): rank correlation and MAE on next-week rec yards;
  also report share of weeks where next rec yards >= a pre-set floor of 0
  (participation floor) only as secondary, not the kill.

## Scoring / metrics (one primary)

Primary metric: Spearman rho between week-t feature and week-t+1 receiving yards,
WR/TE only, targets >= 4 in both weeks, consecutive weeks.

- Model feature: catchable_air_yards_t
- Baseline feature: raw_air_yards_t
- Same population, same weeks, paired comparison

Secondary (not kill): Pearson, MAE of a train-fit linear map from feature to
next rec yards; wasted air yards as a third predictor reported for completeness.

## Train / holdout

- FTN charting available from 2022
- Train: 2022-2023
- Holdout: 2024-2025
- 2026 not used for the kill
- Bootstrap unit: season-week (2000 reps, seed 20260918)

## KILL LINE (binding)

If holdout Spearman rho(catchable air yards) <= rho(raw air yards) for next-week
receiving yards, Unit 2 FAILS. Report n and both rhos. Stop the claim that
catchable decomposition improves yard-floor reads over raw air yards.

Inconclusive: point estimate better but week-bootstrap 95% CI on delta includes 0.
That is not an edge.

## Attribution if numbers ship

FTN Data via nflverse, CC BY-SA 4.0. nflverse base data CC BY 4.0.

## Forbidden

No DVOA label. No MODEL_VERSION bump. No frozen-path edits. No fabricated rows.
