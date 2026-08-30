# FINAL REALITY REPORT

Audit target: Galaxy Sports Edge canonical checkout  
Audit request time: 2026-06-04 21:10 CT  
Report written: current Codex session after read-only inspection and gate execution  
Scope note: this is a bounded deep audit of the canonical source tree, its docs, schema, routes, workers, git state, and local verification gates. It is not a claim that every word of all 253 Markdown files was manually read end to end.

No production database, production deployment, production secrets, commits, migrations, installs, pushes, or source edits were touched. The only intentional write is this report file.

## Where we actually are

This is the real source checkout, not the empty OneDrive control folder: `C:\Users\Garrett\Sports-canonical-2026-06-03` on branch `claude/edge-map-rebuild-2026-06-04` at HEAD `8e74089`. The new nflverse and trend-engine work is branch-only and unpushed; it is not on local `main`, while the current branch leads the deployed `dd4f88f` commit and local `main` trails it. The nflverse adapter and trend engine are real, pure, tested code, but they are not wired into live scoring, DB ingestion, pages, APIs, or schedules. The data layer cannot be proven populated because the configured local Postgres endpoint refuses connection, so every row count is `UNKNOWN`. The app builds, typechecks, lints, and brand gates pass, but the full test suite is red on local DB reachability and the build logs Prisma errors through fallback/no-data paths; many public and operator surfaces are still static, illustrative, or code-only shells rather than proven real-data products.

## Identity

| Field | Value |
|---|---|
| Absolute working directory | `C:\Users\Garrett\Sports-canonical-2026-06-03` |
| Git remote | `origin https://github.com/Beexly/Sports.git` |
| Current branch | `claude/edge-map-rebuild-2026-06-04` |
| HEAD | `8e74089817bde79ffb8976eff6da0e99dedb82b7` |
| HEAD subject | `nflverse: catalog-driven ingestion adapter + premium-data proof` |
| HEAD author date | `2026-06-04T21:05:14-05:00` |

Initial dirty-state note before this report was written: two untracked local Claude settings files existed:

- `UsersGarrett.claudesettings.json`
- `UsersGarrettSports-canonical-2026-06-03.claudesettings.json`

This report adds `_logs/REALITY.md`. No existing source file was changed.

## Git Truth

### Local branches

| Branch | Head | Date | Subject |
|---|---:|---|---|
| `claude/data-source-eval-2026-06-03` | `5440873` | `2026-06-04T12:57:12-05:00` | `wip(gse): safety commit - decision-engine modules + decision-OS surfaces` |
| `claude/edge-map-rebuild-2026-06-04` | `8e74089` | `2026-06-04T21:05:14-05:00` | `nflverse: catalog-driven ingestion adapter + premium-data proof` |
| `claude/prompt-caching-2026-06-03` | `93a1d67` | `2026-06-03T09:00:25-05:00` | `Enable opt-in prompt caching at static-system Claude call sites` |
| `main` | `833f46f` | `2026-06-02T22:36:44-05:00` | `Modernize deploy-readiness Stripe price-ID checks for tiered pricing` |

### Remote refs relevant to this audit

| Ref | Head | Date | Subject |
|---|---:|---|---|
| `origin/main` / `origin/HEAD` | `670f6b1` | `2026-06-04T20:18:04-05:00` | `Revert Edge Map to pre-tweak baseline...` |
| `origin/claude/edge-map-rebuild-2026-06-04` | `dd4f88f` | `2026-06-04T16:24:45-05:00` | `Add the Airwave Ledger - broadcast accountability (founder-gated)` |

### Current branch commits ahead of its origin branch

`claude/edge-map-rebuild-2026-06-04` is eight commits ahead of `origin/claude/edge-map-rebuild-2026-06-04`:

| Commit | Subject |
|---:|---|
| `8e74089` | `nflverse: catalog-driven ingestion adapter + premium-data proof` |
| `71a30a4` | `Analytics: trend-discovery engine + nflverse proof (local; not pushed)` |
| `670f6b1` | `Revert Edge Map to pre-tweak baseline...` |
| `b421143` | `Revert "Edge Map: near-monochrome instrument palette"` |
| `34587b9` | `Edge Map: near-monochrome instrument palette` |
| `63d9191` | `Edge Map: calmer + more real - depth fog, dimmer bloom & starfield` |
| `c3588c1` | `Edge Map: fix readability at zoom - attenuate bloom + legible labels` |
| `2431271` | `ci: run prisma migrate deploy in the production build` |

