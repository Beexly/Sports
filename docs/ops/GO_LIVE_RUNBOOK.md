# Galaxy Sports Edge — Go-Live & First-Revenue Runbook

**Audience:** owner. **Goal:** turn this codebase into a live, earning product **safely**.
**Author:** Claude (Opus 4.8), grounded in `scripts/check-deploy-readiness.mjs`,
`vercel.json`, and the readiness-gate logic. Everything here is an **owner action** —
the code is ready; these are the real-world accounts, secrets, and switches only you control.

> Guiding rule: **everything ships dark, then you open one gate at a time, in order.**
> `node scripts/check-deploy-readiness.mjs` enforces the order and blocks unsafe combinations
> (it already fails the deploy if `DEV_FAKE_ADMIN` or `DEMO_PICKS_ENABLED` are true in prod).

---

## Phase 0 — Accounts you need (most have free tiers; you're cost-sensitive)
| Service | Purpose | Free tier? |
|---|---|---|
| **Vercel** | Hosting + cron | Yes (Hobby) — note Hobby crons are daily; this repo uses an external GitHub-Actions cron every 30 min, so Hobby is fine |
| **Postgres** (Neon / Supabase) | Database (`DATABASE_URL`, `DIRECT_URL`) | Yes (Neon free) |
| **Redis** (Upstash) | Queue/cache (`REDIS_URL`) | Yes (Upstash free) |
| **The Odds API** | Real odds (`THE_ODDS_API_KEY`) | Yes (500 req/mo) — paid as volume grows |
| **Stripe** | Subscriptions | Pay-per-transaction only |
| **Google Cloud** | OAuth sign-in (`GOOGLE_CLIENT_ID/SECRET`) | Yes |
| **Anthropic** | Content engine (stays OFF at launch) | Pay-as-you-go |
| **Domain** | e.g. galaxysportsedge.com | ~$12/yr |

---

## Phase 1 — Provision + set env vars
Set these 20 required vars in Vercel (Production) — this is exactly the `REQUIRED` list in
`scripts/check-deploy-readiness.mjs`, which checks every one:

```
DATABASE_URL  DIRECT_URL  NEXTAUTH_SECRET  NEXTAUTH_URL
GOOGLE_CLIENT_ID  GOOGLE_CLIENT_SECRET
THE_ODDS_API_KEY  ANTHROPIC_API_KEY  REDIS_URL
STRIPE_SECRET_KEY  STRIPE_WEBHOOK_SECRET  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_PRO_MONTHLY_PRICE_ID     STRIPE_PRO_ANNUAL_PRICE_ID
STRIPE_ELITE_MONTHLY_PRICE_ID   STRIPE_ELITE_ANNUAL_PRICE_ID
STRIPE_FANTASY_MONTHLY_PRICE_ID STRIPE_FANTASY_ANNUAL_PRICE_ID
NEXT_PUBLIC_APP_URL  CRON_SECRET
```
The six `STRIPE_*_PRICE_ID` vars are the ones checkout reads; the legacy `STRIPE_PRO_PRICE_ID` /
`STRIPE_ELITE_PRICE_ID` are **monthly-only fallbacks** and are not sufficient on their own — see
Phase 5, which is where you actually create the prices and fill these in.

`CRON_SECRET` must be strong (the cron routes require `Authorization: Bearer <CRON_SECRET>` —
verified enforced). Plus the **gate flags** (all start `false` — see Phase 4).

Then initialize the database:
```
npm run db:generate && npm run db:migrate    # or db:push for first stand-up
npm run db:seed                              # seeds bootstrap/demo scaffolding
```

## Phase 2 — Verify everything is reachable (before any deploy)
```
node scripts/check-deploy-readiness.mjs
```
Green = DB reachable, Odds/Stripe keys valid, **every Stripe price resolves *and* charges the
advertised phase amount, at the advertised interval, in the advertised currency** (all six vars —
pro/elite/fantasy × monthly/annual — compared against `apps/web/lib/pricing/pricing-phases.ts`;
a mismatch is a hard failure, not a warning), Redis pings, `apps/web/vercel.json` crons +
security headers present, gate sequencing sane. **Do not deploy on red.**

Two honest caveats about what green does *not* mean: a failed **Anthropic** ping is only a
warning while `PUBLIC_BLOG_ENABLED=false` (no runtime path uses the key then), and vars marked
"Sensitive" in Vercel are write-only, so a local `vercel env pull` reports them as warnings —
run the script in the Vercel build or CI, with the env injected, for an authoritative check.
The price check requires **Node ≥ 22.18** (it loads the TypeScript billing helper directly); on
older Node it reports a failure rather than skipping.

