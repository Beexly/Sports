# GAPS & BLOCKED SOURCES LEDGER
**Standard**: Strict evidence documentation (HTTP status code, stack trace, missing dependency, or ToS obstacle). Soft language forbidden.

---

## 1. Blocked & Anti-Bot Protected Sources

### GAP-01: Pro Football Reference (PFR) Advanced Passing & Defense Pages
- **Target URL**: `https://www.pro-football-reference.com/years/2024/passing_advanced.htm`
- **Observed Result**: `FAIL` (HTTP 403 Forbidden / Cloudflare Bot Management Challenge).
- **Verification Evidence**:
  ```
  HTTP Error 403: Forbidden
  Server: cloudflare
  cf-ray: 9ecb...
  ```
- **Technical Barrier**: Sports Reference Inc. enforces rigorous Cloudflare Turnstile / Bot Management headers that block unauthenticated programmatic HTTP clients without full residential browser fingerprinting.
- **Remediation & Fallback**:
  - Ingest advanced passing metrics (hurries, blitzes, sacks, bad throw %) directly from the nflverse pre-scraped Parquet mirrors (`intelligence/coaching/data/advstats_week_pass_2026.parquet`), which are pre-ingested and verified.
  - REA fallback module: `src/browser/CdpBrowserProvider.ts` with headful interactive browser session.

---

### GAP-02: BetBetter Historical Betting Datasets (`isaac-flath/nfl_betting`)
- **Target URL**: `https://raw.githubusercontent.com/isaac-flath/nfl_betting/main/data/spreads.csv`
- **Observed Result**: `FAIL` (HTTP 404 Not Found).
- **Verification Evidence**:
  ```
  HTTP Error 404: Not Found
  URL: https://github.com/isaac-flath/nfl_betting
  ```
- **Technical Barrier**: The third-party repository was either renamed, made private, or deleted from GitHub.
- **Remediation & Fallback**:
  - Use canonical nflverse schedules and lines dataset (`https://raw.githubusercontent.com/nflverse/nfldata/master/data/games.csv`), which contains 14,251 games from 1999–2026 with verified closing spreads, totals, and moneylines.

---

### GAP-03: zenhodl Sportsbook Odds Scraper Sample Repository
- **Target URL**: `https://raw.githubusercontent.com/zenhodl/sportsbook-odds-scraper/main/README.md`
- **Observed Result**: `FAIL` (HTTP 404 Not Found).
- **Verification Evidence**:
  ```
  HTTP Error 404: Not Found
  URL: https://github.com/zenhodl/sportsbook-odds-scraper
  ```
- **Technical Barrier**: Stale GitHub seed link in historical brief.
- **Remediation & Fallback**:
  - Substitute verified live Odds API fixtures (`C:\Users\Garrett\Sports\outbox\NFL_WEEK_6_LIVE_SLATE_BOARD_2026-10-16.json`) and local props edge sheet fixtures (`packages/prediction-engine/fixtures/dk_vs_pinnacle_shade_2026-10-10.csv`).

---

### GAP-04: Kalshi Individual Event Orderbook Detail Without Event Ticker
- **Target URL**: `https://api.elections.kalshi.com/trade-api/v2/markets`
- **Observed Result**: `PARTIAL` (Top-level events endpoint returns HTTP 200, but deep individual market orderbook streams require explicit `ticker` path parameter).
- **Remediation & Fallback**:
  - Use discovered `events` payload to enumerate active NFL tickers (`KXNFL*`), then query individual contract books via `CdpRuntimeRequests.ts`.
