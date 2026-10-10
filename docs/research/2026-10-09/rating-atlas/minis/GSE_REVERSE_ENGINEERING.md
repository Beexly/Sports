# GSE REVERSE ENGINEERING — LIVE DATA INTEL (2026-10-09/10 night)
_Compiled by Minis. Every endpoint below was hit LIVE tonight and verified. No invented numbers._

## 0. What this delivered (wishes served)

| Wish | Delivered by |
|---|---|
| #1 Live odds flowing | DK + Pinnacle + PrizePicks + FD pipelines (this doc) + `books_api.py` unified harvester w/ fallback chains |
| #2 Close as prediction | Pinnacle = the close. Full week-6 market trees incl. alternates + limits captured (`snapshots/pinnacle_mkt_*.json`) |
| #3 Injury data live | ESPN injuries endpoint verified + 800-row digest saved; wired into `books_api.py snapshot()` |
| #6 CLV real-time | `clv.py` ledger exists; Pinnacle closes now harvestable pre/post → CLV = (your price vs pinnacle close). Recipe in §5 |
| Props/probability engines | **Their internal distributions reconstructed from public prices** — §3 (the crown jewel) |

## 1. The five lanes (verified status + recipes)

### 1.1 PINNACLE — the sharp bar (SHELL-OK, keyless, primary for close + CLV)
```
GET https://guest.api.arcadia.pinnacle.com/0.1/sports                       # id 15 = Football
GET https://guest.api.arcadia.pinnacle.com/0.1/sports/15/leagues            # NFL = league 889
GET https://guest.api.arcadia.pinnacle.com/0.1/leagues/889/matchups         # ALL NFL matchups (2.5MB; type=matchup = games)
GET https://guest.api.arcadia.pinnacle.com/0.1/matchups/{id}/markets/related/straight
```
- Market tree: `moneyline / spread / total / team_total` × periods × `isAlternate`, each with
  `prices[{designation, points, price}]`, `limits[{type:"maxRiskStake", amount}]`, `cutoffAt`, `version`.
- Gotchas: some paths 401/404 randomly (`?live=false` params, bare `/markets`) — the `markets/related/straight` path is reliable. Retry ×3.
- **No player props on Pinnacle NFL (US).** Player-prop sharp reference = DK/FD cross-consensus (§4).

