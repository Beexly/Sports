# Player Lab / Current-Roster Cut-Or-Verify Memo

Date: 2026-06-09

## Decision

For Launch 1: cut Player Lab and current-roster claims from public launch scope unless production readiness and source freshness prove them.

For Launch 2: build Player Lab deliberately from verified current-roster truth, entity resolution, freshness checks, and public/private methodology boundaries.

## Why This Matters

Player and roster claims feel concrete to customers. If GSE says a player surface is current, users will treat it as current. A stale or unverified player claim is more damaging than a missing feature.

Missing Player Lab is a product gap.

Wrong Player Lab is a trust problem.

Trust problem wins. Cut until verified.

## Launch 1 Rule

Launch 1 may reference Player Lab only as a future/coming platform surface.

Launch 1 must not claim:

- current player coverage,
- current roster intelligence,
- live player status,
- verified injury/availability logic,
- player-level predictive output,
- Player Lab availability,
- player props or DFS/lineup guidance,
- current player cards if source freshness is not proven.

## Allowed Launch 1 Copy

Safe:

> Advanced player intelligence is planned after the first launch once current-roster source truth and freshness gates are verified.

Safe:

> Launch 1 focuses on the public board, trust, readiness, and fail-honest data states. Player Lab belongs in the next platform wave.

Safe:

> Player-level surfaces will not ship publicly until current data and source freshness are proven.

## Disallowed Launch 1 Copy

Do not use unless verified:

- "current player intelligence"
- "live roster tracking"
- "Player Lab is live"
- "injury-adjusted player edge"
- "real-time player risk"
- "all current rosters"
- "player projections"
- "player-level picks"

## Verify Path For Launch 2

Player Lab can enter public scope only after:

1. current roster source policy exists,
2. source license/allowed-use is recorded,
3. player identity model exists,
4. team/player canonical IDs are mapped,
5. roster freshness check exists,
6. injury/availability source policy exists,
7. stale/degraded player state exists,
8. public/private method boundary is reviewed,
9. tests cover stale/missing player data,
10. product copy avoids overclaiming.

## Suggested Launch 2 Data Entities

- `PlayerIdentity`
- `TeamIdentity`
- `RosterSnapshot`
- `RosterMembership`
- `PlayerAvailabilitySignal`
- `PlayerFreshnessCheck`
- `PlayerSourceProvenance`
- `PlayerLabCard`
- `PlayerLabDisclosure`

## Suggested Launch 2 Build Order

1. Current roster source policy.
2. Player identity/entity resolution contract.
3. Roster snapshot fixture and freshness checker.
4. Player Lab private prototype using fixture data.
5. Public copy boundary review.
6. Degraded-state UI for stale/missing player data.
7. Source provenance labels.
8. Tests for stale and unavailable player data.
9. Internal founder review.
10. Public release only after readiness proof.

## Customer Promise

If Player Lab ships, the promise is not "we know everything about every player."

The promise is:

> GSE will show player context only when the source trail, freshness, and confidence boundaries are clear enough to make the surface useful.

## Go / No-Go

GO for Launch 1:

- Player Lab is absent or marked future.
- No current-roster claims appear publicly.
- No player-level live claims appear publicly.

NO-GO for Launch 1:

- Public page claims current player/roster intelligence without source proof.
- Pricing implies Player Lab is available when it is not.
- FAQ/marketing copy suggests live player coverage without readiness.

## Final Recommendation

Cut Player Lab from Launch 1. Verify it for Launch 2.

This is the fastest path to a credible launch and the safest path to a stronger platform.

