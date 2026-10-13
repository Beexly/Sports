# Site Surface Census — galaxysportsedge.com (2026-10-12)

**Scope:** every route in `apps/web/app/**` on the web-stack head
`motif/sgp-projections-surface-2026-10-12` (Hermes branch + SGP wiring branch +
projections-surface branch), verified against code and against the live site on
2026-10-12. Companion: `docs/ops/DEPLOY_PACK_2026-10-12.md`.

**Inventory:** 444 route files — **226 pages** + **218 API/text routes**.

**Status legend**

| Status | Meaning |
|---|---|
| LIVE-REAL | Serves real data today |
| GATED-EMPTY | Real data path wired; a founder gate or data condition keeps it honestly empty today |
| ILLUSTRATIVE | Sample/fictional data by design, labeled as such |
| FENCED | Doctrine-internal surface; 404 to the public unless a founder opt-in flag opens it |
| FOUNDATION | Public shell with computed state; live dimensions render "not measured" until feeds/DB connect |
| STATIC | Content/marketing only; no engine data by design |
| INTERNAL | Auth-gated operator surface (admin/cockpit/dashboard) — not a customer surface |
| NOT-DEPLOYED | Exists on the branch stack; not in production yet |

**Live-site spot checks (2026-10-12, fetched, not guessed):** home renders with
board counts "temporarily unavailable" and settled sample n=0 (gated-empty);
`/board` renders its DB_UNREACHABLE honest-empty state ("Data store did not
respond", model v5.3.0, all counts 0); `/picks` renders the
temporarily-unavailable state; `/fantasy/dfs` runs fully on the labeled
fictional sample slate; `/stats` renders the StatKing foundation ("Snapshot
data: fixture-backed, not a live feed"; DB-backed dimensions "not measured");
`/players` returns the 404 fence page (PLAYERS_PUBLIC off); `/projections`
returns 404 (not deployed).

---

## 1. Customer decision surfaces

| Route | Serves today | Data source | Gates / flags | Serves once wired | Exact remaining step |
|---|---|---|---|---|---|
| `/` (home) | GATED-EMPTY — hero + pass-reason doctrine live; board counts unavailable, settled sample dark | `loadBoardState` + `loadPublicCalibrationReport` (Neon via Prisma) | Same as `/board` | Live counts, ticker of published/held picks, calibration summary | Migration reconciliation (DB reachable) + `LIVE_BOARD=true`; calibration needs settled canonical picks |
| `/board` | GATED-EMPTY — classifier renders DB_UNREACHABLE honest-empty today | Neon: `gateDecision`, `pick`, `game` via `lib/board/state.ts`; passes via `lib/board/passes.ts` | `LIVE_BOARD` (exact `"true"`), state classifier (`HONEST_EMPTY_LIVE_BOARD_OFF` etc.) | Every scored game: published, passed (with reasons), scoring-now | Reconciliation + `LIVE_BOARD=true` + ingestion crons producing fresh rows |
| `/board/gate` | GATED-EMPTY — gate-slate view | `lib/board/load-gate-slate.ts` | `LIVE_BOARD_GATE_SLATE=1` (explicit; `0`/`false` never open it) | The gate's own slate with dual-asOf + calibration + quote checks | Set `LIVE_BOARD_GATE_SLATE=1` with `LIVE_BOARD` |
| `/live` | STATIC alias — redirects to `/board` | — | Inherits `/board` | Same as `/board` | None (by design) |
| `/slate`, `/slate/[sport]` | GATED-EMPTY — board-state driven slate builder | `loadBoardState` + `lib/slate/slate.ts`, `@sports/data-ingestion` sports list | Same as `/board` | Per-sport slate from live board state | Same as `/board` |
| `/games/[gameId]` | GATED-EMPTY | `loadBoardState` + `lib/games/game-detail.ts` (Neon) | Same as `/board` | Full game detail from live rows | Same as `/board` |
| `/room/[gameId]` | GATED-EMPTY — per-game room incl. model-court API (`/api/room/[gameId]/model-court`) | Board/game loaders (Neon) | Same as `/board` | Live game room | Same as `/board` |
| `/picks` | GATED-EMPTY — dark until readiness gates pass (live: temporarily-unavailable state) | `/api/picks` + `/api/picks/daily-slate` route handlers called server-side; Neon picks; readiness via `getReadinessGates()` in `@sports/prediction-engine`; adverse-edge suppression (conjunction gate, `expectedClv < 0`) display-side | `PUBLIC_PICKS_ENABLED` (+ `PUBLIC_PICKS`), readiness gates, FreshnessGate | Published picks with line, timing, risk, factor trail by tier | Reconciliation + canonical picks exist + `PUBLIC_PICKS_ENABLED=true` + RVC clearance per doctrine |
| `/founder-picks` | GATED-EMPTY | `/api/founder-picks` + `/api/admin/founder-picks` (Neon) | Founder-pick publication path | Owner's calls on the same honest record | Same data path as `/picks` |
| `/projections` | **NOT-DEPLOYED** — 404 in production; built on `motif/sgp-projections-surface-2026-10-12` | Branch: bundled snapshot of `outbox/sgp_projections_latest.json` behind an allowlist loader (`lib/projections/sgp-projections.ts`); loader fails closed on any `is_pick`/`is_edge_claim` not exactly `false`; stale after kickoff / 72h | Fail-closed artifact stamps (`label: DIAGNOSTIC`, `is_pick: false`, `is_edge_claim: false`, `rvc_cleared: false`) | SGP stack projections as percentages only — no odds format, no player names, "Projection only. Not a pick and not a recommendation." on every card | Merge the stack, then swap loader source from bundled snapshot to runner → Neon → FreshnessGate read; add to nav + sitemap; deploy |
| `/api/projections` | LIVE-REAL (premium-gated) — player season projections with backtest error carried in the response | Neon: `db.playerGameStat`, `db.player` via `lib/projections/player-projections.ts` + `@sports/prediction-engine`; premium entitlement + rate limit | Premium API gate | Same, against current-season data | None for the endpoint itself; data freshness rides the player-stats ingestion crons |
| `/today` | ILLUSTRATIVE (labeled) — mission-control briefing; sample cards carry "Sample ·" eyebrows | `lib/cockpit/mission-control.ts` `buildBriefing()` (DEMO_WIRE content flagged `sample`) | Sample labeling enforced in the builder | Briefing from live engine state | Wire `buildBriefing` to live board/picks state instead of DEMO_WIRE |
| `/edge-index`, `/embed/edge-index/[gameId]` | GATED-EMPTY — public Edge Index + embeddable widget | Board/pick loaders (Neon) | Same pick-publication gates | Live index per game | Same as `/picks` |
| `/brief` | GATED-EMPTY | `/api/brief` + cockpit brief lib (Neon) | Auth + publication gates | Daily brief from live state | Same data path as `/board` |

## 2. Proof & record surfaces (the doctrine keeps these — they publish picks and outcomes)

| Route | Serves today | Data source | Gates / flags | Remaining step |
|---|---|---|---|---|
| `/performance`, `/performance/losses`, `/performance/losses/[id]` | GATED-EMPTY — record stays dark until eligible | Neon picks/settlements; `lib/performance/public-performance-policy.ts` | `PERFORMANCE_STATS_ENABLED` (jarvis guidance: hold off until the settled-canonical-pick floor is met) | Settled canonical picks reach the floor → set `PERFORMANCE_STATS_ENABLED=true` |
| `/clv` | GATED-EMPTY — 503 until `canExposePerformanceStats` | Neon CLV rows | Readiness gates | Same as `/performance` |
| `/ledger`, `/glass-ledger` | GATED-EMPTY — founder-gated empty-but-honest view | `lib/ledger/ledger-view.ts` (Neon) | `PUBLISH_LEDGER` (literal `"true"`) | Set `PUBLISH_LEDGER=true` once the ledger has canonical rows |
| `/kill-ledger` | STATIC/REAL — append-only kill record display | Repo/ledger data | — | None |
| `/proof`, `/verify`, `/verify/slate/opening`, `/how-to-verify-a-record`, `/accountability`, `/bookgrade`, `/calibration`, `/calibration/market` | GATED-EMPTY / STATIC mix — verification UX live; calibration report dark until settled sample exists | `/api/proof/*`, `/api/receipts/*`, `loadPublicCalibrationReport` (Neon) | Readiness/eligibility gates | Settled canonical picks; receipts chain already implemented |
| `/sealed` | STATIC — sealed-record explainer | — | — | None |

## 3. Fantasy surfaces (19 pages) — one flag from real

All fantasy pages are `force-dynamic` and read their player pool through
`lib/integrations/projections-server.ts` / `resolveToolPoolAsync`. Until
`PROJECTIONS_PROVIDER` is set they run on the **illustrative pool** (fictional
players, labeled). Setting **`PROJECTIONS_PROVIDER=graded`** switches every one
of them to the in-repo process-grade provider (`lib/integrations/graded-pool.ts`)
— real players, real engine projections, no code change.

| Route group | Pages | Serves today | Once `PROJECTIONS_PROVIDER=graded` |
|---|---|---|---|
| `/fantasy` + studio/autopilot/baseline/bestball/connect/draft/gm-ledger/league-twin/nba/scheme/showdown/touchdowns | 13 | ILLUSTRATIVE pool | Real-player tools on graded projections |
| `/fantasy/lineup`, `/fantasy/waivers`, `/fantasy/trade` | 3 | ILLUSTRATIVE pool | Lineup/waiver/trade recommendations on real players |
| `/fantasy/props` | 1 | ILLUSTRATIVE pool | Real props surface (props pricing itself is the Python engine + Pinnacle feed, landed today on motif branches) |
| `/optimizer` | 1 | ILLUSTRATIVE pool via `resolveToolPoolAsync` | Real optimizer |
| `/fantasy/dfs` | 1 | ILLUSTRATIVE — labeled fictional sample slate (36 players), full optimizer math live; DK CSV import works today | Real slate when a live DFS slate provider is registered server-side (`registerDfsSlateProvider` in `lib/integrations/dfs.ts`; no env-only flip — a code hook, being wired by the DFS lane) plus the graded projections pool |

## 4. Players & stats — fenced or foundation BY DOCTRINE (do not "fix" by opening)

| Route group | Count | Serves today | Why / flag |
|---|---|---|---|
| `/players` + 8 subpages (combine, dfs, injuries, market, opportunity, qbr, snaps, trenches) | 9 | FENCED — 404 publicly (verified live) | `PLAYERS_PUBLIC` opt-in, default off — metric-explainer tables are internal under the public/private surface doctrine |
| `/stats` + 25 subpages (StatKing: player/teams/scheme/scouting/media×7, proof, watchlist…) | 26 | FOUNDATION — public shell, fixture-backed snapshot data, DB dimensions "not measured"; subpages ride the StatKing data layer | `/stats` has its own opt-in (`STATS_PUBLIC`) per the surface-gate registry; foundation until rights + live feeds clear |
| `/methodology` | 1 | FENCED | `METHODOLOGY_PUBLIC` — factor list + engine stack stay internal |
| `/nflverse` | 1 | FENCED | `NFLVERSE_PUBLIC` — raw player-week rows internal |
| `/parlay-mri` | 1 | FENCED | `PARLAY_MRI_PUBLIC` — per-leg risk/EV internal |
| `/intelligence/*` pages | — | `/intelligence/metrics` FENCED (`METRICS_PUBLIC`); `/intelligence/reconstruction` **PERMANENTLY DARK** (no flag exists; NGS doctrine) | — |
| `/data`, `/engine`, `/observatory`, `/integrations`, `/human` | 5 | FOUNDATION/STATIC — readiness-sealed public exhibits | Live dimensions unmeasured until DB/feeds connect |

## 5. Tools & content (live today, no engine data needed)

| Group | Routes | Status |
|---|---|---|
| `/tools` + 6 calculators (clv, ev, line-movement, no-vig, odds-converter, parlay) | 7 | LIVE-REAL — pure client math |
| Content/marketing | `/about /academy /age-verify /blog(+[slug]) /case-studies/aws-governed-sports-intelligence /changelog /contact /faq /fable /house /how-we-make-money /integrity /journal(+[slug]) /launch /media-kit /newsletter(+[slug]) /partners /pledge /podcast(+[slug]) /press /pricing /privacy /promotions /responsible-play /terms /the-beat /vs/tout-services /waitlist` (~33) | STATIC |
| Sport shells | `/mlb`, `/nhl` | STATIC/FOUNDATION shells |
| Misc dynamic | `/bankroll /cipher /dashboard→(auth) /deck /gsn /trends /weather /watchlist(auth, Neon)` | Mixed: `/gsn` is board-backed transmission; `/weather` reads the game-weather API; `/watchlist` is LIVE-REAL for signed-in users (Neon) |

## 6. Internal operator surfaces (not customer surfaces)

| Group | Count | Notes |
|---|---|---|
| `/admin/**` (incl. 26 StatKing ops pages) | 40 | Auth-gated operator console; Neon-backed |
| `/cockpit/**` (jarvis, journal, tasks, content, market-twin…) | 36 | Auth-gated mission control; Neon-backed |
| `/dashboard`, `/auth/signin`, `/auth/error` | 3 | Account surfaces (NextAuth) |
| `/content-lab`, `/preview/[sport]/[slug]` | 2 | Internal preview tooling |

## 7. API routes (218)

| Family | Count | Role in the live flip |
|---|---|---|
| `/api/board/*`, `/api/picks/*` (incl. `[id]/audit`, `[id]/explain`, `daily-slate`) | 6 | The board/picks read path — Neon, readiness-gated, FreshnessGate |
| `/api/projections` | 1 | LIVE-REAL premium projections (see §1) |
| `/api/cron/*` | 39 | The engine's production runners (refresh-odds, board-fill, generate-signal-slate, settle-picks, engine-dfs-slate, props-slate-shadow, free-spine-health…) — `CRON_SECRET`-gated; these PRODUCE the rows the surfaces read. Several are the armed pollers — untouched |
| `/api/gse/v1/*` | 13 | API product surface (catalog, metrics, values, truth — truth topology FENCED via `TRUTH_TOPOLOGY_PUBLIC`) |
| `/api/v1/*` (openapi, probabilities, signals) | 3 | Public API v1 |
| `/api/intelligence/*` | 17 | Intelligence payloads (player-model, team-ratings, qb-forward…) — internal-grade data; consumed by internal surfaces |
| `/api/nflverse/*` | 8 | Player-data APIs (internal data layer) |
| `/api/ops/*` | 17 | Operator endpoints; `/api/ops/props-slate` default-off behind `PROPS_SLATE_ENABLED=1`; `/api/ops/public-surface-truth` is the poll that has been failing in CI on main |
| `/api/cockpit/*`, `/api/admin/*` | 33 | Operator APIs (auth) |
| `/api/calibration/*`, `/api/clv`, `/api/proof/*`, `/api/receipts/*`, `/api/verify/*` | 14 | Proof/calibration read path |
| `/api/dfs/salaries`, `/api/tools/lineup`, `/api/weather/game`, `/api/sleeper/*`, `/api/mlb/teams`, `/api/moneypuck/nhl`, `/api/watchlist/*`, `/api/human/*`, `/api/media/readiness`, `/api/legal/sources`, `/api/sources/catalog` (FENCED, `SOURCES_CATALOG_PUBLIC`), `/api/brief`, `/api/blog`, `/api/health*`, `/api/performance`, `/api/promotions`, `/api/pledge/*`, `/api/models/submission`, `/api/moderation/*`, `/api/push/*`, `/api/subscriptions/*` (Stripe), `/api/webhooks/stripe`, `/api/waitlist`, `/api/auth/[...nextauth]`, `/api/mobile/v1/*`, `/api/decision-genome`, `/api/room/[gameId]/model-court`, `/api/scoring/player-index`, `/api/trends/*`, `/api/dev/state`, `/api/cipher/verify`, `/api/age-verify`, `/api/airwave/*` | ~69 | Product plumbing — live where their data exists |
| Static text/icon routes (`ads.txt`, `ai.txt`, `llms.txt`, `humans.txt`, `security.txt`, `receipt-keys.json`, sitemap/feed routes, favicon/apple-touch-icon, `/go/[slug]`) | 12 | LIVE-REAL static |

## 8. Census counts by status (pages, 226)

| Status | Count | Composition |
|---|---|---|
| STATIC | ~38 | Content/marketing/shells |
| GATED-EMPTY | ~20 | Board family (6), picks family (3), proof/record (9), brief/edge-index (2) |
| ILLUSTRATIVE | ~21 | Fantasy (19) + `/today` + `/airwave` |
| FENCED | ~13 | Players (9) + methodology + nflverse + parlay-mri + intelligence/metrics |
| FOUNDATION | ~31 | Stats/StatKing (26) + data/engine/observatory/integrations/human (5) |
| INTERNAL | ~81 | Admin (40) + cockpit (36) + dashboard/auth (3) + content-lab/preview (2) |
| LIVE-REAL | ~8 | Tools (7) + watchlist (1) |
| NOT-DEPLOYED | 1 | `/projections` (branch only) |
| Aliases/redirects | ~13 | `/live` → `/board` and similar |

Counts are by primary status; several pages mix states per panel (home is
gated-empty in its data panels, static in its doctrine copy).

## 9. The one-paragraph truth

Nothing on the customer surface is faked. The decision surfaces are wired to
real Neon data and held dark by founder gates plus one infrastructure debt:
the production migration ledger. The fantasy wing is one env value
(`PROJECTIONS_PROVIDER=graded`) from real engine projections. The DFS
optimizer's math is live on a labeled fictional slate until the real-slate
provider is registered. `/projections` exists only on the branch stack. And
one hard blocker sits in front of all of it: three files (nav, sign-in page,
prediction-engine barrel) carry duplicated definitions that make every tree —
main included — fail the production build; the mechanical dedupe rides in
merge step 1 of the pack. The flip sequence lives in
`docs/ops/DEPLOY_PACK_2026-10-12.md`.
