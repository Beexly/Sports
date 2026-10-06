# Pick'em / DFS Platform API Recon — 2026-09-25

Research date: 2026-09-25 (Central). All "LIVE" rows were verified with curl
from this VM on 2026-09-25. "SOURCE" rows are cited to specific public URLs
seen on 2026-09-25, NOT live-verified. Constraints honored throughout: public,
documented, or publicly reverse-engineered endpoints only; no stolen
credentials, no authentication bypass, no session hijacking, no access-control
circumvention. Nothing here uses anyone else's session or account.

## Verdict summary

| Platform | Verdict | One-line reason |
|---|---|---|
| DraftKings Pick6 | **WIRE** | 7 no-auth GET routes, full board + payout JSON, verified live |
| Underdog Fantasy (pick'em) | **WIRE** | New v2 higher/lower board, no-auth, fresh Week 3 lines |
| Underdog Fantasy (stats/draft) | **WIRE** | Sports/scoring/slates/matches all live no-auth (supplements existing underdog-client.ts) |
| PrizePicks | **WIRE** | partner-api host returns full projections board, no-auth |
| Sleeper | **WIRE** | Documented public API; projections/stats fill the gap beside existing modules |
| Action Network (scoreboard) | **WIRE** | No-auth per-book odds incl. DraftKings=15 / FanDuel=30 (cleaner than FD sbapi token) |
| Drafters | **KEY** | Real endpoints, but all require the user's own session Bearer token |
| FanDuel fantasy DFS | **SKIP** | All data routes 401 without a live user session |
| FanDuel Picks (pick'em) | **SKIP** | Product shut down March 2026 — no API target exists |
| FanDuel sportsbook sbapi | **SKIP** | Static `_ak` token works today but is fragile/rotation-prone with ToS exposure; Action Network is the better route |

Wired modules (all new files, default-OFF, env-gated, with tests):
`prizepicks-intake.ts`, `underdog-pickem-intake.ts`, `dk-pick6-intake.ts`,
`sleeper-projections-intake.ts`, `drafters-intake.ts`,
`action-network-scoreboard-intake.ts` (each with a matching `.test.ts`).

---

## 1. DraftKings Pick6 — WIRE

- Bases: `https://api.draftkings.com` (data), `https://pick6.draftkings.com` (web app).
- The web app ships its endpoint inventory in its JS bundle
  (`https://pick6.draftkings.com/assets/endpoints-C5u8nxYj.js`, fetched
  2026-09-25; the hash rotates with deploys — re-fetch the bundle to
  re-discover the inventory). **Important:** the bundle names both
  `/public/pick6/...` and `/pick6/...` constants. The `/public` variants 404;
  the plain `/pick6/...` routes are the ones that answer.

| METHOD + path | auth | data returned | verification |
|---|---|---|---|
| `GET /pick6/v1/pickgroups/main?format=json` | none | Sport/league inventory, active pick groups, main pick group | LIVE curl 2026-09-25 → 200, 82,446 bytes. `{"mainSportLeagueKey":"2-2","mainPickGroupId":153969,...}` |
| `GET /pick6/v1/pickgroups/identifier?format=json` | none | Pick groups for current carousel identifiers | LIVE curl 2026-09-25 → 200, 78,363 bytes |
| `GET /pick6/v1/sportleague/glossaries?format=json` | none | Sport/league glossary + market metadata | LIVE curl 2026-09-25 → 200, 412,101 bytes |
| `GET /pick6/v1/pickgroups/{sportLeagueKey}?format=json` | none | Pick groups for one league (`1-1` = NFL, `2-2` = MLB) | LIVE curl 2026-09-25 (`/1-1`) → 200, 69,918 bytes |
| `GET /pick6/v1/pickgroups/{pickGroupId}/category/pickcards?format=json` | none | Full player/market board: entities, markets, target values, More/Less selection IDs | LIVE curl 2026-09-25 → 200; NFL group 153812: 150,682 bytes, 28 cards (e.g. Jonathan Taylor Rushing Yards 39.5) |
| `GET /pick6/v1/entrydetails/{pickGroupId}?format=json` | none | Pick-set sizes 2–8, entry suggestions, payout multipliers (2-pick 3x, 3-pick 6x, 4-pick 10x) | LIVE curl 2026-09-25 (`/153812`) → 200, 4,083 bytes |
| `GET /pick6/v1/pickgroups/{id}/pickcards/search` (no params) | none | Negative test: 400 without required params — confirms route behind param validation | LIVE curl 2026-09-25 → 400 |

- Negative tests (2026-09-25): `/public/pick6/...` variants all 404; `/pick6/v2/draftgroups/main` 404.
- Rate limits: none documented; no 429s in low-volume sequential testing.
- Prior art (public): browser-text scraping of the Pick6 lobby in
  https://github.com/edgarparra565/player-performance-forecaster/blob/HEAD/nba_model/scrapers/pick6.py
  (seen 2026-09-25); Apify actor zen-studio/draftkings-pick6-player-props.
- Wired as: `packages/data-ingestion/src/dk-pick6-intake.ts`
  (`DK_PICK6_INTAKE_ENABLED`), covering pickcards lines + entrydetails
  payout tiers. Picks up where the existing `draftkings-dfs-client.ts`
  (DFS lobby/pools) leaves off.

## 2. Underdog Fantasy — WIRE

- Bases: `https://api.underdogfantasy.com` (product/pick'em),
  `https://stats.underdogfantasy.com` (stats/draft data).

| METHOD + path | auth | data returned | verification |
|---|---|---|---|
| `GET /v2/over_under_lines?product=fantasy&sport_id=NFL` | none | Pick'em higher/lower board: 4,290 lines / 539 players; each line has `stat_value`, `options[]` (higher/lower, american + decimal prices), `status`, `updated_at`; appearance→player join via `appearances[]` | LIVE curl 2026-09-25 → 200, 11,936,504 bytes. Sample: Chase Brown, rushing_yds, line 63.5, higher/lower -112, active |
| `GET /v1/lobby` (api host) | none | Draft lobby: slates, draft pools, tournaments (~105 KB) | LIVE curl 2026-09-25 → 200 |
| `GET /v2/sports` (stats host) | none | Sports catalog incl. `pickem_status`, `over_unders_enabled` (~92 KB) | LIVE curl 2026-09-25 → 200 |
| `GET /v1/scoring_types` (stats host) | none | Fantasy scoring rules by sport/position | LIVE curl 2026-09-25 → 200 |
| `GET /v1/sports/NFL/slates` (stats host) | none | Contest slates incl. Week 3 "Sun Main Slate" 2026-09-27T17:00Z | LIVE curl 2026-09-25 → 200 |
| `GET /v1/sports/NFL/matches?date=2026-09-27` (stats host) | none | Match schedule (`?date=` REQUIRED — bare path 400s) | LIVE curl 2026-09-25 → 200 |

- Dead/changed: `/beta/v[4,5,6]/over_under_lines` (used by micahp/legendarypicks,
  eloc35/underdog-fantasy-pickem-scraper) now returns **426 upgrade_required**
  regardless of headers — killed between Aug and Sep 2026 per
  https://github.com/micahp/legendarypicks/blob/HEAD/docs/PROVIDER-AUDIT-2026-08-06.md
  (seen 2026-09-25). The v2 + `product=fantasy` form above is its successor.
  `product=` accepts ONLY `fantasy` (pickem/pick_em/draft/bestball/rivals/
  sportsbook/vs → 400). `?product=fantasy` requires `sport_id`.
- Underdog rebranded web → underdogsports.com; the public web board is
  login-walled but the API is not.
- Wired as: `packages/data-ingestion/src/underdog-pickem-intake.ts`
  (`UNDERDOG_PICKEM_INTAKE_ENABLED`), covering the higher/lower board.
  Complements the existing `underdog-client.ts` (stats host, `UNDERDOG_INGEST`).

## 3. PrizePicks — WIRE

- Base: `https://partner-api.prizepicks.com` (**use this — works**).
  `https://api.prizepicks.com` is the widely-referenced classic endpoint but is
  now DataDome bot-walled (403 JS challenge, verified live 2026-09-25).

| METHOD + path | auth | data returned | verification |
|---|---|---|---|
| `GET /projections?league_id=9` | none | Pick'em board (JSON:API): `line_score`, `stat_type`, `stat_display_name`, `start_time`, `status`, `board_time`, `updated_at`, `allowed_wager_types`, `is_promo`, `flash_sale_line_score`; player names via `relationships.new_player` → `included[]` | LIVE curl 2026-09-25 → 200, 8,718,369 bytes, 7,554 NFL projections, updated 2026-09-25T13:26-04:00, games 2026-09-27 |
| `GET /leagues` | none | League id → name map (~118 KB) | LIVE curl 2026-09-25 → 200 |
| `GET /projections` (no params) | none | All leagues (~47 MB); filter with `?league_id=` | LIVE curl 2026-09-25 → 200 |

- League ids (from /leagues, 2026-09-25): 9=NFL, 7=NBA, 15=CFB, 2=MLB, 12=UFC,
  8=NHL, 3=WNBA, 1=PGA, 5=TENNIS, 82=SOCCER, 125=F1, 42=BOXING, 241=WORLD CUP.
- `/players`, `/promotions`, `/teams`, `/payouts` → 404 on the partner host
  (data is embedded in `/projections` + `included`).
- Rate limits: none observed; 10 rapid sequential requests → all 200.
  Community guidance (https://github.com/thomascp2/rebounds-assists/blob/HEAD/CLAUDE.md,
  seen 2026-09-25): ~2s between requests, try partner-api first.
- Wired as: `packages/data-ingestion/src/prizepicks-intake.ts`
  (`PRIZEPICKS_INTAKE_ENABLED`).

## 4. Sleeper — WIRE

- Base: `https://api.sleeper.app` (official public API, no auth).
  Docs: https://docs.sleeper.com/ (live 2026-09-25).
- Documented limit: stay under 1,000 calls/min (20 rapid GETs 2026-09-25,
  all 200, no throttling).

| METHOD + path | auth | data returned | verification |
|---|---|---|---|
| `GET /v1/state/nfl` | none | Current NFL state: week 3, season 2026, season_type regular | LIVE curl 2026-09-25 → 200, 211 bytes |
| `GET /v1/players/nfl` | none | Full NFL player DB (~10k players; bio, position, team, status, injury, ids) — cache daily | LIVE curl 2026-09-25 → 200, 14,659,809 bytes |
| `GET /v1/players/nfl/trending/{add\|drop}?lookback_hours=24&limit=25` | none | Trending adds/drops `[{count, player_id}]` | LIVE curl 2026-09-25 → 200 |
| `GET /v1/stats/nfl/regular/{season}/{week}` | none | Weekly box-score stats: snap counts (`off_snp`, `tm_off_snp`), pos ranks ppr/half/std | LIVE curl 2026-09-25 (`/2026/3`) → 200, 36,310 bytes |
| `GET /v1/projections/nfl/regular/{season}/{week}` | none | Weekly projections: `adp_dd_ppr`, `pts_ppr/pts_half_ppr/pts_std`, projected stat lines, keyed by player_id | LIVE curl 2026-09-25 (`/2026/4`) → 200, 628,382 bytes, 9,422 players |
| `GET /v1/user/{username}` | none | User profile | LIVE curl 2026-09-25 → 200 |
| league/draft/matchup/transaction endpoints | none | League metadata, rosters, matchups, transactions, drafts | SOURCE: https://docs.sleeper.com/ + community repos (seen 2026-09-25) |

- Dead variants (do NOT use): `/v1/schedule/nfl`, `/v1/schedules/nfl/2026`
  (both 404); legacy host `api.sleeper.com` (404).
- Ecosystem (all wrap the same public API, no key): PyPI `sleeper-fantasy-api`
  0.5.0; npm `sleeper-mcp`, `n8n-nodes-sleeper`; Go `go-sleeper`;
  third-party RapidAPI "Satellite API" (needs RapidAPI key — not needed).
- Wired as: `packages/data-ingestion/src/sleeper-projections-intake.ts`
  (`SLEEPER_PROJECTIONS_INTAKE_ENABLED`), covering weekly projections +
  weekly stats — the gap beside `sleeper-intake.ts` (depth charts/injuries)
  and `sleeper-feeds-client.ts` (state/players/trending).

## 5. Action Network (scoreboard) — WIRE

- Base: `https://api.actionnetwork.com` — no auth, no token.
- The existing `action-network-client.ts` covers `/nfl/public-betting`;
  this is the separate scoreboard API with per-book odds.

| METHOD + path | auth | data returned | verification |
|---|---|---|---|
| `GET /web/v1/scoreboard/{league}?date=YYYYMMDD&bookIds=15,30` | none | Per-book moneyline/spread/total rows per game (bookIds: DraftKings=15, FanDuel=30, Caesars=68, BetMGM=69, ...) | LIVE curl 2026-09-25 (`/nfl?date=20260927&bookIds=15,30`) → 200, 908,305 bytes, 16 NFL Week 3 games |

- This is the clean route to FanDuel/DraftKings book odds — preferred over
  the fragile FanDuel sbapi `_ak` static token (see §8).
- Wired as: `packages/data-ingestion/src/action-network-scoreboard-intake.ts`
  (`ACTION_NETWORK_SCOREBOARD_INTAKE_ENABLED`).

## 6. Drafters — KEY

- No public/no-auth API exists. No official docs, RapidAPI, Postman, npm,
  or PyPI package found across 8+ searches (2026-09-25).
- Reverse-engineered (public, read-only bundle analysis — Drafters' own
  shipped Angular client `https://drafters.com/drafts/main.js`, 6.3 MB,
  fetched 2026-09-25): `boxScoreUrl → node.drafters.com`,
  `phpApiUrl → api.drafters.com`, ~60 endpoint paths enumerated.

| METHOD + path | auth | data returned | verification |
|---|---|---|---|
| `GET https://node.drafters.com/props-game/get-props-games/{league_id}?stats=` | user's own Bearer token | Pick'em prop board: entities → players with prop_id, game_id, lock_time, player_name, position, question, bid_stats_name, bid_stats_value, options, event (home/away/time). League ids: NFL=2, CFB=10, NHL=1, CBB=7, NBA=4, MLB=3 | LIVE curl 2026-09-25 → **403** `{"status":false,"message":"A token is required for authentication"}` (endpoint exists; schema from https://github.com/aidanhall21/drafters-scraper/blob/main/python/drafters_scraper.py, seen 2026-09-25) |
| other `node.drafters.com` / `api.drafters.com` paths (contest listings, players, lobby filters, games) | user's own token / DRAFT_ACCESS_TOKEN in path | Contest/lobby data | LIVE curl 2026-09-25 → 401/403/404 unauthenticated |

- The legitimate access method (per the public repo's README, observed
  2026-09-25): the account owner copies their OWN Bearer token from their
  own logged-in browser devtools. No bypass involved.
- Wired as: `packages/data-ingestion/src/drafters-intake.ts`, gated on
  **BOTH** `DRAFTERS_INTAKE_ENABLED=true` **AND** `DRAFTERS_BEARER_TOKEN`.
  Fail-closed without either. The token is never logged or committed.
- Required env vars to activate:
  - `DRAFTERS_INTAKE_ENABLED=true`
  - `DRAFTERS_BEARER_TOKEN=<your own Drafters session Bearer token>`

## 7. FanDuel fantasy DFS — SKIP

- Base: `https://api.fanduel.com` — every data route is session-walled.

| METHOD + path | verification |
|---|---|
| `GET /fixture-lists`, `GET /sports` | LIVE curl 2026-09-25 → **401** `{"error":{"code":401,"message":"UNAUTHORIZED. The client failed to provide authentication credentials."}}` |
| `GET /fixture-lists/{id}`, `/players`, `/contests` | SOURCE: https://github.com/Setfive/fanduel-api/blob/master/Fanduel.ts (seen 2026-09-25) — requires live session (`Authorization` + expiring `X-Auth-Token`); hardened with 2FA since Oct 2023 per https://github.com/bcanfield/southpaw (PyPI `southpaw`, seen 2026-09-25) |

- No no-auth fantasy endpoint found in any search angle (GitHub, npm, PyPI,
  RapidAPI, Postman, YouTube descriptions, blogs, mobile packages).
- **SKIP** — not wireable as a data feed.

## 8. FanDuel Picks + sportsbook — SKIP

- **FanDuel Picks (pick'em app): closed permanently March 2026** (final
  contests April 23; withdrawals through May 29). Sources:
  https://www.bettingusa.com/fantasy/reviews/fanduel-picks/ and
  https://closingline.substack.com/p/the-cashout-sportsbooks-are-beating-fantasy-prediction-market-apps
  (both seen 2026-09-25). **SKIP** — no API target exists.
- FanDuel sportsbook `sbapi.nj.sportsbook.fanduel.com` content-managed-page
  route with the static `_ak=FhMFpcPWXMeyZxOx` token verified live 200
  (1.3 MB odds JSON, 2026-09-25) — but the token is fragile/rotation-prone,
  one public repo explicitly recommends retiring the pattern for ToS
  exposure (https://github.com/jeffblankenburg/boxscore/issues/99, seen
  2026-09-25), and Action Network (§5) provides the same books' odds
  no-auth. **SKIP** — not recommended versus the Action Network route.

## Env flags added (all default OFF)

| Module | Flag | Extra requirement |
|---|---|---|
| prizepicks-intake.ts | `PRIZEPICKS_INTAKE_ENABLED` | — |
| underdog-pickem-intake.ts | `UNDERDOG_PICKEM_INTAKE_ENABLED` | — |
| dk-pick6-intake.ts | `DK_PICK6_INTAKE_ENABLED` | — |
| sleeper-projections-intake.ts | `SLEEPER_PROJECTIONS_INTAKE_ENABLED` | — |
| drafters-intake.ts | `DRAFTERS_INTAKE_ENABLED` | `DRAFTERS_BEARER_TOKEN` (user's own session token) |
| action-network-scoreboard-intake.ts | `ACTION_NETWORK_SCOREBOARD_INTAKE_ENABLED` | — |

## Caveats

- PrizePicks and Underdog APIs are **undocumented** (reverse-engineered /
  community-documented); their ToS almost certainly prohibit automated data
  collection. Internal research use; gentle rates; do not republish raw feeds.
- Endpoints can change without notice: Underdog killed `/beta/v5` between Aug
  and Sep 2026; PrizePicks DataDome-walled `api.prizepicks.com` while leaving
  `partner-api` open. Health checks should alert on 426/403/404.
- PrizePicks sample in this dossier's wiring used `league_id=9` (NFL);
  `/leagues` carries the full id map for other sports.
