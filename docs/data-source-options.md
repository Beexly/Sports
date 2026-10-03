# Approved Data Source Options

Galaxy Sports Edge currently relies on **The Odds API** as the single
source of truth for live odds. This document catalogues the legitimate
alternatives we could add — with rate limits, costs, ToS posture, and
the integration cost — so that a future decision to add coverage is
informed.

Last reviewed: 2026-05-21.

## Selection criteria

Any data source we integrate must satisfy:

1. **Public API with terms permitting commercial use** (or a paid
   plan that grants it). No scraping of private endpoints.
2. **Stable rate limits** that survive launch-day traffic.
3. **Freshness guarantees** — we cannot publish picks against
   stale data (CLAUDE.md non-negotiable #5).
4. **Reasonable pricing** — adding a $500/month source for marginal
   coverage isn't worth it in the launch phase.

Sources that fail any of these are listed in
`rejected-data-sources.md`.

## Tier-1 — already integrated

### The Odds API
- **URL**: https://the-odds-api.com
- **Coverage**: NFL, NCAAF, NBA, NCAAB, MLB, NHL, MLS — plus dozens
  of international markets (EPL, La Liga, Bundesliga, etc.).
- **Markets**: h2h, spreads, totals.
- **Rate limits**: 500 req/mo free; 10K/mo Starter ($30/mo);
  100K/mo Standard.
- **Auth**: API key via `THE_ODDS_API_KEY`.
- **Freshness**: Response includes per-bookmaker `last_update`
  timestamp.
- **ToS posture**: Explicit commercial-use permission.
- **Integration cost**: Already done. See `packages/data-ingestion/`.

## Tier-2 — recommended additions for v2

### api-sports.io (a.k.a. API-Football / API-Basketball etc.)
- **URL**: https://www.api-sports.io
- **Coverage**: 1100+ leagues across football (soccer), basketball,
  baseball, hockey, American football, rugby, formula-1, MMA.
  Strongest for international soccer where Odds API is thinner.
- **Markets**: Fixtures, lineups, team stats, player stats, head-to-head.
  *Limited odds coverage* — pair with The Odds API for pricing.
- **Rate limits**: 100 req/day free; $19/mo Pro (7.5K/day);
  $39/mo Ultra (75K/day).
- **Auth**: API key via header.
- **Freshness**: Live-fixture endpoints update every 15s.
- **ToS posture**: Commercial use allowed on paid tiers.
- **Integration cost**: ~1 day to add a second adapter to
  `packages/data-ingestion/`, normalise to our internal types.
- **Why add it**: Lets us produce non-odds content (lineup previews,
  injury reports) without scraping, and fills soccer coverage gaps.

### SportsDataIO
- **URL**: https://sportsdata.io
- **Coverage**: Deep US-sports coverage — NFL, NBA, MLB, NHL, NCAAF,
  NCAAB, MLS, plus odds and DFS-specific endpoints.
- **Markets**: Odds (multi-book), play-by-play, player projections,
  injuries, weather.
- **Rate limits**: Tier-based — typical starter $99/mo, mid-tier
  $499/mo.
- **Auth**: API key.
- **Freshness**: Real-time push available on enterprise tiers.
- **ToS posture**: Explicit commercial use; carries an end-user
  license for downstream products.
- **Integration cost**: ~2 days. Their schema is richer than Odds
  API but their endpoints are not REST-uniform.
- **Why add it**: Replaces The Odds API entirely at v3 scale, *and*
  unlocks player-level data for content. Probably overkill at
  launch — revisit once monthly Stripe revenue exceeds the
  marginal cost.

## Tier-3 — niche / free fallbacks

### ESPN public endpoints
- **URL**: `https://site.api.espn.com/apis/site/v2/sports/...`
- **Coverage**: NFL, NBA, MLB, NHL, MLS, NCAAF, NCAAB, soccer.
- **Markets**: Schedule, scores, basic team/player metadata.
  *No odds.*
- **Rate limits**: Not officially documented (informal use only).
- **Auth**: None.
- **ToS posture**: Endpoints are public but **not officially
  documented for third-party use**. Use with caution and never as
  a primary source — they can change without notice.
- **Integration cost**: Trivial — REST/JSON, no SDK.
- **Why add it**: Useful as a *secondary* schedule/score
  cross-check, not as canonical truth. Belongs on a fallback path,
  never a primary one.

### balldontlie
- **URL**: https://www.balldontlie.io (NBA), separate sub-APIs
  for NFL, MLB.
- **Coverage**: NBA primary, NFL/MLB in beta.
- **Markets**: Stats, schedules, players, no odds.
- **Rate limits**: 60 req/min free; $9.99/mo for higher tier.
- **Auth**: Free tier no auth required; paid uses API key.
- **ToS posture**: Free for non-commercial; paid tier permits
  commercial.
- **Integration cost**: ~half day.
- **Why add it**: Cheap NBA player-stat fill-in for content.

## What to skip

- Anything that requires scraping a sportsbook directly (DraftKings,
  FanDuel, BetMGM) — their ToS prohibits it and they actively block
  scrapers. Use The Odds API, which licenses the same data.
- "Free" sports APIs from individual GitHub accounts without a clear
  ToS — typically reverse-engineered private endpoints (see
  `Public-FotMob-API` in `rejected-data-sources.md`).
- Any source that bundles "live streams" — DRM-protected content
  redistribution is criminal copyright infringement in most
  jurisdictions.

## Cost rollup (recommended launch posture)

| Source | Plan | Monthly |
| --- | --- | --- |
| The Odds API | Starter | $30 |
| api-sports.io | (deferred to v2) | — |
| SportsDataIO | (deferred to v3) | — |
| Anthropic | usage | ~$10 |
| Neon Postgres | Free tier | $0 |
| Upstash Redis | Free tier | $0 |
| Vercel | Hobby/Pro | $0–20 |
| Cloudflare domain | annual / 12 | $0.83 |
| **Total** | | **~$41–61/mo** |

This matches the cost model in `automation-architecture.md`.

## Adding a new source

Checklist for adding any future data source to `packages/data-ingestion/`:

- [ ] Read the ToS. Confirm commercial-use permission.
- [ ] Check rate limits against expected load.
- [ ] Add an env var (`<SOURCE>_API_KEY`) to the env template.
- [ ] Implement client in `src/<source>-client.ts` mirroring the
      shape of `odds-api-client.ts`.
- [ ] Add a normaliser entry in `src/normalizer.ts`.
- [ ] Add tests for the client's auth handling, error paths, and
      rate-limit response.
- [ ] Update this document and add the source to the cost rollup.
- [ ] Update `docs/data-sources.md` (the live ingestion spec).
