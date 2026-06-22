# Fantasy Football League Data Sources & APIs Research Report
**Date:** June 22, 2026  
**Compiled by:** Claude Code Research Agent

---

## Executive Summary

Three primary fantasy football platforms provide league data access via APIs: **Sleeper**, **Yahoo Fantasy Sports**, and **ESPN Fantasy**. Additionally, **MyFantasyLeague (MFL)** offers a paid developer API. Each has distinct authentication models, data availability, rate limits, and technical requirements for league benchmarking.

---

## 1. SLEEPER API

### Overview
- **Status:** Fully operational, free tier only
- **Authentication:** None required (public read-only API)
- **Cost:** Free
- **Best for:** Quick prototyping, public league data, no authentication overhead

### League Data Access
**Available Endpoints:**
- `GET /v1/league/<league_id>` - League metadata
- `GET /v1/league/<league_id>/rosters` - All rosters in league
- `GET /v1/league/<league_id>/users` - All users/owners in league
- `GET /v1/league/<league_id>/matchups?round=<week>` - Weekly matchup data
- `GET /v1/players/nfl` - Full NFL player map (~14MB)
- `GET /v1/players/nfl/trending/{add|drop}?lookback_hours=X&limit=Y` - Market momentum

**League-Level Metrics Available:**
- League size (number of rosters/owners)
- Roster positions
- League status
- Season year
- Individual roster records (wins, losses, ties)
- Points for (PF)
- Points for decimal precision
- Win-loss-tie records per roster
- Matchup results by week
- Starter vs. bench roster composition

### Rate Limits
**Conflicting documentation sources; recommendations:**
- Conservative: 90 requests per minute per IP
- Aggressive: 1000 calls per minute (stated in some community sources)
- **Recommendation:** Stay under 90 req/min to avoid IP blocking; monitor for 429 responses

### Authentication Model
- No API keys or tokens required
- Public access to all league data
- No OAuth flow needed
- IP-based rate limiting only

### Code Example (from codebase)
Located in `/apps/web/lib/integrations/sleeper.ts`:
- Pure normalizers for User, League, Roster
- Read-only sync (never writes to league)
- Fetches rosters, players, and trending data
- Caches the 14MB player map (6-hour TTL) to avoid redundant fetches

---

## 2. YAHOO FANTASY SPORTS API

### Overview
- **Status:** Requires OAuth 2.0 approval
- **Authentication:** OAuth 2.0
- **Cost:** Free with approval
- **Best for:** Official, long-term integrations; user-specific data; multi-sport support

### League Data Access
**Supported Sports:**
- Football (NFL)
- Baseball (MLB)
- Basketball (NBA)
- Hockey (NHL)

**Authentication Requirements:**
1. Request API access via Yahoo Developer Portal
2. Accept API Access and Use Agreement
3. Submit organization, product, and use-case information
4. Receive OAuth 2.0 credentials (Client ID & Secret)

**Available Data:**
- Games
- League information
- Team rosters
- Player statistics
- Matchups
- Transactions (waiver claims, trades, free agent pickups)
- Final standings

**League-Level Metrics Available:**
- League metadata (scoring format, settings)
- All team standings (W-L records)
- Points for/against per team
- Head-to-head matchup results
- Transaction history (trades, waivers, pickups)
- Player ownership across league
- Bench vs. active roster info
- League-wide scoring trends

### Rate Limits
- Subject to standard OAuth rate limiting
- Documentation does not specify explicit limits
- Appears to be lenient for approved developers

### Important Notes
- Private leagues: Only members can access data
- Requires user authentication and consent
- Supports historical data across multiple seasons
- FAAB (Free Agent Acquisition Budget) data may not be directly available

