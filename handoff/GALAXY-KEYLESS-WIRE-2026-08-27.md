# Galaxy keyless wire — 2026-08-27

Branch: hermes/galaxy-keyless-odds (not main).
Formula: become the provider. No The Odds API key. No Rundown key.

## Shipped
- espn-odds-client: site.web.api.espn.com first; inline competition.odds (DraftKings).
  Core /odds only if inline ML missing. Never fake -110 spread prices.
- GalaxySportsApiOddsProvider: createOddsQuoteProvider with no THE_ODDS_API_KEY
  uses galaxy-sports-api (certifiableForLiveGate=false). LIVE_BOARD not flipped.
- processSport: keyless ESPN/Galaxy before Rundown.

## Tests (measured)
- data-ingestion: 346 passed
- ingestion-pipeline: 221 passed, 6 skipped
- tsc data-ingestion + ingestion-pipeline: 0 errors

## Not done
- LIVE_BOARD still off (founder)
- Galaxy Python :8731 still local-only (in-process TS is the production path)
- Polymarket not in the TS provider yet
- 2018-2025 historical still open
