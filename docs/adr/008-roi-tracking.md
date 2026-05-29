# ADR 008 — ROI Tracking with Owner-Gated Schema Migration

**Date:** 2026-05-29
**Status:** Proposed (owner approval required for migration)
**Author:** C63 autonomous cycle

## Context

The public canonical record (per ADR-001 and the C62 accumulation plan)
exposes per-bucket calibration once enough settled picks accumulate.
But it does **not** expose return on investment — units risked, units
returned, closing-line value (CLV).

Without ROI, Galaxy cannot make any economic claim about the model.
"60% win rate at 70-79 confidence" is a meaningful calibration result
but it is silent on whether following the signals would have produced
positive expected returns over the period. A 60% win rate at -120 is
profitable; at -150 it is not.

The competitor landscape (OddsJam, Dimers, SportsLine) leads with ROI
language ("+15 units last month") because users care about money.
Galaxy's no-tout posture means we will not lead with ROI marketing,
but we should be able to ship an *honest* ROI line when one is
defensible: this many units risked, this many returned, here is the
distribution by confidence bucket.

The blocker today is schema. `Pick` does not have `unitsRisked` or
`unitsReturned` columns. Without those, no aggregate ROI is computable
even from canonical history.

## Decision

We will:

1. Add two nullable columns to the `Pick` model:
   - `unitsRisked: Float?` — units of bankroll the published-pick
     recommendation called for (Kelly-derived; see `packages/prediction-engine/src/kelly.ts`).
   - `unitsReturned: Float?` — units the recommendation would have
     produced at settlement given the published price.
2. Compute these in the settlement worker at the time of settlement,
   sourced from the `signalSnapshot` price and the published Kelly
   stake. Backfill is **not** performed; rows older than the migration
   keep `unitsRisked: null`, `unitsReturned: null`.
3. Surface aggregate ROI on `/performance` only when the **non-null**
   subset meets the per-bucket publish gate. ROI is opt-in to
   calibration: a row with `unitsRisked: null` contributes to win-rate
   but not to ROI.
4. The exposure gate (`getReadinessGates().canExposePerformanceStats`)
   continues to control whether anything is published.

## Math (already implemented in `lib/calibration/roi.ts`)

```
pickRoi(unitsRisked, unitsReturned) = (unitsReturned - unitsRisked) / unitsRisked
aggregateRoi(picks)                 = (sumReturned - sumRisked) / sumRisked
```

Pure functions. No DB. Each consumer (`/performance`, `/ledger/canonical`,
`the-evidence`) calls these explicitly with an opt-in subset.

## Schema migration (owner-gated)

This ADR ships the column definition and the math. The actual Prisma
migration is owner-applied. Until the migration runs, the math accepts
arrays whose rows may not have `unitsRisked`/`unitsReturned`, and the
public ROI line stays hidden.

## Constitutional alignment

- **#5 No certainty language.** ROI math is opt-in to settled rows only.
  Never derived from bootstrap or seed rows.
- **#14 No autonomous external publishing.** ROI is published only on
  Galaxy's own surfaces, gated by the same `canExposePerformanceStats`
  flag as the rest of calibration.
- **#20 No methodology client-side leak.** ROI math uses public Kelly
  helpers already exposed in `packages/prediction-engine`. The exact
  KELLY_FRACTION constant remains in the prediction-engine package, not
  in client bundles.

## What never happens

- Galaxy never publishes ROI computed across `unitsRisked: null` rows.
- Galaxy never claims ROI before the same exposure gate that protects
  calibration flips.
- Galaxy never markets ROI before the canonical history accumulation
  plan's strong threshold (1500 settled picks) is met.
- Galaxy never derives ROI from a Kelly stake larger than `MAX_UNITS_PER_PICK`
  (see `packages/prediction-engine/src/kelly.ts`).

## Open questions

- Per-sport ROI breakouts vs. aggregate — defer to operator review once
  data accumulates.
- CLV (closing-line value) as a separate metric — out of scope for this
  ADR; future ADR if/when shipped.