The expected unpushed work exists:

- Trend-engine commit: `71a30a4`
- nflverse-adapter commit: `8e74089`

### Is nflverse/trend work on `main`?

No. Local `main` is `833f46f`, and the new nflverse/trend commits are only on `claude/edge-map-rebuild-2026-06-04`.

### Local `main` vs deployed `dd4f88f`

User-provided deployed commit: `dd4f88f`.

- `main` is an ancestor of `dd4f88f`: yes.
- `dd4f88f` is an ancestor of `main`: no.
- Therefore local `main` trails the deployed commit `dd4f88f`.
- Current branch `claude/edge-map-rebuild-2026-06-04` leads `dd4f88f`.

## Content Inventory

Markdown inventory found by `rg --files -g "*.md"`:

| Area | Count |
|---|---:|
| All Markdown files | 253 |
| Root Markdown files | 36 |
| `docs/` Markdown files | 195 |
| `reports/` Markdown files | 13 |

Priority docs inspected and source-checked against code:

| Document | Reality |
|---|---|
| `CLAUDE.md` | Claims production-grade platform, real data ingestion, AI-assisted ranking, subscription paywalls, content generation, automated jobs, and hard rules against fake data. Some of this is code-backed; some is overstated. BullMQ/Redis is described, but no BullMQ queue implementation was found. |
| `AUTONOMOUS_OPERATING_SYSTEM.md` | More honest than most docs: labels verified/inferred/recommended, says agents draft only, media does not auto-publish, and current jobs are workers plus Vercel cron. |
| `BRAND_AND_DESIGN_SYSTEM.md` | Brand identity and visual/voice rules exist. Brand tests exist. No `lint:brand` script exists. |
| `docs/fantasy-os-vision.md` | Explicitly admits fantasy data is illustrative until a real source is connected. This matches code. |
| `docs/nflverse-data-catalog.md` | Present and mostly accurate about code-only status; inaccurate or premature where it references future `Player` / `PlayerGameStat` ingestion because those Prisma models do not exist. |
| `REPO_INTELLIGENCE_REPORT.md` | Accurately warns that tests against stub Prisma do not prove live DB behavior. |

## Data Layer

### Safe DB reachability

Only local/dev DB endpoints were considered safe to probe. Production was not touched.

| Env var | Status | Host class | Read-only query result |
|---|---|---|---|
| `DATABASE_URL` | present | local | `UNKNOWN - ECONNREFUSED` |
| `DIRECT_URL` | present | local | `UNKNOWN - ECONNREFUSED` |
| `POSTGRES_URL` | absent | n/a | `UNKNOWN` |
| `REDIS_URL` | present | local | not queried for row counts |

Local Postgres is configured as localhost but refused connection. Therefore every model row count below is `UNKNOWN`.

### Prisma models

Schema file: `packages/db/prisma/schema.prisma`

