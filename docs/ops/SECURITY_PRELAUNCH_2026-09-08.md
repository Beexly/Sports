# Pre-launch security and money-path audit — 2026-09-08

Read-only audits first, then the fixes. Stripe is live with real money, so every
line here traces to a command that was run and output that was seen. Where a
fact is not server-knowable it says so rather than guessing; where a check was
not run it says NOT RUN.

**Scope.** The money path (checkout, billing portal, Stripe webhook,
entitlement resolution), the entitlement gates on the API surface, secret
posture, and dependency posture. Base `origin/main` at `9046ff22a`; findings
verified on that tree, fixes landed on `claude/agent-security-money`.

**Out of scope, and who owns it.** The repo-wide `api-no-store` ratchet belongs
to the Testing agent (`claude/agent-testing`) except `/api/board/passes`, which
is here. `OPS_READ_SECRET` (F-32 / HP-5) and C-102 belong to Hermes. R-1 key
rotation is the founder's; no credential was searched for, printed, or moved.

**Not done, deliberately.** No Stripe Dashboard change, no live checkout, no
refund, no production write, no price or phase change, no gate or env-flag
flip, no env default changed in code.

---

## 1. Findings

Severity is about what a customer or the business loses, not about how hard the
bug was to find.

### 1.1 HIGH — we promised seven days of grace to members we were cutting off within the hour

**Verified.** `apps/web/app/api/webhooks/stripe/route.ts:802-803` (pre-fix)
mapped Stripe `unpaid` to `PAST_DUE`. `apps/web/lib/entitlements.ts:71-88`
grants access on `PAST_DUE` for `PAST_DUE_GRACE_DAYS` (7, `entitlements.ts:51`),
and `apps/web/components/ui/billing-notice-banner.tsx:23` states the window to
the member in writing: "You keep full access while we retry, until <date>."
Meanwhile `apps/web/lib/billing/reconcile-entitlements.ts:146` classifies
Stripe `unpaid` as a CONFIRMED non-access status and downgrades on it, from an
hourly cron.

So the two halves of the money path disagreed, and the member was shown the
more generous half. `unpaid` is the END of Stripe's dunning schedule: the grace
window exists to cover the retries, and by `unpaid` there are none left.

**Fixed** (`1b64247fe`), per founder decision D2a. `unpaid` now maps to
`INCOMPLETE` — not access-granting, so access ends on the webhook itself and a
redelivery writes the same row. Deliberately NOT `CANCELED`: that is terminal,
stamps `canceledAt`, and arms the out-of-order resurrection guard
(`route.ts:624-636`), which would then refuse a later same-id reactivation and
lock out a member who had just paid the outstanding invoice.

The copy is the other half. Stripe `unpaid` and a genuine SCA `incomplete` both
land on `INCOMPLETE` and are not the same fact, so the sync preserves the
`pastDueSince` anchor on the unpaid landing (it no longer buys access; it
records what happened) and `lib/billing/notice.ts` reads it to separate the
two. A member whose card we tried and gave up on now gets `DUNNING_EXHAUSTED`
— "Your Pro access has ended", no grace promised — instead of being told to
finish setting up a payment we in fact attempted repeatedly.

### 1.2 HIGH — the double-billing guard was blind during exactly the window a double-click lands in

**Verified.** `apps/web/app/api/subscriptions/checkout/route.ts:159-192`
(pre-fix) refused a second checkout by reading OUR subscription row. That row is
written by the webhook, so between a completed checkout and the
`customer.subscription.created` that records it, our data says "no
subscription" and the route waved a second checkout through. The result is a
second real Stripe subscription and a second charge every month, invisible to
everything we store.

**Fixed** (`69f1a9ef5`). `findLiveStripeSubscription` (`apps/web/lib/stripe.ts`)
asks Stripe, which is authoritative about its own subscriptions: one list call,
newest first, bounded at 100. `incomplete` and `incomplete_expired` are
deliberately not "live" — a subscription sits in `incomplete` from session
creation until the first charge clears, so counting it would lock a buyer out of
their own retry after one abandoned checkout. `active`, `trialing`, `past_due`,
`unpaid` and `paused` all mean a real subscription, and the answer is the
portal, not a second charge.

The probe runs after the customer resolve and BEFORE the CheckoutAttempt is
minted, so a refused checkout consumes no idempotency key and leaves no attempt
row to reconcile. `unknown` is a third outcome rather than a falsy second one,
so an unreadable answer fails closed with 503 and no Stripe side effect —
matching the DB guard above it.

### 1.3 LOW — the paid No-Bet trail was dead on `/api/board/passes`

**Verified.** `apps/web/app/api/board/passes/route.ts:18` (pre-fix) called
`loadBoardPasses()` with no options, so `includeNoBetDetail`
(`apps/web/lib/board/passes.ts:54-61`) was permanently false and the PRO/ELITE
refusal trail never reached the JSON surface. Only the SSR `/board` page passed
it (`apps/web/app/board/page.tsx:50`).

