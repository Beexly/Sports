# LAUNCH LEDGER — Galaxy Sports Edge

**Single source of truth for getting GSE from this branch to a public launch.**
Supersedes the scattered launch notes (`LAUNCH_TONIGHT.md` is stale: old brand,
legacy single-interval Stripe IDs, no affiliate path). When those disagree with
this file, this file wins.

Every gate defaults to its **safest** value in code (`packages/prediction-engine/src/platform-config.ts`),
so nothing public can turn on by accident. Launch is a sequence of deliberate,
proof-gated flips — not a code project.

Branch: `claude/blissful-hamilton-d7edx1` · cwd: `/home/user/Sports`

---

## A. Code state — DONE (no owner action)

These are shipped, tested, and green on the branch. Listed so you know what you're *not* on the hook for.

- [x] Brand kit (Brand Bible v1.0): exact palette, Exo 2 display, official chrome lockup, cinematic reveal intro.
- [x] All 7 R4 surface waves (Board, House, Players/Lab, Intelligence, GSN Broadcast, Academy LMS, Proof room).
- [x] Server-side readiness gates wired across every public surface (picks, performance, blog, board, brief).
- [x] Stripe checkout reads **per-interval** price IDs with legacy fallback (`apps/web/lib/stripe.ts`); webhook hygiene (cancel/past-due reset).
- [x] Ingestion data-loss guards (9 writers refuse to wipe on empty upstream), settled-pick freeze, calibration crash-safety.
- [x] Denial-of-wallet rate limits on the Claude-backed routes (explain, model-court).
- [x] Affiliate compliance rail: `/go/[slug]` click gate, `rel="sponsored nofollow"`, disclosure, RG hotline, state-gating, suspicious-URL block.
- [x] Accessibility pass: graded-quiz announcements, reduced-motion timing (2.2.1), `aria-pressed`/`aria-current` on color-only state, form labels, live regions.
- [x] Verification gate green: typecheck · lint · 5,619 web tests + engine/package suites · build (191 pages) · em-dash + trust-gate + off-palette scanners · 0 broken links.

---

## B. Owner critical path — get the site LIVE (silent mode)

Order matters. ~90 min if nothing stalls. Site goes up in **silent mode**: marketing surface only, all public-data gates OFF (honest "collecting" state), no public picks yet. (Picks are free; paid tiers sell tools/depth/alerts, not picks.)

- [ ] **1. Domain + DNS** — point the chosen domain at Vercel (Cloudflare DNS records Vercel shows you).
- [ ] **2. Vercel project** — import `Beexly/Sports`, framework Next.js, root `apps/web`. *Confirm this branch (or its merge target) is the production branch — see note at bottom.*
- [ ] **3. Postgres** — Neon (or equivalent): pooled → `DATABASE_URL`, direct → `DIRECT_URL`. Run `npm run db:migrate` against it.
- [ ] **4. Redis** — Upstash free tier, same region → `REDIS_URL`.
- [ ] **5. Google OAuth** — origin `https://<domain>`, redirect `https://<domain>/api/auth/callback/google` → `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.
- [ ] **6. Secrets** — `openssl rand -base64 32` → `NEXTAUTH_SECRET`; `openssl rand -hex 32` → `CRON_SECRET`.
- [ ] **7. The Odds API** — paid tier (free 500/mo exhausts in a day at our cadence) → `THE_ODDS_API_KEY`. **This is the one most likely to already be expired — renew it.**
- [ ] **8. Anthropic** — billing + key → `ANTHROPIC_API_KEY` (content only, never picks).
- [ ] **9. Stripe (keys only for now)** — Test mode `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`; `STRIPE_WEBHOOK_SECRET=whsec_placeholder` is fine while checkout is gated.
- [ ] **10. Paste env into Vercel** (Production + Preview + Development) — see §B-env below.
- [ ] **11. Deploy + smoke test** — homepage 200, nav links 200, `/api/health` ok, Google sign-in lands on `/dashboard`.

### B-env — env block for silent launch

```
# Core infra
DATABASE_URL=<pooled>
DIRECT_URL=<direct>
REDIS_URL=rediss://...
NEXTAUTH_SECRET=<openssl base64 32>
NEXTAUTH_URL=https://<domain>
NEXT_PUBLIC_APP_URL=https://<domain>
GOOGLE_CLIENT_ID=<...>
GOOGLE_CLIENT_SECRET=<...>
THE_ODDS_API_KEY=<...>
ANTHROPIC_API_KEY=<...>
CRON_SECRET=<openssl hex 32>
NODE_ENV=production

# Stripe (test mode until §E cutover) — per-interval IDs are what checkout reads
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_placeholder
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
STRIPE_ELITE_MONTHLY_PRICE_ID=price_...
STRIPE_ELITE_ANNUAL_PRICE_ID=price_...

