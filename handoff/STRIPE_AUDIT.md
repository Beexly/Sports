# P4-6 — Stripe integration safety audit

**Command:** `.claude/commands/audit-stripe.md` (read-only; `allowed-tools` are Read/Grep/Glob,
`git diff|log|status`, `npm run guard:*`, `git ls-files`)
**Run:** 2026-09-26 14:24–14:40 CDT · branch `hermes/live-wip-2026-09-24` (HEAD `b879f2d85`)
**Product code touched: NONE.** Two new read-only artifacts:
`handoff/STRIPE_AUDIT.md` (this file) and `handoff/stripe-keymode-scan.mjs` (`node`, exit 0).

## RESULT: 3 PASS, 1 PASS-WITH-GAP, 1 FAIL (env-only, see F1)

| # | Check | Verdict |
|---|---|---|
| 1 | Stripe key mode matches the environment (live keys only in production) | **PARTIAL** — reported, never asserted. F1. |
| 2 | Every Stripe route verifies the webhook signature | **PASS** |
| 3 | No live secret key / webhook secret in tracked files or the client bundle | **PASS** |
| 4 | Checkout reads per-interval price IDs from env | **PASS** |
| 5 | Idempotency keys on create/charge calls | **PASS** (3 of 3 mutation entry points) |

---

## F1 (the one FAIL) — key mode is DISPLAYED but never CHECKED against the environment

The command's requirement is *"Stripe key mode matches the environment (live keys only in the
production env)"*. Two things exist in this tree, and neither one asserts anything:

**What exists — `scripts/check-deploy-readiness.mjs:253-254`:**

```js
const live = !process.env.STRIPE_SECRET_KEY.startsWith("sk_test_");
ok("Stripe secret key", `${live ? "LIVE" : "TEST"} mode · ${account.id}`);
```

`ok()` is the script's GREEN line. The mode is computed, stringified, and printed inside a
success path. There is no `bad()` branch anywhere in `checkStripe()` that fires when a test key
is found in production or a live key is found in a preview. So a production deploy holding
`sk_test_…` produces a **green** "Stripe secret key — LIVE… " style line reading `TEST mode`, the
checklist stays green, and the operator reads past it. The reverse error is equally silent: a live
key in a preview environment charges real cards and is never flagged.

Two structural reasons it cannot currently fail even if a comparison were added:

- `scripts/check-deploy-readiness.mjs:243` — `if (!process.env.STRIPE_SECRET_KEY) return;` — the
  whole Stripe section is skipped when the key is absent, so "no key" and "key checked" are
  indistinguishable in the output.
- The script is **not wired into CI or into any deploy step.** `grep -rn check-deploy-readiness`
  returns exactly one script reference, `package.json:99` (`"deploy:ready"`), plus prose in
  `docs/ops/GO_LIVE_RUNBOOK.md:49,144`. Nothing invokes it automatically, so even a real failure
  is a human-remembered step.

**What the repo DOES enforce on key mode, and it is the right enforcement for a different risk.**
`apps/web/__tests__/checkout-live-mode-guard.test.ts:19-20` builds `sk_live_|pk_live_|rk_live_`
+ 8 alphanumerics and asserts the **test** process env and the payment-suite sources contain no
live-mode key. That is the right place for that rule (it keeps a real key out of CI logs and
fixtures) but it is orthogonal: it stops a live key entering the *test* environment, and says
nothing about a test key sitting in *production*.

**The nearest comparator in the tree is `scripts/seed-stripe-prices.mjs:57-63`, and it does it
correctly** — it rejects a key that is neither `sk_test_` nor `sk_live_`, and `console.warn`s on
live mode. That is a shape check plus a warning, not an environment comparison either, so the
pattern is consistent across the repo rather than one careless line.

**Also unresolved by design:** `getStripe()` (`apps/web/lib/stripe.ts:56-68`) accepts any
non-blank `STRIPE_SECRET_KEY` and constructs the client. There is no mode assertion at
construction time, so the runtime itself cannot tell a test deploy from a production one.

