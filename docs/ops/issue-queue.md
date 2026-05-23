# Issue Queue

> Bug reports, voice/vocab violations spotted in production, test gaps,
> performance issues, accessibility findings. Both Claude and Codex
> read and write this. Items move to the resolved section as they
> close.
>
> Severity tags:
>
> - `[P0]` — production breakage or compliance risk. Drop everything.
> - `[P1]` — visible to users, must fix this phase.
> - `[P2]` — non-urgent, fix in slack time.
> - `[P3]` — nice-to-have, may roll into `improvement-backlog.md` if
>   it lingers.

## Format

```
### YYYY-MM-DD — [P0/1/2/3] <short title>

**Found by:** Claude / Codex / owner / synthetic monitor
**Surface:** which page, route, component, or system
**Symptom:** what's wrong
**Root cause (if known):**
**Proposed fix:**
**Status:** open / in-progress / blocked / resolved
**Owner:** Claude / Codex
```

---

## Open issues

### 2026-05-23 — [P0] Silent priceId-downgrade bug in Stripe webhook tier mapping

**Found by:** owner Pass 13 (verified by Claude 2026-05-23 in the cloud
sandbox primary clone)
**Surface:** `apps/web/app/api/webhooks/stripe/route.ts:184-188`
**Symptom:** `getTierFromPriceId(priceId)` silently returns `"FREE"`
for any priceId that doesn't equal `STRIPE_ELITE_PRICE_ID` or
`STRIPE_PRO_PRICE_ID`. If the Stripe dashboard issues a new priceId
(admin updates pricing, new tier ladder, A/B price test) and the env
vars are stale, every paid customer who hits a webhook event after
that point gets downgraded to FREE without warning. The webhook
handler then writes `tier: "FREE"` into `Subscription`, propagating
through entitlements to gate paid content.

Secondary hole at line 185: if `STRIPE_ELITE_PRICE_ID` is unset
(returns `undefined`) AND the incoming `priceId` is `undefined`
(payload edge case), `undefined === undefined` evaluates true and
the function returns `"ELITE"` for a user with no actual price.

**Root cause:** treating "no matching env var" the same as "user is
on the FREE tier" instead of "this is an unknown state, refuse to
mutate user tier and flag for review."

**Proposed fix (Codex's `getStripeCheckoutSessionDecision` shape, per
owner Pass 13):** return a structured decision object
`{ tier, action: "downgrade" | "upgrade" | "noop" | "review-required",
reason, requiresOwnerReview: boolean }`. Unknown priceIds flip
`requiresOwnerReview: true` and the webhook persists the event as
`WebhookEvent.status: "review-required"` without mutating
`Subscription.tier`. An admin/cockpit surface lists review-required
events and lets the operator either map the new priceId (updating env
or DB) or confirm the downgrade was intentional.

**Status:** documented; FIX NOT YET LANDED. Per owner Pass 13 port
plan, this lands as Tier-1 commit 1.3. Spec scaffold in
`docs/product/stripe-webhook-decisioning-spec.md`.

**Owner:** Codex (per Pass 13 port plan) OR Claude (if owner
re-routes to autonomous fix) — owner decision pending.

### 2026-05-23 — [P1] Trust-claims scanner doesn't yet enforce master plan Part 3 vocabulary

**Found by:** Claude (audit pass on 2026-05-23)
**Surface:** `apps/web/lib/trust-claims.ts` banned list + the brand-safety
test suite
**Symptom:** the trust-claims registry only bans tout-style language
("guaranteed," "lock," "sure thing," "risk-free," "easy money," "can't
lose," "verified track record," "thousands of bettors," "trusted by
serious bettors," "guaranteed profit"). It does NOT yet enforce master
plan Part 3's expanded vocabulary: "Mission Control," "ecosystem,"
"transform/unlock your/level up," "AI-powered / AI-driven / powered by
AI," "intelligence platform" (as proper noun), "card" (in pick-card
sense, not credit-card or HTML/CSS sense), first-person algorithm voice
patterns, personification patterns.

**Root cause:** the registry predates the master plan vocabulary
expansion.

