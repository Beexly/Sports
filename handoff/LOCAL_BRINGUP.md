# Local Bring-Up Runbook

Minimal sequence to run the Sports Intelligence OS locally on `localhost:3000`.

**Scope:** local dev only. Never push. Never use real payment credentials.

---

## 0. Prerequisites

| Requirement | Version / Detail |
|---|---|
| Node.js | >= 20 |
| npm | >= 10 |
| Docker | required only for Path C (real Postgres) |

No GPU. No local LLM runtime (removed — was not viable). Disk: 19 GB freed from
ollama removal; builds no longer disk-constrained.

---

## 1. Install dependencies

```bash
git checkout -b local-bringup   # never commit on `main`
cd C:\Users\Garrett\Sports
npm install                      # workspace install — installs apps/web + all packages/
```

The `postinstall` hook runs `npm run db:generate` automatically (Prisma client
generation). If it does not fire, run it manually (see step 3).

---

## 2. Environment setup

Start from the checked template:

```bash
cp .env.example apps/web/.env.local
```

Then edit `apps/web/.env.local`. Everything below is a **variable NAME** only —
never paste real values into this runbook or commit them.

### Path A — Stub DB, no Postgres (fastest first run)

All DB reads return empty; `DEMO_PICKS_ENABLED=true` makes `/picks` and
`/dashboard` render a deterministic 10-pick sample slate (all `result=PENDING`).
Jarvis reports `NOT_READY_VALIDATION` with explicit blockers — this is the
expected and correct state before live data flows.

```env
# Required — app boots with these
DATABASE_URL=stub
DIRECT_URL=stub
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development

# Optional — admin bypass (never in production)
DEV_FAKE_ADMIN=true
DEMO_PICKS_ENABLED=true

# Feature-gated defaults (leave off until ready)
PUBLIC_PICKS_ENABLED=true
PERFORMANCE_STATS_ENABLED=false
```

### Path B — Real Postgres via Docker Compose

```bash
docker compose -f docker\docker-compose.yml up -d postgres
```

The compose file maps host port **5433** → container port 5432 (host 5432 is
taken by a local PG18 install). Use 5433 in your connection string:

```env
DATABASE_URL=postgresql://sports:sports_dev_password@localhost:5433/sports_platform
DIRECT_URL=postgresql://sports:sports_dev_password@localhost:5433/sports_platform
FORCE_REAL_PRISMA=true
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development
```

Optional Redis (only needed for BullMQ workers):

```bash
docker compose -f docker\docker-compose.yml up -d redis
# Then set: REDIS_URL=redis://localhost:6379
```

---

## 3. Database schema

`db:generate` creates the Prisma client + types. `db:push` creates tables in
your local Postgres (no migration history needed for dev). `db:seed` loads
sports/leagues + cockpit demo data + a dev admin user.

```bash
npm run db:generate    # prisma generate (no DB needed)
npm run db:push        # creates tables in local Postgres (Path B only)
npm run db:seed        # idempotent — seeds demo data + dev admin (dev only, no-op in prod)
```

Stub mode: skip `db:push` and `db:seed` — they are not needed when
`DATABASE_URL=stub`.

---

## 4. Sign in as admin (Path B)

```bash
npm run dev            # boots Next.js on http://localhost:3000
```

1. Visit `http://localhost:3000/auth/signin` and sign in with the Google account
   whose email matches `DEV_ADMIN_EMAIL` (set during `db:seed`).
2. The seed creates the user row with `role=ADMIN`, so the Prisma adapter
   links the OAuth account and you land in `/cockpit` as admin.

For Path A (stub + no Google OAuth): set `DEV_FAKE_ADMIN=true` in
`.env.local`, and every `auth()` call returns a synthetic ADMIN session — no
Google sign-in required. This bypass has a hard `NODE_ENV !== "production"`
gate and is inert in production.

---

## 5. Run the app

```bash
npm run dev    # Next.js dev server on http://localhost:3000
```

| Surface | Path | Gate |
|---|---|---|
| Landing | `/` | always on |
| Customer dashboard | `/dashboard` | admin or `DEV_FAKE_ADMIN=true` |
| Operator cockpit | `/cockpit` | admin only |
| Pick board | `/picks` | `PUBLIC_PICKS_ENABLED=true` |
| Performance | `/performance` | `PERFORMANCE_STATS_ENABLED=true` |
| Daily brief | `/brief` | always on (empty in stub) |
| Blog | `/blog` | `PUBLIC_BLOG_ENABLED=true` |
| Pricing | `/pricing` | always on |

