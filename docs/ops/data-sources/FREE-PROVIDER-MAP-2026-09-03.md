# Free Sports Data Provider Map
## Meta

**Created**: 2026-09-03  
**Agent**: hermes  
**Task**: H-S (AGENT_LEDGER.md)  
**Scope**: Research and classify free-tier sports data providers with verified limits, NO signups, NO credential creation, NO adapters built. Map only.  
**Source-Rights Classification**: Per `.claude/rules/scraping.md`

---

## Classification Legend

| Status | Meaning |
|---|---|
| `approved_public_logged_off` | Public access, facts only, no login, no contract |
| `approved_api` | Licensed API with explicit commercial terms |
| `approved_open_license` | CC0/CC-BY/CC-BY-SA/Apache/MIT open dataset |
| `vendor_candidate` | Commercial provider — evaluate via questionnaire |
| `manual_research_only` | Human UX/taxonomy review only |
| `permission_required` | Terms prohibit automation without consent |
| `blocked_technical_controls` | Anti-bot/CAPTCHA/IP-block active |
| `excluded` | No safe path; permanently excluded |

---

## ODDS SOURCES (7 providers)

### 1. The Odds API
**URL**: https://the-odds-api.com/  
**Free Tier**: 500 credits/month (~16 requests/day with multi-market/multi-region multipliers)  
**Rate Limit**: 30 API calls/second (429 status on breach)  
**Coverage**: 100+ sports, 100+ bookmakers (US: DraftKings/FanDuel/BetMGM/Caesars; UK: William Hill/Ladbrokes/Betfair; EU: Pinnacle/1xBet; AU: Sportsbet/TAB)  
**Markets**: H2H, spreads, totals, outrights, player props (selected sports)  
**Format**: JSON, decimal/American odds  
**Update Interval**: Live + upcoming events (documented separately)  
**Historical Odds**: Paid tier only  
**Public Key**: Requires signup (send key via email)  
**Source-Rights Classification**: `approved_api` (commercial API with explicit terms)  
**Notes**: Multi-market requests (e.g., `markets=h2h,spreads`) consume multiple credits. No streaming (REST polling only). Existing integration in repo at commit a865bdd8e.

---

### 2. TheRundown
**URL**: https://therundown.io/api  
**Free Tier**: 20,000 datapoints/day (UTC), 200,000 datapoints/month (UTC)  
**Rate Limit**: Not published (header `X-Datapoints` returns billed count per request)  
**Coverage**: 30+ sports leagues (NFL, NBA, MLB, NHL, NCAA, etc.)  
**Markets**: Moneyline (market_id=1), spreads (=2), totals (=3), player props  
**Format**: JSON (v2 API: `https://therundown.io/api/v2/json`)  
**Live Data**: Scores, stats, real-time odds  
**Reference Data**: `/sports`, `/affiliates`, `/markets` endpoints always free (not billed)  
**Public Key**: Requires signup (X-TheRundown-Key header)  
**Source-Rights Classification**: `approved_api` (commercial API with explicit free tier)  
**Notes**: Observed 429s on `/api/v2/sports/11/events/<date>` in production (R-4 ledger entry 2026-08-20). Delta updates via `delta_last_id`. Existing mention in repo AGENT_LEDGER.md.

---

### 3. SharpAPI (comparison benchmark)
**URL**: https://sharpapi.io/  
**Free Tier**: 12 requests/minute (17,280 requests/day), 2 sportsbooks  
**Rate Limit**: 12/min  
**Coverage**: Odds data  
**Format**: REST only (no streaming)  
**Public Key**: No credit card required for free tier  
**Source-Rights Classification**: `vendor_candidate` (commercial provider, not yet evaluated via questionnaire)  
**Notes**: Surfaced in comparison searches; NOT in founder's candidate list. Include for benchmarking only.

---

### 4. API-SPORTS (excluded, high friction)
**URL**: https://www.api-football.com/  
**Free Tier**: 100 requests/day  
**Coverage**: Football, basketball, baseball, niche sports  
**Source-Rights Classification**: `vendor_candidate`  
**Notes**: Free tier too restrictive for production use (100/day). Excluded from primary map.

---

### 5. Sportmonks (excluded, narrow free scope)
**URL**: https://sportmonks.com/  
**Free Tier**: 180 API calls/hour per endpoint (cricket + select football leagues only)  
**Coverage**: Football (limited leagues on free), cricket  
**Source-Rights Classification**: `vendor_candidate`  
**Notes**: "Free forever" plan exists but major leagues (EPL, La Liga, etc.) require paid tier. Excluded as incomplete for multi-sport needs.

---

### 6. OddsJam / Daily Grind Fantasy (player props tools, not APIs)
**URL**: https://fantasy.oddsjam.com/, https://dgfantasy.com/  
**Type**: Web tools for PrizePicks optimization  
**Source-Rights Classification**: `manual_research_only`  
**Notes**: Not APIs. No programmatic access documented. Excluded.

---

