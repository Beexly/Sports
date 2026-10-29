# MASTER MATRIX — competitor engines (2026-10-24)

| engine | code status | language | license | formula depth | where |
|---|---|---|---|---|---|
| nfelo (commercial) | **FULL SOURCE PUBLIC** | Python | — | engine + optimizer + market regression + priors | nfelo-engines/nfelo (+5 sibling repos) |
| FiveThirtyEight Elo/QBEL | **FULL GAME ENGINE PUBLIC** (MIT) | Python | MIT | verbatim constants: HFA=65, K=20, REVERT=1/3, MOV mult 2.2 cap | public-engines/nfl-elo-game/forecast.py |
| nflfastR EPA/WP/XYAC | FULL SOURCE (production) | R | GPL | EP next-score dist; XYAC residual | public-engines/nflfastR/R/ep_wp_calculators.R |
| nfl4th decision engine | FULL SOURCE | R | yes | go/FG/punt WP composition | public-engines/nfl4th |
| nflscrapR models (EPA/WP fitting lineage) | FULL SOURCE | R/nb | none | model construction | public-engines/nflscrapR-models |
| cover probability (nfelo author) | FULL SOURCE | Python | none | WP->cover layer | public-engines/nfl_cover_probability |
| margin-dependent Elo (MELO) | FULL SOURCE | Python | none | point_prob tables by margin mode | public-engines/melo-legacy/melo.py |
| SportsProps possession-MC | FULL SOURCE (modern, active) | Python | none | blend_market, qb ratings, backtests | public-engines/SportsProps |
| 538 QB model clone (nfeloqb) | FULL SOURCE | Python | — | 3,753 LOC | nfelo-engines/nfeloqb |
| SRS | formula public + nfelosrs port | Python | — | margin + SoS recursion | nfelo-engines/nfelosrs |
| SP+ (Connelly) | methodology articles only | — | — | **NOT CONFIRMED — and it is COLLEGE football, not NFL** | — |
| PFF grading | proprietary; articles only | — | — | **NOT CONFIRMED** | — |
| Massey-Peabody NFL | retired; masseyratings.com college open | — | — | NOT CONFIRMED (live NFL engine) | — |
| Action Network model | API open (web/v2 wired in SOURCE-REGISTRY); model private | — | — | endpoints only | nfl-farm notes/SOURCE-REGISTRY.md |
| Pinnacle | no public API; fixtures endpoint wired (HTML/JSON) | — | — | — | SOURCE-REGISTRY |
| NGS tracking metrics | RE'd previously (payload taxonomy + fitted cp model) | Python | — | see competitor-intel references/nfl-ngs-reverse-engineering.md | .hermes/competitor-intel |

## GSE build-priority (ingest into reasoning engine)
1. **538 Elo core** (verbatim, MIT) — seed rating spine + reversion mechanics
2. **nfelo offseason priors + market regression** — the "beats Vegas" calibration layer (their own SE bookkeeping shows how they measure it)
3. **nflfastR EPA/WP calculators** — feature layer (already have nflverse data)
4. **nfl4th decision composition** — situational EV template
5. **cover-probability layer** — spread-side inference on top of WP
6. **SportsProps blend_market/backtest pattern** — market-blend + backtest discipline matching GSE falsifier workflow

## Tested-and-killed (do not re-ingest as edges)
- Steam/line-movement anticipation: KILLED cycle26 (r=+0.005 vs realized−open, n=193)

## TIER-2 SWEEP (2026-10-24, 28 domains) — scouting/betting tools
| verdict | domains |
|---|---|
| ENGINE SURFACE | sportsline.com /optimizer-api (health 200, Python gateway) |
| LIVE RESEARCH | advancednflstats.com (Burke EPA/WP/4th-down originals + Tableau) |
| OPEN HTML | spotrac.com (contracts), 4for4, pickswise, outlier, juicereel, blogabet, trademate, bookiebeats |
| AUTH-GATED | unabated tools.*, fantasypoints (Firestore), props.cash, oddsjam (paid API) |
| WALL | oddsjam 403 (jina works), reelanalytics 403, kffl 402 |
| LEGACY/DEAD | sportsinsights (legacy WP), advancedfootballanalytics.com (500 — use advancednflstats.com), delphlyx/athlogic/wynr/kneeldown/sisdata (000) |
| SOCCER, not NFL | impect.com, scoutium.com (paste mislabels) |
Dossier: dossiers/scouting-betting-tier-2.json. Queue updated: sportsline JS-bundle route discovery (P2), Burke archive ingest (P3).