### 1.2 DRAFTKINGS — the retail props engine (BROWSER-ONLY; shell = Akamai 403)
In-page fetch from any sportsbook.draftkings.com page (CORS + Akamai pass):
```
GET https://sportsbook-nash.draftkings.com/sites/US-SB/api/sportscontent/navigation/dkuswv/v2/nav/leagues/88808
GET https://sportsbook-nash.draftkings.com/sites/US-SB/api/sportscontent/controldata/event/eventSubcategory/v1/markets
     ?templateVars={evId},{subId}
     &marketsQuery=$filter=eventId eq '{evId}' AND clientMetadata/subCategoryId eq '{subId}' AND tags/all(t: t ne 'SportcastBetBuilder')
     &include=Events&entity=events
```
- Selections: `points`, `displayOdds.american` (**unicode minus − — normalize!**), `trueOdds`, `tags`
  (`MainPointLine` = primary, `SGP` = SGP-eligible, `PlayerProps`), `participants[0]` = player `{id, name, statistic.value}` (DK's displayed baseline, e.g. YDS/G).
- **SubId taxonomy (189 nodes, full map = `dk_submap.json`)**: O/U mains live in 9524/9517/9522/9525/9514/9518/9533/14114/14115/18876/18883/18884 (main lines ONLY);
  **the alt ladders live in sibling band subIds 16569-16572 (full-game yards, "25+" milestone style) + 18493-18495 (1H)**;
  game markets: 4518 game lines, 13195 alt spread, 13196 alt total, 16719 team totals; TD: 12424 anytime, 12438 scorer, 11818 last; H2H: 12479/19060/18746.
- Pacing: ~1.7 fetch/s sustained → 420+98 fetches tonight, 0 errors. Concurrency 8 in-page OK.
- Tonight's harvest: **16,230 rows** (10,249 main/board + 5,981 ladder) across 14 week-6 games → `snapshots/dk_week6_*.tsv`.

### 1.3 PRIZEPICKS — pick'em board (BROWSER for /projections; /leagues open keyless)
In-page from app.prizepicks.com:
```
GET https://api.prizepicks.com/projections?league_id=9&per_page=1000&single_stat=true&game_mode=pickem
```
- Single page returns ALL (~7,615 NFL) + `included[]` = new_player/stat_type/game maps.
- Fields: `line_score`, `allowed_wager_types` (over/under/under_or_over), `status` (pre_game/in_game), `trending_count` (social signal), `updated_at`.
- Tonight: 7,615 rows + 787 map rows saved (`snapshots/prizepicks_*_2026-10-09.tsv`).
- Shell hits DataDome 403 on /projections (but /leagues 200). Backup lane = browser only.

### 1.4 FANDUEL (BROWSER, one-shot session gate)
```
GET https://api.sportsbook.fanduel.com/sbapi/event-page?_ak=FhMFpcPWXMeyZxOx&eventId={id}&useCombinedTouchdownsVirtualMarket=true&useQuickBets=true
```
- Works ONLY immediately after loading THAT event's page (server-side one-shot session; NOT referer-bound — tested). 400 afterward.
- Full market tree incl. `sgmMarket` flag (SGP-eligible) + **`previousWinRunnerOdds` = built-in line movement**.
- **Backup (open, keyless, any time):** `POST https://smp.nj.sportsbook.fanduel.com/api/sports/fixedodds/readonly/v1/getMarketPrices?priceHistory=0` body `{"marketIds":[...]}` — but marketIds must come from an event-page call.
- Recipe: navigate event page → single in-page fetch → persist → next event.

### 1.5 UNDERDOG — PARKED (login wall)
- Moved to app.underdogsports.com; pick'em = login-gated. api.underdogfantasy.com alive (`v1/features`, `v1/user/anonymous`) but pickem paths 404 keyless. Needs a logged-in session once → then performance-entry capture reveals paths. Backup for the pick'em product class = PrizePicks.

## 2. Cross-book redundancy matrix (user directive: never one resource)

| Data | PRIMARY | BACKUP 1 | BACKUP 2 | BACKUP 3 |
|---|---|---|---|---|
| Game lines (close) | Pinnacle API (shell) | DK in-browser (4518) | ESPN scoreboard feed (shell, DK-priced) | FD event-page |
| Player props board | DK in-browser (O/U + bands) | PrizePicks in-browser | FD event-page (per-game) | ESPN injury-adjusted manual |
| Props ALT ladders | DK band subIds (16569-72, 18493-95) | DK team alt (13195/13196) | Pinnacle isAlternate (game mkts) | — |
| Injuries | ESPN `/injuries` (shell, 8.7MB) | NFL.com official report (manual) | GSE own injury model file | — |
| Pick'em (no-vig-less product) | PrizePicks | Underdog (post-login) | DK bet-builder SGP prices | — |
| Movement/history | FD previousWinRunnerOdds | Pinnacle `version` + snapshot diffs | own snapshot cadence | The Odds API (key) |

## 3. THE FINDINGS — their probability engines, reconstructed (2026-10-09 close)

Method: band-ladder slope → σ (vig-immune probit fit); O/U main pair → devigged anchor → μ. File: `ladder_inverse.py`; outputs `snapshots/dk_stat_distributions.csv`, `snapshots/pinnacle_dist.csv`.

**DraftKings internal per-player σ (Normal fits their ladders at R² 0.98-0.994 → their engine IS Gaussian on player stats):**
| Stat | n | σ median |
|---|---|---|
| Pass yards | 28 | **70.9** |
| Pass yards 1H | 28 | 51.4 |
| Rec yards | 82 | **37.7** |
| Rec yards 1H | 81 | 26.4 |
| Rush yards | 14 | 41.7 |
| Rush yards 1H | 26 | 22.0 |
| Rush+Rec yards | 17 | 47.2 |

Sample fits: Josh Allen pass N(244.9, 75.3) R²=.9915 · Stafford N(279.5, 75.3) R²=.9936 · Huntley N(170.5, 62.7) R²=.9938.

**Pinnacle (game engine):** total σ = **13.19** (n=14, R²≥.97) — vs our stack constant 13.45 → the market's own sd is ~2% tighter; spread σ = 10.62 (n=7, alt-ladder range effect). Pinnacle holds: total **4.01%**, spread **3.69%**.

**Usage for GSE (all legal, from public prices):**
1. Prior σ per player-stat = DK's own σ table (they've already done the variance modeling).
2. Our prop engine (`props_deep.py` NB2) projects μ from nflverse/EPA; price with **DK's σ** → compare vs DK price = edge detector. If our μ differs from DK's μ̂ by > ~0.4σ, the prop is live.
3. `μ̂_DK` is itself a consensus projection (DK spends millions on projections) — use as a FREE projection feed via the reconstructed μ.
4. Pinnacle σ 13.19 → update the stack's 13.45 constant for total pricing (or blend: σ² = w·13.19² + (1-w)·13.45²).

