# Nested-process paper — accept record

Source: docs/research/2026-10-08/nested-stochastic-foundation.md
Ingested: 2026-10-08
Status: library source. Not a coefficient. Not a play.

The paper is a filtration, a path, and a parameter process. The engine accepts it as a source. It does not weight it, and it does not publish from it.

## What the paper claims is already code

These files are not in Beexly/Sports. Search on 2026-10-08 returned zero:

- packages/prediction-engine/src/edge-lab/info_theory.ts
- packages/prediction-engine/src/stopping.ts
- packages/prediction-engine/src/forecast-skill-eprocess.ts
- gse-ml-service/app/models/ltmle.py

Claiming those paths as wired would be false.

## What is in the repo, and is not live

packages/prediction-engine/src/decision/conformal-abstention.ts exports conformalRiskControl and mondrianRiskControl. Its header says the functions are not wired into any publish path. Activation is a later human call.

packages/prediction-engine/src/conformal-intervals.ts, conformal-margin-set.ts, sizing/conformal-kelly.ts, and calibration/temporal-conformal.ts exist. Existence is not a consumer.

## Accept rule

A layer from this paper may change a projection only when all three are true:

1. The function and the file exist, and a test calls them.
2. The input is a game id, a tier, and a timestamp. Raw prose is not a coefficient.
3. The settled-row gate is clear: 100 rows on the deployed version, Brier at or under 0.22.

Until then the output is ABSTAIN. The paper is in the library so the next agent does not reconstruct it from chat.
