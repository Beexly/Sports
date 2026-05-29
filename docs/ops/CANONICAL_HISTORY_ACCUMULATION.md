# Canonical History Accumulation Plan

How Galaxy gets from zero settled canonical picks to publishable
calibration history without lying along the way.

## The honest state today

- The prediction engine in `packages/prediction-engine/` is implemented end-to-end.
- The settlement logic in `settlement.ts` is correct (NFL/NBA/MLB/soccer 3-way).
- The calibration math in `apps/web/lib/calibration/compute.ts` is correct.
- The exposure gate in `apps/web/lib/calibration/exposure-gate.ts` correctly refuses to publish until enough settled canonical picks accumulate per bucket.
- **Zero canonical picks are settled today.** Every settled row in the DB is `isBootstrap:true` or `modelVersion="v5.0.0-seed"`, both of which are filtered out of `loadPublicCalibrationReport()`.
- The C61 backtest harness can replay historical games through the live scorer, but its output is operator-only — backtest results are not published.

The honest claim Galaxy makes today is: **"we are building calibration history from settled canonical picks; here is how many we have."** Anything stronger is unsupported.

## What "enough" means

Calibration credibility scales with sample size per bucket. The exposure gate enforces a minimum but the credibility threshold is higher.

| Bucket | Publish gate (minimum) | Credible threshold | Strong threshold |
|---|---|---|---|
| 50–59 | 30 | 100 | 300 |
| 60–69 | 30 | 100 | 300 |
| 70–79 | 30 | 100 | 300 |
| 80–89 | 30 | 100 | 300 |
| 90–100 | 30 | 100 | 300 |
| **Total** | **150** | **500** | **1500** |

Brier score becomes meaningful at ~200 settled picks. ROI tracking requires the same plus unit accounting (C63 ADR).

Strong sport / market coverage adds another dimension: 30 per bucket per *sport* per *pick type* is much harder than 30 per bucket overall. The exposure gate intentionally aggregates across sports for the first publish; per-sport breakouts come later.

## Timeline (no promises)

This is owner-action territory. Galaxy cannot accelerate canonical history accumulation from CLI — it requires:

1. Live odds API connected (`THE_ODDS_API_KEY` set)
2. Scoring cron running on the live slate
3. Games clearing the publish gate at the model's natural pace
4. Settlement cron running after each game finishes

Estimated accumulation rates, assuming a connected feed and a normal slate:

| Sport | Games per week | Eligible picks per game | Per-week picks |
|---|---|---|---|
| NFL (regular season) | ~14 | 1–3 | ~30 |
| NBA (regular season) | ~80 | 1–3 | ~180 |
| MLB (regular season) | ~110 | 1–3 | ~240 |
| Soccer (top leagues) | varies | 1–2 | ~80 |

In an in-season month with all four sports, the model could realistically settle ~1500–2000 picks. The first publish threshold (150 total) could be reached in 1–2 weeks under those conditions. The credible threshold (500) in 1–2 months. The strong threshold (1500) in 3–6 months.

Off-season periods drop the rate substantially.

## What we say publicly during accumulation

The `/performance` page must surface the bucket counts honestly:

> **70–79 confidence: 18 of 30 settled** — not yet meeting the publish gate.
> 60–69 confidence: 41 of 30 settled — publishing.
> 50–59 confidence: 7 of 30 settled — not yet meeting the publish gate.

This is concrete and verifiable. It replaces vague "collecting" copy.

The `/methodology` page must contain the **"what we publish vs. what we cannot publish yet"** callout:

> **What we publish today.** Every published pick. Every pass. Every settled outcome.
> Calibration buckets meeting the minimum sample size, with per-bucket win rate and Brier component.
>
> **What we do not publish yet.** Aggregate ROI (requires units-risked accounting; see ADR-008). Per-sport calibration breakouts (requires 30+ per bucket per sport). Long-horizon Brier (requires 200+ settled picks).

## Drift discipline

When canonical history accumulates, the calibration deltas matter more than absolute win rate:

- 70–79 bucket should ship a 70–79% win rate (excluding pushes). A 60% rate in that bucket means the model is overconfident; weights drift toward harsher penalization until the bucket recalibrates.
- 50–59 bucket showing 65% win rate means the model is underconfident; the publish threshold may be wrong.

Calibration proposals (`CalibrationProposal` in `compute.ts`) are surfaced to the operator. They are not auto-applied. Each weight change is a deliberate model version bump (`MODEL_VERSION` constant in `packages/prediction-engine/src/constants.ts`).

## What changes when this plan is satisfied

When the minimum thresholds are met across the first publish horizon:
1. The exposure gate flips to `canExposePerformanceStats:true`.
2. `loadPublicCalibrationReport()` returns real bucketed calibration.
3. `/performance` flips from accumulation-state copy to real numbers.
4. The Calibration Constellation (C70) shows real points instead of empty state.
5. The Public Canonical Ledger (C64) flips from accumulation banner to real ledger.
6. The homepage lead-with-ledger pivot (C88) becomes the live primary CTA.

None of these flip from CLI. Each requires an operator review of the calibration drift signals before the flag flips.

## What never happens

- Galaxy never publishes a win rate computed from `isBootstrap:true` rows.
- Galaxy never publishes a Brier score before 200 settled picks accumulate.
- Galaxy never claims accuracy that the public ledger does not support.
- Galaxy never relabels backtest output as production calibration.
- Galaxy never uses a one-week win streak to imply a long-run edge.
- Galaxy never hides a losing bucket from the public calibration breakdown.
