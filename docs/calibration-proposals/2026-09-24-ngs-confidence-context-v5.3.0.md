---
modelVersion: v5.3.0
status: IMPLEMENTED
date: 2026-09-24
author: gse signal wiring
supersedes: v5.2.7
---

# CalibrationProposal — persisted NGS confidence context (v5.2.7 → v5.3.0)

## Decision

Promote the persisted Next Gen Stats (NGS) team differential to the canonical
NFL SPREAD and MONEYLINE confidence context. `MODEL_VERSION` and
`CANONICAL_MODEL_VERSION` are now `v5.3.0`.

The prior 2026-09-13 v5.3.0 context-matrix document remains `PROPOSED`; it is
not evidence for this change. This proposal records only the NGS implementation
that is present in this revision.

## What changed

1. nflverse `NextGenStat` rows are normalized through one shared contract into
   bounded `[-1, 1]` player signals for CPOE, separation, YAC above expectation,
   RYOE per attempt, inverse time-to-throw, and cushion.
2. The ingestion writer persists those signals, plus an arithmetic team signal,
   in the universal `Signal` ledger with source, rights, confidence, capture
   time, and season lineage. The write is idempotent for the player/team signal
   key and season/week tuple.
3. NFL pick generation reads the persisted team signals only when both sides
   resolve to usable rows. The scorer applies side orientation, persisted
   weight/confidence, a 14-day half-life freshness decay, and a hard `±5` cap.
   Missing, malformed, or one-sided context contributes zero. TOTAL picks are
   excluded.
4. The immutable `PickSignalSnapshot` now records `hadNgsSignal` so outcome
   learning can distinguish picks with usable two-sided NGS context from
   otherwise identical no-NGS picks.

Market weights and the existing calibration map are unchanged. This is an
additive, bounded confidence-context change, not a claim that NGS improves
profitability or calibrated probability.

## Verification and evidence

The implementation is covered by the following real local checks:

- Prisma client generation: passed.
- Typecheck: `@sports/types`, `@sports/prediction-engine`,
  `@sports/data-ingestion`, `@sports/ingestion-pipeline`, and `@sports/web` all
  passed.
- Focused tests: NGS feature contract (3), NGS game-context and snapshot
  coverage (13), NGS writer replacement/scale/rollback (9), team-signal loading
  plus research-artifact ingestion (9), and the web NGS/route/migration tranche
  (36) all passed.
- The model-freeze guard passes only with this `IMPLEMENTED` artifact.

These checks establish that the signal is wired and auditable. They do not
establish predictive validity. At this revision there is no settled NGS-active
outcome cohort, no matched no-NGS calibration comparison, no Brier/ECE estimate
for the new term, and no CLV or profitability result.

## Evidence limits and follow-up

- The weights, confidence values, and freshness decay are bounded engineering
  priors, not learned coefficients.
- Team signals are arithmetic aggregates of available player rows; coverage and
  missingness can vary by team and week.
- The source is an offensively focused NGS feed with attribution requirements;
  it is not a complete opponent-adjusted team strength model.
- Historical v5.2.7 picks remain labeled v5.2.7 and must not be retroactively
  treated as NGS-active.
- Before changing the NGS weight, publishing a performance claim, or promoting
  any other Muse-derived feature family, collect settled outcomes and run a
  temporal holdout by `hadNgsSignal`, with CLV and calibration measurements.
