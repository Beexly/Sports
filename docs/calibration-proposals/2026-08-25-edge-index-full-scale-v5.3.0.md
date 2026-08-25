---
modelVersion: v5.3.0
status: IMPLEMENTED
date: 2026-08-25
supersedes: v5.2.7
scope: published Edge Index scale + pick-grade ladder reachability
---

# CalibrationProposal — Edge Index on its full honest range (v5.2.7 → v5.3.0)

## Decision

Publish the Edge Index across the whole range an honest market can actually
produce, instead of across a range half of which no market can reach.

```
retired (≤ v5.2.7)   EdgeIndex = clamp(round( 50 + 1000 × rawEdge), 0, 100)
current  (v5.3.0)    EdgeIndex = clamp(round(100 + 2000 × rawEdge), 0, 100)
```

`rawEdge = pickedSideFairProb − offeredProb`, the proportional de-vig of the
same books' mean implied probability minus that side's with-vig implied
probability. For a two-way overround `S ≥ 1`:

```
rawEdge = p/S − p = −p·(S−1)/S  ≤  0
```

So `rawEdge` is never positive on an internally consistent market. Under the
retired mapping that put **50 at zero hold** — an unreachable ceiling, not a
midpoint — and left the published 50–100 half of a "0–100 index" structurally
dead. Under the current mapping 100 is the fair price, ~50 an ordinary
−110/−110 two-way, and 0 roughly a 10% two-way hold.

**Nothing about the quantity changed.** The Edge Index is, and was, a
PRICE-QUALITY reading: how much of the picked side's fair value the book's price
takes. It is not a forecast, and nothing fits it to settled results. Only the
axis it is drawn on moved.

## Why the anchors are not invented

`RAW_EDGE_AT_ZERO = −0.05` and `RAW_EDGE_AT_FULL = 0` are the negative half of
the engine's **own pre-existing** normaliser in `computeEdgeScore`:

```ts
const normalized = clamp((rawEdge + 0.05) / 0.10, 0, 1);   // unchanged
```

which already declares ±0.05 to be full scale in each direction. This change
takes the honest half of that same domain and stretches it over the published
axis. No new constant was chosen to make anything reachable.

`normalized` itself is **deliberately untouched**, because it feeds the
CONFIDENCE composite. Confidence, `tier`, `MIN_PUBLISH_CONFIDENCE`,
`PREMIUM_CONFIDENCE_THRESHOLD`, `rankingScore`, `rankingSource` and every
calibration gate constant are bit-identical to v5.2.7.

## Evidence — measured, not asserted

Measured with `scoreGame` over uniform book sets (every book posts the same pair
of prices, so the arithmetic-vs-probability-space price averaging defect cannot
contribute), sweeping the picked side's fair probability 0.30 → 0.70, n = 41
picks per row:

| two-way hold | retired index | current index |
|---|---|---|
| 0.5% | 47 – 48 | 93 – 95 |
| 1%   | 43 – 45 | 86 – 91 |
| 2%   | 36 – 40 | 72 – 80 |
| 3%   | 29 – 35 | 58 – 71 |
| 4%   | 22 – 31 | 44 – 62 |
| 5%   | 15 – 25 | 30 – 50 |
| 6%   |  7 – 19 | 15 – 39 |
| 8%   |  0 – 11 |  0 – 22 |
| 10%  |  0 –  0 |  0 –  1 |

A vanilla 8-book −110/−110 total reads **52**, where it used to read 26.

### The grade ladder was dead, and is now alive at its existing numbers

`GRADE_THRESHOLDS` requires an Edge Index of 80 / 65 / 50 for
ELITE_PLAY / STRONG_PLAY / SOLID_PLAY. All three sat at or above the retired
ceiling of 50. Across a 287-pick sweep on the retired scale **every single pick
graded LEAN**, including picks with confidence 100 and the best price in the
sweep. The Featured-promotion gate in `process-sport.ts`, which keys on
ELITE_PLAY / STRONG_PLAY, was therefore unsatisfiable — live-looking dead code.

On the restored axis every rung has a witness produced by the real scorer at a
realistic hold, **with no threshold value changed**:

| grade | hold | books | confidence | Edge Index |
|---|---|---|---|---|
| LEAN | 4% | 3 | 64 | 57 |
| SOLID_PLAY | 4% | 6 | 75 | 57 |
| STRONG_PLAY | 3% | 6 | 77 | 69 |
| ELITE_PLAY | 1.5% | 8 | 87 | 83 |