# Readiness gates — ALL safe/off for silent launch (see §C to flip)
CANONICAL_HISTORY_ENABLED=true
DERIVED_MODEL_HISTORY_ENABLED=false
PUBLIC_PICKS_ENABLED=false
PERFORMANCE_STATS_ENABLED=false
FEATURED_PICK_PROMOTION_ENABLED=false
PUBLIC_BLOG_ENABLED=false
OUTCOME_LEARNING_ENABLED=false
CALIBRATION_ADJUSTMENTS_ENABLED=false
FORCE_NO_BET_IF_STALE=true
CONFIDENCE_DISPLAY_MODE=labels
MIN_DATA_QUALITY_FOR_GAME_LOG=40
MIN_SETTLED_PICKS_FOR_LEARNING=100
```

> `FORCE_NO_BET_IF_STALE=true` is recommended on from day one: it makes the public
> picks surface auto-suppress whenever ingestion goes stale, so step C can be lifted safely.

---

## C. The proof-gated flip ladder (after launch)

This is the platform's whole point: **public claims only after the data backs them.**
Gates are enforced server-side — you cannot show numbers you haven't earned. Flip in order.

- [ ] **C1 — Accumulate silently.** Run the data-refresh + settle workers. Canonical history builds with `CANONICAL_HISTORY_ENABLED=true`. No public surface yet.
- [ ] **C2 — Derived history** (`DERIVED_MODEL_HISTORY_ENABLED=true`) once ~50+ settled canonical games/sport exist. Lets ATS/H2H/venue feed scoring.
- [ ] **C3 — Public picks** (`PUBLIC_PICKS_ENABLED=true`) once the slate is healthy and fresh. `/api/picks` starts serving. (Keep `FORCE_NO_BET_IF_STALE=true`.)
- [ ] **C4 — Performance stats** (`PERFORMANCE_STATS_ENABLED=true`) **only** after ≥100 settled canonical picks. This is the PROVEN rung in the pricing ladder (publish calibration).
- [ ] **C5 — Featured promotion** (`FEATURED_PICK_PROMOTION_ENABLED=true`) once grade thresholds are calibrated against real win rates.
- [ ] **C6 — Calibration adjustments** (`CALIBRATION_ADJUSTMENTS_ENABLED=true`) **only** after the audited MODEL_VERSION sequence in `docs/path-to-70.md §7` (held-out validation, audit-trail entry). Never flip blind.
- [ ] **C7 — Public blog** (`PUBLIC_BLOG_ENABLED=true`) when content pipeline is reviewed.
- [ ] **C8 — Confidence precision** (`CONFIDENCE_DISPLAY_MODE=precision`) for PRO+ after calibration is verified.

Pricing ladder this maps to (`apps/web/lib/pricing/pricing-phases.ts`):
FOUNDING (live) → PROVEN (≥100 settled + published calibration) → ESTABLISHED (≥500 + verified CLV ≥52.4%) → AUTHORITY.

---

## D. Affiliate revenue go-live (additive; subscription stays primary)

Full runbook: `AFFILIATE_GO_LIVE.md`. The code rail is done — this is account/legal work + a one-field flip.

- [ ] **D1 — EIN / business entity** (required by affiliate programs).
- [ ] **D2 — Sign up** for a sportsbook/DFS affiliate program; get your tracking URL.
- [ ] **D3 — Flip the operator** in `apps/web/lib/cockpit/operator-registry.ts` from `KNOWN_NOT_PARTNERED` → `APPROVED_PARTNER`, fill `licensedStates` (no fabrication).
- [ ] **D4 — Create the promo row** (slug + affiliate URL + terms URL). `/promotions` links route through `/go/[slug]`, which re-checks compliance at click time.
- [ ] **D5 — (optional)** set `AFFILIATE_SUBID` (default `gse`) for attribution.

The click gate fails closed: a pulled/expired/non-compliant promo redirects to `/promotions` instead of forwarding.

---

## E. Stripe LIVE cutover (when you enable paid subscriptions — tools/depth/alerts, not picks)

- [ ] **E1 — `npm run stripe:seed`** in Live mode to create Pro/Elite products + per-interval prices.
- [ ] **E2 — Swap env to live keys**: `STRIPE_SECRET_KEY=sk_live_...`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...`, and the four `STRIPE_*_{MONTHLY,ANNUAL}_PRICE_ID` to the live price IDs.
- [ ] **E3 — Webhook**: create the live endpoint at `https://<domain>/api/webhooks/stripe`, subscribe to subscription lifecycle events, set the real `STRIPE_WEBHOOK_SECRET=whsec_...`.
- [ ] **E4 — Test a real checkout** end-to-end; confirm the webhook upgrades the user tier.

> Code note: checkout reads `STRIPE_PRO_MONTHLY_PRICE_ID` / `STRIPE_PRO_ANNUAL_PRICE_ID`
> (Elite likewise), falling back to legacy `STRIPE_PRO_PRICE_ID` / `STRIPE_ELITE_PRICE_ID`
> when the monthly var is unset. The annual upgrade works the moment you set the annual IDs.

---

## F. Pre-deploy verification (run before every push that touches code)

```bash
npm run typecheck \
  && npm run lint \
  && (cd apps/web && npx vitest run) \
  && npm run build \
  && node scripts/guardrails/em-dash-scan.mjs \
  && node scripts/guardrails/trust-gate.mjs
```

All must be clean. (`npm run preflight` / the `preflight` skill is the go/no-go wrapper.)

---

## Open owner decision

- [ ] **Confirm the canonical deploy source.** Audits have run against a behind-clone
      (`C:\Users\Garrett\Sports`) while this work lives on `Beexly/Sports@claude/blissful-hamilton-d7edx1`.
      Decide which repo/branch Vercel deploys from, and merge this branch into it,
      before pasting production env vars. Everything above assumes this branch is the source of truth.
