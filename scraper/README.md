# scores24.live Collector

Discovery + collection pipeline for scores24.live computer-generated predictions.

## Setup

```bash
cd scraper
npm install
npx playwright install chromium
```

## Usage

### Step 1 — Discovery (run once)

Maps every network call the site makes. Identifies stable API endpoints, WebSocket
connections, and inline page state. Creates `data/raw/discovery-report.json`.

```bash
npm run discover
```

Discovery visits ~10–15 pages, takes roughly 60–90 seconds, and outputs:

| File | Contents |
|---|---|
| `data/raw/discovery-report.json` | Full structured report — endpoints, scores, WS frames, notes |
| `data/raw/payloads/*.json` | Raw JSON bodies for every high-relevance endpoint |

Read `discovery-report.json` and look at:
- `endpoints` sorted by `relevanceScore` (10 = best)
- `stabilityNotes` for an auto-generated assessment of each endpoint type
- `antiBot.blocked` — if `true`, see the anti-bot section below

### Step 2 — Collection

```bash
# All supported sports
npm run collect

# Single sport
npm run collect -- --sport nba
npm run collect -- --sport nfl

# Specific date
npm run collect -- --date 2025-01-15

# Combined
npm run collect -- --sport mlb --date 2025-07-04
```

Valid sport keys: `football`, `basketball`, `baseball`, `hockey`

Collection writes:

| File | Contents |
|---|---|
| `data/raw/<SPORT>_<endpoint>_<ts>.json` | Raw payload per API call |
| `data/normalized/picks.json` | Deduplicated NormalizedPick[] |

## Output Schema

```json
{
  "source": "scores24",
  "sport": "NBA",
  "league": "NBA",
  "event": "Boston Celtics vs Golden State Warriors",
  "home_team": "Boston Celtics",
  "away_team": "Golden State Warriors",
  "market": "SPREAD",
  "pick": "Celtics -4.5",
  "odds": -110,
  "confidence": 72,
  "event_time": "2025-01-15T00:10:00.000Z",
  "scraped_at": "2025-01-15T20:01:33.000Z",
  "page_type": "api-direct",
  "source_url": "https://scores24.live/api/predictions?sport=basketball",
  "raw": {}
}
```

## Collection Strategy

The collector tries three phases in order:

```
Phase 1: Direct API fetch
  └─ Uses endpoints found in discovery-report.json with relevanceScore >= 5
  └─ No browser needed — pure HTTP fetch with realistic headers
  └─ Fastest and most reliable

Phase 2: Browser interception (fallback)
  └─ Navigates pages with Playwright
  └─ Intercepts all JSON responses in-flight
  └─ Extracts __NEXT_DATA__ inline state
  └─ Normalizes captured payloads

Phase 3: DOM extraction (last resort)
  └─ CSS selector scraping of rendered HTML
  └─ Fragile — selectors will break on site redesign
  └─ Picks tagged with page_type: "dom-fallback"
```

## Anti-Bot Notes

### Cloudflare / JS Challenge

If `discovery-report.json` shows `antiBot.blocked = true` with a Cloudflare reason:

1. **Switch to non-headless mode** — edit discovery.ts, set `headless: false`
2. **Add a startup delay** — add `await sleep(5000)` before the first page.goto()
3. **Use a residential proxy** — configure Playwright's `proxy` option in context
4. The exact failure URL is in `antiBot.blockDetails`

### 403 / 429 on direct API calls

- Increase `DELAY_BETWEEN_REQUESTS_MS` in collector.ts (currently 3500ms)
- Add a `Referer` header matching a valid page URL
- Try including the session cookie from a real browser session

### Failure is reported — not silently swallowed

Every phase logs exactly where it failed. Check console output for `🚫`, `⚠️`, `❌` markers.

## Endpoint Stability Guide

| Endpoint type | Stability | Notes |
|---|---|---|
| `/api/*` REST | **High** | Versioned, explicit contract |
| `/v1/`, `/v2/` | **Medium** | Stable until major version bump |
| `/_next/data/<hash>/` | **Low** | Hash changes every deployment |
| `__NEXT_DATA__` inline | **Medium** | Reliable on page load, needs browser |
| WebSocket frames | **Low** | Often requires auth tokens |
| DOM scraping | **Fragile** | Breaks on any redesign |

For `/_next/data/` paths: the build hash (e.g., `/_next/data/abc123/...`) changes
on every deployment. To handle this, fetch the homepage and extract the hash from
the `__NEXT_DATA__` script tag before constructing data paths.

## Polling

To keep picks fresh without hammering the server:

```
Every 15 minutes: run `npm run collect`
Daily at 6 AM:    run `npm run discover` to refresh endpoint map
```

Suggested cron:
```
*/15 * * * * cd /path/to/scraper && npm run collect >> /var/log/collector.log 2>&1
0 6  * * * cd /path/to/scraper && npm run discover >> /var/log/discovery.log 2>&1
```

Rate limit: `DELAY_BETWEEN_REQUESTS_MS = 3500` → max ~17 req/min. Well below typical
bot detection thresholds for polite scrapers (usually triggered above 60–120 req/min).

## File Layout

```
scraper/
├── src/
│   ├── types.ts          — shared TypeScript interfaces
│   ├── utils.ts          — sleep, retry, dedup, anti-bot detection
│   ├── discovery.ts      — maps network endpoints (run once)
│   ├── collector.ts      — collects + saves picks (run on schedule)
│   └── normalizer.ts     — raw → NormalizedPick conversion
├── data/
│   ├── raw/              — raw payloads + discovery report
│   └── normalized/       — deduplicated picks.json
├── package.json
└── README.md
```
