# Bookmaker DNA

*`packages/engine/src/galileo/bookmaker-dna.ts` + `market-physics/book-dna.ts` — Invention 4.
Pure, shadow-only. No hard-coded opinions — everything is inferred from timestamped movement.*

Different books are different animals: some originate price discovery, some follow minutes later,
some sit stale. This builds a per-book behavioral fingerprint so we know which books are likely
stale in which market types — the precondition for "can a book be caught off-market before it
corrects."

## How it works
`classifyMoves(events)` finds, for each consensus move, the **leader** (first to the new level)
and the lagged **followers** (with measured lag) and **non-followers** (missed it). `profileBook`
aggregates a book's lead/follow/miss rates and median lag for a market. `stalenessScore` composites
those into 0 (always leads) → 1 (always lags/misses, long delay).

## Fingerprint (`bookmakerFingerprint`)
`firstMoverRate · followerRate · medianLagMinutes · staleWindowRate · propLagScore (prop vs side
lag) · altLineLagScore (alt vs main lag) · publicShadeScore (externally supplied) ·
bookConfidenceWeight (0 ignore → 1 trust as price discovery)`.

## Status
Validated on timestamped fixtures (a fast leader, a slow ~4-min follower, a book that misses moves
entirely). **Not yet run on real data** — it needs a dense multi-snapshot odds series across the
week, which is the next instrument-calibration experiment. The output is a behavioral map, never a
pick.
