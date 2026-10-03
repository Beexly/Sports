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

> **UPDATE 2026-06-30:** Two corrections below, each verified against current
> code. NOTE: the 7-sport *Supported Sports* list above is **accurate** — it
> matches `SUPPORTED_SPORTS` in the config file exactly (NFL, NCAAF, NBA, NCAAB,
> MLB, NHL, MLS); leave it as-is.
>
> 1. **Model id.** The model id `claude-opus-4-6` (under *AI Layer → Model*
>    above) exists **nowhere** in the repo. The model catalog / source of truth
>    is `apps/web/lib/claude-api/model-router.ts`, whose `MODELS` map defines the
>    exact ids: `haiku = "claude-haiku-4-5-20251001"`,
>    `sonnet = "claude-sonnet-4-6"`, `opus = "claude-opus-4-8"`. The active
>    default across every Claude surface is **`claude-sonnet-4-6`** (the
>    `SURFACE_TIER` map routes all surfaces to `sonnet` today; only
>    `calibration-insight` and `brief` are flipped to `haiku`). Treat
>    `model-router.ts` as the single source of truth for which model handles
>    which surface.
>
> 2. **Config path.** The path `packages/data-ingestion/config.ts` (in the
>    *Supported Sports* heading above) is **wrong**. The real file is
>    **`packages/data-ingestion/src/config.ts`**, where `SUPPORTED_SPORTS`
>    actually lives.

## Data Validation Rules

1. All game data must have `commence_time` in the future (or < 3hr ago for live)
2. All odds data must have valid bookmaker source
3. All picks must trace back to an ingestion run ID
4. All ingestion runs logged with status, record count, duration, errors
