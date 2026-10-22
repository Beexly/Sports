# Legal sportsbook routes — census 2026-08-21

Not legal advice. Counsel before production.

## This week (no new founder contract)

Odds API ToS (quoted): commercial **analytical tools** OK; do **not** resell/repackage as a standalone odds API or dump. Email `team@the-odds-api.com` for written confirmation of GSE’s picks/analytics use.

Ship: `getEventOdds` / `getEventMarkets` / `getHistoricalOdds` on existing client. Books `draftkings,fanduel,betmgm`. Persist GSE’s own snapshots. Do not ship a public multi-book board as the product.

Fair/EV (official APIs, not DK scrape):

- Kalshi — REST/WS; Developer Agreement (already fail-closed in GSE for live pick path)
- ProphetX Market Data API — display/analytics SKU
- Novig — REST/WS + public CSVs at `data.novig.com`
- Polymarket Gamma/CLOB — public market data without credentials; US product geography is a compliance issue

Pinnacle via Odds API is **disclosed delayed**. DFS `us_dfs` is **indicative**.

## Do not confuse

| Pattern | Use? |
|---|---|
| SportsDataIO **Discovery Lab** $99–149 | No — “not licensed for commercial redistribution” |
| SportsDataIO **Leagues API** (sales) | Quarter — commercial, 10+ books, props, vault |
| Pikkit BookSync (stores sportsbook logins) | No — credential custodian; *Power Ventures* fact pattern |
| User-side Chrome overlay (user already on the page) | Confirm-only, never the house feed |
| SharpSports betSync | User slip tracking, not a line feed |
| Personal Betfair app key | Not a commercial Flutter EPD license |

## Founder emails (do not send without ask)

1. `api@pinnacle.com` — they list “academics and pregame handicapping projects.” GSE is that.
2. Flutter EPD — Company Exchange Data License, not white-label operator.
3. SportsDataIO commercial Leagues + Vault (not Discovery Lab).
4. Odds API `team@the-odds-api.com` — written analytics confirmation.