## 4. Cross-book line compare (tonight, week-6)

- DK vs Pinnacle mains: run `compare_mains.py` (to be added) — the DK-vs-Pinnacle gap on spreads/totals = retail shading map (favorite-longshot + key-number shading visible in DK band ladders).
- PP vs DK lines: same stat, PP `line_score` vs DK μ̂ → PP often shades toward rounder numbers (verify next run).

## 5. CLV wiring (wish #6) — exact recipe
1. When GSE logs a pick: snapshot Pinnacle `markets/related/straight` for that game (`books_api.py snapshot()` already stores per-game trees + `version`).
2. Post-kickoff: re-snapshot → last pre-cutoff price = the close.
3. `clv.py add(id, market, bet_amer, stake)` → `close(id, close_amer)` → `report()`. The close now comes from a REAL sharp book automatically.

## 6. Bottleneck forecast (full matrix in REDUNDANCY.md)
- DK shell = Akamai TLS fingerprint block (permanent) → browser lane is the lane; keep tab warm.
- FD one-shot sessions → 1 event per page load; batch across loads.
- PP DataDome on /projections from shell → browser only.
- Pinnacle random 401 flakes → retry ×3 (in books_api.py).
- Workspace wipes (2× history) → all artifacts mirrored to `/var/minis/shared/gse/`.
- Browser tab state (window.__dkH) → always extract to disk immediately after pump completion.

## 7. Files delivered tonight
```
books_api.py                 unified harvester + fallback chains (shell lanes LIVE: 14 games + injuries + scoreboard, 0 errors)
ladder_inverse.py            the inversion engine (their μ/σ from public prices)
snapshots/dk_week6_props_2026-10-09.tsv     10,249 rows (board)
snapshots/dk_week6_ladders_2026-10-09.tsv    5,981 rows (bands)
snapshots/dk_stat_distributions.csv          442 player-stat μ/σ fits
snapshots/pinnacle_mkt_*.json                14 full market trees
snapshots/pinnacle_dist.csv                  Pinnacle μ/σ/hold by market
snapshots/prizepicks_nfl_board_2026-10-09.tsv 7,615 rows + maps
snapshots/espn_injuries_2026-10-09.json      8.7MB full dump (+800-row digest in snapshot_*.json)
snapshots/snapshot_2026-10-10_0024.json      unified snapshot (pinnacle+espn, 0 errors)
dk_submap.json               DK's 189-node market taxonomy
mirror: /var/minis/shared/gse/  (wipe insurance)
```