### Access Process
1. Visit [Yahoo Developer Portal](https://developer.yahoo.com/fantasysports/guide/)
2. Review API documentation
3. Submit access request with business justification
4. Wait for approval (typically 5-10 business days)
5. Implement OAuth 2.0 flow

---

## 3. ESPN FANTASY API

### Overview
- **Status:** Unofficial / Undocumented
- **Authentication:** Session-based (require cookies)
- **Cost:** Free
- **Best for:** Private league data scraping; no approval needed; rapid integration

### League Data Access
**Important Limitations:**
- No official public API
- Access via undocumented hidden endpoints
- Requires direct browser authentication
- As of August 2025, ESPN restricted historical data access

**Authentication Method:**
1. Log into ESPN.com via web browser
2. Copy two cookies from DevTools:
   - `espn_s2` - Session token
   - `SWID` - User identifier
3. Pass cookies with API requests

**Available Data:**
- League metadata
- All team rosters
- Matchup results by week
- Player statistics
- League standings
- Transaction history (limited)

**League-Level Metrics Available:**
- Standings (W-L records)
- Points for (PF)
- Points for decimal precision
- Bench points (optional scoring)
- Weekly matchup results
- Division standings
- Playoff seeds
- Head-to-head records

### Rate Limits
- Not officially documented
- Conservative estimate: 60-100 requests per minute
- Risk of endpoint changes without notice

### Important Caveats
- **Officially unsupported** — ESPN may change endpoints at any time
- Data from previous seasons has been deleted by ESPN
- Requires per-user cookies (no single app-level auth)
- Private leagues only accessible to authenticated league members
- May violate ESPN Terms of Service (IANAL)

### Current Status (August 2025 onward)
- Historical data access restricted
- Must sign in via web browser
- Requires manual cookie extraction

---

## 4. MYFANTASYLEAGUE (MFL) API

### Overview
- **Status:** Official, documented API (paid tier)
- **Authentication:** API Key
- **Cost:** API access included with paid league hosting ($50-$100+/year)
- **Best for:** Dynasty leagues, long-term data retention, fine-grained customization

### League Data Access
**Developer Program:**
- Open API for paid MFL subscribers
- Access via API key authentication
- Supports custom reports and data extraction

**Available Endpoints (2026):**
- League records (cumulative H2H records)
- Scoring records (highest scoring teams/players)
- Widest margin of victory
- League history and trends
- Franchise records
- Advanced draft reports

**League-Level Metrics Available:**
- Franchise records (all-time W-L)
- Scoring leaderboards
- League records (margins, streaks)
- Season-by-season history
- Draft statistics
- Auction values and keeper tracking
- Trade history

### Rate Limits
- Not explicitly documented
- Likely lenient for paid subscribers

### Important Notes
- **2026 limitation:** Most features only support current year (2026)
- Past season queries not fully supported
- Premium data requires MFL subscription
- Suitable for dynasty and keeper league deep analysis

### Access
1. Subscribe to MFL league hosting ($50-$100/year minimum)
2. Receive API documentation access
3. Request API key for your league
4. Implement API calls per MFL spec

**Documentation:** [MFL Developers API](https://api.myfantasyleague.com/2026/)

---

## 5. COMPARATIVE MATRIX

| Feature | Sleeper | Yahoo | ESPN | MFL |
|---------|---------|-------|------|-----|
| **Authentication** | None | OAuth 2.0 | Cookies (unofficial) | API Key |
| **Cost** | Free | Free (after approval) | Free | $50-$100/yr |
| **Data Quality** | High | High | Medium (historical gaps) | High |
| **Rate Limits** | 90 req/min (90-1000 varies) | Lenient (undoc) | ~60-100 req/min (est) | Lenient (undoc) |
| **Official Support** | Yes | Yes | No (hidden API) | Yes (paid) |
| **Ease of Integration** | Very Easy | Medium | Medium-Easy | Medium |
| **Multi-sport Support** | NFL only | 4 sports | NFL + NBA | NFL primarily |
| **Historical Data** | Yes | Yes | Limited (post-Aug 2025) | Excellent |
| **League Size Availability** | Yes | Yes | Yes | Yes |
| **Standings (W-L)** | Yes | Yes | Yes | Yes |
| **Points For/Against** | Yes | Yes | Yes | Yes |
| **Transaction History** | Limited | Yes | Limited | Yes |
| **Real-time Updates** | Trending only | Polling | Polling | Polling |

---

## 6. LEAGUE BENCHMARKING DATA AVAILABLE

### Core Metrics (All Platforms)
- **Win-Loss Record** — cumulative W-L by team
- **Streak** — consecutive wins or losses
- **Points For (PF)** — total points scored by team across all weeks
- **Points Against (PA)** — total points allowed to team
- **Point Differential** — PF minus PA (net advantage)

### Advanced Metrics (Platform-Specific)
**Sleeper:**
- Roster positions (active starters vs. bench)
- Weekly matchup scoring
- Market momentum (add/drop trending)
- Injury status at roster capture time

**Yahoo:**
- Head-to-head detailed results
- Opponent strength of schedule
- Player acquisition cost (waiver/FAAB history)
- Bench points (if league setting enabled)
- Division records

**ESPN:**
- Weekly matchup scoring by position
- Bench points (if league setting enabled)
- Division standings
- Playoff seeds and bracket seeding

**MFL:**
- All-time franchise records
- Auction value trends
- Keeper/dynasty trade value tracking
- Draft position performance analysis
- Multi-season efficiency metrics

### Derived Benchmarking Metrics
Libraries like `fantasy-football-metrics-weekly-report` can compute:
- Win percentage vs. league median
- Strength of schedule remaining
- Expected wins (based on PF vs. league)
- Luck factor (W-L vs. PF-based ranking)
- Team efficiency (scoring per player)
- Playoff probability models

---

## 7. TECHNICAL REQUIREMENTS FOR LEAGUE BENCHMARKING

### Minimum Implementation
1. **Data Ingestion:** Fetch league data weekly or after each game week
2. **Player Resolution:** Map player IDs from API to canonical player profiles
3. **Scoring Calculation:** Apply league-specific scoring rules
4. **Storage:** Cache league snapshots for historical analysis
5. **Normalization:** Convert platform-specific data to common schema

### Database Schema Considerations
The codebase (Prisma schema at `/packages/db/prisma/schema.prisma`) includes:
- `League` — sports league (NFL, etc.)
- `Team` — individual fantasy team
- `Game` — matchup between teams
- `Pick` — individual predictions
- Models can be extended for fantasy league data:
  - League metadata (format, scoring, settings)
  - Roster snapshots (weekly state)
  - Transaction history (trades, waivers)
  - Manager profiles and statistics

### Integration Pattern (From Codebase)
The existing Sleeper integration (`/apps/web/lib/integrations/sleeper.ts`) demonstrates:
```typescript
// 1. Pure normalizers (testable)
function normalizeLeague(raw: SleeperLeague): League
function normalizeRoster(raw: SleeperRoster, players): Team

// 2. Thin fetch wrappers (injectable for testing)
async function getJson<T>(url: string): Promise<T>

// 3. Legal gate (assertIngestible check before fetch)
assertIngestible("sleeper")

// 4. Error handling (honest empty states, never fabricate)
try { /* fetch */ } catch { return { status: "source-error", ... } }
```

---

## 8. RATE LIMITS & ACCESS RESTRICTIONS

### Sleeper
- **Limit:** 90 requests/min per IP (conservative); 1000/min (aggressive source)
- **Blocks:** IP blocking after rate limit exceeded
- **Recovery:** Manual or automatic after timeout
- **Authentication:** None (public)
- **Recommendation:** Implement exponential backoff; monitor 429 responses

### Yahoo
- **Limit:** Undocumented (lenient for approved developers)
- **Restriction:** Must be OAuth-approved before access
- **Private Leagues:** Only authenticated members
- **Recovery:** Follow OAuth retry logic

### ESPN
- **Limit:** Estimated 60-100 requests/min (undocumented)
- **Restriction:** Cookie-based (manual extraction required)
- **Risk:** Endpoints may change without notice
- **Data Gaps:** Historical data deleted as of Aug 2025
- **TOS Risk:** Unofficial API (use with caution)

### MFL
- **Limit:** Not documented (lenient)
- **Restriction:** Paid subscriber only
- **2026 Note:** Past-season queries have limited support
- **Cost:** $50-$100/year for league access

---

## 9. CODEBASE INTEGRATION POINTS

**Existing Adapters (Stubbed):**
- `/lib/statking/sources/adapters/sleeperAdapter.ts` — status: stubbed
- `/lib/statking/sources/adapters/yahooFantasyAdapter.ts` — status: stubbed
- `/lib/statking/sources/adapters/espnFantasyAdapter.ts` — status: stubbed

**Active Integrations:**
- `/apps/web/lib/integrations/sleeper.ts` — Full read-only sync (pure + tested)
- `/apps/web/lib/sleeper/source.ts` — Shared player-map cache, trending data

**Roadmap References:**
- `/docs/managed-leagues-vision.md` — League Twin, GM Autopilot, GM Ledger
- `/docs/fantasy-os-vision.md` — Fantasy-focused OS architecture
- `/apps/web/lib/fantasy/league-memory-roadmap.ts` — Data model for league profiling

**Legal Frameworks:**
- `/apps/web/lib/scraping/source-rights-registry.ts` — Rights classification
- Source status for fantasy APIs: Check registry before automating

---

## 10. RECOMMENDATIONS FOR SPORTS PLATFORM

### Phase 1: MVP (Sleeper Only)
**Rationale:** Zero authentication, immediate ROI
- Use Sleeper's public API
- Implement shared player-map cache (already in codebase)
- Weekly league snapshot ingestion
- Benchmarking dashboard (W-L, PF, PA, trends)
- Rate limit: 90 req/min; cache aggressively

### Phase 2: Multi-Platform (Sleeper + Yahoo + MFL)
**Rationale:** Broader user base
- Add Yahoo OAuth flow (submit formal API request)
- Add MFL API integration (document for paid subscribers)
- Normalize data across platforms
- Unify benchmarking schema

### Phase 3: ESPN (With Legal Review)
**Rationale:** Largest user base but highest risk
- Implement cookie-based auth (user provides espn_s2 + SWID)
- Document TOS risks (unofficial API)
- Restrict to illustrative examples until legal review
- Plan for endpoint changes

### Phase 4: Advanced Benchmarking
**Rationale:** Differentiation
- Luck factor calculation (W-L vs. expected wins)
- Strength of schedule
- Playoff probability models
- Draft pick retrospectives
- Long-term manager profiling (GM IQ)

---

## SOURCES

- [Sleeper API Documentation](https://docs.sleeper.com/)
- [Sleeper API Guide - Zuplo](https://zuplo.com/learning-center/sleeper-api)
- [Sleeper API Client Docs](https://sleeper-api-client.readthedocs.io/en/latest/endpoints/league.html)
- [Yahoo Fantasy Sports API](https://developer.yahoo.com/fantasysports/guide/)
- [Yahoo Fantasy API Documentation](https://yahoo-fantasy-api.readthedocs.io/en/latest/yahoo_fantasy_api.html)
- [ESPN Fantasy API (Unofficial)](https://github.com/cwendt94/espn-api)
- [ESPN Fantasy API Guide](https://zuplo.com/learning-center/espn-hidden-api-guide)
- [MFL Developers API](https://home.myfantasyleague.com/features/developers-api/)
- [MFL 2026 API](https://api.myfantasyleague.com/2026/)
- [Fantasy Football Metrics Report](https://github.com/uberfastman/fantasy-football-metrics-weekly-report)
- [ffscrapr R Package](https://ffscrapr.ffverse.com/)
- [Platform Comparison 2026](https://lordskunk.com/guides/sleeper-vs-yahoo-fantasy-football/)
- [League Standings Metrics](https://leaderboarded.com/blog/posts/fantasy-league-standings-stats/)
- [Fantasy Pros League Analyzer](https://www.fantasypros.com/nfl/myplaybook/league-analyzer.php)
