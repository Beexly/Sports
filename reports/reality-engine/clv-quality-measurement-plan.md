# CLV Quality Measurement Plan

**Date:** 2026-06-18
**Author:** reality-engine (docs-only pass)
**Status:** Decision document. No code, schema, deps, or gate changes proposed here.
**Scope:** Deepen CLV from per-pick *capture* into segmented *quality measurement*. This is **largely buildable on data we already have** — say so loudly, and give the exact aggregation shape.

---

## Where CLV stands today

Capture is **wired and real**, per pick, persisted on the `Pick` row:

- `clvLockLine` / `clvLockPrice` — the immutable price/line we published at (`schema.prisma:385–386`)
- `clvCloseLine` / `clvClosePrice` / `clvCapturedAt` — the close, *derived* from the last `Odds` batch before kickoff via `deriveClosingSnapshotFromOdds()` (`clv-capture.ts`)
- `clvKind` — `POINTS` (spread/total) or `PROBABILITY` (moneyline)
- `clvValue` — signed CLV, **positive = beat the close**
- `clvVerdict` — `BEAT_CLOSE` \| `MATCHED_CLOSE` \| `LOST_TO_CLOSE` (indexed: `schema.prisma:414`)
- graded by `gradePickClv()` (`clv-capture.ts`), primitives in `clv.ts`

And there is already a headline aggregator: `summarizeClv()` (`clv.ts:139`) → `{ sampleSize, beatCloseRate, lostToCloseRate, averageClv, note }`.

**The gap is not capture. It is segmentation.** Today CLV is a single global number (or split only by units). We cannot yet ask "do we beat the close *more* on NBA totals than NFL spreads?" or "does CLV decay when we lock 48h out vs 2h out?" Those questions are the difference between *a* CLV number and *understanding* our CLV.

## Why this matters: the honest link to win rate

Beating the close is the **leading** indicator of genuine edge. The closing line is the market's most efficient estimate; consistently locking a better number than the close predicts long-run profitability *before a single game settles* (this is the thesis stated in `clv.ts`'s own header). That is why CLV is the metric we can act on *now* while the win-rate sample is stuck at 16/100 (see `minimum-viable-win-rate-loop.md`):

- **CLV is available immediately** (graded at kickoff, no need to wait for the game), and we already have it.
- **Win rate lags** (needs settlement) and is sample-starved.

So the honest framing — for ops and, once scanner-cleared, for the public — is: *"CLV is our leading proof; win rate is the lagging confirmation that will follow."* We never claim CLV *is* a win rate. We claim it predicts one, and we publish both with sample sizes.

---

## What to build: segmented CLV aggregation (on existing data)

This is an aggregation/query layer over already-stored fields. **No new capture, no migration, no provider.** Units must stay separate (points vs probability), exactly as `summarizeClv`'s docstring warns.

### Segment dimensions

For each settled, CLV-graded pick we already have everything needed to bucket by:

| Dimension | Source field | Notes |
|---|---|---|
| Sport | `game.sport.key` | join |
| Market | `pick.pickType` (SPREAD/TOTAL/MONEYLINE) | also enforces unit separation |
| Time-to-close | `game.commenceTime − pick.clvLockedAt`/`generatedAt` | bucket: <2h / 2–12h / 12–48h / >48h |
| Confidence bucket | `pick.confidence` | reuse the bands in `conviction-tier.ts` (SIGNAL 50–57 / EDGE 57–70 / SHARP 70–92 / APEX 92+) |
| Edge type | (future) edge-type tag | **MISSING today** — see `edge-type-taxonomy-v1.md`; this dimension lights up once picks carry an edge-type tag |

The first four dimensions are computable **now**. The fifth is the one data-blocked dimension, and its unlock is the single edge-type enum field described in the edge-type doc.

### Aggregation shape (per segment)

For each segment (and the global rollup), feed the segment's picks into `summarizeClv()` and extend with distribution stats:

```
CLVSegment {
  segmentKey            // e.g. "NFL/SPREAD/12-48h/SHARP"
  unit                  // POINTS | PROBABILITY  (never mix)
  sampleSize
  beatCloseRate         // from summarizeClv — the headline
  matchedCloseRate
  lostToCloseRate       // from summarizeClv
  averageClv            // from summarizeClv (mean clvValue)
  medianClv             // distribution: robust to outlier blowouts
  p25Clv, p75Clv        // distribution: the IQR of our edge
  worstClv, bestClv     // distribution tails
}
```

`beatCloseRate`, `lostToCloseRate`, and `averageClv` come straight from `summarizeClv` — only the distribution percentiles (`median`, `p25/p75`, tails) are net-new, and they are trivial sorts over `clvValue`. The CLV **distribution** matters because a 55% beat-close rate built from many tiny beats and a few catastrophic losses is a different (worse) edge than a 55% rate of consistent half-point wins; the mean alone hides that.

### The exact query/aggregation

Read-only, over `Pick` joined to `Game`/`Sport`, filtered to graded rows:

```
WHERE pick.clvVerdict IS NOT NULL          -- graded against a real close
  AND pick.clvValue   IS NOT NULL
  AND pick.isBootstrap = false             -- canonical only, mirror learning eligibility
GROUP BY sport.key, pick.pickType, timeToCloseBucket, confidenceBucket
```

Then for each group:
- `beatCloseRate = count(clvVerdict='BEAT_CLOSE') / count(*)`
- `lostToCloseRate = count(clvVerdict='LOST_TO_CLOSE') / count(*)`
- `averageClv = avg(clvValue)`  (per `clvKind` — never average points and probability together)
- percentiles over the sorted `clvValue` array per group

Equivalently in code: load the graded picks, bucket in memory, and call `summarizeClv()` per bucket (passing `{ value: clvValue, verdict: clvVerdict }`), then attach the percentile stats. This is the same shape `summarizeClv` already returns, fanned out by segment.

### Minimum-sample discipline

Suppress any segment below a floor (reuse the conviction module's ≥20 discipline; a 2-pick segment with a 100% beat-close rate is noise). Show suppressed segments as "collecting" rather than hiding them — same posture as the public-performance gate.

---

## Surfacing

- **Operator first.** An ops CLV-by-segment view (an admin CLV page already exists at `apps/web/app/admin/clv/page.tsx` — extend its aggregation, don't build a new surface).
- **Public only after the copy/honesty scanners pass.** A segmented CLV table is a strong proof claim; it inherits the same gating as every other performance surface. The note string from `summarizeClv` is already honesty-aware (it flips its language at the 50% line) — keep that discipline per segment.

## Leverage-preservation close

This plan does **not** depend on new data. Four of the five segment dimensions (sport, market, time-to-close, confidence) and every metric (`beatCloseRate`, `lostToCloseRate`, `averageClv`, distribution percentiles) are computable **today** from `clvVerdict` / `clvValue` / `clvKind` + `summarizeClv` over existing `Pick`/`Game` rows. The only data-blocked dimension is *edge type*, whose unlock is a single enum tag (`edge-type-taxonomy-v1.md`). Build the four-dimension segmentation now; add the edge-type cut the moment picks are tagged. CLV is the proof we can grow *while* the win-rate sample matures.
