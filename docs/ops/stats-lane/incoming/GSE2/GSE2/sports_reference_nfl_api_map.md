# Sports Reference (NFL) API Research — Free vs. Paid & Prop-Edge Data Sources

**Scope:** Pro-Football-Reference / sports-reference.com (NFL).
**Bottom line:** Sports Reference has **no official public API**. NFL data is accessed either
**free** (self-scraping under published rate limits, or the free `sportsreference` PyPI package)
or via **paid** gatekeepers (Stathead subscription, third-party API wrappers, or custom data dumps).
Sports Reference does **NOT** provide live player-prop odds; it provides only **historical closing
game lines/totals (Vegas lines)** and deep *historical* boxscore/player stats — which are the
*fuel* for building your own projections, not the live prop prices you'd compare them against.

---

## 1. Key ground truth

- **No first-party API.** Sports Reference is a web publisher. Official data-use policy states most
  data is licensed from third parties and **cannot** be redistributed/bulk-downloaded without
  purchase. Direct scraping is the "free" path, governed by an explicit bot-traffic / rate-limit policy.
- **Rate limit (self-scrape):** 20 requests/minute max for `.com` sites (pro-football-reference.com,
  baseball-reference.com, etc.); 10 req/min for fbref.com & stathead.com. Exceeding it returns HTTP
  429 and the IP is "jailed" (often ~24h). Source: `sports-reference.com/bot-traffic.html` and
  `sports-reference.com/429.html`.
- **Free, zero-card wrappers exist:** `parse.bot` free plan (200 credits, 5 req/min, no card) and the
  `sportsreference` PyPI package (purely free, client-side rate-limiting your responsibility).

---

## 2. Free NFL data sources (no API key cost)

### 2a. `sportsreference` PyPI package (pure free, Python)
- Package name on PyPI: `sportsreference` (v0.5.2). GitHub repo is `roclark/sportsipy` (renamed to
  avoid confusion — it is **not** an official Sports Reference product). No key, no card required.
- **NFL modules** (confirmed from repo `sportsipy/nfl/`):
  - `nfl.boxscore` — `Boxscore(uri)` & `Boxscores(date)`: per-game stats incl. team metrics
    (points, passing/rushing/net yards, first downs, turnovers, penalties, sacks, time of
    possession), game metadata (date/time/location/result/duration/attendance), **weather**, and a
    Pandas `dataframe`. Per-game player-level stat tables are present.
  - `nfl.teams` — `Teams(year)` / `Team`: full-season team stats (offense, defense, special teams),
    roster/standings for a season. Returns Pandas DataFrames.
  - `nfl.schedule` — `Schedule()`: a team's schedule — date, score, result, opponent.
  - `nfl.constants`, `nfl.nfl_utils` — NFL/team/player reference constants & helpers.
- **What's free here:** all historical + current boxscores, team season stats, schedules, rosters.
- **Critical gap for prop-edge:** no Vegas lines, no player props, no live odds. (You supply your own
  projection model on top of these stats.)

### 2b. `parse.bot` free plan (200 credits, 5 req/min, no card)
- Wraps Sports Reference / PFR directly via managed scraping (handles anti-bot/rate-limit).
- **Pro-Football-Reference API** (7 endpoints):
  1. `get_season_schedule` — season schedule (game date, teams, venue).
  2. `get_season_stats` — team/individual season stats.
  3. `get_season_team_standings` — final standings, win/loss/division.
  4. `get_game_boxscore` — game boxscore w/ **player-level offensive & defensive stats** + metadata
     incl. **weather, attendance, and Vegas lines** (`vegas_line`).
  5. `get_game_details` — play-by-play / game detail.
  6. `get_player_profile` — player bio + career stat tables.
  7. `search_players` — player lookup.
  - Credit cost: 1 credit for light reads (stats, standings, search); 5 credits for heavy
    (schedule, boxscore, details, player profile). **~40 boxscore calls** or **~200 stats calls**
    per month on the free tier.
- **Stathead NFL API** (parse.bot, 1 endpoint):
  - `football_player_game_finder` — player game-by-game logs (passing, rushing, receiving, fumbles,
    snap counts), filterable by name or PFR ID, year, regular/playoff, and statistical thresholds.
    **1 credit/call.** This is effectively free Stathead querying.
- **What's free here:** schedules, standings, full boxscores + player stats, play-by-play, player
  career logs, AND the `vegas_line` (closing game spread/total) for games.

### 2c. Direct HTML scrape (free, self-managed)
- Same rate limit as above (20 req/min). You must implement retries/backoff + UA/headers.

### 2d. Historical Vegas lines already baked into PFR
- PFR's boxscore/scoreboard pages carry a **"Vegas Line"** (closing point spread) and an
  **"Over/Under"** (closing total) per game. Covers.com explicitly credits PFR as the source for
  closing odds from **1978 to present**. parse.bot's `get_game_boxscore` surfaces this as
  `vegas_line`. → **Historical closing game lines/totals are free via PFR** (both raw scrape and
  the wrappers above). They are *post-game / closing*, not live.

---

## 3. Paid Sports Reference access (NFL)