| Model | Populated? | Row count | Static code usage found | Notes |
|---|---|---:|---|---|
| `User` | `UNKNOWN` | `UNKNOWN` | queries 2 / mutations 1 | Local DB unreachable. |
| `Account` | `UNKNOWN` | `UNKNOWN` | queries 0 / mutations 0 | NextAuth adapter model. |
| `Session` | `UNKNOWN` | `UNKNOWN` | queries 0 / mutations 0 | NextAuth adapter model. |
| `VerificationToken` | `UNKNOWN` | `UNKNOWN` | queries 0 / mutations 0 | NextAuth adapter model. |
| `Subscription` | `UNKNOWN` | `UNKNOWN` | queries 5 / mutations 2 | Entitlements and Stripe paths use this. |
| `WebhookEvent` | `UNKNOWN` | `UNKNOWN` | queries 1 / mutations 1 | Stripe webhook idempotency. |
| `Sport` | `UNKNOWN` | `UNKNOWN` | queries 1 / mutations 2 | Seed/ingestion path. |
| `League` | `UNKNOWN` | `UNKNOWN` | queries 0 / mutations 1 | Seed/ingestion path. |
| `Team` | `UNKNOWN` | `UNKNOWN` | queries 0 / mutations 0 | Schema exists; no direct delegate use found. |
| `Game` | `UNKNOWN` | `UNKNOWN` | queries 7 / mutations 3 | Odds/slate/performance paths. |
| `OpeningLine` | `UNKNOWN` | `UNKNOWN` | queries 1 / mutations 0 | Market context path. |
| `TeamGameLog` | `UNKNOWN` | `UNKNOWN` | queries 0 / mutations 0 | Schema exists; no direct delegate use found. |
| `Odds` | `UNKNOWN` | `UNKNOWN` | queries 1 / mutations 1 | Odds refresh path. |
| `IngestionRun` | `UNKNOWN` | `UNKNOWN` | queries 4 / mutations 1 | Refresh/readiness paths. |
| `Pick` | `UNKNOWN` | `UNKNOWN` | queries 23 / mutations 4 | Core picks/performance/admin paths. |
| `GateDecision` | `UNKNOWN` | `UNKNOWN` | queries 4 / mutations 0 | Audit/explain paths. |
| `LossAutopsy` | `UNKNOWN` | `UNKNOWN` | queries 0 / mutations 1 | Admin loss draft path. |
| `SourceSnapshot` | `UNKNOWN` | `UNKNOWN` | queries 1 / mutations 1 | Provenance/source capture path. |
| `GameSignal` | `UNKNOWN` | `UNKNOWN` | queries 1 / mutations 0 | Signal display/analysis. |
| `PickSignalSnapshot` | `UNKNOWN` | `UNKNOWN` | queries 2 / mutations 4 | Pick memory/provenance path. |
| `BlogPost` | `UNKNOWN` | `UNKNOWN` | queries 5 / mutations 0 | Blog/API pages. |
| `Alert` | `UNKNOWN` | `UNKNOWN` | queries 0 / mutations 0 | Schema exists; no direct delegate use found. |
| `PerformanceSummary` | `UNKNOWN` | `UNKNOWN` | queries 1 / mutations 0 | Performance display. |
| `CockpitTask` | `UNKNOWN` | `UNKNOWN` | queries 11 / mutations 2 | Cockpit tasking. |
| `CockpitDecision` | `UNKNOWN` | `UNKNOWN` | queries 1 / mutations 1 | Cockpit history. |
| `CockpitMediaItem` | `UNKNOWN` | `UNKNOWN` | queries 2 / mutations 1 | Cockpit media queue. |
| `CreatorAsset` | `UNKNOWN` | `UNKNOWN` | queries 0 / mutations 3 | Studio/asset generation path. |
| `ModelJournalEntry` | `UNKNOWN` | `UNKNOWN` | queries 0 / mutations 4 | Journal path; build logs DB errors here. |
| `ClaudeApiCallRecord` | `UNKNOWN` | `UNKNOWN` | queries 1 / mutations 0 | API cost accounting. |
| `ClaudeApiBudget` | `UNKNOWN` | `UNKNOWN` | queries 0 / mutations 2 | API budget accounting. |
| `Promotion` | `UNKNOWN` | `UNKNOWN` | queries 4 / mutations 1 | Promotions/admin path. |
| `SourceCoverageReport` | `UNKNOWN` | `UNKNOWN` | queries 0 / mutations 0 | Schema exists; no direct delegate use found. |
| `DailyBrief` | `UNKNOWN` | `UNKNOWN` | queries 0 / mutations 1 | Brief generation storage. |
| `DailyBriefSection` | `UNKNOWN` | `UNKNOWN` | queries 0 / mutations 0 | Nested brief relation. |
| `DailyBriefItem` | `UNKNOWN` | `UNKNOWN` | queries 0 / mutations 0 | Nested brief relation. |
| `CalibrationProposal` | `UNKNOWN` | `UNKNOWN` | queries 1 / mutations 0 | Model freeze guardrail checks seed state. |
| `ContentDraft` | `UNKNOWN` | `UNKNOWN` | queries 0 / mutations 0 | Schema exists; direct delegate use not found in static scan. |
| `ContentSource` | `UNKNOWN` | `UNKNOWN` | queries 0 / mutations 0 | Schema exists; direct delegate use not found in static scan. |
| `ContentReview` | `UNKNOWN` | `UNKNOWN` | queries 0 / mutations 0 | Schema exists; direct delegate use not found in static scan. |