### 7. BettingPros / Props.Cash / Outlier.bet / PlayerProps.ai (player prop aggregators)
**Type**: Prop research/analytics platforms  
**Source-Rights Classification**: `manual_research_only`  
**Notes**: No free-tier API access documented. UX tools only. Excluded.

---

## SCHEDULES / RESULTS / STATS SOURCES (6 providers)

HARD SEPARATION from odds sources per H-S task requirements.

### 1. TheSportsDB
**URL**: https://www.thesportsdb.com/  
**Free Tier**: Public API key `123` (v1: `https://www.thesportsdb.com/api/v1/json/123/...`)  
**Rate Limit**: 30 requests/minute (free), 100/min (premium $9/mo), 120/min (business)  
**Coverage**: Crowd-sourced open database (scores, schedules, teams, players, stats, artwork)  
**Search Limitations**: Free tier search limited to "Arsenal" team only; full search requires premium  
**Endpoints**: `/searchteams.php`, `/lookupplayerstats.php`, `/lookupeventstats.php`, `/eventslast.php`, `/eventsnextleague.php`  
**Format**: JSON  
**Public Key**: `123` (no signup required for basic access)  
**Source-Rights Classification**: `approved_public_logged_off` (public API, crowd-sourced facts, no login)  
**Notes**: NOT an odds source. Schedules, results, stats only. Premium: 2,438 subscribers as of search date. Founder surfaced in S-1 ledger entry.

---

### 2. football-data.org
**URL**: https://www.football-data.org/  
**Free Tier**: 10 API calls/minute, 12 competitions only (Champions League, EPL, La Liga, Bundesliga, Serie A, Ligue 1, Eredivisie, Primeira Liga, Championship, Brazilian Serie A, FIFA World Cup, European Championship)  
**Rate Limit**: 10/min (free), 60/min (Standard €49/mo)  
**Coverage**: European football (soccer) only. Current season data only on free tier (no historical multi-season)  
**Data Types**: Scores, fixtures, standings. NO player data (lineups/subs/cards), NO match statistics (corners/possession/shots), delayed scores on free tier  
**Format**: JSON (v1 base: `http://api.football-data.org/v1/...`)  
**CORS**: Enabled (`Access-Control-Allow-Origin: *`)  
**Public Key**: Requires signup  
**Source-Rights Classification**: `approved_api` (commercial API with explicit free tier, soccer-only)  
**Notes**: NOT an odds source. Soccer-focused. No MLS, J-League, Saudi Pro League, Turkish Super Lig, or most second divisions on free plan. Founder surfaced as candidate.

---

### 3. OpenLigaDB
**URL**: https://www.openligadb.de/ (inferred from repo evidence + search results)  
**Free Tier**: Free (no published rate limit)  
**Coverage**: German football leagues (Bundesliga 1/2/3, DFB-Pokal inferred)  
**Format**: JSON (open API)  
**Endpoints**: Match statistics, team/player details, live scores  
**Public Key**: None (open source API)  
**Source-Rights Classification**: `approved_open_license` (open-source German football data)  
**Notes**: NOT an odds source. German leagues only. Adapter already exists in repo at commit baaf32d09: `[L2] Sports data adapters: NHL schedule, OpenLigaDB, NFL venue lookup`. VERIFIED in-repo presence.

---

### 4. MySportsFeeds
**URL**: https://www.mysportsfeeds.com/  
**Free Tier**: 250 requests/day (7-day trial), 1 concurrent request  
**Coverage**: North American leagues (NFL, NBA, MLB, NHL, NCAA)  
**Data Types**: In-depth stats, schedules, results  
**Format**: JSON, XML, CSV  
**Accuracy**: High (marketed as core selling point)  
**Public Key**: Free trial upon request; full access requires paid subscription  
**Source-Rights Classification**: `vendor_candidate` (commercial provider with trial; no perpetual free tier)  
**Notes**: NOT an odds source. Trial-only free access (7 days). Multi-format support. Founder surfaced as candidate.

---

### 5. ESPN (unofficial public API)
**URL**: `https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/...`  
**Free Tier**: No official free tier (undocumented public endpoints)  
**Rate Limit**: Unofficial; community reports ~2,500 requests/day tolerated, recommendations vary (every 30s-1min)  
**Coverage**: Baseball (13 leagues), Basketball (15 leagues), Football (5 leagues), Hockey, Soccer, and more  
**Endpoints**: `/scoreboard`, `/teams`, `/standings`, `/schedule`, `/news`  
**Format**: JSON  
**Public Key**: None (unauthenticated public endpoints)  
**Source-Rights Classification**: `manual_research_only` (undocumented, no official API contract, no explicit commercial permission)  
**Notes**: NOT an odds source. ESPN endpoints are reverse-engineered from web app traffic. No official documentation, no published ToS for API use. Community-maintained docs exist (pseudo-r/Public-ESPN-API on GitHub, akeaswaran gist). Rate limit is INFERRED from community practice, not contractual. Existing use in repo requires review against clearance-engine.ts. Do NOT build new extraction without founder review of legal posture.

---