## Phase 3 — First deploy (still fully dark)
Deploy to Vercel with **all gate flags `false`**. The public site renders its honest
bootstrap/stub states (no public picks, no performance stats). Confirm: site loads, Google
sign-in works, `/api/health` is green, the GitHub-Actions cron hits `/api/cron/refresh-odds`
(odds ingest, written as `isBootstrap=true`).

## Phase 4 — Open the gates IN ORDER (the staged rollout)
Flip one, redeploy/restart, watch, then the next. The script enforces this dependency chain:
```
CANONICAL_HISTORY_ENABLED          ← root; must be on before anything downstream
  └─ DERIVED_MODEL_HISTORY_ENABLED
       └─ PUBLIC_PICKS_ENABLED      ← picks become public
            ├─ PERFORMANCE_STATS_ENABLED   ← track record / calibration visible
            │    └─ OUTCOME_LEARNING_ENABLED
            │         └─ CALIBRATION_ADJUSTMENTS_ENABLED  ← also needs the audited
            │                                               MODEL_VERSION step (Phase 4b)
            └─ PUBLIC_BLOG_ENABLED          ← only if you turn the content engine on
```
**Let real picks settle and accumulate before opening `PERFORMANCE_STATS_ENABLED`** — the
engine deliberately excludes bootstrap/seed picks, so stats stay honest. Never skip the order.
Keep `DEV_FAKE_ADMIN=false` and `DEMO_PICKS_ENABLED=false` in prod (the script blocks them).

## Phase 4b — Calibration & the 70% tier (the intelligence go-live)
Once `OUTCOME_LEARNING_ENABLED` is on and real picks are settling, the calibration program is the
path to a *provable* 70% tier. It is instrumented and self-suppressing — watch and activate, don't
force it. Full detail + the audited order live in `docs/path-to-70.md` (§7).

1. **Watch the eligible sample fill.** Cockpit → Calibration → the "Path to a proven 70% tier" panel
   shows **learning-eligible** settled picks (the `eligibleForLearning` gate, set only while
   `OUTCOME_LEARNING_ENABLED` is on) vs the 100-pick activation floor. Picks that settled *before* you
   turned that flag on stay ineligible and do **not** count — turn the flag on first, or backfill
   eligibility, so the floor reflects admitted data. Until the floor is cleared the calibrator stays
   inactive (an identity passthrough, labeled uncalibrated).
2. **Validate out-of-sample, then activate (deliberate, audited `MODEL_VERSION` step).** The panel's
   ECE numbers are **in-sample and indicative only** — isotonic fitting will almost always look
   improved on the data it was fit on. Before the bump, run a held-out / offline calibration
   validation (train/test split or k-fold) and confirm the map improves ECE *out-of-sample*. Only
   then: bump `MODEL_VERSION` with an audit-trail entry (the `docs/calibration-proposals/FROZEN.md`
   rule), unpin `canApplyCalibrationAdjustments`, and wire the calibrated probability through. This is
   the only honest way to make "70%" mean 70%.
3. **Prove it.** Surface the reliability diagram (realized win rate per confidence bucket) + the CLV
   beat-rate + edge-significance. The conviction ("70%") tier then publishes only picks with a
   calibrated win probability ≥ 65% **and at or above the pick's price-specific break-even** (a −200
   favorite needs ~66.7%, so 65% is below break-even and must not qualify — `convictionTier()` already
   enforces `max(0.65, price break-even)`), an independent SPEAK edge, and a CLV beat-rate ≥ 50% over
   ≥ 20 graded picks. First-in-class is the *proof*, not the number.

Engine status (shipped, gated off): `conviction-tier.ts`, `calibration-apply.ts` (`buildCalibrator`),
and the cockpit readiness panel are built and tested. Nothing in live scoring consumes them yet —
they engage only at the audited step above.

## Phase 5 — Turn on payments (first revenue)

> **The prices are deliberately not hardcoded in this runbook.** The single source of truth is
> **`apps/web/lib/pricing/pricing-phases.ts`**. What you must create in Stripe is whatever the
> **current phase** says — the phase is chosen by `PRICING_PHASE` (default, and today's live
> value, `FOUNDING`), and a future ladder step (`PROVEN` → `ESTABLISHED` → `AUTHORITY`) changes
> every figure at once. Open that file before you create anything. A price copied into a doc
> rots the moment the ladder moves, and a wrong figure here is a **total revenue outage**.