### Player / PlayerGameStat reality

No `Player` Prisma model exists. No `PlayerGameStat` Prisma model exists.

`docs/nflverse-data-catalog.md` references future ingestion into `Player` and `PlayerGameStat`, but that target is not implemented in the schema. The nflverse adapter currently writes nothing to any model.

## NFLverse + Trend Engine

### nflverse adapter

Source: `packages/data-ingestion/src/nflverse-source.ts`

The file explicitly states that it performs no writes and is not wired into the live pipeline. It exposes:

- `NFLVERSE_CATALOG`
- `NflverseDatasetKey`
- `nflverseUrl`
- `parseCsv`
- `fetchNflverseText`
- `fetchNflverse`

Dataset keys exposed in the source catalog:

| Key |
|---|
| `pbp` |
| `pbp_participation` |
| `player_stats_week` |
| `snap_counts` |
| `ngs` |
| `pfr_advstats` |
| `ftn_charting` |
| `depth_charts` |
| `injuries` |
| `rosters` |
| `espn_qbr_week` |
| `players` |
| `schedules` |
| `draft_picks` |
| `combine` |

Important limitation: `packages/data-ingestion/src/index.ts` does not export `nflverse-source.ts`, so the adapter exists in package source but is not part of the package's normal public export surface.

Targeted test result:

| Command | Result |
|---|---|
| `npm.cmd run test --workspace=@sports/data-ingestion -- src/nflverse-source.test.ts` | PASS: 1 file, 9 tests |

Full data-ingestion test result:

| Command | Result |
|---|---|
| `npm.cmd run test --workspace=@sports/data-ingestion` | PASS: 10 files, 78 tests |

### Trend engine

Source: `packages/prediction-engine/src/trend-discovery.ts`

The engine is real deterministic library code. It computes cohort trends by comparing cohort mean outcomes against the complement baseline, then reports:

- cohort size
- baseline size
- cohort mean
- baseline mean
- absolute delta
- relative delta
- Welch-style z score
- two-sided p value
- significance flag

Exports include:

- `twoSidedP`
- `welchCompare`
- `discoverCohortTrends`
- `significantTrends`
- `range`

The file explicitly states that wiring a discovered trend into live scoring is a separate founder-gated model-version step. Static source search found no live page, API, cron, or scoring pipeline consuming this engine today, other than package export and research scripts.

Targeted test result:

| Command | Result |
|---|---|
| `npm.cmd run test --workspace=@sports/prediction-engine -- src/__tests__/trend-discovery.test.ts` | PASS: 1 file, 7 tests |

Full prediction-engine test result:

| Command | Result |
|---|---|
| `npm.cmd run test --workspace=@sports/prediction-engine` | PASS: 28 files, 348 tests |

### `docs/nflverse-data-catalog.md`

Present. Mostly accurate about adapter capabilities and code-only status. Not fully accurate as a state-of-repo document because:

- it references future `Player` / `PlayerGameStat` ingestion targets that are absent from Prisma;
- it says a high-value subset of 25 families is cataloged, while the implemented source catalog exposes 15 dataset keys;
- analytic claims in the doc were not rerun in this audit.

## Surface Map

Classification vocabulary:

- `REAL`: real code hitting DB/external/provider data, but only proven end to end if local data was reachable.
- `STUB`: placeholder, illustrative, static shell, no-op, or fallback/demo path.
- `DEAD`: route/worker errors or is intentionally inert and exits without useful behavior.
- `UNKNOWN`: code path exists, but local DB/provider/runtime proof was not available.

Because the local DB refused connection, no DB-backed page is proven `REAL` with populated data in this audit. The honest classification for most DB-backed surfaces is `REAL-CODE / UNKNOWN-DATA`.

### Public and app pages

