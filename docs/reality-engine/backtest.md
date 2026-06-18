# Backtest Harness — Module Doc

**Source:** `apps/web/lib/reality/backtest.ts`
**Test:** `apps/web/lib/reality/__tests__/backtest.test.ts`
**Status:** implemented — offline-only, never imported into the Next.js request path

## Purpose

`backtest.ts` exports `runBacktest`, a pure offline validation harness that operates
over an array of historical settled pick records and produces a structured
`BacktestReport`. It computes win rate, CLV beat-close rate, Brier score, Expected
Calibration Error (ECE), reliability curve, edge-significance verdict, edge-type
distribution, and autopsy distribution — segmented by `modelVersion`, as rolling
trailing windows, and as a chronological out-of-sample train/holdout split.

The canonical runner is `scripts/backtest/replay.mjs`. The module is never imported
into the Next.js request path.

## Why It Matters to the Win-Rate Pillar

A backtested win rate computed on all available picks is optimistic by construction:
the model has seen the market conditions those picks were made in. The honesty of this
harness comes from three structural choices:

1. **Out-of-sample holdout:** the chronological 20% tail of picks is held out from
   calibration metrics. Calibration that holds in-sample but degrades on the holdout
   is a red flag — the harness surfaces this explicitly.
2. **Rolling windows:** a strategy that worked over a full historical sample may have
   degraded recently. Rolling trailing windows (default: last 50, 100, 200 picks)
   surface recency drift that a full-sample number hides.
3. **Honest break-even framing:** every `SliceMetrics` carries `breakEvenRate: 0.5238`.
   The `clearsBreakEven` flag and `edgeOverVig` field make the vig math explicit so
   raw win rate is never presented without context.

## Inputs and Outputs

```typescript
// One settled pick record fed to runBacktest
interface BacktestRecord {
  modelVersion?: string | null;   // segments the analysis
  generatedAt?: string | null;    // ISO timestamp — used for chronological ordering
  confidence?: number | null;     // published 0–100 at generation time
  result?: PickResult | string | null; // WIN | LOSS | PUSH | VOID | PENDING
  clvVerdict?: ClvVerdict | string | null; // BEAT_CLOSE | MATCHED_CLOSE | LOST_TO_CLOSE
  clvValue?: number | null;       // signed CLV (positive = beat close)
  sport?: string | null;
  market?: string | null;
  nullProb?: number | null;       // market-implied null-hypothesis probability
  lineMovement?: { ... } | null;  // feeds autopsy + edge-type
  bookDispersion?: number | null; // feeds edge-type tagging
  bookCount?: number | null;
  edgeDecision?: "SPEAK" | "LEAN" | "PASS" | string | null;
  freshness?: { stale?: boolean | null; ... } | null;
}

interface BacktestOptions {
  holdoutFraction?: number;          // default 0.2
  rollingWindowSizes?: number[];     // default [50, 100, 200]
  random?: () => number;             // injectable RNG for deterministic tests
  significanceTrials?: number;       // default 2000
  calibrationBins?: number;          // default 10
}
```

### Key constants

| Constant | Value | Meaning |
|---|---|---|
| `BREAK_EVEN_VIG_110` | 0.5238 | Break-even win rate at standard −110 juice |
| `MIN_BACKTEST_SAMPLE` | 100 | Minimum picks before any metrics are computed |

### Report structure

The `BacktestReport` contains:

- `status`: `"OK"` or `"INSUFFICIENT_SAMPLE"` (below 100 picks → no metrics, honest note)
- `overallMetrics`: `SliceMetrics` across all records
- `overallRollingWindows`: trailing-N slices
- `overallOutOfSample`: train/holdout split with `calibrationHoldsOutOfSample`
- `byModelVersion`: per-version `ModelVersionResult` (full-sample metrics + edge-type
  counts + autopsy counts + rolling windows + out-of-sample split)
- `caveats`: the standing honesty caveats (always present, always non-empty)

### `SliceMetrics` key fields

- `winRate` — observed win rate over WIN+LOSS records; `null` when 0 decided
- `breakEvenRate` — always `BREAK_EVEN_VIG_110` (0.5238)
- `clearsBreakEven` — `true` when `winRate >= breakEvenRate`
- `edgeOverVig` — `winRate - breakEvenRate`; negative means under break-even
- `clvBeatCloseRate` — the leading indicator of process quality
- `brierScore` — mean squared error of confidence/100 vs binary outcome
- `ece` — expected calibration error; `calibrationHolds` is `ece < 0.05`
- `reliabilityCurve` — mean forecast vs observed rate per bin (the reliability diagram)
- `edgeSignificance` — Monte-Carlo permutation test result (`SignificanceResult`)

## Honesty and Inertness Boundary

- **Offline-only.** Never imported into `apps/web/` request paths. Runs via
  `scripts/backtest/replay.mjs` only.
- **The holdout is the honest calibration number.** In-sample calibration is reported
  for comparison but is explicitly labeled optimistic. `calibrationHoldsOutOfSample`
  is the primary calibration verdict.
- **Self-suppresses below 100 picks.** `status: "INSUFFICIENT_SAMPLE"` is returned
  with no metrics computed. Below-floor analysis is noise presented as signal; the
  harness refuses to do it.
- **The module cannot tell us** whether any future picks will win. It measures past
  performance on settled records. Past performance does not guarantee future results.
- **This harness changes nothing.** It changes no scoring logic, no schema, no gate,
  no MODEL_VERSION. Running it does not authorize any public claim of edge or calibration.

## Forbidden Public Claims

- Never quote a backtest win rate as a forward performance expectation.
- Never present in-sample calibration (ECE on the training partition) as the
  performance number — only the holdout ECE is the honest figure.
- Never publish a backtest result derived from fewer than 100 settled picks.
  `MIN_BACKTEST_SAMPLE` is the floor; below it the harness refuses to compute.
- Never present `clearsBreakEven: true` as evidence of profitability. Sample size,
  variance, and the significance test all matter; the harness provides them.

## Validation

Unit test: `apps/web/lib/reality/__tests__/backtest.test.ts`

The harness itself uses `tagEdgeType` (edge-type.ts) and `classifyAutopsy`
(pick-autopsy.ts) internally for distribution analysis.

## Activation Path

The backtest harness is measurement-only. Running it produces a report that informs
a `CalibrationProposal`. Before a backtest result can authorize any public claim:

1. Holdout ECE must be ≤ in-sample ECE (`calibrationHoldsOutOfSample: true`).
2. Holdout ECE must be < 0.05 (`calibrationHolds: true` on holdout metrics).
3. Holdout sample must be ≥ `MIN_BACKTEST_SAMPLE` (100 picks).
4. A `CalibrationProposal` documents the holdout result and requests a MODEL_VERSION bump.
5. Owner approval and merge.

Only after these gates can any calibration claim be published.

## Related

- [`reports/reality-engine/latest-backtest.md`](../../reports/reality-engine/latest-backtest.md) — most recent backtest run
- [`reports/reality-engine/minimum-viable-win-rate-loop.md`](../../reports/reality-engine/minimum-viable-win-rate-loop.md)
- [`docs/brain/calibration-feedback-loop.md`](../brain/calibration-feedback-loop.md)
- [`docs/adr/001-public-performance-policy.md`](../adr/001-public-performance-policy.md)
- [`docs/path-to-70.md`](../path-to-70.md)