**1. Create the Stripe Prices at the advertised amounts.**

Easiest path: `STRIPE_SECRET_KEY=sk_test_... npm run stripe:seed`. It creates the products and
prices with the stable `lookup_key`s checkout falls back to, and prints the env lines to paste.
Two limits to know before trusting it:
- It seeds **Pro + Elite only**. Create the two **Fantasy** prices yourself
  (`gse-fantasy-monthly` / `gse-fantasy-annual`) or the Fantasy tier stays unbuyable.
- Its amounts are **hardcoded to the FOUNDING figures** (`scripts/seed-stripe-prices.mjs`), not
  read from the phase. If `PRICING_PHASE` has been advanced, check them against
  `pricing-phases.ts` first — otherwise it seeds the previous phase's prices and the readiness
  gate (correctly) goes red.

If the Stripe account is already provisioned, `docs/ops/STRIPE_GO_LIVE_CHECKLIST.md` carries the
live price id for each of the six vars.

Current **FOUNDING** phase — *the live values as of this writing; verify against
`pricing-phases.ts`, which is authoritative*:

| Tier | Monthly | Annual |
|---|---|---|
| Fantasy | $4.99 | $49 |
| Pro | $14.99 | $99 |
| Elite | $24.99 | $179 |

> **⚠ Get an amount wrong and every checkout for that tier 503s — silently.**
> `apps/web/lib/stripe.ts` fails **CLOSED** when a Stripe Price's `unit_amount` disagrees with the
> advertised phase price (GSE-SEC-024): it returns an empty price id and the checkout route
> answers **503**. There is no "charges the wrong amount" failure mode here — there is only
> "nobody can subscribe", with no customer-visible error that explains why. An earlier version of
> this runbook instructed a Pro/Elite pair that has **never** been advertised; an operator who
> followed it would have broken **every Pro and Elite checkout** at launch. Take the figures from
> `pricing-phases.ts` and from nowhere else — including from any older copy of this file. The
> readiness script now catches a mismatch before you deploy — see Phase 2.

**2. Set all six price env vars.** These are what checkout actually reads
(`checkoutPriceId()` in `apps/web/lib/billing/price-ids.ts`):

| Env var | Sells | Legacy fallback |
|---|---|---|
| `STRIPE_PRO_MONTHLY_PRICE_ID` | Pro monthly | `STRIPE_PRO_PRICE_ID` |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | Pro annual | **none** |
| `STRIPE_ELITE_MONTHLY_PRICE_ID` | Elite monthly | `STRIPE_ELITE_PRICE_ID` |
| `STRIPE_ELITE_ANNUAL_PRICE_ID` | Elite annual | **none** |
| `STRIPE_FANTASY_MONTHLY_PRICE_ID` | Fantasy monthly | **none** |
| `STRIPE_FANTASY_ANNUAL_PRICE_ID` | Fantasy annual | **none** |

Only the two **monthly** vars fall back to the legacy `STRIPE_PRO_PRICE_ID` /
`STRIPE_ELITE_PRICE_ID`. Setting only that legacy pair leaves **all annual billing and the
entire Fantasy tier unbuyable** — checkout resolves an empty price id and 503s for those plans.
(Checkout can also resolve by Stripe `lookup_key` when a var is empty, but only for a price whose
amount already matches the phase — it is a backstop, not a substitute for setting the vars.)

**3. PREPEND, never replace — the comma-separated list IS the grandfathering mechanism.**

Each `STRIPE_*_PRICE_ID` may hold a **comma-separated list**. The **first** entry is what
checkout charges new members; **every** entry is recognised when classifying an existing
subscription's price id back to a tier (`tierForPriceId()`, `price-ids.ts`). Stripe Price
objects are immutable, so a subscriber keeps their original price id for the life of the
subscription — that list is the only thing that still maps it to PRO/ELITE/FANTASY.

```
# RIGHT — prepend the new id, keep the history
STRIPE_PRO_MONTHLY_PRICE_ID=price_NEW_PROVEN,price_OLD_FOUNDING

# WRONG — replaces it: every founding member's next renewal classifies as FREE
STRIPE_PRO_MONTHLY_PRICE_ID=price_NEW_PROVEN
```