| Page or group | Status | Actual data source |
|---|---|---|
| `/` | `STUB/STATIC` | Marketing/static components plus build-time fallbacks; no real-data proof. |
| `/picks` | `REAL-CODE / UNKNOWN-DATA` | Calls pick/slate/data helpers backed by Prisma; sample-data banner exists for stub mode. Local DB refused connection. |
| `/performance` | `REAL-CODE / UNKNOWN-DATA` | Prisma-backed performance/pick paths; build logged Prisma errors and fell through. |
| `/performance/losses` and `/performance/losses/[id]` | `REAL-CODE / UNKNOWN-DATA` | Prisma-backed loss/autopsy/pick paths. |
| `/dashboard` | `REAL-CODE / UNKNOWN-DATA` | Auth/entitlement and Prisma-backed user/subscription/pick context. Local DB not reachable. |
| `/admin/*` | `REAL-CODE / UNKNOWN-DATA` | Founder/admin Prisma and provider actions. Not proven with data. |
| `/blog` and `/blog/[slug]` | `REAL-CODE / UNKNOWN-DATA` | `BlogPost` model queries where data exists; row count unknown. |
| `/brief` | `STUB/UNKNOWN` | Daily-brief storage model exists, but visible page/API behavior is not proven with real data. |
| `/ledger` | `STUB/STATIC` | Accountability/ledger presentation; no proven real-data ingestion. |
| `/promotions` | `REAL-CODE / UNKNOWN-DATA` | `Promotion` model paths exist; row count unknown. |
| `/fantasy/*` | `STUB` | Code explicitly uses illustrative player/projection pools until a provider is connected. |
| `/cockpit/*` | `MIXED` | Some DB-backed operator pages exist; several pages are shell/static/no-op. No real row counts or runtime proof. |
| `/intelligence` | `STUB` | Imports `ILLUSTRATIVE_BRIEF`; static intelligence presentation, not live intelligence. |
| `/observatory` | `STUB/UNKNOWN` | Dynamic shell with preview/static data and DB-backed twin attempts; build logged DB errors. Not proven real. |
| `/airwave` and `/cockpit/airwave` | `STUB/STATIC` | Founder-gated narrative/accountability surfaces; no proven live data path. |
| `/about`, `/academy`, `/board`, `/changelog`, `/cipher`, `/faq`, `/gsn`, `/integrations`, `/journal`, `/methodology`, `/parlay-mri`, `/pricing`, `/press`, `/privacy`, `/responsible-play`, `/room/[gameId]`, `/terms`, `/the-beat`, `/today`, `/track`, `/vault`, `/vs/tout-services` | `STUB/STATIC` | Mostly static/product/brand/marketing/explanatory pages; not real-data products in this audit. |

### Critical shell callouts

| Surface | Reality |
|---|---|
| `/fantasy/*` | Shell/illustrative. The code says fantasy projections and players are fictional/illustrative until a real provider is connected. |
| `/cockpit/*` | Mixed shell and DB-backed operator code. It is not a single proven live operations console because row counts are unknown, local DB is unreachable, and several cockpit pages are static/no-op/process-local. |
| `/intelligence` | Shell. Uses an illustrative brief, not live intelligence. |
| `/observatory` | Shell/unknown. Has dynamic code, but preview/static data and DB fallback behavior mean it is not proven real. |

### API routes