Pinned at runtime in
`packages/prediction-engine/src/__tests__/edge-index-full-scale.test.ts`.

## Historical comparability

Both scales are affine in the same `rawEdge`, so the conversion is a closed
form, not a re-fit:

```
current = min(100, 2 × legacy)
```

`legacyHalfScaleToCurrent()` (`@sports/types`) is that conversion, and
`LEGACY_HALF_SCALE_THROUGH_MODEL_VERSION = "v5.2.7"` names the last version that
emitted the legacy scale, so any stored value converts from its own
`modelVersion` stamp without guessing.

**Precision, stated honestly.** A converted value can sit **one index point**
away from what the current scale would publish for the same market. That
residual is not slack in the conversion — it is rounding the legacy value
already discarded: a stored integer carries ±0.5 legacy points, and one legacy
point is worth two current ones. No conversion recovers precision the stored
integer never had; only re-scoring from the odds can. The bound is
`CONVERSION_MAX_ERROR_POINTS = 1`, asserted over the whole honest domain (and
asserted to be *tight*, so it is not an idle allowance). Where the legacy value
lost no rounding, conversion is exact — also asserted.

A legacy value **above 50** could only come from a positive `rawEdge`, which an
honest two-way market cannot produce. Such values are the fingerprint of the
American-odds averaging defect (fixed on a separate branch), not a strong price;
they saturate at 100 on conversion and should be treated as unusable.

### How much history is actually affected

Verified against the tree, not assumed:

- `Game.currentEdgeIndex` — **no writer exists anywhere in the repository.**
  Every reference (`apps/web/lib/board/{passes,state}.ts`,
  `lib/bot-outbox/records.ts`, `lib/intelligence-graph/index.ts`,
  `lib/game-room/load.ts`, `lib/studio/load.ts`) is a read or a Prisma `select`
  projection. The column is never populated.
- `GateDecision.edgeIndex` — no `gateDecision.create` / `createMany` / `upsert`
  call exists anywhere in the repository; only `findMany`. No row is ever
  written.
- `Pick.edgeScore` is written by the ingestion pipeline, but the public board is
  behind `PUBLIC_PICKS_ENABLED` (default `false`,
  `packages/prediction-engine/src/platform-config.ts`), and the
  FOUNDING → PROVEN gate has not begun counting its ≥ 100 settled picks.

The migration cost is therefore near zero **now** and rises monotonically with
every settled pick. That asymmetry is why this lands before the board opens
rather than after.

## Guards: preserved, not loosened

`MIN_EDGE_FOR_STAKE` (`kelly.ts`) was `50` on the retired axis — the zero-hold
ceiling, i.e. a gate no honest pick could clear, so `recommendStake` returned
`null` for every real pick. Carried across unchanged it would have silently
**halved**, switching bankroll-sizing advice on for the whole board as a side
effect of a display rescale. It is restated as the image of the old threshold
under the documented bijection: `2 × 50 = 100 = EDGE_INDEX_MAX`. Measured after
the change: 0 of 48 picks in an honest-market sweep receive a stake. Loosening
that gate remains a separate decision needing its own evidence.

## Ladder consolidation (same change)

- `GRADE_THRESHOLDS` moved to `@sports/types`' `pick-grade.ts`, the one file
  that also holds `computePickGrade`. `prediction-engine/constants.ts`
  re-exports it instead of redeclaring it. Previously the constant was
  referenced nowhere and the live numbers were duplicated literals.
- `computePickGrade(confidence, edgeIndex | null)` is now the only grading
  function on the site. `generate-signal-slate.ts`'s private third ladder is
  gone; unpriced signal picks pass `null` and are capped at
  `UNPRICED_MAX_GRADE = SOLID_PLAY`, because the rungs above it are claims about
  a price that does not exist for those picks. Net effect: a confidence ≥ 80
  signal pick grades SOLID_PLAY instead of STRONG_PLAY — strictly stricter.

## Gates still OFF

- `CALIBRATION_ADJUSTMENTS_ENABLED` — off (untouched)
- `CALIBRATION_AUTO_PUBLISH` — false (untouched)
- `PUBLIC_PICKS_ENABLED` / `FEATURED_PICK_PROMOTION_ENABLED` — founder pair,
  untouched. Featured promotion is now *satisfiable* on pick quality, but still
  requires `canPromoteFeaturedPicks`, which defaults to `false`.
- No calibration gate constant was read or written by this change.