Replacing instead of prepending **silently downgrades founding members to FREE** — they keep
paying (Stripe still charges their original price) and lose the product they paid for. `CLAUDE.md`
promises founding members are grandfathered *for life*; this list is what enforces it. The
readiness script amount-checks only the **first** id in each list — the historical ids are
*supposed* to sit at older, lower phase prices and must not be "corrected".

**4.** Add the webhook endpoint `https://<domain>/api/webhooks/stripe` → copy the signing secret
into `STRIPE_WEBHOOK_SECRET`. (Signature verification + idempotency are already implemented.)

**5. Start in Stripe TEST mode**, run a full subscribe → entitlement → cancel cycle, then swap to
**LIVE** keys. Re-run the readiness script — it reports TEST vs LIVE and, for each of the six
price vars, fetches the current (first) price id and **fails the check** unless its `unit_amount`,
its `recurring.interval` and its currency all match the advertised phase. Amount and interval use
the same comparison helpers as the runtime checkout guard, so a green gate here means checkout
will not 503 on the amount.

**6. Entitlements gate server-side, and the free teaser is two picks a day.**
`getEntitlements()` in `packages/types/src/index.ts` sets `dailyPickLimit: isPro ? null : 2` —
**Free (and Fantasy) get a two-pick daily teaser** with no confidence score; Pro gets the full
board + confidence + factor trail + line movement; Elite adds alerts and the CLV ledger. No
frontend-only paywall. **Do not "reconcile" this down to a single pick** — the two-pick teaser is
the advertised free tier (`CLAUDE.md`, the pricing page, and `apps/web/app/faq/page.tsx`'s "daily
two-pick teaser"), and it has already regressed once (`docs/ops/AGENT_LEDGER.md`, item C-31:
"free teaser returns 1 pick not 2"). Older docs describing a one-pick free tier are stale, not
authoritative.

**7. `STRIPE_TERMS_CONSENT_ENABLED` — order matters.** Default OFF, and safe to leave off. If you
want point-of-sale Terms consent at Stripe Checkout, set the Terms-of-Service URL in the Stripe
Dashboard **first**, *then* set this to `"true"`. Flipping it first makes Stripe reject every
Checkout Session — new subscriptions 500.

## Phase 6 — Keep live AI OFF until deliberately approved
The content/Studio engine is draft-only and dark. Leave `PUBLIC_BLOG_ENABLED=false` and don't
wire auto-posting. Rotate `ANTHROPIC_API_KEY` before ever enabling content.

---

## Pre-launch checklist (owner sign-off)
- [ ] `node scripts/check-deploy-readiness.mjs` → green
- [ ] `npm run typecheck && npm test && npm run guardrails && npm run build` → green
- [ ] Domain + `NEXTAUTH_URL`/`NEXT_PUBLIC_APP_URL` set; Google OAuth redirect URIs added
- [ ] `CRON_SECRET` set; GitHub-Actions cron secret matches; ingestion confirmed running
- [ ] All **six** `STRIPE_*_PRICE_ID` vars set (pro/elite/fantasy × monthly/annual), amounts
      taken from `apps/web/lib/pricing/pricing-phases.ts` and confirmed green by the readiness
      script — **not** copied from any doc
- [ ] Stripe TEST cycle passed; webhook verified; then LIVE keys
- [ ] Existing price ids **prepended**, never replaced, if a pricing phase was advanced
      (replacing downgrades grandfathered members to FREE)
- [ ] Gates opened in order, with real settled picks before performance stats
- [ ] `DEV_FAKE_ADMIN` / `DEMO_PICKS_ENABLED` = false in prod
- [ ] Responsible-gaming + methodology reachable site-wide (already in the global footer)

## What's still owner-only (cannot be automated for you)
Repo privacy · production secrets · preview URL · Prisma ADR approval · data-rights/legal
posture · payment activation · live-AI activation · public-picks activation · the launch flip.

## Honest gaps to close for "best-of-2026" polish (tracked in the audit)
Visual: forbidden-color → token migration + mobile responsiveness (need a **preview URL** so
changes can be visually verified). Intelligence: confidence-calibration loop is now built and
instrumented (`calibration-apply.ts` + cockpit readiness panel, governed by `model-freeze`) — see
Phase 4b + `docs/path-to-70.md`; it activates on settled data. SEO: per-route OG/canonical. See
`reports/claude/GALAXY_FULL_AUDIT_2026-05-29.md`.