| Route or group | Status | Actual data source |
|---|---|---|
| `/api/auth/[...nextauth]` | `REAL-CODE / UNKNOWN-DATA` | NextAuth, Google provider, Prisma adapter. Dev fake admin can synthesize admin identity. |
| `/api/picks` | `REAL-CODE / UNKNOWN-DATA` | Prisma picks/games/gate decisions/signals plus tier gating. Sample/stub behavior exists. |
| `/api/picks/[id]/audit` | `REAL-CODE / UNKNOWN-DATA` | Prisma pick/provenance/audit records. |
| `/api/picks/[id]/explain` | `REAL-CODE / UNKNOWN-DATA` | Pick explanation/provenance paths; DB not reachable. |
| `/api/picks/daily-slate` | `REAL-CODE / UNKNOWN-DATA` | Prisma slate/pick/game data. |
| `/api/performance` | `REAL-CODE / UNKNOWN-DATA` | Prisma performance/pick summaries. |
| `/api/blog` | `REAL-CODE / UNKNOWN-DATA` | `BlogPost` Prisma model. |
| `/api/promotions` | `REAL-CODE / UNKNOWN-DATA` | `Promotion` Prisma model. |
| `/api/admin/losses/[pickId]/draft` | `REAL-CODE / UNKNOWN-DATA` | Prisma plus Claude/API draft path. Provider execution not verified. |
| `/api/admin/promotions` | `REAL-CODE / UNKNOWN-DATA` | Prisma promotion admin path. |
| `/api/admin/trigger-refresh` | `REAL-CODE / UNKNOWN-DATA` | Admin-triggered refresh logic; provider/DB proof absent. |
| `/api/cron/refresh-odds` | `REAL-CODE / UNKNOWN-RUN` | Vercel/GitHub cron endpoint; requires `CRON_SECRET`, `THE_ODDS_API_KEY`, DB. No evidence from repo that it has run. |
| `/api/cron/settle-picks` | `REAL-CODE / UNKNOWN-RUN` | Calls settlement path; requires `CRON_SECRET`, `THE_ODDS_API_KEY`, DB. No run evidence. |
| `/api/cron/jarvis-snapshot` | `STUB` | Explicit no-op placeholder. |
| `/api/health` | `REAL-CODE / UNKNOWN-DATA` | Health/readiness checks; local DB was not reachable. |
| `/api/health/synthetic-monitoring` | `STUB/UNKNOWN` | Synthetic monitoring surface; no proof of live external monitor execution. |
| `/api/subscriptions/checkout` | `REAL-CODE / UNKNOWN-DATA` | Stripe Checkout path; env names present, provider call not executed. |
| `/api/subscriptions/portal` | `REAL-CODE / UNKNOWN-DATA` | Stripe billing portal path; provider call not executed. |
| `/api/webhooks/stripe` | `REAL-CODE / UNKNOWN-RUN` | Stripe webhook handler; no delivery/run evidence. |
| `/api/cockpit/tasks*` | `REAL-CODE / UNKNOWN-DATA` | `CockpitTask` Prisma model. |
| `/api/cockpit/content*` | `REAL-CODE / UNKNOWN-DATA` | Content draft/review paths; DB not reachable. |
| `/api/cockpit/history/export` | `REAL-CODE / UNKNOWN-DATA` | Cockpit history/decision export path. |
| `/api/cockpit/journal*` | `REAL-CODE / UNKNOWN-DATA` | Model journal and week-data paths; build logged DB errors for journal. |
| `/api/cockpit/market-twin` | `REAL-CODE / UNKNOWN-DATA` | Market twin/slate/Prisma path; not proven with data. |
| `/api/cockpit/readiness` | `REAL-CODE / UNKNOWN-DATA` | Readiness gates. |
| `/api/cockpit/studio/generate` | `REAL-CODE / UNKNOWN-PROVIDER` | Creator asset generation path. Provider execution not verified. |
| `/api/cockpit/api-costs/override` | `REAL-CODE / UNKNOWN-DATA` | Claude API budget/cost models. |
| `/api/cockpit/agents` | `REAL-CODE / UNKNOWN-DATA` | Operator agent state/tasks; DB proof absent. |
| `/api/cockpit/bot-outbox/preview` | `STUB/UNKNOWN` | Preview-style outbox path; no publish/send proof. |
| `/api/cockpit/jarvis` and `/api/cockpit/jarvis/trend` | `STUB/PROCESS-LOCAL` | Trend/Jarvis buffers are not wired to durable scheduled data. |
| `/api/cockpit/operator-registry` | `STUB/STATIC` | Registry/config-style operator surface. |
| `/api/brief` and `/api/cockpit/brief` | `STUB/UNKNOWN` | Brief shell/storage exists, live generation not proven. |
| `/api/board/passes`, `/api/board/state`, `/api/calibration`, `/api/cipher/verify`, `/api/dev/state`, `/api/room/[gameId]/model-court` | `STUB/UNKNOWN` | Static, dev, calibration, room, or operator/game surfaces without proven real-data execution. |

## Jobs, Gates, Config

### Scheduled jobs and workers

