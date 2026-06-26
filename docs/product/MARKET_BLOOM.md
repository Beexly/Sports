# Market Bloom

**Module:** `packages/decision-field-runtime/src/market-bloom.ts`
**Surface:** Market Lifecycle tab of `/matches/preview/*` and the offline Event Genome page
**Status:** fixture-only.

## What it is

A market is not a static price — it is born, broadens, matures, moves, gets caught up to fair, goes
stale, and closes. Most surfaces show only the current number. Market Bloom shows *where in its life*
a market is, because the same price means very different things at birth versus after the edge has
already been priced in.

## The nine stages

`UNBORN → OPENED → THIN → BROADENING → MATURE → MOVING → CAUGHT_UP → STALE → CLOSED`

`classifyMarketBloomStage(input)` derives the stage from `bookCount`, `minutesSinceUpdate`,
`priceMovedRecently`, `caughtUpToFair`, and `closed`. Thresholds: `MATURE_BOOKS = 5`,
`BROADENING_BOOKS = 3`, `STALE_MINUTES = 30`. One book is `THIN`; many is `MATURE`; old is `STALE`;
gone is `CLOSED`; priced-in is `CAUGHT_UP`.

## Stage → decision state

`marketBloomToDecisionState(stage)`:

- `CAUGHT_UP → TOO_LATE` — the edge is already in the price.
- `STALE → NEEDS_LIVE_DATA` — we cannot responsibly call a stale market.
- every other stage → `WATCHLIST`.

**Birth is never an action.** A young or thin market is watch-only; a stale or caught-up market
*suppresses* action (`suppressesAction: true`). The system never treats "a market exists" as "a market
is actionable."

## Invariants

- A thin/young market caps the decision at `WATCHLIST`.
- A caught-up market is `TOO_LATE`; a stale market `NEEDS_LIVE_DATA`.
- Lifecycle alone never produces a public action.

## Tests

`__tests__/n5-layers.test.ts` (Market Bloom block): stage classification across book-count/staleness,
caught-up → TOO_LATE, stale → NEEDS_LIVE_DATA, and the fixture market that caught up suppresses action.