This failed CLOSED — a dead paid feature, never a leak — which is why PR #720
recorded it instead of fixing it drive-by: the fix adds per-viewer entitlement
resolution to a public, anonymous endpoint, and a gate wrong in the other
direction converts a dead feature into a paywall bypass.

**Fixed** (`5ead0e5c8`). Resolved server-side at the route boundary with the
existing helpers, failing closed at every exit (no session, no subscription,
throwing session store, throwing entitlement lookup), and in the throwing cases
still serving the anonymous 200 rather than 500-ing the public board over a
paid-only field. `.claude/rules/api-gating.md` is explicit that
`getUserEntitlements` called directly only fails closed on an unreachable
database, so the wrapping is the caller's job. The body now varies by viewer,
which makes `jsonNoStore` load-bearing rather than hygiene.

### 1.4 LOW — a missing `STRIPE_WEBHOOK_SECRET` wore an attacker's clothes

**Verified.** `apps/web/app/api/webhooks/stripe/route.ts:45` (pre-fix) read the
variable with a non-null assertion, so missing-or-blank threw inside the
verification try and returned 400 "Invalid signature" — in the Dashboard's
Recent Deliveries, indistinguishable from someone posting garbage at the
endpoint. An operator whose entitlement events had all stopped would go
re-checking the signing secret's VALUE when the variable is not set at all. The
sibling `STRIPE_SECRET_KEY` branch (`route.ts:19-37`) already got this right.

**Fixed** (`69f1a9ef5`): a 503 naming the variable, and `constructEvent` is
never called against a secret we do not have. Still a non-2xx, so Stripe keeps
redelivering and no entitlement event is lost while the variable is being set.

### 1.5 LOW — per-customer Stripe URLs were returned without `no-store`

**Verified.** `/api/subscriptions/checkout` and `/api/subscriptions/portal`
returned every response through bare `NextResponse.json`, including 200 bodies
carrying a single-use, per-customer Stripe URL. Both are POST routes, so no
ordinary cache would store them today; `.claude/rules/nextjs-caching.md` rule 2
nonetheless puts gate and error bodies under the same rule as the happy path.

**Fixed** on this branch: both routes now answer through `jsonNoStore`
throughout. `/api/board/passes` likewise (1.3), which also closes C-180's
ratchet item for that route.

---

## 2. Checked and sound — no change made

- **Refund revocation, both branches (D2b).** `handleChargeRefunded`
  (`apps/web/app/api/webhooks/stripe/route.ts`) is fully implemented on both
  sides of `REFUND_REVOKES_ACCESS`, with the flag structurally default-OFF
  (`refundRevokesAccessEnabled`, trimmed/lower-cased `=== "true"`). Log-only
  mode makes zero Stripe API calls; enforce mode revokes only on a
  positively-retrieved `canceled` / `incomplete_expired`, treats a partial or
  ambiguous refund as no-action, and 500s a transient retrieve failure so Stripe
  redelivers. `apps/web/__tests__/stripe-webhook-route.test.ts` covers both
  branches (the `charge.refunded` block, ~15 cases). This is C-11's work and it
  holds; **D2b needed no code change**, and the default in code is unchanged.
  F-2 remains the founder's env flip.
- **Premium API gating coverage.** All 32 route handlers under
  `apps/web/app/api/intelligence/**` and `apps/web/app/api/nflverse/**` call a
  gate helper (`requirePremiumApi` / `gateApi` / `requireFantasyApi`). Zero
  ungated. FANTASY is correctly excluded from the PRO/ELITE floor
  (`apps/web/lib/api-entitlement.ts:36`).
- **`DEV_FAKE_ADMIN` cannot mint paid access in production.** Blocked twice: a
  module-load assertion (`apps/web/lib/entitlements.ts:31-44`) and a per-call
  `NODE_ENV` guard (`:61-68`).
- **Price amounts are verified against the advertised ladder** before a checkout
  can use a price (`apps/web/lib/billing/price-ids.ts:74-93`,
  `verifyEnvPriceAmount` in `apps/web/lib/stripe.ts`), failing closed when
  `unit_amount` is null.
- **Durable-write preconditions** hold before any Stripe side effect on checkout
  and before any entitlement write in the webhook.
- **Secrets.** `npm run guardrails` → 26/26 PASS, including `secret-scan`. A
  manual `git grep` for `sk_live_` / `sk_test_` / `whsec_` / `rk_live_` across
  tracked source returns only labelled test fixtures. No credential was
  searched for, printed, or moved.
- **`apps/web/lib/stripe.ts` reports as a binary file** to `file(1)` and `grep`.
  Cause: two `0x00` bytes at line 187, a deliberate NUL separator in a cache key
  (`` `${priceId}\0${tier}\0${interval}` ``). Not a defect — recorded so the next
  scanner run does not chase it.

---

## 3. Dependency posture — NOT fixed, and why

