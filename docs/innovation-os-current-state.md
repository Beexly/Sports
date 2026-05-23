# Innovation OS — Current State of the Codebase

> Snapshot of where the codebase actually is as of 2026-05-23, the day
> the master action plan was persisted. Future Claude / Codex sessions
> read this on rehydration to skip "what's already here?" archaeology.
>
> This document is descriptive, not prescriptive. The master plan
> describes the destination; this file describes the starting point.

## TL;DR

The platform is past initial scaffolding and into a mature Phase 2/3
shape relative to the master plan, but the homepage and positioning
copy still reflect the **pre-reposition** templated chassis ("Mission
Control," AI-positioning language). Phase 1 of the master plan exists
specifically to ship that reposition.

What's live:

- A real deterministic prediction engine with 32 Prisma models, 110
  test files, ingestion pipelines, gated picks API, Stripe
  subscriptions, NextAuth, an operator cockpit, blog auto-generation,
  trust-claims scanner, promotions compliance guards, and a working
  brand-safety test suite (497 assertions across 19 files).
- Brand surfaces honor the Galaxy Sports Edge product brand; corporate
  parent (Galaxy Sports Network LLC) was wired in 2026-05-23 (see
  `docs/corporate-structure.md`).

What's missing relative to the master plan:

- The "We're not AI. We're math you can read." positioning is not yet
  on the homepage.
- The new Phase 1 surfaces (Live State Strip, Gate Cam, Public Ledger
  preview, Live Calibration, Pass List, The Stack rewrite) are not
  yet built.
- The Intelligence Graph module (`apps/web/lib/intelligence-graph/`)
  does not exist.
- Galaxy Studio (`/cockpit/studio`) does not exist.
- Game Intelligence Rooms (`/room/[gameId]`) do not exist.
- `prisma generate` has not been run in the current container — many
  typecheck errors trace to this.

## Repository layout

```
apps/web/                     Next.js 14 app router; the entire
                              user-facing surface
packages/db/                  Prisma schema + generated client +
                              seed
packages/types/               Shared TypeScript types (Pick shapes,
                              etc.)
packages/data-ingestion/      The Odds API + balldontlie +
                              SportsDataIO + TheSportsDB adapters
packages/prediction-engine/   Deterministic scoring engine — the
                              "math you can read"
packages/ingestion-pipeline/  Ingestion orchestration layer
workers/data-refresh/         BullMQ worker — pulls odds on cadence
workers/pick-generation/      BullMQ worker — runs the scoring
                              engine
workers/content-publishing/   BullMQ worker — calls Claude API for
                              blog drafts (the ONLY production use
                              of an LLM)
docs/                         Architecture, runbooks, brand,
                              email sequences, research, ADRs
scripts/                      Guardrails (trust gate, model freeze,
                              draft-only), smoke tests, jarvis-diff
.github/workflows/            CI/CD
```

## Data model snapshot (Prisma)

32 models. The ones that matter for the master plan:

**Auth / billing:** `User`, `Account`, `Session`,
`VerificationToken`, `Subscription`, `WebhookEvent`.

**Sports ontology:** `Sport`, `League`, `Team`, `Game`,
`OpeningLine`, `TeamGameLog`, `Odds`.

**Engine + ingestion:** `IngestionRun`, `SourceSnapshot`,
`GameSignal`, `Pick`, `PickSignalSnapshot`. These are the source of
truth for the deterministic engine. `Pick` has `isBootstrap` and
`eligibleForLearning` flags powering the bootstrap-canonical gate
that the master plan calls out repeatedly.

**Content + ops:** `BlogPost`, `Alert`, `PerformanceSummary`,
`DailyBrief`, `DailyBriefSection`, `DailyBriefItem`,
`CalibrationProposal`, `ContentDraft`, `ContentSource`,
`ContentReview`.

**Operator cockpit:** `CockpitTask`, `CockpitDecision`,
`CockpitMediaItem`, `SourceCoverageReport`. These power the
`/cockpit/*` operator surfaces.

**Compliance surfaces:** `Promotion` (with `PromotionStatus` and
`PromotionComplianceStatus` enums). The promotions guards in
`apps/web/lib/promotions/` enforce compliance gating on every public
render.

**Not yet in schema (master plan calls these out for later):**

- `LossAutopsy` (was flagged as in-flight in the original brief; not
  present in `schema.prisma` as a model. Whatever exists today is
  attached to `Pick` or stored as text — needs Codex audit before
  Phase 2.)
- `GateDecision` (Phase 2 schema extension per master plan Part 5).
- Any Intelligence Graph state — not stored yet; the graph will be
  pure read-models over existing rows in Phase 2.

## Routes

All under `apps/web/app/`. Counted by directory.

**Marketing / public:** `/` (home), `/about`, `/methodology`,
`/observatory`, `/picks`, `/pricing`, `/promotions`, `/performance`,
`/vault`, `/changelog`, `/faq`, `/press`, `/responsible-play`,
`/terms`, `/privacy`, `/blog/[slug]`, `/vs/tout-services`.

**Auth + user:** `/auth/signin`, `/auth/error`, `/dashboard`,
`/contact`, `/brief`.

**Operator cockpit:** `/cockpit/agents`, `/cockpit/brief`,
`/cockpit/calibration`, `/cockpit/content`, `/cockpit/history`,
`/cockpit/jarvis`, `/cockpit/media`, `/cockpit/promotions`,
`/cockpit/review`, `/cockpit/sources`, `/cockpit/tasks`.

**Admin:** `/admin/dashboard`, `/admin/picks`, `/admin/posts`,
`/admin/users`.

**API:**

- `/api/health` — used by Live State Strip in Phase 1
- `/api/picks` — public picks with entitlement gating
- `/api/performance` — public performance (gated until
  `PERFORMANCE_STATS_ENABLED=true`)
- `/api/promotions` — promotions surface
- `/api/blog` — blog index
- `/api/brief` — daily brief
- `/api/subscriptions/*` — Stripe + entitlements
- `/api/webhooks/*` — Stripe + auth providers
- `/api/cron/*` — cron triggers
- `/api/dev/*` — dev-only endpoints
- `/api/cockpit/*` — operator cockpit data
- `/api/admin/*` — admin dashboard data
- `/api/auth/*` — NextAuth

**Phase 1 routes that don't exist yet:**

- `/board` (full Gate Cam page) — Phase 2
- `/ledger` (full Public Ledger) — Phase 2

**Phase 3 routes that don't exist yet:**

- `/cockpit/studio` (Galaxy Studio) — Phase 3
- `/room/[gameId]` (Game Intelligence Rooms) — Phase 3
- `/cockpit/journal` (Model Journal editor) — Phase 3

**Phase 5 routes that don't exist yet:**

- `/embed/*` (B2B widgets) — Phase 5
- `/api/intelligence/*` (B2B API) — Phase 5

## Component inventory

`apps/web/components/`:

- `brand/` — brand lockup, marks
- `cockpit/` — operator surfaces
- `hero/` — interactive galaxy, hero sections
- `home/` — `start-in-sixty` and other home-page sections (the
  current chassis Phase 1 will replace)
- `motion/` — animated wrappers
- `performance/` — calibration / performance widgets
- `picks/` — pick rendering primitives
- `pricing/` — pricing + subscribe buttons
- `ui/` — nav, footer, primitives

**Not yet present (Phase 1 / 2 master plan deliverables):**

- `components/marketing/` — the planned consolidation location for
  marketing components in Phase 1
- `components/gate-cam/`
- `components/ledger/`
- `components/calibration-chart/`
- `components/pass-list/`

## Lib inventory

`apps/web/lib/`:

- `brand.ts` — single source of truth for product + parent company
  constants (`PARENT_COMPANY` added 2026-05-23)
- `auth.ts` — NextAuth configuration
- `stripe.ts` — Stripe client + entitlements helpers
- `entitlements.ts` — server-side gating (the master plan calls out
  that entitlements MUST stay server-side; this file honors that)
- `trust-claims.ts` — the trust-claims scanner that prevents banned
  language from shipping to public surfaces
- `promotions/` — promotion guards + public payload helpers
- `utils.ts` — class-name merge + date utilities
- `content-generator.ts` — Claude API integration for blog drafts
- `content-engine/templates.ts` — content templates
- `content-engine/build-draft.ts` — draft builder
- `content-engine/compliance.ts` — content compliance checks
- `cockpit/` — operator surface data loaders
- `dashboard/` — dashboard loaders
- `performance/` — performance gating + readiness
- `brief/` — daily brief assembly
- `calibration/` — calibration computations
- `source-intelligence/` — source coverage + trust scoring

**Not yet present (Phase 2 / 3 master plan deliverables):**

- `lib/intelligence-graph/` — the Phase 2 typed-primitives module
- `lib/studio/` — Galaxy Studio asset builder (Phase 3)
- `lib/game-room/` — Game Room data assembly (Phase 3)
- `lib/model-court/` — Model Court agent (Phase 4)
- `lib/dsl/` — programmable DSL parser + runtime (Phase 5)

## Test coverage

110 test files in `apps/web/__tests__/`. Categories:

- **Brand safety:** `public-copy-scanner`, `public-copy-scan-strong`,
  `metadata-banned-phrases`, `snapshots-banned-phrases`,
  `docs-public-copy-scan`, `trust-claims`. Together 497 assertions.
- **Policy:** `public-performance-policy`,
  `dashboard-performance-gate`, `history-eligibility`,
  `readiness-gate-enforcement`, `policy-only-winrate`,
  `phone-number-policy`, `env-example-coverage`.
- **Cockpit:** the largest cluster — routes, nav coverage, stub
  safety, history pages, jarvis APIs.
- **Engine + math:** `prediction-engine`-adjacent assertions in
  multiple files.
- **Integration / smoke:** `route-smoke`, `health-route`,
  `middleware-contract`, `node-engine-pin`.

Full suite is 1342 assertions across 110 files. All passing on this
branch as of 2026-05-23 against `DATABASE_URL=stub`.

## Build / dev / verification commands

From the repo root:

```bash
npm install                                 # install
npm run db:generate                          # run on first checkout
npm run dev                                  # next dev
npm run build                                # next build (apps/web)
npm test                                     # full suite via workspaces
DATABASE_URL=stub npm test                   # without DB
npm run typecheck                            # tsc --noEmit across workspaces
npm run lint                                 # eslint across workspaces
npm run test:brand-safety --workspace=apps/web   # brand voice gate
npm run test:cockpit --workspace=apps/web        # cockpit suite
npm run guardrails                                # trust + model-freeze + draft-only
```

## Compliance guardrails (the master plan's "trust + compliance" pillar
in nascent form)