---

## 6. Required env vars vs. feature-gated

### Hard-required (app will error or misbehave without these)

| Var | Why required | Fail-closed behavior if missing |
|---|---|---|
| `DATABASE_URL` | Prisma client init | Falls to stub mode (empty reads); see Path A |
| `NEXTAUTH_SECRET` | NextAuth token signing | Auth throws at session creation |
| `NEXTAUTH_URL` | NextAuth callback URLs | OAuth callbacks redirect to wrong host |
| `STRIPE_SECRET_KEY` | Stripe client construction | 503 with `STRIPE_SECRET_KEY` named (not 400 signature error) |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification | Webhook returns 400 "Invalid signature" |
| `REDIS_URL` | BullMQ queue connection | Worker routes return 503; `npm run workers:*` fail to start |
| `NEXT_PUBLIC_APP_URL` | Canonical URL, sitemap, metadataBase | Falls back to `https://www.galaxysportsedge.com` (wrong host locally) |

### Feature-gated (app runs without these, feature is off)

| Var | What it gates | Default if unset |
|---|---|---|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth sign-in | `"dev-noop"` — sign-in button renders but cannot complete |
| `THE_ODDS_API_KEY` | Odds/line data ingestion | Free path (ESPN public tertiary) degrades gracefully |
| `ANTHROPIC_API_KEY` | AI content generation (blog drafts) | Content routes return 503; deterministic engine unaffected |
| `DEV_FAKE_ADMIN` | Synthetic admin session bypass | `false` — must sign in via Google |
| `DEMO_PICKS_ENABLED` | 10-pick sample slate in stub mode | `false` — stub mode returns empty instead of samples |
| `PUBLIC_PICKS_ENABLED` | `/picks` and `/api/picks` live slate | `false` — returns 503 |
| `PERFORMANCE_STATS_ENABLED` | `/performance` + win-rate display | `false` — `NOT_READY_VALIDATION` state |
| `PUBLIC_BLOG_ENABLED` | Content publishing worker | `false` — no draft generation |
| `CANONICAL_HISTORY_ENABLED` | Non-bootstrap pick writes | `false` — picks written with `isBootstrap=true` |
| `DERIVED_MODEL_HISTORY_ENABLED` | ATS/H2H form scoring | `false` — scoring uses consensus + edge + rest only |
| `FEATURED_PICK_PROMOTION_ENABLED` | `isFeatured` on picks | `false` — no featured placement |
| `FANTASY_PUBLIC_TOOLS_ENABLED` | Fantasy tool routes | `false` — redirects to `/fantasy` |
| `STRIPE_TERMS_CONSENT_ENABLED` | PoS ToS at checkout | `false` — checkout omits consent collection |
| `LINE_ARCHIVE_ENABLED` / `LINE_ARCHIVE_EU_PINNACLE` | Line archive persistence | `false` — no extra Odds API calls |
| `WATCHLIST_ALERTS_ENABLED` | Watchlist alert dispatch | `false` — alerts not sent |
| `NEXT_PUBLIC_ANALYTICS_ENABLED` | Cloudflare + Clarity analytics | `false` — no analytics script loaded |
| `OUTCOME_LEARNING_ENABLED` | Learning-data collection | `false` — no snapshots marked eligible |
| `CALIBRATION_ADJUSTMENTS_ENABLED` | Isotonic calibration wiring | `false` — identity passthrough |
| `FORCE_NO_BET_IF_STALE` | Stale-data kill switch on public picks | `false` — no freshness check |
| `CONTENT_AUTO_PUBLISH` | Auto-publish content drafts | unset — drafts stay in review |
| `BACKTEST_HARNESS_ENABLED` | Scheduled backtest cron | `false` — not registered in vercel.json |
| `JARVIS_MEMORY_WRITE_ENABLED` | Autonomous Jarvis memory writes | `false` — no DB writes from recordMemoryEvent |
| `SEALED_ENGINE_ENABLED` | Published sealed slate view | `false` — renders "being built" |
| `GSE_WAITLIST_GATE_ENABLED` + `GSE_WAITLIST_BASIC_FORCE` | Waitlist basic auth | `false` — open |
| `PROJECTIONS_PROVIDER` | Live projections source | unset — renders "illustrative" |
| `CLAUDE_PROVIDER` / `JYNX_MODE` | Claude provider routing (AWS Bedrock/Vertex/Azure) | unset — direct Anthropic API |
| `STRIPE_FANTASY_MONTHLY_PRICE_ID` / `STRIPE_FANTASY_ANNUAL_PRICE_ID` | Fantasy tier checkout | unset — Fantasy checkout returns clean 503 |

