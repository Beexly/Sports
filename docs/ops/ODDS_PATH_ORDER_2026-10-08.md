# Odds path order — 2026-10-08

Founder order, WP-27 in LAUNCH_FINISH_LINE_2026-09-05.md: we are the provider. Not Rundown. Not The Odds API.

## What main does

`createOddsQuoteProvider` in `packages/data-ingestion/src/odds-provider-adapter.ts` returns `TheOddsApiOddsProvider` when `THE_ODDS_API_KEY` is set and the 402 circuit is closed. Galaxy is the fallback.

`apps/web/app/api/cron/refresh-odds/route.ts` does not call that function. It calls `resolveOddsApiKey` and `resolveRundownApiKey`. If both are absent, the board fill is signal-only.

`packages/ingestion-pipeline/src/process-sport.ts` constructs `new OddsApiClient(apiKey)`. It does not import `GalaxySportsApiOddsProvider`. ESPN runs when the paid event list is empty.

`docs/ops/ODDS_FREE_DUAL_PATH_HONESTY.md` (2026-08-08) still says primary is The Odds API. That file is a snapshot. It is not WP-27.

## Required order

1. Default: `GalaxySportsApiOddsProvider`. Keyless ESPN inline. `certifiableForLiveGate` stays false.
2. Paid Odds API only when `ODDS_PROVIDER` is `odds-api` or `the-odds-api`, the key is set, and the circuit is closed.
3. Rundown only when `ODDS_PROVIDER=rundown`. This adapter has no Rundown class. Do not fall through to The Odds API.
4. `ODDS_PROVIDER=offline` stays empty and unhealthy.

A selector change does not move the cron until `refresh-odds` and `process-sport.ts` stop constructing `OddsApiClient` on the default path.

## Not in this commit

No schema change. No migration apply. No live-gate flip. No play.