### Bundle-RE addendum (cycle 29c)
sportsline optimizer-api LIVE but session-gated (isPremium/subscription flags found); props.cash api live Express (props-dot-cash GCP project); betstamp/outlier/4for4/unabated/pickswise/bookiebeats: no static API surface. Headless passes queued P4-P6. Tier verdict: engines paywalled; free-side replication = BUILD on wired sources.

### Scouting-tier deep addendum (cycle 29d)
sumersports = NextAuth-gated tools (CMS-only HTML; no public engine surface); PFR = CF challenge -> archive.org ladder (stathead still wired); reel jina insufficient (JS-only); sico.ai identity unresolved. CDP Chrome headless on :9222 operational for queued authed passes.

### AGGRESSIVE WAVE (cycle 29e, 2026-10-24)
- PFF backend identified: Elixir/Phoenix 'MerlinWeb'; public /api/* namespace (teams 200; ticker 500 leaks internal schedule state: week 7 / season 2026 / fantasy_week); Clerk auth; isSubscribed flag
- SportsLine optimizer-api routes session-gated; Props.Cash Express live; OddsJam token-gated behind CF
- 115 chunks scanned, 0 public source maps; headless CDP captures operational (Chrome 155 @ :9222)
- Identity-gated bucket (needs 1 real email, 30s): TheOddsAPI free key, SumerSports free account, FTN account

### REFERENCE TIER-3 (cycle 29f, 2026-10-24)
StatMuse LIVE (SSR ask pages; hidden JSON API); SR family SPLIT: BBRef/BR/HR OPEN vs PFR/FBref CF-walled (archive ladder); Sofascore hard-403 (headless queued); CBS/Yahoo/SI/FootballDB/Transfermarkt open HTML second-source; ESPN already wired; Kaggle token MISSING (~/.kaggle gone) — BDB raw layer needs re-provision. Dossier: reference-tier-3.json.

### DFS OPTIMIZER TIER (cycle 29g, 2026-10-24)
OSS: pydfs-lineup-optimizer 450★ MIT (full MILP engine: pluggable solvers, 15 rule classes, stacks, exposure, captain modes) + draftfast 300★ + southpaw 58★ (FD submission API) + coach (R) + evolve-dfs (GA) — ALL CLONED to extracted_data/dfs-engines/.
Commercial: 18 domains probed — ALL open HTML (no CF); entitlements on fantasypros/fantasylabs/rotogrinders/fantasylineups; 4 dead shells (dailyfantasycheatsheet/optimaldfs/kjpi/fantasycruncher); numberfire open (FanDuel Research).
Verdict: optimizer MATH is free (pydfs); commercial moat = projection/ownership feeds. GSE: ingest pydfs as construction layer + own projections.

### PROP-TOOL TIER (cycle 29h, 2026-10-24)
20 domains: 1 engine surface (PickFinder api-v2 Express live, routes lazy), 6 dead/mislabelled domains from paste (sprinklebet/thelines.co/linejudge/propshark/propsdata/statpick), rest = UX shells over commodity odds feeds + standard de-vig math. leansai.com parked (real = leans.ai). Tier moat = feeds + UX, zero proprietary math surfaced. Dossier: prop-tool-tier.json.

### LIVE-SCORE TIER (cycle 29i, 2026-10-24)
365Scores free live JSON feed CONFIRMED (5s TTL, multi-sport, unauth). FlashScore feed alive but token-signed; futbol24 + livescore CDN APIs exposed, routes need capture; fotmob legacy /api moved; sofascore headless queued. 4 paste domains dead (kiwiscore/dofulive/goalscore/arbitration). GSE live-layer feed secured.