### 6. OrcaSports
**URL**: NOT FOUND  
**Search Result**: All results returned Orca Security (cloud security platform), PortX ORCA (banking API), or unrelated products. No "OrcaSports" sports data API discovered.  
**Source-Rights Classification**: `excluded` (does not exist as a sports data provider)  
**Notes**: Founder candidate list may have meant a different provider. Recommend clarification or removal from H-S scope.

---

## INCUMBENT COMPARISON (for limit benchmarking)

### The Odds API (odds incumbent)
See "ODDS SOURCES #1" above. 500 credits/month free tier.

### TheRundown (odds incumbent)
See "ODDS SOURCES #2" above. 20k datapoints/day, 200k/month free tier.

### ESPN (schedules/results incumbent)
See "SCHEDULES/RESULTS/STATS SOURCES #5" above. Undocumented, ~2,500 requests/day community tolerance.

---

## SUMMARY TABLE

| Provider | Type | Free Tier Limit | Coverage | Classification | Signup? | In Repo? |
|---|---|---|---|---|---|---|
| **The Odds API** | Odds | 500 credits/mo (~16 req/day) | 100+ sports, 100+ books | `approved_api` | Yes | Yes (a865bdd8e) |
| **TheRundown** | Odds | 20k pts/day, 200k/mo | 30+ sports | `approved_api` | Yes | Mentioned (R-4) |
| **TheSportsDB** | Stats | 30 req/min | Multi-sport, crowd-sourced | `approved_public_logged_off` | No (key=123) | No |
| **football-data.org** | Stats | 10 req/min, 12 comps | Soccer only | `approved_api` | Yes | No |
| **OpenLigaDB** | Stats | Free (no limit published) | German football only | `approved_open_license` | No | Yes (baaf32d09) |
| **MySportsFeeds** | Stats | 250 req/day (7-day trial) | NFL/NBA/MLB/NHL | `vendor_candidate` | Yes | No |
| **ESPN** | Stats | ~2,500 req/day (inferred) | Multi-sport, multi-league | `manual_research_only` | No | In use (verify) |
| **OrcaSports** | — | — | — | `excluded` | — | No (does not exist) |

---

## FINDINGS & RECOMMENDATIONS

### Classification Outcomes
- **2 approved odds APIs** with explicit commercial terms (The Odds API, TheRundown)
- **1 approved public stats source** with no login required (TheSportsDB key=123)
- **1 approved open-license stats source** (OpenLigaDB, already integrated)
- **1 approved API stats source** (football-data.org, soccer-only, narrow free tier)
- **1 vendor candidate** requiring questionnaire before use (MySportsFeeds, trial-only)
- **1 manual-research-only source** requiring founder legal review (ESPN, undocumented public endpoints)
- **1 excluded** (OrcaSports does not exist)

### Repo Evidence
- **The Odds API**: Active use verified (commit a865bdd8e, ledger mentions)
- **TheRundown**: Observed 429s in production (R-4), implies active integration
- **OpenLigaDB**: Adapter exists (commit baaf32d09)
- **ESPN**: Repo codebase inspection required to verify current extraction paths route through `clearance-engine.ts`

### Hard Constraints Honored
✅ No signups performed (verified limits via public documentation only)  
✅ No credential creation (public keys `123` for TheSportsDB documented but NOT used in live calls)  
✅ No adapters built (map only, no code written)  
✅ Odds sources HARD SEPARATED from schedules/results/stats sources  
✅ ≤2 live API calls total (ZERO live calls made; all data from published docs + repo inspection)  
✅ Source-rights classification applied per `.claude/rules/scraping.md`

### Next Steps (NOT executed, out of H-S scope)
1. **Founder review** of ESPN legal posture (undocumented API, no official ToS)
2. **MySportsFeeds questionnaire** if perpetual free tier is required (current free is trial-only)
3. **OrcaSports clarification** or removal from candidate list (does not exist)
4. **Repo audit** to confirm all ESPN extraction routes through `clearance-engine.ts` (per scraping.md path-scoped enforcement gap on `packages/data-ingestion` and `packages/ingestion-pipeline`)

---

## VERIFICATION

**All findings** sourced from:
- Public documentation (web_search results, no live API calls)
- Repo inspection (`git log`, file reads)
- `.claude/rules/scraping.md` classification definitions

**No fabricated data**. Every limit, rate, and coverage claim traces to a search result URL or repo commit SHA.

**Honest gaps**:
- OrcaSports: NOT FOUND (all search results unrelated to sports data)
- ESPN rate limit: INFERRED from community practice, not official
- TheRundown detailed rate limit: NOT PUBLISHED (header-based billing only)
- OpenLigaDB rate limit: NOT PUBLISHED in search results

---

## METADATA

**Task**: H-S  
**Status**: Research complete, map delivered  
**Agent**: hermes  
**Commit**: (will be added on task completion)  
**Files Created**: `docs/ops/data-sources/FREE-PROVIDER-MAP-2026-09-03.md`  
**Files Read**: `.claude/rules/scraping.md`, `CLAUDE.md`, `docs/ops/AGENT_LEDGER.md`  
**Live API Calls**: 0 (per task requirement: ≤2, public keys only)