| Job/worker | Scheduled? | What it does | Evidence it has run |
|---|---|---|---|
| `vercel.json` `/api/cron/refresh-odds?sport=americanfootball_nfl` | yes, daily 05:00 UTC | Refresh NFL odds. | `UNKNOWN` |
| `vercel.json` `/api/cron/refresh-odds?sport=americanfootball_ncaaf` | yes, daily 06:00 UTC | Refresh NCAAF odds. | `UNKNOWN` |
| `vercel.json` `/api/cron/refresh-odds?sport=basketball_nba` | yes, daily 07:00 UTC | Refresh NBA odds. | `UNKNOWN` |
| `vercel.json` `/api/cron/refresh-odds?sport=basketball_ncaab` | yes, daily 08:00 UTC | Refresh NCAAB odds. | `UNKNOWN` |
| `vercel.json` `/api/cron/refresh-odds?sport=baseball_mlb` | yes, daily 09:00 UTC | Refresh MLB odds. | `UNKNOWN` |
| `vercel.json` `/api/cron/refresh-odds?sport=icehockey_nhl` | yes, daily 10:00 UTC | Refresh NHL odds. | `UNKNOWN` |
| `vercel.json` `/api/cron/refresh-odds?sport=soccer_usa_mls` | yes, daily 11:00 UTC | Refresh MLS odds. | `UNKNOWN` |
| `vercel.json` `/api/cron/settle-picks` | yes, daily 12:00 UTC | Settles picks. | `UNKNOWN` |
| `vercel.json` `/api/cron/jarvis-snapshot` | yes, daily 13:00 UTC | Stub/no-op response. | `UNKNOWN`; code is no-op. |
| `.github/workflows/external-cron.yml` refresh | yes, every 30 minutes | Calls refresh endpoint using GitHub Actions secrets. | `UNKNOWN`; workflow history not queried. |
| `.github/workflows/external-cron.yml` settle | yes, hourly | Calls settle endpoint using GitHub Actions secrets. | `UNKNOWN`; workflow history not queried. |
| `workers/data-refresh/src/index.ts` | worker script exists | Long-running refresh/settle loop across supported sports. | `UNKNOWN` |
| `workers/pick-generation/src/index.ts` | script exists | Reserved worker; exits immediately. | none; code is inert. |
| `workers/content-publishing/src/index.ts` | script exists | Hard-disabled draft-only worker. | none; code is intentionally no-op unless explicitly enabled. |

BullMQ reality: docs mention BullMQ/Redis, but static code search found no `BullMQ`, `new Queue`, or actual queue implementation. Redis dependency/config exists; queue runtime does not.

### Verification gates run

| Gate | Result |
|---|---|
| `npm.cmd run test --workspace=@sports/data-ingestion -- src/nflverse-source.test.ts` | PASS: 1 file, 9 tests |
| `npm.cmd run test --workspace=@sports/prediction-engine -- src/__tests__/trend-discovery.test.ts` | PASS: 1 file, 7 tests |
| `npm.cmd run test --workspace=@sports/data-ingestion` | PASS: 10 files, 78 tests |
| `npm.cmd run test --workspace=@sports/prediction-engine` | PASS: 28 files, 348 tests |
| `npm.cmd run test --workspace=@sports/types` | PASS: 1 file, 28 tests |
| `npm.cmd run typecheck` | PASS across all workspaces with typecheck scripts |
| `npm.cmd run lint` | PASS |
| `npm.cmd run test:brand-safety` | PASS: 19 files, 1078 tests |
| `node scripts\guardrails\trust-gate.mjs` | PASS: scanned 435 files |
| `node scripts\guardrails\draft-only.mjs` | PASS: scanned 455 files |
| `node scripts\guardrails\model-freeze.mjs` | PASS |
| `npm.cmd run build` | PASS exit code, but logged Prisma DB errors during static generation |
| `npm.cmd test` | FAIL |

Full root test reality:

- The root test suite is red.
- JSON summary from the full run showed web tests with 479 suites total, 473 passed, 6 failed; 2498 tests total, 2494 passed, 4 failed.
- A targeted rerun of the repeatable failures showed `__tests__/correlation-load-settled-picks.test.ts` and `__tests__/entitlements-dev-admin.test.ts` fail because Prisma cannot reach `localhost:5433`.
- `__tests__/guardrails.test.ts` failed in the first full run but passed in isolation, so that initial guardrail failure was not reproducible in the targeted rerun.

