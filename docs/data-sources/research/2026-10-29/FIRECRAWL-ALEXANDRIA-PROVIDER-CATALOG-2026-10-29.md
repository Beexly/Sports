# Firecrawl Alexandria High-Provenance Sports & Creator Provider Catalog (2026-10-29)

## 1. Architecture & Two-Step Execution Contract
Firecrawl Alexandria (`https://api.firecrawl.dev/v2/search` & `https://api.firecrawl.dev/v2/scrape`) provides high-provenance structured data across **Sports (`espn-com`, `nfl-com`, `draftsharks-com`, `sleeper-com`, `fftoday-com`)** and **Creator/Social Intelligence (`influencers-club`)**.

1. **Step 1 — Discover (`0 credits`, FREE):**
   ```http
   POST https://api.firecrawl.dev/v2/search
   Authorization: Bearer $FIRECRAWL_API_KEY
   Content-Type: application/json

   { "query": "nfl rankings injuries depth chart", "sources": ["alexandria"] }
   ```
2. **Step 2 — Retrieve (Billed at capability's published credit cost):**
   ```http
   POST https://api.firecrawl.dev/v2/scrape
   Authorization: Bearer $FIRECRAWL_API_KEY
   Content-Type: application/json

   {
     "alexandria": {
       "provider": "draftsharks-com",
       "capability": "fantasy-sports-rankings/weekly_rankings",
       "options": { "position": "WR", "scoring": "PPR", "limit": 50 }
     }
   }
   ```
   Always discover before retrieving, call only capabilities returned by discovery, and log `creditsCost` in `scripts/ops/firecrawl_alexandria_nfl_client.py`.

---

## 2. Complete Verified Sports & Creator Capability Matrix (62 Capabilities)

### A. `espn-com` (12 Capabilities — `5 credits/call`)
- `espn-com/sports-data/injuries`: League-wide NFL injury reports (status, injury type, return date, comment).
- `espn-com/sports-data/roster`: Active club rosters, jersey numbers, positions, and injury designations.
- `espn-com/sports-data/scoreboard`: Weekly NFL schedule, live and final scores with explicit game status.
- `espn-com/sports-data/boxscore`: Per-period linescores and every player's passing, rushing, and receiving stat line.
- `espn-com/sports-data/event`: Full event summary, weather, venue, and officials.
- `espn-com/sports-data/player`: Player bio and career statistical splits.
- `espn-com/sports-data/team`, `espn-com/sports-data/team_schedule`, `espn-com/sports-data/teams`, `espn-com/sports-data/standings`, `espn-com/sports-data/leagues`, `espn-com/sports-data/search`.

### B. `nfl-com` (8 Capabilities — Official `api.nfl.com` — `5 credits/call`)
- `nfl-com/sports-league-data/injury_report`: Official NFL weekly practice participation (`FULL`/`LIMITED`/`DIDNOT`), primary injury, and game designation (`OUT`/`DOUBTFUL`/`QUESTIONABLE`).
- `nfl-com/sports-league-data/team_roster`: Official club roster and positional depth.
- `nfl-com/sports-league-data/schedule`: Weekly NFL schedule with UTC kickoff, venue, and broadcast networks.
- `nfl-com/sports-league-data/game`: Single-game UUID detail, live phase, and score.
- `nfl-com/sports-league-data/player`: Official NFL person UUID profile and status.
- `nfl-com/sports-league-data/standings`, `nfl-com/sports-league-data/teams`, `nfl-com/sports-league-data/news`.

### C. `draftsharks-com` (2 Capabilities — `5 credits/call`)
- `draftsharks-com/fantasy-sports-rankings/weekly_rankings`: Weekly positional rankings (`QB`, `RB`, `WR`, `TE`, `FLX`, `DST`, `ALL`) in `STD`, `HALF`, `PPR`, or `TEP` with `projected_points` (median), `projected_floor`, `projected_ceiling`, `consensus_points`, `tier`, `opponent`, and `strength_of_schedule`.
- `draftsharks-com/fantasy-sports-rankings/ros_rankings`: Rest-of-season rankings with `injury_risk`, `projected_games`, `projected_points`, `projected_floor`, `projected_ceiling`, `consensus_points`, `ds_value` (3D value), `bye_week`, and `strength_of_schedule`.

### D. `sleeper-com` (9 Capabilities)
- `sleeper-com/fantasy-football-leagues/players`: Complete NFL player directory with `injury_status`, `depth_chart_position`, `depth_chart_order`, and `active` boolean.
- `sleeper-com/fantasy-football-leagues/trending_players`: Real-time waiver add/drop velocity across Sleeper leagues.
- `sleeper-com/fantasy-football-leagues/nfl_state`, `sleeper-com/fantasy-football-leagues/nfl_schedule`, `league`, `league_rosters`, `league_users`, `matchups`, `transactions`.

### E. `fftoday-com` (3 Capabilities)
- `fftoday-com/fantasy-sports-rankings/weekly_projections`: Weekly projected stat lines (pass/rush/rec yards, receptions, TDs) by position.
- `fftoday-com/fantasy-sports-rankings/weekly_rankings`, `fftoday-com/fantasy-sports-rankings/season_projections`.

### F. `influencers-club` (22 Capabilities — Content OS Partner & Creator Attribution — `165 credits/call`)
- `influencers-club/creators/connected-socials`: Cross-platform social graph (`instagram`, `youtube`, `tiktok`, `twitter`) with `follower_count`, `engagement_percent`, and `is_verified`.
- `influencers-club/creators/search`, `influencers-club/creators/similar`, `influencers-club/creators/audience-overlap`, `influencers-club/creators/enrich-analytics`, `influencers-club/creators/enrich-full`, `influencers-club/creators/enrich-profile`, `influencers-club/content/posts`, `influencers-club/content/details`.

---

## 3. Hard Active-Roster & Snap-Count Gate (`45/45` Week 8 Props Verified)
Executed via `python scripts/ops/firecrawl_alexandria_nfl_client.py`:
- Cross-checked all 45 prop players across all 14 Week 8 matchups in `data/packages/live-slate-writeups.json` against `data/gse-dataset/current/snap_counts_2026.csv` (Weeks 6 & 7) and `data/gse-dataset/current/injuries_2026.csv` (Week 8).
- **Result:** `Checked=45 | Active=45 | Flagged=0`.
- For tonight's TNF (`CAR @ GB`): `Jayden Reed` (IR since Week 2, `0.00` snaps W3–W7) and `Matthew Golden` (Week 8 `DNP - Shoulder`) are 100% excluded; Green Bay's active pass catchers are **`Christian Watson`** (`81%` W7 snaps, WR1), **`Tucker Kraft`** (`88%` W7 snaps, TE1), and **`Savion Williams`** (`60%` W7 snaps, WR2), paired with **`Josh Jacobs`** (RB1) and **`Jordan Love`** (QB1).
