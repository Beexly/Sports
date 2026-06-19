# Deep Data Harvest — Free / Open Sports Data Sources
*Autonomous research run: 2026-06-19. 5 parallel research workers, 8 categories, 40+ sources evaluated.*

## Adopt-Mode Key
- **WIRE-NOW**: Keyless + open license. No rights review needed.
- **FREE-TIER**: Key/account required but free tier explicitly permitted.
- **PARK**: Rights review required before production use.

---

## Category 1: Sports Stats APIs (NFL, NBA, NHL, MLB, soccer)

### WIRE-NOW
| Source | URL | Auth | Data |
|---|---|---|---|
| NHL Official API | `api-web.nhle.com/v1/` | None (keyless) | Full PBP, shot coords, schedules, live feeds |
| nflverse / nfl_data_py | github.com/nflverse | None (file DL) | NFL PBP 1999+, EPA, WPA, venue surface/roof, officials |
| OpenLigaDB | `api.openligadb.de` | None (keyless) | Bundesliga/German football, JSON, results/tables |
| openfootball / worldcup.json | github.com/openfootball | None (keyless) | Soccer fixtures worldwide, World Cup 2026, public domain |
| Retrosheet | retrosheet.org | None (direct DL) | MLB PBP 1898–2025, gamelogs (already registered S3) |
| Wikidata SPARQL | query.wikidata.org/sparql | None (keyless) | Athlete metadata, teams, CC0 (already registered S3) |
| Transfermarkt Datasets | github.com/dcaribou/transfermarkt-datasets | None (keyless) | 79K games, 37K players, valuations, CC0 |

### FREE-TIER (Key/account needed, clear ToS)
| Source | Auth | Rate Limit | Data | Sport Coverage |
|---|---|---|---|---|
| BALLDONTLIE | Free key signup | 100 req/day | Scores, schedules, teams | NBA, NFL, MLB, NHL, soccer, MMA, tennis, golf |
| TheSportsDB | Test key "1" / free signup | 30 req/min | Events, metadata, artwork | Multi-sport |
| ClearSports API | Free key signup, no CC | 1,000 calls/mo | Odds, stats, injuries, news | NFL, NBA, NHL, MLB, soccer |
| API-Sports | Free key signup | 100 req/day/sport | Live scores, injuries, odds | 1000+ leagues/sports |
| OddsPapi | Free key signup, no CC | 250 req/mo | Historical odds incl. Pinnacle | Multi-sport |

### PARK (Rights review required)
- ESPN Hidden API — keyless, rich, but no commercial ToS
- MLB Stats API — keyless, MLBAM commercial rights apply
- nba_api / stats.nba.com — keyless, NBA ToS applies
- hoopR/wehoop — rich PBP, ESPN+NBA ToS
- Baseball Savant / pybaseball — MLBAM commercial rights
- Sports-Reference sites — explicitly prohibit scraping

---

## Category 2: Historical Odds / Closing Lines (CLV research)

### Top path for CLV backtesting
1. **OddsPapi** (FREE-TIER, registered vendor_candidate) — 350+ books incl. Pinnacle historical on free tier. 250 req/mo. No CC required. **Best immediate path to Pinnacle closing lines for CLV audit.**
2. **football-data.co.uk** — flat CSV, keyless, 20+ years of soccer odds — PARK (rights review needed for commercial)
3. **api.bettingiscool.com** — 2.4B Pinnacle records, 5yr history, request free trial — PARK
4. **Kaggle** — Various CC0/CC-BY datasets exist; check license per dataset — FREE-TIER

### PARK (Not ready for production wiring)
- OddsPortal — ToS prohibits automation
- Action Network — No official API
- Sports Insights — Web only
- OddsPortal historical — ToS prohibits automation

---

## Category 3: Venue / Turf / Altitude / Referee Data

### WIRE-NOW
- **nfl-data-py** (CC-BY-SA 4.0) — `surface` (turf type), `roof`, `temp`, `wind`, `stadium` per game in schedule data. `import_officials()` gives historical referee assignments. **Best single source for turf + official data.**

### Static lookup (baked in from open data)
- NFL stadium altitudes — compile once from public domain facts, store as static JSON
- All 32 NFL venues + surface type + dome/open — available from nflverse schedule data, compilable as a static table

### PARK
- RefMetrics — NFL section immature, subscription
- Football Zebras — HTML scrape only, no API
- NBA official referee assignments — NBA ToS
- ProSportsTransactions.com — Cloudflare-blocked + all-rights-reserved

---

## Category 4: Soccer xG / Event Data

### WIRE-NOW
- **openfootball** — public domain, fixtures/results worldwide
- **ML-KULeuven soccer_xg** (MIT library) — xG model training code, bring your own licensed event data

### PARK (Non-commercial only)
- StatsBomb open-data — rich event xG data but NC-only, attribution required
- Understat.com — No explicit ToS grant; scrapers exist but unconfirmed commercial
- FBref — scraping explicitly prohibited

---

## Category 5: Tennis, MMA, Darts

### PARK (No clean free path)
- Jeff Sackmann tennis repos — CC BY-NC-SA (non-commercial only)
- ufcstats.com — no open license, UFC is IP-protective
- All darts sources — no APIs, no open licenses

---

## Category 6: GitHub Repos / Kaggle / Government Data

### WIRE-NOW
| Repo | License | Data |
|---|---|---|
| github.com/dcaribou/transfermarkt-datasets | CC0-1.0 | Soccer player/match/valuation data |
| github.com/openfootball (all repos) | CC0/Public Domain | Global soccer fixtures/results |
| github.com/nflverse/nfl_data_py | MIT+CC-BY-SA | Full NFL analytics data |
| github.com/chadwickbureau/retrosplits | Retrosheet permissive | MLB splits by player/team/park |
| api.openligadb.de | Community open | Bundesliga live + historical |
| query.wikidata.org/sparql | CC0 | Athlete/team entity metadata |
| catalog.data.gov (EADA) | US Gov public domain | College athletics financial data |

### FREE-TIER
- TheSportsDB — community open, test key "1"
- College Football Data (collegefootballdata.com) — free key
- cbbdata / CBBData API — free key, NCAA MBB Barttorvik metrics
- BALLDONTLIE — free key, multi-sport

---

## Integration Queue (priority order)

**Immediate (new files, no deps):**
1. ✅ Register all WIRE-NOW + FREE-TIER sources in source-rights-registry.ts (this commit)
2. NHL schedule adapter (`lib/sports-data/nhl-schedule.ts`) — keyless, clearance-gated
3. OpenLigaDB Bundesliga adapter (`lib/sports-data/openligadb.ts`) — keyless, clearance-gated
4. NFL static venue table (`lib/sports-data/nfl-venues.ts`) — static JSON, CC-BY-SA attribution

**Owner-keyed (inert until key provided):**
5. BALLDONTLIE adapter — key env: `BALLDONTLIE_API_KEY`
6. ClearSports adapter — key env: `CLEARSPORTS_API_KEY`
7. OddsPapi CLV data adapter — key env: `ODDSPAPI_API_KEY` (vendor_candidate, needs questionnaire)

**PARK (rights review):**
- ESPN Hidden API — unofficial, no commercial grant
- MLB/NBA official data — league commercial rights
- Tennis Sackmann repos — NC only