Build reality:

- `npm.cmd run build` exits successfully.
- Next.js compiled and generated static pages.
- During static generation, Prisma logged local DB connection failures for paths including raw queries, model journal entries, pick counts, and ingestion-run reads.
- Therefore "it builds" does not prove "it works with live data."

### Config and integrations

Env var names present in `.env.local`:

- `DATABASE_URL`
- `DIRECT_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `DEV_ADMIN_EMAIL`
- `DEV_FAKE_ADMIN`
- `THE_ODDS_API_KEY`
- `ANTHROPIC_API_KEY`
- `ODDS_API_IO_KEY`
- `API_SPORTS_KEY`
- `CONTENT_FREE_LANE_ENABLED`
- `CEREBRAS_API_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `STRIPE_PRO_MONTHLY_PRICE_ID`
- `STRIPE_PRO_ANNUAL_PRICE_ID`
- `STRIPE_ELITE_MONTHLY_PRICE_ID`
- `STRIPE_ELITE_ANNUAL_PRICE_ID`
- `REDIS_URL`
- `CRON_SECRET`
- `TEAM_RATES_AVAILABLE`
- `NODE_ENV`
- `NEXT_PUBLIC_APP_URL`

No secret values are included in this report.

Config facts:

- `vercel.json` build command runs `npm run db:generate`, `npm run db:migrate`, then web build.
- That means deployment build is configured to run Prisma migrations.
- `lint:brand` does not exist as a package script.
- Closest brand gate is `test:brand-safety`, and it passes.
- Auth is NextAuth + Google + Prisma adapter, with `DEV_FAKE_ADMIN=true` able to synthesize an admin session in development.
- Middleware protects `/dashboard` and `/admin` by cookie presence. API routes are excluded from middleware and rely on route-level checks where implemented.

## What Works End-to-End With REAL Data Today

Nothing was proven end-to-end with real populated data in this audit.

What is real code but not proven with data:

- Odds refresh endpoint and data-refresh worker logic exist.
- Pick, performance, promotion, blog, cockpit task, and subscription paths exist.
- Stripe checkout, portal, and webhook code exists.
- NextAuth/Google/Prisma auth code exists.
- nflverse adapter and trend engine are tested pure/library code.

What is proven without DB/provider dependence:

- Typecheck passes.
- Lint passes.
- Brand safety tests pass.
- Guardrail scripts pass.
- Build exits successfully despite DB errors.
- Data-ingestion and prediction-engine unit tests pass.

## Biggest Gaps Between What It Looks Like And What It Does

1. The repo presents a production-grade real-data product, but this audit could not prove any populated local data because Postgres refused connection.
2. The new nflverse adapter and trend engine are real code, but they are not wired into ingestion, storage, scoring, pages, APIs, or cron.
3. Docs mention future `Player` / `PlayerGameStat` nflverse ingestion, but those Prisma models do not exist.
4. Many public surfaces that look productized are static, illustrative, or shell experiences, especially `/fantasy/*`, `/intelligence`, `/observatory`, and portions of `/cockpit/*`.
5. The root test suite is failing even though isolated package tests, lint, typecheck, brand gates, and build pass.
6. The build passes while logging Prisma connection failures, so build success is not runtime/data success.
7. Cron schedules exist, but repo-local evidence that they have ever run is `UNKNOWN`.
8. `jarvis-snapshot` cron is scheduled but explicitly a no-op.
9. Pick-generation and content-publishing workers exist but are intentionally inert or disabled.
10. Docs mention BullMQ/Redis queue architecture, but no actual BullMQ queue implementation was found.
11. `lint:brand` is requested by audit language but no such script exists; only `test:brand-safety` exists.
12. Current branch contains the real new work and leads deployed `dd4f88f`, but the work is unpushed and not on local `main`.

## Bottom Line

The canonical repo is not empty and not fake: it contains substantial real Next.js, Prisma, ingestion, prediction, auth, Stripe, cron, worker, and guardrail code. The specific new nflverse/trend work is real and tested at the unit/package level. But the product is not proven live end-to-end from this checkout because the local DB is unreachable, row counts are unknown, the full test suite is red, and the newest analytics/data work is standalone branch code rather than operationally wired platform behavior.
