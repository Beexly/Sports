# fetchedAt validation logic (GSE)

Three layers: **row selection**, **candidate gate**, **ops monitor**. None widen the 6h budget.

## Layer 1 — Which fetchedAt is the quote?

In `load-gate-slate.ts`:

1. Load odds rows for the game (window).
2. Select by **market** (SPREAD→SPREADS, ML→H2H), not arbitrary latest row.
3. Spreads: batch sharing latest fetchedAt; average prices in probability space.
4. Candidate uses that batch freshness as odds.fetchedAt.

Invariant: SPREAD pick must not use H2H row timestamp/prices.

## Layer 2 — Gate (hard refuse)

```ts
MAX_CANDIDATE_ODDS_AGE_MS = 6 * 60 * 60 * 1000
```

For live candidates:

- missing fetchedAt → freshness problem
- age > 6h → `fresh odds (the latest quote for this market is stale)` → STALE_ODDS
- never backdate fetchedAt or raise maxAge to force FIRE

## Layer 3 — Ops monitor (alert)

`classifyOddsFetchedAt(MAX(fetchedAt))`:

| status | age | alert |
|--------|-----|-------|
| ok | ≤120m | no |
| warn | >120m | no |
| stale | >240m | yes |
| gate_breach | >360m | yes |
| unknown | null | yes |

Cron may expose fetchedAt block + HC_ODDS_FETCHEDAT_PING_URL. Monitor ≠ gate.

## Layer 4 — Write path

Successful fetch: persist fetchedAt = real fetch time. Fail/402/empty: no synthetic prices, no fake freshness.

## SQL

```sql
SELECT MAX("fetchedAt"), EXTRACT(EPOCH FROM (NOW()-MAX("fetchedAt")))/60 AS age_min FROM odds;
```
