# Data Sources

## Primary: The Odds API

**URL**: https://the-odds-api.com  
**Purpose**: Live and upcoming sports odds from bookmakers worldwide  
**Auth**: API key via `THE_ODDS_API_KEY` environment variable

### Supported Markets
- `h2h` — moneyline (head-to-head)
- `spreads` — point spreads
- `totals` — over/under

### Supported Sports (configured in `packages/data-ingestion/config.ts`)
- `americanfootball_nfl` — NFL
- `americanfootball_ncaaf` — College Football
- `basketball_nba` — NBA
- `basketball_ncaab` — College Basketball
- `baseball_mlb` — MLB
- `icehockey_nhl` — NHL
- `soccer_usa_mls` — MLS

### Rate Limits
- Free tier: 500 requests/month
- Starter: 10,000/month
- Standard: 100,000/month
- Timestamps on every response for freshness tracking

### Key Endpoints Used
```
GET /v4/sports                          — list available sports
GET /v4/sports/{sport}/odds             — get odds for a sport
GET /v4/sports/{sport}/scores           — get scores (results)
GET /v4/sports/{sport}/events           — get events (games)
```

### Response Freshness Policy
- Data older than 60 minutes is considered stale
- Each ingestion run records `fetched_at` timestamp
- Picks are only generated from non-stale data
- Stale data triggers alert and skips pick generation

## AI Layer: Claude API (Anthropic)

**Purpose**: Content generation ONLY — not a data source for picks  
**Model**: `claude-opus-4-6` or `claude-sonnet-4-6`  
**Auth**: `ANTHROPIC_API_KEY`

### What Claude Generates
- Blog post summaries based on structured pick data
- Analysis narratives based on factual odds/line data
- SEO metadata (title, description, keywords)

### What Claude Does NOT Do
- Generate or invent sports statistics
- Make pick recommendations independent of data
- Access external URLs or live data

## Data Validation Rules

1. All game data must have `commence_time` in the future (or < 3hr ago for live)
2. All odds data must have valid bookmaker source
3. All picks must trace back to an ingestion run ID
4. All ingestion runs logged with status, record count, duration, errors