**Not determined, stated plainly:** I did not read any environment's actual key value, by policy
and by the command's own tool allowlist. Whether production is *currently* on a live key is
**NOT DETERMINED** by this audit — it is a Vercel env fact only the operator can read. What is
determined is that no code in this repo would notice either way.

## F1b — the live-mode guard test FAILS in this environment, and it is a true positive on shape

Running the payment suite:

```
npx vitest run __tests__/checkout-live-mode-guard.test.ts
  × the test environment carries no live-mode key in any env var
    → env var QUIVERAI_API_KEY looks like a live-mode Stripe key
```

Full batch: `1 failed | 3 passed (4)` files, `1 failed | 39 passed (40)` tests.

**The failing variable is not a Stripe variable.** `QUIVERAI_API_KEY` is not referenced anywhere in
the repo (`grep -rn QUIVERAI` over `apps/web`, `scripts`, `packages`, `.env.example` → 0 hits).
Its value is 30 characters, begins with the literal 8-character sequence `sk_live_`, and the
remaining 22 characters are all alphanumeric — i.e. it is **shape-identical to a Stripe live
secret key** and the guard cannot tell the difference. I did not print the value and did not
attempt to authenticate it anywhere.

Two honest readings, and the audit does not get to choose between them:

- **Benign (most likely).** A QuiverAI credential that happens to use a `sk_live_`-shaped prefix.
  Then the finding is a **false positive in the guard**, not a leak.
- **Not benign.** A real Stripe live key stored under a non-Stripe variable name. Then it is a
  live secret in the agent process environment, and the guard just did its job.

Either way the guard is doing something it was not designed to do — it treats *any* env var as a
Stripe credential — which is why this is filed as a test-suite observation and not as a confirmed
leak. **The value is the operator's to classify; the audit never saw it and this report contains
none of it.** Note the asymmetry that makes it worth acting on: the guard is currently RED in this
environment, so a red payment suite here is not necessarily a regression in the repo.

## Check 2 — PASS: every Stripe route verifies the webhook signature

There is exactly **one** webhook receiver in the whole tree
(`git ls-files | grep -i webhook` → `apps/web/app/api/webhooks/stripe/route.ts` plus three
non-receiver libs and one doc), so "every route" is a single route and it verifies.

`apps/web/app/api/webhooks/stripe/route.ts`:

- `:12` `const body = await req.text();` — **raw** body, required for verification, with the
  comment at `:8-9` saying why. Parsing the body first would break the HMAC.
- `:13,15-17` missing `stripe-signature` header → **400** before any other work.
- `:50-60` missing or blank `STRIPE_WEBHOOK_SECRET` → **503** naming the variable, *not* 400. The
  comment at `:39-49` records exactly why this matters: a config fault reported as "Invalid
  signature" is indistinguishable from an attacker in Stripe's Recent Deliveries, so an operator
  whose entitlements stopped goes looking for the wrong problem.
- `:65` `constructEvent(body, signature, webhookSecret)` inside a try; `:66-71` any failure →
  **400 "Invalid signature"** with the reason logged server-side and the verifier internals
  deliberately **not** echoed to the caller (`:69`).
- `:80-93` the durable-store precondition is checked **after** signature verification, with the
  reason inline at `:78-79`: only authentic Stripe traffic may observe store health.
- `:96-101` already-processed events short-circuit (idempotent replay).

Ordering is correct in the one direction that matters — **nothing before `:65` acts on the
payload.** The signature helper `apps/web/lib/api-auth/webhook-signature.ts:7-11` is sound
(sha256 HMAC, `timingSafeEqual`, length pre-check) but is **dead code for this route**: the route
uses the SDK's `constructEvent`, and the helper is reachable only through the
`apps/web/lib/api-auth/index.ts:12` barrel re-export. Recorded so nobody reads it as the thing
protecting the endpoint — it is not.

## Check 3 — PASS: no live secret or webhook secret in tracked files or the client bundle

`npm run guard:secrets` →

```
[secret-scan] OK - scanned 10824 file(s) [all-tracked] (29 file(s) >2MB not scanned); no secrets detected.
```