| Tier | Price | What it unlocks | Who provides |
|---|---|---|---|
| **Stathead** (1 sport) | $9/mo ($4.50/mo w/ student 50% off) | Ad-free UI + **advanced query tools** (query/filter the full SR database, customized leaderboards, "player finder" style filtering, no rate limits on the human site) | Sports Reference (official subscription). 1-month free trial. |
| **Stathead** (all sports) | $16/mo | Same, across all SR sites | Sports Reference |
| **parse.bot** Hobby | $30/mo, 1,000 credits, 20 req/min | 5× free credits + 4× rate limit; covers PFR + Stathead + Basketball-Reference + others | parse.bot (unofficial wrapper) |
| **parse.bot** Developer | $100/mo, 5,000 credits, 100 req/min | High-volume production access | parse.bot |
| **parse.bot** Team / Company | $300–$1000/mo | 20K–100K credits, higher limits, workspace, Slack support / SLA | parse.bot |
| **Custom data dump** | ≥ $5,000 (no exceptions, incl. students) | Bulk download of licensed data | Sports Reference (official) — "Sports Reference Data Feeds" |

- **parse.bot overages:** top-up credits available anytime on paid plans; free plan is hard-capped
  at 200 credits/month.
- Stathead does NOT expose a raw API; parse.bot's "Stathead NFL API" is the closest programmatic
  proxy (game-finder query).

---

## 4. What Sports Reference provides vs. what "prop edge" requires

| Prop-edge need | Sports Reference source | Free? |
|---|---|---|
| Your own player projection model | Free boxscore/player career logs (§2a/2b) | ✅ Yes |
| Historical closing game spread + total (Vegas line) | PFR boxscore `vegas_line` (1978–present) | ✅ Yes (via parse.bot `get_game_boxscore` or direct) |
| **Live** point spread / over-under | ❌ Not in SR (only closing/historical) | ❌ No |
| **Live player prop lines** (e.g., Mahomes o/u 290.5 pass yds) | ❌ Not provided anywhere on SR/PFR | ❌ No |
| Live prop lines from bookmakers | Must use an **odds API** (§5) | ✅ Free tiers exist |

**→ The "value" (edge) workflow:** Use Sports Reference for free historical/player stats to build a
projection, then source *live* prop prices elsewhere and compare. SR alone cannot give you live
prop odds.

---

## 5. Free prop-edge data sources (live lines) — complement to SR

To find prop edge you need (a) a projection [Sports Reference gives you this, free] and
(b) **live** bookmaker prices [Sports Reference does not give this]. Free tiers that do:

| Service | Free tier | NFL player props? | Notes |
|---|---|---|---|
| **The Odds API** | 500 credits/mo | ✅ Yes — `player_pass_yds`, `player_rush_yds`, `player_pass_tds`, etc. via per-event odds endpoint; `sport_key=americanfootball_nfl` | 1 req = markets×regions credits. Free tier **excludes historical** and some markets; live props available for US/AU bookmakers (DraftKings, FanDuel, etc.). |
| **NFL.com/Sleeper APIs** | Free | ❌ No live odds/props | Free *official-ish* data (schedules, scores, rosters, injury reports, live scores) but **no odds**. NFL shut down its public JSON odds; use for context only. |
| **Apify / free scrapers** | Free tier | ⚠️ Indirect | Can scrape public sportsbook pages (FanDuel/DraftKings) directly at your own risk — no official prop feeds. |

Paid (higher-fidelity) options: Sportradar (NFL Overview + OC Player Props — market IDs
`sr:market:914` total passing yards, `sr:market:6002` longest completion, etc.), sportsgameodds.com,
WinWithOdds, OddsJam. These carry NFL player prop markets natively but cost real money.

---

## 6. Quick reference — endpoints & rate limits

**Free (self-serve, no card):**
- `sportsreference` PyPI — unlimited local use, but **you** must honor 20 req/min PFR rate limit.
- `parse.bot` Free — 200 credits/mo, **5 req/min**, endpoints cost 1 credit (stats/standings/
  search/game_finder) or 5 credits (schedule/boxscore/details/profile). 1-month free trial on
  paid plans; no card needed to start.

**Paid:**
- Stathead: $9–$16/mo (official query tools).
- parse.bot Hobby $30 / Developer $100 / Team $300 / Company $1000 (more credits + higher rps).
- Custom Sports Reference dumps ≥ $5,000.
- NFL.com API: free but no odds. The Odds API: 500 credits free, paid plans above.

---

## 7. Files / sources

- `sports-reference.com/bot-traffic.html` — bot traffic & rate-limit policy (20 req/min `.com`,
  10 req/min fbref/stathead).
- `sports-reference.com/data_use.html` — data-use policy incl. "no AI training without permission",
  custom feeds ≥ $5,000, recommended partners (Sports Info Solutions, Gracenote).
- `sports-reference.com/stathead/` — Stathead subscription (one sport $9/mo, all sports $16/mo,
  student 50% off, 1-month free trial).
- `parse.bot` marketplace: `pro-football-reference-com-api` (7 endpoints) and
  `stathead-com-api` (`football_player_game_finder`); pricing at `parse.bot/pricing`.
- `pypi.org/project/sportsreference` + GitHub `roclark/sportsipy` (`sportsipy/nfl/`:
  `__init__`, `boxscore`, `constants`, `nfl_utils`, `schedule`, `teams`).
- `covers.com/sportsoddshistory/nfl-game-odds` — confirms PFR = source of closing odds 1978→present.
- `the-odds-api.com` — NFL odds API (`americanfootball_nfl`), player props for US/AU books,
  500-credit free starter tier.