### Bootstrap progression flags (operator-gated ladder)

These control what data the platform exposes publicly. All default to `false`.
Enable in sequence only when prerequisites are met (see `.env.example` for the
full inline guide):

1. `CANONICAL_HISTORY_ENABLED` — real (non-bootstrap) pick writes
2. `DERIVED_MODEL_HISTORY_ENABLED` — ATS/H2H form scoring
3. `PUBLIC_PICKS_ENABLED` — `/api/picks` live slate
4. `FEATURED_PICK_PROMOTION_ENABLED` — featured pick placement
5. `PERFORMANCE_STATS_ENABLED` — performance stats + win rates
6. `PUBLIC_BLOG_ENABLED` — blog content publishing
7. `OUTCOME_LEARNING_ENABLED` — learning-data collection
8. `CALIBRATION_ADJUSTMENTS_ENABLED` — calibrated confidence scores

---

## 7. Optional: seed picks for dev preview

To see picks in `/dashboard`, `/cockpit`, and `/cockpit/history` before live
ingestion is wired:

```bash
npm run db:seed    # creates ~38 synthetic picks (8 pending canonical, 18 settled)
```

The seed is idempotent — it only creates picks when `db.pick.count() === 0`
and only when `NODE_ENV !== "production"`. Synthetic picks carry
`modelVersion='v5.0.0-seed'` so they can be purged later with:

```bash
DELETE FROM picks WHERE model_version = 'v5.0.0-seed';
```

---

## 8. Verify

```bash
npm run typecheck    # tsc --noEmit — 0 errors expected
npm run lint         # eslint — 0 warnings expected (max-warnings=0)
npm run test         # vitest — all tests pass
npm run build        # next build — succeeds (stub-DB prisma:error lines during static render are expected)
```

---

## 9. Undocumented required vars

**None found.** The `.env.example` coverage test
(`apps/web/__tests__/env-example-coverage.test.ts`) enforces that:

- Every env key Jarvis warns about (via `jarvis-data.ts`'s `need` array) is
  documented in `.env.example`.
- Every env var read by `platform-config.ts` (the readiness gates) is
  documented.
- CI-set keys (`DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`)
  are documented.
- The bootstrap progression flags are documented.
- `DEV_ADMIN_EMAIL`, `DEV_ADMIN_NAME`, `DEV_FAKE_ADMIN`,
  `DEMO_PICKS_ENABLED`, `FANTASY_PUBLIC_TOOLS_ENABLED` are documented.

All checks pass. No code-read env var is missing from `.env.example`.

---

## 10. Command order summary

```
# Path A — stub, no Postgres:
cp .env.example apps/web/.env.local
  → set DATABASE_URL=stub, DIRECT_URL=stub, NEXTAUTH_SECRET, NEXTAUTH_URL, DEV_FAKE_ADMIN=true, DEMO_PICKS_ENABLED=true, NODE_ENV=development
npm install
npm run dev

# Path B — real Postgres via Docker:
docker compose -f docker\docker-compose.yml up -d postgres redis
cp .env.example apps/web/.env.local
  → set DATABASE_URL, DIRECT_URL (port 5433), FORCE_REAL_PRISMA=true, NEXTAUTH_SECRET, NEXTAUTH_URL, NODE_ENV=development, REDIS_URL=redis://localhost:6379
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev

# Verify:
npm run typecheck && npm run lint && npm run test && npm run build
```

## Notes

- `npm run dev` runs `next dev` via the workspace protocol; it boots on
  `http://localhost:3000` by default. Use `PORT` env var to override.
- The `--workspace=apps/web` suffix in the root `package.json` scripts
  (`npm run dev`) routes to `apps/web/package.json`'s `dev` script.
- `db:generate` uses `prisma generate`; `db:push` uses `prisma db push`
  (dev-only, no migration history). For production, use `npm run db:migrate`
  (`prisma migrate deploy`).
- `db:disposable` (`bash scripts/dev/disposable-postgres.sh`) spins up an
  ephemeral Postgres on port 5433 for integration tests — not for app
  bring-up.
