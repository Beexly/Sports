# FULL SITE LAUNCH READINESS — 2026-05-28

## Branch
`claude/determined-keller-dUcdG`

## Commit
`3595be3` — feat: ship full intelligence surface

## Route Map — Public Surfaces

| Route | State | Description |
|---|---|---|
| `/` | LIVE | Home — board state, gate cam, calibration, pass list, methodology |
| `/board` | LIVE | Today's picks board with factor trail |
| `/picks` | LIVE | Picks with entitlement gating |
| `/fantasy` | PREVIEW | Fantasy War Room — DEMO cards clearly labeled |
| `/market-gravity` | PREVIEW | Market Gravity — DEMO cards clearly labeled |
| `/brain` | BETA/GATED | Research Brain — DEMO answers, elite-only access when live |
| `/rumor-radar` | PREVIEW | Rumor Radar — DEMO signals, source-tier framework |
| `/developer` | WAITLIST | Developer & API — contact CTA |
| `/observatory` | LIVE | Edge Map |
| `/methodology` | LIVE | Deterministic scoring, open framework |
| `/journal` | LIVE | Content articles |
| `/journal/[slug]` | LIVE | Individual articles |
| `/ledger` | LIVE | Public ledger of settled picks |
| `/performance` | LIVE | Performance stats |
| `/pricing` | LIVE | Plans + subscribe CTAs |
| `/contact` | LIVE | Contact form |
| `/faq` | LIVE | FAQ |
| `/about` | LIVE | About |
| `/press` | LIVE | Press |
| `/responsible-play` | LIVE | Responsible use + helplines |
| `/privacy` | LIVE | Privacy policy |
| `/terms` | LIVE | Terms of service |
| `/auth/signin` | LIVE | Sign in |
| `/dashboard` | LIVE | User dashboard (auth-gated) |
| `/promotions` | LIVE | Promotions |

## Internal Surfaces (Not Public)

| Route | State |
|---|---|
| `/cockpit/*` | INTERNAL — operator workbench |
| `/admin/*` | INTERNAL — admin panel |

## Validation Results

| Check | Status | Notes |
|---|---|---|
| `npm run lint` | ✓ PASS | ESLint 8 with .eslintrc.json |
| `npm run typecheck` | ✓ PASS | After `db:generate` |
| `npm run build` | ✓ PASS | All routes compiled, Next.js build clean |
| `npm run test:brand-safety` | ✓ PASS | 735/735 tests passing |
| `npm run test:smoke` | ✓ PASS | 28/28 checks passing |
| `npm run guard:trust` | ✓ PASS | 267 files, no banned phrases |
| `npm run db:generate` | ✓ PASS | Prisma client generated |

## Payment Readiness

Stripe integration exists in codebase (`packages/db`, pricing page, subscribe button).

**Environment required:**
- `STRIPE_SECRET_KEY` — Stripe API key
- `STRIPE_WEBHOOK_SECRET` — Webhook signing secret
- `STRIPE_PRO_PRICE_ID` — Pro plan price ID ($19/mo)
- `STRIPE_ELITE_PRICE_ID` — Elite plan price ID ($49/mo)
- `NEXT_PUBLIC_CHECKOUT_URL` — Optional external checkout URL fallback
- `NEXT_PUBLIC_WAITLIST_URL` — Optional waitlist redirect URL

**Fallback:** All pricing CTAs fall back gracefully to `/auth/signin` or `/contact` when env vars are missing. No broken payment buttons.

See: `reports/launch/PAYMENT_READINESS_2026-05-28.md` (to be created by Codex if needed)

## Live Data Readiness

| Data Source | Status | Required Env |
|---|---|---|
| Picks / board data | LIVE (stub fallback) | `THE_ODDS_API_KEY` |
| Calibration data | LIVE (stub fallback) | DB + picks data |
| Fantasy War Room | PREVIEW / DEMO | — |
| Market Gravity | PREVIEW / DEMO | `THE_ODDS_API_KEY` (for live) |
| Research Brain | BETA / GATED | `ANTHROPIC_API_KEY` |
| Rumor Radar | PREVIEW / DEMO | — |