Exit 0. The scanner carries explicit rules for `stripe.secret.live`
(`\bsk_live_[A-Za-z0-9]{20,}\b`) and `stripe.secret.test` at
`scripts/guardrails/secret-scan.mjs:36-37`.

Client-bundle check, done separately because the secret scanner only sees tracked files: **zero**
`NEXT_PUBLIC_*` Stripe variables exist. The only `NEXT_PUBLIC_*` credential in the tree is
`NEXT_PUBLIC_VAPID_PUBLIC_KEY` (`apps/web/lib/push/use-push-subscription.ts:60`), which is a
web-push public key and is by design client-visible. Every Stripe read is
`process.env["STRIPE_SECRET_KEY"]` or `process.env["STRIPE_WEBHOOK_SECRET"]` in server-only
modules, and `STRIPE_PRICE_IDS` (`lib/stripe.ts:118-131`) is built from server env at module scope
— note these are *price ids*, not secrets, and they are not published keys.

Two honest limits on this PASS. The scan skipped **29 tracked files larger than 2MB**, so "no
secrets" is scoped to everything under that size. And `vitest.setup.ts:28` plus
`apps/web/vitest.setup.ts` set a dummy `STRIPE_SECRET_KEY` for tests — a fixture, not a leak, and
the live-mode guard is what keeps it honest.

## Check 4 — PASS: checkout reads per-interval price IDs from env

`apps/web/app/api/subscriptions/checkout/route.ts:114` calls
`resolveCheckoutPriceId(tier, interval)` with `interval` parsed at `:41` as
`z.enum(["month","year"])` — the axis is a validated input, not a guess. Resolution is
per-tier × per-interval in `apps/web/lib/billing/price-ids.ts:206-220`
(`checkoutPriceId`), reading `STRIPE_{FANTASY,PRO,ELITE}_{MONTHLY,ANNUAL}_PRICE_ID`, with the
documented legacy fallback to `STRIPE_{PRO,ELITE}_PRICE_ID` for the monthly axis
(`lib/stripe.ts:118-131`, `price-ids.ts:183-187`).

This is better than the command asks for, in two ways worth recording:

- **Grandfathering is handled.** Each var accepts a comma-separated list; the first entry is the
  current price and all entries are recognized on renewal (`price-ids.ts:9-14,161-167,195-203`).
  Without that, advancing a pricing phase would map an existing member's price id to `FREE`.
- **Amount, currency and cadence are all verified before the price is returned**, fail-closed:
  `lib/stripe.ts:180-212` (`verifyEnvPriceAmount`) calls
  `stripePriceAmountMatchesAd` + `stripePriceCurrencyMatchesAd` + `stripePriceIntervalMatchesAd`
  (`price-ids.ts:87-132`), and `lib/stripe.ts:248` returns `""` (→ 503 at
  `route.ts:117`) unless the verdict is exactly `"match"`. The `unverifiable` case is
  deliberately **not** cached (`lib/stripe.ts:181-190`) and deliberately fails closed — the
  reasoning at `lib/stripe.ts:236-248` is that a brief 503 is recoverable and a wrong charge is
  not.

The lookup_key fallback (`gse-{tier}-{monthly,annual}`, `price-ids.ts:134-157`) means checkout can
resolve with **zero** price env vars set, and `apps/web/lib/ops/billing-money-posture.ts:86-91`
reports that state as ready-with-lookup-keys rather than as a fault. That is a deliberate design
choice, and it is the reason the F1 gap matters more than it looks: with no env prices to compare,
the key mode is the only signal an operator gets about which Stripe account is being charged.

## Check 5 — PASS: idempotency keys on every create/charge call

Every Stripe mutation in the tree, with its idempotency key:

| Mutation | Site | Idempotency key |
|---|---|---|
| `stripe.customers.create` | `lib/stripe.ts:333-340` | `gse-customer-${userId}` (`:339`) |
| `stripe.checkout.sessions.create` | `lib/stripe.ts:440-442` | `stripeIdempotencyKeyForAttempt(userId, attemptId)` (`:441`) |
| `stripe.billingPortal.sessions.create` | `lib/stripe.ts:793-796` | **none** — see below |

