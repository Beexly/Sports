# scripts/ops/fetch-market-quotes.mjs

## What it fetches

- Manifold `/v0/markets?sort=last-bet-time&limit=50` — binary markets only (`outcomeType === "BINARY"`), `probability` as P(YES).
- Polymarket Gamma `/markets?closed=false&limit=50` — reads `outcomePrices[0]` as P(YES), `bestBid`/`bestAsk` where present.

Both endpoints are open (no auth required). Parsing logic is duplicated inline from `packages/prediction-engine/src/edge-lab/features/market-quote-adapters.ts` so the script runs as plain `.mjs` without a TS loader.

## Cadence recommendation

Hourly cron (`0 * * * *`) is appropriate: prediction markets move slowly relative to live odds; hourly captures enough signal without hammering free endpoints (~500/min rate limit on Manifold).

## Schema (JSONL, append-only)

`data/quotes/quotes.jsonl` — one JSON object per line:
- `fetchedAt` (ISO)
- `platform` (`"manifold"` | `"polymarket"`)
- `marketId`
- `question`
- `yesProb` (float in [0,1])
- `bestBid` / `bestAsk` (Polymarket only, else null)
- `url`
- `volume` / `liquidity` if present

Append-only: never rewrites existing lines. Deduped within a run by `marketId` (latest kept).

## Honest note

These platforms are NOT sportsbook prices. They report consensus probabilities derived from prediction-market mechanisms (CPMM on Manifold, order-book mid on Polymarket), not bookmaker-implied odds. They are useful sanity-check references for model probabilities until real book feeds (e.g., Betfair / Pinnacle) exist, but should not be treated as live betting lines.