Measured with `npm audit --omit=dev --audit-level=high` on this tree. Installed
`next` is **14.2.35** (`node -p "require('next/package.json').version"`).

| Package | Severity reported | Advisories |
|---|---|---|
| `next` | critical (aggregated) | GHSA-2xp9-vwfh-vxw4, GHSA-p293-qw3h-jr36, GHSA-955p-x3mx-jcvp, GHSA-p9j2-gv94-2wf4, GHSA-4c39-4ccg-62r3, GHSA-4633-3j49-mh5q, GHSA-68g3-v927-f742, GHSA-89xv-2m56-2m9x, GHSA-m99w-x7hq-7vfj, GHSA-36qx-fr4f-26g5, GHSA-wfc6-r584-vfw7, GHSA-c4j6-fc7j-m34r, GHSA-h64f-5h5j-jqjh, GHSA-gx5p-jg67-6x7h, GHSA-vfv6-92ff-j949, GHSA-ffhc-5mcf-pf4q, GHSA-3g8h-86w9-wvmq, GHSA-8h8q-6873-q5fj, GHSA-q4gf-8mx6-v5v3, GHSA-3x4c-7xq6-9pq8, GHSA-ggv3-7p47-pfv8, GHSA-h25m-26qc-wcjf, GHSA-9g9p-9gw9-jx7f |
| `postcss` (transitive, under `next`) | high | GHSA-qx2v-qp2m-jg93, GHSA-6g55-p6wh-862q, GHSA-fxqj-rqcc-2cmp, GHSA-r28c-9q8g-f849 |

Two corrections to how this was briefed. The dispatch described these as "HIGH
advisories"; npm reports the aggregated `next` entry as **critical**, and the
`high` is `postcss`. And the only remediation npm offers is `next@16.3.4`, a
**breaking major** — explicitly out of scope for this branch, and not something
to do the week Stripe went live.

**Applicability triage is NOT RUN.** Several of these are conditioned on
deployment shape (self-hosted image optimizer, Windows hosts, Pages Router
i18n, custom servers) that this deployment may not have, but I did not verify
per-advisory applicability and will not imply safety from that. The honest
statement is: the versions are vulnerable as reported, the fix is a major
bump, and the bump is a separate, owned piece of work.

**Recommended next step (not taken here):** a scoped triage of the `next`
advisories against this deployment's actual shape (Vercel-hosted, App Router
only, no `pages/`), then a planned 14.x → 15/16 upgrade with its own branch and
its own smoke.

---

## 4. Founder-only items this branch did not and cannot close

`C-182` (`379169286`) adds a `stripe` block to the operator detail of
`/api/ops/public-surface-truth` carrying the half the server can honestly know,
so these stop being unverifiable from the running system. The rest is a
Dashboard read.

| Row | What the server now reports | What still needs the Dashboard |
|---|---|---|
| F-20 | `handledEvents` (10, read from the handler's own switch) and `handledEventCount` | `dashboardSubscribedEvents` is NOT_READABLE — confirm the endpoint subscribes to every event in `handledEvents`. An event handled but not subscribed is silent: the code is right, the delivery never arrives, the entitlement never happens. |
| F-18 | `termsConsentEnabled` (this deployment's `STRIPE_TERMS_CONSENT_ENABLED`) | `termsUrlConfigured` is NOT_READABLE — the public Terms URL must be set BEFORE the variable is turned on (`docs/ops/OPERATOR.md` § 5 ordering rule). |
| F-19 | — | `foundingPaymentLinkActive` is NOT_READABLE. Nothing in this repo stores a link: `scripts/ops/create-founding-payment-link.mjs` creates one and prints it, and reads only `STRIPE_SECRET_KEY`. Confirm none is active or shared — a Payment Link charges without granting access, because it never emits `checkout.session.completed`. |
| F-22 | — | One live checkout end to end, then a refund. Not performed here (no live checkout). |
| F-2 | — | The `REFUND_REVOKES_ACCESS` flip. The code is complete and tested on both branches; the default in code is unchanged. |

The three NOT_READABLEs are the point, not a shortfall: this surface makes no
Stripe API call, and inferring a Dashboard state from the handler is exactly
the error F-20 exists to record.

---

## 5. Verification run for this branch

```
npm run typecheck                         exit 0
npm run lint                              exit 0
npm run guardrails                        26/26 PASS
node scripts/ops/check-agent-ledger.mjs   exit 0
```

Suites exercised for these changes: `stripe-webhook-route` (91),
`subscriptions-checkout-route` (40), `billing-notice` (13),
`board-passes-api-entitlement` (6, all six red against the pre-change route),
`stripe-webhook-handled-events` (2), `ops-public-surface-truth-rate-limit` (9),
plus the adjacent billing suites (`reconcile-entitlements`,
`billing-money-posture`, `dashboard-manage-billing`,
`checkout-live-mode-guard`, `stripe-checkout-consent`). The five Stripe-side
double-subscribe tests are red against the pre-change checkout route.