These are already shipping today:

- **trust-claims scanner** (`lib/trust-claims.ts` + test) — catches
  banned phrases ("guaranteed profit," "lock of the day," etc.) in
  public copy.
- **promotions guards** (`lib/promotions/guards.ts` + test) — vets
  every promotion before it can render publicly.
- **public-copy-scanner** (test only, scans built routes) — verifies
  the live HTML doesn't leak banned language.
- **docs-public-copy-scan** (test) — same scan on `docs/` to catch
  drift in published documentation.
- **readiness-gate-enforcement** (test) — verifies stats pages
  refuse to render until `PERFORMANCE_STATS_ENABLED=true`.
- **policy-only-winrate** (test) — verifies win-rate readouts stay
  policy-gated.
- **snapshots-banned-phrases** (test) — verifies stored snapshots
  don't carry banned language forward.

These collectively form the seed of the master plan's "Trust +
Compliance Toolkit" (Part 2.F.5) — already used internally; will be
packaged as a B2B layer in Phase 5+.

## Known gaps surfaced during this audit

These are logged in `docs/ops/issue-queue.md`. Repeated here for
quick reference:

1. `tsconfig.json` uses deprecated `baseUrl` — typecheck bails before
   running. Codex's lane.
2. `npm run db:generate` hasn't been run in the current container —
   `@prisma/client` is missing recently-added members like
   `Promotion`, `CockpitTaskStatus`, `OperatorAgent`. Probably the
   cause of #3.
3. ~40+ implicit `any` typecheck errors in admin / cockpit / api
   routes — most likely a knock-on of #2; will likely shrink once
   prisma generate runs.

None of these block the corporate-structure branch — they're
pre-existing and orthogonal — but they are Phase 0 housekeeping
priorities.

## Where the master plan's Phase 0 work has and hasn't happened

Phase 0 verification gate per master plan Part 5:

- [x] **Documented current state** — this file.
- [ ] **`git status` clean** — pending Codex run.
- [ ] **Nested `Sports/` clone removed** — pending Codex check.
- [ ] **Loss Autopsy + Promo Desk migration strategy confirmed** —
  pending Codex.
- [ ] **Verification suite passes (lint + typecheck + test + build)** —
  test passes; typecheck and build need Codex to fix
  `baseUrl` + run prisma generate first.

When all five are green, the autonomous loop moves to Phase 1.