The first two are the money paths and both are keyed on a **durable, pre-registered** value rather
than a random per-request token: the customer key is the `userId`, and the session key derives
from a `checkoutAttemptId` that is validated for shape at `lib/stripe.ts:386-390` and written to
the DB *before* the Stripe call. `createCheckoutSession` throws the typed
`CheckoutAttemptIdError` on a malformed attempt id rather than minting a tokenless session
(`:387-389`), which is what makes the key stable across reloads and devices.

**The portal session has no idempotency key, and this is correct rather than an oversight.** A
Billing Portal session moves no money: it is a short-lived management URL, so a duplicate creates a
second harmless link rather than a second charge. It is still gated — `requireDurableWriteStore
("stripe-portal")` at `lib/stripe.ts:792` — so it cannot mint a live Stripe page while the local
entitlement record is not persisting.

Non-mutating calls were checked and correctly need no key: `prices.retrieve` / `prices.list`
(`:192,258`), `subscriptions.list` (`:543`), `checkout.sessions.list` / `.retrieve`
(`:455,641,724,746`), `checkout.sessions.expire` (`:678`, idempotent by construction — expiring an
already-expired session is a no-op, and a throw here returns `"unknown"` and fails the whole
checkout closed rather than minting a second payable session, `:680-689`).

There is **no** `paymentIntents` / `charge.create` / `refunds.create` anywhere in `apps/web` — the
only charge path is Checkout in subscription mode. So "3 of 3" is the complete set, not a sample.

## Cross-cutting: two guards stand in front of every mutation, and they are pinned

All three mutation entry points are preceded by `requireDurableWriteStore(...)` —
`stripe-checkout` at `lib/stripe.ts:316` and `:397`, `stripe-portal` at `:792` — and a **second**
copy runs at the route entry (`checkout/route.ts:138`). This is the GSE-SEC-033 invariant, and it
is pinned by `apps/web/__tests__/stripe-mutation-guard-invariant.test.ts`, which asserts each entry
point throws the typed `DurableWriteStoreUnavailableError` **and makes zero Stripe SDK calls**
(`:89,109,122`) — the zero-call assertion is what makes it a real guard rather than a smoke test.

## NOT DETERMINED (so nobody re-runs this expecting a different answer)

1. **The actual key mode of any real environment.** Reading a Vercel env value is outside this
   command's tool allowlist and outside the repo. F1 is about the absence of an assertion, not
   about the current state of production.
2. **The 29 tracked files over 2MB** skipped by the secret scanner (F-check 3 scope limit).
3. **Whether the `QUIVERAI_API_KEY` value is a real Stripe key** (F1b). Only the operator can
   classify it; the audit never printed it and never used it.
4. **No rendered/client-bundle inspection.** The "not in the client bundle" claim rests on a
   source-level `NEXT_PUBLIC_*` sweep plus the tracked-file scanner, not on inspecting a built
   `.next` output.
5. **Stripe Dashboard configuration** was not inspected: actual webhook endpoint URLs (there is a
   posture probe at `apps/web/lib/ops/stripe-webhook-hosts.ts` surfaced on the public truth
   surface, but it needs a live key to answer), price objects, or the live/test account split.
6. **Rate limiting / replay on the webhook route** was not audited; `webhookEvent` dedupe by
   `stripeEventId` (`:96-101`) bounds duplicate processing but is not a replay window.

## Reproducing this audit

```bash
npm run guard:secrets                                  # check 3, exit 0
node handoff/stripe-keymode-scan.mjs .                 # F1 + F1b, exit 0, prints no secret value
cd apps/web && npx vitest run __tests__/checkout-live-mode-guard.test.ts \
  __tests__/stripe-mutation-guard-invariant.test.ts \
  __tests__/deploy-readiness-stripe-prices.test.ts \
  __tests__/billing-money-posture.test.ts               # F1b + check 5
```

`handoff/stripe-keymode-scan.mjs` includes a self-test canary (`:2` of its output) proving the
shape rule can detect the failure it claims to, so a future "0 hits" is a real 0 and not a
silently-broken regex.
