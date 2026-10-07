# Galaxy Sports Edge (GSE)

> **⚠️ NOT OPEN SOURCE. All rights reserved.**
> This repository is publicly viewable for transparency only.
> Code is licensed under the PolyForm Noncommercial License 1.0.0 — commercial use prohibited.
> Data GSE generates is licensed under CC BY-NC 4.0 — commercial use prohibited.
> Third-party data (NGS, odds, injury reports) is **not** covered by either
> license; see [NOTICE](NOTICE) for scope and [LICENSE](LICENSE) / [DATA_LICENSE](DATA_LICENSE).

[![CI](https://github.com/Beexly/Sports/actions/workflows/ci.yml/badge.svg)](https://github.com/Beexly/Sports/actions/workflows/ci.yml)

Sports picks platform with real data ingestion, deterministic factor-model
prediction ranking, subscription paywalls, content generation, and an internal
operator cockpit. We're not AI. We're math you can read. Agents start at
`AGENTS.md`. `CLAUDE.md` is the product overview.

> **Current mode: internal calibration only.** No auto-publish. No auto-send.
> No external posting. No automated betting. `publishes_pick` stays false.

## Where the code is (2026-09-26)

Branch `grok/reasoning-layer-2026-09-26`. Do not redo this work.

- Eight LIVE week-3 parts are locked in `data/reasoning/parts-registry.jsonl` for `2026_03_LAC_BUF` only. The edge sum is `0.30259224777263855`. Do not copy those signed values onto another game.
- Officials, weather, narrative contract, and coaching are DARK. Officials failed honesty. A named referee does not turn it on.
- nflverse contracts, rosters, snap counts, participation, and fourth-down probabilities for 2024 and 2025 are in `data/gse-dataset/*.jsonl`. Hashes are in `data/gse-dataset/nflverse-ingest-manifest.json`. `go_wp` is not on play-by-play. It came from the nfl4th RDS. The model was not ported.
- Week-3 readings go through `readParts` → `aggregateSignals`. `packages/ingestion-pipeline/src/reasoning-trace/from-bridge.ts` already exists for stored bridge premises. Do not add a second one, and do not treat it as the week-3 edge.
- `SignalFamily` stays eight members. Do not expand it to hit a feature count.
- Tonight's queue is `docs/reasoning/overnight-agent-prompt-2026-09-26.md`. The owner is running that queue on Grok. Other agents do not start it.

Older sweep notes are in `docs/ops/AGENTS-history-through-2026-09-24.md`. They are not current tasks.

## FABLE/NFL evidence layer

The repo-visible FABLE/NFL evidence layer lives in `docs/fable/`. Start with
`docs/fable/README.md`, `docs/fable/CODEX_FINAL_REPORT.md`, and
`docs/fable/aws/AWS_FINAL_REPORT.md`. The corresponding pure TypeScript
primitives live in `apps/web/lib/fable/`.

## API v1 shadow stack

The API v1 durability work is shadow/proposal-only. Start with
`docs/api/API_V1_STACK_HANDOFF.md`, `docs/api/API_V1_STACK_PR_INDEX.md`, and
`docs/api/API_V1_REVIEWER_MERGE_CHECKLIST.md`. The local readiness matrix is
`docs/api/API_V1_PROMOTION_READINESS_MATRIX.md`; the non-executable disposable
rehearsal packet is `docs/api/API_V1_DISPOSABLE_REHEARSAL_PACKET.md`. The boundary guard is
`scripts/guardrails/api-v1-boundary.mjs`, and it blocks accidental live API v1
routes, Prisma models, migrations, env vars, database imports, provider calls,
and network calls until an owner-approved promotion exists.

## Local turn-on (cockpit-ready in ~10 minutes)

These steps stand the app up on `localhost:3000` with seeded cockpit data and
an admin login. They assume Postgres is available locally; everything past
`db:push` requires it.

### 1. Prerequisites

- **Node.js 20** (see [Node version](#node-version) — newer majors pass locally
  and fail CI), npm >= 10
- A local Postgres instance (Docker, Homebrew, or `docker compose up postgres`
  from `docker/`)
- A Google OAuth client (only required for sign-in; takes ~3 min in Google
  Cloud Console — set the redirect to `http://localhost:3000/api/auth/callback/google`)

#### Node version

**Every CI job runs Node 20.** `.nvmrc` pins it, so:

```bash
nvm use            # or: fnm use / asdf install
node --version     # expect v20.x
```

This matters more than it looks. `engines.node` says `>=20.0.0`, so npm stays
quiet on Node 21/22/24 and the whole local suite — `npm test`, `npm run
typecheck`, `npm run lint`, `npm run guardrails` — goes green on a runtime CI
never uses. Anything that touches an API added after Node 20 then fails in CI
and nowhere else. Verified examples of that gap: `module.registerHooks` and
native TypeScript type-stripping (`node foo.ts`) both work on v22.22.2 and
throw on v20.20.2.

`npm run guard:node-version-parity` checks that the pins agree and scans
Node-executed sources for post-20 APIs. It prints a NOTICE whenever the runtime
you are on differs from the CI pin; `--strict-runtime` turns that into a
failure. Its API list is hand-maintained and partial — **running the checks on
Node 20 is the real verification**, the guard is only a fast tripwire.

If your Node 20 lives somewhere other than your version manager's default, put
it in front for a single command rather than switching globally:

```bash
PATH=/path/to/node20/bin:$PATH npm test
```

### 2. Install + env

```bash
cp .env.example apps/web/.env.local
npm install
```

Fill in `apps/web/.env.local`. The minimum to open the cockpit locally:

```env
# required for local cockpit
DATABASE_URL="postgresql://user:***@localhost:5433/sports_platform"
DIRECT_URL="postgresql://user:***@localhost:5433/sports_platform"
NEXTAUTH_SECRET="<openssl rand -base64 32>"
NEXTAUTH_URL="http://localhost:3000"
GOOGLE_CLIENT_ID="<from Google Cloud Console>"
GOOGLE_CLIENT_SECRET="<from Google Cloud Console>"

# local-dev admin promotion (seeded as ADMIN; no-op without this)
DEV_ADMIN_EMAIL="your-google-account@example.com"
DEV_ADMIN_NAME="Local Admin"
```

Optional buckets:

```env
# required for live odds ingestion
THE_ODDS_API_KEY="<from the-odds-api.com>"

# required for Stripe checkout / webhooks
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRO_PRICE_ID="price_..."
STRIPE_ELITE_PRICE_ID="price_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# required for Claude-drafted content (blog/journal drafts only; never picks)
ANTHROPIC_API_KEY="sk-ant-..."

# required for the Claude response cache (ioredis); there is no job-queue library
REDIS_URL="redis://localhost:6379"
```

The bootstrap progression flags (`CANONICAL_HISTORY_ENABLED`,
`PUBLIC_PICKS_ENABLED`, `PERFORMANCE_STATS_ENABLED`, etc.) all default to
`false`. Leave them off until each prerequisite is met — `.env.example` has
the full progression guide inline.

### 3. Database

```bash
npm run db:generate    # prisma generate (no DB needed)
npm run db:push        # creates tables in your local Postgres
npm run db:seed        # sports/leagues + cockpit demo data + dev admin
```

Re-running `db:seed` is idempotent — cockpit demo data only seeds if
`cockpit_tasks` is empty, and the dev admin is upserted.

### 4. Sign in as admin

1. `npm run dev` (boots Next.js on `http://localhost:3000`)
2. Visit `http://localhost:3000/auth/signin` and sign in with the Google
   account whose email matches `DEV_ADMIN_EMAIL`.
3. The seed already created the user row with `role=ADMIN`, so the Prisma
   adapter links the OAuth account to that row and you land in the cockpit
   as an admin.
4. Visit `/cockpit`. You should see the eight seeded tasks across the status
   board.

> Production safety: the dev-admin block in `prisma/seed.ts` is a no-op when
> `NODE_ENV=production` even if `DEV_ADMIN_EMAIL` is set, so you cannot
> accidentally promote a user on a production deploy by running the seed.

### 5. Cockpit routes

- `/cockpit` — Jarvis Launch Observatory (synthesized launch status + sectional health + recommended actions)
- `/cockpit/history` — historical pick forensic ledger (per-row eligibility, CSV export)
- `/cockpit/agents` — six operator roles + queue depth
- `/cockpit/agents/[agentKey]` — per-agent queue
- `/cockpit/tasks` — task board grouped by status
- `/cockpit/tasks/[taskId]` — task detail + decision history
- `/cockpit/review` — `NEEDS_REVIEW` + `BLOCKED` queue
- `/cockpit/media` — draft content workflow (no publishing path)
- `/cockpit/promotions` — Bobby's promotion review queue with compliance verdict per row
- `/cockpit/promotions/[slug]` — promotion detail + publish-gate breakdown
- `/cockpit/brief` — operator mirror of the daily brief
- `/cockpit/calibration` — model accountability dashboard (read-only, MODEL_VERSION-gated)
- `/cockpit/content` — content draft workflow (no auto-publish)
- `/cockpit/sources` — source intelligence layer (per-category TTL + audit log)

For the full launch-night map of customer vs operator surfaces, the
brand voice quick reference, the Jarvis troubleshooting table, and the
data-flow diagram, see [`docs/launch-observatory.md`](docs/launch-observatory.md).

For the step-by-step morning operator recipe (install → validate → push → PR
→ stage validation → flipping the performance gate → rollback), see
[`docs/launch-runbook.md`](docs/launch-runbook.md).

Launch-night reports remain at
[`reports/launch-night/morning-handoff.md`](reports/launch-night/morning-handoff.md).
They are history. Current agent state is `AGENTS.md`.

All cockpit pages and `/api/cockpit/*` routes redirect non-admins to
`/auth/signin?callbackUrl=/cockpit`.

> The decision audit log lives inline on the overview ("Recent decisions")
> and per-task detail page — there is no standalone `/cockpit/decisions`
> route.

### 6. Public routes (trust-safe)

- `/` — landing
- `/picks` — gated on `PUBLIC_PICKS_ENABLED`
- `/brief` — daily sports brief (honest empty state; performance section gated)
- `/performance` — gated on `PERFORMANCE_STATS_ENABLED`
- `/promotions` — sportsbook promotion marketplace (compliance-gated)
- `/pricing`
- `/blog` — gated on `PUBLIC_BLOG_ENABLED`

When the relevant flag is `false`, each page renders an honest empty/bootstrap
state — never fabricated picks or stats. The promotions marketplace renders
nothing publicly until each row carries a disclosure, terms URL, eligible
states, and an `APPROVED` compliance status.

### 7. Validation

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

All four should exit 0. The build emits expected stub-DB `prisma:error`
lines while Next probes static-render eligibility, then marks all routes
dynamic and finishes clean.

## Layout

```
apps/web/                   Next.js 14 app (frontend + API routes)
packages/db/                Prisma schema, migrations, client, seed
packages/prediction-engine  Core scoring + readiness gates
packages/data-ingestion     The Odds API adapter + normalizer
packages/ingestion-pipeline Shared per-sport ingestion entry point
packages/types              Shared TypeScript types
workers/                    Standalone long-running workers (setTimeout loops,
                            not a broker queue). NOT deployed: absent from
                            docker-compose and run only via npm run workers:*.
                            Production scheduling is 21 Vercel crons.
docker/                     Postgres + Redis compose, app Dockerfile
docs/                       Architecture + ops runbook
```

There is no root `handoff.md`. Per-phase history lives in the tracked `handoff/`
directory — start at [`handoff/00-READ-CANONICAL.md`](handoff/00-READ-CANONICAL.md),
which routes you to the actual doc source of truth
([`docs/ops/CANONICAL.md`](docs/ops/CANONICAL.md)) and warns that the dated
session handoffs beside it are museum pieces, not plans to execute.


## Orbit unlock (process capital)

- [`docs/ops/ORBIT_UNLOCK.md`](docs/ops/ORBIT_UNLOCK.md) — founder click checklist (free settle, Stripe, credits)
- [`docs/ops/OPERATOR.md`](docs/ops/OPERATOR.md) — production actions agents cannot perform
- [`docs/ops/CREDITS.md`](docs/ops/CREDITS.md) — credit claim tracker
- [`.claude/skills/`](.claude/skills/) — agent SKILL packs
- `npm run agent:eval` — thin deterministic harness
- `npm run e2e:pricing-smoke` — public pricing + checkout route probe
- `npm run export:settled-picks` — JSONL settled picks (DATABASE_URL, read-only)

### Orbit leverage (2026-07-31 wave 3)
- Map: [`docs/ops/ORBIT_MAP.md`](docs/ops/ORBIT_MAP.md)
- Calibration: [`docs/ops/CALIBRATION_PIPELINE.md`](docs/ops/CALIBRATION_PIPELINE.md)
- Eval: `npm run agent:eval` · `npm run dspy:gse` · `npm run orbit:map`
- CIR: `centeredIsotonicCalibration` (R&D, not live)
