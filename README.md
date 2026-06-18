# Galaxy Sports Network — Sports Intelligence OS

[![CI](https://github.com/baxley-garrett/sports-intelligence-os/actions/workflows/ci.yml/badge.svg)](https://github.com/baxley-garrett/sports-intelligence-os/actions/workflows/ci.yml)

**Galaxy is a sports intelligence, analytics, education, media, and decision-support
platform — not a sportsbook.** It turns real sportsbook data into picks you can
actually check, and the discipline to know when *not* to bet. Its operating promise:
we tell you what deserves action, what deserves caution, what deserves No-Bet, and
what we are not yet confident enough to claim.

The whole system is built on one principle that almost nobody in this category honors:
**process before scoreboard, and honesty as the moat.** We do not print a win rate we
have not earned. The number stays gated until enough settled history makes it
statistically defensible — and that restraint is the product, not a limitation.

See `CLAUDE.md` for the full system overview and the non-negotiable rules.

> **Current mode: internal calibration only.** No auto-publish. No auto-send. No
> external posting. No automated betting. Content drafts internally and is human-gated;
> the win-rate / calibration levers are founder-gated behind a `MODEL_VERSION` bump +
> a `docs/calibration-proposals/` audit entry. Enforcement lives in
> `scripts/guardrails/*` (`trust-gate`, `model-freeze`, `draft-only`) and
> `docs/calibration-proposals/FROZEN.md`.

---

## What makes it intelligent — the Reality Engine

A measurement-first "win-rate truth machine" that treats a betting line not as a
prediction but as a compressed market artifact to decompress. The spine is built,
unit-tested, and deliberately **inert (weight 0)** until real data earns activation —
a guard test (`packages/prediction-engine/src/__tests__/inert-edge-modules.guard.test.ts`)
fails the build if any of it leaks into live confidence without the founder gate.

- **Devig / fair probability** — Shin + multi-book consensus no-vig (median + dispersion).
- **Calibration** — isotonic/PAVA, ECE, Brier, reliability curve; self-suppressing below
  the learning-eligible sample floor (no overfit on a thin sample dressed as confidence).
- **Closing Line Value (CLV)** — captured per pick at bet-time and graded against the
  derived closing line; the *leading* indicator of real edge.
- **No-Bet discipline** — a first-class position, observable and measured, not a fallback.
- **Edge-type taxonomy + pick autopsy** — classifies *why* an edge exists and *why* a
  settled pick turned out as it did (good win vs bad win, good loss vs bad loss).
- **Sovereign Edge Index** — a shadow composition of the above that can *never* return
  "ATTACK" while uncalibrated; it caps itself and says exactly why.
- **Backtest harness** — offline, out-of-sample (chronological holdout) validation that
  frames win rate against the −110 break-even (52.38%) and refuses to compute below a
  100-pick floor. Surfaced read-only at `/cockpit/reality`.

The honest bottleneck is **data accumulation, not code**: the calibration learning sample
must clear its floor (attach the odds key + enable outcome learning) before any public
win-rate claim is defensible. The engine auto-activates the instant the data earns it.

See `docs/reality-engine/` for per-module docs and `reports/reality-engine/` for the
activation audit.

---

## What makes it creative — the Revenue Operating System

Galaxy is built to become a sports-intelligence *media company* with a paid product at
the center, not a single revenue stream. The flywheel: **content creates attention →
trust converts attention → the Desk monetizes trust → community retains → media,
sponsors, affiliates monetize the rest.** Every surface ships in an honest "opening
soon" / zero state until its owner-credential switch is flipped — nothing fabricated.

**Consumer (Workstream L):**
- `/founding-desk` — the paid intelligence ritual (real Stripe checkout; honest inert CTA until the price ID is set)
- `/sample-desk` · `/trust-room` · `/no-bet` — the trust-first conversion path
- `/ask-galaxy` — the concierge wedge: submit one game, get an honest manual classification (action / caution / no-bet / insufficient data — never automated betting advice)
- `/newsletter` — the Galaxy Desk Note (owned audience)

**Revenue OS (Workstream M) — the "revenue nervous system":**
- `/cockpit/revenue` · `/cockpit/customer-proof` · `/cockpit/channels` · `/cockpit/content-factory` · `/cockpit/sponsors` · `/cockpit/affiliate-registry` · `/cockpit/creator-network`
- Public: `/media-kit` · `/partners` · `/affiliate-disclosure` (FTC-style) · `/creator-network` · `/podcast` · `/shop`
- The content factory encodes the **"create once, convert everywhere"** machine: one Desk
  brief → newsletter, article, video script, shorts, podcast, carousel, and CTAs.

**The finish line:** `/cockpit/go-live` is a live green/red readiness checklist — it shows
exactly which owner-credential switches remain (Stripe, database, odds key, email/AI
providers) so "are we 100%?" has an honest, concrete answer.

See `docs/revenue/revenue-operating-system.md` for the full doctrine of record.

---

## Honest project status

- **Build:** green — `next build` passes (200+ routes), full `apps/web` test suite passes
  (6,000+ tests), `trust-gate` + `model-freeze` clean.
- **Architecturally complete** through the owner-credential line: the Reality Engine spine,
  the operator cockpit, and the full revenue OS are wired and shipping in honest states.
- **What remains is yours, not code's** — the credential/decision switches on
  `/cockpit/go-live` (Stripe products + price IDs, a live database, the odds API key +
  outcome-learning flag, an email/analytics provider, deploy env). The moment each is
  attached, the matching surface flips from inert to live with zero code changes.
- **No fabricated anything** — picks, stats, revenue, subscribers, testimonials, or win
  rates. Real data or an honest "unknown / building the record."

---

## Local turn-on (cockpit-ready in ~10 minutes)

These steps stand the app up on `localhost:3000` with seeded cockpit data and an admin
login. They assume Postgres is available locally; everything past `db:push` requires it.

### 1. Prerequisites

- Node.js >= 20, npm >= 10
- A local Postgres instance (Docker, Homebrew, or `docker compose up postgres` from `docker/`)
- A Google OAuth client (only required for sign-in; ~3 min in Google Cloud Console — set
  the redirect to `http://localhost:3000/api/auth/callback/google`)

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

Optional buckets (each unlocks the matching `/cockpit/go-live` check):

```env
# live odds ingestion → starts accruing the calibration record
THE_ODDS_API_KEY="<from the-odds-api.com>"

# Stripe checkout / webhooks — Pro, Elite, and the Founding Desk offer
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
STRIPE_PRO_MONTHLY_PRICE_ID="price_..."
STRIPE_PRO_ANNUAL_PRICE_ID="price_..."
STRIPE_ELITE_MONTHLY_PRICE_ID="price_..."
STRIPE_ELITE_ANNUAL_PRICE_ID="price_..."
STRIPE_FOUNDING_DESK_MONTHLY_PRICE_ID="price_..."   # flips /founding-desk to live checkout
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# AI-generated content (draft-only, human-gated)
ANTHROPIC_API_KEY="sk-ant-..."

# BullMQ workers
REDIS_URL="redis://localhost:6379"
```

The bootstrap progression flags (`CANONICAL_HISTORY_ENABLED`, `PUBLIC_PICKS_ENABLED`,
`PERFORMANCE_STATS_ENABLED`, `OUTCOME_LEARNING_ENABLED`, `PRICING_MODE`, etc.) all default
to the safest value. Leave them until each prerequisite is met — `.env.example` has the
full progression guide inline.

### 3. Database

```bash
npm run db:generate    # prisma generate (no DB needed)
npm run db:push        # creates tables in your local Postgres
npm run db:seed        # sports/leagues + cockpit demo data + dev admin
```

Re-running `db:seed` is idempotent — cockpit demo data only seeds if `cockpit_tasks` is
empty, and the dev admin is upserted.

### 4. Sign in as admin

1. `npm run dev` (boots Next.js on `http://localhost:3000`)
2. Visit `http://localhost:3000/auth/signin` and sign in with the Google account whose
   email matches `DEV_ADMIN_EMAIL`.
3. The seed created the user row with `role=ADMIN`, so the Prisma adapter links the OAuth
   account to that row and you land in the cockpit as an admin.
4. Visit `/cockpit`, then `/cockpit/go-live` for the readiness checklist.

> Production safety: the dev-admin block in `prisma/seed.ts` is a no-op when
> `NODE_ENV=production` even if `DEV_ADMIN_EMAIL` is set.

### 5. Cockpit routes (admin-only)

**Command & readiness**
- `/cockpit` — Jarvis launch observatory (synthesized status, health, recommended actions)
- `/cockpit/go-live` — owner readiness checklist (the "are we 100%?" finish line)
- `/cockpit/reality` — the Reality-Engine truth machine (read-only diagnostics + backtest)

**Revenue OS**
- `/cockpit/revenue` · `/cockpit/customer-proof` · `/cockpit/channels` ·
  `/cockpit/content-factory` · `/cockpit/sponsors` · `/cockpit/affiliate-registry` ·
  `/cockpit/creator-network`

**Picks, agents, content**
- `/cockpit/history` · `/cockpit/agents` · `/cockpit/tasks` · `/cockpit/review` ·
  `/cockpit/calibration` · `/cockpit/content` · `/cockpit/media` · `/cockpit/promotions` ·
  `/cockpit/sources`

All cockpit pages and `/api/cockpit/*` routes redirect non-admins to
`/auth/signin?callbackUrl=/cockpit`.

### 6. Public routes (trust-safe)

- `/` — landing (top-of-funnel CTAs into the Founding Desk + Ask Galaxy)
- Revenue: `/founding-desk` · `/sample-desk` · `/trust-room` · `/no-bet` · `/ask-galaxy` ·
  `/newsletter` · `/media-kit` · `/partners` · `/affiliate-disclosure` · `/creator-network` ·
  `/podcast` · `/shop`
- Receipts: `/performance` · `/clv` · `/ledger` · `/accountability` (win rate shown only
  once the sample is honest)
- `/picks` · `/brief` · `/pricing` · `/blog` (each gated; honest empty/bootstrap state when off)

When a gate flag is `false`, the page renders an honest empty/bootstrap state — never
fabricated picks or stats. The promotions marketplace renders nothing publicly until each
row carries a disclosure, terms URL, eligible states, and an `APPROVED` compliance status.

### 7. Validation

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

All four should exit 0. The build emits expected stub-DB `prisma:error` lines while Next
probes static-render eligibility, then marks routes dynamic and finishes clean. Offline
research scripts (`npm run reality:diagnostics`, `npm run backtest:replay`,
`npm run customer-proof:report`) all exit 0 gracefully with no database attached.

## Layout

```
apps/web/                   Next.js 14 app (frontend + API routes + cockpit)
packages/db/                Prisma schema, migrations, client, seed
packages/prediction-engine  Core scoring, readiness gates, Reality-Engine modules
packages/data-ingestion     The Odds API adapter + normalizer
packages/ingestion-pipeline Shared per-sport ingestion entry point
packages/types              Shared TypeScript types
workers/                    BullMQ workers (data-refresh, picks, content)
docs/                       Architecture, runbooks, reality-engine + revenue doctrine
docker/                     Postgres + Redis compose, app Dockerfile
```

Key docs: [`docs/revenue/revenue-operating-system.md`](docs/revenue/revenue-operating-system.md)
(revenue OS doctrine), [`docs/reality-engine/`](docs/reality-engine/) (win-rate engine),
[`docs/launch-observatory.md`](docs/launch-observatory.md) (operator map), and `handoff.md`
(full per-phase history).
