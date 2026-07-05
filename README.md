# Sports Intelligence OS

[![CI](https://github.com/baxley-garrett/sports-intelligence-os/actions/workflows/ci.yml/badge.svg)](https://github.com/baxley-garrett/sports-intelligence-os/actions/workflows/ci.yml)

Sports picks platform with real data ingestion, AI-assisted prediction
ranking, subscription paywalls, content generation, and an internal operator
cockpit. See `CLAUDE.md` for the full system overview and non-negotiable
rules.

> **Current mode: internal calibration only.** No auto-publish. No auto-send.
> No external posting. No automated betting. The platform's `ContentDraft`
> engine drafts internally; the legacy content-publishing worker is hard-gated
> off by default. See `docs/calibration-proposals/FROZEN.md` and
> `scripts/guardrails/*` for the enforcement surface.

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

- Node.js >= 20, npm >= 10
- A local Postgres instance (Docker, Homebrew, or `docker compose up postgres`
  from `docker/`)
- A Google OAuth client (only required for sign-in; takes ~3 min in Google
  Cloud Console — set the redirect to `http://localhost:3000/api/auth/callback/google`)

### 2. Install + env

```bash
cp .env.example .env.local
npm install
```

Fill in `.env.local`. The minimum to open the cockpit locally:

```env
# required for local cockpit
DATABASE_URL="postgresql://user:password@localhost:5432/sports_platform"
DIRECT_URL="postgresql://user:password@localhost:5432/sports_platform"
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

# required for AI-generated content
ANTHROPIC_API_KEY="sk-ant-..."

# required for BullMQ workers
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

**Launch-night handoff (read this first if you just sat down):**
[`reports/launch-night/morning-handoff.md`](reports/launch-night/morning-handoff.md).
That file links the rest of the launch-night reports in the right
reading order — start there.

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
workers/                    BullMQ workers (data-refresh, picks, content)
docker/                     Postgres + Redis compose, app Dockerfile
docs/                       Architecture + ops runbook
```

See `handoff.md` for the full per-phase history.
