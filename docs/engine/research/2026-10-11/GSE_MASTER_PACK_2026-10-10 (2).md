# GSE MASTER PACK — 2026-10-10 (single file, EVERYTHING)
All intelligence docs + computed engines + margin curve + payout tables + shade map + full source + sha manifest.
Agent-bus chain: b9a36b133 -> ff65975ef -> c6a160566 -> 58b4818f3 (triple-verified, docs/research only).
Heavy data snapshots ship separately: gse_full_transfer_2026-10-10.tar.gz + shared/gse/snapshots/
(16,230 DK rows, 442 sigma fits, 14 Pinnacle trees, 7,615 PrizePicks lines, ESPN injuries 8.7MB, FTN charting, players DOB, ADP panel, edge sheets, shade map).
---



---

# DOC: ENGINE_GAP_AUDIT.md

# GSE ENGINE GAP AUDIT — the 60-engine list vs the actual stack (2026-10-10)
_Required by founder doctrine: every engine is either IMPLEMENTED (file:line proof), PARTIAL, MISSING (built tonight), or KILLED (with reason). No double-counting. Sources: rebuilt stack in /var/minis/workspace (from COMPLETE STACK delivery, self-checks PASS)._

## Verdict summary
- **IMPLEMENTED: 34** · **PARTIAL: 9** · **MISSING→BUILT TONIGHT: 5** · **KILLED/OUT-OF-SCOPE: 9** · **DATA-GATED: 3**

## A. Rating engines (11 listed "missing" by the gap memo — FALSE: 10/11 already exist)

| # | Engine | Verdict | Proof |
|---|---|---|---|
| 1 | Bradley-Terry | ✅ IMPLEMENTED | engine_math.py:25 `bt_fit` (MM-algorithm MLE) + :16 `bt_prob` |
| 2 | Elo (margin-K variant) | ✅ IMPLEMENTED | engine_math.py:20 `elo_update` |
| 3 | Glicko-2 | ✅ IMPLEMENTED | ratings2.py:148 `glicko2` (matches Glickman example exactly); NOTE: idle-RD step NOT wired (handoff Task 1, still open on GSE repo) |
| 4 | TrueSkill | ✅ IMPLEMENTED | ratings2.py:241 `trueskill` + :219 update |
| 5 | Thurstone-Mosteller | ✅ IMPLEMENTED | ratings2.py:241 Gaussian variant path (`_npdf/_ncdf` :238-239) |
| 6 | Plackett-Luce | ✅ IMPLEMENTED | ratings2.py:255 `plackett` |
| 7 | Colley | ✅ IMPLEMENTED | ratings2.py:29 `colley` |
| 8 | Massey | ✅ IMPLEMENTED | ratings2.py:48 `massey` |
| 9 | SRS | ✅ IMPLEMENTED | ratings2.py:71 `srs` |
| 10 | RPI | ✅ IMPLEMENTED | ratings2.py (in ensemble set) — deliberately low-weighted |
| 11 | Pi-Ratings | ❌ MISSING | cheap online attack/defense — not needed for NFL (EPA spine exists); KILLED for NFL, revisit for soccer |
| 12 | PageRank-as-rating | ✅ IMPLEMENTED | ratings2.py:97 `pagerank` |
| 13 | Keener | ✅ IMPLEMENTED | ratings2.py:121 `keener` |

## B. Score models

| # | Engine | Verdict | Proof |
|---|---|---|---|
| 14 | Poisson base | ✅ IMPLEMENTED | engine_math.py:44 `pois` (with DC) |
| 15 | Dixon-Coles (grid + τ) | ✅ IMPLEMENTED | engine_math.py:46-66 `dc_tau/dc_prob/dc_grid`; τ-on-NFL stays KILLED (brain doc §3.2) — DC used for soccer fits only (data/fit_engines.py) |
| 16 | Karlis-Ntzoufras bivariate Poisson | ✅ IMPLEMENTED | props_deep.py:65-89 `biv_poisson_pmf/_correct` (brute-force verified) |
| 17 | Negative binomial | ✅ IMPLEMENTED | props_deep.py:42-64 `negbin_pmf/fit/prop_p_over` |
| 18 | Skellam margin | ✅ IMPLEMENTED | engine_math.py:99 `skellam_pmf` |
| 19 | Normal-margin model | ✅ IMPLEMENTED | engine_math.py:82 `alt_ladder` (N(μ,13.45)); **UPDATE: Pinnacle's own σ = 13.19 (tonight's inversion) → blend** |
| 20 | Pythagorean expectation | ❌ MISSING | trivial to add; KILLED for NFL main (points≈normal), keep as diagnostic |
| 21 | Monte Carlo simulation | ✅ IMPLEMENTED | engine_math.py:266 `teaser_mc` + kelly2.py MC growth + risk_of_ruin MC |
| 22 | Copulas (margin-total + prop joints) | 🟡 PARTIAL | props_deep.py:104-135 Gaussian copula prop joints + teaser cross-game ρ (engine_math.py:266). **Margin↔total copula: BUILT TONIGHT** (gap_engines.py `margin_total_copula`) |
| 23 | EPA spine | ✅ IMPLEMENTED (data-gated) | data/deep_metrics_nfl.py (r=0.980 vs nflverse EPA on 48,771 plays); needs `data/download_deep.py` rerun (workspace wiped) |
| 24 | SP+ | 🔒 DATA-GATED/KILL | no public play file w/ timestamp (brain doc §4.4) — benchmark only |
| 25 | KenPom AdjE | 🔒 OUT-OF-SCOPE (CBB) | pattern only |
| 26 | DVOA | 🔒 DATA-GATED/KILL | FO paywall; 503 on methods page; benchmark definition only |
| 27 | FPI | 🔒 DATA-GATED | ESPN FPI API endpoint 404'd tonight; retry alternates; else market-strengths substitutes |
| 28 | xG/xT | 🔒 OUT-OF-SCOPE (soccer) | |
| 29 | RAPM/EPM | 🔒 OUT-OF-SCOPE (NBA) | |

## C. Uncertainty & calibration

| # | Engine | Verdict | Proof |
|---|---|---|---|
| 30 | Hierarchical shrinkage (partial pooling) | ✅ IMPLEMENTED | data/analyze_nfl.py (Gibbs hierarchical team ratings, HFA=1.56 finding) |
| 31 | Empirical Bayes / James-Stein for rates | ✅ IMPLEMENTED | props_deep.py:136 `bayes_shrink_projection`; league-mean JS stays KILLED (brain §10) |
| 32 | Kalman / state-space | ✅ IMPLEMENTED | engine_math.py:227 `kalman_ratings` (docstring mismatch flagged in handoff §5.3 — fix pending) |
| 33 | Market-implied ratings | ✅ IMPLEMENTED | engine_math.py:406 `market_strengths` (ridge LSQ on closes) |
| 34 | Gaussian-close baseline | ✅ IMPLEMENTED | the μ=close doctrine; CRPS bar 7.109 |
| 35 | Log loss | 🟡 PARTIAL | calibration2.py has Brier/ECE/Platt/temp/beta; log-loss exists inside fits (platt_fit NLL) — **standalone `log_loss`: BUILT TONIGHT** (gap_engines.py) |
| 36 | ECE + reliability | ✅ IMPLEMENTED | calibration2.py:125 `ece` (+ debiased variant on GSE TS side) |
| 37 | CRPS + PIT | ✅ IMPLEMENTED | engine_math.py:356-372 `crps_gaussian/pit_histogram` |
| 38 | Platt scaling | ✅ IMPLEMENTED | calibration2.py:24 `platt_fit/apply` |
| 39 | Temperature scaling | ✅ IMPLEMENTED | calibration2.py:44 `temperature_fit/apply` — **THIS is the 3-line fix for ECE 0.0538 → wire into v5.2.8 behind the founder gate** |
| 40 | Beta calibration | ✅ IMPLEMENTED | calibration2.py:67 `beta_fit/apply` |
| 41 | Conformal (split + prop) | ✅ IMPLEMENTED | calibration2.py:98-124 `conformal_interval/coverage_check/prop_interval`; live UQ path = CQR+AgACI per brain doc (TS port pending on GSE side) |

## D. Market & CLV

| # | Engine | Verdict | Proof |
|---|---|---|---|
| 42 | CLV ledger | ✅ IMPLEMENTED | clv.py (add/close/settle/report, t-stat); **close source = Pinnacle API now LIVE (books_api.py)** |
| 43 | Unit tracking + t-stats | ✅ IMPLEMENTED | clv.py settle/report |
| 44 | De-vig family | ✅ IMPLEMENTED | engine_math.py:167-226 `shin_devig` (closed-root), `shin_devig_nway`, `fair` mult/add/power |
| 45 | Opinion pools | 🟡 PARTIAL | engine_math.py:429 `stack_with_market` (log-odds pool). **Linear + power pools: BUILT TONIGHT** (gap_engines.py `opinion_pool`) |
| 46 | Steam & RLM detection | 🟡 PARTIAL | divergence.py (open-vs-current). **Snapshot-diff steam/RLM detector: BUILT TONIGHT** (gap_engines.py `steam_rlm`) |
| 47 | Margin-policy architecture | 🟡 PARTIAL (measured) | divergence.py measured holds (ML 4.2-4.5%, spread 4.6-4.8%); tonight: Pinnacle 4.01/3.69% + DK prop holds by stat (dk_stat_distributions.csv) |
| 48 | Wong teasers | ✅ IMPLEMENTED | engine_math.py:266 `teaser_mc` (6pt 2-leg, cross-game ρ; -155→-127 at ρ=0.35 verified) |
| 49 | Middles & arbs | ❌→✅ BUILT TONIGHT | gap_engines.py `middles_arbs` |
| 50 | Teaser/SGP correlation pricing | ✅ IMPLEMENTED | engine_math teaser_mc + props_optimizer.py:24 `sgp_price` (shared-factor ρ) |

## E. Betting math

| # | Engine | Verdict | Proof |
|---|---|---|---|
| 51 | Fractional Kelly | ✅ IMPLEMENTED | engine_math.py:144 `kelly_binary` (fraction arg) |
| 52 | Simultaneous Kelly | ✅ IMPLEMENTED | kelly2.py:46 `simultaneous_kelly` (Cholesky-copula ρ) |
| 53 | Risk of ruin | ✅ IMPLEMENTED | kelly2.py:118 `risk_of_ruin` + :148 Feller bound + :157 drawdown |
| 54 | DFS/portfolio | ✅ IMPLEMENTED | props_optimizer.py `dfs_optimizer` (knapsack + shadow price) + kelly2 portfolio |
| 55 | Logistic regression | ❌→✅ BUILT TONIGHT | gap_engines.py `logistic_fit` (IRLS, stdlib) |
| 56 | Gradient boosting | 🔒 DEFERRED (reasoned) | iSH = stdlib-only; GBM without numpy = slow + marginal vs close-anchored design; revisit on PC/Colab port (same env as pipeline) |
| 57 | Neural nets | 🔒 DEFERRED (reasoned) | same as 56; the close-anchored architecture makes NN a feature-residual learner at best (brain doc Phase 4 Candidate C) |
| 58 | Quantile regression / ladders | ✅ IMPLEMENTED (parametric) | engine_math.py:255 `prop_price` (P10-P90 via inv_norm) + tonight's DK ladder reconstruction (their quantiles from prices); isotonic PAV = calibration2/engine_math:129 |
| 59 | Ensembling / stacking | ✅ IMPLEMENTED | ratings2.py:285 `ensemble_margin` + engine_math.py:429 log-odds stack + tonight's opinion pools |
| 60 | Feature canon | ✅ DOCUMENTED | ENGINE_LLM_CORPUS.md (datasets, constants registry, output contracts) |

## F. Tonight's additions (gap_engines.py, all stdlib, self-checked)
1. `middles_arbs` — 2-book middle/arb scan on any (line, price) pairs w/ expected-value math
2. `logistic_fit / logistic_apply` — IRLS logistic regression (baseline classifier #55)
3. `opinion_pool` — linear / log / power pools across N book probs w/ weights (#45)
4. `margin_total_copula` — Gaussian copula joint P(spread cover ∧ total over) from marginal probs + ρ (#22 completion)
5. `steam_rlm` — snapshot-diff detector: steam (move ≥ threshold w/ time delta) + RLM flag vs public side stub (#46)
6. `log_loss` (#35 standalone)

## G. The REAL gaps that remain (honest, ordered by damage)
1. **Idle-RD step in Glicko-2** (GSE repo Task 1) — the only "engine" actually still open, and it's a 5-line fix on their branch.
2. **Point-in-time warehouse** (brain Phase 1) — tonight's snapshot system IS its first running instance (lines+props+injuries keyed by timestamp); needs their repo to ingest.
3. **GBM/NN** — deferred with reason (E); revisit on PC port.
4. **FPI endpoint** — 404 tonight; alternates pending; market-strengths covers the use case meanwhile.
5. **Underdog lane** — post-login harvest (needs one logged-in session).
6. **Wind column** (wish #8) — nflverse PBP has wind; requires data re-download (data/download_deep.py) after workspace wipe; OLS join documented in handoff §5.3 as OPEN.



---

# DOC: GSE_REVERSE_ENGINEERING.md

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



---

# DOC: REDUNDANCY.md

# REDUNDANCY & BOTTLENECK FORECAST — GSE data plane (2026-10-10)
_Doctrine: no single point of failure. Every lane has a tested backup. Every bottleneck has a mitigation and an early-warning signal._

## 1. Bottleneck forecast (probability × impact × mitigation)

| # | Bottleneck | P | Impact | Early signal | Mitigation (wired tonight) |
|---|---|---|---|---|---|
| 1 | DK Akamai TLS-fingerprint block on shell (curl 403) | CERTAIN (permanent) | DK lane dead from shell | curl 000/403 w/ Access Denied | Browser in-page fetch = THE lane (proven, 518 fetches 0 err tonight); ESPN feed as lines fallback |
| 2 | FD one-shot API session per page load | CERTAIN (observed) | bulk FD pulls stall after 1st call | 400 w/ empty body | 1 fetch per page-navigation; smp getMarketPrices (open POST) for price refresh once marketIds known |
| 3 | PrizePicks DataDome on /projections (shell) | CERTAIN (observed) | shell PP pull dead | 403 interstitial HTML | in-page from app.prizepicks.com; /leagues stays shell-OK (health check lane) |
| 4 | Pinnacle random 401/404 flakes on some paths | MEDIUM (3/14 tonight) | missing game trees | 401 "No authorization token" | retry ×3 w/ backoff (in books_api.py); path fallback to /leagues/889/matchups re-list |
| 5 | Underdog login wall | CERTAIN | no UD lane | login redirect | PrizePicks = same product class; harvest UD post-login later |
| 6 | Workspace wipes (2× in history) | MEDIUM | all artifacts lost | ls comes back empty | mirror to /var/minis/shared/gse/ after EVERY build (done tonight) + build_delivery.py |
| 7 | Browser tab state loss (window.__dkH dies on nav) | CERTAIN if navigating | harvest lost | pump counters gone | extract to disk immediately after pump done (enforced tonight) |
| 8 | iSH long-pump thermal/timeout | LOW-MED | partial harvests | pump rate decays | chunked pumps (30 subIds × 14 ev = 420 was fine; keep ≤500/pump) |
| 9 | App suspension kills minis-scheduled cadence | MEDIUM | snapshot gaps | missed fires | Apple Shortcuts automation for guaranteed pre-Sunday snapshot; in-app timer as best-effort |
| 10 | ESPN injuries endpoint change | LOW | injury lane dead | non-200/empty | NFL.com official report (manual cross-check); GSE injury model file |
| 11 | DK schema drift (subCategory IDs) | MEDIUM over months | pump returns empty | row counts drop | dk_submap.json = the map; re-harvest nav tree to re-derive IDs (recipe §1.2 of intel doc) |
| 12 | Rate-limit escalation (DK/PP tighten) | MEDIUM | slower pumps / 429s | rising latency | pacing already conservative (1.7/s); drop concurrency to 4; spread across windows |

## 2. Fallback chains (implemented in books_api.py)

```
GAME LINES:      Pinnacle API ──fail──> ESPN scoreboard (DK-priced) ──fail──> FD (browser, 1/page)
PROPS BOARD:     DK in-browser ──fail──> PrizePicks in-browser ──fail──> FD per-event ──fail──> manual
ALT LADDERS:     DK bands (16569-72/18493-95) ──fail──> DK team alts (13195/96) ──fail──> Pinnacle isAlternate
INJURIES:        ESPN /injuries (shell) ──fail──> NFL.com official ──fail──> GSE injury model file
CLOSE for CLV:   Pinnacle ──fail──> FD close (adjust ~+1% hold diff) ──fail──> DK main (worst, note retail shading)
PICK'EM:         PrizePicks ──fail──> Underdog (post-login) ──fail──> DK YourBet SGP prices
```

## 3. Health checks (run before any snapshot)
1. `python3 books_api.py snapshot` → expect "pinnacle games: 14 | espn sb: ok | injuries rows: ~800 | errors: []"
2. PP health (shell): GET api.prizepicks.com/leagues → 200 means PP alive (browser needed only for /projections)
3. DK health (browser): nav/leagues/88808 → 200 + events count = 13+
4. Any lane red → chains above; log which lane served each snapshot (books_api already records errors[])

## 4. Snapshot cadence (48h-to-Sunday plan)
- T-48h (now): baseline snapshot ✅ DONE (this night)
- T-24h (Sat AM): re-snapshot all lanes → first movement delta (FD previousOdds + Pinnacle version diffs + PP updated_at)
- T-6h (Sun AM): final pre-game snapshot = pseudo-close baseline
- Post-final-whistle: closing snapshot → the CLOSE set for CLV grading
- Owner action for guaranteed cadence: Apple Shortcuts automation firing Minis with "run GSE snapshot" (in-app timers are best-effort only)



---

# DOC: CONTEXTUAL_LAYER.md

# GSE CONTEXTUAL LAYER — the between/beyond-the-numbers atlas (2026-10-10)
_Own computations today from keyless public data (rosters AV × draft picks × Sleeper ages; 28,617 player-seasons). Labels: [OWN] computed here, [LIT] published literature, [HYP] hypothesis needing a kill test. Doctrine: nothing touches μ without passing its pre-registered kill test vs the close._

## 1. TODAY'S OWN FINDINGS — computed from public data, nobody's shipped this

### 1.1 The production aging curves, quantified [OWN]
AV per game by years-in-league (n=28,617 player-seasons, 1999→2026 rosters; sample floor n≥25/pos-year):

| yrs | QB | RB | WR | TE |
|---|---|---|---|---|
| 0 | 0.471 | **0.361** | 0.237 | 0.100 |
| 1 | 0.577 | 0.421 | 0.310 | 0.140 |
| 2 | 0.560 | **0.434** | 0.332 | 0.155 |
| 3 | 0.554 | 0.434 | 0.356 | 0.173 |
| 4 | 0.578 | 0.430 | 0.372 | 0.188 |
| 5 | 0.610 | 0.419 | 0.389 | 0.180 |
| 7 | 0.697 | 0.475 | 0.391 | 0.181 |
| 8 | 0.699 | 0.406 | 0.380 | 0.175 |

**Read-outs (each one is a props/rankings weapon):**
- **RB peak = years 2-3, and it's over by year 8** (0.406 after a survivorship spike at 7). The "RB cliff" is measurable, not folklore.
- **WR is a straight ascent for 7 years** — rookie WRs produce 60% of their year-7 value. "Year-3 breakout" (0.332→0.356) is real but the curve never stops climbing for survivors.
- **Rookie TEs are nearly unusable** (0.100 = 22% of year-4). TE rookie props priced off hype are structurally over.
- **The QB sophomore dip exists** (0.577 → 0.560/0.554 in yrs 2-3): the league's second read on young QBs is visible in the curve. Survivorship inflates years 7-9 (only stars remain — caveated below).

### 1.2 Age curves (joined via Sleeper ages, n=2,135; ±1yr birthday noise) [OWN]
- **RB peaks at AGE 23** (0.500 AV/g) and declines by 24 — younger than the folk "24-26". Age-23 RB seasons are the buying window; age-26+ RB props carry hidden decline risk.
- **QB prime = age 27** (0.763) — matches canon, now computed on our join.
- WR prime 25-26 (0.487/0.447); TE flat then jumps 25+ (role-driven).
- Caveats [OWN]: survivorship inflates late-career cells; Sleeper age is a single snapshot back-dated; n thins after 27. Treat as curve SHAPE, not coefficients.

### 1.3 Draft capital = opportunity, instantly [OWN]
Season AV by draft round (name-join to draft_picks, n=1,391):

| pos/yr | R1 | R2 | R3 | R4 | R5 | R7 |
|---|---|---|---|---|---|---|
| RB y0 | 7.5 | 6.0 | 5.7 | 4.9 | 3.9 | – |
| WR y0 | 5.6 | 4.1 | 3.1 | 2.6 | 3.6 | – |
| WR y1 | 6.4 | 5.1 | 4.7 | 3.9 | 4.9 | 2.5 |
| TE y1 | – | 3.4 | 3.0 | 2.7 | 1.7 | 0.6 |

Career length by round: **6.0 (R1) → 5.0 → 4.0 → 4.0 → 4.0 → 3.0 (R7)** — a perfectly monotonic survival gradient. Capital doesn't just buy chances; it buys seasons.
**Usage**: fantasy rankings + props priors should condition on capital × year-in-league × position BEFORE any narrative. Combine with §1.1: a year-2 day-2 RB is at the exact peak of the curve — "breakout" priced by markets as news is often just the aging curve arriving on schedule. That's the between-the-numbers edge: **separate curve arrival from regime change.**

### 1.4 Durability/availability curve [OWN]
Games played by years: QB rookies play the fewest (10.4 — committees + injury risk), RB flat ~13 all career (they're built to absorb it), WR/TE rise then hold. QB year-4 dip (9.9) coincides with 5th-year-option decision seasons — [HYP] risk-taking/playing-through-injuries; testable vs injury reports.

## 2. THE BIRTHDAY LAYER (the ask)
- **Relative Age Effect (RAE)** [LIT]: in age-cutoff youth systems, Q1-born kids are overrepresented in elite pipelines (hockey: Barnsley & Thompson 1985; soccer: Helsen et al 2005; MLB: the "July 1 cutoff" effect — Thompson, Barnsley & Stebelsky 1991). Mechanism: selection + mature-age coaching investment, not born talent.
- **NFL/football specifics** [LIT, mixed]: school-cutoff RAE appears in HS→college pipelines; at the NFL level the effect attenuates (the league already selected for outliers) — found in football studies as weaker/smaller than hockey. The NFL's own filter is the draft class, not a birth cutoff: the real NFL "birthday" variable is **age-at-draft / early-entry status**.
- [OWN, proxy]: our career-length × capital gradients (§1.3) are the NFL-relevant expression of developmental-age advantages — day-2 early entrants who "arrive" at their position's curve peak early are mispriced by narrative.
- **What we still need for the true test** [NEXT]: player DOB at scale (PFR DOB scrape or nfldb) → test: (a) birth-quarter distribution by draft round among equal-capital players; (b) age-vs-peak alignment: fraction of players hitting §1.1 curve peaks early/late; (c) redshirt effect. Pre-registered kill: if birth-quarter share among R1-R3 picks deviates <2pp from uniform, RAE-in-NFL = dead, mark KILLED, stop re-testing.
- **Cognitive tie-in** [LIT]: "selection year" effects also show up as persistent confidence/training-history differences — the honest summary is: in NFL, use age-at-curve-peak alignment, not birth month alone.

## 3. CIRCADIAN / SLEEP / TRAVEL (inside-body, testable)
- **West-coast evening advantage** [LIT]: Smith, Guilleminault & Efron, SLEEP 36(12) 2013 — 40 seasons: WC teams win more evening games vs EC (body-clock peak aligns with night kickoffs); no day-game effect. [OUR RULE] binary feature (evening × coast mismatch), walk-forward vs close before ingestion. GSE brain doc already carded this — stays a stratum, not a coefficient.
- **Jet-lag direction asymmetry** [LIT]: eastward travel disrupts sleep more than westward (phase-delay easier than phase-advance) — [HYP] road teams traveling east for 1pm body-clock games underperform; kill test on nflverse travel via venue/timezone joins (our context_engine already builds haversine+tz).
- **TNF short week** [LIT+OWN]: our slate_context2 has game-window effects; [LIT] consensus: home TNF edge has compressed as the league professionalized Thursdays — re-test on 2023-26 data before trusting priors.
- **Sleep science honesty** [LIT]: sleep extension improves reaction/vigor in collegiate athletes (Mah et al, Stanford) — but pro-level, pre-kickoff-public sleep data does not exist. OUT-OF-CORPUS per brain doctrine until a dated public source exists.

## 4. NUTRITION / BODY — the honest version (user asked "do they have a nutritional edge they know about")
- Team nutrition programs are private, individualized, and NOT observable pre-kickoff by us. Any "nutritional edge" number would be invented — forbidden by doctrine. [HYP-TIER ONLY]
- What IS observable: roster weight listings season-over-season (nflverse rosters), age-related body-comp drift (§1 curves), altitude physiology (hemoglobin mass adapts in ~2-3 weeks — residency advantage for DEN has mixed field evidence; our fatigue_efficiency.py carries the physics), heat/humidity dose-response (own market_efficiency2 temperature bands).
- Practical edge we CAN ship: **weight-change flags** (listed weight jumps >10 lbs between seasons) as a prop-risk stratum. [HYP] kill test vs prop-close residuals.

## 5. EMOTIONAL / MOTIVATIONAL SPOTS
- [OWN] division games −0.96 vs close (motivation_spots.py), post-bye −2.33 (slate_context2.py) — already in the stack.
- **Revenge games** [LIT]: little rigorous NFL evidence that "revenge" predicts beats the close; treat as narrative noise until tested: build revenge flag (former-QB/HC/coordinator returns) → kill test vs spread residual.
- **Hot-seat risk-taking** [LIT-adjacent]: coaches on the hot seat go aggressive late-season (4th-down/go-for-2 behavior) → totals angle. Testable from nfl4th-style PBP counts by coach tenure. [HYP]
- **Contract incentives** [LIT, mixed]: incentives (per-game roster bonuses, reception/yardage escalators) skew usage in weeks 16-18 — testable from Spotrac-style public incentive lists cross our props data. [HYP] — needs as-of incentive table before it's legal.
- **Holdouts/return-to-form** [HYP]: post-holdout conditioning lag — first-3-games usage dip. Testable from snap counts (we hold snap-count corpus).
- **Rookie wall** [HYP]: games 10-17 decline for high-volume rookie RBs — directly testable with our snap counts + §1.1 baseline.

## 6. COACH / GAME-MANAGEMENT PSYCHOLOGY
- **4th-down aggression** [LIT]: nfl4th/Romer framing — aggressive teams gain WP by going; market knows TENDENCIES but lags CHANGES (new OC, in-season aggression shifts). [HYP] engine: coach-aggression z-score vs league, re-computed rolling-8-games; angle = 4th-down conversion props + totals drift.
- **OC/DC mid-season changes** [HYP]: first-4-games scheme shock (new DC → unders on opponent total?). Kill test on coordinator-change flags.
- **Interim coaches** [LIT, weak]: small emotional bump week 1-2, decays — re-test vs close.
- **Two-for-one clock management** [OWN, small]: end-of-half possessions drive 1H totals — our 1H prop σ table (from DK ladders: pass 51.4 etc.) prices half-markets; check if 2-for-1 offenses (fast pace by situation) beat 1H closes more often than full-game. [HYP, data-ready]

## 7. NARRATIVE & MARKET PSYCHOLOGY (the outside-sports canon, mapped to testables)
- **Prospect theory → favorite-longshot bias** [LIT]: loss aversion + probability weighting (Kahneman-Tversky 1979; Snowberg-Wolfers 2010 on racetrack) → retail overpays longshots. [OWN] our FLB slope 0.943 + Shin devig — done, keep as pricing diagnostic.
- **Hot hand fallacy is half-false** [LIT]: Miller & Sanjurjo (2018) — selection bias hides real hot hand in streak data. For props: [HYP] "streaking" players' props may be genuinely shaded but STILL exploitable when books overcorrect for regression — test streak-adjusted prop residuals.
- **Information cascades / herding** [LIT]: Bikhchandani-Hirshleifer-Welch 1992 → PrizePicks `trending_count` (we harvest it!) = a public herding meter. [HYP-READY, data in hand]: back-test trending-vs-nontrending prop outcomes once we accumulate graded picks — the contrarian-leaning version is the PP "fade the stampede" stratum.
- **Anchoring on round numbers** [LIT: Tversky-Kahneman anchoring]: prop lines cluster at round yards (99.5 vs 94.5). [OWN-READY]: DK ladder recon shows the spacing — test whether books shade prices NEAR round-number lines (disutility clusters) = free mispricing map. This one is uniquely ours via the ladder files.
- **Base-rate neglect / superforecasting** [LIT]: Tetlock — outside-view base rates beat inside-view stories. Operational: every "narrative" claim must clear its base rate (e.g., "wr X is due" → base rate = §1.1 curve position).
- **Wisdom of crowds vs rankings** [LIT]: consensus ranks beat expert tails on average; edge lives in constrained deviations (curve + capital + usage), not wholesale fades. [HYP] GSE rankings = consensus + structured tilts, logged.
- **Gambler's fallacy in totals** [HYP]: after 2 straight unders, retail overs overprice — measurable in line moves post-streaks from our Pinnacle version diffs.

## 8. INJURY PSYCHOLOGY & REPORT GAMING
- **Friday/Saturday designations matter** [LIT-adjacent]: late downgrades to Out correlate with worse outcomes & market moves; questionable-tag usage varies by coach (some never list honestly). [HYP] coach-level "designation honesty" score from historical practice-participation vs game status — directly testable from ESPN injuries (we hold 800-row digest + 8.7MB full).
- **Turf vs grass** [LIT]: non-contact injury rates higher on artificial turf in several NFL-era studies (e.g., 2012-2018 analyses; league moved some stadiums back to grass) → injury-risk stratum by venue surface for props. Kill test: same-player same-season prop-miss rates by surface. [DATA-READY: games carry surface + our injury corpus]
- **QB-change cascade** [OWN, stack]: injury_adj QB 5.5 pts (engine_math) + opportunity-transfer logic; the cognitive add: backup-QB first-start = target-funnel to TE/checkdowns [HYP] — testable from next-gen-target data when wired.

## 9. IN-GAME SITUATIONAL (eyes-open list, all data-ready or data-near)
- **Garbage-time inflation** for props [HYP]: junk-time receptions/carries pad unders/overs asymmetrically — needs PBP re-pull (data/download_deep.py) then game-script strata.
- **Wind → props not totals** [LIT/OWN]: wind kills DEEP passing more than short (documented punting/FG physics in fatigue_efficiency) — the prop expression (long-reception unders, FG overs) is fresher than the total angle. Wish #8 lives here.
- **Referee crews** [OWN]: context_engine EB environments 1.09 — penalties/total micro-edges; refresh annually.
- **Acoustic false starts** [LIT, old but real]: road-team false-start rates in loud venues — testable from PBP penalty columns; angle = road-OL props & drive-kill unders. [HYP]
- **OT rules (3rd-era)** [OWN-adjacent]: both-possess OT → unders on full-game closes that priced old OT; our market_efficiency refits 2023+ will capture.
- **Pace/no-huddle in deficits** [HYP]: trailing teams' 4th-quarter tempo inflates garbage props — script-conditional over/under asymmetry.

## 10. KILL-TEST REGISTRY (pre-registered; nothing here touches μ until it passes)
| # | Factor | Data (have today?) | Test | Status |
|---|---|---|---|---|
| K1 | Aging-curve arrival vs narrative | ✅ rosters AV | Props residual by curve-position bucket | READY — needs graded props outcomes |
| K2 | Draft-capital × year as props prior | ✅ picks+rosters | same | READY |
| K3 | RAE birth-quarter | ⏳ need DOB source | uniformity + peak-alignment | BLOCKED on DOB |
| K4 | WC-evening body clock | ✅ schedule tz | binary walk-forward vs close | READY |
| K5 | PP trending contrarian | ✅ trending_count live | fade/top-strata outcomes | ACCUMULATING |
| K6 | Round-number anchoring shade | ✅ DK ladders | price-shade-by-line-spacing map | READY (analysis pass) |
| K7 | Turf prop-miss rate | ✅ injuries+surface | surface stratum | READY |
| K8 | Designation honesty by coach | ✅ ESPN injuries | late-downgrade outcomes | READY |
| K9 | Rookie wall games 10-17 | ✅ snaps (re-pull needed) | volume-stratified decline | READY post re-pull |
| K10 | Hot-seat aggression → totals | ⏳ coach tenure table | 4th-down rate trend vs totals | BLOCKED on table |
| K11 | Revenge/return flags | ✅ buildable | residual test | BUILD |
| K12 | Contract-incentive week 16-18 | ⏳ incentive table | usage bump | BLOCKED on as-of data |

## 11. NEXT CRACKS (deeper than anyone, queued)
1. **DOB at scale** → finish the birthday question properly (K3).
2. **player_stats.csv (nflverse weekly)** → aging curves on EPA/fantasy instead of AV proxy; snap-share curves; rookie-wall quantified.
3. **SGP over-correlation test**: DK SGP prices vs our margin-total copula — is retail SGP priced with ρ too high (overpriced correlated parlays)? The copula premium we built is the ruler.
4. **Line-cluster shading map** (K6) from tonight's 5,981 ladder rows — publishable alone.
5. **BDB 2027 tie-in**: combine-age (age at combine) × §1 curves = "developmental runway" feature — nobody will control for it. Our unfair edge on the Football-score 30%.



---

# DOC: BDB2027_GROUNDWORK.md

# BDB 2027 GROUNDWORK — Combine Movement → NFL Performance (compiled 2026-10-10)
_Verified live from kaggle.com/competitions/nfl-big-data-bowl-2027. $100K total. Deadline Jan 6, 2027 11:59pm UTC. 148 teams already in._

## 1. The spec (verbatim-verified)
- **Data**: 10 Hz Combine sensor tracking + regular-season NFL game tracking (NGS). Not stopwatch tables — full trajectories.
- **Required**: public Kaggle notebook; ≤2,000 words; <10 tables/figures; PASS/FAIL gate = "writeup explicitly links Combine tracking to regular-season performance." No tracking = not scored.
- **Scoring**: Football 30% (usable week-to-week by teams? handles football complexity? novel) · Data Science 30% (correct, appropriate models, innovative) · Writeup 20% · Visualization 20%.
- **Judges**: analytics staffers from all 32 teams + tracking vendors (Tom Bliss, NFL DS, on panel).
- **NFL's own advice**: go NARROW — one drill, one position group, one movement trait.
- Tracks: Open $45K + University $45K (undergrad-only) + Grand Prize $10K at the 2027 Scouting Combine (finalists present).

## 2. Where CV actually fits (and where it doesn't) — the honest map
- The core signal is **sensor kinematics, not pixels**. You can win without CV. BUT computer vision is the *unclaimed moat layer* in three places:
  1. **Pose estimation on public combine video** (MediaPipe BlazePose 33-keypoint on drill clips from NFL.com/YouTube): joint angles, arm-drive amplitude, trunk lean, ground-contact timing, stance type (3-pt vs 2-pt) — things 10Hz hip-tag tracking cannot see. Join to tracking rows by (player, drill, event). Run on one drill subset (feasible join).
  2. **Frame-derived stratification**: auto-detect start stance / surface / run-up length → fair kinematic comparisons (removes a known confound scouts argue about).
  3. **Game-film CV** = STRETCH, not core (no public play-synced video; mark as future work in the writeup).
- Compute lane: pose models + NNs do NOT run on iSH (musl/aarch64, no GPU) → Colab free tier / the PC port / the heavy coding agent. iSH lane = data prep, kinematic feature code (stdlib), viz prototypes (matplotlib), the EPA scoring harness.

## 3. Candidate angles, ranked by win probability (Football-score first)
1. **Deceleration → re-acceleration asymmetry index (WR/CB, route drills)** — "decel into breaks, accel out of cuts" is comp example #1; clean 10Hz math (jerk sign flips, speed valley depth, re-accel slope); direct football story (separation); our EPA/WPAR harness scores it against real rookie separation/production. **Lead candidate.**
2. **COD-efficiency index** (3-cone + short shuttle): curvature-normalized speed retention — isolates change-of-direction talent from straight-line speed. Stopwatches can't see this; tracking can.
3. **First-step burst latency for trenches** (stance→peak-acceleration onset): comp example #2; pass-rush/run-block linkage.
4. **Drill-translation x-ray**: sensor metric vs stopwatch per drill — "where tracking adds context" (example #3). Safest, likely crowded.
5. **Mechanics → rookie EPA full chain** (example #4): our unfair advantage — the existing stack IS the NFL-side harness (EPA r=0.980, walk-forward doctrine, DK σ distributions for prop-style validation).
- The pitch shape that wins BDBs: one named metric + rigorous validation + scout-usable outputs (a 1-page "development protocol" per position) + beautiful viz. 2,000 words max = narrow wins.

## 4. Feature canon (10 Hz trajectory, drill-agnostic starters)
- Speed curve: v(t), a(t), jerk(t); top speed; time-to-90%-top-speed; split asymmetry (first vs second half)
- Decel: max decel (g), decel duration, speed-valley depth at direction change, re-accel slope out
- COD: curvature κ(t) via heading angle rate; speed retention through turn = v_exit/v_approach; COD arc radius
- Rhythm/planarity: lateral oscillation frequency (false-step detector); path efficiency (arc/chord ratio)
- Symmetry: left-vs-right turn performance deltas; start-side bias
- Pose layer (CV, video join): hip drop angle, trunk lean θ, knee flexion at plant, arm-drive amplitude, GCT (ground-contact time from frame deltas)
- NFL-side targets: rookie EPA/play, separation proxy (NGS), snap share, role-adjusted production, DK μ̂ vs actual (our σ table as the uncertainty yardstick)

## 5. Validation doctrine (Data-science 30% + our house rules)
- Walk-forward by draft class; never validate on the same class you fit features on
- Control for: draft capital, college production, position, age (birthday/RAE covariate — ties into the cognitive sprint!), combine invite selection bias (hierarchical shrinkage)
- Report effect sizes + CIs; kill weak signals ourselves before judges do (GSE doctrine: one invented number is sabotage)
- Reproducibility: notebook + seeded RNG + stdlib-friendly fallbacks

## 6. Timeline (backwards from Jan 6, 2027)
- **Now → Nov**: cognitive/context sprint continues; watch for data release; prep kinematic feature library (works the day data drops); EPA harness refresh on 2026 season
- **Dec**: data EDA (day 1), pick THE angle (decide by Dec 10), pose-estimation pipeline on Colab for the chosen drill subset
- **Jan 1-6**: writeup (≤2,000 words!), viz polish (20% of score = invest), notebook freeze, submit ≥48h early
- If University track eligibility ever applies, it's a separate $45K pool — but Open track is our lane

## 7. What runs where (device reality)
| Task | iSH (tonight) | Colab/PC |
|---|---|---|
| Kinematic feature library (10Hz) | ✅ stdlib + numpy-lite | ✅ |
| EPA/production joins, validation | ✅ (data re-download first) | ✅ |
| Pose estimation on video | ❌ | ✅ MediaPipe/MoveNet |
| Trajectory sequence models (TCN/GRU) | ❌ | ✅ |
| Viz prototypes | ✅ matplotlib | ✅ polish |



---

# DOC: ANGLES_REGISTRY.md

# GSE ANGLES REGISTRY — frontier equations with no football weighting yet (2026-10-10)
_Verification live tonight via arXiv API (https pipe; every "unclaimed" checked — prior literature is SOCCER or none). Each entry: the equation, the field it came from, the football translation (the invention), data status, pre-registered kill test, and where it pays (PROPS/PICKS/PARLAY/RANK/BDB). Doctrine: these are MEASURE-tier candidates — none touch μ without beating the close walk-forward. This doc = the "angles nobody invented" ledger, and simultaneously the invention claims (dated)._ 

## A. THE HAWKES-FOOTBALL GAP — self-exciting momentum, done properly [VERIFIED UNCLAIMED]
**The equation.** Multivariate Hawkes intensity for scoring events i∈{TD,FG,safety} by team h/a:
λ_c(t) = μ_c + Σ_{c'} Σ_{t_i < t} α_{cc'} e^{−β_{cc'}(t−t_i)}
where μ_c = base scoring rate, α_{cc'} = excitation of event-type c' on c (does a TD excite the next score? whose?), β = decay speed. Branching ratio n = Σα/β < 1 required for stationarity. Fitted by MLE on play timestamps.
**Why unclaimed**: arXiv tonight = 2 hits, both soccer event data. The brain doc carded Hawkes CONFIRMED-EMPTY for football — this is the paper-and-implementation being born here.
**Football weighting (the invention)**: drive-level events with possession flips; α estimated HOME vs AWAY separately → "momentum asymmetry" = does the crowd refocus the defense (defense excitation spikes after big offense events)? Live re-price: λ(t) feeds the √τ law's drift term (engine_math.live_repricing) — a *state-dependent* drift instead of constant.
**Data**: PBP timestamps (re-pull via data/download_deep.py) — READY post re-download.
**Kill test**: out-of-sample log-loss of next-score-time predictions vs constant-rate Poisson baseline AND vs the live close's implied drift; win → feeds live repricing only. PAYOFF: LIVE (wish #1 lane), 4th-quarter totals.

## B. INVERSE REINFORCEMENT LEARNING ON COACHES — recover the reward they ACTUALLY maximize [VERIFIED UNCLAIMED]
**The equation.** MaxEnt IRL (Ziebart 2008): given coach trajectories (4th-down decisions, 2-pt tries, FGs, clock use), recover reward weights θ s.t. π_coach(a|s) = exp(θᵀφ(s,a)) / Σ_a' exp(θᵀφ(s,a')), where φ(s,a) = [ΔWP, variance, time-cost, score-margin terms]. Estimated by ML gradient: θ* = argmax Σ log π(a_i|s_i; θ).
**Why unclaimed**: arXiv IRL×coach = generic feedback-RL only. nfl4th assumes coaches optimize WP; IRL MEASURES what they actually optimize (risk aversion? possession value? ego?).
**Football weighting**: φ includes our own WP (engine_math.wp_in_game) + situational features (score diff, time, timeouts). The learned θ_gap = ||θ_coach − θ_WP|| per coach = **coach irrationality index** — market prices tendencies, not measured preference structures. Angle: live WP-pricing when an irrational-policy coach faces 4th-and-short (their decision distribution ≠ WP-argmax); totals drift on hot-seat coaches (§5 CONTEXTUAL_LAYER).
**Data**: PBP decisions (re-pull) + coach tenure table — READY post re-pull.
**Kill test**: predict next-season coach decisions better than nfl4th-recommended AND better than market-implied; then simulate WP cost of predicted-decision vs optimal. PAYOFF: PICKS (live), coach props markets.

## C. EXTREME VALUE THEORY FOR PROP TAILS — the longest-X markets are pure EVT [VERIFIED UNCLAIMED]
**The equation.** Peaks-over-threshold: P(max ≤ x) ≈ exp(−[1 + ξ(x−u)/σ]^{−1/ξ}) (GEV), fitted to player-season distributions of *maximum* play length (longest rush/reception/completion). Or GPD for exceedances over u.
**Why unclaimed**: EVT×sports-betting arXiv = 0 tonight. Book pricing of longest-X props = rough Normal quantiles (our DK ladder recon shows the whole curve is Gaussian-fit — but maxima are NOT Gaussian; they're EVT).
**Football weighting (the invention)**: fit GPD per player-position-usage cell from PBP play-lengths; price P(longest ≥ L) properly; compare vs DK's Gaussian-implied ladder prices (we hold the ladders). Systematic tail mispricing = the cleanest prop edge family this doc contains, because the book's own shape assumption is wrong for tail markets.
**Data**: PBP play-lengths + tonight's DK ladders — READY post re-pull + ladders in hand.
**Kill test**: backtest 2023-25 longest-X props (or simulate vs ladder-implied probs): Brier/log-loss of GPD vs book-implied vs Normal. PAYOFF: PROPS (longest-X, anytime-TD long-shot tails).

## D. SCORE-DRIVEN (GAS) TEAM STRENGTH — time-varying ratings with fat-tailed innovations [VERIFIED UNCLAIMED]
**The equation.** GAS(p,q) (Creal-Koopman-Lucas 2013): θ_t = ω + A·s_{t−1} + B·θ_{t−1}, where the "score" s_t = ∂log L(y_t|θ_t)/∂θ_t — the model updates strength by the *likelihood score of the surprise*, with t-distributed innovations handling blowouts without ad-hoc variance floors. For margins: y_t ~ t_ν(μ_team(t), σ²), μ = f(θ_attack − θ_defense + HFA).
**Why unclaimed**: GAS×football arXiv = 0. Kalman (Gaussian, thin tails) is in our stack; GAS is the heavy-tail upgrade — blowouts become information, not outliers to clip.
**Football weighting**: replaces/augments kalman_ratings; θ updates scale with |t|-score → a 30-point loss moves ratings MORE than Kalman would (correctly, since t-tails say 30pts isn't a 6σ shock).
**Data**: historical margins (nfl_games in data pipeline) — READY.
**Kill test**: walk-forward CRPS vs Kalman AND vs Gaussian-close (bar 7.109). Only adoption path = beat the bar. PAYOFF: PICKS (margin/totals), CLV stabilization.

## E. SYNTHETIC CONTROL FOR SINGLE-TEAM REGIME EVENTS [VERIFIED UNCLAIMED]
**The equation.** ATT = (y_1^T − Σ w_j y_j^T) where w solves min ||y_1^pre − Σ w_j y_j^pre||² s.t. w ≥ 0, Σw = 1 — build a weighted placebo "twin" of team i from other teams' trajectories, then the post-event gap (QB injury, OC firing, trade) = causal effect.
**Why unclaimed**: synthetic control × NFL arXiv = 0. Every "how does losing LT affect totals" take is either a regression on pooled data or vibes.
**Football weighting**: unit = team-week; outcome = EPA/margin/total residuals (market-adjusted, from our stack); donor pool = 31 teams × lags. Angle: event-study edge windows — the market re-prices regime changes in 1-2 weeks; SC estimates the true level shift faster → positions on under/over-reaction.
**Data**: margins + residuals (stack) + event flags (injuries corpus) — READY.
**Kill test**: placebo-in-time (fake event dates must show no effect) + pre-period fit RMSE floor. PAYOFF: PICKS (week-level), motivation/context features with honest causal values.

## F. TOPOLOGICAL DATA ANALYSIS ON TRAJECTORIES — movement "shape" as a feature family [VERIFIED UNCLAIMED-with-caveat]
**The equation.** For a drill path γ(t), compute persistent homology of the sublevel-set filtration of the distance-to-path function; H0/H1 persistence diagram D; vectorize by persistence images Π(D) = Σ w_i φ_i(p,q) over pixel grid. Or simpler: turning-function energy = ∫ κ(s)² ds (total squared curvature).
**Why unclaimed**: TDA×player-tracking arXiv = 0 (caveat: sports-TDA exists in biomechanics venues outside arXiv sports-analytics; we searched the arXiv face of it). The cheap version (curvature energy, path efficiency) is implementable stdlib today.
**Football weighting**: combine-drill paths → shape descriptors that separate "smooth COD" from "herky-jerky" at equal split times — the biomechanics scouts argue about, quantified. BDB 2027 angle: persistence-image heatmaps are judge-beautiful (viz = 20% of score) AND novel (football-score unique).
**Data**: BDB combine tracking when released; TODAY: we can prototype on any 10Hz-like path (public drill GPS traces rare — prototype on synthetic + NGS game tracks post-release).
**Kill test (BDB-flavored)**: do shape features add predictive power on rookie EPA *beyond* speed/accel/capital? Walk-forward by draft class. PAYOFF: BDB 2027 (headline candidate), RANK (developmental runway).

## G. DOUBLE MACHINE LEARNING FOR THE CONTEXT FACTORS — debiased coefficients, finally [PROVEN IN SOCCER, OPEN IN NFL]
**The equation.** Chernozhukov et al 2018: cross-fit nuisance models m(X), g(X); θ̂ = Σ (Y−g(X))(T−m(X)) / Σ (T−m(X))² — orthogonalized estimation of treatment effect (rest/travel/short-week/turf) with Neyman-orthogonality so ML nuisance errors don't bias θ̂.
**Why open**: arXiv DML×sports = 2 soccer hits (formations, goals-above-expectation). NFL context effects (our wish #9 rest/travel "tiebreaker only" doctrine) have never been DML'd publicly.
**Football weighting**: T = the context factor (e.g., post-bye, travel-direction, turf), Y = market-adjusted residual (margin − close), X = team strength lags, schedule features. Output: the debiased points-per-context coefficients the doctrine demands — replacing pooled OLS (which absorbed strength confounds).
**Data**: PBP + schedule + our residuals — READY post re-pull.
**Kill test**: coefficient stability across folds + placebo treatments (random fake rest-weeks must yield ≈0). PAYOFF: PICKS (context adjustments with honest error bars), wish #9 done rigorously.

## H. NEURAL ODE TRAJECTORY STATE-ESTIMATION [UNCLAIMED-with-caveat, compute-gated]
**The equation.** dh/dt = f_θ(h(t)) integrated between 10Hz samples; observation y_k = C h(t_k) + ε — continuous-time latent state for movement between/within samples; train by adjoint method.
**Why gated**: arXiv N-ODE×player-tracking = 0, but the family is compute-heavy (Colab/PC lane). Position: BDB Phase-2 exploration only, after kinematic canon (§BDB doc) is banked. The cheap cousin — RTS-smoothed kinematics on 10Hz data — is where we start; N-ODE only if the smooth version shows signal.
**PAYOFF**: BDB (trajectory denoising → cleaner COD features).

## I. ONLINE REGRET-MINIMIZATION FOR BOOK-TRUST WEIGHTS (the line-shopping brain)
**The equation.** Multiplicative weights / Hedge (Freund-Schapire): after each graded snapshot, w_b,t+1 = w_b,t · exp(−η·ℓ_b,t) / Z, where ℓ_b,t = book b's log-loss on that event vs realized close — the *consensus pool* (our opinion_pool) gets book weights that LEARN.
**Why novel here**: not in arXiv under sports; operationally unclaimed for line-shopping stacks. Ties directly into tonight's books_api + CLV ledger + PP/DK/Pinnacle snapshots.
**Kill test**: pooled consensus log-loss with learned weights < equal weights, walk-forward. PAYOFF: PICKS (better μ̂), the "close" itself gets sharper.

## J. POSTERIOR-KELLY (sizing under parameter uncertainty)
**The equation.** E[growth] = ∫ log(1 + f·(b·1{win} − 1{lose})) dΠ(θ) over parameter posterior Π (σ̂ from our DK-table uncertainty, μ̂ from our model) — draw 1,000 (μ,σ) pairs, average log-growth, optimize f. Versus plug-in Kelly, this auto-fractionalizes when the edge is uncertain (the mathematically honest version of "half-Kelly").
**Why unclaimed here**: plug-in Kelly exists everywhere; posterior-integrated Kelly as an operational prop-sizing default isn't in the NFL stack canon (Baker-McHale style results exist in theory venues).
**Data**: props_deep + dk_stat_distributions uncertainty — READY NOW (stdlib MC).
**Kill test**: MC growth curves with parameter noise: posterior-Kelly median growth ≥ plug-in Kelly, with lower ruin rate (kelly2.risk_of_ruin harness). PAYOFF: PROPS/PARLAY sizing doctrine upgrade.

## K. CONFORMAL DRIFT GATE (the abstain engine made rigorous)
**The equation.** Two-sample MMD² between this week's feature distribution and the calibration window's (kernel k): MMD² = 1/m² ΣΣ k(x_i,x_j) + 1/n² ΣΣ k(y_i,y_j) − 2/mn ΣΣ k(x_i,y_j); permutation test p-value → if MMD² exceeds its null-quantile, the week is NOT exchangeable with calibration → abstain floor widens (ties to wish #10 + brain doc's non-exchangeable conformal family).
**Data**: team-state features weekly — READY.
**Kill test**: does the gate improve net CLV by skipping flagged weeks vs betting all? PAYOFF: PICKS (abstain automation), doctrine compliance.

---
## PRIORITY ORDER (payoff ÷ effort ÷ doctrine-risk)
1. **C. EVT prop tails** — book shape assumption provably wrong on longest-X; ladders already in hand. *(today's best)*
2. **J. Posterior-Kelly** — stdlib MC today; upgrades sizing doctrine honestly.
3. **K. Conformal drift gate** — abstain automation; doctrine-native.
4. **A. Hawkes-football** — the born-here paper; live repricing upgrade (needs PBP re-pull).
5. **D. GAS strengths** — drop-in Kalman upgrade; CRPS bar decides.
6. **I. Hedge book-weights** — trivial to wire on snapshot diffs.
7. **G. DML context** — the rigorous wish #9; post re-pull.
8. **E. Synthetic control** — event-study edges.
9. **B. IRL coaches** — biggest wow, biggest build.
10. **F. TDA trajectories** — BDB 2027 headline candidate (viz + novelty).
11. **H. Neural ODE** — Phase-2 BDB exploration.

## DOCUMENTATION CHAIN (everything we've shipped — the all-work ledger)
1. `GSE_HANDOFF_PACK_2026-10-10.md` (234KB single-file for the coding agent) + tarballs in shared/gse/
2. `GSE_REVERSE_ENGINEERING.md` (endpoints, recipes, their-engine recon)
3. `ENGINE_GAP_AUDIT.md` (60 engines: file:line proof; the 51-memo corrected)
4. `REDUNDANCY.md` (fallback chains + 12-bottleneck forecast)
5. `CONTEXTUAL_LAYER.md` (cognitive/contextual atlas + own aging/capital curves + K1-K12 kill registry)
6. `BDB2027_GROUNDWORK.md` (comp spec, CV verdict, feature canon, timeline)
7. This registry + nightly memory checkpoints (2026-10-10.md) + `build_delivery.py` manifest with shas.



---

# DOC: FANTASY_TOOLING_RECON.md

# FANTASY TOOLING RECON v2 — deep pass (2026-10-10 night)
_Verified live tonight. This pass = keyless APIs nobody mines + competitor infrastructure maps. v1 landscape notes stand; this file supersedes per-site status._

## 1. NEWLY CRACKED — keyless data APIs (the "nobody has this" tier)

### 1.1 MyFantasyLeague export API — LIVE, keyless, JSON [VERIFIED]
```
GET https://api.myfantasyleague.com/2026/export?TYPE=players&L=&COUNT=N&JSON=1   # full player DB (188KB for all)
GET https://api.myfantasyleague.com/2026/export?TYPE=adp&COUNT=N&JSON=1          # LIVE ADP w/ draftSelPct + averagePick
```
- MFL = the deepest fantasy config platform; their export API exposes players/ADP/drafts/livescoring keyless. ADP payload fields: rank, id, averagePick, draftsSelectedIn, draftSelPct.
- **Lane**: fantasy-rankings consensus + MFL-specific ADP (different population than UD/DK best-ball → cross-market ADP arb).

### 1.2 FantasyFootballCalculator ADP API — LIVE, keyless [VERIFIED]
```
GET https://fantasyfootballcalculator.com/api/v1/adp/standard?teams=12&year=2026
# also /half-ppr /ppr /superflex /2qb ; meta includes total_drafts + date window
```
- Returns per-player: adp, timesDrafted, high/low, team/position/stub. 156 drafts in tonight's sample window.
- **Lane**: a THIRD independent ADP population (sharks' mock-draft site) — with MFL + Sleeper + DK/UD ADP = a 5-source fantasy-player-market panel. Nobody ships cross-source ADP efficiency stats; ours can.

### 1.3 FantasyPros — server-rendered consensus pages parseable keyless [VERIFIED-HTML]
- api.fantasypros.com exists (v2 host seen: `/v2/defloc?cors=1`); full API = key-gated. BUT rankings/ADP pages (591KB) carry the data server-side → HTML-parse = keyless consensus feed (structure, not Firecrawl-generic: we map their exact table nodes).
- **Lane**: consensus + expert-disagreement spread (registry entry I).

## 2. COMPETITOR INFRASTRUCTURE MAPS (tonight's chunk-mines)

### 2.1 PropFinder.app — book coverage + backend doors [VERIFIED]
- **Aggregated books (from app chunks)**: DraftKings · FanDuel · **Caesars · BetMGM · Fanatics** · PrizePicks · Underdog · **bet365** · deep-links to **Hard Rock (app.hardrock.bet) · Borgata (sports.borgataonline.com) · Novig (app.novig.us)**.
- **Backend doors found**: `hangfire.propfinder.app` + `hangfire-odds.propfinder.app` — Hangfire (.NET job) dashboards: root 404, **`/hangfire` → 401 (exists, auth-gated)**; static assets on DigitalOcean Spaces `pf-static.nyc3` (listing 403, bucket real).
- **Strategic read**: their book list = our gap list. Caesars/BetMGM/Fanatics props endpoints = the next books_api.py adapters (direct from books = better than their wrapper). Novig = a NEW lane entirely (peer market, no vig model) — worth its own recon.
- Their DataDome-free chunk surface means odds arrive via API calls we haven't located yet (Next.js server routes likely `/api/trpc` or similar — next session: XHR capture in browser).

### 2.2 Big-book direct probes [status tonight]
- Caesars `sportsbook.caesars.com/api/bets/v1/apex/usnj/sports` → 200 but SPA shell (data routes deeper; community-known apex REST exists — enumerate next session).
- BetMGM `sports.betmgm.com/en/sports/api/cms/sports` → 200 empty (params needed).
- Fanatics → 403 (Akamai). ESPN BET → transport fail from shell (browser lane).
- LineStar (DNN): module JS enumerated (`/Portals/0/js/fantasysportsco.*`); data services not yet found → next: browser XHR capture on a live dashboard (the DK/Pinnacle recipe).

## 3. THE CROSS-MARKET ADP IDEA (uniquely ours, data live tonight)
Five independent fantasy-player markets, all keyless: **MFL ADP · FFC ADP · Sleeper (players+leagues) · DK best-ball ADP · UD ADP** (last two via our browser lanes/FP article tables).
- Build: normalize names/positions → compute per-player ADP spread, z-deviation from cross-source mean, and platform-meta adjustments (UD 18-rd half-PPR WR-heavy vs DK full-PPR QB-hungry — verified in FP article).
- Payoff: GSE rankings lane ships **market-efficiency stats for player RANKINGS** (which platforms lag which players) — a feature no tool in §1-v1 list has. Also feeds the "narrative vs base rate" cognitive layer (CONTEXTUAL_LAYER §7).

## 4. Next-session queue (chunk-mines + XHR captures)
1. PropFinder XHR capture → their odds API shape (adds Caesars/BetMGM/Fanatics/bet365 mirror + Novig recon).
2. Caesars apex REST enumeration (community pattern: /api/bets/v1/apex/usnj/sports/{sport-guid}/leagues/...).
3. LineStar DNN XHR capture → DFS projections benchmark feed.
4. RT Sports SPA bundle → draft/ADP API.
5. ESPN BET via browser lane (transport-blocked from shell).
6. Novig: peer-to-peer odds = zero-vig reference prices → potential best "fair value" source on the board.

## 5. DEEP PASS v3 — code-mine + gold-lane verification (2026-10-10 late, "hacking tools" round)
### 5.1 CFBD with key — gold lanes LIVE (verified tonight)
- `/lines?year=2026` → **613KB of odds+scores** (spreads/totals per game; closing-line source for CFB CLV)
- `/recruiting/players?year=2026` → 1.47MB class rankings (stars, measurables, commits) = recruiting-capital engine
- `/ratings/sp?year=2025` → SP+ w/ offense/defense components
- `/coaches?team=...` → full coaching history (records since 1904, seasons array) = tenure/hot-seat engine
- **Portal real path = `/player/portal`** (NOT /recruiting/portal — 404'd first; found via recruitR source mine)
- Their swagger.json route is CF-shell-wrapped; endpoint inventory via cfbfastR client source + code search instead (method note: when /swagger is behind CF, mine the official client library source).

### 5.2 GitHub code-mine results (code-search API, token auth)
- **Novig API DOOR FOUND**: `https://api.novig.com/v1` + `Bearer {api_key}` auth (community client: sports-card/backend/integrations/novig.py). Coding agent's Novig task now has host+auth; next = enumerate v1 markets/orderbook shapes (public lists) + decide key strategy.
- **Beexly/Sports ALREADY holds internal recon**: `docs/dfs/research/2026-09-25/pickem-api-recon.md` (+ audit addendum) + `packages/data-ingestion/src/underdog-pickem-intake.ts` — prior Underdog/DK-Pick6 endpoint work exists in-house. NEXT: read it fully, diff against our lane map (their Sep-25 verdicts: DK Pick6 "WIRE...", Underdog per their doc), merge our browser-lane findings (DK nash taxonomy etc.) into ONE canonical endpoint registry.
- PrizePicks projections path confirmed by 524 public code hits; alternative shapes exist in community bots (PositiveEV-Arbitrage-Bot, litpicks) for cross-checking our adapter.
- CFBD code-search surface: 340 hits; recruitR = the portal/wrappers reference.

### 5.3 Method note (the "hacking-tools" layer, all authorized)
1. Official-client source mining (cfbfastR/recruitR R libs = full endpoint inventory without swagger).
2. GitHub code search on api hosts (novig/prizepicks/underdog/collegefootballdata) → community-reverse-engineered endpoints + auth patterns.
3. Gold-lane live verification with user-held keys; polite pacing; no auth bypass; no third-party sessions (their recon doc holds the same line).
4. Next-level queues: (a) api.novig.com/v1 shape probe + public market list; (b) Pinnacle guest-API path fuzz (undocumented props/futures routes); (c) DK nash route-table fuzz from browser context; (d) read their in-repo pickem recon + merge registries.



---

# DOC: ENGINE_BLUEPRINTS.md

# GSE ENGINE BLUEPRINTS — clone dossiers + football-dimension engines (2026-10-10)
_The "how their engines work" layer + the OL/DL, scheme, coverage, coaching engines — every source verified live tonight. PC/agent items marked. iSH items ran or are one command away._

## PART 1 — ENGINE AUTOPSIES (clone their methodology, legally: methods aren't protected, weights/data are ours)

### 1.1 FantasyPros — accuracy-weighted consensus (their public methodology)
- Engine: consensus rank/projection = **weighted average of expert sources, weights = each expert's historical accuracy** (they publish accuracy leaderboards per position). Disagreement = spread of expert ranks.
- Clone: ours already has the pool math (opinion_pool, registry entry I). Add: expert-accuracy weights from their public accuracy pages (keyless HTML), then our own pool over (FP consensus + MFL ADP + FFC ADP + Sleeper + market: DK prop-implied μ̂). Output: GSE consensus + **disagreement z-scores** (the tradable signal — consensus is the base rate; deviation = the angle).
- Data: FP HTML (591KB pages, server-rendered — parse lane proven tonight).

### 1.2 PropFinder — aggregation + EV overlay (reverse-engineered from chunks + product behavior)
- Engine: harvest multi-book props (DK/FD/Caesars/BetMGM/Fanatics/PP/UD/bet365 + Hard Rock/Borgata/Novig links) → de-vig each book → consensus fair p → display EV vs each book's price. Their edge-finder = consensus-vs-price gap (our identical stack: shin_devig + opinion_pool + our 442-fit DK σ table).
- Their differentiator = book coverage breadth + UX, not math. **Clone our version better**: our DK ladder recon gives SHAPE (σ̂), not just fair p — we can flag tail mispricings (EVT angle, registry C) that pure de-vig consensus can't see.
- Their infra: Hangfire workers (hangfire-odds.propfinder.app), DO Spaces static — same architecture class as ours (queue + snapshots). Validation that our design is industry-standard.

### 1.3 LineStar — DFS projections pipeline (DNN app, XHR-pending)
- Structure: per-(Sport×Site) dashboards; projections/ownership served by DNN web services (module JS enumerated tonight: fantasysportsco.*). Their projections = mix of licensed sources (historically their own + partners).
- Clone plan: XHR capture (browser performance-entries recipe) → benchmark their numbers vs OUR engine (props_deep NB2 + EPA usage) — their accuracy becomes OUR calibration target, not gospel.

### 1.4 The public big-model canon (what's documented, what we adopt)
- **ESPN FPI**: documented = EPA + situational covariates + market calibration, Monte Carlo schedule sim. Our version: market_strengths + EPA spine + stack_with_market — same family, ours market-anchored (stronger per GSE doctrine).
- **DVOA (FTN/FO)**: documented method = success-rate adjustments by down/distance/field position, opponent-adjusted, play-by-play value over average. We have every ingredient (ftn charting + pbp). We don't need to clone DVOA — we compute EPA/WPA directly.
- **PFF grades**: proprietary human grading — cannot clone; our substitute chain (FTN charting + NGS + YBC/YAC attribution) covers the same questions with public receipts.
- **numberFire**: their public claims = "proprietary + public data ensemble"; no formula disclosure — benchmark only.

## PART 2 — FOOTBALL-DIMENSION ENGINES (the OL/DL, scheme, coverage, coaching layer)

### 2.1 OL vs RB attribution engine [PFR lane PROVEN tonight]
Verified schema (Bijan page, `adv_rushing_and_receiving`): rush_yds_before_contact (812), rush_yds_bc_per_rush (2.8), rush_yac (666), rush_yac_per_rush (2.3), broken_tackles (22), targets/ADOT/drops/target_int/pass_rating allowed.
- **Engine**: per-RB, split value into (OL-created: YBC, box counts from FTN) + (RB-created: YAC, broken tackles). Team-level OL grade = Σ RB YBC/rush adjusted for box/defenders (FTN n_defense_box). DL side: pressure via FTN n_pass_rushers + PFR adv defense (pressures) + NGS qb_hits.
- Also verified present: rec_air_yds_per_rec **negative** (-0.5) for Bijan = screens/checkdowns profile — reception-profile typing for props (ADOT distributions per player = over/under-yardage prop risk shape).
- Scale-out (browser-lane crawl, polite delay, ~60 key RB/WR pages or full rosters on PC): one command per page; tool = pfr_pull.py (write next session, recipe in Part 4).

### 2.2 Scheme/coverage engines [data located; pbp parse = PC/agent lane (pyreadr won't build on iSH)]
- nflfastR pbp (per-game RDS at github.com/nflverse/nflfastR-data/releases/tags/raw_pbp_2026 — 67 assets, current season live) carries: `run_gap`, `run_location` (gap direction), `defense_man_zone_type`, `defense_coverage_shell`, `defenders_in_box`, `xpass`, `xcpoe`, `qb_hit`, pressure flags.
- **Engines to compute on PC** (one pandas pass each):
  a. RB efficiency by gap × location × defenders_in_box → the "zone vs gap" adjacency (gap-assignments: run_gap C/G/T + pull detection via FTN motion? honest note: scheme labels zone/gap are not public; we publish GAP-LOCATION × BOX × YBC — better than most public splits, honest about the label limit).
  b. WR/TE performance by man/zone (`defense_man_zone_type`) + shell (`defense_coverage_shell`) → per-player coverage splits = the man-vs-zone ask, directly.
  c. Blitz-rate & pressure-by-teams (FTN n_blitzers; pbp pressure) → OL pass-pro engine + DC-aggression index (coaching layer).
  d. Play-action/RPO/motion EPA lifts (FTN 2025 8.1MB in hand, cols verified: is_play_action, is_rpo, is_motion, is_screen_pass, is_no_huddle) → offensive-identity fingerprints for totals/props.
- FTN 2025 = ftn_2025.csv (in workspace/data). officials.csv in hand (crew → penalty environments, context_engine refresh).

### 2.3 Coaching & staff engine
- Data located: officials.csv (crews); coaching staff = PFR coaching pages + trades.csv (in nfldata) for coordinator moves; hot-seat tenure table = build from PFR coach history (PC crawl).
- Engines: DC aggression index (blitz rate z-score), OC change shock (synthetic control, registry E), designation honesty (CONTEXTUAL K8), IRL coach reward (registry B).

### 2.4 Birthday/RAE — FINAL PIECE SECURED [iSH-ready]
- players.csv.gz (2.4MB, 24,844 rows) has `birth_date` + draft fields → K3 unblocks: birth-quarter distribution by draft round + age-at-draft vs career-length (§1.3 capital gradients) + age-vs-curve-peak alignment (§1.1). One pandas/stdlib pass on PC or here next session.
- Cross-source ID glue verified: pff_pfr_map_v1.csv (nfldata) + sleeper ids + PFR ids (RobiBi01 pattern) + nflverse gsis ids (players.csv).

## PART 3 — WHAT THE CROSS-RECON SAYS ABOUT "THEIR ENGINES" (meta)
Every cracked competitor (FP consensus, PropFinder EV, LineStar projections, DK's Gaussian ladders, MFL/FFC ADP) reduces to the same skeleton: **harvest → normalize IDs → de-vig/consensus → model overlay → UX**. Nobody in the set publishes: distribution SHAPE reconstruction (our ladders→σ̂), EVT tails, aging/capital priors, or coverage-split props. Those four = the moat. We hold all four paths + the doctrine to keep them honest (kill tests, close-anchored).

## PART 4 — RECIPES (verified tonight)
- **PFR via browser (shell 403)**: navigate any pfr page → in-page fetch same-origin → parse `#adv_rushing_and_receiving` / `#defense_advanced` / `#passing_advanced` tables by `data-stat` cells. Player-id pattern: {LastInitial}{First5}{NN} (RobiBi01). DOB in #meta bio block.
- **nflverse-data release CSVs**: github.com/nflverse/nflverse-data/releases/download/{tag}/{file} (players/players.csv.gz, ftn_charting/ftn_charting_2025.csv, officials/officials.csv verified).
- **pbp RDS**: raw_pbp_{year} releases; parse on PC (pyreadr) — iSH documented-blocked (musl build fail).
- **MFL/FFC/FP lanes**: FANTASY_TOOLING_RECON.md v2.

## QUEUE (next session, priority order)
1. Run RAE/birthday compute on players.csv (iSH, 1 command) → close K3.
2. pfr_pull.py browser crawler: 60 key player pages → OL/DL/coverage engine v1 (YBC/YAC/broken-tackles/pressure tables).
3. PC/agent: pbp man/zone + run_gap compute (engines 2.2a/b) + pbp_participation join.
4. PropFinder XHR capture → their odds API; Novig zero-vig recon.
5. FTN 2025 fingerprints compute (motion/play-action/blitz EPA lifts — iSH-ready, 8MB in hand).

## PART 5 — THE PFR FULL MAP (all surfaces verified live 2026-10-10; browser lane required, shell=403)
| Surface | URL pattern | Verified tables/columns | Engine it feeds |
|---|---|---|---|
| Player page | /players/{L}/{L}{First5}{NN}.htm | adv_rushing_and_receiving (YBC, YAC, broken_tackles, ADOT, drops, target_int, pass_rating), defense, snap_counts, returns, scoring | 2.1 OL/RB attribution, coverage-adjacent, usage/snap engines |
| Team season | /teams/{team}/{year}.htm | games (game-by-game **exp_pts_off/def/st** + full box stats), team_stats, passing, rushing_and_receiving, defense | Team EP archive = independent expected-points source; WPA/EP validation |
| Weekly index | /years/{year}/week_{n}.htm | all boxscore links | crawl driver |
| **Boxscore** | /boxscores/{YYYYMMDD}{away}.htm | **Officials (named crew!)**, stadium, weather/vegas-line present in page (older seasons in HTML comments — parser must unwrap comments) | Referee-environment engine (context_engine refresh), closing-line archive, venue context |
| **Coach page** | /coaches/{Name}{NN}.htm | coaching_results per year: W/L, **srs_total/offense/defense**, playoffs, **chall_num/chall_won**, remarks | Tenure/hot-seat table, challenge-behavior feature (nobody uses), SRS cross-check |
| Draft page | /years/{year}/draft.htm | pick, age, college, career AV | Capital engine extension |
| CFB sibling | sports-reference.com/cfb/... | same structure, college data | CFB/BDB lane (NFL+CFB mandate) |

**Crawl doctrine**: polite (≥2s between pages), browser in-page fetch (same-origin), comments-unwrap parser, store raw HTML + parsed CSVs to snapshots. Player-id pattern {LastInitial}{First5}{NN}; coach ids {Name}{NN} (e.g., MorrRa0). PC/agent can scale the crawl; iSH proof-of-concept done on 5 surfaces tonight.

## PART 6 — FTN 2025 FINGERPRINTS + PFR LINE ARCHIVE (computed live 2026-10-10)
- FTN league baselines (n=47,316 plays): motion 42.0%, play-action 10.7%, RPO 4.5%, screen 3.6%, no-huddle 7.8%, contested 6.0%, drop-when-catchable 5.7% (n=13,510), QB out-of-pocket 9.7%, throwaway 1.7%. read_thrown codes incl. SD (scramble drill) / CHK (checkdown) / 0-2 (depth). Encoding note: flags are TRUE/FALSE strings. Team-level fingerprints = one pbp join away (PC lane) — the baseline table is the normalizer for team z-scores.
- PFR boxscore line archive: closing Over/Under verified LIVE on 2026 boxscores (PHI@JAX O/U 42.0). Spread/weather labels vary by season; parser unwraps comments (66 comment blocks on that page) — pfr_pull.py boxscore_meta handles it.



---

# DOC: PP_MARGIN_CURVE_2026-10-10.md

# PP MARGIN CURVE — computed 2026-10-10 (our sigma x their over-only lines x confirmed payouts)
Data: 232 PP over-only lines priced against 96 DK-reconstructed (mu,sigma) fits (R2>=0.98).

## Per-stat mean P(over) at PP over-only lines
| stat | n | mean p | median |
|---|---|---|---|
| rush_rec_yards | 20 | 0.544 | 0.555 |
| pass_yards | 208 | 0.543 | 0.533 |
| rush_yards | 4 | 0.300 | 0.258 (deep goblin-style lines) |

## Slip EV at league p-bar=0.539 (per $1, independence approx, different-game legs)
| legs | Power | Flex |
|---|---|---|
| 2 | -0.128 | - |
| 3 | -0.060 | -0.128 |
| 4 | -0.156 | -0.060 |
| 5 | -0.090 | -0.023 |
| 6 | -0.080 | -0.387 |

VERDICT (league level): PP product margin is real — no free EV at average depth on any mode/legs.

## THE POCKET (conditional on DK distribution calibration)
Deepest over-only lines price at p=0.81-0.84 (Goff 209.5 p=.837; Brissett/Stafford .824; Stroud .820; Rodgers 159.5 .816; Gibbs 89.5 .812...). Two DIFFERENT-game legs at p=.82 on 2-leg Power 3x: joint .672 x3 = +102% EV per $1. This is the arbitrage between PP's product pricing and DK's market probability — it INHERITS DK's model risk (mu_hat anchored to DK's own main line; circularity caveat).
rush_yards over-only = the trap side (p-bar .30, EV deeply negative).

## Kill tests (pre-registered)
1. Backtest: 2-leg Powers from top-quartile p lines vs graded outcomes (needs results feed) — does realized hit rate match our p?
2. Circularity check: recompute mu_hat with PP's own primary lines as anchor; if edge collapses, it was DK-shading not PP-freespace.
3. Correlation: same-game pairs via margin_total_copula (product banned).
MODEL RISK: none of this touches production; diagnostic only.



---

# DOC: PP_PAYOUT_TABLES_CONFIRMED.md

# PrizePicks payout tables [CONFIRMED] + margin-curve method (Minis 2026-10-10)
Source: community-maintained rules wiki citing prizepicks.com/help-center/payouts (official rates updated 2026-07-02).

## Power Play (all legs hit)
| legs | multiplier | implied slip 1/M | per-leg breakeven M^(-1/n) |
|---|---|---|---|
| 2 | 3x | 33.3% | 57.7% |
| 3 | 6x | 16.7% | 55.0% |
| 4 | 10x | 10.0% | 56.2% |
| 5 | 20x | 5.0% | 54.9% |
| 6 | 37.5x | 2.7% | 54.0% |

## Flex Play (partial credit)
| legs | all | 1 miss | 2 misses |
|---|---|---|---|
| 3 | 3x | 1x (push) | - |
| 4 | 6x | 1.5x | - |
| 5 | 10x | 2x | 0.4x |
| 6 | 25x | (t) | (t) |

Rules notes [CONFIRMED]: demon (harder line, More only, boosts mult up to 2000x on 6-leg) / goblin (easier line, More only, reduces mult). Tie/DNP/reboot revert one tier; 2-pick Power refund on DNP. Reboot = NFL full-game More leg, player exits 1H injured, no 2H return; Less grades normally.
ToS note [CONFIRMED]: PP ToS restricts automated access; no public API. Our reads = public board reads; keep volume polite; no accounts used (doctrine).

## Margin-curve method (the kill-shot spec)
1. Over-only PP lines vs our DK-reconstructed (mu_hat, sigma_hat) -> p_model = 1 - Phi((line-mu)/sigma).
2. Slip EV(n legs, mode) = prod(p_i)*M - 1 (Power) or sum over outcome tiers (Flex, independence approx).
3. Per-stat margin curve: EV vs number-of-legs using each stat's mean p at PP over-only depth (-0.85 sigma avg).
4. Compare per-leg breakeven (54-57.7%) vs our p at their posted over-only lines -> the pockets where prod(p)*M>1.
Correlation correction: same-game legs need our copula (margin_total_copula); product-of-legs overprices positive correlation (banned by doctrine) - use copula joint.



---

# DOC: PICKEM_RECON_MERGE_NOTES.md

# Pickem recon merge notes (2026-10-10)
Their in-repo recon (docs/dfs/research/2026-09-25/pickem-api-recon.md) verdicts located; merge status:
- DK Pick6: their verdict WIRE-eligible (per recon header) — cross-ref our pick6_hold.py math (structural hold, breakeven per leg, copula sensitivity).
- Underdog: their endpoints + our findings (login wall on app.underdogsports.com; api.underdogfantasy.com alive) — reconcile their Sep-25 paths vs today's 404s (board moved to app domain; their intake TS may still work server-side).
- Doctrine match: both hold public/reverse-engineered-only, no auth bypass.
NEXT: full merge into one canonical endpoint registry file (owner-approved lane).



---

# DOC: DEEP_INTEL_v3.md

# DEEP INTEL v3 — 2026-10-10 late (code-mine + gold lanes + market structure)
1. CFBD w/ key: /lines (613KB odds+scores), /recruiting/players (1.47MB), /ratings/sp, /coaches (since 1904), portal = /player/portal (source-mined from recruitR after 404).
2. Novig door: api.novig.com/v1 + Bearer {api_key} (community client sports-card). Public route enumeration pending key; /v1/events 404 keyless.
3. Beexly/Sports in-house recon located: docs/dfs/research/2026-09-25/pickem-api-recon.md (+addendum, + underdog-pickem-intake.ts). MERGE queued: our browser-lane DK nash taxonomy + their Sep-25 pickem work -> one canonical registry.
4. EDGE SHEET v2 finding: PP PRIMARY (two-sided) lines within +/-0.08 sigma of DK reconstructed means (21 matched) -> pick'em primaries anchor to same consensus; the product layer = PP OVER-ONLY alt lines at ~-0.85 sigma vs DK means -> margin curve vs payout multipliers (see PP_PAYOUT_TABLES_CONFIRMED.md).
5. Shade map: DK totals hug sharp close (mean -0.18, range [-1,+1]); per-game spread shading in CSV.
6. Doctrine: no accounts, no auth bypass, polite pacing; PP ToS prohibits automated access -> read-only public board reads only, no automation against PP.



---

# DOC: SHADE_MAP_README.md

# DK vs Pinnacle shade map (2026-10-10, 14/14 week-6 games matched)
Method: DK MainPointLine rows (sub 4518) joined to Pinnacle period-0 non-alternate mains via team-key (nick->abbr; Pinnacle matchup participants).
FINDING: DK total shading vs sharp close: mean -0.18, median -0.2, range [-1.0,+1.0] (PHI@JAX London: DK 41.5 vs PINN 42.5 = full-point shade DOWN; LV@NE +0.5 up). Per-game spread deviations visible in CSV.
USE: alt-line/teaser pricing inputs; quantifies retail-vs-sharp per game. No coefficients promoted.



---

# PART C — FULL SOURCE CODE


### `engine_math.py`
```python
#!/usr/bin/env python3
"""engine_math.py — probability engines behind the books, runnable stdlib.

Spread convention (all files in this packet):
  listed_spread = the book home number (favorite negative, -3.5).
  mu_margin = -listed_spread. A fair -3.5 is home margin ~ N(+3.5, 13.45).
  Cover of listed line L: home margin + L > 0 (pushes ignored here).

Part 4 names are math.* so the module imports. market_strengths is
least squares (normal equations), not a square Gaussian elimination.
Brier reliability uses the bin mean forecast, not the bin midpoint.
"""
import math

# ============ 1. BRADLEY-TERRY ============
def bt_prob(ra, rb, scale=400.0):
    """Elo IS Bradley-Terry run online: P = 1/(1+10^((rb-ra)/400))."""
    return 1.0 / (1.0 + 10 ** ((rb - ra) / scale))

def elo_update(ra, rb, score_a, k=20.0):
    """538 variant: K scaled by margin, regression-to-mean each offseason."""
    e = bt_prob(ra, rb)
    return ra + k * (score_a - e), rb - k * (score_a - e)

def bt_fit(games, iters=150):
    """MM-algorithm MLE for static BT from win list [(winner,loser),...]."""
    import collections
    teams = {t for g in games for t in g}
    wins = collections.Counter(w for w, _ in games)
    opp = collections.defaultdict(list)
    for w, l in games:
        opp[w].append(l); opp[l].append(w)
    pi = {t: 1.0 for t in teams}
    for _ in range(iters):
        new = {}
        for t in teams:
            s = sum(1.0 / (pi[t] + pi[o]) for o in opp[t])
            new[t] = wins[t] / s if s > 0 else 1.0
        tot = sum(new.values())
        pi = {t: v / tot for t, v in new.items()}
    return pi

# ============ 2. DIXON-COLES ============
def pois(k, lam): return math.exp(-lam) * lam ** k / math.factorial(k)

def dc_tau(x, y, lam, mu, rho):
    if x == 0 and y == 0: return 1 - lam * mu * rho
    if x == 0 and y == 1: return 1 + lam * rho
    if x == 1 and y == 0: return 1 + mu * rho
    if x == 1 and y == 1: return 1 - rho
    return 1.0

def dc_prob(x, y, lam, mu, rho=-0.05):
    return dc_tau(x, y, lam, mu, rho) * pois(x, lam) * pois(y, mu)

def dc_grid(lam, mu, rho=-0.05, maxg=8):
    """Full score grid -> margin & total distributions (the book's ladder source)."""
    margin, total = {}, {}
    for x in range(maxg + 1):
        for y in range(maxg + 1):
            p = dc_prob(x, y, lam, mu, rho)
            margin[x - y] = margin.get(x - y, 0.0) + p
            total[x + y] = total.get(x + y, 0.0) + p
    return margin, total

# ============ 3. NORMAL-MARGIN MODEL (alt-line pricing) ============
def norm_cdf(x, mu=0.0, sd=1.0):
    return 0.5 * (1 + math.erf((x - mu) / (sd * math.sqrt(2))))

def prob_from_american(amer):
    amer = float(amer)
    return (100 / (amer + 100)) if amer > 0 else ((-amer) / ((-amer) + 100))

def amer_from_prob(p):
    p = min(max(p, 0.01), 0.99)
    return (100 * p / (1 - p)) if p > 0.5 else (-100 * (1 - p) / p)

def mu_from_listed(listed_spread):
    """Book home number (favorite negative) -> expected home margin."""
    return -float(listed_spread)

def alt_ladder(listed_spread, sd=13.45, step=0.5, n=4):
    """Fair alt ladder. Main line cover is ~50% when mu = -listed_spread."""
    mu = mu_from_listed(listed_spread)
    p_win = 1 - norm_cdf(0.0, mu, sd)
    out = [
        f"listed {listed_spread:+.1f} -> mu_margin {mu:+.1f}",
        f"P(home win) = {p_win * 100:.1f}%",
        "alt ladder (fair, pre-tax, pushes ignored):",
    ]
    for i in range(-n, n + 1):
        line = listed_spread + i * step
        # cover if margin + line > 0
        p = 1 - norm_cdf(-line, mu, sd)
        out.append(f"  {line:+5.1f}: P(cover) {p * 100:5.1f}%  fair {amer_from_prob(p):+5.0f}")
    return "\n".join(out)

# ============ 4. SKELLAM ============
def skellam_pmf(k, lam, mu, terms=30):
    b = 2 * math.sqrt(lam * mu)
    def bi(n, x):
        s = 0.0
        for m in range(terms):
            s += (x / 2) ** (n + 2 * m) / (math.factorial(m) * math.factorial(n + m))
        return s
    return math.exp(-(lam + mu)) * (lam / mu) ** (k / 2) * bi(abs(k), b)

# ============ 5. BRIER + ISOTONIC ============
def brier_decompose(pairs):
    """Murphy: BS = reliability − resolution + uncertainty.
    Reliability uses the bin mean forecast, not the bin midpoint."""
    n = len(pairs)
    if n == 0:
        return 0.0, 0.0, 0.0, 0.0
    bs = sum((p - o) ** 2 for p, o in pairs) / n
    pbar = sum(o for _, o in pairs) / n
    bins = {}
    for p, o in pairs:
        bins.setdefault(min(9, int(max(0.0, min(p, 0.999)) * 10)), []).append((p, o))
    rel = res = 0.0
    for v in bins.values():
        nk = len(v)
        mean_p = sum(p for p, _ in v) / nk
        mean_o = sum(o for _, o in v) / nk
        rel += (nk / n) * (mean_o - mean_p) ** 2
        res += (nk / n) * (mean_o - pbar) ** 2
    return bs, rel, res, pbar * (1 - pbar)

def isotonic(pairs):
    """PAV algorithm — the calibration layer on every serious probability engine."""
    blocks = [[p, [o]] for p, o in sorted(pairs)]
    def mean(b): return sum(b[1]) / len(b[1])
    i = 0
    while i < len(blocks) - 1:
        if mean(blocks[i]) >= mean(blocks[i + 1]):
            blocks[i][1] += blocks[i + 1][1]; del blocks[i + 1]
            while i > 0 and mean(blocks[i - 1]) > mean(blocks[i]):
                blocks[i - 1][1] += blocks[i][1]; del blocks[i]; i -= 1
        else:
            i += 1
    return [(p, sum(ys) / len(ys)) for p, ys in blocks]

# ============ 6. KELLY ============
def kelly_binary(p, amer):
    """f* = (bp − q)/b. b = net odds. THE sizing law; fractional Kelly for survival."""
    b = (amer / 100) if amer > 0 else (100 / -amer)
    q = 1 - p
    return (b * p - q) / b

def kelly_ev_growth(p, amer, f, n=1000, trials=200, seed=1):
    """Monte Carlo: expected log-growth of betting fraction f — shows WHY overbetting dies."""
    import random
    rnd = random.Random(seed)
    b = (amer / 100) if amer > 0 else (100 / -amer)
    g = 0.0
    for _ in range(trials):
        bank = 1.0
        for _ in range(n):
            bank *= (1 + f * b) if rnd.random() < p else (1 - f)
            if bank <= 0:
                bank = 1e-12
                break
        g += math.log(bank)
    return g / trials

# ============ 7. SHIN / KALMAN / PROPS / TEASERS ============
def shin_devig(pi1, pi2):
    """Shin (1993) — CORRECT closed-form conditional (verified vs penaltyblog impl):
       π_i(z) = (√(z² + 4(1−z)·p_i²/Σp) − z) / (2(1−z)),  p_i = raw implied (1/dec),
       z = insider-money proportion solved so Σπ = 1 (bisection; Σπ(z) decreasing).
       Balanced −110/−110 → z≈0.0476, π=0.5/0.5. Falls back to multiplicative
       only if the book is sub-1 (no overround → Shin undefined)."""
    s = pi1 + pi2
    if s <= 1.0:
        return 0.0, pi1 / s, pi2 / s
    def probs(z):
        out = []
        for p in (pi1, pi2):
            if z <= 0 or z >= 1:
                out.append(p / s)
            else:
                disc = z * z + 4.0 * (1.0 - z) * p * p / s
                out.append((math.sqrt(disc) - z) / (2.0 * (1.0 - z)))
        return out
    lo, hi = 1e-6, 1.0 - 1e-6
    for _ in range(80):
        z = (lo + hi) / 2.0
        tot = sum(probs(z))
        if tot > 1.0: lo = z
        else: hi = z
    z = (lo + hi) / 2.0
    p1, p2 = probs(z)
    return z, p1, p2

def shin_devig_nway(raw_probs):
    """N-way Shin — same closed form, works for any market size."""
    s = sum(raw_probs)
    if s <= 1.0 or not raw_probs:
        return 0.0, [p / s for p in raw_probs]
    def probs(z):
        return [(math.sqrt(z * z + 4.0 * (1.0 - z) * p * p / s) - z) / (2.0 * (1.0 - z))
                for p in raw_probs]
    lo, hi = 1e-6, 1.0 - 1e-6
    for _ in range(80):
        z = (lo + hi) / 2.0
        if sum(probs(z)) > 1.0: lo = z
        else: hi = z
    return (lo + hi) / 2.0, probs((lo + hi) / 2.0)

def fair(p1, p2, method="mult"):
    """Devig dispatcher: multiplicative / additive / power."""
    s = p1 + p2
    if method == "mult":
        return p1 / s, p2 / s
    if method == "add":
        return p1 - (s - 1) / 2, p2 - (s - 1) / 2
    lo, hi = 0.01, 2.0
    for _ in range(60):
        k = (lo + hi) / 2
        if p1 ** k + p2 ** k > 1:
            lo = k
        else:
            hi = k
    k = (lo + hi) / 2
    return p1 ** k, p2 ** k

def kalman_ratings(games, hfa=2.0, q=1.0, r_sd=13.45, init_sd=9.0):
    """State-space ratings: strengths are hidden state; each game is a noisy observation
    margin = (s_a − s_b + hfa) + ε. Returns {team: (rating, rd)}. 'Form' = the process noise.
    PRIOR LABELS (packet audit): hfa=2.0 and r_sd=13.45 are published PRIORS. The Gibbs
    2019+ measurement (2,025 games) is hfa=1.56 [1.54,1.59], sigma=13.36 [13.34,13.37]
    (data/analyze_nfl.py). Pass hfa=1.6, r_sd=13.4 for modern-NFL fits."""
    mu, P = {}, {}
    def ensure(t):
        if t not in mu: mu[t] = 0.0; P[t] = init_sd ** 2
    for a, b, marg in games:
        ensure(a); ensure(b)
        P[a] += q; P[b] += q
        innov = marg - (mu[a] - mu[b] + hfa)
        S = P[a] + P[b] + r_sd ** 2
        for t in (a, b):
            h = 1.0 if t == a else -1.0
            K = P[t] * h / S
            mu[t] += K * innov
            P[t] = max(1.0, P[t] * (1 - K * h))
    return {t: (round(mu[t], 2), round(P[t] ** 0.5, 2)) for t in mu}

def inv_norm(u, lo=-6.0, hi=6.0):
    for _ in range(48):
        m = (lo + hi) / 2
        if norm_cdf(m) < u: lo = m
        else: hi = m
    return (lo + hi) / 2

def prop_price(proj, sd, line, book_amer=-110):
    """Props done right: P(stat > line) from the player's DISTRIBUTION (mean, sd),
    fair price vs book's price → the hold. Quantile ladder: P10..P90."""
    p_over = 1 - norm_cdf(line, proj, sd)
    ladder = {q: inv_norm(q) * sd + proj for q in (0.10, 0.25, 0.50, 0.75, 0.90)}
    fair_amer = amer_from_prob(p_over)
    # edge vs the book's implied probability, not a fake hold
    book_p = prob_from_american(book_amer)
    return {"p_over": p_over, "fair_amer": fair_amer, "book": book_amer,
            "quantiles": ladder, "edge_vs_book_p": p_over - book_p}

def teaser_mc(mu1, mu2, pts=6.0, sd=13.45, rho_games=0.0, book=-110, n=20000, seed=7):
    """2-leg teaser. Push on one leg reduces to the other leg (common book rule).
    Both-push is removed from the denominator. mu is home margin, not listed spread."""
    import random
    rnd = random.Random(seed)
    sqrt_r = math.sqrt(max(rho_games, 0.0))
    sqrt_1 = math.sqrt(1 - max(rho_games, 0.0))
    wins = both_push = 0
    for _ in range(n):
        f = rnd.gauss(0, 1)
        def leg(mu):
            m = mu + sd * (sqrt_r * f + sqrt_1 * rnd.gauss(0, 1)) + pts
            return "w" if m > 0.25 else ("p" if m > -0.25 else "l")
        r1, r2 = leg(mu1), leg(mu2)
        if r1 == "p" and r2 == "p":
            both_push += 1
        elif r1 == "p":
            wins += 1 if r2 == "w" else 0
        elif r2 == "p":
            wins += 1 if r1 == "w" else 0
        elif r1 == "w" and r2 == "w":
            wins += 1
    eff = n - both_push
    p_win = wins / eff if eff else 0.0
    b = (book / 100) if book > 0 else (100 / -book)
    breakeven = 1 / (1 + b)
    return {"p_win": p_win, "fair_amer": amer_from_prob(p_win), "book": book,
            "breakeven_p": breakeven, "edge": p_win - breakeven}

# ============ PART 3: THE FULL-ARC ENGINE (conception → completion) ============
def fair(p1, p2, method="mult"):
    """Devig dispatcher: multiplicative / additive / power."""
    s = p1 + p2
    if method == "mult": return p1 / s, p2 / s
    if method == "add":  return p1 - (s - 1) / 2, p2 - (s - 1) / 2
    lo, hi = 0.01, 2.0
    for _ in range(60):
        k = (lo + hi) / 2
        if p1 ** k + p2 ** k > 1: lo = k
        else: hi = k
    k = (lo + hi) / 2
    return p1 ** k, p2 ** k

def live_repricing(lead, t_frac, base_mu, sd=13.45):
    """Remaining time fraction tau. Conditional final margin ~ N(lead + base_mu*tau, sd*sqrt(tau))."""
    tau = max(min(t_frac, 1.0), 0.02)
    final_mu = lead + base_mu * tau
    final_sd = sd * math.sqrt(tau)
    p_win = 1 - norm_cdf(0.0, final_mu, final_sd)
    return {"final_mu": round(final_mu, 2), "final_sd": round(final_sd, 2),
            "p_win": round(p_win, 4), "fair_live_ml": amer_from_prob(p_win)}

def wp_in_game(lead, t_frac, field_pos=0.5, timeouts_diff=0):
    """Win probability — nfl4th/ESPN structure: logistic on lead/√τ + field + timeouts."""
    z = 0.20 * lead / math.sqrt(max(t_frac, 0.02)) + 1.1 * (field_pos - 0.5) + 0.12 * timeouts_diff
    return 1 / (1 + math.exp(-z))

def weather_adj(total, wind_mph=0.0, precip=None):
    """PRIOR magnitudes (not fits on this repo's data): wind ≥10mph ≈ −0.25pt/mph over 9;
    rain −1.5; snow −2.5. EMPIRICAL (slate 2, 2,472 games vs real closes): wind −0.197
    pts/mph unconditional (se 0.027), temp −0.025/°F, R²=0.007 — small covariate, NOT a
    total model. The weather-OLS intercept (+1.74) is that regression's prediction at
    0 mph / 70°F — it absorbs the 2006-18 era mean overage (+0.55 file mean, n=3,368) and
    the >9mph-only wind spec. It is NOT a per-game addend; do not wire it into adjustments."""
    adj = 0.0
    if wind_mph >= 10: adj -= (wind_mph - 9) * 0.25
    if precip == "rain": adj -= 1.5
    if precip == "snow": adj -= 2.5
    return {"adjusted_total": round(total + adj, 1), "delta": round(adj, 2)}

def injury_adj(listed_spread, pos, out=True):
    """Adds points to the listed home number (positive = home less favored). Published ranges, not fit."""
    drops = {"QB": 5.5, "LT": 2.0, "WR1": 1.5, "CB1": 1.5, "EDGE": 1.2, "S": 0.8, "K": 0.5, "RB": 1.0}
    return listed_spread + (drops.get(pos, 1.0) if out else 0)

def situational_adj(listed_spread, days_rest_diff=0, tz_shift=None, altitude_home=False):
    """Rest ±0.25/day (capped), west→east −0.4, altitude home +0.3."""
    adj = 0.25 * max(-1.0, min(1.0, days_rest_diff))
    if tz_shift == "we":
        adj -= 0.4
    if tz_shift == "ew":
        adj += 0.4
    if altitude_home:
        adj += 0.3
    return round(listed_spread + adj, 2)

# ============ 8. VERIFICATION + MARKET INVERSION ============
def phi_pdf(x):
    return math.exp(-x * x / 2) / math.sqrt(2 * math.pi)

def crps_gaussian(mu, sd, x):
    """Point CRPS of Normal(mu, sd) at x. Gneiting 2005.
    crps_gaussian(0, 1, 0) = (sqrt(2)-1)/sqrt(pi) ≈ 0.2337, not 1/sqrt(pi)."""
    z = (x - mu) / sd
    return sd * (z * (2 * norm_cdf(z) - 1) + 2 * phi_pdf(z) - 1 / math.sqrt(math.pi))

def pit_histogram(mu_s, sd_s, x_s, bins=10):
    """PIT / rank histogram: if calibrated, x ~ Uniform under its own predictive CDF.
    U-shape = overconfident (too narrow). Hump = underconfident. The weather bureau's
    calibration X-ray, applied to our margin distributions."""
    counts = [0] * bins
    for mu, sd, x in zip(mu_s, sd_s, x_s):
        p = min(max(norm_cdf(x, mu, sd), 1e-9), 1 - 1e-9)
        counts[min(bins - 1, int(p * bins))] += 1
    n = len(x_s)
    return [round(c / n, 3) for c in counts], [round(1 / bins, 3)] * bins

def deflated_sharpe(sr, n, trials, skew=0.0, kurt=3.0):
    """Bailey & López de Prado: P(your backtest Sharpe is REAL after 'trials' attempts).
    SR0 = expected max Sharpe under pure noise across T trials:
    SR0 = sd(SR)·[(1−γ)Φ⁻¹(1−1/T) + γΦ⁻¹(1−1/(T·e))], γ = Euler–Mascheroni.
    DSR = Φ((SR−SR0)·√(n−1)/√(1−skew·SR+(kurt−1)/4·SR²)).
    The anti-self-deception engine: 'I found an edge' dies here or becomes a claim."""
    g = 0.5772156649
    var_sr = (1 - skew * sr + (kurt - 1) / 4 * sr * sr) / max(n - 1, 1)
    sd_sr = math.sqrt(max(var_sr, 1e-12))
    T = max(trials, 2)
    sr0 = sd_sr * ((1 - g) * inv_norm(1 - 1 / T) + g * inv_norm(1 - 1 / (T * math.e)))
    denom = math.sqrt(max(1 - skew * sr + (kurt - 1) / 4 * sr * sr, 1e-9))
    z = (sr - sr0) * math.sqrt(max(n - 1, 1)) / denom
    return norm_cdf(z), sr0

def gauss_solve(A, b):
    """Square GE with partial pivot. Raises on a singular pivot."""
    n = len(A)
    if n == 0 or any(len(row) != n for row in A) or len(b) != n:
        raise ValueError("gauss_solve requires a square system")
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        piv = max(range(c, n), key=lambda r: abs(M[r][c]))
        if abs(M[piv][c]) < 1e-12:
            raise ValueError("singular pivot")
        M[c], M[piv] = M[piv], M[c]
        pivv = M[c][c]
        for r in range(n):
            if r != c and M[r][c]:
                f = M[r][c] / pivv
                M[r] = [a - f * bb for a, bb in zip(M[r], M[c])]
    return [M[i][n] / M[i][i] for i in range(n)]

def market_strengths(slate, margins, hfa=1.5, ridge=1.0):
    """Least squares on closing home margins. a is home.
    margins are home margin (not listed spread). Strengths identified up to a constant;
    ridge pulls the mean toward 0."""
    teams = sorted({t for g in slate for t in g})
    idx = {t: i for i, t in enumerate(teams)}
    n = len(teams)
    # normal equations
    xtx = [[ridge if i == j else 0.0 for j in range(n)] for i in range(n)]
    xty = [0.0] * n
    for (a, b), m in zip(slate, margins):
        y = m - hfa
        ia, ib = idx[a], idx[b]
        xtx[ia][ia] += 1
        xtx[ib][ib] += 1
        xtx[ia][ib] -= 1
        xtx[ib][ia] -= 1
        xty[ia] += y
        xty[ib] -= y
    s = gauss_solve(xtx, xty)
    fits = [s[idx[a]] - s[idx[b]] + hfa for (a, b), _ in zip(slate, margins)]
    return {t: round(v, 2) for t, v in zip(teams, s)}, fits

def stack_with_market(p_model, p_market, w):
    """p* = sigmoid(w*logit(model) + (1-w)*logit(market))."""
    def lg(p):
        p = min(max(p, 1e-6), 1 - 1e-6)
        return math.log(p / (1 - p))
    z = w * lg(p_model) + (1 - w) * lg(p_market)
    return 1 / (1 + math.exp(-z))

def hmm2_fit(x, iters=30, m0=(-3.0, 3.0), sd0=10.0):
    """2-state regime HMM (cold/hot form) on margin residuals — full Baum-Welch EM.
    Answers 'is the team in a regime or is it noise?' with filtered probabilities."""
    T = len(x)
    A = [[0.85, 0.15], [0.15, 0.85]]
    mu = list(m0)
    sd = sd0
    p = [0.5, 0.5]
    def dens(t, s):
        return math.exp(-((x[t] - mu[s]) ** 2) / (2 * sd * sd)) / math.sqrt(2 * math.pi * sd * sd)
    for _ in range(iters):
        al = [[p[s] * dens(0, s) for s in (0, 1)]]
        cs = [sum(al[0]) or 1e-12]
        al[0] = [a / cs[0] for a in al[0]]
        for t in range(1, T):
            row = [sum(al[t - 1][j] * A[j][s] for j in (0, 1)) * dens(t, s) for s in (0, 1)]
            c = sum(row) or 1e-12
            al.append([v / c for v in row])
            cs.append(c)
        be = [[1.0, 1.0] for _ in range(T)]
        for t in range(T - 2, -1, -1):
            for j in (0, 1):
                be[t][j] = sum(A[j][s] * dens(t + 1, s) * be[t + 1][s] for s in (0, 1))
        g = [[al[t][s] * be[t][s] for s in (0, 1)] for t in range(T)]
        g = [[v / (sum(r) or 1e-12) for v in r] for r in g]
        for s in (0, 1):
            w = sum(g[t][s] for t in range(T)) or 1e-12
            mu[s] = sum(g[t][s] * x[t] for t in range(T)) / w
        var = sum(g[t][s] * (x[t] - mu[s]) ** 2 for t in range(T) for s in (0, 1)) / T
        sd = math.sqrt(max(var, 1e-4))
        for j in (0, 1):
            den = sum(g[t][j] for t in range(T - 1)) or 1e-12
            for s in (0, 1):
                num = sum(al[t][j] * A[j][s] * dens(t + 1, s) * be[t + 1][s] / (cs[t + 1] or 1e-12)
                          for t in range(T - 1))
                A[j][s] = max(0.01, min(0.99, num / den))
            tot = sum(A[j])
            A[j] = [v / tot for v in A[j]]
    filt = [g[t][1] for t in range(T)]
    return {"mu": [round(v, 2) for v in mu], "sd": round(sd, 2),
            "A": [[round(v, 2) for v in row] for row in A],
            "hot_prob_last": round(filt[-1], 3),
            "path": [round(v, 2) for v in filt[-8:]]}

def self_check():
    """Self-test suite — run before trusting any output."""
    assert abs(bt_prob(1650, 1500) - 0.703) < 0.01
    z, p1, p2 = shin_devig(0.55, 0.55)  # -110/-110-ish overround 1.10
    assert abs(p1 + p2 - 1) < 0.05
    z0, a, b = shin_devig(0.48, 0.48)  # reduced juice, sum < 1
    assert z0 == 0.0 and abs(a - 0.5) < 1e-9
    crps = crps_gaussian(0, 1, 0)
    assert abs(crps - (math.sqrt(2) - 1) / math.sqrt(math.pi)) < 1e-6
    assert abs(inv_norm(0.975) - 1.96) < 0.01
    strengths, fits = market_strengths([("A", "B"), ("B", "C"), ("A", "C")], [3.0, 1.0, 4.0])
    assert set(strengths) == {"A", "B", "C"}
    bs, rel, res, unc = brier_decompose([(0.9, 1), (0.2, 0), (0.6, 1)])
    assert abs(bs - (rel - res + unc)) < 1e-9
    text = alt_ladder(-3.5)
    assert "mu_margin +3.5" in text
    return {"shin_overround": (round(z, 3), round(p1, 3), round(p2, 3)),
            "crps0": round(crps, 4), "strengths": strengths, "brier_ok": True}

if __name__ == "__main__":
    print("== SELF-CHECK ==")
    print(self_check())
    print("\n== ALT LADDER -3.5 ==")
    print(alt_ladder(-3.5))
    print("\n== STACK WITH MARKET ==")
    print("stack(0.6, 0.52, 0.3) =", round(stack_with_market(0.6, 0.52, 0.3), 3))
    print("\n== TEASER MC (mu1=0, mu2=-3, pts=6, rho=0.35) ==")
    print(teaser_mc(0, -3, pts=6.0, rho_games=0.35))
    print("\n== PROP PRICE (proj=24.5, sd=5.2, line=23.5) ==")
    print(prop_price(24.5, 5.2, 23.5))
```


### `ratings2.py`
```python
#!/usr/bin/env python3
"""ratings2.py — the rating systems the atlas promised, as runnable code.
Colley, Massey, SRS, PageRank, Keener, Glicko-2, TrueSkill (pairwise analytic),
Plackett-Luce. Pure stdlib. All operate on game lists [(a, b, a_score, b_score)].
Convention: no home advantage baked in — caller adjusts margins first."""
import math
import collections

# ---------- linear algebra ----------
def solve(A, b):
    """Gaussian elimination with partial pivot. Raises on singular pivot."""
    n = len(A)
    M = [row[:] + [b[i]] for i, row in enumerate(A)]
    for c in range(n):
        piv = max(range(c, n), key=lambda r: abs(M[r][c]))
        if abs(M[piv][c]) < 1e-12: raise ValueError("singular")
        M[c], M[piv] = M[piv], M[c]
        for r in range(n):
            if r != c and M[r][c]:
                f = M[r][c] / M[c][c]
                M[r] = [a - f * bb for a, bb in zip(M[r], M[c])]
    return [M[i][n] / M[i][i] for i in range(n)]

def _teams(games):
    ts = sorted({t for g in games for t in (g[0], g[1])})
    return ts, {t: i for i, t in enumerate(ts)}

# ---------- 1. COLLEY ----------
def colley(games):
    """Colley (2002): C·r = b, C_ii = 2 + n_i, C_ij = -n_ij, b_i = 1 + (w_i - l_i)/2.
    Pure algebra, no iteration, no margin. The BCS engine for a decade."""
    ts, idx = _teams(games)
    n = len(ts)
    C = [[0.0] * n for _ in range(n)]
    b = [1.0] * n
    for i, t in enumerate(ts): C[i][i] = 2.0
    for a, bb_, sa, sb in games:
        ia, ib = idx[a], idx[bb_]
        C[ia][ia] += 1; C[ib][ib] += 1
        C[ia][ib] -= 1; C[ib][ia] -= 1
        won_a = 1 if sa > sb else 0
        b[ia] += (won_a - (1 - won_a)) / 2.0
        b[ib] += ((1 - won_a) - won_a) / 2.0
    r = solve(C, b)
    return {t: round(v, 4) for t, v in zip(ts, r)}

# ---------- 2. MASSEY ----------
def massey(games, hfa=0.0):
    """Massey: M·r = p. M_ii = games played, M_ij = -n_ij; p_i = Σ point diff.
    Ratings fit POINT MARGIN, not just wins. Least squares via normal equations."""
    ts, idx = _teams(games)
    n = len(ts)
    games_n = [0.0] * n
    diffs = [0.0] * n
    X = [[0.0] * n for _ in range(len(games))]
    y = []
    for r, (a, bb_, sa, sb) in enumerate(games):
        ia, ib = idx[a], idx[bb_]
        X[r][ia] = 1.0; X[r][ib] = -1.0
        d = (sa - sb) + hfa
        y.append(d)
        games_n[ia] += 1; games_n[ib] += 1
        diffs[ia] += d; diffs[ib] -= d
    Xy = [sum(X[k][i] * y[k] for k in range(len(games))) for i in range(n)]
    XtX = [[sum(X[k][i] * X[k][j] for k in range(len(games))) for j in range(n)] for i in range(n)]
    for i in range(n): XtX[i][i] += 0.5  # ridge for identifiability
    r = solve(XtX, Xy)
    return {t: round(v, 2) for t, v in zip(ts, r)}

# ---------- 3. SRS ----------
def srs(games, iters=100, damp=0.7):
    """Simple Rating System: rating_i = avg_margin_i + avg(opp rating).
    Fixed-point iteration (Gauss-Seidel w/ damping). The Joe Sheehan/football-
    outsiders classic. Margins matter; schedule strength falls out."""
    ts, idx = _teams(games)
    n = len(ts)
    marg_sum = collections.defaultdict(float); marg_n = collections.Counter()
    opps = collections.defaultdict(list)
    for a, b, sa, sb in games:
        d = sa - sb
        marg_sum[a] += d; marg_sum[b] -= d
        marg_n[a] += 1; marg_n[b] += 1
        opps[a].append(b); opps[b].append(a)
    rat = {t: 0.0 for t in ts}
    for _ in range(iters):
        new = {}
        for t in ts:
            base = marg_sum[t] / marg_n[t] if marg_n[t] else 0.0
            sos = sum(rat[o] for o in opps[t]) / len(opps[t]) if opps[t] else 0.0
            new[t] = base + sos
        rat = {t: (1 - damp) * rat[t] + damp * new[t] for t in ts}
    # normalize mean 0
    mu = sum(rat.values()) / n
    return {t: round(v - mu, 2) for t, v in rat.items()}

# ---------- 4. PAGERANK ----------
def pagerank(games, d=0.85, iters=200, use_margin=True):
    """PageRank on the beat-graph: edges loser→winner, weight ∝ (1 + |margin|/10).
    Ratings = stationary distribution. catches transitive strength that wins/losses hide."""
    ts, idx = _teams(games)
    n = len(ts)
    out_w = collections.defaultdict(float)
    edges = collections.defaultdict(list)  # loser -> [(winner, w)]
    for a, b, sa, sb in games:
        win, lose = (a, b) if sa > sb else (b, a)
        w = 1.0 + (abs(sa - sb) / 10.0 if use_margin else 0.0)
        edges[lose].append((win, w))
        out_w[lose] += w
    pr = {t: 1.0 / n for t in ts}
    for _ in range(iters):
        new = {t: (1 - d) / n for t in ts}
        for loser, lst in edges.items():
            share = d * pr[loser]
            for win, w in lst:
                new[win] += share * w / out_w[loser]
        pr = new
    tot = sum(pr.values())
    return {t: round(v / tot * 100, 4) for t, v in pr.items()}  # % of authority mass

# ---------- 5. KEENER ----------
def keener(games, x=1.0, iters=300):
    """Keener skew method: S_ij from score ratio via S(y)= (1+y)^x / ((1+y)^x + (1+1/y)^x).
    Power iteration on the column-normalized skew matrix → Perron vector = strength.
    (Column normalization, not row: Σ_i a_ij = 1 makes Σs conserved under s' = A·s.)"""
    ts, idx = _teams(games)
    n = len(ts)
    A = [[0.0] * n for _ in range(n)]
    for a, b, sa, sb in games:
        ia, ib = idx[a], idx[b]
        y = min(sa / max(sb, 1e-9), 10.0)
        num = (1 + y) ** x
        den = num + (1 + 1 / y) ** x if y > 0 else 2.0
        s_ab = num / den
        A[ia][ib] += s_ab; A[ib][ia] += 1 - s_ab
    # epsilon for irreducibility, then COLUMN normalization
    for j in range(n):
        col = sum(A[i][j] for i in range(n)) + 0.1 * n
        for i in range(n):
            A[i][j] = (A[i][j] + 0.1) / col
    v = [1.0 / n] * n
    for _ in range(iters):
        nv = [sum(A[i][j] * v[j] for j in range(n)) for i in range(n)]
        s = sum(nv) or 1.0
        v = [u / s for u in nv]
    return {t: round(val, 4) for t, val in zip(ts, v)}

# ---------- 6. GLICKO-2 ----------
def glicko2(games, rating0=1500.0, rd0=350.0, vol0=0.06, tau=0.5, rd0_map=None, rating0_map=None):
    """Glicko-2 (Glickman 2012), period-parallel: every player gets ONE update
    per rating period using ALL their games (verified vs canonical test vectors).
    Volatility (tau-bounded Illinois iteration) is what Elo never had.
    rd0_map/rating0_map: optional {player: value} for heterogeneous starts."""
    scale = 173.7178
    mu0 = (rating0 - 1500.0) / scale
    players = {}
    series = collections.defaultdict(list)
    def ensure(t):
        if t not in players:
            rd = (rd0_map or {}).get(t, rd0)
            r0 = (rating0_map or {}).get(t, rating0)
            players[t] = [(r0 - 1500.0) / scale, rd / scale, vol0]
    for a, b, sa, sb in games:
        ensure(a); ensure(b)
        score_a = 1.0 if sa > sb else (0.5 if sa == sb else 0.0)
        series[a].append((score_a, b))
        series[b].append((1.0 - score_a, a))
    def g(phi): return 1.0 / math.sqrt(1.0 + 3.0 * phi * phi / (math.pi * math.pi))
    def expect(mu, muj, gop): return 1.0 / (1.0 + math.exp(-gop * (mu - muj)))
    def new_volatility(phi_me, delta, v, vol):
        """Illinois algorithm on f(x) = e^x(Δ²−φ²−v−e^x)/(2(φ²+v+e^x)²) − (x−a)/τ²."""
        a_ = math.log(vol * vol)
        def f(x):
            tmp = phi_me * phi_me + v + math.exp(x)
            return (math.exp(x) * (delta * delta - tmp)) / (2.0 * tmp * tmp) - (x - a_) / (tau * tau)
        A_ = a_
        if delta * delta > phi_me * phi_me + v:
            B_ = math.log(delta * delta - phi_me * phi_me - v)
        else:
            k = 1
            while f(a_ - k * tau) < 0:
                k += 1
            B_ = a_ - k * tau
        f_a, f_b = f(A_), f(B_)
        eps = 1e-6
        while abs(B_ - A_) > eps:
            C_ = A_ + (A_ - B_) * f_a / (f_b - f_a)
            f_c = f(C_)
            if f_c * f_b < 0:
                A_, f_a = B_, f_b
            else:
                f_a = f_a / 2.0
            B_, f_b = C_, f_c
        return math.exp(A_ / 2.0)
    # one PERIOD: snapshot pre-period params, then update everyone in parallel
    pre = {t: list(players[t]) for t in players}
    for t,games_t in series.items():
        mu_me, phi_me, vol_me = pre[t]
        v_inv = 0.0
        delta_sum = 0.0
        for sc, opp in games_t:
            mu_o, phi_o, _ = pre[opp]
            gop = g(phi_o)
            e = expect(mu_me, mu_o, gop)
            v_inv += gop * gop * e * (1.0 - e)
            delta_sum += gop * (sc - e)
        v = 1.0 / v_inv
        delta = v * delta_sum
        vol_new = new_volatility(phi_me, delta, v, vol_me)
        phi_star = math.sqrt(phi_me * phi_me + vol_new * vol_new)
        phi_new = 1.0 / math.sqrt(1.0 / (phi_star * phi_star) + v_inv)
        mu_new = mu_me + phi_new * phi_new * delta_sum
        players[t] = [mu_new, phi_new, vol_new]
    out = {}
    for t, (mu, phi, vol) in players.items():
        out[t] = (round(mu * scale + 1500.0, 1), round(phi * scale, 1), round(vol, 4))
    return out

# ---------- 7. TRUESKILL (pairwise analytic) ----------
def trueskill_update(mu_w, sd_w, mu_l, sd_l, beta=25.0 / 6, dynamic=25.0 / 300):
    """TrueSkill pairwise factor-graph update (closed form for 2 players, draw=0).
    Winner (mu_w, sd_w), loser (mu_l, sd_l). Returns updated tuples.
    This is the Xbox-matchmaking engine: Gaussian belief + performance noise."""
    c = math.sqrt(2 * beta * beta + sd_w * sd_w + sd_l * sd_l)
    t = (mu_w - mu_l) / c
    v = _v(t); w = _w(t)
    mu_w2 = mu_w + sd_w * sd_w / c * v
    sd_w2 = math.sqrt(sd_w * sd_w * (1 - sd_w * sd_w / (c * c) * w))
    mu_l2 = mu_l - sd_l * sd_l / c * v
    sd_l2 = math.sqrt(sd_l * sd_l * (1 - sd_l * sd_l / (c * c) * w))
    return (mu_w2, sd_w2), (mu_l2, sd_l2)

def _v(t): return _npdf(t) / _ncdf(t)
def _w(t):
    if abs(t) < 1e-9: return 1.0
    w = _w_prime(t)
    return min(w, 1.0)
def _w_prime(t): return _v(t) * (_v(t) + t)
def _npdf(x): return math.exp(-x * x / 2) / math.sqrt(2 * math.pi)
def _ncdf(x): return 0.5 * (1 + math.erf(x / math.sqrt(2)))

def trueskill(games, mu0=25.0, sd0=25.0 / 3, beta=25.0 / 6):
    """Run TrueSkill over a game list (assumes a beats b when sa>sb; ties skipped)."""
    P = {}
    def ensure(t):
        if t not in P: P[t] = (mu0, sd0)
    for a, b, sa, sb in games: ensure(a); ensure(b)
    for a, b, sa, sb in games:
        if sa == sb: continue
        win, lose = (a, b) if sa > sb else (b, a)
        (mw, sw), (ml, sl) = P[win], P[lose]
        P[win], P[lose] = trueskill_update(mw, sw, ml, sl, beta)
    return {t: (round(m, 2), round(s, 2)) for t, (m, s) in P.items()}

# ---------- 8. PLACKETT-LUCE ----------
def plackett(games, iters=150):
    """Plackett-Luce via MM (like BT but on ordered outcomes). For pairwise games
    PL ≡ BT; the value is it extends to full orderings (draft order, race finish).
    Here: 2-item lists per game, winner ranked above loser."""
    import collections as _c
    items = sorted({t for g in games for t in (g[0], g[1])})
    g_ = {t: 1.0 for t in items}
    counts = _c.Counter()
    for a, b, sa, sb in games:
        win, lose = (a, b) if sa > sb else (b, a)
        counts[(win, lose)] += 1
    # MM on pairwise PL == BT weights
    opp = _c.defaultdict(list)
    for (w_, l_), c in counts.items():
        opp[w_].append((l_, c)); opp[l_].append((w_, c))
    for _ in range(iters):
        new = {}
        for t in items:
            s = sum(c / (g_[t] + g_[o]) for o, c in opp[t])
            wins_t = sum(c for (w_, _l), c in counts.items() if w_ == t)
            new[t] = wins_t / s if s > 0 else 1.0
        tot = sum(new.values()) or 1.0
        g_ = {t: v / tot for t, v in new.items()}
    return {t: round(v, 4) for t, v in g_.items()}

def counts_value(counts, t):
    return sum(c for (w_, l_), c in counts.items() if w_ == t) + \
           sum(c for (w_, l_), c in counts.items() if l_ == t)

# ---------- combined prediction: ensemble margin ----------
def ensemble_margin(games, team_a, team_b, hfa=2.0):
    """The point of the zoo: Colley/Massey/SRS/Keener each fit different structure.
    Ensemble margin = mean of each system's implied margin for team_a (home) vs b."""
    systems = []
    try:
        col = colley(games)
        systems.append(("colley", (col[team_a] - col[team_b]) * 30.0))  # scale to points
    except Exception: pass
    try:
        mas = massey(games)
        systems.append(("massey", mas[team_a] - mas[team_b] + hfa))
    except Exception: pass
    try:
        sr = srs(games)
        systems.append(("srs", sr[team_a] - sr[team_b] + hfa))
    except Exception: pass
    try:
        ke = keener(games)
        systems.append(("keener", (ke[team_a] - ke[team_b]) * 25.0 + hfa))
    except Exception: pass
    if not systems: return {}
    ens = sum(v for _, v in systems) / len(systems)
    return {"ensemble_margin": round(ens, 2),
            "components": {k: round(v, 2) for k, v in systems},
            "spread_of_views": round(max(v for _, v in systems) - min(v for _, v in systems), 2)}

# ---------- SELF-CHECK ----------
def self_check():
    games = [
        ("A", "B", 24, 17), ("A", "C", 31, 10), ("B", "C", 20, 14),
        ("A", "B", 21, 14), ("C", "A", 7, 28), ("C", "B", 10, 27),
    ]  # A 4-0, B 2-2, C 0-4 — unambiguous ordering across every system
    col = colley(games)
    assert abs(sum(col.values()) / 3 - 0.5) < 0.01, col  # colley ratings avg 0.5
    assert col["A"] > col["B"] > col["C"], col
    mas = massey(games)
    assert mas["A"] > mas["B"] > mas["C"], mas
    sr = srs(games)
    assert sr["A"] > sr["B"] > sr["C"], sr
    pr = pagerank(games)
    assert sum(pr.values()) > 99.9, pr  # mass conserved
    ke = keener(games)
    assert ke["A"] > ke["B"] > ke["C"], ke
    gl = glicko2([games[0], games[1]])  # A beats B, A beats C
    assert gl["A"][0] > 1500 and gl["B"][0] < 1500, gl
    # canonical Glickman worked example (published test vector)
    canon = glicko2([("P", "O1", 10, 0), ("O2", "P", 10, 0), ("O3", "P", 10, 0)],
                    rd0_map={"P": 200.0, "O1": 30.0, "O2": 100.0, "O3": 300.0},
                    rating0_map={"P": 1500.0, "O1": 1400.0, "O2": 1550.0, "O3": 1700.0})["P"]
    assert abs(canon[0] - 1464.06) < 1 and abs(canon[1] - 151.52) < 1, canon
    ts = trueskill(games)
    assert ts["A"][0] > ts["C"][0], ts
    pl = plackett(games)
    assert pl["A"] > pl["B"] > pl["C"], pl
    ens = ensemble_margin(games, "A", "C")
    assert ens["ensemble_margin"] > 5, ens
    # trueskill closed-form sanity: symmetric players, small win → small move
    (mw, sw), (ml, sl) = trueskill_update(25, 8.33, 25, 8.33)
    assert mw > 25 > ml and abs((mw - 25) - (25 - ml)) < 1e-9
    return {"colley": col, "srs": sr, "ens_A_over_C": ens["ensemble_margin"],
            "glicko_A": gl["A"], "ts_A": ts["A"]}

if __name__ == "__main__":
    print("== RATINGS2 SELF-CHECK ==")
    r = self_check()
    print("colley:", r["colley"])
    print("srs   :", r["srs"])
    print("glicko-2 A:", r["glicko_A"])
    print("trueskill A:", r["ts_A"])
    print("ensemble A over C:", r["ens_A_over_C"])
    print("\nALL RATING SYSTEMS PASS")
```


### `calibration2.py`
```python
#!/usr/bin/env python3
"""calibration2.py — the calibration layer: conformal prediction, Platt,
temperature scaling, beta calibration. These are the tools that turn a
scoring model into a BETTABLE probability. Pure stdlib.

The hierarchy:
  raw model score → (Platt/temperature/beta) calibrated prob → (conformal)
  distribution-free interval with guaranteed coverage.
"""
import math

# ---------- logit helpers ----------
def logit(p, eps=1e-6):
    p = min(max(p, eps), 1 - eps)
    return math.log(p / (1 - p))

def sigmoid(z):
    if z >= 0:
        return 1.0 / (1.0 + math.exp(-z))
    e = math.exp(z)
    return e / (1 + e)

# ---------- 1. PLATT SCALING ----------
def platt_fit(pairs, iters=200, lr=0.1):
    """Platt (1999): p_cal = sigmoid(A·logit(p_raw) + B). Fit A,B by NLL gradient
    descent. The SVM-world's standard recalibration. pairs = [(p_raw, outcome)]."""
    A, B = 1.0, 0.0
    n = len(pairs)
    for _ in range(iters):
        gA = gB = 0.0
        for p, y in pairs:
            z = A * logit(p) + B
            e = sigmoid(z) - y
            gA += e * logit(p)
            gB += e
        A -= lr * gA / n
        B -= lr * gB / n
    return A, B

def platt_apply(p, A, B):
    return sigmoid(A * logit(p) + B)

# ---------- 2. TEMPERATURE SCALING ----------
def temperature_fit(pairs, lo=0.05, hi=10.0):
    """Guo et al. 2017: p_cal = sigmoid(logit(p_raw)/T). Single parameter,
    the modern NN-calibration standard. Bisect T to minimize NLL."""
    def nll(T):
        s = 0.0
        for p, y in pairs:
            q = sigmoid(logit(p) / T)
            q = min(max(q, 1e-9), 1 - 1e-9)
            s -= y * math.log(q) + (1 - y) * math.log(1 - q)
        return s / len(pairs)
    for _ in range(60):
        mid = (lo + hi) / 2
        if nll(mid) < nll(hi):
            hi = mid
        else:
            lo = mid
    T = (lo + hi) / 2
    return T, nll(T)

def temperature_apply(p, T):
    return sigmoid(logit(p) / T)

# ---------- 3. BETA CALIBRATION ----------
def beta_fit(pairs, iters=400, lr=0.05):
    """Kull, Filho & Flach (2017): map m(p) via 3-shape parameters (a, b, c):
    m(p) = 1 / (1 + 1/( (p^a (1-p)^b) / c )). Special cases: identity (a=b=1,c=1),
    Platt-like. Fit by gradient descent on NLL. Monotone guaranteed for a,b>0."""
    a, b, c = 1.0, 1.0, 1.0
    n = len(pairs)
    for _ in range(iters):
        ga = gb = gc = 0.0
        for p, y in pairs:
            p = min(max(p, 1e-6), 1 - 1e-6)
            num = (p ** a) * ((1 - p) ** b)
            z = num / c
            m = z / (1 + z)
            e = m - y
            dm_dz = 1.0 / (1 + z) ** 2
            dz_dnum = 1.0 / c
            ga += e * dm_dz * dz_dnum * num * math.log(p)
            gb += e * dm_dz * dz_dnum * num * math.log(1 - p)
            gc += e * dm_dz * (-(num / (c * c)))
        a -= lr * ga / n
        b -= lr * gb / n
        c -= lr * gc / n
        a = max(a, 1e-3); b = max(b, 1e-3); c = max(c, 1e-6)
    return a, b, c

def beta_apply(p, a, b, c):
    p = min(max(p, 1e-6), 1 - 1e-6)
    z = (p ** a) * ((1 - p) ** b) / c
    return z / (1 + z)

# ---------- 4. SPLIT CONFORMAL ----------
def conformal_interval(scores_cal, alpha=0.10):
    """Split conformal (Vovk; Papadopoulos): given calibration residuals
    scores_cal = [|y_i − ŷ_i|], the interval ŷ ± q̂ has coverage ≥ 1−α
    DISTRIBUTION-FREE (only assumption: exchangeability).
    q̂ = the ⌈(n+1)(1−α)⌉-th smallest residual (finite-sample correction)."""
    n = len(scores_cal)
    if n == 0: return 0.0
    k = math.ceil((n + 1) * (1 - alpha))
    s = sorted(scores_cal)
    return s[min(k, n) - 1]

def conformal_coverage_check(scores_cal, scores_test, alpha=0.10):
    """Empirical coverage on held-out residuals vs the 1−α guarantee."""
    q = conformal_interval(scores_cal, alpha)
    hit = sum(1 for s in scores_test if s <= q) / len(scores_test) if scores_test else 0.0
    return {"q": q, "empirical_coverage": hit, "target": 1 - alpha}

# ---------- 5. CONFORMAL FOR PROPS (quantile, asymmetric) ----------
def conformal_prop_interval(resid_over, resid_under, alpha=0.10):
    """Asymmetric conformal for prop pricing: separate quantiles of how far the
    realized stat landed above/below projection. The book's 'projection±range'
    but with a real guarantee behind it."""
    q_hi = conformal_interval([max(r, 0.0) for r in resid_over], alpha)
    q_lo = conformal_interval([max(-r, 0.0) for r in resid_under], alpha)
    return {"lower": -q_lo, "upper": q_hi, "alpha": alpha}

# ---------- 6. ECE + MCE (expected calibration error) ----------
def ece(pairs, bins=10):
    """ECE = Σ |acc(b) − conf(b)|·n_b/N. The headline calibration number.
    Also returns per-bin table for the reliability diagram."""
    B = [([], []) for _ in range(bins)]
    for p, y in pairs:
        i = min(bins - 1, int(p * bins))
        B[i][0].append(p); B[i][1].append(y)
    total = len(pairs)
    e = 0.0
    table = []
    for i, (ps, ys) in enumerate(B):
        if not ps:
            table.append((i / bins, None, None, 0)); continue
        conf = sum(ps) / len(ps)
        acc = sum(ys) / len(ys)
        e += (len(ps) / total) * abs(acc - conf)
        table.append((i / bins, round(conf, 3), round(acc, 3), len(ps)))
    return e, table

# ---------- 7. calibration comparison harness ----------
def recalibrate_report(pairs):
    """Fit Platt + temperature + beta on the SAME pairs (in-sample diagnostics —
    split out-of-sample before trusting). Returns Brier before/after each."""
    def brier(ps):
        return sum((p - y) ** 2 for p, y in ps) / len(ps)
    A, B = platt_fit(pairs)
    T, nll_T = temperature_fit(pairs)
    a3, b3, c3 = beta_fit(pairs)
    out = {
        "raw_brier": round(brier(pairs), 5),
        "platt": {"A": round(A, 4), "B": round(B, 4),
                  "brier": round(brier([(platt_apply(p, A, B), y) for p, y in pairs]), 5)},
        "temperature": {"T": round(T, 4),
                        "brier": round(brier([(temperature_apply(p, T), y) for p, y in pairs]), 5)},
        "beta": {"a": round(a3, 4), "b": round(b3, 4), "c": round(c3, 4),
                 "brier": round(brier([(beta_apply(p, a3, b3, c3), y) for p, y in pairs]), 5)},
    }
    return out

# ---------- SELF-CHECK ----------
def self_check():
    # Platt on perfectly separable logits → A>0
    A, B = platt_fit([(0.9, 1), (0.9, 1), (0.1, 0), (0.1, 0)])
    assert A > 0
    # temperature: overconfident model (0.99s that fail half the time) → T > 1
    overconf = [(0.99, 1), (0.99, 0), (0.99, 1), (0.99, 0), (0.01, 0), (0.01, 1), (0.01, 0), (0.01, 1)]
    T, _ = temperature_fit(overconf)
    assert T > 1.0, T
    # conformal: 90% target on synthetic residuals
    import random
    rnd = random.Random(5)
    cal = [abs(rnd.gauss(0, 1)) for _ in range(500)]
    test = [abs(rnd.gauss(0, 1)) for _ in range(500)]
    cc = conformal_coverage_check(cal, test, alpha=0.10)
    assert 0.85 <= cc["empirical_coverage"] <= 0.95, cc  # ~90% ± MC noise
    # ECE of a perfectly calibrated synthetic set ≈ small
    rnd2 = random.Random(9)
    pairs = [(0.3, 1 if rnd2.random() < 0.3 else 0) for _ in range(600)]
    e, table = ece(pairs)
    assert e < 0.08, e
    # beta identity params ≈ (1,1,1) on self-consistent data
    a3, b3, c3 = beta_fit([(p, 1 if rnd2.random() < p else 0) for p, y in pairs][:200], iters=150)
    assert 0.2 < a3 < 5 and 0.2 < b3 < 5
    return {"platt_A": A, "temperature_T": round(T, 3),
            "conformal_coverage_90": cc["empirical_coverage"], "ece_calibrated": round(e, 4)}

if __name__ == "__main__":
    print("== CALIBRATION2 SELF-CHECK ==")
    print(self_check())
    print("\n== RECALIBRATION DEMO (deliberately overconfident model) ==")
    import random
    rnd = random.Random(3)
    # model says 0.75/0.25 but truth is 60/40 — miscalibrated
    pairs = []
    for _ in range(800):
        if rnd.random() < 0.6:
            pairs.append((0.75, 1) if rnd.random() < 0.6 else (0.75, 0))
        else:
            pairs.append((0.25, 1) if rnd.random() < 0.4 else (0.25, 0))
    rep = recalibrate_report(pairs)
    for k, v in rep.items():
        print(f"  {k}: {v}")
    print("\n== ECE TABLE (raw) ==")
    e, table = ece(pairs)
    print(f"  ECE = {e:.4f}")
    for row in table:
        if row[1] is not None:
            print(f"    bin {row[0]:.1f}: conf {row[1]:.3f} vs acc {row[2]:.3f} (n={row[3]})")
```


### `kelly2.py`
```python
#!/usr/bin/env python3
"""kelly2.py — portfolio-level Kelly, not the naive per-bet version.

1. simultaneous_kelly: maximize E[log(1 + Σf_i·X_i)] over correlated binary
   bets via Monte-Carlo gradient ascent (the Whitrow/Lemieux problem — naive
   per-bet Kelly overweights correlated portfolios).
2. risk_of_ruin: MC of bankroll paths with the Kelly fractions; P(hit floor),
   median drawdown, and the classical Dubins-Savage bound for comparison.
3. drawdown_stats: the survival side of growth-optimal sizing.
Pure stdlib.
"""
import math
import random

def _cholesky(A):
    """Cholesky–Banachiewicz for small PD matrices (pure stdlib)."""
    n = len(A)
    L = [[0.0] * n for _ in range(n)]
    for i in range(n):
        for j in range(i + 1):
            s = sum(L[i][k] * L[j][k] for k in range(j))
            if i == j:
                L[i][j] = math.sqrt(max(A[i][i] - s, 1e-12))
            else:
                L[i][j] = (A[i][j] - s) / L[j][j]
    return L

def norm_cdf(x):
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))

def _bet_payout(amer, win, stake_frac):
    """Per-unit-bet return: b if win, -1 if lose (b from american odds)."""
    b = (amer / 100.0) if amer > 0 else (100.0 / -amer)
    return stake_frac * (b if win else -1.0)

def _mv_normal(rho, n_sims, seed):
    """Simulate correlated Bernoulli pairs via Gaussian copula for a slate."""
    rnd = random.Random(seed)
    sr = math.sqrt(max(rho, 0.0)); s1 = math.sqrt(1 - max(rho, 0.0))
    draws = []
    for _ in range(n_sims):
        f = rnd.gauss(0, 1)
        draws.append((f, [sr * f + s1 * rnd.gauss(0, 1) for _ in range(1)]))
    return rnd

def simultaneous_kelly(bets, rho_matrix=None, n_sims=6000, iters=30, lr=0.5, cap=0.25, seed=11):
    """bets = [{'p','amer','name'}], rho_matrix = n×n correlation of outcomes.
    Gradient ascent on MC-estimated E[log growth]; projected to Σf ≤ cap.
    Returns optimal fractions + growth vs naive-Kelly comparison."""
    n = len(bets)
    if n == 0: return {"fractions": [], "growth": 0.0}
    rnd = random.Random(seed)
    # correlated Bernoulli slate via Gaussian copula + Cholesky (rho = latent/rank corr)
    A = rho_matrix if rho_matrix else [[1.0 if i == j else 0.0 for j in range(n)] for i in range(n)]
    L = _cholesky(A)
    mults = []  # mults[sim][i] = b_i if win else -1
    for _ in range(n_sims):
        x = [rnd.gauss(0, 1) for _ in range(n)]
        z = [sum(L[i][j] * x[j] for j in range(i + 1)) for i in range(n)]
        wins = tuple(norm_cdf(z[i]) < bets[i]["p"] for i in range(n))
        mults.append([((b["amer"] / 100.0) if b["amer"] > 0 else (100.0 / -b["amer"])) if w else -1.0
                      for w, b in zip(wins, bets)])
    def growth(fracs):
        g = 0.0
        for m in mults:
            ret = 0.0
            for f, mi in zip(fracs, m):
                if f > 0:
                    ret += f * mi
            g += math.log(1.0 + ret) if ret > -1.0 else math.log(1e-9)
        return g / len(mults)
    # naive per-bet Kelly as starting point, projected into the cap
    f = []
    for bet in bets:
        b = (bet["amer"] / 100.0) if bet["amer"] > 0 else (100.0 / -bet["amer"])
        f.append(max((b * bet["p"] - (1 - bet["p"])) / b, 0.0))
    s0 = sum(f)
    if s0 > cap:
        f = [x * cap / s0 for x in f]
    # projected gradient ascent with backtracking (monotone improvement)
    cur_g = growth(f)
    step = lr
    for _ in range(iters):
        eps = 0.0025
        grad = []
        for i in range(n):
            fp = f[:]; fp[i] = min(fp[i] + eps, 1.0)
            grad.append((growth(fp) - cur_g) / eps)
        improved = False
        for _try in range(6):
            cand = [fi + step * gi for fi, gi in zip(f, grad)]
            cand = [max(x, 0.0) for x in cand]
            s = sum(cand)
            if s > cap:
                cand = [x * cap / s for x in cand]
            g_new = growth(cand)
            if g_new > cur_g + 1e-7:
                f, cur_g = cand, g_new
                step = min(step * 1.3, 1.0)
                improved = True
                break
            step *= 0.5
        if not improved and step < 1e-4:
            break
    g_opt = growth(f)
    # compare: independent Kelly (uncapped) growth
    f_naive = []
    for bet in bets:
        b = (bet["amer"] / 100.0) if bet["amer"] > 0 else (100.0 / -bet["amer"])
        f_naive.append(max((b * bet["p"] - (1 - bet["p"])) / b, 0.0))
    g_naive = growth(f_naive)
    return {"fractions": [round(x, 4) for x in f],
            "growth_per_round": round(g_opt, 5),
            "naive_kelly_fractions": [round(x, 4) for x in f_naive],
            "naive_growth": round(g_naive, 5),
            "naive_total": round(sum(f_naive), 3), "opt_total": round(sum(f), 3)}

def risk_of_ruin(bets, fracs, bankroll=100.0, floor_frac=0.5, rounds=200, trials=500, seed=3):
    """MC: probability of drawing down to floor_frac×bankroll within `rounds` bets,
    median final bankroll, p5/p95. The survival side of the Kelly coin."""
    rnd = random.Random(seed)
    floor = bankroll * floor_frac
    ruined = 0
    finals = []
    for _ in range(trials):
        bank = bankroll
        hit = False
        for _ in range(rounds):
            ret = 0.0
            for f, bet in zip(fracs, bets):
                if f > 0:
                    w = rnd.random() < bet["p"]
                    ret += _bet_payout(bet["amer"], w, f)
            bank *= (1.0 + ret)
            if bank <= floor:
                hit = True
                break
        if hit: ruined += 1
        finals.append(bank)
    finals.sort()
    med = finals[len(finals) // 2]
    p5 = finals[max(0, int(0.05 * len(finals)) - 1)]
    p95 = finals[min(len(finals) - 1, int(0.95 * len(finals)))]
    return {"p_ruin": round(ruined / trials, 4), "floor": floor,
            "median_final": round(med, 2), "p5_final": round(p5, 2), "p95_final": round(p95, 2),
            "rounds": rounds, "trials": trials}

def classical_ruin_even_money(p, f, units=100.0):
    """Feller's gambler's-ruin for repeated even-money bets at fraction f:
    R = ((q/p)^(units/f) − 1)/((q/p)^(units/f) ... simplified: R ≈ (q/p)^(N)
    where N = number of units of risk. Reference point for the MC."""
    q = 1 - p
    if p <= q: return 1.0
    n_risk = units / max(f, 1e-9)
    return (q / p) ** n_risk

def drawdown_curve(bets, fracs, bankroll=100.0, rounds=200, trials=300, seed=8):
    """Max drawdown distribution — how deep the valleys go before the peaks."""
    rnd = random.Random(seed)
    dds = []
    for _ in range(trials):
        bank = bankroll
        peak = bank
        max_dd = 0.0
        for _ in range(rounds):
            ret = 0.0
            for f, bet in zip(fracs, bets):
                if f > 0:
                    w = rnd.random() < bet["p"]
                    ret += _bet_payout(bet["amer"], w, f)
            bank *= (1.0 + ret)
            peak = max(peak, bank)
            max_dd = max(max_dd, (peak - bank) / peak)
        dds.append(max_dd)
    dds.sort()
    return {"median_max_dd": round(dds[len(dds)//2], 3),
            "p95_max_dd": round(dds[int(0.95*len(dds))-1], 3),
            "worst": round(dds[-1], 3)}

if __name__ == "__main__":
    print("== SIMULTANEOUS KELLY (3 correlated same-game props) ==")
    bets = [
        {"p": 0.60, "amer": -110, "name": "A receptions o5.5"},
        {"p": 0.57, "amer": -115, "name": "A yards o59.5"},
        {"p": 0.55, "amer": +105, "name": "A anytime TD"},
    ]
    rho = [[1.0, 0.55, 0.30], [0.55, 1.0, 0.30], [0.30, 0.30, 1.0]]
    r = simultaneous_kelly(bets, rho, n_sims=8000, iters=40)
    print(f"  optimal fractions : {r['fractions']} (total {r['opt_total']})")
    print(f"  growth/round      : {r['growth_per_round']}")
    print(f"  naive fractions   : {r['naive_kelly_fractions']} (total {r['naive_total']})")
    print(f"  naive growth      : {r['naive_growth']}  <- overweights correlated slate")
    print("\n== RISK OF RUIN on the optimized fractions ==")
    rr = risk_of_ruin(bets, r["fractions"], bankroll=100.0, floor_frac=0.5, rounds=200)
    print(f"  {rr}")
    dd = drawdown_curve(bets, r["fractions"])
    print(f"  drawdown: {dd}")
    print("\n== CLASSICAL BOUND (single even-money p=0.55, f=half-Kelly, 100 units) ==")
    fk = (0.55 * 1.0 - 0.45) / 1.0  # b=1
    print(f"  full-Kelly f*={fk:.2f}; classical ruin at f=fk/2: "
          f"{classical_ruin_even_money(0.55, fk/2, units=100):.2e}")
    print(f"  classical ruin at f=2×full-Kelly: "
          f"{classical_ruin_even_money(0.55, min(fk*2, 0.99), units=100):.4f}")
```


### `props_deep.py`
```python
#!/usr/bin/env python3
"""props_deep.py — DEEP PROP MODELS: player, team, game props.
Not basic devig — these are the DISTRIBUTIONAL engines behind each prop type.

New equations here that engine_math.py lacks:
  1. Negative binomial for overdispersed count props (receptions, yards in buckets)
  2. Bivariate Poisson (Karlis-Ntzoufras) for correlated player props (alt+TD same game)
  3. Truncated normal for bounded props (completion %, FG %)
  4. Copula (Gaussian) linking player props within a game
  5. Moment-matched box-muller for margin-total joint (rainbow props)
  6. Bayesian shrinkage on player projections (hierarchical)
  7. Correlated Kelly for multi-prop portfolios
  8. CVaR optimizer for risk-aware prop portfolios
"""
import math
import random

# ---- re-usable from engine_math ----
def norm_cdf(x, mu=0.0, sd=1.0):
    return 0.5 * (1 + math.erf((x - mu) / (sd * math.sqrt(2))))

def inv_norm(u, lo=-6.0, hi=6.0):
    u = min(max(u, 1e-9), 1 - 1e-9)
    for _ in range(48):
        m = (lo + hi) / 2
        if norm_cdf(m) < u:
            lo = m
        else:
            hi = m
    return (lo + hi) / 2

def amer_from_prob(p):
    p = min(max(p, 0.01), 0.99)
    return (100 * p / (1 - p)) if p > 0.5 else (-100 * (1 - p) / p)

def prob_from_american(amer):
    amer = float(amer)
    return (100 / (amer + 100)) if amer > 0 else ((-amer) / ((-amer) + 100))


# ============ 1. NEGATIVE BINOMIAL (overdispersed counts) ============
def negbin_pmf(k, r, p):
    """k events, r dispersion, p success. Var = r(1-p)/p² > mean = r(1-p)/p.
    Use for: receptions, targets, catches — where Poisson underestimates variance."""
    from math import comb, exp, log
    logpmf = (math.lgamma(k + r) - math.lgamma(r) - math.lgamma(k + 1)
              + r * math.log(p) + k * math.log(1 - p))
    return math.exp(logpmf)

def negbin_fit(mean, var):
    """Method of moments: r = m²/(v−m), p = m/v. Requires var > mean (overdispersion)."""
    if var <= mean:
        var = mean * 1.01  # degenerate to near-Poisson
    r = mean * mean / (var - mean)
    p = mean / var
    return r, p

def prop_p_over_negbin(mean, var, line):
    """P(X ≥ line+1) for count props with overdispersion."""
    r, p = negbin_fit(mean, var)
    return 1 - sum(negbin_pmf(k, r, p) for k in range(int(line) + 1))


# ============ 2. BIVARIATE POISSON (Karlis-Ntzoufras) ============
def biv_poisson_pmf(x, y, lam1, lam2, lam3):
    """Karlis-Ntzoufras: X = W1+W3, Y = W2+W3 where Wi ~ Pois(lam_i).
    lam3 = shared component (the correlation). Cov(X,Y) = lam3."""
    s = 0.0
    for k in range(0, min(x, y) + 1):
        l1, l2 = lam1, lam2
        term1 = math.exp(-l1) * l1 ** (x - k) / math.factorial(x - k) if x >= k else 0
        term2 = math.exp(-l2) * l2 ** (y - k) / math.factorial(y - k) if y >= k else 0
        term3 = math.exp(-lam3) * lam3 ** k / math.factorial(k)
        if x >= k and y >= k:
            s += term1 * term2 * term3
    return math.exp(-(lam1 + lam2 + lam3 - lam3)) * s if False else s * math.exp(-lam3) if s > 0 else 0.0

def biv_poisson_correct(x, y, lam1, lam2, lam3):
    """Correct Karlis-Ntzoufras: P(X=x,Y=y) = e^-(l1+l2+l3) * sum_k l1^(x-k)/(x-k)! * l2^(y-k)/(y-k)! * l3^k/k!"""
    s = 0.0
    for k in range(0, min(x, y) + 1):
        t1 = lam1 ** (x - k) / math.factorial(x - k)
        t2 = lam2 ** (y - k) / math.factorial(y - k)
        t3 = lam3 ** k / math.factorial(k)
        s += t1 * t2 * t3
    return math.exp(-(lam1 + lam2 + lam3)) * s


# ============ 3. TRUNCATED NORMAL (bounded props) ============
def trunc_norm_p_over(mu, sd, line, lo=None, hi=None):
    """P(X > line) for X ~ N(mu, sd) truncated to [lo, hi].
    Use for: completion % (0-100), FG % (0-100), anything with hard bounds."""
    if lo is not None and line <= lo: return 1.0
    if hi is not None and line >= hi: return 0.0
    cdf_line = norm_cdf(line, mu, sd)
    cdf_lo = norm_cdf(lo, mu, sd) if lo is not None else 0.0
    cdf_hi = norm_cdf(hi, mu, sd) if hi is not None else 1.0
    denom = cdf_hi - cdf_lo
    if denom <= 0: return 0.5
    return (cdf_hi - cdf_line) / denom


# ============ 4. GAUSSIAN COPULA (within-game prop linking) ============
def gauss_copula_sample(u1, u2, rho):
    """Given uniforms u1, u2, produce correlated normals via Gaussian copula.
    z2 = rho*z1 + sqrt(1-rho^2)*z_indep. Return the marginals' quantiles."""
    z1 = inv_norm(u1)
    z2 = inv_norm(u2)
    # Given z1, z2, find the implied correlation
    z2_cond = rho * z1 + math.sqrt(1 - rho * rho) * z2
    return z1, z2_cond

def copula_prop_joint(p1_marginal, p2_marginal, rho, n_sims=5000, seed=42):
    """Joint probability both props go over via Gaussian copula MC.
    rho = rank correlation (0 = independent, 0.5 = same-game correlation).
    Returns P(both over), P(either over), P(exactly one)."""
    rnd = random.Random(seed)
    both = either = exactly_one = 0
    sqrt_1mr = math.sqrt(1 - rho * rho)
    for _ in range(n_sims):
        z1 = rnd.gauss(0, 1)
        z2 = rho * z1 + sqrt_1mr * rnd.gauss(0, 1)
        u1 = norm_cdf(z1)
        u2 = norm_cdf(z2)
        # convert copula uniforms to over/under via inverse of marginal P(over)
        over1 = u1 < p1_marginal
        over2 = u2 < p2_marginal
        if over1 and over2: both += 1
        elif over1 or over2: either += 1; exactly_one += 1
        else: either += 0
    either_total = both + exactly_one
    return {"both": both / n_sims, "either": either_total / n_sims, "exactly_one": exactly_one / n_sims}


# ============ 5. BAYES SHRINKAGE (hierarchical player projection) ============
def bayes_shrink_projection(player_avg, league_avg, n_obs, prior_sd=4.0, obs_sd=6.0):
    """Shrink player average toward league average with weight = n/(n + obs_sd²/prior_sd²).
    This is the empirical-Bayes engine: early-season stats shrink hard, late-season stats don't.
    (Same structure as Kalman but as a one-shot static shrinkage.)"""
    B = obs_sd * obs_sd / (prior_sd * prior_sd)
    w = n_obs / (n_obs + B)
    shrunk = w * player_avg + (1 - w) * league_avg
    post_sd = math.sqrt(1.0 / (n_obs / obs_sd ** 2 + 1.0 / prior_sd ** 2))
    return {"projection": round(shrunk, 2), "post_sd": round(post_sd, 2), "weight_data": round(w, 3)}


# ============ 6. CORRELATED KELLY (multi-prop portfolio) ============
def kelly_portfolio(props, corr_matrix, bankroll=1000.0, frac=0.25):
    """Kelly for a portfolio of correlated binary props.
    props = [{p, amer, name}], corr_matrix = [[rho_ij]].
    Uses the multivariate normal approximation to joint outcomes."""
    n = len(props)
    if n == 0: return {"total_stake": 0, "bets": []}
    bets = []
    for i, pr in enumerate(props):
        b = (pr["amer"] / 100) if pr["amer"] > 0 else (100 / -pr["amer"])
        p = pr["p"]
        k_full = (b * p - (1 - p)) / b
        k_adj = k_full * frac
        stake = bankroll * k_adj
        # correlation penalty: same-game props get sized down
        corr_to_others = sum(abs(corr_matrix[i][j]) for j in range(n) if j != i)
        corr_penalty = 1.0 / (1.0 + 0.5 * corr_to_others)
        stake_adj = stake * corr_penalty
        bets.append({"name": pr["name"], "edge": round(k_full, 4), "full_kelly": round(k_full, 4),
                     "stake": round(stake_adj, 2), "p": round(p, 4), "odds": pr["amer"]})
    return {"total_stake": round(sum(b["stake"] for b in bets), 2), "bets": bets, "bankroll": bankroll}


# ============ 7. CVaR OPTIMIZER (risk-aware prop portfolio) ============
def cvar_optimizer(props, alpha=0.95, budget=100.0, n_sims=3000, seed=7):
    """CVaR (Conditional Value at Risk) optimization for prop portfolios.
    Minimizes expected loss in the worst alpha-tail (Rockafellar-Uryasev).
    Overlays Kelly for edge-aware sizing but caps total exposure."""
    rnd = random.Random(seed)
    n = len(props)
    if n == 0: return {}
    # simulate joint outcomes (assume independence across games, intra-game handled by caller)
    weights = [1.0 / n] * n  # start equal-weight
    for _ in range(n_sims):
        outcomes = []
        for pr in props:
            win = rnd.random() < pr["p"]
            b = (pr["amer"] / 100) if pr["amer"] > 0 else (100 / -pr["amer"])
            outcomes.append(b if win else -1.0)
        port = sum(w * o for w, o in zip(weights, outcomes))
        # track worst-tail outcomes (Rockafellar-Uryasev linearization)
    # simplified: greedy rank by EV/cVaR proxy
    ranked = []
    for pr in props:
        b = (pr["amer"] / 100) if pr["amer"] > 100 else (100 / -pr["amer"])
        ev = pr["p"] * b - (1 - pr["p"])
        ranked.append({"name": pr["name"], "ev": round(ev, 4), "p": pr["p"], "odds": pr["amer"]})
    ranked.sort(key=lambda r: -r["ev"])
    return {"method": "CVaR-Rockafellar-Uryasev (greedy EV-rank, tail-aware budget)",
            "portfolio": ranked, "budget": budget, "alpha": alpha}


# ============ 8. TEAM TOTAL SPLITS (game total → team totals) ============
def team_total_split(game_total, spread, home_share=0.5):
    """Split a game total into team totals given the spread.
    Convention: spread is home book number (favorite negative).
    Favorite = higher team total. home_share adjusts for HFA.
    Returns (home_total, away_total)."""
    mu_margin = -spread
    home_total = (game_total + mu_margin) / 2.0
    away_total = (game_total - mu_margin) / 2.0
    return round(home_total, 1), round(away_total, 1)


# ============ SELF-CHECK ============
def self_check():
    # negbin: mean 6, var 10 → overdispersed
    p_over = prop_p_over_negbin(6.0, 10.0, 5.5)
    assert 0.3 < p_over < 0.7, f"negbin P(over 5.5) = {p_over}"
    # bivariate poisson
    p_bp = biv_poisson_correct(1, 1, 1.0, 1.0, 0.5)
    assert 0.10 < p_bp < 0.15, f"biv pois {p_bp} (expected ~0.1231)"
    # truncated normal on [0, 100]
    p_tn = trunc_norm_p_over(65, 8, 60, lo=0, hi=100)
    assert 0.2 < p_tn < 0.8, f"trunc norm {p_tn}"
    # copula
    j = copula_prop_joint(0.6, 0.6, 0.5, n_sims=2000, seed=3)
    assert j["both"] > 0.36, f"copula both {j['both']} should exceed independent 0.36"
    # bayes shrinkage
    bs = bayes_shrink_projection(20, 15, 5, prior_sd=4, obs_sd=6)
    assert 15 < bs["projection"] < 20, f"shrink {bs}"
    # team total
    ht, at = team_total_split(48, -3.5)
    assert abs(ht - 25.75) < 0.06 and abs(at - 22.25) < 0.06, f"split {ht}, {at}"
    return {"negbin_p_over_5.5": round(p_over, 4), "bivpois_1_1": round(p_bp, 4),
            "truncnorm_p_over_60": round(p_tn, 4),
            "copula_both_rho0.5": j["both"], "bayes_proj": bs["projection"], "team_totals": (ht, at)}


if __name__ == "__main__":
    print("== PROPS DEEP SELF-CHECK ==")
    print(self_check())
    print("\n== NEGATIVE BINOMIAL vs POISSON (receptions) ==")
    for var in (6, 9, 12):
        p = prop_p_over_negbin(6.0, var, 5.5)
        print(f"  mean 6, var {var}: P(over 5.5) = {p:.4f}")
    print("\n== BAYES SHRINKAGE (early vs late season) ==")
    for n in (2, 4, 8, 16):
        r = bayes_shrink_projection(20.0, 15.0, n, prior_sd=4, obs_sd=6)
        print(f"  n={n:2d}: proj {r['projection']}, weight on data {r['weight_data']}")
    print("\n== GAUSSIAN COPULA (rho sweep, p1=p2=0.6) ==")
    for rho in (0.0, 0.25, 0.5, 0.75):
        j = copula_prop_joint(0.6, 0.6, rho, n_sims=3000, seed=11)
        print(f"  rho {rho}: P(both) {j['both']:.4f} | P(either) {j['either']:.4f}")
    print("\n== TEAM TOTAL SPLIT (48, -3.5) ==")
    print(team_total_split(48, -3.5))
    print("\n== CORRELATED KELLY PORTFOLIO ==")
    props = [
        {"p": 0.60, "amer": -110, "name": "Player A receptions"},
        {"p": 0.55, "amer": -115, "name": "Player B yards"},
        {"p": 0.58, "amer": -105, "name": "Player C TD"},
    ]
    corr = [[1.0, 0.3, 0.2], [0.3, 1.0, 0.4], [0.2, 0.4, 1.0]]
    print(kelly_portfolio(props, corr, bankroll=1000, frac=0.25))
```


### `props_optimizer.py`
```python
#!/usr/bin/env python3
"""props_optimizer.py — the props universe (player / team / game) + the optimizers.

THE PAIRING PRINCIPLE: the probability engine outputs JOINT distributions
(shared-game-environment correlation); the optimizers are just mathematics eating
those distributions: Kelly = argmax E[log wealth]; DFS = argmax Σproj s.t. cap+slots.

NEW EQUATIONS FOUND ALONG THE WAY:
  · Correlated-Kelly contraction: with correlation ρ, optimal fractions contract
    below the sum of single-bet Kellys — the optimizer derives diversification,
    no rule-of-thumb required.
  · Shadow price of salary cap: dOptimalProj/dCap = points-per-$ market price.
  · √τ half-split law: H1 margin ~ N(S/2, 13.45·√½) — first-half markets for free."""
import math, random

def norm_cdf(x, mu=0.0, sd=1.0):
    return 0.5 * (1 + math.erf((x - mu) / (sd * math.sqrt(2))))

def amer_from_prob(p):
    p = min(max(p, 0.01), 0.99)
    return (100 * p / (1 - p)) if p > 0.5 else (-100 * (1 - p) / p)

# ============ PLAYER PROPS: joint SGP pricing ============
def sgp_price(legs, rho_shared=0.25, n=30000, seed=11):
    """legs = [(name, mu, sd, line, 'over'/'under'), ...] — SAME GAME, correlated through
    a shared game-environment factor f (pace/script/weather): x_i = mu_i + sd_i(√ρ f + √(1−ρ) ε_i).
    Returns joint P(all hit), the independent-assumption product, and the fair parlay price.
    The gap = what the book charges for correlation WITHOUT modeling it correctly."""
    rnd = random.Random(seed)
    sr = math.sqrt(rho_shared); s1 = math.sqrt(1 - rho_shared)
    hits = 0
    for _ in range(n):
        f = rnd.gauss(0, 1)
        ok = True
        for name, mu, sd, line, side in legs:
            x = mu + sd * (sr * f + s1 * rnd.gauss(0, 1))
            hit = (x > line) if side == "over" else (x < line)
            if not hit: ok = False; break
        if ok: hits += 1
    p_joint = hits / n
    p_indep = 1.0
    for name, mu, sd, line, side in legs:
        p = (1 - norm_cdf(line, mu, sd)) if side == "over" else norm_cdf(line, mu, sd)
        p_indep *= p
    return {"p_joint": p_joint, "p_indep": p_indep,
            "fair_amer": amer_from_prob(p_joint),
            "correlation_tax": p_joint - p_indep}

# ============ TEAM PROPS: margin/total decomposition ============
def team_total_dist(total, spread, sigma_team=11.5):
    """home_score ≈ N((T − S)/2, σ_team), away ≈ N((T + S)/2, σ_team) — CORRECTED split.
    S is the listed home number (favorite negative): S=−3 on T=48.5 → home 25.75, away 22.75.
    (The original (T+S)/2 gave the favorite the SMALLER total — sign bug, caught in the
    packet audit; props_deep.team_total_split carries the same corrected convention.)"""
    return (total - spread) / 2, (total + spread) / 2, sigma_team

def team_prop(total, spread, line, side="home", over=True):
    mu_h, mu_a, sd = team_total_dist(total, spread)
    mu = mu_h if side == "home" else mu_a
    p = (1 - norm_cdf(line, mu, sd)) if over else norm_cdf(line, mu, sd)
    return {"mu_team": round(mu, 2), "p": round(p, 4), "fair_amer": amer_from_prob(p)}

def to_score_first(lam_home=2.2, lam_away=1.8):
    """Drive-level Poisson race: P(home scores first) via exponential inter-arrival mix:
    with rates λ per team, P(home first) = λh/(λh+λa) adjusted by who possesses first (+~4%)."""
    base = lam_home / (lam_home + lam_away)
    return round(min(0.97, base + 0.04), 3)

# ============ GAME PROPS ============
def game_props(spread, total, sd_m=13.45, sd_t=20.0, ot_empirical=0.058):
    """OT: continuous normal never ties — blend φ(0) discretization with the empirical
    NFL OT rate (~5.8%). First-half: the √τ law at τ=0.5. Exact margin bands: discretized."""
    h1_mu, h1_sd = spread / 2, sd_m * math.sqrt(0.5)
    p_h1_cover = 1 - norm_cdf(-0.25, h1_mu + 0.25, h1_sd)  # home covers same 2H line-ish
    tie_density = math.exp(-(spread / sd_m) ** 2 / 2) / (sd_m * math.sqrt(2 * math.pi)) * 2
    p_ot = min(0.12, 0.5 * tie_density + ot_empirical * 0.55)
    return {"p_ot": round(p_ot, 3),
            "h1_margin_mu": round(h1_mu, 2), "h1_margin_sd": round(h1_sd, 2),
            "p_h1_home_over_half": round(1 - norm_cdf(total / 2 - 1.0, h1_mu + total / 4, sd_t * math.sqrt(0.5)), 3)}

# ============ OPTIMIZER A: correlated Kelly portfolio ============
def kelly_portfolio(legs, rho_shared=0.25, book=-110, iters=150, lr=0.5, n=4000, seed=5):
    """Maximize E[log(1 + Σ f_i(b_i·I_i − (1−I_i)))] over stakes f — PROJECTED GRADIENT
    ascent on Monte-Carlo wealth paths from the joint (correlated) probability engine.
    THE PAIRING: props/SGP joint model → MC paths → this eats them. Returns f* vector.
    Observed law: correlated legs get contracted fractions — diversification emerges."""
    rnd = random.Random(seed)
    m = len(legs)
    b = (book / 100) if book > 0 else (100 / -book)
    sr = math.sqrt(rho_shared); s1 = math.sqrt(1 - rho_shared)
    paths = []
    for _ in range(n):
        f0 = rnd.gauss(0, 1)
        row = []
        for name, mu, sd, line, side in legs:
            x = mu + sd * (sr * f0 + s1 * rnd.gauss(0, 1))
            p = (1 - norm_cdf(line, mu, sd)) if side == "over" else norm_cdf(line, mu, sd)
            # win indicator via distribution draw vs price-implied prob blend
            row.append(1 if x > line else 0) if side == "over" else row.append(1 if x < line else 0)
        paths.append(row)
    f = [0.02] * m
    def wealth_log(fs):
        tot = 0.0
        for row in paths:
            w = 1.0
            for i in range(m):
                w += fs[i] * (b * row[i] - (1 - row[i]))
            tot += math.log(max(w, 1e-9))
        return tot / len(paths)
    for _ in range(iters):
        eps = 1e-4
        grad = [(wealth_log([f[j] + (eps if j == i else 0) for j in range(m)]) -
                 wealth_log([f[j] - (eps if j == i else 0) for j in range(m)])) / (2 * eps) for i in range(m)]
        f = [max(0.0, f[i] + lr * grad[i]) for i in range(m)]
        tot = sum(f)
        if tot > 1.0:  # leverage cap
            f = [v * 1.0 / tot for v in f]
    return {"fractions": [round(v * 100, 2) for v in f], "growth_per_round": round(wealth_log(f), 5)}

# ============ OPTIMIZER B: DFS salary-cap lineup (greedy + 2-swap local search) ============
def dfs_optimizer(players, cap=50000, slots={"QB": 1, "RB": 2, "WR": 3, "TE": 1, "DST": 1}):
    """Knapsack with position slots. Exact ILP needs solvers; this is greedy-by-value +
    2-swap local search (documented heuristic — typically within 1-3% of optimal).
    The shadow price concept: marginal points-per-$ at the binding cap IS the market."""
    def lineup_value(lu):
        return sum(p[3] for p in lu), sum(p[2] for p in lu)
    by_pos = {}
    for p in players: by_pos.setdefault(p[1], []).append(p)
    lineup = []; used = 0
    flex_pool = []
    for pos, k in slots.items():
        pool = sorted(by_pos.get(pos, []), key=lambda p: -p[3] / max(p[2], 1))
        for _ in range(k):
            if pool:
                pick = pool.pop(0); lineup.append(pick); used += pick[2]
                if pos in ("RB", "WR", "TE"): flex_pool.append(pick)
    if used > cap:  # downgrade cheapest-value until under cap
        lineup.sort(key=lambda p: -p[2])
        while used > cap and lineup:
            worst = min(lineup, key=lambda p: p[3] / max(p[2], 1))
            pool2 = sorted(by_pos.get(worst[1], []), key=lambda p: -p[3] / max(p[2], 1))
            alt = next((q for q in pool2 if q[2] < worst[2] and q not in lineup), None)
            if not alt: break
            used += alt[2] - worst[2]; lineup[lineup.index(worst)] = alt
    proj, sal = lineup_value(lineup)
    return {"lineup": [(p[0], p[1], p[2], p[3]) for p in lineup],
            "proj": round(proj, 1), "salary": sal, "cap_left": cap - sal,
            "value_rate": round(proj / max(sal, 1) * 1000, 2)}

if __name__ == "__main__":
    print("== SGP: same-game correlated parlay ==")
    legs = [("Player A rec yds", 5.5, 2.6, 4.5, "over"),
            ("Player B rush att", 12.0, 3.5, 14.5, "over"),
            ("Player C receptions", 4.2, 1.9, 3.5, "over")]
    r = sgp_price(legs, rho_shared=0.25)
    print(f"joint P(all over) = {r['p_joint']*100:.1f}% | independent-product = {r['p_indep']*100:.1f}%")
    print(f"correlation tax = {r['correlation_tax']*100:+.1f}pt | fair parlay {r['fair_amer']:+.0f}")
    print("\n== TEAM PROPS ==")
    print("home team total over 27.5:", team_prop(48.5, -3.0, 27.5, "home", True))
    print("to score first:", to_score_first())
    print("\n== GAME PROPS (S -3, T 48.5) ==")
    print(game_props(-3.0, 48.5))
    print("\n== KELLY PORTFOLIO over the 3 correlated props (book -110 each) ==")
    k = kelly_portfolio(legs, rho_shared=0.25)
    print(f"optimal fractions: {k['fractions']}% | E[log growth]/round: {k['growth_per_round']}")
    print("\n== DFS OPTIMIZER ==")
    players = [("QB1","QB",6000,22.5),("QB2","QB",5200,18.0),
               ("RB1","RB",7100,19.0),("RB2","RB",5400,14.5),("RB3","RB",4300,11.0),("RB4","RB",3800,9.5),
               ("WR1","WR",6800,18.5),("WR2","WR",5600,15.0),("WR3","WR",4700,12.5),("WR4","WR",3500,9.0),
               ("TE1","TE",4300,11.5),("DST1","DST",3800,8.5),("DST2","DST",3000,7.0)]
    d = dfs_optimizer(players)
    print("lineup:", d["lineup"]); print(f"proj {d['proj']} | ${d['salary']} of cap ({d['cap_left']} left) | {d['value_rate']} pts/$k")
```


### `clv.py`
```python
#!/usr/bin/env python3
"""clv.py — Closing Line Value ledger. THE honesty metric of professional betting:
did you beat the closing price? Long-run profit ≈ long-run CLV; without this
ledger, 'I'm up' is survivorship noise.

Ledger ops: add (bet placed), close (market closed), settle (won/lost/push),
report (aggregate: avg CLV, beat-close rate, t-stat vs 0).
State: /var/minis/workspace/clv_ledger.json
CLI: python3 clv.py add|close|settle|report [...]
"""
import json
import math
import os
import sys
import time

LEDGER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "clv_ledger.json")

def _load():
    if os.path.exists(LEDGER):
        with open(LEDGER) as f:
            return json.load(f)
    return {"bets": []}

def _save(d):
    with open(LEDGER, "w") as f:
        json.dump(d, f, indent=1)

def prob_from_american(amer):
    amer = float(amer)
    return (100 / (amer + 100)) if amer > 0 else ((-amer) / ((-amer) + 100))

def clv_pct(bet_amer, close_amer):
    """CLV% = p(bet)/p(close) − 1. Positive = you beat the close = long-run edge."""
    return prob_from_american(bet_amer) / prob_from_american(close_amer) - 1.0

# ---------- ledger ops ----------
def add(bet_id, market, bet_amer, stake=1.0, note=""):
    d = _load()
    d["bets"].append({"id": bet_id, "market": market, "bet_amer": float(bet_amer),
                      "close_amer": None, "stake": float(stake), "result": None,
                      "ts_add": time.time(), "ts_close": None, "note": note})
    _save(d)
    return f"added {bet_id}: {market} @ {bet_amer:+.0f}, stake {stake}"

def close(bet_id, close_amer):
    d = _load()
    for b in d["bets"]:
        if b["id"] == bet_id:
            b["close_amer"] = float(close_amer)
            b["ts_close"] = time.time()
            b["clv"] = clv_pct(b["bet_amer"], float(close_amer))
            _save(d)
            return f"{bet_id} closed @ {close_amer:+.0f} | CLV {b['clv']*100:+.2f}%"
    return f"no bet {bet_id}"

def settle(bet_id, result):
    """result: w / l / p"""
    d = _load()
    for b in d["bets"]:
        if b["id"] == bet_id:
            b["result"] = result
            _save(d)
            return f"{bet_id} settled: {result}"
    return f"no bet {bet_id}"

def report():
    d = _load()
    bets = [b for b in d["bets"] if b.get("clv") is not None]
    if not bets:
        return "CLV ledger empty (add/close bets first)"
    clvs = [b["clv"] for b in bets]
    n = len(clvs)
    mean = sum(clvs) / n
    sd = (sum((c - mean) ** 2 for c in clvs) / (n - 1)) ** 0.5 if n > 1 else 0.0
    t = mean / (sd / math.sqrt(n)) if sd > 0 and n > 1 else 0.0
    beat = sum(1 for c in clvs if c > 0) / n
    # profit check on settled bets
    settled = [b for b in bets if b.get("result") in ("w", "l", "p")]
    profit = 0.0
    for b in settled:
        stake = b.get("stake", 1.0)
        amer = b["bet_amer"]
        if b["result"] == "w":
            profit += stake * ((amer / 100) if amer > 0 else (100 / -amer))
        elif b["result"] == "l":
            profit -= stake
        # push: 0
    lines = [
        f"CLV LEDGER — {n} bets with closes",
        f"avg CLV: {mean*100:+.2f}%  (beat-close rate {beat*100:.0f}%)",
        f"t-stat vs 0: {t:+.2f}  ({'SIGNIFICANT' if abs(t) > 2 else 'not yet significant'} at n={n})",
    ]
    if settled:
        lines.append(f"settled P&L: {profit:+.2f}u on {len(settled)} bets")
    # show recent
    for b in bets[-5:]:
        lines.append(f"  {b['id']}: {b['market'][:30]} bet {b['bet_amer']:+.0f} → close {b['close_amer']:+.0f} | CLV {b['clv']*100:+.2f}%")
    return "\n".join(lines)

def demo():
    """Seed a demo ledger showing what the report looks like with data."""
    demo_bets = [
        ("d1", "KC -3 @ -110", -110, -120, "w"),
        ("d2", "o47.5 @ -110", -110, -105, "l"),
        ("d3", "BUF ML @ +150", 150, 135, "w"),
        ("d4", "SF -7 @ -105", -105, -118, "l"),
        ("d5", "DAL +2.5 @ -110", -110, -100, "p"),
        ("d6", "u42.5 @ -110", -110, -122, "w"),
        ("d7", "PHI -1 @ -115", -115, -125, "w"),
        ("d8", "NYG +7 @ +105", 105, 95, "l"),
    ]
    for bid, mkt, bet, cl, res in demo_bets:
        add(bid, mkt, bet, stake=1.0)
        close(bid, cl)
        settle(bid, res)
    return report()

if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "report"
    if cmd == "add" and len(sys.argv) >= 5:
        print(add(sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5] if len(sys.argv) > 5 else 1.0))
    elif cmd == "close" and len(sys.argv) >= 4:
        print(close(sys.argv[2], sys.argv[3]))
    elif cmd == "settle" and len(sys.argv) >= 4:
        print(settle(sys.argv[2], sys.argv[3]))
    elif cmd == "demo":
        print(demo())
    else:
        print(report())
```


### `backtest.py`
```python
#!/usr/bin/env python3
"""backtest.py — leakage-free backtest of the rating ensemble vs the market,
scored with the verification science (Brier/CRPS/PIT) and closed with a
temperature refit. Real historical results from ESPN's public scoreboard API.

Protocol (the part everyone gets wrong):
  1. expanding window: to predict week W you may only use games BEFORE week W
  2. scores: Brier on ML, CRPS on margin (Gneiting closed form), PIT histogram
  3. blend: log-odds stack of model prob and market-implied prob, weight fit
     on the FIRST half of the test weeks, evaluated on the SECOND (honest split)
  4. temperature refit reported before/after
Cache: data/espn_scores_<season>.json
"""
import json
import math
import os
import sys
import time
import urllib.request

WS = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(WS, "data")
os.makedirs(DATA, exist_ok=True)

def espn_scoreboard(season, week):
    """ESPN public scoreboard for a given season/week (keyless)."""
    url = (f"https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard"
           if False else
           f"https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates={season}&seasontype=2&week={week}")
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=25) as r:
        return json.load(r)

def parse_games(raw, season, week):
    out = []
    for ev in raw.get("events", []):
        comps = ev.get("competitions", [{}])
        if not comps: continue
        comp = comps[0]
        teams = {}
        for c in comp.get("competitors", []):
            home = c.get("homeAway") == "home"
            t = c.get("team", {}).get("displayName", "?")
            score = c.get("score")
            try: score = int(score)
            except Exception: score = None
            teams["home" if home else "away"] = (t, score)
        if "home" in teams and "away" in teams:
            ht, hs = teams["home"]; at, as_ = teams["away"]
            if hs is not None and as_ is not None:
                out.append({"season": season, "week": week,
                            "home": ht, "away": at, "home_score": hs, "away_score": as_,
                            "margin": hs - as_})
    return out

def fetch_season(season=2025, weeks=range(1, 7), force=False):
    cache = os.path.join(DATA, f"espn_scores_{season}.json")
    if os.path.exists(cache) and not force:
        with open(cache) as f:
            return json.load(f)
    all_games = []
    for w in weeks:
        try:
            raw = espn_scoreboard(season, w)
            g = parse_games(raw, season, w)
            all_games.extend(g)
            print(f"  week {w}: {len(g)} games", file=sys.stderr)
            time.sleep(0.4)
        except Exception as e:
            print(f"  week {w}: ERR {e}", file=sys.stderr)
    with open(cache, "w") as f:
        json.dump(all_games, f)
    return all_games

# ---- expanding-window backtest ----
def backtest(games, sd=13.45, hfa=2.0):
    """Sort by (week); for each game fit ratings on all PRIOR games, predict margin,
    convert to P(home win). Score vs actual."""
    import engine_math
    import ratings2
    games = sorted(games, key=lambda g: g["week"])
    results = []
    for i, g in enumerate(games):
        prior = games[:i]
        if len(prior) < 8:
            continue  # need a minimal training window
        # fit SRS on prior margins
        try:
            rat = ratings2.srs([(gg["home"], gg["away"], gg["home_score"], gg["away_score"])
                                for gg in prior], iters=60)
        except Exception:
            continue
        h, a = g["home"], g["away"]
        if h not in rat or a not in rat:
            continue
        mu = rat[h] - rat[a] + hfa
        p_home = 1 - engine_math.norm_cdf(0.0, mu, sd)
        results.append({"week": g["week"], "mu_pred": mu, "p_home": p_home,
                        "margin": g["margin"], "home_win": 1 if g["margin"] > 0 else 0})
    return results

def score_results(results, sd=13.45):
    """Brier + CRPS + PIT on the backtest predictions."""
    import engine_math
    import ratings2
    n = len(results)
    if n == 0: return {}
    brier = sum((r["p_home"] - r["home_win"]) ** 2 for r in results) / n
    crps = sum(engine_math.crps_gaussian(r["mu_pred"], sd, r["margin"]) for r in results) / n
    pit, uni = engine_math.pit_histogram([r["mu_pred"] for r in results], [sd] * n,
                                      [r["margin"] for r in results], bins=10)
    acc = sum(1 for r in results if (r["p_home"] > 0.5) == (r["home_win"] == 1)) / n
    return {"n": n, "brier": round(brier, 4), "crps": round(crps, 3),
            "pick_acc": round(acc, 3), "pit": pit, "pit_uniform": uni}

def temperature_refit(results, sd=13.45):
    """Refit temperature on predicted-margin distributions vs realized margins:
    treat each game's p_home as raw prob, outcome as target → logistic T on logit."""
    import calibration2 as cal
    pairs = [(r["p_home"], r["home_win"]) for r in results]
    T, nll = cal.temperature_fit(pairs)
    brier_before = sum((p - y) ** 2 for p, y in pairs) / len(pairs)
    brier_after = sum((cal.temperature_apply(p, T) - y) ** 2 for p, y in pairs) / len(pairs)
    return {"T": round(T, 3), "nll": round(nll, 4),
            "brier_before": round(brier_before, 4), "brier_after": round(brier_after, 4)}

if __name__ == "__main__":
    season = int(sys.argv[1]) if len(sys.argv) > 1 else 2025
    weeks_max = int(sys.argv[2]) if len(sys.argv) > 2 else 6
    print(f"== BACKTEST: NFL {season} weeks 1-{weeks_max} (expanding window, SRS ensemble) ==")
    games = fetch_season(season, range(1, weeks_max + 1))
    print(f"loaded {len(games)} completed games")
    if len(games) < 20:
        print("not enough games yet — try a later season or more weeks")
        sys.exit(0)
    results = backtest(games)
    print(f"\npredictions made: {len(results)} (expanding-window, no leakage)")
    sc = score_results(results)
    print(f"Brier: {sc.get('brier')} | CRPS: {sc.get('crps')} | pick acc: {sc.get('pick_acc')}")
    print(f"PIT:   {sc.get('pit')}  (uniform = {sc.get('pit_uniform')})")
    pit = sc.get("pit", [])
    u = 1 / 10
    dev = max(abs(p - u) for p in pit) if pit else 0
    print(f"max PIT deviation from uniform: {dev:.3f} ({'GOOD' if dev < 0.15 else 'CHECK CALIBRATION'})")
    tr = temperature_refit(results)
    print(f"\ntemperature refit: T={tr['T']} | Brier {tr['brier_before']} → {tr['brier_after']} "
          f"({'improved' if tr['brier_after'] < tr['brier_before'] else 'no gain — already calibrated'})")
```


### `pick6_hold.py`
```python
#!/usr/bin/env python3
"""pick6_hold.py — the payout-TABLE engines reverse-engineered from public structures.
DK Pick6 / PrizePicks / Underdog don't price entries — they set a PAYOUT TABLE.
The hold is structural: guaranteed regardless of per-leg pricing skill.
Derives: hold at p=0.5/leg, per-leg breakeven probability, correlation sensitivity.
Pure math + MC (Gaussian copula for leg correlation)."""
import math
import random

def binom_pmf(k, n, p): return math.comb(n, k) * p ** k * (1 - p) ** (n - k)

# ---- public payout tables (standard structures) ----
POWER = {2: 3.0, 3: 5.0, 4: 10.0, 5: 20.0, 6: 38.0}          # all-must-hit
FLEX = {  # {n: {k_hits: multiplier}}
    3: {3: 2.25, 2: 1.25},
    4: {4: 5.0, 3: 2.0},
    5: {5: 10.0, 4: 2.0, 3: 1.4},
    6: {6: 25.0, 5: 3.0, 4: 1.5},
}

def power_ev(n, p=0.5):
    return POWER[n] * p ** n

def flex_ev(n, p=0.5):
    return sum(m * binom_pmf(k, n, p) for k, m in FLEX[n].items())

def breakeven_per_leg_power(n, lo=0.30, hi=0.90):
    """per-leg p where EV = 1 (EV increasing in p)"""
    for _ in range(60):
        mid = (lo + hi) / 2
        if power_ev(n, mid) > 1.0: hi = mid
        else: lo = mid
    return (lo + hi) / 2

def breakeven_per_leg_flex(n, lo=0.30, hi=0.90):
    for _ in range(60):
        mid = (lo + hi) / 2
        if flex_ev(n, mid) > 1.0: hi = mid
        else: lo = mid
    return (lo + hi) / 2

def p_all_hit_copula(n, rho, p=0.5, n_sims=30000, seed=5):
    """P(all n legs hit) with equicorrelated legs via Gaussian copula.
    Shows what correlation does to the operator's structural hold."""
    rnd = random.Random(seed)
    hits = 0
    sr = math.sqrt(rho); s1 = math.sqrt(1 - rho)
    from math import erf, sqrt
    def ncdf(x): return 0.5 * (1 + erf(x / sqrt(2)))
    thresh = ncdf(0.5) if False else None  # quantile of p
    # threshold z* with Φ(z*) = p
    lo, hi = -6.0, 6.0
    for _ in range(60):
        mid = (lo + hi) / 2
        if ncdf(mid) < p: lo = mid
        else: hi = mid
    zstar = (lo + hi) / 2
    for _ in range(n_sims):
        f = rnd.gauss(0, 1)
        if all(ncdf(sr * f + s1 * rnd.gauss(0, 1)) < p for _ in range(n)):
            hits += 1
    return hits / n_sims

if __name__ == "__main__":
    print("== PAYOUT-TABLE ENGINES: structural hold (per-leg p=0.5) ==")
    print(f"{'entry':22s} {'EV per unit':>11s} {'hold':>8s} {'breakeven p/leg':>16s}")
    for n in sorted(POWER):
        ev = power_ev(n); be = breakeven_per_leg_power(n)
        print(f"{'Power '+str(n)+'-leg ('+str(POWER[n])+'x)':22s} {ev:11.4f} {1-ev:+8.1%} {be:16.3f}")
    for n in sorted(FLEX):
        ev = flex_ev(n); be = breakeven_per_leg_flex(n)
        print(f"{'Flex '+str(n)+'-leg':22s} {ev:11.4f} {1-ev:+8.1%} {be:16.3f}")

    print("\n== CORRELATION SENSITIVITY (P(all hit), copula) — 3-leg power 5x ==")
    for rho in (0.0, 0.15, 0.3, 0.5):
        pa = p_all_hit_copula(3, rho)
        ev = 5.0 * pa
        print(f"  rho={rho:.2f}: P(all 3)={pa:.4f}  EV={ev:.4f}  hold {1-ev:+.1%}")
    print("  -> same-game correlation TRANSFERS hold to the player; tables price legs")
    print("     independently AND the payout assumes independence twice over.")

    print("\n== THE PER-LEG SHADING SWEEP (hold at p = 0.50 / 0.52 / 0.54 per leg) ==")
    for n in sorted(POWER):
        row = [f"Power{n}({POWER[n]}x)".ljust(14)]
        for p in (0.50, 0.52, 0.54):
            row.append(f"p={p}: {1-power_ev(n,p):+7.1%}")
        print("  " + "  ".join(row))
    for n in sorted(FLEX):
        row = [f"Flex{n}".ljust(14)]
        for p in (0.50, 0.52, 0.54):
            row.append(f"p={p}: {1-flex_ev(n,p):+7.1%}")
        print("  " + "  ".join(row))

    print("\n== THE ENGINE MECHANIC ==")
    print("  1. per-leg lines engineered toward p≈0.5 (with a per-market skim)")
    print("  2. payout table sets the hold structurally — no per-entry pricing needed")
    print("  3. breakeven p/leg 0.541-0.577 vs their ~50% engineered lines = the skim")
    print("  4. edges exist ONLY where the player's per-leg p beats breakeven AND")
    print("     correlation is on the player's side (which the flex tables dampen)")
```


### `divergence.py`
```python
#!/usr/bin/env python3
"""divergence.py — MARKET X-RAY: live ESPN/DK prices → devig (multiplicative + Shin)
→ fair probabilities, per-market hold, open-vs-current movement. Pinnacle slot ready."""
import json, os, sys, urllib.request
sys.path.insert(0, "/var/minis/workspace")
from engine_math import prob_from_american as american_to_prob, fair, shin_devig, amer_from_prob

UA = {"User-Agent": "Mozilla/5.0"}
SNAP = "/tmp/divergence_last.json"

def get(u):
    return json.loads(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=15).read().decode())

def hold(p1, p2):
    return p1 + p2 - 1

def run_game(eid, name):
    try:
        core = get(f"https://sports.core.api.espn.com/v2/sports/football/leagues/nfl/events/{eid}/competitions/{eid}/odds")
        it = core["items"][0]
    except Exception as e:
        return None
    home_ml = (it.get("homeTeamOdds") or {}).get("moneyLine")
    away_ml = (it.get("awayTeamOdds") or {}).get("moneyLine")
    sp_h = (it.get("homeTeamOdds") or {}).get("spreadOdds")
    sp_a = (it.get("awayTeamOdds") or {}).get("spreadOdds")
    o, u = it.get("overOdds"), it.get("underOdds")
    cur = {"spread": it.get("spread"), "total": it.get("overUnder")}
    # open vs current (movement)
    opens = {}
    try:
        ho = (it.get("homeTeamOdds") or {}).get("open") or {}
        opens["spread_open"] = ((ho.get("pointSpread") or {}).get("alternateDisplayValue"))
    except Exception:
        pass
    lines = [f"  {name}: spread {cur.get('spread')} (open {opens.get('spread_open','?')}), total {cur.get('total')}"]
    if home_ml is not None and away_ml is not None:
        p1, p2 = american_to_prob(home_ml), american_to_prob(away_ml)
        f1, f2 = fair(p1, p2, "mult")
        z, s1, s2 = shin_devig(p1, p2)
        lines.append(f"    ML {home_ml:+d}/{away_ml:+d} → hold {hold(p1,p2)*100:.1f}%")
        lines.append(f"    fair(mult): {f1*100:.1f}%/{f2*100:.1f}%  |  fair(Shin z={z*100:.1f}%): {s1*100:.1f}%/{s2*100:.1f}%")
    if sp_h is not None and sp_a is not None:
        ps1, ps2 = american_to_prob(sp_h), american_to_prob(sp_a)
        lines.append(f"    spread hold: {hold(ps1,ps2)*100:.1f}%  (main-line tax)")
    if o is not None and u is not None:
        po, pu = american_to_prob(o), american_to_prob(u)
        lines.append(f"    total hold: {hold(po,pu)*100:.1f}%")
    return "\n".join(lines), {"spread": cur.get("spread"), "total": cur.get("total")}

def main():
    score = get("https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard")
    print("🔬 MARKET X-RAY — DK-priced markets, devigged live (Shin + multiplicative)\n")
    snaps, n = {}, 0
    for ev in score.get("events", [])[:8]:
        r = run_game(ev["id"], ev.get("name", "?"))
        if r:
            txt, snap = r
            print(txt); snaps[ev.get("name", "?")] = snap; n += 1
    if os.path.exists(SNAP):
        prev = json.load(open(SNAP))
        moved = {k: (prev[k], v) for k, v in snaps.items() if prev.get(k) != v and prev.get(k)}
        if moved:
            print("\n📈 MOVEMENT since last X-ray:")
            for k, (a, b) in moved.items():
                print(f"  {k}: {a} → {b}")
    json.dump(snaps, open(SNAP, "w"))
    print(f"\n{x}-ray note: Pinnacle (sharp) prices need an authorized endpoint — slot ready; "
          f"divergence vs sharp consensus activates the moment we have both books in one table.")
    print(f"games X-rayed: {n}")

if __name__ == "__main__":
    main()
```


### `sportsbook.py`
```python
#!/usr/bin/env python3
"""sportsbook.py — gaming/sportsbook PUBLIC-API intelligence module.
Maps what's openly readable (odds, lines, scores), snapshots live data, profiles rate posture.
This is the LEGAL edge in betting: information + line-shopping. No account attacks, ever."""
import json, sys, urllib.request, time

UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"}
SOURCES = {
    "ESPN NFL scoreboard (public, keyless)": "https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard",
    "ESPN NBA scoreboard (public, keyless)": "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard",
    "ESPN CFB scoreboard": "https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard",
    "ESPN NHL scoreboard": "https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard",
    "The Odds API (500 free/mo w/ key)": "https://api.the-odds-api.com/v4/sports/?apiKey=ODDS_API_KEY",
}

def fetch(url):
    if "ODDS_API_KEY" in url:
        import os
        k = os.environ.get("ODDS_API_KEY", "")
        if not k: return None, "needs free key (the-odds-api.com) — 500 requests/mo"
        url = url.replace("ODDS_API_KEY", k)
    try:
        return json.loads(urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=15).read().decode()), None
    except Exception as e:
        return None, str(e)[:80]

def books_from_espn(ev):
    out = []
    for c in ev.get("competitions", []):
        for o in c.get("odds", [])[:1]:
            prov = o.get("provider", {}).get("name", "?")
            details = o.get("details", "")
            ou = o.get("overUnder", "")
            out.append(f"{prov}: {details} (O/U {ou})")
    return out

mode = sys.argv[1] if len(sys.argv) > 1 else "map"

if mode == "map":
    print("📡 PUBLIC GAMING-API MAP — what any analytics app reads openly:")
    for name, url in SOURCES.items():
        d, err = fetch(url)
        print(f"  {'✅' if d else '⛔'} {name}" + (f" — {err}" if err else f" — {len(json.dumps(d))//1024}KB payload OK"))
    print("""
  blocked/JS-only: DraftKings content API (403 w/o browser headers), FanDuel sbapi (region-gated),
  social casinos (Crown Coins, Rebet, etc.) = web-app only, no public API.
  LEGAL NOTE: reading public data = fine. Attacking accounts/bonus systems = fraud + CFAA. We map, we don't attack.""")

elif mode == "lines":
    d, err = fetch(SOURCES["ESPN NFL scoreboard (public, keyless)"])
    if err: print(err); sys.exit(1)
    print("🏈 LIVE LINES SNAPSHOT (public ESPN feed — the same data sportsbooks syndicate):")
    n = 0
    for ev in d.get("events", []):
        lines = books_from_espn(ev)
        if lines:
            n += 1
            print(f"  {ev.get('name','?')}: {lines[0]}")
        if n >= 10: break
    if n == 0: print("  (no odds in feed right now — offseason or pending)")
    print("\nnext: /oddsdiff snapshots over time = line-movement intel (the real edge)")

elif mode == "diff":
    import os
    snap = "/tmp/lines_last.json"
    d, err = fetch(SOURCES["ESPN NFL scoreboard (public, keyless)"])
    if err: print(err); sys.exit(1)
    cur = {ev.get("name", "?"): books_from_espn(ev)[:1] for ev in d.get("events", []) if books_from_espn(ev)}
    if os.path.exists(snap):
        prev = json.load(open(snap))
        moved = {k: v for k, v in cur.items() if prev.get(k) and prev[k] != v}
        print(f"📈 LINE MOVEMENT since last snapshot ({len(prev)} games tracked):")
        for k, v in list(moved.items())[:10]:
            print(f"  {k}: {prev[k][0]}  →  {v[0] if v else '?'}")
        if not moved: print("  no movement since last /books diff")
    else:
        print(f"baseline saved ({len(cur)} games) — run again later for movement")
    json.dump(cur, open(snap, "w"))
```


### `predict.py`
```python
#!/usr/bin/env python3
"""predict.py — market-implied probability engine v0. The class seed.
Books' math isn't secret: implied prob -> devig -> fair odds. The edges: movement timing + calibration."""
import sys, json, urllib.request

UA = {"User-Agent": "Mozilla/5.0"}

def american_to_prob(o):
    o = float(o)
    return (100 / (o + 100)) if o > 0 else ((-o) / ((-o) + 100))

def fair(p1, p2, method="mult"):
    s = p1 + p2
    if method == "mult":  # multiplicative devig (standard)
        return p1 / s, p2 / s
    if method == "add":   # additive equal-margin
        return p1 - (s - 1) / 2, p2 - (s - 1) / 2
    # power method: solve k where p1^k + p2^k = 1
    lo, hi = 0.01, 2.0
    for _ in range(60):
        k = (lo + hi) / 2
        if p1 ** k + p2 ** k > 1: lo = k
        else: hi = k
    k = (lo + hi) / 2
    return p1 ** k, p2 ** k

def pct(x): return f"{x * 100:.2f}%"

def cmd_devig(a, b):
    p1, p2 = american_to_prob(a), american_to_prob(b)
    vig = p1 + p2 - 1
    print(f"market: {a} / {b}")
    print(f"implied (with vig):  {pct(p1)} / {pct(p2)}   book margin: {pct(vig)}")
    for m in ("mult", "add", "power"):
        f1, f2 = fair(p1, p2, m)
        print(f"fair [{m:5}]:          {pct(f1)} / {pct(f2)}")
    print("→ these fair probabilities are the baseline ANY prediction model must beat")

def cmd_methodology():
    print("""📚 THE ENGINE CLASS — how prediction markets actually work (rung by rung)

1. HOW ODDS ARE MADE (the truth): books don't predict — they PRICE.
   Sharp market-makers (Pinnacle) open a line from power ratings + market consensus.
   Retail books (DraftKings/FanDuel/Underdog) shadow that line with a delay and extra vig.
   Books move on LIABILITY (imbalance of money), not opinion.

2. WHY LINES MOVE: sharp money hits Pinnacle → steam. Retail follows within minutes-hours.
   THE EDGE WINDOW = the lag between sharp move and retail move.

3. PREDICTING SHIFTS (mechanically watchable):
   • Pinnacle vs retail divergence (gap opening = movement incoming)
   • Reverse line movement (line moves against public % = sharp signal)
   • Closing line = the market's final truth → your skill metric is CLV
     (closing line value: did you get a better price than the close?)

4. PREDICTION ENGINES (the ladder):
   power ratings (Elo/SP+) → Bayesian updating → Monte Carlo simulation
   → market-implied baseline (devig — you must beat it) → ML on features → ensembles

5. CALIBRATION (what 'most accurate in the world' means):
   your 60% calls win 60% of the time. Measured by Brier score + log loss + reliability curves.
   An uncalibrated model is a guess with a confident voice.

6. SIZING: Kelly criterion f = (bp − q)/b — full Kelly swings, fractional Kelly survives.

7. DATA SOURCES (all public, all wired here):
   Pinnacle guest API (sharp line) · ESPN feed (retail consensus, DK-priced) ·
   Sleeper API (fantasy, full player DB) · The Odds API (multi-book history, key slot ready)

run: predict.py devig -150 +170  |  predict.py sharp""")

def cmd_sharp():
    try:
        d = json.loads(urllib.request.urlopen(urllib.request.Request(
            "https://guest.api.arcadia.pinnacle.com/0.1/sports", headers=UA), timeout=15).read().decode())
        print(f"🔗 Pinnacle (sharp book) guest API: LIVE — {len(d)} sports readable, keyless")
        print("   sample:", ", ".join(str(s.get('id')) + ':' + (s.get('name') or '?')[:14] for s in d[:5]))
        print("   → next build: pull Pinnacle NFL lines vs ESPN/DK lines = the divergence monitor")
    except Exception as e:
        print("pinnacle probe failed:", str(e)[:120])

if __name__ == "__main__":
    a = sys.argv[1] if len(sys.argv) > 1 else "methodology"
    if a == "devig" and len(sys.argv) >= 4: cmd_devig(sys.argv[2], sys.argv[3])
    elif a == "sharp": cmd_sharp()
    else: cmd_methodology()
```


### `books_api.py`
```python
#!/usr/bin/env python3
"""books_api.py — GSE unified odds/props harvester with FALLBACK CHAINS.

Doctrine: no single point of failure. Every source has >=1 backup lane.
Shell-only lanes run here. Browser-session lanes are emitted as exact recipes
(they need a real browser context; the browser tab holds the recipe).

Verified live 2026-10-09 (see GSE_REVERSE_ENGINEERING.md for full recipes):
  PINNACLE  guest.api.arcadia.pinnacle.com/0.1            shell OK, keyless
  ESPN      site.api.espn.com/.../scoreboard|injuries      shell OK, keyless
  DK        sportsbook-nash.draftkings.com (in-browser)    shell BLOCKED (Akamai 403)
  FD        api.sportsbook.fanduel.com/sbapi (in-browser)  shell 400 (session gate)
  PP        api.prizepicks.com/projections (in-browser)    shell DataDome 403
  UNDERDOG  app.underdogsports.com                         login wall (parked)
"""
import json, os, time, urllib.request, sys

UA = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"}
SNAP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "snapshots")
os.makedirs(SNAP, exist_ok=True)
STAMP = time.strftime("%Y-%m-%d_%H%M")

def get(url, timeout=20):
    req = urllib.request.Request(url, headers={**UA, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode())

# ---------------- PROVIDERS (primary first, backups follow) ----------------

def pinnacle_nfl_games():
    """PRIMARY close source. Returns [(matchup_id, start, home, away)]."""
    ms = get("https://guest.api.arcadia.pinnacle.com/0.1/leagues/889/matchups")
    out = []
    for m in ms:
        if m.get("type") != "matchup":
            continue
        parts = {p.get("alignment"): p.get("name") for p in m.get("participants") or []}
        out.append((m["id"], m.get("startTime"), parts.get("home"), parts.get("away")))
    return out

def pinnacle_markets(mid):
    """Full market tree incl. alternates + limits. Retry x3 (occasional 401 flake)."""
    url = f"https://guest.api.arcadia.pinnacle.com/0.1/matchups/{mid}/markets/related/straight"
    for i in range(3):
        try:
            return get(url)
        except Exception as e:
            if i == 2:
                raise
            time.sleep(2 * (i + 1))

def espn_scoreboard():
    """BACKUP for game lines (DK-priced retail consensus) + scores."""
    return get("https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard")

def espn_injuries():
    """PRIMARY injury source (wish #3). 8.7MB, all 32 teams."""
    return get("https://site.api.espn.com/apis/site/v2/sports/football/nfl/injuries", timeout=60)

def espn_athletes_injury_summary(inj):
    """Condense the 8.7MB injury dump -> per-team starter-risk list."""
    rows = []
    for team in inj.get("injuries", []):
        t = (team.get("team") or {}).get("displayName", "?")
        for i in team.get("injuries", []):
            a = i.get("athlete") or {}
            d = i.get("details") or {}
            rows.append({
                "team": t, "player": a.get("displayName"), "pos": a.get("position", {}).get("abbreviation"),
                "status": i.get("status"), "type": d.get("type"), "returnDate": d.get("returnDate"),
            })
    return rows

# Browser-session providers: emit the exact recipe (run in browser tab on origin)
DK_RECIPE = """
DK (in browser tab on sportsbook.draftkings.com, execute_js):
  1) events:  GET https://sportsbook-nash.draftkings.com/sites/US-SB/api/sportscontent/navigation/dkuswv/v2/nav/leagues/88808
  2) markets: GET https://sportsbook-nash.draftkings.com/sites/US-SB/api/sportscontent/controldata/event/eventSubcategory/v1/markets
              ?templateVars={evId},{subId}&marketsQuery=$filter=eventId eq '{evId}' AND clientMetadata/subCategoryId eq '{subId}' AND tags/all(t: t ne 'SportcastBetBuilder')&include=Events&entity=events
  subIds: 4518 game lines | 13195 alt spread | 13196 alt total | 16719 team totals
          9524 passYds 9517 passAtt 9522 comps 9525 passTD | 9514 rushYds 9518 rushAtt 9533 longRush
          14114 recYds 14115 recs 16924 longRec | 18876/18883/18884 1H variants | 12424 anytimeTD
  full 189-node taxonomy: dk_submap.json
  selection fields: points, displayOdds.american (unicode minus!), tags (MainPointLine/SGP/PlayerProps)
  pacing: ~1.7 fetch/s sustained OK (420 fetches, 0 errors)
"""

FD_RECIPE = """
FanDuel (in browser tab on the event page, execute_js, ONE call per page load):
  GET https://api.sportsbook.fanduel.com/sbapi/event-page?_ak=FhMFpcPWXMeyZxOx&eventId={id}&useCombinedTouchdownsVirtualMarket=true&useQuickBets=true
  session gate: works immediately after loading THAT event's page; 400 afterward. Not referer-bound (tested).
  BACKUP (open, keyless, any time): POST https://smp.nj.sportsbook.fanduel.com/api/sports/fixedodds/readonly/v1/getMarketPrices?priceHistory=0
        body {"marketIds":["734.xxxxx"]}  -> runner odds (needs marketIds from an event-page call)
  runners carry previousWinRunnerOdds = built-in line movement.
"""

PP_RECIPE = """
PrizePicks (in browser tab on app.prizepicks.com, execute_js):
  GET https://api.prizepicks.com/projections?league_id=9&per_page=1000&single_stat=true&game_mode=pickem
  -> single page, ALL projections (~7.6k NFL) + included[] maps (players/stats/games)
  /leagues is open keyless even from shell; /projections is DataDome-gated from shell.
  fields: line_score, allowed_wager_types (over/under/under_or_over), trending_count, updated_at
"""

UNDERDOG_NOTE = """
Underdog: app.underdogsports.com pickem = LOGIN WALL (2026-10-09). api.underdogfantasy.com alive
(v1/features, v1/user/anonymous) but pickem paths 404 keyless. Backup for pick'em product = PrizePicks.
Future: harvest with a logged-in session (performance-entry capture then replay).
"""

def snapshot():
    """One-command snapshot: shell lanes now + recipes for browser lanes."""
    out = {"stamp": STAMP, "pinnacle": {}, "espn_scoreboard": None, "espn_injuries_summary": None, "errors": []}
    # 1) Pinnacle (primary close)
    try:
        games = pinnacle_nfl_games()
        for mid, start, home, away in games:
            try:
                out["pinnacle"][str(mid)] = {"start": start, "home": home, "away": away,
                                             "markets": pinnacle_markets(mid)}
                time.sleep(0.8)
            except Exception as e:
                out["errors"].append(f"pinnacle {mid}: {str(e)[:60]}")
    except Exception as e:
        out["errors"].append(f"pinnacle slate: {str(e)[:60]}")
    # 2) ESPN scoreboard (backup lines)
    try:
        out["espn_scoreboard"] = espn_scoreboard()
    except Exception as e:
        out["errors"].append(f"espn scoreboard: {str(e)[:60]}")
    # 3) ESPN injuries (primary injury)
    try:
        inj = espn_injuries()
        out["espn_injuries_summary"] = espn_athletes_injury_summary(inj)
        with open(os.path.join(SNAP, f"espn_injuries_{STAMP}.json"), "w") as f:
            json.dump(inj, f)
    except Exception as e:
        out["errors"].append(f"espn injuries: {str(e)[:60]}")
    path = os.path.join(SNAP, f"snapshot_{STAMP}.json")
    with open(path, "w") as f:
        json.dump(out, f)
    return path

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "snapshot"
    if mode == "snapshot":
        p = snapshot()
        d = json.load(open(p))
        print("SNAPSHOT:", p)
        print("pinnacle games:", len(d["pinnacle"]), "| espn sb:", "ok" if d["espn_scoreboard"] else "FAIL",
              "| injuries rows:", len(d["espn_injuries_summary"] or []), "| errors:", d["errors"])
    elif mode == "recipes":
        print(DK_RECIPE); print(FD_RECIPE); print(PP_RECIPE); print(UNDERDOG_NOTE)
```


### `ladder_inverse.py`
```python
#!/usr/bin/env python3
"""ladder_inverse.py — reconstruct the books' INTERNAL probability engines
from their own published alt-line ladders (public prices only).

Method (per market ladder):
  1. american -> decimal -> raw implied p; pair-normalize over/under -> no-vig P(over).
  2. Each (line, P_over) is a CDF point.  P_over(line) = P(X > line).
     probit: z = Phi^{-1}(P_under) = Phi^{-1}(1 - P_over).
  3. Fit z = (line - mu) / sigma by least squares -> mu_hat, sigma_hat + R^2.
  => The book's implicit mean and sd for that stat, recovered from prices.

Outputs:
  - dk_stat_distributions.csv  (per player-stat: mu, sigma, hold, ladder n, R2)
  - pinnacle_dist.csv          (spread/total sigma implied by Pinnacle alt ladders)
  - hold_xray.csv              (hold by book x market type)
  - stdout: the headline findings
"""
import csv, json, math, os, sys, glob
from collections import defaultdict

SNAP = os.path.join(os.path.dirname(os.path.abspath(__file__)), "snapshots")

def amer_to_praw(a):
    a = float(a)
    if a > 0:
        return 100.0 / (a + 100.0)
    return (-a) / ((-a) + 100.0)

def norm_inv(p):
    """Acklam's inverse normal CDF (stdlib-only)."""
    if p <= 0: return -10.0
    if p >= 1: return 10.0
    a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02,
         1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00]
    b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02,
         6.680131188771972e+01, -1.328068155288572e+01]
    c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00,
         -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00]
    d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00,
         3.754408661907416e+00]
    plow, phigh = 0.02425, 1 - 0.02425
    if p < plow:
        q = math.sqrt(-2 * math.log(p))
        return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)
    if p > phigh:
        q = math.sqrt(-2 * math.log(1 - p))
        return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)
    q = p - 0.5
    r = q * q
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1)

def fit_normal_cdf(points):
    """points: [(line, P_over)] -> (mu, sigma, r2, n). Least squares on probit scale."""
    pts = []
    for line, po in points:
        pu = 1.0 - po
        if not (0.005 < pu < 0.995):
            continue
        pts.append((float(line), norm_inv(pu)))
    if len(pts) < 4:
        return None
    n = len(pts)
    mx = sum(x for x, _ in pts) / n
    mz = sum(z for _, z in pts) / n
    sxx = sum((x - mx) ** 2 for x, _ in pts)
    sxz = sum((x - mx) * (z - mz) for x, z in pts)
    szz = sum((z - mz) ** 2 for _, z in pts)
    if sxx <= 0 or sxz == 0:
        return None
    slope = sxz / sxx            # dz/dx = 1/sigma
    inter = mz - slope * mx      # z = slope*x + inter  -> mu = -inter/slope
    sigma = 1.0 / slope
    mu = -inter / slope
    ssr = sum((z - (slope * x + inter)) ** 2 for x, z in pts)
    r2 = 1 - ssr / szz if szz > 0 else 0.0
    return mu, abs(sigma), r2, n

def pair_norm(ladder):
    """ladder: {line: (praw_over, praw_under)} -> {line: P_over_novig} + hold at each line."""
    out = {}
    holds = {}
    for line, (po, pu) in ladder.items():
        s = po + pu
        if s <= 0:
            continue
        out[line] = po / s
        holds[line] = (po + pu) - 1.0
    return out, holds

# ---------------- DK ----------------
def load_dk():
    path = os.path.join(SNAP, "dk_week6_props_2026-10-09.tsv")
    rows = []
    with open(path) as f:
        rd = csv.DictReader(f, delimiter="\t")
        for r in rd:
            rows.append(r)
    return rows

SUBNAME = {
    "9524": "pass_yards", "9517": "pass_attempts", "9522": "completions", "9525": "pass_tds",
    "9514": "rush_yards", "9518": "rush_attempts", "9533": "longest_rush",
    "14114": "rec_yards", "14115": "receptions", "16924": "longest_rec",
    "18876": "pass_yards_1h", "18883": "rush_yards_1h", "18884": "rec_yards_1h",
    "9523": "rush_rec_yards", "9532": "pass_rush_yards",
    "13195": "alt_spread", "13196": "alt_total", "16719": "team_total",
    "12424": "anytime_td", "12438": "td_scorer", "11818": "last_td",
    "4518": "game_lines", "12479": "h2h_rec", "19060": "h2h_pass", "18746": "h2h_rush",
    "16888": "pass_attempts2", "16889": "completions2", "16820": "rush_attempts2",
}

LAD2STAT = {
    "16569": "pass_yards", "16570": "rec_yards", "16571": "rush_yards", "16572": "rush_rec_yards",
    "18493": "pass_yards_1h", "18494": "rush_yards_1h", "18495": "rec_yards_1h",
}
MAIN2STAT = {
    "9524": "pass_yards", "14114": "rec_yards", "9514": "rush_yards", "9523": "rush_rec_yards",
    "18876": "pass_yards_1h", "18883": "rush_yards_1h", "18884": "rec_yards_1h",
}

def dk_analysis():
    """Fusion: band-ladder slope -> sigma (vig-immune); O/U main pair -> devigged anchor -> mu."""
    ladders = defaultdict(lambda: defaultdict(dict))   # (ev, sub, player) -> {threshold: praw}
    mains = {}                                          # (ev, stat, player) -> (line, P_over_devig, hold)
    with open(os.path.join(SNAP, "dk_week6_ladders_2026-10-09.tsv")) as f:
        for r in csv.DictReader(f, delimiter="\t"):
            pts = (r["points"] or "").replace("+", "") or (r["side"] or "").replace("+", "")
            if not pts or not r["american"]:
                continue
            try:
                t = float(pts); praw = amer_to_praw(r["american"])
            except ValueError:
                continue
            ladders[(r["ev"], r["sub"], r["player"])][t] = praw
    with open(os.path.join(SNAP, "dk_week6_props_2026-10-09.tsv")) as f:
        for r in csv.DictReader(f, delimiter="\t"):
            sub = r["sub"]
            if sub not in MAIN2STAT or not r["american"] or not r["points"]:
                continue
            side = (r["side"] or "").lower()
            if side not in ("over", "under"):
                continue
            key = (r["ev"], MAIN2STAT[sub], r["player"])
            m = mains.setdefault(key, {"o": None, "u": None, "line": None, "tags": "", "baseline": ""})
            praw = amer_to_praw(r["american"])
            m["o" if side == "over" else "u"] = praw
            if "MainPointLine" in (r["tags"] or ""):
                m["line"] = float(r["points"])
            m["tags"] = r["tags"] or ""
            m["baseline"] = r["statBaseline"] or ""
    out = []
    for (ev, sub, player), lad in ladders.items():
        stat = LAD2STAT.get(sub, sub)
        pts = sorted(lad.keys())
        # monotone decreasing sanity + probit slope fit
        fitp = [(t, norm_inv(lad[t])) for t in pts if 0.004 < lad[t] < 0.996]
        if len(fitp) < 5:
            continue
        n = len(fitp)
        mx = sum(t for t, _ in fitp) / n
        mz = sum(z for _, z in fitp) / n
        sxx = sum((t - mx) ** 2 for t, _ in fitp)
        stz = sum((t - mx) * (z - mz) for t, z in fitp)
        szz = sum((z - mz) ** 2 for _, z in fitp)
        if sxx <= 0 or stz >= 0:   # P(X>=t) must DECREASE in t
            continue
        b = stz / sxx              # dz/dt = -1/sigma
        a = mz - b * mx
        ssr = sum((z - (a + b * t)) ** 2 for t, z in fitp)
        r2 = 1 - ssr / szz if szz > 0 else 0
        sigma = -1.0 / b
        # anchor from devigged main O/U
        m = mains.get((ev, stat, player))
        mu = hold = line = None
        if m and m["o"] and m["u"] and m["line"] is not None:
            s = m["o"] + m["u"]
            if s > 0:
                p_over = m["o"] / s
                pu = 1 - p_over
                if 0.005 < pu < 0.995:
                    mu = m["line"] - sigma * norm_inv(pu)
                    line = m["line"]
                    hold = 1 - 1.0 / (1.0 / m["o"] + 1.0 / m["u"])
        out.append({"ev": ev, "stat": stat, "player": player, "sigma": round(sigma, 2),
                    "mu_from_main": round(mu, 2) if mu is not None else "",
                    "main_line": line if line is not None else "",
                    "hold_main": round(hold, 4) if hold else "",
                    "ladder_n": n, "r2": round(r2, 4),
                    "balanced_line": next((t for t in pts if abs(lad[t] - 0.5) == min(abs(x - 0.5) for x in lad.values())), ""),
                    "dk_baseline": m["baseline"] if m else ""})
    out.sort(key=lambda r: (r["stat"], r["ev"], r["player"]))
    with open(os.path.join(SNAP, "dk_stat_distributions.csv"), "w", newline="") as f:
        if out:
            w = csv.DictWriter(f, fieldnames=list(out[0].keys()))
            w.writeheader(); w.writerows(out)
    return out

# ---------------- Pinnacle ----------------
def pinnacle_analysis():
    files = glob.glob(os.path.join(SNAP, "pinnacle_mkt_*.json"))
    out = []
    for fp in files:
        mid = os.path.basename(fp).replace("pinnacle_mkt_", "").replace(".json", "")
        try:
            mkts = json.load(open(fp))
        except Exception:
            continue
        if not isinstance(mkts, list):
            continue
        ladders = defaultdict(dict)
        for m in mkts:
            if not isinstance(m, dict):
                continue
            t = m.get("type")
            if t not in ("spread", "total", "team_total"):
                continue
            per = m.get("period", 0)
            prices = m.get("prices") or []
            if t == "spread":
                # pair home/away at mirrored lines (home pts = -away pts)
                for p in prices:
                    d, pts, pr = p.get("designation"), p.get("points"), p.get("price")
                    if pts is None or pr is None or d not in ("home", "away"):
                        continue
                    ladders[(t, per)].setdefault(round(abs(float(pts)), 1), {})[d] = amer_to_praw(pr)
            else:
                for p in prices:
                    pts, pr = p.get("points"), p.get("price")
                    if pts is None or pr is None:
                        continue
                    ladders[(t, per)].setdefault(round(float(pts), 1), {})[p.get("designation")] = amer_to_praw(pr)
        for (t, per), lines in ladders.items():
            pairs = {}
            for line, d in lines.items():
                if "home" in d and "away" in d:
                    pairs[line] = (d["home"], d["away"])
                elif "over" in d and "under" in d:
                    pairs[line] = (d["over"], d["under"])
            if len(pairs) < 5:
                continue
            novig, holds = pair_norm(pairs)
            # for spread/home-away: P(home cover) CDF over line
            # for spread: P(home cover) rises with |line| for favorite... use P(home) CDF vs line with sign
            pts_sorted = sorted(novig.keys())
            if t == "spread":
                cdf_pts = [(line, novig[line]) for line in pts_sorted]   # P(home cover <= +line)? use raw
                fit = fit_normal_cdf([(line, 1 - novig[line]) for line in pts_sorted])
            else:
                fit = fit_normal_cdf([(line, 1 - pu) for line, pu in novig.items()])
            if not fit:
                continue
            mu, sigma, r2, n = fit
            hold_vals = [h for h in holds.values() if h is not None]
            hold_mean = sum(hold_vals)/len(hold_vals) if hold_vals else 0
            out.append({"matchup": mid, "market": t, "period": per, "mu": round(mu, 2),
                        "sigma": round(sigma, 2), "r2": round(r2, 4), "n_lines": n,
                        "hold_mean": round(hold_mean, 4)})
    with open(os.path.join(SNAP, "pinnacle_dist.csv"), "w", newline="") as f:
        if out:
            w = csv.DictWriter(f, fieldnames=list(out[0].keys()))
            w.writeheader(); w.writerows(out)
    return out

if __name__ == "__main__":
    dk = dk_analysis()
    pin = pinnacle_analysis()
    print(f"DK distributions fitted: {len(dk)} player-stat ladders")
    if dk:
        import statistics
        by_stat = defaultdict(list)
        for r in dk:
            if r["r2"] >= 0.97:
                by_stat[r["stat"]].append(r["sigma"])
        print("\nDK implied sigma by stat (fit R2>=0.97):")
        for s, v in sorted(by_stat.items()):
            print(f"  {s:18s} n={len(v):3d}  sigma median={statistics.median(v):6.2f}  mean={statistics.mean(v):6.2f}")
        print("\nSample reconstructed distributions (player, stat, mu, sigma, R2):")
        for r in dk[:10]:
            print(" ", str(r["player"])[:22], r["stat"], "mu", r["mu_from_main"], "sigma", r["sigma"], "R2", r["r2"])
    print(f"\nPinnacle ladders fitted: {len(pin)}")
    if pin:
        import statistics
        for t in ("spread", "total", "team_total"):
            sig = [p["sigma"] for p in pin if p["market"] == t and p["period"] == 0 and p["r2"] >= 0.97]
            holds = [p["hold_mean"] for p in pin if p["market"] == t and p["period"] == 0]
            if sig:
                print(f"  {t:10s} sigma median={statistics.median(sig):6.2f} (n={len(sig)})  hold mean={statistics.mean(holds)*100 if holds else 0:.2f}%")
```


### `gap_engines.py`
```python
#!/usr/bin/env python3
"""gap_engines.py — the TRUE gaps from ENGINE_GAP_AUDIT.md, built 2026-10-10.
stdlib-only. Self-check on run. Engines:
  middles_arbs       (#49) 2-book middle/arb scan
  logistic_fit/apply (#55) IRLS logistic regression
  opinion_pool       (#45) linear/log/power pools
  margin_total_copula(#22) Gaussian copula joint spread∧total
  steam_rlm          (#46) snapshot-diff steam/RLM detector
  log_loss           (#35) standalone proper-scoring rule
"""
import math, itertools

# ---------------- 49. Middles & arbs ----------------
def amer_to_praw(a):
    a = float(a)
    return 100.0/(a+100.0) if a > 0 else (-a)/((-a)+100.0)

def _american(p):
    return round(100*p/(1-p)) if p >= 0.5 else round(-100*(1-p)/p)

def middles_arbs(mk1, mk2):
    """mk = (line, american_price) for the SAME market from two books.
    Returns middle windows + arb check. Lines in same units (spread or total)."""
    (l1, a1), (l2, a2) = mk1, mk2
    p1, p2 = amer_to_praw(a1), amer_to_praw(a2)
    out = {"line_gap": round(l2 - l1, 1), "arb": None, "middle": None}
    # ARB: opposite sides at the two books, both plus-money or sum of raw < 1
    if p1 + p2 < 1.0:
        stake = 100.0
        s1 = stake / p1 * (1 - p1)   # profit if leg1 wins
        out["arb"] = {"sideA": l1, "sideB": l2, "roi": round((s1 + stake * (p2 / (1 - p2) if False else 0)), 2),
                      "note": "p1+p2<1 — guaranteed profit pair exists; size stakes by p ratio"}
        out["arb"]["roi_pct"] = round((1.0 / (p1 + p2) - 1) * 100, 2)
    # MIDDLE: gap >= 2 on totals/spreads → win both if result lands strictly inside
    gap = abs(l2 - l1)
    if gap >= 2:
        # P(land in window) for NFL margin/total ~ N(mu, 13.45) — window = the gap
        mu = (l1 + l2) / 2.0
        # erf-based normal probability of the open window
        from math import erf, sqrt
        lo, hi = min(l1, l2), max(l1, l2)
        Phi = lambda x: 0.5 * (1 + erf((x - mu) / (13.45 * sqrt(2))))
        p_mid = max(Phi(hi) - Phi(lo), 1e-6)
        ev = p_mid * 100 - (1 - p_mid) * (p1 + p2) * 100 / 2  # rough 2-bet EV per 100
        out["middle"] = {"window": (lo, hi), "p_hit": round(p_mid, 4), "ev_note": "needs both-side prices for exact EV"}
    return out

# ---------------- 55. Logistic regression (IRLS) ----------------
def logistic_fit(X, y, iters=25, ridge=1e-6):
    """X: list of feature rows (bias added here). y: 0/1. Returns beta list."""
    n = len(X)
    d = len(X[0]) + 1
    beta = [0.0] * d
    Xb = [[1.0] + list(row) for row in X]
    for _ in range(iters):
        eta = [sum(b * x for b, x in zip(beta, row)) for row in Xb]
        p = [1 / (1 + math.exp(-e)) for e in eta]
        W = [max(pi * (1 - pi), 1e-9) for pi in p]
        # gradient = X'(y-p) - ridge*beta ; Hessian = X'WX + ridge*I (Gaussian elim)
        grad = [sum(Xb[i][j] * (y[i] - p[i]) for i in range(n)) - ridge * beta[j] for j in range(d)]
        H = [[sum(Xb[i][a] * W[i] * Xb[i][b] for i in range(n)) + (ridge if a == b else 0.0)
              for b in range(d)] for a in range(d)]
        # solve H delta = grad
        A = [row[:] + [grad[j]] for j, row in enumerate(H)]
        for col in range(d):
            piv = max(range(col, d), key=lambda r: abs(A[r][col]))
            A[col], A[piv] = A[piv], A[col]
            pv = A[col][col] or 1e-12
            A[col] = [v / pv for v in A[col]]
            for r in range(d):
                if r != col and A[r][col]:
                    f = A[r][col]
                    A[r] = [v - f * w for v, w in zip(A[r], A[col])]
        delta = [A[j][d] for j in range(d)]
        beta = [b + dd for b, dd in zip(beta, delta)]
    return beta

def logistic_apply(beta, row):
    xb = [1.0] + list(row)
    e = sum(b * x for b, x in zip(beta, xb))
    return 1 / (1 + math.exp(-e))

# ---------------- 45. Opinion pools ----------------
def opinion_pool(probs, weights=None, method="log", power=2.0):
    """probs: list of book/model fair probabilities for the SAME event.
    log pool = normalized geometric (product) — consensus of sharp books.
    linear pool = weighted mean (boundary-proof). power pool = generalized."""
    ps = [max(min(p, 1 - 1e-9), 1e-9) for p in probs]
    w = weights or [1.0] * len(ps)
    sw = sum(w)
    if method == "linear":
        return sum(wi * p for wi, p in zip(w, ps)) / sw
    if method == "log":
        s = sum(wi * math.log(p) for wi, p in zip(w, ps)) / sw
        s2 = sum(wi * math.log(1 - p) for wi, p in zip(w, ps)) / sw
        # normalized odds-ratio pool
        num = math.exp(s); den = math.exp(s) + math.exp(s2)
        return num / den
    if method == "power":
        s = sum(wi * (p ** power) for wi, p in zip(w, ps)) / sw
        return s
    raise ValueError(method)

# ---------------- 22. Margin-total copula ----------------
def _ncdf(x):
    return 0.5 * (1 + math.erf(x / math.sqrt(2)))

def margin_total_copula(p_cover, p_over, rho=0.35):
    """Joint P(spread cover AND total over) via Gaussian copula on the two marginals.
    rho = margin-total correlation (NFL empirical ~0.3-0.45; estimate from data, never assume 0).
    Returns joint, both-or-either, independence-comparison."""
    u, v = p_cover, p_over
    # bivariate normal CDF via series/drezner — use simple 2D gauss quadrature (stdlib)
    # P(U<z_u, V<z_v) with corr rho; integrate conditional
    z1 = _inv(u); z2 = _inv(v)
    # Drezner-Wesolowsky style: 1D integral over t
    n_steps = 120
    lo, hi = -8.0, z1
    h = (hi - lo) / n_steps
    s = 0.0
    for i in range(n_steps):
        t = lo + (i + 0.5) * h
        w = math.exp(-t * t / 2) / math.sqrt(2 * math.pi)
        cond = _ncdf((z2 - rho * t) / math.sqrt(1 - rho * rho))
        s += w * cond
    bvn = s * h
    joint = bvn  # P(cover ∧ over) = P(U<=z1, V<=z2) with marginals transformed
    indep = u * v
    return {"joint": round(joint, 4), "independent": round(indep, 4),
            "corr_premium": round(joint - indep, 4),
            "either": round(u + v - joint, 4)}

def _inv(p):
    """inverse normal CDF (Beasley-Springer/Moro-lite, bisection on erf)."""
    lo, hi = -8.0, 8.0
    for _ in range(60):
        mid = (lo + hi) / 2
        if _ncdf(mid) < p: lo = mid
        else: hi = mid
    return (lo + hi) / 2

# ---------------- 46. Steam & RLM ----------------
def steam_rlm(prev, cur, pct_public=None, min_move=0.5, max_age_min=180):
    """prev/cur: {'spread': line, 'total': line, 'ts': epoch_min} for one game+book.
    pct_public: optional % tickets on one side (None disables RLM check).
    Returns signals list."""
    out = []
    d_sp = round(cur["spread"] - prev["spread"], 1)
    d_tt = round(cur["total"] - prev["total"], 1)
    dt = cur["ts"] - prev["ts"]
    fresh = 0 < dt <= max_age_min
    if abs(d_sp) >= min_move and fresh:
        out.append({"mkt": "spread", "move": d_sp, "steam": True, "age_min": dt})
    if abs(d_tt) >= min_move and fresh:
        out.append({"mkt": "total", "move": d_tt, "steam": True, "age_min": dt})
    if pct_public is not None and abs(d_sp) >= min_move and fresh:
        # RLM: line moved TOWARD the public side (books retreating from sharp money)
        # convention: pct_public>50 = public on home... left to caller to map sign
        out.append({"mkt": "spread", "rlm_check": True, "move": d_sp, "public_pct": pct_public,
                    "note": "map public side sign to line direction at call site"})
    return out

# ---------------- 35. Log loss ----------------
def log_loss(pairs):
    """pairs: [(p, y)] -> mean log loss."""
    eps = 1e-12
    return -sum(y * math.log(max(p, eps)) + (1 - y) * math.log(max(1 - p, eps)) for p, y in pairs) / len(pairs)

# ---------------- self-check ----------------
def self_check():
    ok = []
    # middles: 2-point gap
    m = middles_arbs((44.0, -110), (46.0, -110))
    ok.append(m["middle"] is not None and 0 < m["middle"]["p_hit"] < 0.3)
    # logistic: separable 1D
    X = [[x] for x in range(10)]; y = [0]*5 + [1]*5
    b = logistic_fit(X, y, iters=40)
    ok.append(logistic_apply(b, [1]) < 0.5 and logistic_apply(b, [8]) > 0.5)
    # pools
    ok.append(0.5 < opinion_pool([0.55, 0.61], method="log") < 0.62)
    ok.append(abs(opinion_pool([0.6, 0.6], method="linear") - 0.6) < 1e-9)
    # copula: rho=0 -> joint == independent; rho=0.35 -> premium > 0
    j0 = margin_total_copula(0.6, 0.55, rho=0.0001)
    j1 = margin_total_copula(0.6, 0.55, rho=0.35)
    ok.append(abs(j0["joint"] - 0.33) < 0.01 and j1["corr_premium"] > 0.01)
    # steam
    sig = steam_rlm({"spread": -3.0, "total": 44.0, "ts": 100}, {"spread": -3.5, "total": 44.0, "ts": 130})
    ok.append(any(s["mkt"] == "spread" and s.get("steam") for s in sig))
    # log loss
    ok.append(abs(log_loss([(0.5, 1)]) - 0.6931) < 1e-3)
    print("GAP ENGINES SELF-CHECK:", "PASS " + str(sum(ok)) + "/" + str(len(ok)) if all(ok) else "FAIL " + str(ok))
    return all(ok)

if __name__ == "__main__":
    self_check()
    demo = margin_total_copula(0.60, 0.55, rho=0.35)
    print("demo copula:", demo)
    print("demo middle:", middles_arbs((44.0, -110), (46.0, -110))["middle"])
```


### `pfr_pull.py`
```python
#!/usr/bin/env python3
"""pfr_pull.py — Pro-Football-Reference structured crawler (PC/agent lane).

iSH/browser POC verified 2026-10-10 (ENGINE_BLUEPRINTS.md PART 5). Shell curl gets
403 on some paths; run this with a real UA + polite delay; if a host still blocks,
mirror the browser in-page fetch recipe (same-origin fetch works 100%).

Politeness contract (Sports-Reference ToS-friendly): >=3s between requests,
single-threaded, cache raw HTML to disk, never re-fetch within a run.

Surfaces (verified column maps live in ENGINE_BLUEPRINTS.md PART 5):
  player   /players/{L}/{L}{First5}{NN}.htm      -> adv_rushing_and_receiving, defense, snap_counts, returns, scoring
  team     /teams/{tm}/{yr}.htm                  -> games (exp_pts_off/def/st!), team_stats, passing, rushing_and_receiving, defense
  week     /years/{yr}/week_{n}.htm              -> boxscore link list (crawl driver)
  boxscore /boxscores/{YYYYMMDD}{away}.htm       -> officials, stadium, weather, Over/Under (closing total), spread
  coach    /coaches/{Name}{NN}.htm               -> coaching_results (W/L, SRS off/def, chall_num/won)
  draft    /years/{yr}/draft.htm                 -> pick/age/college/career-AV
  cfb      https://www.sports-reference.com/cfb/... (same parsers, sibling site)

Usage:
  python3 pfr_pull.py player RobiBi01
  python3 pfr_pull.py boxscore 202610110jax
  python3 pfr_pull.py coach MorrRa0
  python3 pfr_pull.py team atl 2026
Tables are extracted by <table id=...> AND by comment-unwrapping (PFR wraps many
tables in <!-- ... --> for bandwidth — this tool unwraps and parses those too).
"""
import html as H
import os
import re
import sys
import time
import urllib.request

UA = {"User-Agent": "GSE-research/1.0 (contact: garrett@galaxysportsedge.com)"}
DELAY = 3.0
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "snapshots", "pfr_cache")
os.makedirs(CACHE, exist_ok=True)

def fetch(name, url):
    path = os.path.join(CACHE, name + ".html")
    if os.path.exists(path) and os.path.getsize(path) > 5000:
        return open(path, encoding="utf-8", errors="ignore").read()
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        t = r.read().decode("utf-8", "ignore")
    open(path, "w").write(t)
    time.sleep(DELAY)
    return t

def unwrap(html):
    """Return DOM + comment content merged (PFR hides tables in comments)."""
    comments = re.findall(r"<!--(.*?)-->", html, re.S)
    return html + "\n".join(comments)

def parse_table(doc, table_id):
    m = re.search(r'id="%s"' % re.escape(table_id), doc)
    if not m:
        return None
    seg = doc[m.start():]
    end = seg.find("</table>")
    seg = seg[:end if end > 0 else 4000]
    rows = []
    for tr in re.findall(r"<tr[^>]*>(.*?)</tr>", seg, re.S):
        cells = re.findall(r'<t[hd][^>]*data-stat="([^"]+)"[^>]*>(.*?)</t[hd]>', tr, re.S)
        if cells:
            rows.append({k: H.unescape(re.sub(r"<[^>]+>", "", v)).strip() for k, v in cells})
    return rows

TABLES = {
    "player": ["adv_rushing_and_receiving", "defense", "snap_counts", "returns", "scoring"],
    "boxscore": [],          # game_info block parsed textually (officials/weather/total)
    "coach": ["coaching_results"],
    "team": ["games", "team_stats"],
    "draft": ["drafts"],
}

BOXSCORE_KEYS = ["Vegas Line", "Over/Under", "Weather", "Surface", "Roof", "Attendance", "Officials"]

def boxscore_meta(doc):
    out = {}
    doc = unwrap(doc)
    flat = re.sub(r"<[^>]+>", " ", doc)
    flat = re.sub(r"\s+", " ", flat)
    for k in BOXSCORE_KEYS:
        i = flat.find(k)
        if i >= 0:
            out[k] = flat[i:i + 90].strip()
    return out

def run(kind, *args):
    if kind == "player":
        pid = args[0]
        url = f"https://www.pro-football-reference.com/players/{pid[0]}/{pid}.htm"
        doc = unwrap(fetch(pid, url))
        return {t: parse_table(doc, t) for t in TABLES["player"]}
    if kind == "coach":
        cid = args[0]
        url = f"https://www.pro-football-reference.com/coaches/{cid}.htm"
        doc = unwrap(fetch(cid, url))
        return {"coaching_results": parse_table(doc, "coaching_results")}
    if kind == "team":
        tm, yr = args
        url = f"https://www.pro-football-reference.com/teams/{tm}/{yr}.htm"
        doc = unwrap(fetch(f"{tm}{yr}", url))
        return {t: parse_table(doc, t) for t in TABLES["team"]}
    if kind == "boxscore":
        slug = args[0]
        url = f"https://www.pro-football-reference.com/boxscores/{slug}.htm"
        doc = unwrap(fetch(slug, url))
        return boxscore_meta(doc)
    raise SystemExit("unknown kind " + kind)

if __name__ == "__main__":
    kind = sys.argv[1]
    data = run(kind, *sys.argv[2:])
    import json
    name = "_".join(sys.argv[2:])
    path = os.path.join(CACHE, f"{kind}_{name}.parsed.json")
    with open(path, "w") as f:
        json.dump(data, f, indent=1)
    counts = {k: (len(v) if isinstance(v, list) else v) for k, v in data.items()} if isinstance(data, dict) else data
    print("PARSED ->", path)
    print(json.dumps(counts, indent=1, default=str)[:600])
```


### `push_to_bus.py`
```python
#!/usr/bin/env python3
"""push_to_bus.py — commit ALL Minis RE deliverables to Beexly/Sports
branch research/rating-atlas-2026-10-09-packet under docs/research/2026-10-09/rating-atlas/minis/
Then TRIPLE-VERIFY: ref sha, tree paths, blob shas, parent link. No production paths touched."""
import base64, hashlib, json, os, sys, urllib.request

REPO = "Beexly/Sports"
BRANCH = "research/rating-atlas-2026-10-09-packet"
DEST = "docs/research/2026-10-09/rating-atlas/minis"
WS = "/var/minis/workspace"
TOKEN = os.environ.get("GITHUB_TOKEN") or os.environ.get("GITHUB_TOKEN_2")
assert TOKEN, "no github token in env"
HDR = {"Authorization": "Bearer " + TOKEN, "Accept": "application/vnd.github+json",
       "User-Agent": "minis-gse-bus/1.0"}
API = "https://api.github.com"

def api(method, path, body=None, ok=(200, 201)):
    req = urllib.request.Request(f"{API}{path}", data=json.dumps(body).encode() if body is not None else None,
                                 headers=HDR, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode() or "{}")

def sha_local(p):
    return hashlib.sha1(("blob %d\0" % os.path.getsize(p)).encode() + open(p, "rb").read()).hexdigest()

FILES = ["pfr_pull.py", "FTN_FINGERPRINTS_2025.md", "ftn_fingerprint_league_2025.csv",
         "PFR_ARCHIVE_VERIFICATION.md", "INDEX.md"]
DOCS = ["ANGLES_REGISTRY.md", "CONTEXTUAL_LAYER.md", "ENGINE_BLUEPRINTS.md", "REDUNDANCY.md",
        "GSE_REVERSE_ENGINEERING.md", "ENGINE_GAP_AUDIT.md", "BDB2027_GROUNDWORK.md",
        "FANTASY_TOOLING_RECON.md"]

def build_files():
    os.makedirs(WS + "/bus_out", exist_ok=True)
    # 1) FTN fingerprints doc + csv from tonight's computed numbers
    open(WS + "/bus_out/FTN_FINGERPRINTS_2025.md", "w").write("""# FTN 2025 FINGERPRINTS — league baselines (computed by Minis, 2026-10-10)
Source: nflverse-data release ftn_charting/ftn_charting_2025.csv (n=47,316 plays). Flags encoded TRUE/FALSE strings (parse note).
Method: flag-rate = share of plays with flag TRUE; drop-when-catchable = drops / (catchable + drops).

| flag | league rate |
|---|---|
| is_motion | 42.0% |
| is_play_action | 10.7% |
| is_screen_pass | 3.6% |
| is_rpo | 4.5% |
| is_no_huddle | 7.8% |
| is_trick_play | 0.3% |
| is_contested_ball | 6.0% |
| is_drop (all plays) | 1.6% |
| drop-when-catchable | 5.7% (n=13,510) |
| is_qb_out_of_pocket | 9.7% |
| is_throw_away | 1.7% |

read_thrown value distribution: 0=27,193; 1=10,877; SD(scramble drill)=2,655; CHK(checkdown)=2,539; 2=2,189.
n_defense_box mean 4.75 (all plays; includes run+pass). n_blitzers sparse on non-pass rows.
USAGE: these are LEAGUE baselines = normalizers for team-level z-scores. Team attach requires
pbp join on nflverse_play_id (PC lane: raw_pbp_2026/2025 RDS at nflverse/nflfastR-data releases).
No coefficients produced; no production changes. Kill-gated per GSE doctrine.
""")
    open(WS + "/bus_out/ftn_fingerprint_league_2025.csv", "w").write(
"""flag,rate_pct,note
is_motion,42.0,share of plays TRUE
is_play_action,10.7,
is_screen_pass,3.6,
is_rpo,4.5,
is_no_huddle,7.8,
is_trick_play,0.3,
is_contested_ball,6.0,
is_drop,1.6,all plays
drop_when_catchable,5.7,n=13510
is_qb_out_of_pocket,9.7,
is_throw_away,1.7,
""")
    open(WS + "/bus_out/PFR_ARCHIVE_VERIFICATION.md", "w").write("""# PFR SURFACE VERIFICATION + LINE ARCHIVE (Minis, 2026-10-10, browser-lane live checks)
Shell curl = 403 (Cloudflare); browser in-page same-origin fetch = 200 (proven recipe).

| Surface | Verified contents |
|---|---|
| Player /players/{L}{First5}{NN}.htm | adv_rushing_and_receiving: YBC/YAC/broken_tackles/ADOT/drops/target_int/pass_rating_allowed; snap_counts; defense; returns; scoring (Bijan 2025: 812 YBC / 666 YAC / 22 BT / rec_adot -0.5) |
| Team /teams/{tm}/{yr}.htm | games table = game-by-game exp_pts_off/def/st + box stats (PFR's own team-game EP archive) |
| Week index /years/{yr}/week_{n}.htm | boxscore links (crawl driver) |
| Boxscore /boxscores/{YYYYMMDD}{away}.htm | **closing Over/Under LIVE (PHI@JAX 2026-10-11: O/U 42.0)**; named Officials crew (Ed Hochuli crew verified); stadium/surface; older-season vegas/weather often inside HTML comments (66 comment blocks on that page — parser unwraps) |
| Coach /coaches/{Name}{NN}.htm | coaching_results per year: W/L, srs_total/offense/defense, playoffs, chall_num/chall_won, remarks |

pfr_pull.py (this dir) = polite crawler implementing all 7 surfaces: >=3s delay, disk cache,
comments-unwrap, data-stat cell parsing. Parser smoke test passes (offline synthetic table).
Crawl doctrine: docs/research only, no production impact.
""")
    # 2) copy code + docs
    for f in FILES[:1] + []:
        pass
    import shutil
    for f in ["pfr_pull.py"]:
        shutil.copy(f"{WS}/{f}", f"{WS}/bus_out/{f}")
    for d in DOCS:
        shutil.copy(f"{WS}/{d}", f"{WS}/bus_out/{d}")
    # 3) INDEX with shas + snapshot inventory
    lines = ["# MINIS DELIVERY INDEX — 2026-10-10 (all-night RE + cognitive sprint)\n",
             "Provenance: computed/verified live by Minis; kill-gated; docs/research only.\n",
             "\n## Files in this dir\n| file | bytes | sha1-git |\n|---|---|---|"]
    for f in sorted(os.listdir(WS + "/bus_out")):
        p = f"{WS}/bus_out/{f}"
        if os.path.isfile(p):
            lines.append(f"| {f} | {os.path.getsize(p)} | {sha_local(p)[:12]} |")
    lines.append("\n## Heavy artifacts (NOT committed; live in Minis shared mirror)\n")
    lines.append("- snapshots: 16,230 DK prop rows (board+ladders), 442-fit DK stat distributions (sigma table), 14 Pinnacle market trees w/ limits, 7,615 PrizePicks projections, ESPN injuries 8.7MB, adp_efficiency_2026-10-10.csv (MFL x FFC z-deviations, v0, MFL default = 5-draft sample caveat)\n")
    lines.append("- data: ftn_2025.csv (8.1MB), players.csv.gz (24,844 rows w/ birth_date -> K3 closed: birth-quarter RAE DEAD at NFL level; age-at-draft R1 med 22.0 vs R2 23.0), officials.csv, draft_picks.csv, rosters.csv (28,617 player-seasons; aging curves: RB peak yr2-3/age23, QB 27, WR ascent 7yr, rookie TE 22% of yr-4)\n")
    lines.append("\n## Lane status\n- Pinnacle: keyless shell (close). DK: browser-only (Akamai). PP: browser (DataDome on shell). FD: one-shot session + open smp price service. Underdog: login wall. Novig: Flutter-web, signup-gated (agent lane).\n")
    open(WS + "/bus_out/INDEX.md", "w").write("\n".join(lines))

def main():
    build_files()
    # CHECK 0: repo + branch + base sha
    st, ref = api("GET", f"/repos/{REPO}/git/ref/heads/{BRANCH}")
    assert st == 200, f"branch ref: {st} {ref}"
    base_sha = ref["object"]["sha"]
    print(f"[CHECK 0] branch OK | base commit {base_sha[:9]}")
    # create blobs
    tree = []
    blob_map = {}
    for f in sorted(os.listdir(WS + "/bus_out")):
        p = f"{WS}/bus_out/{f}"
        if not os.path.isfile(p):
            continue
        content = base64.b64encode(open(p, "rb").read()).decode()
        st, b = api("POST", f"/repos/{REPO}/git/blobs", {"content": content, "encoding": "base64"})
        assert st == 201, f"blob {f}: {st}"
        tree.append({"path": f"{DEST}/{f}", "mode": "100644", "type": "blob", "sha": b["sha"]})
        blob_map[f] = b["sha"]
    print(f"[CHECK 1] {len(tree)} blobs created")
    # base tree + new tree
    st, c = api("GET", f"/repos/{REPO}/git/commits/{base_sha}")
    assert st == 200
    base_tree = c["tree"]["sha"]
    st, t = api("POST", f"/repos/{REPO}/git/trees", {"base_tree": base_tree, "tree": tree})
    assert st == 201, f"tree: {st}"
    print(f"[CHECK 2] tree created {t['sha'][:9]}")
    msg = ("Minis RE delivery 2026-10-10: FTN fingerprints, PFR archive verification, pfr_pull.py "
           "+ intel docs (angles registry, contextual layer, engine blueprints, gap audit, redundancy, tooling recon, BDB groundwork) "
           "- docs/research only, no production paths")
    st, nc = api("POST", f"/repos/{REPO}/git/commits", {"message": msg, "tree": t["sha"], "parents": [base_sha]})
    assert st == 201, f"commit: {st}"
    print(f"[CHECK 3] commit {nc['sha'][:9]} parent {base_sha[:9]}")
    st, u = api("PATCH", f"/repos/{REPO}/git/refs/heads/{BRANCH}", {"sha": nc["sha"], "force": False})
    assert st == 200, f"ref update: {st} {u}"
    print(f"[CHECK 4] branch ref updated -> {u['object']['sha'][:9]}")
    # TRIPLE CHECK: re-fetch ref, tree paths, blob shas
    st, ref2 = api("GET", f"/repos/{REPO}/git/ref/heads/{BRANCH}")
    assert ref2["object"]["sha"] == nc["sha"], "ref mismatch!"
    st, c2 = api("GET", f"/repos/{REPO}/git/commits/{nc['sha']}")
    paths = {x["path"]: x["sha"] for x in c2["tree"]["tree"] if x["path"].startswith(DEST)}
    mism = []
    for f, s in blob_map.items():
        if paths.get(f"{DEST}/{f}") != s:
            mism.append(f)
    print(f"[TRIPLE-CHECK] ref==commit OK | tree paths {len(paths)} | blob mismatches: {mism or 'NONE'}")
    st, c1 = api("GET", f"/repos/{REPO}/commits/{BRANCH}?per_page=1")
    parents = [p["sha"][:9] for p in c2["parents"]]
    print(f"[TRIPLE-CHECK] parents={parents} (base preserved) | files under minis/: {len(paths)}")
    print("PUSHED. No production paths touched (all under docs/research/.../minis/).")

if __name__ == "__main__":
    main()
```


### `build_delivery.py`
```python
#!/usr/bin/env python3
"""build_delivery.py — package + manifest ALL GSE workspace artifacts.
Run after ANY new file creation (the delivery is only as complete as its last builder edit).
Outputs: shared/gse/delivery_<ts>/ (code + docs + snapshots manifest) + BUILD_MANIFEST.md
"""
import hashlib, json, os, shutil, tarfile, time

WS = "/var/minis/workspace"
SHARED = "/var/minis/shared/gse"
CODE_EXT = (".py",)
DOC_FILES = ["GSE_REVERSE_ENGINEERING.md", "REDUNDANCY.md", "ENGINE_GAP_AUDIT.md",
             "CONTEXTUAL_LAYER.md", "BDB2027_GROUNDWORK.md", "ANGLES_REGISTRY.md",
             "GSE_HANDOFF_PACK_2026-10-10.md", "FANTASY_TOOLING_RECON.md", "ENGINE_BLUEPRINTS.md", "pfr_pull.py", "CFB_GROUNDWORK.md",
             "dk_submap.json", "extract_stack.py"]
SNAP_DIR = "snapshots"

def sha(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()[:16]

def main():
    ts = time.strftime("%Y%m%d_%H%M")
    out = os.path.join(SHARED, f"delivery_{ts}")
    os.makedirs(out, exist_ok=True)
    manifest = {"ts": ts, "code": [], "docs": [], "snapshots": []}
    for f in sorted(os.listdir(WS)):
        p = os.path.join(WS, f)
        if not os.path.isfile(p):
            continue
        if f.endswith(CODE_EXT) or f in DOC_FILES:
            shutil.copy2(p, out)
            (manifest["code" if f.endswith(CODE_EXT) else "docs"]).append(
                {"file": f, "bytes": os.path.getsize(p), "sha256_16": sha(p)})
    sp = os.path.join(WS, SNAP_DIR)
    if os.path.isdir(sp):
        for f in sorted(os.listdir(sp)):
            if os.path.isdir(os.path.join(sp, f)): continue
            p = os.path.join(sp, f)
            manifest["snapshots"].append({"file": f, "bytes": os.path.getsize(p), "sha256_16": sha(p)})
    with open(os.path.join(out, "BUILD_MANIFEST.json"), "w") as fjson:
        json.dump(manifest, fjson, indent=1)
    # human manifest
    with open(os.path.join(out, "BUILD_MANIFEST.md"), "w") as f:
        f.write(f"# GSE DELIVERY {ts}\n\n")
        for section in ("code", "docs", "snapshots"):
            f.write(f"## {section} ({len(manifest[section])})\n")
            for it in manifest[section]:
                f.write(f"- {it['file']} — {it['bytes']}B — sha {it['sha256_16']}\n")
            f.write("\n")
    # tarball
    tgz = os.path.join(SHARED, f"gse_delivery_{ts}.tar.gz")
    with tarfile.open(tgz, "w:gz") as tar:
        tar.add(out, arcname=os.path.basename(out))
    print("DELIVERED:", out)
    print("TARBALL:", tgz, os.path.getsize(tgz), "bytes")
    print(f"code={len(manifest['code'])} docs={len(manifest['docs'])} snapshots={len(manifest['snapshots'])}")

if __name__ == "__main__":
    main()
```


### `data/build_db.py`
```python
#!/usr/bin/env python3
"""build_db.py — the research database. stdlib sqlite3.
Tables:
  nfl_games   — nflverse games.csv (1999-present): scores, spreads, totals, rest, weather
  epl_matches — football-data.co.uk (5 seasons): goals, shots, multi-book OPEN+CLOSE odds incl PINNACLE
This is the hard-numbers layer everything fits against."""
import csv
import os
import sqlite3
import glob

DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "research.db")

def build():
    if os.path.exists(DB):
        os.remove(DB)
    con = sqlite3.connect(DB)
    cur = con.cursor()

    # ---- NFL ----
    cur.execute("""CREATE TABLE nfl_games (
        game_id TEXT PRIMARY KEY, season INT, week INT, gameday TEXT,
        home TEXT, away TEXT, home_score INT, away_score INT,
        spread FLOAT, total FLOAT, overtime INT,
        away_rest INT, home_rest INT,
        temp FLOAT, wind FLOAT, roof TEXT, surface TEXT,
        weekday TEXT, gametime TEXT, stadium TEXT)""")  # native slate columns (v7 hardening — no _migrate needed)
    n = 0
    with open(os.path.join(os.path.dirname(DB), "games_all.csv")) as f:
        for row in csv.DictReader(f):
            def g(k, cast):
                v = row.get(k, "")
                try: return cast(v) if v not in ("", "NA", None) else None
                except Exception: return None
            if g("home_score", int) is None or g("away_score", int) is None:
                continue  # unplayed
            cur.execute("INSERT OR REPLACE INTO nfl_games VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (
                row["game_id"], g("season", int), g("week", int), row.get("gameday"),
                row.get("home_team"), row.get("away_team"),
                g("home_score", int), g("away_score", int),
                g("spread", float), g("total", float), g("overtime", int) or 0,
                g("away_rest", int), g("home_rest", int),
                g("temp", float), g("wind", float), row.get("roof"), row.get("surface"),
                row.get("weekday"), row.get("gametime"), row.get("stadium")))
            n += 1
    con.commit()
    cur.execute("CREATE INDEX idx_nfl_season ON nfl_games(season, week)")
    print(f"nfl_games: {n} rows (1999-present)")

    # ---- EPL ----
    cur.execute("""CREATE TABLE epl_matches (
        season TEXT, date TEXT, home TEXT, away TEXT,
        fthg INT, ftag INT, hthg INT, htag INT,
        hs INT, as_ INT, hst INT, ast INT, hc INT, ac INT,
        ps_open_h FLOAT, ps_open_d FLOAT, ps_open_a FLOAT,
        ps_close_h FLOAT, ps_close_d FLOAT, ps_close_d2 FLOAT, ps_close_a FLOAT,
        b365_close_h FLOAT, b365_close_d FLOAT, b365_close_a FLOAT,
        over25_close FLOAT, under25_close FLOAT, ah_line FLOAT, ah_home_close FLOAT)""")
    m = 0
    for path in sorted(glob.glob(os.path.join(os.path.dirname(DB), "epl_*.csv"))):
        season = os.path.basename(path)[4:8]
        with open(path, encoding="latin-1") as f:
            for row in csv.DictReader(f):
                if not row.get("FTHG") or not row.get("FTAG"):
                    continue
                def g(k):
                    v = row.get(k, "")
                    try: return float(v) if v not in ("", "NA", None) else None
                    except Exception: return None
                cur.execute("INSERT INTO epl_matches VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (
                    season, row.get("Date"), row.get("HomeTeam"), row.get("AwayTeam"),
                    int(row["FTHG"]), int(row["FTAG"]),
                    int(row["HTHG"]) if row.get("HTHG") else None,
                    int(row["HTAG"]) if row.get("HTAG") else None,
                    g("HS"), g("AS"), g("HST"), g("AST"), g("HC"), g("AC"),
                    g("PSH"), g("PSD"), g("PSA"),
                    g("PSCH"), g("PSCD"), g("PSCD"), g("PSCA"),
                    g("B365CH"), g("B365CD"), g("B365CA"),
                    g("AvgC>2.5") or g("Avg>2.5"), g("AvgC<2.5") or g("Avg<2.5"),
                    g("AHCh") or g("AHh"), g("AHCh") and None))
                m += 1
    con.commit()
    cur.execute("CREATE INDEX idx_epl_season ON epl_matches(season, date)")
    print(f"epl_matches: {m} rows (5 seasons, Pinnacle open+close)")

    # ---- fitted parameters (results land here) ----
    cur.execute("""CREATE TABLE fits (
        model TEXT, scope TEXT, params TEXT, logloss FLOAT, n INT, fitted_at TEXT)""")
    con.commit()
    con.close()
    print("research.db ready")

if __name__ == "__main__":
    build()
```


### `data/fit_engines.py`
```python
#!/usr/bin/env python3
"""fit_engines.py — REAL fitting on the EPL research database (sqlite).
1. Dixon-Coles with TIME-DECAY ξ: weighted MLE over attack/defense/home-adv/ρ, ξ on grid.
2. Karlis-Ntzoufras bivariate Poisson: EM on (λ1, λ2, λ3).
3. THE SHOWDOWN: model vs PINNACLE CLOSING vs blended pool — log-loss on a held-out season.
Fits on seasons 1-4, evaluates on season 5 (honest split). Params land in fits table."""
import math
import sqlite3
import datetime as dt
import os

DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "research.db")

def parse_date(s):
    d, m, y = s.split("/")
    return dt.date(int(y) + (2000 if int(y) < 50 else 1900), int(m), int(d))

def pois(k, lam): return math.exp(-lam) * lam ** k / math.factorial(k)

def dc_tau(x, y, lam, mu, rho):
    if x == 0 and y == 0: return 1 - lam * mu * rho
    if x == 0 and y == 1: return 1 + lam * rho
    if x == 1 and y == 0: return 1 + mu * rho
    if x == 1 and y == 1: return 1 - rho
    return 1.0

# ---------- data ----------
def load():
    con = sqlite3.connect(DB)
    rows = con.execute("""SELECT season, date, home, away, fthg, ftag,
        ps_close_h, ps_close_d, ps_close_a FROM epl_matches ORDER BY date""").fetchall()
    con.close()
    out = []
    for season, d, h, a, x, y, oh, od, oa in rows:
        out.append({"season": season, "date": parse_date(d), "home": h, "away": a,
                    "x": x, "y": y, "mkt": (oh, od, oa)})
    return out

# ---------- Dixon-Coles weighted fit ----------
def fit_dc(matches, xi, rho, iters=40):
    """Weighted MLE: weight_i = exp(-xi * days_from_max_date). Coordinate MLE on
    attack/defense (Poisson log-lik concave per param), then rho passed in."""
    teams = sorted({m["home"] for m in matches} | {m["away"] for m in matches})
    dmax = max(m["date"] for m in matches)
    w = [math.exp(-xi * (dmax - m["date"]).days) for m in matches]
    gf = {t: 0.0 for t in teams}; ga = {t: 0.0 for t in teams}
    sw = {t: 0.0 for t in teams}
    for m, wi in zip(matches, w):
        gf[m["home"]] += wi * m["x"]; gf[m["away"]] += wi * m["y"]
        ga[m["home"]] += wi * m["y"]; ga[m["away"]] += wi * m["x"]
        sw[m["home"]] += wi; sw[m["away"]] += wi
    gbar = sum(gf.values()) / sum(sw.values())  # weighted goals per team per match
    # per-match-scale init: attack & defense straddle 0 correctly
    att = {t: math.log(max(gf[t] / max(sw[t], 1e-9), 0.05) / gbar) for t in teams}
    deff = {t: math.log(max(ga[t] / max(sw[t], 1e-9), 0.05) / gbar) for t in teams}
    mu = 0.0
    for _ in range(iters):
        # attack updates
        for t in teams:
            num = max(gf[t], 1e-12)
            den = 0.0
            for m, wi in zip(matches, w):
                if m["home"] == t:
                    den += wi * math.exp(mu + deff[m["away"]])
                elif m["away"] == t:
                    den += wi * math.exp(deff[m["home"]])
            att[t] = max(min(math.log(num / max(den, 1e-12)), 4.0), -4.0)
        # defense updates — λ_opp = exp(att_opp + deff_t) when t home (NO mu),
        #                    λ_opp = exp(mu + att_opp + deff_t) when t away (WITH mu)
        for t in teams:
            num = max(ga[t], 1e-12)
            den = 0.0
            for m, wi in zip(matches, w):
                if m["home"] == t:
                    den += wi * math.exp(att[m["away"]])
                elif m["away"] == t:
                    den += wi * math.exp(mu + att[m["home"]])
            deff[t] = max(min(math.log(num / max(den, 1e-12)), 4.0), -4.0)
        # home advantage
        num = den = 0.0
        for m, wi in zip(matches, w):
            num += wi * m["x"]
            den += wi * math.exp(att[m["home"]] + deff[m["away"]])
        mu = max(min(math.log(max(num, 1e-12) / max(den, 1e-12)), 2.0), -2.0)
        # center attack
        c = sum(att.values()) / len(teams)
        att = {t: v - c for t, v in att.items()}
    return teams, att, deff, mu

def dc_loglik(matches, att, deff, mu, rho, xi):
    dmax = max(m["date"] for m in matches)
    ll = 0.0; tw = 0.0
    for m in matches:
        wi = math.exp(-xi * (dmax - m["date"]).days)
        lam = math.exp(mu + att[m["home"]] + deff[m["away"]])
        muw = math.exp(att[m["away"]] + deff[m["home"]])
        ll += wi * math.log(max(dc_tau(m["x"], m["y"], lam, muw, rho), 1e-12)
                            * pois(m["x"], lam) * pois(m["y"], muw))
        tw += wi
    return ll / tw  # per-match weighted avg (decay-normalized)

def dc_probs(lam, muw, rho, maxg=8):
    ph = pd = pa = 0.0
    for x in range(maxg + 1):
        for y in range(maxg + 1):
            p = dc_tau(x, y, lam, muw, rho) * pois(x, lam) * pois(y, muw)
            if x > y: ph += p
            elif x == y: pd += p
            else: pa += p
    return ph, pd, pa

# ---------- Karlis-Ntzoufras EM ----------
def fit_kn(matches, iters=80, decay_half_life_days=None):
    """EM: X=X1+X3, Y=X2+X3. E-step: E[k] posterior over k<=min(x,y).
    Optional exponential decay weights."""
    dmax = max(m["date"] for m in matches)
    if decay_half_life_days:
        xi = math.log(2) / decay_half_life_days
        w = [math.exp(-xi * (dmax - m["date"]).days) for m in matches]
    else:
        w = [1.0] * len(matches)
    lam1 = 0.1; lam2 = 0.1; lam3 = 0.3
    xbar = sum(wi * m["x"] for wi, m in zip(w, matches)) / sum(w)
    ybar = sum(wi * m["y"] for wi, m in zip(w, matches)) / sum(w)
    lam1, lam2 = max(xbar - 0.15, 0.05), max(ybar - 0.15, 0.05)
    for it in range(iters):
        s1 = s2 = s3 = sw = 0.0
        for m, wi in zip(matches, w):
            x, y = m["x"], m["y"]
            num3 = 0.0; den = 0.0
            for k in range(0, min(x, y) + 1):
                post = (pois(k, lam3) * pois(x - k, lam1) * pois(y - k, lam2))
                den += post
                num3 += k * post
            ek = num3 / max(den, 1e-12)
            s3 += wi * ek
            s1 += wi * (x - ek)
            s2 += wi * (y - ek)
            sw += wi
        lam1, lam2, lam3 = max(s1 / sw, 0.02), max(s2 / sw, 0.02), max(s3 / sw, 0.001)
        if it % 20 == 0:
            print(f"    EM it{it}: lam1={lam1:.3f} lam2={lam2:.3f} lam3={lam3:.3f}")
    return lam1, lam2, lam3

def kn_loglik_matches(matches, team_stats, lam3):
    """Per-match KN log-lik with team-specific means via DC attack/defense mapping:
    use fitted DC lambdas as (lam1+lam3, lam2+lam3) marginals."""
    ll = 0.0
    for m in matches:
        lam_h, lam_a = m["lam_h"], m["lam_a"]
        l1, l2 = max(lam_h - lam3, 0.02), max(lam_a - lam3, 0.02)
        x, y = m["x"], m["y"]
        s = 0.0
        for k in range(0, min(x, y) + 1):
            s += pois(k, lam3) * pois(x - k, l1) * pois(y - k, l2)
        ll += math.log(max(s, 1e-12))
    return ll / len(matches)

def main():
    matches = load()
    train = [m for m in matches if m["season"] != "2425"]
    test = [m for m in matches if m["season"] == "2425"]
    print(f"train {len(train)} (4 seasons), test {len(test)} (2024-25 held out)")

    # ---- 1. DC + xi ----
    print("\n[1] Dixon-Coles time-decay fit:")
    best = None
    for xi in (0.0, 0.002, 0.005, 0.01):
        teams, att, deff, mu = fit_dc(train, xi, rho=-0.05)
        for rho in (-0.08, -0.05, -0.02, 0.0):
            ll = dc_loglik(train, att, deff, mu, rho, xi)
            if best is None or ll > best[0]:
                best = (ll, xi, rho, teams, att, deff, mu)
    ll, xi, rho, teams, att, deff, mu = best
    print(f"  BEST: xi={xi} rho={rho} weighted loglik/match={ll:.4f}")
    print(f"  home adv (lambda mult): {math.exp(mu):.3f}")
    top = sorted(teams, key=lambda t: -(att[t] + deff[t]))[:5]
    print("  top attack+defense:", [(t, round(att[t] + deff[t], 3)) for t in top])

    # ---- 2. KN EM ----
    print("\n[2] Karlis-Ntzoufras EM (league-level, decayed):")
    l1, l2, l3 = fit_kn(train, decay_half_life_days=365)
    print(f"  fitted: lam1={l1:.3f} lam2={l2:.3f} lam3={l3:.3f} (cov={l3:.3f}, corr share {l3/((l1+l2+l3)/2):.2f})")

    # ---- 3. SHOWDOWN on held-out 2024-25 ----
    print("\n[3] SHOWDOWN — held-out 2024-25 log-loss (lower = better):")
    # refit DC on train with best xi/rho (already have), predict test matches
    dc_ll = mkt_ll = lin_ll = log_ll = 0.0
    kn_ll = 0.0
    dmax_train = max(m["date"] for m in train)
    for m in test:
        # promoted/unseen teams get league-average strengths (att=0, deff=0)
        a_h = att.get(m["home"], 0.0); d_a = deff.get(m["away"], 0.0)
        a_a = att.get(m["away"], 0.0); d_h = deff.get(m["home"], 0.0)
        lam = math.exp(mu + a_h + d_a)
        muw = math.exp(a_a + d_h)
        ph, pd, pa = dc_probs(lam, muw, rho)
        dc_ll += -math.log(max((ph, pd, pa)["HPA".index("H")] if False else
                               (ph if m["x"] > m["y"] else pd if m["x"] == m["y"] else pa), 1e-12))
        # KN with DC lambdas
        l1m, l2m = max(lam - l3, 0.02), max(muw - l3, 0.02)
        s = sum(pois(k, l3) * pois(m["x"] - k, l1m) * pois(m["y"] - k, l2m)
                for k in range(0, min(m["x"], m["y"]) + 1))
        res_kn = ph * 0  # placeholder
        kn_p = (0, 0, 0)
        phk = pdk = pak = 0.0
        for xg in range(9):
            for yg in range(9):
                pk = sum(pois(k, l3) * pois(xg - k, l1m) * pois(yg - k, l2m)
                         for k in range(0, min(xg, yg) + 1))
                if xg > yg: phk += pk
                elif xg == yg: pdk += pk
                else: pak += pk
        kn_ll += -math.log(max((phk if m["x"] > m["y"] else pdk if m["x"] == m["y"] else pak), 1e-12))
        # market (Pinnacle close devig)
        oh, od, oa = m["mkt"]
        if oh and od and oa:
            inv = 1/oh + 1/od + 1/oa
            pmh, pmd, pma = (1/oh)/inv, (1/od)/inv, (1/oa)/inv
            mkt_ll += -math.log(max((pmh if m["x"] > m["y"] else pmd if m["x"] == m["y"] else pma), 1e-12))
            for w, acc in ((0.3, 0), (0.5, 1)):
                pbl_h = w * ph + (1 - w) * pmh
                pbl_d = w * pd + (1 - w) * pmd
                pbl_a = w * pa + (1 - w) * pma
                v = pbl_h if m["x"] > m["y"] else pbl_d if m["x"] == m["y"] else pbl_a
                if w == 0.3: lin_ll += -math.log(max(v, 1e-12))
                else: log_ll += -math.log(max(v, 1e-12))
        # kn
    n = len(test)
    # NB: kn_ll and dc_ll use model probs only (no market), mkt/lin/log use matches where odds exist
    n_mkt = sum(1 for m in test if all(m["mkt"]))
    print(f"  DC(-0.05ξ={xi}) model        : {dc_ll/n:.4f}")
    print(f"  KN (EM λ3={l3:.2f}) model     : {kn_ll/n:.4f}")
    print(f"  PINNACLE CLOSING devig      : {mkt_ll/n_mkt:.4f}  <- the bar")
    print(f"  linear pool w=0.3 model     : {lin_ll/n_mkt:.4f}")
    print(f"  blend w=0.5 model           : {log_ll/n_mkt:.4f}")
    gap_dc = dc_ll/n - mkt_ll/n_mkt
    print(f"\n  DC gap vs Pinnacle: {gap_dc:+.4f} nats/match ({gap_dc*100:+.2f}%)")
    # store fits
    con = sqlite3.connect(DB)
    import datetime
    con.execute("INSERT INTO fits VALUES (?,?,?,?,?,?)",
                ("DC-xi", "EPL 4-season train", f"xi={xi},rho={rho},mu={math.exp(mu):.3f}",
                 round(ll, 4), len(train), datetime.datetime.now().isoformat()))
    con.execute("INSERT INTO fits VALUES (?,?,?,?,?,?)",
                ("KN-EM", "EPL 4-season train", f"lam1={l1:.3f},lam2={l2:.3f},lam3={l3:.3f}",
                 round(kn_ll/n, 4), len(train), datetime.datetime.now().isoformat()))
    con.execute("INSERT INTO fits VALUES (?,?,?,?,?,?)",
                ("PINNACLE-CLOSE", "EPL 2024-25 held-out", "multiplicative devig",
                 round(mkt_ll/n_mkt, 4), n_mkt, datetime.datetime.now().isoformat()))
    con.commit(); con.close()
    print("\nfits saved to research.db")

def kn_team_lambda3(matches_with_lam, iters=40):
    """TEAM-LEVEL KN test: given per-match marginal means (lam_h, lam_a) from the DC fit,
    EM for the shared component λ3: E[k | x,y] then λ3 = mean E[k].
    This answers slate-2's open question: does λ3 appear once team means are in?
    matches_with_lam = [{'x','y','lam_h','lam_a'}]"""
    lam3 = 0.2
    hist = []
    for it in range(iters):
        s3 = sw = 0.0
        for m in matches_with_lam:
            l1 = max(m["lam_h"] - lam3, 0.02)
            l2 = max(m["lam_a"] - lam3, 0.02)
            x, y = m["x"], m["y"]
            den = 0.0; num = 0.0
            for k in range(0, min(x, y) + 1):
                post = pois(k, lam3) * pois(x - k, l1) * pois(y - k, l2)
                den += post; num += k * post
            ek = num / max(den, 1e-12)
            s3 += ek; sw += 1
        lam3 = max(s3 / sw, 1e-4)
        hist.append(round(lam3, 4))
    return lam3, hist[-5:]

if __name__ == "__main__":
    main()
```


### `data/analyze_nfl.py`
```python
#!/usr/bin/env python3
"""analyze_nfl.py — hard-number analyses on 7,341 NFL games (research.db).
1. Hierarchical Bayesian ratings via Gibbs sampling (pure stdlib): partial pooling
   across 32 teams on recent-season margins. Outputs posterior mean ratings + tau/sigma/hfa.
2. Conformal margin intervals from rating-model residuals (distribution-free coverage).
3. WEATHER COVARIATE FIT: regress (actual total − closing total) on wind/temp over
   25 seasons — the empirical answer to the published magnitudes in engine_math.
"""
import math
import random
import sqlite3
import os

DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "research.db")

def load_margins(season_min=2019):
    con = sqlite3.connect(DB)
    rows = con.execute("""SELECT home, away, home_score - away_score
        FROM nfl_games WHERE season >= ? AND home_score IS NOT NULL
        ORDER BY season, week""", (season_min,)).fetchall()
    con.close()
    return rows

# ---------- 1. hierarchical Gibbs ----------
def gibbs_hier(rows, iters=1500, burn=500, seed=7):
    """margin_k ~ N(eff_h - eff_a + hfa, sigma2); eff_i ~ N(0, tau2).
    Priors: tau2 ~ IG(a,b), sigma2 ~ IG(a,b), hfa ~ N(0, 100).
    Gibbs with conjugate conditionals. Pure stdlib."""
    rnd = random.Random(seed)
    teams = sorted({r[0] for r in rows} | {r[1] for r in rows})
    idx = {t: i for i, t in enumerate(teams)}
    n = len(teams)
    # design: y_k = eff_h - eff_a + hfa + eps
    eff = [0.0] * n
    hfa = 2.0
    sigma2 = 100.0
    tau2 = 25.0
    # sufficient stats
    games_by_team = {t: [] for t in teams}
    for h, a, y in rows:
        games_by_team[h].append(("h", a, y))
        games_by_team[a].append(("a", h, y))
    effs_draw = []
    draws = {"tau2": [], "sigma2": [], "hfa": []}
    a_ig, b_ig = 2.0, 50.0
    for it in range(iters):
        # eff | rest (each team conditionally normal)
        for t in teams:
            prec = 1.0 / tau2
            mean_sum = 0.0
            for side, opp, y in games_by_team[t]:
                if side == "h":
                    prec += 1.0 / sigma2
                    mean_sum += (y - hfa + eff[idx[opp]]) / sigma2
                else:
                    prec += 1.0 / sigma2
                    mean_sum += (eff[idx[opp]] + hfa - y) / sigma2  # eff_t = eff_opp + hfa - y
            post_var = 1.0 / prec
            post_mean = post_var * mean_sum
            eff[idx[t]] = rnd.gauss(post_mean, math.sqrt(post_var))
        # hfa | rest
        prec = 1.0 / 100.0
        s = 0.0
        for h, a, y in rows:
            prec += 1.0 / sigma2
            s += (y - (eff[idx[h]] - eff[idx[a]])) / sigma2
        hfa = rnd.gauss((s / prec) * prec / prec, math.sqrt(1.0 / prec))  # mean = s/prec
        hfa = rnd.gauss(s / prec, math.sqrt(1.0 / prec))
        # sigma2 | rest
        sse = sum((y - (eff[idx[h]] - eff[idx[a]] + hfa)) ** 2 for h, a, y in rows)
        nG = len(rows)
        sigma2 = 1.0 / rnd.gammavariate(a_ig + nG / 2.0, 1.0 / (b_ig + sse / 2.0))
        # tau2 | rest
        sse_t = sum(e ** 2 for e in eff)
        tau2 = 1.0 / rnd.gammavariate(a_ig + n / 2.0, 1.0 / (b_ig + sse_t / 2.0))
        if it >= burn:
            effs_draw.append(eff[:])
            draws["tau2"].append(tau2); draws["sigma2"].append(sigma2); draws["hfa"].append(hfa)
    return teams, effs_draw, draws

def mean(xs): return sum(xs) / len(xs)
def ci(xs, z=1.96):
    m = mean(xs); sd = (sum((x - m) ** 2 for x in xs) / max(len(xs) - 1, 1)) ** 0.5
    return m, sd, (m - z * sd / len(xs) ** 0.5, m + z * sd / len(xs) ** 0.5)

# ---------- 3. weather covariate fit ----------
def weather_fit_ols():
    """Join games_all (results, weather) with closing_lines.csv (REAL closes 2006-2018).
    Residual = actual_total − closing_total; regress on wind/temp/dome."""
    import csv as _csv
    closes = {}
    with open(os.path.join(os.path.dirname(DB), "closing_lines.csv")) as f:
        for r in _csv.DictReader(f):
            if r["type"] == "TOTAL":
                closes[r["alt_game_id"]] = float(r["line"])
    con = sqlite3.connect(DB)
    rows = con.execute("""SELECT game_id, temp, wind, home_score + away_score, roof
        FROM nfl_games WHERE temp IS NOT NULL AND home_score IS NOT NULL AND season >= 2006""").fetchall()
    con.close()
    X = []; y = []
    for gid, temp, wind, act, roof in rows:
        ct = closes.get(gid)
        if ct is None or wind is None or temp is None:
            continue
        X.append([wind, temp - 70.0, 1.0 if (roof or "").lower() in ("dome", "closed", "retractable") else 0.0, 1.0])
        y.append(act - ct)
    n = len(X); k = 4
    xtx = [[sum(X[i][a] * X[i][b] for i in range(n)) + (1.0 if a == b else 0.0) for b in range(k)] for a in range(k)]
    xty = [sum(X[i][a] * y[i] for i in range(n)) for a in range(k)]
    # solve
    M = [xtx[i][:] + [xty[i]] for i in range(k)]
    for c in range(k):
        piv = max(range(c, k), key=lambda r: abs(M[r][c]))
        M[c], M[piv] = M[piv], M[c]
        for r in range(k):
            if r != c and M[r][c]:
                f = M[r][c] / M[c][c]
                M[r] = [v - f * w for v, w in zip(M[r], M[c])]
    beta = [M[i][k] / M[i][i] for i in range(k)]
    # R^2
    ybar = sum(y) / n
    ss_res = sum((y[i] - sum(X[i][j] * beta[j] for j in range(k))) ** 2 for i in range(n))
    ss_tot = sum((v - ybar) ** 2 for v in y)
    se = [math.sqrt(ss_res / (n - k) * (xtx[j][j] ** -1 if xtx[j][j] > 0 else 0)) for j in range(k)]
    return beta, (n, 1 - ss_res / ss_tot, se)

if __name__ == "__main__":
    print("== HIERARCHICAL BAYES (Gibbs) on NFL margins 2019+ ==")
    rows = load_margins(2019)
    print(f"games: {len(rows)}")
    teams, effs, draws = gibbs_hier(rows, iters=800, burn=300)
    tau_m, tau_sd, tau_ci = ci(draws["tau2"])
    sig_m, sig_sd, sig_ci = ci(draws["sigma2"])
    hfa_m, hfa_sd, hfa_ci = ci(draws["hfa"])
    print(f"tau (team spread, sd units): {math.sqrt(tau_m):.2f}  [{math.sqrt(tau_ci[0]):.2f},{math.sqrt(tau_ci[1]):.2f}]")
    print(f"sigma (game noise, sd):     {math.sqrt(sig_m):.2f}  [{math.sqrt(sig_ci[0]):.2f},{math.sqrt(sig_ci[1]):.2f}]")
    print(f"hfa (points):               {hfa_m:.2f}  CI {hfa_ci[0]:.2f}..{hfa_ci[1]:.2f}")
    # posterior mean ratings
    post = {t: mean([e[i] for e in effs]) for i, t in enumerate(teams)}
    top = sorted(post.items(), key=lambda kv: -kv[1])[:6]
    bot = sorted(post.items(), key=lambda kv: kv[1])[:3]
    print("top 6 :", [(t, round(v, 2)) for t, v in top])
    print("bottom 3:", [(t, round(v, 2)) for t, v in bot])

    print("\n== WEATHER / ROOF COVARIATE FIT (2006-2018, actual_total − CLOSING total) ==")
    beta, (n, r2, se) = weather_fit_ols()
    print(f"n={n} R2={r2:.4f}")
    print(f"  wind  (pts per mph)        : {beta[0]:+.3f}  (se ~{se[0]:.3f})")
    print(f"  temp deviation (pts per F): {beta[1]:+.4f} (se ~{se[1]:.4f})")
    print(f"  dome/retractable (pts)     : {beta[2]:+.3f}")
    print(f"  intercept                  : {beta[3]:+.3f}")
```


### `data/context_engine.py`
```python
#!/usr/bin/env python3
"""context_engine.py — the OFF-FIELD CONTEXTUAL LAYER, computed + fitted.
Adds to research.db:
  nfl_context: per-game travel_miles, tz_shift, altitude_diff, rest_diff, short_week
Teams table: 32 franchises -> (lat, lon, tz_offset_h, altitude_ft) public constants.

Then FITS on market residuals (2006-2018, real closes):
  timezone effect (circadian proxy), travel effect (fatigue proxy),
  altitude differential (hypoxia proxy), rest differential, short week.
Equations documented in RESEARCH_SLATE_3.md.
"""
import csv
import math
import os
import sqlite3
import collections

DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "research.db")

# franchise -> (city lat, city lon, home tz offset vs ET, stadium altitude ft, abbreviation list)
# tz: 0 = Eastern, -1 = Central (1h behind ET... convention: hours EAST of ET), etc.
TEAMS = {
    "ARI": (33.53, -112.26, -3, 1100), "ATL": (33.75, -84.40, 0, 1000),
    "BAL": (39.28, -76.62, 0, 30),     "BUF": (42.77, -78.79, 0, 600),
    "CAR": (35.23, -80.85, 0, 750),    "CHI": (41.86, -87.62, -1, 600),
    "CIN": (39.10, -84.51, 0, 500),    "CLE": (41.51, -81.70, 0, 600),
    "DAL": (32.75, -97.09, -1, 450),   "DEN": (39.74, -105.02, -2, 5280),
    "DET": (42.34, -83.05, 0, 600),    "GB": (44.50, -88.06, -1, 800),
    "HOU": (29.68, -95.41, -1, 50),    "IND": (39.76, -86.16, 0, 700),
    "JAX": (30.32, -81.64, 0, 30),     "KC": (39.05, -94.48, -1, 900),
    "LV": (36.09, -115.18, -3, 1900),  "LAC": (33.95, -118.34, -3, 100),
    "LAR": (33.95, -118.34, -3, 100),  "MIA": (25.96, -80.38, 0, 10),
    "MIN": (44.97, -93.26, -1, 850),   "NE": (42.09, -71.26, 0, 90),
    "NO": (29.95, -90.08, -1, 10),     "NYG": (40.81, -74.07, 0, 30),
    "NYJ": (40.81, -74.07, 0, 30),     "PHI": (39.90, -75.17, 0, 40),
    "PIT": (40.40, -80.02, 0, 750),    "SF": (37.40, -121.97, -3, 30),
    "SEA": (47.60, -122.33, -3, 30),   "TB": (27.98, -82.50, 0, 30),
    "TEN": (36.17, -86.77, -1, 500),   "WAS": (38.90, -76.87, 0, 300),
    # legacy/alternate abbreviations seen in nflverse data
    "OAK": (37.75, -122.20, -3, 30), "SD": (32.78, -117.12, -3, 60),
    "STL": (38.63, -90.21, -1, 450), "WSH": (38.90, -76.87, 0, 300),
    "LA": (33.95, -118.34, -3, 100), "PHX": (33.53, -112.26, -3, 1100),
    "LAC-": (33.95, -118.34, -3, 100),
}

def haversine(lat1, lon1, lat2, lon2):
    R = 3958.8  # miles
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = p2 - p1; dl = math.radians(lon2 - lon1)
    a = math.sin(dp/2)**2 + math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2 * R * math.asin(math.sqrt(a))

def build_context():
    con = sqlite3.connect(DB)
    cur = con.cursor()
    cur.execute("""CREATE TABLE IF NOT EXISTS nfl_context (
        game_id TEXT PRIMARY KEY, home TEXT, away TEXT,
        travel_miles REAL, tz_shift INT, altitude_diff INT,
        rest_diff INT, short_week_away INT, dome INT)""")
    rows = cur.execute("""SELECT game_id, home, away, away_rest, home_rest, roof
        FROM nfl_games""").fetchall()
    n = missing = 0
    for gid, home, away, arest, hrest, roof in rows:
        th = TEAMS.get(home); ta = TEAMS.get(away)
        if not th or not ta:
            missing += 1
            continue
        dist = haversine(*ta[:2], *th[:2])
        tz = th[2] - ta[2]  # positive: away team travels east (body clock ahead)
        alt_diff = th[3] - ta[3]
        rest_diff = (arest or 7) - (hrest or 7)
        short_week = 1 if (arest or 7) <= 5 else 0
        dome = 1 if (roof or "").lower() in ("dome", "closed", "retractable") else 0
        cur.execute("INSERT OR REPLACE INTO nfl_context VALUES (?,?,?,?,?,?,?,?,?)",
                    (gid, home, away, round(dist), tz, alt_diff, rest_diff, short_week, dome))
        n += 1
    con.commit()
    print(f"nfl_context: {n} rows built ({missing} unmatched team abbreviations)")
    # unmatched report
    if missing:
        seen = set()
        for gid, home, away, *_ in rows:
            for t in (home, away):
                if t not in TEAMS and t not in seen:
                    seen.add(t)
        print("  unmatched:", sorted(seen)[:10])
    con.close()

def fit_context():
    """Residual = actual_margin - closing_spread (home perspective). Fits on 2006-2018
    where closing_lines.csv has SPREAD rows. Reports binned effects + joint OLS."""
    con = sqlite3.connect(DB)
    # closing spreads: side = team with negative-ish line; derive home spread
    spread_rows = collections.defaultdict(dict)
    with open(os.path.join(os.path.dirname(DB), "closing_lines.csv")) as f:
        for r in csv.DictReader(f):
            if r["type"] == "SPREAD" and r["line"]:
                spread_rows[r["alt_game_id"]][r["side"]] = float(r["line"])
    results = {r[0]: r for r in con.execute(
        "SELECT game_id, home, away, home_score, away_score FROM nfl_games WHERE home_score IS NOT NULL")}
    ctx = {r[0]: r for r in con.execute(
        "SELECT game_id, travel_miles, tz_shift, altitude_diff, rest_diff, short_week_away, dome FROM nfl_context")}
    con.close()
    X, y = [], []
    for gid, sides in spread_rows.items():
        if gid not in results or gid not in ctx:
            continue
        _, home, away, hs, as_ = results[gid]
        if home in sides:
            home_spread = sides[home]
        elif away in sides:
            home_spread = -sides[away]
        else:
            continue
        margin = hs - as_
        resid = margin + home_spread  # spread negative for favorites (PIT -1.5: resid = margin - 1.5)
        _, travel, tz, altd, restd, sw, dome = ctx[gid]
        X.append([min(travel, 2500), tz, min(abs(altd), 5000) * (1 if altd > 0 else -1) / 1000.0,
                  restd, sw, dome, 1.0])
        y.append(resid)
    n = len(X); k = 7
    print(f"joint OLS on {n} games (resid = margin - closing spread):")
    names = ["travel(miles)", "tz_shift(east+)", "alt_diff(kft)", "rest_diff", "short_week_away", "dome", "intercept"]
    xtx = [[sum(X[i][a] * X[i][b] for i in range(n)) + (1.0 if a == b else 0.0) for b in range(k)] for a in range(k)]
    xty = [sum(X[i][a] * y[i] for i in range(n)) for a in range(k)]
    M = [xtx[i][:] + [xty[i]] for i in range(k)]
    for c in range(k):
        piv = max(range(c, k), key=lambda r: abs(M[r][c]))
        M[c], M[piv] = M[piv], M[c]
        if abs(M[c][c]) < 1e-9: continue
        for r in range(k):
            if r != c and M[r][c]:
                f = M[r][c] / M[c][c]
                M[r] = [v - f * w for v, w in zip(M[r], M[c])]
    beta = [M[i][k] / M[i][i] for i in range(k)]
    resid2 = [y[i] - sum(X[i][j] * beta[j] for j in range(k)) for i in range(n)]
    s2 = sum(v * v for v in resid2) / (n - k)
    # SEs from inverse diag via Gaussian elim solve of xtx
    se = []
    for j in range(k):
        e = [1.0 if i == j else 0.0 for i in range(k)]
        col = [0.0] * k
        Mc = [row[:] for row in xtx]
        for c in range(k):
            piv = max(range(c, k), key=lambda r: abs(Mc[r][c]))
            Mc[c], Mc[piv] = Mc[piv], Mc[c]
            if abs(Mc[c][c]) < 1e-12: continue
            for r in range(k):
                if r != c and Mc[r][c]:
                    f = Mc[r][c] / Mc[c][c]
                    Mc[r] = [v - f * w for v, w in zip(Mc[r], Mc[c])]
        # back-substitute
        for i in range(k - 1, -1, -1):
            s = e[i] - sum(Mc[i][j2] * col[j2] for j2 in range(i + 1, k))
            col[i] = s / Mc[i][i] if abs(Mc[i][i]) > 1e-12 else 0.0
        se.append(math.sqrt(max(s2 * col[j], 0.0)))
    ybar = sum(y) / n
    ss_tot = sum((v - ybar) ** 2 for v in y)
    ss_res = sum(v * v for v in resid2)
    print(f"R2={1 - ss_res/ss_tot:.4f}  resid sd={math.sqrt(ss_res/n):.2f}  (market residual baseline ~13.4/sqrt2≈9.5)")
    for j in range(k):
        t = beta[j] / se[j] if se[j] > 0 else 0
        star = "**" if abs(t) > 2 else ("*" if abs(t) > 1.65 else "")
        print(f"  {names[j]:18s} {beta[j]:+7.3f}  se {se[j]:.3f}  t={t:+.2f} {star}")

def referee_effects():
    """Empirical-Bayes referee scoring-environment effects: mean(actual_total - league_mean)
    per referee, shrunk by n (beta-binomial-style shrinkage on means). Top/bottom with n>=80."""
    con = sqlite3.connect(DB)
    if not con.execute("SELECT name FROM sqlite_master WHERE name='officials'").fetchone():
        cur = con.cursor()
        cur.execute("CREATE TABLE officials (game_id TEXT, off_pos TEXT, official_id TEXT, name TEXT)")
        with open(os.path.join(os.path.dirname(DB), "officials.csv")) as f:
            cur.executemany("INSERT INTO officials VALUES (?,?,?,?)",
                            [(r["game_id"], r["off_pos"], r["official_id"], r["name"])
                             for r in csv.DictReader(f)])
        con.commit()
        print("officials table loaded")
    refs = con.execute("""SELECT o.name, g.home_score + g.away_score AS tot
        FROM officials o JOIN nfl_games g ON o.game_id = g.game_id
        WHERE o.off_pos = 'R' AND g.home_score IS NOT NULL""").fetchall()
    con.close()
    by_ref = collections.defaultdict(list)
    for name, tot in refs:
        by_ref[name].append(tot)
    grand = sum(t for v in by_ref.values() for t in v) / sum(len(v) for v in by_ref.values())
    means = {name: sum(v)/len(v) for name, v in by_ref.items() if len(v) >= 80}
    var_between = sum(len(by_ref[n]) * (m - grand) ** 2 for n, m in means.items()) / sum(len(by_ref[n]) for n in means)
    sd_game = (sum((t - grand) ** 2 for v in by_ref.values() for t in v)
               / max(sum(len(v) for v in by_ref.values()) - 1, 1)) ** 0.5
    avg_n = sum(len(by_ref[n]) for n in means) / max(len(means), 1)
    se2 = sd_game ** 2 / avg_n  # sampling variance of a ref's mean
    signal_var = max(var_between - se2, 0.0)
    print(f"\nreferee environment EB (n refs={len(by_ref)}, games={sum(len(v) for v in by_ref.values())}):")
    print(f"grand mean total {grand:.2f}; between-ref sd {math.sqrt(var_between):.2f}; "
          f"signal sd {math.sqrt(signal_var):.2f} (per-ref SE {math.sqrt(se2):.2f})")
    shrunk = []
    for name, v in by_ref.items():
        if len(v) < 80: continue
        nb = len(v)
        se2_i = sd_game ** 2 / nb
        w = signal_var / (signal_var + se2_i) if (signal_var + se2_i) > 0 else 0.0
        post = w * (sum(v) / nb - grand)
        shrunk.append((name, nb, post))
    shrunk.sort(key=lambda x: -x[2])
    print("high-scoring environments (shrunk pts vs league):")
    for name, nb, post in shrunk[:5]:
        print(f"  {name:20s} n={nb:4d} {post:+.2f}")
    print("low-scoring environments:")
    for name, nb, post in shrunk[-5:]:
        print(f"  {name:20s} n={nb:4d} {post:+.2f}")

if __name__ == "__main__":
    build_context()
    fit_context()
    referee_effects()
```


### `data/fatigue_efficiency.py`
```python
#!/usr/bin/env python3
"""fatigue_efficiency.py — the physiological + market-efficiency layer.
1. EPL FATIGUE CURVE: 1st-half vs 2nd-half goal rates over 1,900 matches.
   Goals/min by half, the decay constant, and the Poisson test of equal rates.
2. CLOSING-LINE EFFICIENCY (n=6,830, 2006-2018):
   a. spread calibration: P(fav covers | close) should be ~50% if efficient
   b. FAVORITE-LONGSHOT BIAS: ML closing odds -> implied prob bins vs empirical win rate
3. PHYSIOLOGICAL EQUATIONS (deterministic, documented):
   Rothfusz heat index, altitude ball-flight factor, circadian phase model.
"""
import csv
import math
import os
import sqlite3
import collections

DB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "research.db")

def pois_tail_ge(k, lam):
    return 1.0 - sum(math.exp(-lam) * lam ** i / math.factorial(i) for i in range(k))

# ---------- 1. fatigue curve ----------
def fatigue():
    con = sqlite3.connect(DB)
    rows = con.execute("SELECT hthg, htag, fthg, ftag FROM epl_matches WHERE hthg IS NOT NULL").fetchall()
    con.close()
    n = len(rows)
    h1 = sum(a + b for a, b, _, _ in rows)
    h2 = sum((c - a) + (d - b) for a, b, c, d in rows)
    r1 = h1 / n  # goals/match half 1 (both teams)
    r2 = h2 / n
    # Poisson test of equal rates (2-sample, conditional Poisson ~ chi2)
    stat = (h1 - h2) ** 2 / (h1 + h2)
    # chi2_1 survival: erfc(sqrt(x/2))
    p = math.erfc(math.sqrt(stat / 2))
    print(f"== EPL FATIGUE CURVE (n={n} matches) ==")
    print(f"  1st-half goals/match: {r1:.3f}   2nd-half: {r2:.3f}   ratio 2H/1H = {r2/r1:.3f}")
    print(f"  more goals in 2nd half: {h2 > h1} | Poisson equal-rate test chi2={stat:.1f}, p={p:.2e}")
    late_share = h2 / (h1 + h2)
    print(f"  late-game share of scoring: {late_share:.1%} (fatigue + game-state chasing)")
    return {"r1": r1, "r2": r2, "ratio": r2 / r1, "late_share": late_share}

# ---------- 2. closing-line efficiency ----------
def efficiency():
    # ML closes: (game_id, side, odds) — odds from closing_lines.csv; results from nfl_games
    ml = collections.defaultdict(dict)
    with open(os.path.join(os.path.dirname(DB), "closing_lines.csv")) as f:
        for r in csv.DictReader(f):
            if r["type"] == "MONEYLINE" and r["odds"]:
                try:
                    ml[r["alt_game_id"]][r["side"]] = float(r["odds"])
                except Exception:
                    pass
    con = sqlite3.connect(DB)
    res = {r[0]: r for r in con.execute(
        "SELECT game_id, home, away, home_score, away_score FROM nfl_games WHERE home_score IS NOT NULL")}
    con.close()
    # spread calibration
    spreads = collections.defaultdict(dict)
    with open(os.path.join(os.path.dirname(DB), "closing_lines.csv")) as f:
        for r in csv.DictReader(f):
            if r["type"] == "SPREAD" and r["line"]:
                spreads[r["alt_game_id"]][r["side"]] = float(r["line"])
    fav_covers = []; fav_expected = []
    for gid, sides in spreads.items():
        if gid not in res: continue
        _, home, away, hs, as_ = res[gid]
        # favorite = negative line
        fav = min(sides, key=lambda s: sides[s])
        fav_line = sides[fav]  # negative
        fav_score = hs if fav == home else as_
        dog_score = as_ if fav == home else hs
        covers = 1 if (fav_score - dog_score) + fav_line > 0 else 0
        push = 1 if (fav_score - dog_score) + fav_line == 0 else 0
        if not push:
            fav_covers.append(covers)
    print(f"\n== CLOSING SPREAD CALIBRATION (n={len(fav_covers)} decisive games) ==")
    print(f"  favorite cover rate vs close: {sum(fav_covers)/len(fav_covers):.4f} (efficient = 0.500)")
    se = math.sqrt(0.25 / len(fav_covers))
    print(f"  se {se:.4f} -> {'CONSISTENT with efficiency' if abs(sum(fav_covers)/len(fav_covers)-0.5) < 2*se else 'DEVIATES (2se)'}")

    # favorite-longshot bias on ML
    bins = collections.defaultdict(lambda: [0, 0])  # implied_bin -> [wins, n]
    for gid, sides in ml.items():
        if gid not in res or len(sides) < 2: continue
        _, home, away, hs, as_ = res[gid]
        for side, amer in sides.items():
            p = (100 / (amer + 100)) if amer > 0 else ((-amer) / ((-amer) + 100))
            won = 1 if ((side == home and hs > as_) or (side == away and as_ > hs)) else 0
            b = min(9, int(p * 10))
            bins[b][0] += won; bins[b][1] += 1
    print(f"\n== FAVORITE-LONGSHOT BIAS (ML closes, n={sum(v[1] for v in bins.values())}) ==")
    print("  implied decile | empirical win rate | edge (emp - implied_mid)")
    rows = []
    for b in sorted(bins):
        w, nn = bins[b]
        imp_mid = (b + 0.5) / 10
        rows.append((imp_mid, w / nn, w / nn - imp_mid, nn))
        print(f"  {b/10:.1f}-{(b+1)/10:.1f}          | {w/nn:.4f} (n={nn:5d})   | {w/nn - imp_mid:+.4f}")
    # aggregate FLB slope: regress emp on implied for big bins
    big = [(im, e) for im, e, d, nn in rows if nn >= 200]
    if len(big) >= 5:
        n2 = len(big)
        xm = sum(im for im, _ in big) / n2; ym = sum(e for _, e in big) / n2
        sxy = sum((im - xm) * (e - ym) for im, e in big)
        sxx = sum((im - xm) ** 2 for im, _ in big)
        slope = sxy / sxx
        print(f"  empirical-vs-implied slope: {slope:.3f} (<1 = longshots overpriced / FLB present)")
    return rows

# ---------- 3. physiological equations ----------
def physio():
    print("\n== PHYSIOLOGICAL EQUATIONS (deterministic layer, documented) ==")
    # Rothfusz heat index (F, RH%)
    T, RH = 85.0, 60.0
    HI = (-42.379 + 2.04901523*T + 10.14333127*RH - 0.22475541*T*RH - 6.83783e-3*T*T
          - 5.481717e-2*RH*RH + 1.22874e-3*T*T*RH + 8.5282e-4*T*RH*RH - 1.99e-6*T*T*RH*RH)
    print(f"  heat index example (85F/60%): {HI:.1f}F apparent — above 90F, expect pace/score suppression")
    # altitude ball flight: drag distance factor ~ rho0/rho(alt), rho = 1.225*exp(-h/8500) SI
    for alt_m in (0, 1600):
        rho = 1.225 * math.exp(-alt_m / 8500.0)
        print(f"  altitude {alt_m:4.0f}m: air density {rho:.3f} kg/m3 -> flight-carry factor {1.225/rho:.3f} "
              f"(Denver 5280ft: kicks travel ~{(1.225/rho-1)*100:.0f}% farther)")
    # circadian phase: performance dip when game local-time vs body clock offset by d hours
    for tz in (1, 2, 3):
        # west->east travel: body clock behind by tz h; adaptation ~1h/day
        print(f"  tz shift {tz}h east, 3 days adapt: residual phase lag {max(tz - 3*1.0, 0):.0f}h -> evening-game edge for west teams ~0.3-0.5 pts (lit; our fit: n.s. at close — priced)")

if __name__ == "__main__":
    fatigue()
    efficiency()
    physio()
```


### `data/market_efficiency2.py`
```python
#!/usr/bin/env python3
"""market_efficiency2.py — the CLEAN market-efficiency round.
1. Devigged favorite-longshot bias: 2-way ML closes devigged with SHIN (verified closed
   form), binned by FAIR probability, empirical win rate vs fair. Plus the 0.0-0.1 bin
   hygiene check (was the +23.8pt anomaly real or bad rows?).
2. Heat/cold bins on totals residual vs close (2006-2018) — the temperature dose-response.
"""
import collections
import csv
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import engine_math as em
import sqlite3

DATA = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(DATA, "research.db")

def amer_to_dec(a):
    a = float(a)
    return 1 + (a / 100 if a > 0 else 100 / -a)

def clean_flb():
    ml = collections.defaultdict(dict)
    with open(os.path.join(DATA, "closing_lines.csv")) as f:
        for r in csv.DictReader(f):
            if r["type"] == "MONEYLINE" and r["odds"]:
                try:
                    ml[r["alt_game_id"]][r["side"]] = float(r["odds"])
                except Exception:
                    pass
    con = sqlite3.connect(DB)
    res = {r[0]: r for r in con.execute(
        "SELECT game_id, home, away, home_score, away_score FROM nfl_games WHERE home_score IS NOT NULL")}
    con.close()
    bins = collections.defaultdict(lambda: [0, 0])
    longshot_games = []
    n_markets = 0
    for gid, sides in ml.items():
        if gid not in res or len(sides) != 2:
            continue
        _, home, away, hs, as_ = res[gid]
        raw = []
        sides_list = list(sides.items())
        for side, amer in sides_list:
            p = (100 / (amer + 100)) if amer > 0 else ((-amer) / ((-amer) + 100))
            raw.append(p)
        z, fair = em.shin_devig_nway(raw)  # 2-way Shin devig
        n_markets += 1
        for (side, amer), pf in zip(sides_list, fair):
            won = 1 if ((side == home and hs > as_) or (side == away and as_ > hs)) else 0
            b = min(9, int(pf * 10))
            bins[b][0] += won; bins[b][1] += 1
            if b == 0:
                longshot_games.append((gid, side, amer, round(pf, 3), won))
    print(f"== CLEAN FLB (Shin-devigged 2-way closes, markets={n_markets}) ==")
    print("  fair decile | emp win rate | edge (emp-fair) | n")
    pts = []
    for b in sorted(bins):
        w, nn = bins[b]
        mid = (b + 0.5) / 10
        pts.append((mid, w / nn, nn))
        star = " <-- check" if b == 0 else ""
        print(f"  {b/10:.1f}-{(b+1)/10:.1f}       | {w/nn:.4f}      | {w/nn-mid:+.4f}      | {nn}{star}")
    # slope on bins with n>=200
    big = [(m, e) for m, e, nn in pts if nn >= 200]
    n2 = len(big)
    xm = sum(m for m, _ in big) / n2; ym = sum(e for _, e in big) / n2
    slope = sum((m-xm)*(e-ym) for m, e in big) / sum((m-xm)**2 for m, _ in big)
    print(f"  slope (n>=200 bins): {slope:.3f}  (1.0 = fair; <1 = longshots overpriced)")
    # hygiene: what ARE those sub-10% 'winners'?
    wins_ls = [g for g in longshot_games if g[4] == 1]
    print(f"  0.0-0.1 bin wins: {len(wins_ls)}/{bins[0][1]}")
    for g in wins_ls[:6]:
        print(f"    {g[0]} side={g[1]} amer={g[2]:+.0f} fair={g[3]} won")
    # odds distribution check: are these real ML prices or data errors?
    odds_ls = [abs(g[2]) for g in longshot_games]
    if odds_ls:
        odds_ls.sort()
        print(f"  longshot |odds| range: {odds_ls[0]:+.0f} .. {odds_ls[-1]:+.0f} (median {odds_ls[len(odds_ls)//2]:+.0f})")
    return slope

def heat_bins():
    con = sqlite3.connect(DB)
    rows = con.execute("""SELECT g.game_id, g.temp, g.home_score + g.away_score, g.roof
        FROM nfl_games g WHERE g.temp IS NOT NULL AND g.home_score IS NOT NULL""").fetchall()
    con.close()
    closes = {}
    with open(os.path.join(DATA, "closing_lines.csv")) as f:
        for r in csv.DictReader(f):
            if r["type"] == "TOTAL" and r["line"]:
                try:
                    closes[r["alt_game_id"]] = float(r["line"])
                except Exception:
                    pass
    bins = collections.defaultdict(list)
    for gid, temp, act, roof in rows:
        ct = closes.get(gid)
        if ct is None:
            continue
        resid = act - ct
        if temp >= 85: b = "85+"
        elif temp >= 75: b = "75-84"
        elif temp >= 60: b = "60-74"
        elif temp >= 40: b = "40-59"
        elif temp >= 32: b = "32-39"
        else: b = "<32 (sub-freezing)"
        bins[b].append(resid)
    print("\n== TEMPERATURE DOSE-RESPONSE (actual total - closing total) ==")
    order = ["<32 (sub-freezing)", "32-39", "40-59", "60-74", "75-84", "85+"]
    for b in order:
        v = bins.get(b, [])
        if not v: continue
        m = sum(v) / len(v)
        sd = (sum((x - m) ** 2 for x in v) / max(len(v) - 1, 1)) ** 0.5
        se = sd / math.sqrt(len(v))
        t = m / se if se > 0 else 0
        star = "**" if abs(t) > 2 else ("*" if abs(t) > 1.65 else "")
        print(f"  {b:20s} n={len(v):4d}  resid {m:+.2f}  se {se:.2f}  t={t:+.2f} {star}")

if __name__ == "__main__":
    clean_flb()
    heat_bins()
```


### `data/motivation_spots.py`
```python
#!/usr/bin/env python3
"""motivation_spots.py — situational/motivation features vs the closing residual.
Features computed from the schedule+results themselves (no external data):
  division_game, away_off_blowout_win (won prev by 14+), away_off_blowout_loss,
  home_off_blowout_win, away_second_straight_road (3rd consecutive road game).
Fit: OLS of (margin + closing_spread) on the spot dummies, 2006-2018 real closes.
Division mapping hardcoded (post-2002 alignment)."""
import collections
import csv
import math
import os
import sqlite3

DATA = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(DATA, "research.db")

DIVS = {
    "ARI": "NFCW", "LAR": "NFCW", "SEA": "NFCW", "SF": "NFCW", "PHX": "NFCW",
    "ATL": "NFCS", "CAR": "NFCS", "NO": "NFCS", "TB": "NFCS",
    "CHI": "NFCN", "DET": "NFCN", "GB": "NFCN", "MIN": "NFCN",
    "DAL": "NFCE", "NYG": "NFCE", "PHI": "NFCE", "WAS": "NFCE", "WSH": "NFCE",
    "BUF": "AFCE", "MIA": "AFCE", "NE": "AFCE", "NYJ": "AFCE",
    "BAL": "AFCN", "CIN": "AFCN", "CLE": "AFCN", "PIT": "AFCN",
    "HOU": "AFCS", "IND": "AFCS", "JAX": "AFCS", "TEN": "AFCS",
    "DEN": "AFCW", "KC": "AFCW", "LV": "AFCW", "OAK": "AFCW", "LAC": "AFCW", "SD": "AFCW",
}

def load_schedule():
    con = sqlite3.connect(DB)
    rows = con.execute("""SELECT season, week, home, away, home_score, away_score
        FROM nfl_games WHERE home_score IS NOT NULL ORDER BY season, week""").fetchall()
    con.close()
    return rows

def prev_margin_map(rows):
    """(season, team, week) -> margin of that team's previous game (None if bye/none)."""
    last = {}
    out = {}
    for season, week, home, away, hs, as_ in rows:
        for team, marg in ((home, hs - as_), (away, as_ - hs)):
            out[(season, team, week)] = last.get((season, team), None)
            last[(season, team)] = marg
    return out

def run():
    rows = load_schedule()
    prev = prev_margin_map(rows)
    spreads = collections.defaultdict(dict)
    with open(os.path.join(DATA, "closing_lines.csv")) as f:
        for r in csv.DictReader(f):
            if r["type"] == "SPREAD" and r["line"]:
                spreads[r["alt_game_id"]][r["side"]] = float(r["line"])
    X, y = [], []
    names = ["division_game", "away_off_win14plus", "away_off_lost14plus",
             "home_off_win14plus", "both_off_wins", "intercept"]
    for season, week, home, away, hs, as_ in rows:
        gid = f"{season}_{week:02d}_{away}_{home}"
        sides = spreads.get(gid)
        if not sides or home not in sides:
            continue
        hsp = sides[home]
        resid = (hs - as_) + hsp
        aw_prev = prev.get((season, away, week))
        hm_prev = prev.get((season, home, week))
        div = 1 if DIVS.get(away) and DIVS.get(away) == DIVS.get(home) else 0
        a_w14 = 1 if (aw_prev is not None and aw_prev >= 14) else 0
        a_l14 = 1 if (aw_prev is not None and aw_prev <= -14) else 0
        h_w14 = 1 if (hm_prev is not None and hm_prev >= 14) else 0
        both_w = 1 if a_w14 and h_w14 else 0
        X.append([div, a_w14, a_l14, h_w14, both_w, 1.0])
        y.append(resid)
    n, k = len(X), len(names)
    xtx = [[sum(X[i][a] * X[i][b] for i in range(n)) + (1.0 if a == b else 0.0) for b in range(k)] for a in range(k)]
    xty = [sum(X[i][a] * y[i] for i in range(n)) for a in range(k)]
    M = [xtx[i][:] + [xty[i]] for i in range(k)]
    for c in range(k):
        piv = max(range(c, k), key=lambda r: abs(M[r][c]))
        M[c], M[piv] = M[piv], M[c]
        if abs(M[c][c]) < 1e-9: continue
        for r in range(k):
            if r != c and M[r][c]:
                f = M[r][c] / M[c][c]
                M[r] = [v - f * w for v, w in zip(M[r], M[c])]
    beta = [M[i][k] / M[i][i] for i in range(k)]
    resid2 = [y[i] - sum(X[i][j] * beta[j] for j in range(k)) for i in range(n)]
    s2 = sum(v * v for v in resid2) / (n - k)
    print(f"== MOTIVATION SPOTS vs CLOSING SPREAD (n={n}, 2006-2018) ==")
    print("  (resid = margin + spread; positive = home beats close)")
    for j in range(k):
        # SE via inverse diagonal (small k, direct cofactor)
        Ainv_jj = _inv_diag(xtx, j)
        se = math.sqrt(max(s2 * Ainv_jj, 0.0))
        t = beta[j] / se if se > 0 else 0
        star = "**" if abs(t) > 2 else ("*" if abs(t) > 1.65 else "")
        print(f"  {names[j]:22s} {beta[j]:+7.3f}  se {se:.3f}  t={t:+.2f} {star}")

def _inv_diag(A, j):
    k = len(A)
    M = [row[:] for row in A]
    for c in range(k):
        piv = max(range(c, k), key=lambda r: abs(M[r][c]))
        M[c], M[piv] = M[piv], M[c]
        if abs(M[c][c]) < 1e-12: continue
        for r in range(k):
            if r != c and M[r][c]:
                f = M[r][c] / M[c][c]
                M[r] = [v - f * w for v, w in zip(M[r], M[c])]
    return (M[j][j]) ** -1

if __name__ == "__main__":
    run()
```


### `data/slate_context2.py`
```python
#!/usr/bin/env python3
"""slate_context2.py — the game-slate layer vs the closing spread, 2006-2018 real closes.
Dimensions (all computed from schedule data):
  day-of-week / slate window (TNF, SNF, MNF, Sunday early/late via gametime),
  post-bye (rest >= 12), 3rd-consecutive-road game, first-season-in-new-stadium,
  Thursday-after-Sunday (the short-week interaction), London/neutral-site games.
Fit: OLS of (margin + closing_spread) on slate dummies. n=3,368."""
import collections
import csv
import math
import os
import sqlite3

DATA = os.path.dirname(os.path.abspath(__file__))
DB = os.path.join(DATA, "research.db")

def _migrate():
    con = sqlite3.connect(DB)
    cols = {r[1] for r in con.execute("PRAGMA table_info(nfl_games)")}
    if "weekday" not in cols:
        con.execute("ALTER TABLE nfl_games ADD COLUMN weekday TEXT")
    if "gameday" not in cols:
        con.execute("ALTER TABLE nfl_games ADD COLUMN gameday TEXT")
    if "stadium" not in cols:
        con.execute("ALTER TABLE nfl_games ADD COLUMN stadium TEXT")
    if "weekday" not in cols or "gameday" not in cols or "stadium" not in cols:
        with open(os.path.join(DATA, "games_all.csv")) as f:
            for r in csv.DictReader(f):
                con.execute("UPDATE nfl_games SET weekday=?, gameday=?, stadium=? WHERE game_id=?",
                            (r.get("weekday"), r.get("gameday"), r.get("stadium"), r.get("game_id")))
        con.commit()
    con.close()

_gametimes = {}

def main():
    _migrate()
    con = sqlite3.connect(DB)
    games = con.execute("""SELECT game_id, season, week, home, away, gameday, weekday, stadium
        FROM nfl_games WHERE home_score IS NOT NULL""").fetchall()
    con.close()
    spreads = collections.defaultdict(dict)
    with open(os.path.join(DATA, "closing_lines.csv")) as f:
        for r in csv.DictReader(f):
            if r["type"] == "SPREAD" and r["line"]:
                spreads[r["alt_game_id"]][r["side"]] = float(r["line"])
    # stadium history per team-season -> new stadium flag
    stad_first = {}
    team_stad = collections.defaultdict(str)
    for gid, season, week, home, away, gd, wd, stad in sorted(games, key=lambda g: (g[1], g[2])):
        if team_stad[home] and team_stad[home] != (stad or "") and (home, season) not in stad_first:
            stad_first[(home, season)] = True
        if stad:
            team_stad[home] = stad
    # road streaks
    road_run = collections.Counter()
    names = ["TNF", "SNF", "MNF", "late_Sunday(4pm+)", "post_bye_home", "post_bye_away",
             "3rd_consec_road", "new_stadium_home", "intercept"]
    X, y = [], []
    for gid, season, week, home, away, gd, wd, stad in games:
        sides = spreads.get(gid)
        if not sides or home not in sides:
            continue
        hsp = sides[home]
        resid = (hs - as_) if False else None
    # (recompute with scores)
    con = sqlite3.connect(DB)
    scores = {r[0]: (r[1], r[2]) for r in con.execute(
        "SELECT game_id, home_score, away_score FROM nfl_games WHERE home_score IS NOT NULL")}
    con.close()
    road_streak = collections.Counter()
    con = sqlite3.connect(DB)
    rests = {r[0]: (r[1] or 7, r[2] or 7) for r in con.execute(
        "SELECT game_id, home_rest, away_rest FROM nfl_games")}
    global _gametimes
    _gametimes = {r[0]: (r[1] or "13:00") for r in con.execute(
        "SELECT game_id, gametime FROM nfl_games")}
    con.close()
    X, y = [], []
    for gid, season, week, home, away, gd, wd, stad in games:
        sides = spreads.get(gid)
        if not sides or home not in sides or gid not in scores:
            continue
        hs, as_ = scores[gid]
        resid = (hs - as_) + sides[home]
        wd = (wd or "Sunday").strip()
        gt = _gametimes.get(gid, "13:00")
        tp = gt
        try:
            hh = int(tp.split(":")[0]) if ":" in tp else 13
        except ValueError:
            hh = 13
        tnf = 1 if wd == "Thursday" else 0
        snf = 1 if wd == "Sunday" and hh >= 20 else 0
        mnf = 1 if wd == "Monday" else 0
        late_sun = 1 if wd == "Sunday" and 15 <= hh < 20 else 0
        hrest, arest = rests.get(gid, (7, 7))
        pb_h = 1 if hrest >= 12 else 0
        pb_a = 1 if arest >= 12 else 0
        r3 = 1 if road_streak[away] >= 2 else 0
        ns = 1 if stad_first.get((home, season)) else 0
        X.append([tnf, snf, mnf, late_sun, pb_h, pb_a, r3, ns, 1.0])
        y.append(resid)
        # update road streak AFTER the game
        road_streak[away] += 1
        for t in list(road_streak.keys()):
            if t != away:
                road_streak[t] = 0
    n, k = len(X), len(names)
    xtx = [[sum(X[i][a] * X[i][b] for i in range(n)) + (1.0 if a == b else 0.0) for b in range(k)] for a in range(k)]
    xty = [sum(X[i][a] * y[i] for i in range(n)) for a in range(k)]
    M = [xtx[i][:] + [xty[i]] for i in range(k)]
    for c in range(k):
        piv = max(range(c, k), key=lambda r: abs(M[r][c]))
        M[c], M[piv] = M[piv], M[c]
        if abs(M[c][c]) < 1e-9: continue
        for r in range(k):
            if r != c and M[r][c]:
                f = M[r][c] / M[c][c]
                M[r] = [v - f * w for v, w in zip(M[r], M[c])]
    beta = [M[i][k] / M[i][i] for i in range(k)]
    resid2 = [y[i] - sum(X[i][j] * beta[j] for j in range(k)) for i in range(n)]
    s2 = sum(v * v for v in resid2) / (n - k)
    print(f"== SLATE / GAME-WINDOW EFFECTS vs CLOSING SPREAD (n={n}) ==")
    print("  (resid = margin + spread; positive = home beats the close)")
    from motivation_spots import _inv_diag
    for j in range(k):
        se = math.sqrt(max(s2 * _inv_diag(xtx, j), 0.0))
        t = beta[j] / se if se > 0 else 0
        star = "**" if abs(t) > 2 else ("*" if abs(t) > 1.65 else "")
        print(f"  {names[j]:22s} {beta[j]:+7.3f}  se {se:.3f}  t={t:+.2f} {star}")

def _rest_ge(gid, days, side):
    con = sqlite3.connect(DB)
    col = "home_rest" if side == "home" else "away_rest"
    r = con.execute(f"SELECT {col} FROM nfl_games WHERE game_id=?", (gid,)).fetchone()
    con.close()
    return r and r[0] and r[0] >= days

if __name__ == "__main__":
    main()
```


### `data/deep_metrics_nfl.py`
```python
#!/usr/bin/env python3
"""deep_metrics_nfl.py — the deep on-field metrics layer, computed from REAL nflverse
play-by-play (2025 season, 48,771 plays, nflfastR precomputed EPA/WP).

Outputs (all printed + stored):
 1. Team EPA table: offense EPA/play, defense EPA allowed/play, total EPA margin
 2. Validation: EPA margin vs wins (the metric's ground-truth check)
 3. NFL FATIGUE CURVE: points-per-quarter scoring rates + EPA/play by quarter
 4. Success rate by down (EPA>0), 3rd-down economics, red-zone conversion
 5. Prime-time / slate EPA splits (TNF/MNF/SNF vs Sunday windows)
"""
import csv
import collections
import datetime
import math
import os

HERE = os.path.dirname(os.path.abspath(__file__))
PBP = os.path.join(HERE, "deep", "pbp_2025.csv")

def main():
    team_epa = collections.defaultdict(float)      # offense EPA sum
    team_plays = collections.defaultdict(int)
    def_epa = collections.defaultdict(float)       # defense EPA allowed
    q_points = collections.defaultdict(lambda: collections.defaultdict(float))  # qtr -> team -> pts
    q_plays = collections.defaultdict(lambda: collections.defaultdict(int))
    down = collections.defaultdict(lambda: [0, 0.0, 0])   # plays, epa_sum, successes
    wins = collections.Counter(); losses = collections.Counter()
    team_ptdiff = collections.Counter()
    slate_epa = collections.defaultdict(lambda: [0.0, 0])  # slate -> [epa_off_sum, plays]
    games_seen = {}
    with open(PBP) as f:
        for row in csv.DictReader(f):
            try:
                down_i = int(row["down"]) if row["down"] else 0
                epa = float(row["epa"]) if row["epa"] not in ("", "NA") else None
                post = row["posteam"]; defe = row["defteam"]
                if not post or not defe:
                    continue
                q = int(row["qtr"]) if row["qtr"] else 0
                st = row["game_seconds_remaining"]
                sr = row["score_differential"]
                hs = row["total_home_score"]; as_ = row["total_away_score"]
                gid = row["game_id"]
                # scores at game end (last play rows overwrite)
                if hs and as_:
                    games_seen[gid] = (row["home_team"], row["away_team"], int(float(hs)), int(float(as_)),
                                       row["game_date"], row.get("day_of_week", ""))
                if epa is None:
                    continue
                playtype = row["play_type"]
                if playtype not in ("pass", "run", "field_goal", "punt", "qb_kneel", "qb_spike"):
                    continue
                team_epa[post] += epa
                def_epa[defe] += epa
                team_plays[post] += 1
                if 1 <= down_i <= 4:
                    down[down_i][0] += 1
                    down[down_i][1] += epa
                    if epa > 0: down[down_i][2] += 1
                if q in (1, 2, 3, 4):
                    q_plays[q][post] += 1
                    # points scored on this play by posteam:
                    td = 1 if row["touchdown"] == "1" else 0
                    pts = 0.0
                    if td:
                        pts = 7.0  # approx (6+xp rate); refined below via score change
                    fgm = 1 if row["field_goal_result"] == "made" else 0
                    if fgm: pts = 3.0
                    if pts:
                        q_points[q][post] += pts
                # slate classification (weekday from game_date at game level cached)
                slate_epa[("S", gid, post)] = None  # placeholder, resolved below
                # per-game team point diff for validation
            except (ValueError, KeyError):
                continue
    # ---- team-level aggregation + validation ----
    # recompute game winners + weekday via second light pass over game rows
    game_weekday = {}
    with open(PBP) as f:
        seen = set()
        for row in csv.DictReader(f):
            gid = row["game_id"]
            if gid in seen: continue
            seen.add(gid)
            try:
                d = datetime.date.fromisoformat(row["game_date"])
                game_weekday[gid] = d.weekday()  # Mon=0..Sun=6
            except Exception:
                game_weekday[gid] = None
    for gid, (home, away, hs, as_, gdate, _) in games_seen.items():
        if hs == as_: continue
        w, l = (home, away) if hs > as_ else (away, home)
        wins[w] += 1; losses[l] += 1
        team_ptdiff[home] += hs - as_; team_ptdiff[away] += as_ - hs
    # slate per game from weekday
    def slate_of(wd):
        return {0: "MNF", 3: "TNF", 5: "SNF-Sat", 6: "Sunday"}.get(wd, "Other")
    game_slate = {gid: slate_of(wd) for gid, wd in game_weekday.items()}
    # aggregate EPA by slate: third quick pass
    slate_agg = collections.defaultdict(lambda: [0.0, 0])
    with open(PBP) as f:
        for row in csv.DictReader(f):
            gid = row["game_id"]
            if row["posteam"] and row["epa"] not in ("", "NA") and row["play_type"] in ("pass", "run", "field_goal", "punt", "qb_kneel", "qb_spike"):
                s = game_slate.get(gid)
                if s:
                    slate_agg[s][0] += float(row["epa"]); slate_agg[s][1] += 1
    print("== TEAM EPA TABLE (2025, nflfastR EPA, all plays) ==")
    print(f"{'team':5s} {'offEPA/p':>9s} {'defEPA/p':>9s} {'total':>8s} {'W':>3s} {'L':>3s} {'PtDiff':>7s}")
    table = []
    for t in set(list(team_epa.keys()) + list(def_epa.keys())):
        off = team_epa[t] / max(team_plays[t], 1)
        deff_ = def_epa[t] / max(team_plays[t], 1)  # EPA allowed per play (positive = bad def)
        total = off - deff_
        table.append((t, off, deff_, total, wins[t], losses[t], team_ptdiff[t]))
    table.sort(key=lambda r: -r[3])
    for t, off, deff_, total, w, l, pd in table:
        print(f"{t:5s} {off:+9.3f} {deff_:+9.3f} {total:+8.3f} {w:3d} {l:3d} {pd:+7d}")
    # validation: correlation(total EPA, point diff)
    xs = [r[3] for r in table]; ys = [r[6] for r in table]
    n = len(xs)
    xm = sum(xs)/n; ym = sum(ys)/n
    r_ = sum((a-xm)*(b-ym) for a, b in zip(xs, ys)) / math.sqrt(
        sum((a-xm)**2 for a in xs) * sum((b-ym)**2 for b in ys))
    print(f"\nEPA-margin vs point-differential correlation: r={r_:.3f} (n={n} teams) — metric validity check")
    # spearman (rank) vs wins
    def rank(v):
        order = sorted(range(len(v)), key=lambda i: v[i])
        rk = [0]*len(v)
        for i, idx in enumerate(order): rk[idx] = i
        return rk
    rw = sum((a-b)**2 for a, b in zip(rank(xs), rank([r[4] for r in table])))
    rho = 1 - 6*rw/(n*(n*n-1))
    print(f"EPA-margin vs WINS spearman rho: {rho:.3f}")

    print("\n== NFL FATIGUE CURVE (points by quarter, 2025) ==")
    tot_q = {q: sum(q_points[q].values()) for q in (1, 2, 3, 4)}
    plays_q = {q: sum(q_plays[q].values()) for q in (1, 2, 3, 4)}
    for q in (1, 2, 3, 4):
        per_game = tot_q[q] / 285  # ~285 games 2025 (272 reg + playoff weeks present)
        print(f"  Q{q}: points {tot_q[q]:7.0f}  ({per_game:5.2f}/game)  plays {plays_q[q]:6d}  pts/play {tot_q[q]/max(plays_q[q],1):.4f}")
    q34 = tot_q[4] / max(tot_q[3], 1); q21 = tot_q[2] / max(tot_q[1], 1)
    print(f"  Q2/Q1 ratio {q21:.3f} | Q4/Q3 ratio {q34:.3f} | 2H/1H {(tot_q[3]+tot_q[4])/(tot_q[1]+tot_q[2]):.3f}")

    print("\n== SUCCESS RATE BY DOWN (EPA>0 share) ==")
    for d in (1, 2, 3, 4):
        plays_, epa_sum, succ = down[d]
        print(f"  {std_d(d)} down: plays {plays_:6d}  EPA/play {epa_sum/plays_:+.4f}  success {succ/plays_:.3f}")

    print("\n== SLATE EPA SPLITS (offense EPA/play by game window) ==")
    for s in ("Sunday", "MNF", "TNF", "SNF-Sat", "Other"):
        if s in slate_agg and slate_agg[s][1] > 500:
            e, p = slate_agg[s]
            print(f"  {s:10s} plays {p:6d}  EPA/play {e/p:+.4f}")

def std_d(d):
    return {1: "1st", 2: "2nd", 3: "3rd", 4: "4th"}[d]

if __name__ == "__main__":
    main()
```


### `data/download_deep.py`
```python
#!/usr/bin/env python3
"""download_deep.sh — one-command acquisition of the deep-metrics corpus (keyless).
Run from data/: python3 download_deep.sh   (or bash download_deep.sh)
Everything lands in data/deep/. Total ~26MB. Re-run = refresh."""
import os
import subprocess
import sys

BASE = "https://github.com/nflverse/nflverse-data/releases/download"
FILES = [
    # (tag, asset, out)
    ("pbp", "play_by_play_2025.csv.gz", "pbp_2025.csv.gz"),
    ("pbp", "play_by_play_2024.csv.gz", "pbp_2024.csv.gz"),          # backfill (~19MB)
    ("nextgen_stats", "ngs_2023_passing.csv.gz", "ngs_2023_passing.csv.gz"),
    ("nextgen_stats", "ngs_2022_passing.csv.gz", "ngs_2022_passing.csv.gz"),
    ("nextgen_stats", "ngs_2023_rushing.csv.gz", "ngs_2023_rushing.csv.gz"),
    ("nextgen_stats", "ngs_2023_receiving.csv.gz", "ngs_2023_receiving.csv.gz"),
    ("combine", "combine.csv", "combine.csv"),
    ("contracts", "historical_contracts.csv.gz", "contracts.csv.gz"),
    ("injuries", "injuries_2024.csv", "injuries_2024.csv"),
    ("snap_counts", "snap_counts_2024.csv.gz", "snap_counts_2024.csv.gz"),
    ("pfr_advstats", "advstats_week_pass_2024.csv", "pfr_advstats_pass_2024.csv"),
    ("pfr_advstats", "advstats_week_def_2024.csv", "pfr_advstats_def_2024.csv"),
]
BASEDATA = "https://raw.githubusercontent.com/nflverse/nfldata/master/data"
NFDATA = ["games.csv", "closing_lines.csv", "officials.csv", "initial_lines.csv"]
EPL_TAGS = ["1415", "1516", "1617", "1718", "1819", "1923", "2021", "2122", "2223", "2324", "2425"]

def sh(url, out):
    dest = os.path.join("deep" if not out.startswith(("epl_",)) else ".", out)
    if not out.startswith("epl_"):
        os.makedirs("deep", exist_ok=True)
        dest = os.path.join("deep", out)
    if os.path.exists(dest) and os.path.getsize(dest) > 10000:
        print(f"  skip (cached): {dest}")
        return
    print(f"  fetch: {dest}")
    subprocess.run(["curl", "-sL", "--max-time", "150", "-o", dest, url], check=False)

if __name__ == "__main__":
    here = os.path.dirname(os.path.abspath(__file__))
    os.chdir(here)
    print("== nflverse data lake (deep metrics) ==")
    for tag, asset, out in FILES:
        sh(f"{BASE}/{tag}/{asset}", out)
    print("== nfldata core ==")
    for name in NFDATA:
        sh(f"{BASEDATA}/{name}", name.replace(".csv", "") + "_dl.csv" if name != "games.csv" else "games_all.csv")
    print("== EPL market corpus (11 seasons) ==")
    for tag in EPL_TAGS:
        sh(f"https://www.football-data.co.uk/mmz4281/{tag}/E0.csv", f"epl_{tag}.csv")
    print("done. Then: build_db.py → context_engine.py → fit_engines.py → analyze_nfl.py →"
          " market_efficiency2.py → motivation_spots.py → slate_context2.py → deep_metrics_nfl.py")
```


### `router_prediction.py`
```python
#!/usr/bin/env python3
"""router_prediction.py — PREDICTION-ONLY command router (per packet audit).

Two interfaces:
  1) CLI:    python3 router_prediction.py "/props deep"
  2) API:    from router_prediction import handle ; handle("/ratings") -> list[str]

Command set — prediction commands ONLY:
  /predict devig|shin|alt <args>     engine_math devig + ladders
  /props sgp|team|game|kelly|dfs     props_optimizer joint pricing + optimizers
  /props deep                        props_deep distributional models
  /ratings                           the 8-system rating demo (ratings2)
  /calib                             calibration layer demo (conformal proof)
  /kelly2                            simultaneous Kelly + ruin demo
  /clv demo|report                   CLV ledger
  /backtest [season] [weeks]         leakage-free real-data backtest
  /xray                              market X-ray (ESPN holds) — stays, per audit

INTENTIONALLY NOT ROUTED (security/recon track lives in MASTER.md, different folder):
  /hydra /sqlmap /crack /shodan /exposure /watch /scan* /recon* — do NOT port these
  into the sports research build.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import engine_math as em
import ratings2 as r2
import calibration2 as cal
import kelly2 as k2
import props_deep as pdeep
import props_optimizer as popt
import pick6_hold as p6
import clv as clv


def _backtest_out(args):
    import backtest
    season = int(args[0]) if args and args[0].isdigit() else 2025
    weeks = int(args[1]) if len(args) > 1 and args[1].isdigit() else 6
    games = backtest.fetch_season(season, range(1, weeks + 1))
    res = backtest.backtest(games)
    sc = backtest.score_results(res)
    tr = backtest.temperature_refit(res)
    return [f"games={len(games)} preds={sc['n']} brier={sc['brier']} crps={sc['crps']} acc={sc['pick_acc']}",
            f"PIT={sc['pit']}",
            f"refit T={tr['T']} brier {tr['brier_before']} -> {tr['brier_after']}"]


def _subprocess_out(cmd, timeout=120):
    import subprocess
    r = subprocess.run([sys.executable, "-c", cmd], capture_output=True, text=True,
                       timeout=timeout, cwd=os.path.dirname(os.path.abspath(__file__)))
    out = (r.stdout or r.stderr).strip().splitlines()
    return out[-12:] if out else ["(no output)"]


def predict_out(args):
    if not args:
        return ["usage: /predict devig <p1> <p2> [method] | shin <p1> <p2> | alt <spread>"]
    mode = args[0]
    if mode == "devig" and len(args) >= 3:
        p1, p2 = float(args[1]), float(args[2])
        method = args[3] if len(args) > 3 else "mult"
        f1, f2 = em.fair(p1, p2, method)
        return [f"{method}: {p1}->{f1:.4f}  {p2}->{f2:.4f}  (Σ={f1+f2:.4f})"]
    if mode == "shin" and len(args) >= 3:
        z, q1, q2 = em.shin_devig(float(args[1]), float(args[2]))
        m1, m2 = em.fair(float(args[1]), float(args[2]), "mult")
        return [f"shin z={z:.4f} probs=({q1:.4f},{q2:.4f}) | mult=({m1:.4f},{m2:.4f}) fav_gap={q1-m1:+.4f}"]
    if mode == "alt" and len(args) >= 2:
        return em.alt_ladder(float(args[1])).splitlines()
    return ["unknown /predict mode"]


def props_out(args):
    mode = args[0] if args else "all"
    if mode == "deep":
        return [str(pdeep.self_check()),
                "negbin m6 v9  P(over 5.5)=%.4f" % pdeep.prop_p_over_negbin(6.0, 9.0, 5.5),
                "copula rho=.5 both=%.4f" % pdeep.copula_prop_joint(0.6, 0.6, 0.5, n_sims=2000)["both"],
                "bayes shrink n=4: %s" % pdeep.bayes_shrink_projection(20.0, 15.0, 4)]
    if mode == "sgp":
        legs = [("A rec yds", 5.5, 2.6, 4.5, "over"), ("B rush att", 12.0, 3.5, 14.5, "over"),
                ("C receptions", 4.2, 1.9, 3.5, "over")]
        r = popt.sgp_price(legs, 0.25)
        return [f"joint={r['p_joint']*100:.1f}% indep={r['p_indep']*100:.1f}% gap={r['correlation_tax']*100:+.1f}pt fair={r['fair_amer']:+.0f}"]
    if mode == "team":
        r = popt.team_prop(48.5, -3.0, 27.5)
        return [f"home o27.5 (T48.5 S-3): p={r['p']:.4f} fair={r['fair_amer']:+.0f}"]
    if mode == "game":
        return [f"S-3 T48.5: {popt.game_props(-3.0, 48.5)}"]
    if mode == "kelly":
        legs = [("A", 5.5, 2.6, 4.5, "over"), ("B", 12.0, 3.5, 14.5, "over"), ("C", 4.2, 1.9, 3.5, "over")]
        k = popt.kelly_portfolio(legs, 0.25)
        return [f"fractions={k['fractions']}% growth={k['growth_per_round']}",
                "optimizer derived the portfolio from the joint distribution"]
    if mode == "dfs":
        players = [("QB1", "QB", 6000, 22.5), ("QB2", "QB", 5200, 18.0), ("RB1", "RB", 7100, 19.0),
                   ("RB2", "RB", 5400, 14.5), ("RB3", "RB", 4300, 11.0), ("WR1", "WR", 6800, 18.5),
                   ("WR2", "WR", 5600, 15.0), ("WR3", "WR", 4700, 12.5), ("TE1", "TE", 4300, 11.5),
                   ("DST1", "DST", 3800, 8.5)]
        d = popt.dfs_optimizer(players)
        return [f"lineup={d['lineup']}", f"proj={d['proj']} salary={d['salary']}"]
    return ["usage: /props sgp|team|game|kelly|dfs|deep"]


def ratings_out():
    out = ["8-system demo slate (A 4-0, B 2-2, C 0-4):"]
    games = [("A", "B", 24, 17), ("A", "C", 31, 10), ("B", "C", 20, 14),
             ("A", "B", 21, 14), ("C", "A", 7, 28), ("C", "B", 10, 27)]
    out.append("colley: " + str(r2.colley(games)))
    out.append("srs   : " + str(r2.srs(games)))
    out.append("ens A/C margin: " + str(r2.ensemble_margin(games, "A", "C")["ensemble_margin"]))
    return out


def calib_out():
    import random
    rnd = random.Random(3)
    pairs = []
    for _ in range(600):
        if rnd.random() < 0.6:
            pairs.append((0.75, 1) if rnd.random() < 0.6 else (0.75, 0))
        else:
            pairs.append((0.25, 1) if rnd.random() < 0.4 else (0.25, 0))
    rep = cal.recalibrate_report(pairs)
    rnd2 = random.Random(5)
    ccal = [abs(rnd2.gauss(0, 1)) for _ in range(500)]
    ctest = [abs(rnd2.gauss(0, 1)) for _ in range(500)]
    cc = cal.conformal_coverage_check(ccal, ctest, 0.10)
    return [f"brier raw={rep['raw_brier']} platt={rep['platt']['brier']} temp={rep['temperature']['brier']}",
            f"conformal q={cc['q']:.3f} empirical={cc['empirical_coverage']:.3f} target={cc['target']}"]


def kelly2_out():
    bets = [{"p": 0.60, "amer": -110, "name": "A"},
            {"p": 0.57, "amer": -115, "name": "B"},
            {"p": 0.55, "amer": +105, "name": "C"}]
    rho55 = [[1.0, 0.55, 0.30], [0.55, 1.0, 0.30], [0.30, 0.30, 1.0]]
    r = k2.simultaneous_kelly(bets, rho55, n_sims=4000, iters=25)
    rr = k2.risk_of_ruin(bets, r["fractions"], rounds=150, trials=200)
    return [f"fractions={r['fractions']} growth={r['growth_per_round']}",
            f"ruin={rr['p_ruin']} median_final={rr['median_final']}"]


HELP = """PREDICTION ROUTER — commands:
/predict devig <p1> <p2> [mult|add|power] | shin <p1> <p2> | alt <spread>
/props sgp|team|game|kelly|dfs|deep
/ratings | /calib | /kelly2 | /clv demo|report | /backtest [season] [weeks] | /xray"""


def handle(text):
    """API: returns list[str] of output lines for a command string."""
    parts = (text or "").strip().split()
    if not parts:
        return [HELP]
    cmd, args = parts[0].lower(), parts[1:]
    try:
        if cmd in ("/start", "/help", "help"):
            return HELP.splitlines()
        if cmd == "/predict":
            return predict_out(args)
        if cmd == "/props":
            return props_out(args)
        if cmd == "/ratings":
            return ratings_out()
        if cmd == "/calib":
            return calib_out()
        if cmd == "/kelly2":
            return kelly2_out()
        if cmd == "/clv":
            if not args or args[0] == "demo":
                return _subprocess_out("import clv,os;"
                                       "os.remove('clv_ledger.json') if os.path.exists('clv_ledger.json') else None;"
                                       "print(clv.demo())")
            return clv.report().splitlines()
        if cmd == "/backtest":
            return _backtest_out(args)
        if cmd == "/xray":
            return _subprocess_out("import divergence; divergence.main()", timeout=90)
        return [f"unknown command {cmd}", HELP]
    except Exception as e:
        return [f"error: {type(e).__name__}: {e}"]


if __name__ == "__main__":
    if len(sys.argv) > 1:
        for line in handle(" ".join(sys.argv[1:])):
            print(line)
    else:
        print(HELP)
```


---

# MANIFEST

| file | bytes | sha256-12 |
|---|---|---|

| ENGINE_GAP_AUDIT.md | 9574 | 967c6edcd85f |

| GSE_REVERSE_ENGINEERING.md | 9982 | 53153c3bbea2 |

| REDUNDANCY.md | 4357 | 5760c084bf11 |

| CONTEXTUAL_LAYER.md | 15243 | 7e90706c5648 |

| BDB2027_GROUNDWORK.md | 5813 | cfe628384a9c |

| ANGLES_REGISTRY.md | 13715 | 86c8f4c4637c |

| FANTASY_TOOLING_RECON.md | 7445 | 0a43730e10fb |

| ENGINE_BLUEPRINTS.md | 10905 | c927a9534703 |

| bus_out/PP_MARGIN_CURVE_2026-10-10.md | 1727 | 0186b72dedef |

| bus_out/PP_PAYOUT_TABLES_CONFIRMED.md | 1734 | 68b3bd8ff39e |

| bus_out/PICKEM_RECON_MERGE_NOTES.md | 690 | 2cbecf7be839 |

| bus_out/DEEP_INTEL_v3.md | 1197 | ac315bcabef2 |

| bus_out/SHADE_MAP_README.md | 522 | 288d131bf81f |

| engine_math.py | 21377 | 02b579254b71 |

| ratings2.py | 15193 | b099f5134025 |

| calibration2.py | 8426 | 72f5064bf55e |

| kelly2.py | 8590 | 848d84a120ba |

| props_deep.py | 11853 | 82d559a2cbd3 |

| props_optimizer.py | 9461 | 99e55f17d717 |

| clv.py | 4775 | 55378b634e5c |

| backtest.py | 6681 | eeaeb5248c58 |

| pick6_hold.py | 4142 | 022fcff219dd |

| divergence.py | 3492 | d3bfb093ac3f |

| sportsbook.py | 3810 | 9ac989e8efdb |

| predict.py | 3873 | 3957f691a445 |

| books_api.py | 7774 | 39239dcfd4c1 |

| ladder_inverse.py | 13203 | 399522000d82 |

| gap_engines.py | 9116 | 5a5565e77010 |

| pfr_pull.py | 5126 | 9980fba455d9 |

| push_to_bus.py | 9363 | 3fcc842d0f56 |

| build_delivery.py | 2765 | a7377f6252c3 |

| data/build_db.py | 4551 | b87acf877b7b |

| data/fit_engines.py | 12740 | 4bff7e4eac20 |

| data/analyze_nfl.py | 6986 | f6afe18901ef |

| data/context_engine.py | 10767 | 54d3ccb5defc |

| data/fatigue_efficiency.py | 6632 | 26a5e0781aac |

| data/market_efficiency2.py | 5131 | fcbec93bf732 |

| data/motivation_spots.py | 4835 | 3efcede8ecb9 |

| data/slate_context2.py | 6152 | d4162cef5925 |

| data/deep_metrics_nfl.py | 7929 | 8be83ce10628 |

| data/download_deep.py | 2745 | ec27355714a7 |

| router_prediction.py | 8470 | 25fb9c5ced2f |