## Environment Variables Checklist

```
DATABASE_URL=          # Required
DIRECT_URL=            # Required (Prisma)
NEXTAUTH_SECRET=       # Required
NEXTAUTH_URL=          # Required (e.g. https://galaxysportsedge.com)
GOOGLE_CLIENT_ID=      # Required (auth)
GOOGLE_CLIENT_SECRET=  # Required (auth)
STRIPE_SECRET_KEY=     # Required (payments)
STRIPE_WEBHOOK_SECRET= # Required (webhooks)
STRIPE_PRO_PRICE_ID=   # Required (pricing)
STRIPE_ELITE_PRICE_ID= # Required (pricing)
THE_ODDS_API_KEY=      # Required (picks data)
ANTHROPIC_API_KEY=     # Required (Research Brain)
REDIS_URL=             # Required (job queue)
NEXT_PUBLIC_APP_URL=   # Required (internal fetches)
```

## Deployment Command

```bash
# Preview deploy (Vercel)
vercel --project=sports

# Production deploy (after env vars set)
vercel --prod --project=sports
```

## Rollback Command

```bash
git revert HEAD --no-edit
git push -u origin claude/determined-keller-dUcdG
```

## Known Risks

1. **No DB in CI environment** — `typecheck` requires `db:generate` first. Documented in ACTIVE_AGENT_RELAY.md.
2. **Worker typecheck failures** — Pre-existing TS deprecation warnings in `workers/data-refresh` and `workers/pick-generation`. Not blocking web app.
3. **Live data for new surfaces** — Fantasy, Market Gravity, Brain, Rumor Radar all show DEMO/PREVIEW state. Risk: users see demo data. Mitigation: clearly labeled on every surface.
4. **Stripe not configured** — Pricing page falls back to waitlist/contact CTA. Risk: revenue conversion is reduced until Stripe is wired. Mitigation: waitlist captures leads.

## Owner Final Checklist

- [ ] Set all required environment variables in Vercel (or hosting provider)
- [ ] Verify Stripe webhook endpoint is registered
- [ ] Verify `THE_ODDS_API_KEY` is valid and has credits
- [ ] Verify `ANTHROPIC_API_KEY` is valid
- [ ] Run `npm run db:migrate` against production database
- [ ] Confirm `NEXTAUTH_URL` matches production domain
- [ ] Run `vercel --prod` or equivalent deploy
- [ ] Verify `/board` loads with real data (not demo)
- [ ] Verify `/pricing` subscribe button works
- [ ] Verify `/responsible-play` page loads
- [ ] Spot-check `/fantasy`, `/market-gravity` show DEMO label
- [ ] Confirm cockpit routes are not publicly indexed

## What Shipped This Session

**New public intelligence surfaces (5):**
- `/fantasy` — Fantasy War Room (PREVIEW)
- `/market-gravity` — Market Gravity (PREVIEW)
- `/brain` — Research Brain (BETA/GATED)
- `/rumor-radar` — Rumor Radar (PREVIEW)
- `/developer` — Developer & API (WAITLIST)

**Navigation updates:**
- Desktop nav: Board, Fantasy, Market Gravity, Rumor Radar, Journal, Pricing
- Mobile nav: All 11 surfaces including Brain, Developer, Edge Map

**Validation infrastructure:**
- `scripts/smoke-launch.mjs` — 5-section smoke check, 28 assertions
- `test:smoke` script in root `package.json`
- `reports/agent-handoffs/ACTIVE_AGENT_RELAY.md`
- `reports/launch/LAUNCH_BASELINE_2026-05-28.md`
- `reports/launch/FULL_SITE_LAUNCH_READINESS_2026-05-28.md` (this file)

## Next Command for Owner

```bash
# 1. Ensure env vars are set, then:
npm run db:generate && npm run build && npm run test:smoke

# 2. Deploy preview
vercel --project=sports

# 3. Verify live, then production deploy
vercel --prod --project=sports
```
