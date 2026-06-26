# Odds Credit Intelligence

**Module:** `packages/data-intelligence/src/odds-api-economics.ts`
**CLI:** `npm run odds:plan` (`scripts/odds-plan.ts`) — plan-only, zero-spend, no network.

## Why this exists

Live odds are the institution's most expensive input. The Odds API meters by *credits*, and the cost
of a coverage plan is not obvious — markets multiply by regions, scores add up, player props are
per-event, and historical pulls are 10×. Without an accountant, you discover the bill *after* you have
spent it. This module computes the monthly burn **before** a single credit is spent.

## The published cost model (encoded as facts)

| Endpoint | Credits |
|---|---|
| `GET /sports` (catalogue) | 0 |
| `GET …/odds` (featured markets) | markets × regions |
| `GET …/scores` | 1 (2 with `daysFrom`) |
| `GET …/events` (event list) | 1 |
| `GET …/events/{id}/odds` (player props) | markets × regions, **per event** |
| any `/historical/…` | **10×** the equivalent live call |

`creditCostOfCall(spec)` implements this; it is pure, deterministic, and never negative.

## Planning a month

`planOddsApiUsage(input)` turns a coverage description (sports, markets, regions, refresh interval,
active hours/day, scores on/off, prop events/day, historical snapshots, days/month) into:

- a per-line breakdown (featured odds, scores, event list, player props, historical backfill),
- the **monthly credit burn**,
- the **smallest quota tier that fits** (`recommendTier`), and the headroom,
- warnings (expensive props, zero-refresh cadence, burn exceeds all tiers), and
- `capsApplied` — a runaway historical backfill is capped at `HISTORICAL_SNAPSHOT_CAP` (200) and the
  cap is **announced**, never silent.

`mode` is always `PLAN_ONLY` and `spendUsd` is always `0`.

## Tiers carry credits, not prices

`ODDS_API_TIERS` encodes credit **allotments** only (free 500 · 20k · 100k · 5M · 15M). It deliberately
encodes **no dollar price** — pricing changes and must be verified at purchase time, never implied here
as current. This mirrors the bonus-integrity posture: no "current" claim without verification.

## Multi-sport coverage map

`ODDS_API_SPORT_GROUPS` records which sport families carry which featured markets and whether player
props exist (e.g. CFL has no player props in the catalogue, so the planner does not over-budget for
depth that is not there). It is a coverage map — **not** a price list and **not** a feed.

## Operating posture

- The CLI checks `THE_ODDS_API_KEY` **presence** only; it never reads or prints the value.
- LIVE pulls require a key **and** owner approval — neither of which this script can supply.
- Worked example: 3 sports · 3 markets × 1 region · every 30m for 16h/day + scores + light props +
  a capped historical backfill ≈ a five-figure monthly credit burn that lands inside the Starter tier
  with headroom — exactly the kind of number to know before, not after.

## Example

```
npm run odds:plan -- --sports 3 --markets 3 --regions 1 --interval 30 --hours 16 --scores --format json
```