**Proposed fix:** extend `TRUST_CLAIMS` with new BANNED entries for
each Part 3 phrase. Context-aware exclusions needed for "card" (must
allow `<card>` JSX, `variant="card"` props, `card: "summary_large_image"`
Twitter OG meta key, "credit card" literal references). Add a new
banned-vocabulary test scoped to homepage + marketing surfaces only
(not cockpit/admin where some internal-vocabulary terms are legitimate).
This is a Phase 1 deliverable per master plan Part 5; lands with the
homepage reposition.

**Status:** open (Phase 1 work)
**Owner:** Codex with Claude-supplied entries

### 2026-05-23 — [P2] No dedicated tests for the Stripe webhook handler

**Found by:** Claude (audit pass on 2026-05-23)
**Surface:** `apps/web/app/api/webhooks/stripe/route.ts`
**Symptom:** the webhook handler does signature verification,
idempotency, subscription sync, and tier transitions — but has no
direct test coverage. The webhook is security-critical (handles
billing state transitions) and a regression could silently downgrade
users or fail to provision new subscriptions.
**Root cause:** the webhook was built before the brand-safety test
infrastructure matured.
**Proposed fix:** add `__tests__/stripe-webhook.test.ts` covering:
(1) missing signature returns 400, (2) bad signature returns 400,
(3) replayed event ID returns `skipped: true`, (4) checkout.session.
completed creates / updates the subscription row, (5) subscription.
deleted downgrades tier to FREE, (6) tier maps correctly from price IDs
(via env injection in the test). Mock the Stripe client; the existing
`syncSubscription` is testable as a pure function.
**Status:** open
**Owner:** Codex

### 2026-05-23 — [P2] TypeScript `baseUrl` deprecation in apps/web/tsconfig.json

**Found by:** Claude (during corporate-structure branch verification)
**Surface:** `apps/web/tsconfig.json` line 23
**Symptom:** `npm run typecheck` fails immediately with TS5101 —
"Option 'baseUrl' is deprecated and will stop functioning in
TypeScript 7.0."
**Root cause:** TypeScript 5.x bumped `baseUrl` to a hard error
unless `ignoreDeprecations: "6.0"` is added.
**Proposed fix:** add `"ignoreDeprecations": "6.0"` to the
`compilerOptions` block, OR migrate path mapping off `baseUrl`
entirely.
**Status:** open
**Owner:** Codex (config edit; Claude's lane doesn't permit
`tsconfig.json` edits per master plan Part 1)

### 2026-05-23 — [P2] Prisma client missing exports in apps/web tests

**Found by:** Claude (during corporate-structure branch verification)
**Surface:** `__tests__/cockpit-transitions.test.ts`,
`__tests__/promotions-guards.test.ts`,
`__tests__/promotions-public-payload.test.ts`,
`app/api/cockpit/tasks/route.ts`, others
**Symptom:** typecheck errors like
`Module '"@prisma/client"' has no exported member 'CockpitTaskStatus'`,
`'Promotion'`, `'OperatorAgent'`.
**Root cause:** `npx prisma generate` hasn't been run in this checkout
of the container; the generated client is stale relative to the schema
that introduced these types.
**Proposed fix:** Codex runs `npm run db:generate` as part of Phase 0
housekeeping; consider adding it to `postinstall` so contributor
checkouts don't hit this.
**Status:** open
**Owner:** Codex (Phase 0)

### 2026-05-23 — [P2] Implicit `any` parameters scattered across admin + cockpit + api routes

**Found by:** Claude (during corporate-structure branch verification)
**Surface:** `app/admin/picks/page.tsx`,
`app/admin/posts/page.tsx`, `app/admin/users/page.tsx`,
`app/api/admin/dashboard/route.ts`,
`app/api/cockpit/**/route.ts` (multiple), and more.
**Symptom:** ~40+ `TS7006: Parameter 'X' implicitly has an 'any' type`
errors when typecheck runs.
**Root cause:** Prisma's generated types aren't being propagated into
inline `.map` / `.filter` / `.reduce` callbacks — likely correlated
with the Prisma generate gap above. May resolve naturally once that
fix lands. Anything left after that is a strict-mode hygiene cleanup.
**Proposed fix:** Codex runs prisma generate, re-runs typecheck, then
annotates any remaining callback parameters explicitly. No `any`
escape hatches per master plan Part 4 rule #7.
**Status:** open
**Owner:** Codex (Phase 0 cleanup)

---

## Resolved (last 30 days, then prune)

*None yet.*
