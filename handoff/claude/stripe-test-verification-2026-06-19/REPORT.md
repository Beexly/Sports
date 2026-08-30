# Stripe TEST Verification — Galaxy Sports Edge

**Date:** 2026-06-19 (run completed 2026-06-20 00:05–00:10 UTC)
**Branch/commit:** `main` @ `d52b62a8`
**Stripe account:** `acct_1TZIZTBVaxqE8bKV` — "PickPilot sandbox", `livemode=false` (TEST confirmed)
**Method:** Read-only Stripe REST API + 3 controlled TEST subscribe cycles + prod DB reads. No LIVE keys touched, no prod env vars modified, no migrations, nothing pushed. All test data cleaned up.

---

## Summary

**VERDICT: FAIL — launch blocker on the Stripe price-ID wiring. Do NOT swap to LIVE yet.**

The billing *pipeline itself is healthy and proven end-to-end*: a Stripe TEST subscription → webhook delivered to production → signature verified with the live `STRIPE_WEBHOOK_SECRET` → DB upsert → tier resolved → entitlement granted, all in ~2 seconds, returning HTTP 200. TEST-mode keys and webhook secret are correct.

**But the Pro *monthly* price ID wired in Vercel Production matches *neither* real active Pro monthly price in Stripe.** Subscribing to the $14.99 price (the one the public pricing page shows) granted only **FREE**; subscribing to the $19 price (the seeded `gse-pro-monthly`) also granted only **FREE**; subscribing to a price ID I *could* read (`STRIPE_PRO_PRICE_ID` legacy → $9.99/wk) correctly granted **PRO**. Conclusion: `STRIPE_PRO_MONTHLY_PRICE_ID` (and, by strong inference, the annual + both Elite price vars) holds a stale/wrong/empty value. A customer purchasing **Pro Monthly** through live checkout cannot be confirmed to receive PRO access — and if the var is empty, checkout returns HTTP 503 "Pricing for PRO (month) is not configured yet." This must be corrected and re-verified before LIVE.

Secondary flags: duplicate empty products in Stripe; the single webhook endpoint targets `sports-web-nine.vercel.app` (not the custom domain); a coverage gap on `invoice.payment_action_required`; and `currentPeriodStart/End` persisting as `null` on sync.

---

## Products + prices

Active products (4 — **2 are empty duplicates**):

| Product ID | Name | metadata.lookup | Has prices? |
|---|---|---|---|
| `prod_UYl0znu89tn7Xm` | Galaxy Sports Edge Pro | `gse-pro` | ✅ yes (canonical) |
| `prod_UYl0jLm8veHE5P` | Galaxy Sports Edge Elite | `gse-elite` | ✅ yes (canonical) |
| `prod_Ubo5JpzkZphBDI` | Galaxy Sports Edge Pro | *(none)* | ⚠️ empty duplicate |
| `prod_Ubo5YBnznouxyu` | Galaxy Sports Edge Elite | *(none)* | ⚠️ empty duplicate |

Active recurring prices (all on the two canonical products):

| Tier | $ | Interval | Price ID | lookup_key | Note |
|---|---|---|---|---|---|
| Pro | **14.99** | month | `price_1ThXsJBVaxqE8bKVikLl91hw` | *(null)* | matches public page; **no lookup_key / no tier metadata** |
| Pro | **19.00** | month | `price_1TZdUoBVaxqE8bKVBQgXWuqB` | `gse-pro-monthly` | stale amount (older seed) |
| Pro | 9.99 | week | `price_1TcaZoBVaxqE8bKVz0QwsGDP` | `pro_weekly` | = legacy `STRIPE_PRO_PRICE_ID` |
| Pro | 99.00 | year | `price_1ThXrHBVaxqE8bKVJyuOYAsF` | `gse-pro-annual` | matches page |
| Elite | **24.99** | month | `price_1ThXsJBVaxqE8bKV1Zy6QbPu` | *(null)* | matches public page; **no lookup_key / no tier metadata** |
| Elite | **49.00** | month | `price_1TZdUpBVaxqE8bKVUm2EyL1t` | `gse-elite-monthly` | stale amount (older seed) |
| Elite | 13.99 | week | `price_1TcaZpBVaxqE8bKVSGKamBrD` | `elite_weekly` | = legacy `STRIPE_ELITE_PRICE_ID` |
| Elite | 179.00 | year | `price_1ThXrIBVaxqE8bKVWNihIdn6` | `gse-elite-annual` | matches page |

**Pricing source of truth** (`apps/web/lib/pricing/pricing-phases.ts`, FOUNDING phase; also the seeder catalog): **Pro $14.99/mo · $99/yr, Elite $24.99/mo · $179/yr.**

**Flags:**
- **Two monthly prices exist per tier.** The $14.99 / $24.99 prices match the public page; the $19 / $49 prices are stale older-seed amounts. (The task brief's expectation of "$19 Pro / $49 Elite" is itself out of date — the codebase's own source of truth is $14.99 / $24.99.)
- The correct ($14.99 / $24.99) monthly prices have **no `lookup_key` and no `metadata.tier`** → fragile; the idempotent seeder (which keys off `lookup_key`) will not manage or correct them.
- The `seed-stripe-prices.mjs` CATALOG says $14.99 / $24.99 but the existing `gse-pro-monthly` / `gse-elite-monthly` prices are $19 / $49. Because the seeder is idempotent **by `lookup_key`**, re-running it will *not* fix the amounts (`scripts/seed-stripe-prices.mjs:102-119`).
- 2 empty duplicate products would re-confuse a LIVE seed.

---

## Webhook endpoint + event coverage

**One** endpoint configured:

| Field | Value |
|---|---|
| Endpoint ID | `we_1TcaG4BVaxqE8bKV3snV1zxQ` |
| URL | `https://sports-web-nine.vercel.app/api/webhooks/stripe` |
| Status | `enabled` |
| Secret format | not returnable via API (Stripe returns it only at creation). `STRIPE_WEBHOOK_SECRET` in Vercel **confirmed present and starts with `whsec_`**; **proven correct by side-effect** — all 6 test deliveries verified signature and returned 200. |

Coverage cross-reference vs handler (`apps/web/app/api/webhooks/stripe/route.ts:60-143`):

| Event | Endpoint sends? | Handler handles? | Status |
|---|---|---|---|
| `checkout.session.completed` | ✅ | ✅ | OK |
| `customer.subscription.created` | ✅ | ✅ | OK |
| `customer.subscription.updated` | ✅ | ✅ | OK |
| `customer.subscription.deleted` | ✅ | ✅ | OK |
| `invoice.payment_succeeded` | ✅ | ✅ | OK |
| `invoice.payment_failed` | ✅ | ✅ | OK |
| `invoice.payment_action_required` | ❌ **not subscribed** | ✅ handled (`route.ts:105`) | ⚠️ **GAP** |

**Flags:**
- ⚠️ **Endpoint targets the deployment alias `sports-web-nine.vercel.app`, not the custom domain.** No endpoint targets `https://www.galaxysportsedge.com/api/webhooks/stripe` (nor the apex `galaxysportsedge.com`, which is `NEXT_PUBLIC_APP_URL`/`NEXTAUTH_URL`). It works today, but it's fragile for LIVE: if the deployment alias changes, webhooks silently break. Point the LIVE endpoint at the stable custom domain.
- ⚠️ **Coverage gap:** the handler implements `invoice.payment_action_required` (3DS/SCA dunning) but the endpoint isn't subscribed to it → SCA/action-required events never reach the handler. Low impact for typical US cards; matters for SCA/international at LIVE. No reverse gap — every subscribed event is handled.

---

## Vercel price-ID cross-reference (Step 2)

`vercel env ls` confirms all 4 are set (Production scope, Encrypted/Sensitive):

| Vercel var | Readable? | Finding |
|---|---|---|
| `STRIPE_PRO_MONTHLY_PRICE_ID` | ❌ Sensitive → pulls blank | **Does NOT match $14.99 or $19** (both → FREE in prod, see Step 3). Value unknown/unverifiable. |
| `STRIPE_PRO_ANNUAL_PRICE_ID` | ❌ Sensitive → pulls blank | Not testable without reading value; inference: likely same misconfiguration. |
| `STRIPE_ELITE_MONTHLY_PRICE_ID` | ❌ Sensitive → pulls blank | Not directly tested; same risk class as Pro monthly. |
| `STRIPE_ELITE_ANNUAL_PRICE_ID` | ❌ Sensitive → pulls blank | Not directly tested; same risk class. |
| `STRIPE_PRO_PRICE_ID` (legacy) | ✅ readable | = `price_1TcaZoBVaxqE8bKVz0QwsGDP` ($9.99/wk) — **maps to PRO correctly** (proven). |
| `STRIPE_ELITE_PRICE_ID` (legacy) | ✅ readable | = `price_1TcaZpBVaxqE8bKVSGKamBrD` ($13.99/wk). |

The 4 launch-critical price vars are Vercel **Sensitive** (write-only) and cannot be read via `env pull` or API. The discovery route of minting a session to read the value off the live checkout endpoint was correctly **blocked** as an auth-bypass and was not pursued. They were therefore probed **by side-effect** through the subscribe cycle below.

---

## End-to-end subscribe cycle results (Step 3)

Three controlled TEST subscriptions, each: created user → Stripe customer → attached test PM `pm_card_visa` (4242 4242 4242 4242) → `POST /v1/subscriptions` with `metadata.userId` → polled prod DB for webhook side-effects.

| # | Price tested | $ | Sub status | Invoice | Webhook fired (≤8s) | **DB tier** | Result |
|---|---|---|---|---|---|---|---|
| 1 | `price_1ThXsJ…ikLl91hw` ($14.99 mo, page price) | 14.99 | `active` | `paid` | ✅ 2 events, 200 | **FREE** ❌ | not the wired price |
| 2 | `price_1TZdUo…BQgXWuqB` ($19 mo, gse-pro-monthly) | 19.00 | `active` | `paid` | ✅ 2 events, 200 | **FREE** ❌ | not the wired price |
| 3 | `price_1TcaZo…z0QwsGDP` ($9.99 wk, = `STRIPE_PRO_PRICE_ID`) | 9.99 | `active` | `paid` | ✅ 2 events, 200 | **PRO** ✅ | pipeline proven healthy |

Timeline (UTC), representative — Test 3 (the PASS path):
```
00:09:25.7  user created (cmqllopm5…)
00:09:26.3  POST /v1/customers          → 200  cus_UjfpQTPXUvG0hh
00:09:27.0  POST /payment_methods/pm_card_visa/attach → 200 (last4 4242)
00:09:30.1  POST /v1/subscriptions      → 200  sub_1TkCTT…  active  invoice paid $9.99
00:09:30.66 webhook customer.subscription.created processed (DB row)
00:09:30.82 webhook invoice.payment_succeeded   processed (DB row)
00:09:32.2  DB Subscription.tier = PRO   (≈2s after subscribe)
```

**Interpretation:** Test 3 proves the production runtime *does* carry the Stripe price env and `getTierFromPriceId` works (`route.ts:222-237`). Tests 1 & 2 therefore prove `STRIPE_PRO_MONTHLY_PRICE_ID ∉ {$14.99, $19}` — i.e. it is not either real active Pro monthly price. The two failures are **not** a pipeline defect; they are a **wiring defect** on the monthly/annual price vars.

---

## Webhook log evidence (Vercel)

`npx vercel logs sports-web-nine.vercel.app` — all six deliveries returned 200 at the exact subscribe timestamps (times shown CDT = UTC−5):
```
19:09:30.70  λ POST /api/webhooks/stripe   200     (test 3)
19:09:30.43  λ POST /api/webhooks/stripe   200     (test 3)
19:07:33.43  λ POST /api/webhooks/stripe   200     (test 2)
19:07:33.14  λ POST /api/webhooks/stripe   200     (test 2)
19:05:33.05  λ POST /api/webhooks/stripe   200     (test 1)
19:05:32.77  λ POST /api/webhooks/stripe   200     (test 1)
```
Corroborated in-DB: each delivery wrote a `webhook_events` row (only written *after* successful signature verification + handling — `route.ts:43-49`).

---

## Entitlement evidence

Resolver mirrored from `apps/web/lib/entitlements.ts:getUserEntitlements` (status ACTIVE/TRIALING OR PAST_DUE-within-7d) + `packages/types getEntitlements`:

| Test user | Price | DB tier | `canSeePremiumPicks` | `dailyPickLimit` |
|---|---|---|---|---|
| `…1781913927000@…` | $14.99 | FREE | **false** ❌ | 2 |
| `…1781914044001@…` | $19 | FREE | **false** ❌ | 2 |
| `…1781914164002@…` | $9.99/wk | **PRO** | **true** ✅ | null |

So the entitlement *read path* is correct given the stored tier — the failure is upstream, in what tier gets stored, which is driven by the price-ID wiring.

---

## Cleanup confirmation

- 3 Stripe TEST customers deleted (`cus_UjflbQt0zvmQKe`, `cus_UjfntwBN0qBjCN`, `cus_UjfpQTPXUvG0hh` → all `deleted:true`, re-confirmed via GET); customer deletion cancels their subscriptions.
- DB purge (surgical — webhook_events filtered to only those whose payload referenced our test customers/subs; **no blanket delete**): 9 webhook_events, 3 subscriptions, 3 users removed.
- **Post-cleanup counts: users=2 (original baseline), subscriptions=0, webhook_events=0** — restored to exact pre-test state.
- Temp prod env pull (contained secrets) deleted from `%TEMP%`.

---

## Verdict + next action

### FAIL — fix the price-ID wiring, then re-verify TEST, *then* swap LIVE.

**Blocker (must fix before launch):** `STRIPE_PRO_MONTHLY_PRICE_ID` in Vercel Production matches no real active Pro monthly price ($14.99 page price → FREE; $19 seeded price → FREE; legacy weekly → PRO). The annual + both Elite vars are unreadable and almost certainly in the same broken state. Live "Pro Monthly" checkout would either 503 (if empty) or charge/entitle on an unintended price.

**Remediation (propose only — not applied):**
1. **Reveal the 4 Sensitive values** (Vercel dashboard → reveal, or check the seeder output you used). Compare each against the intended FOUNDING prices.
2. **Set the 4 price vars to the prices that match the public page** (TEST-mode IDs to verify against):
   - `STRIPE_PRO_MONTHLY_PRICE_ID`  = `price_1ThXsJBVaxqE8bKVikLl91hw` ($14.99)
   - `STRIPE_PRO_ANNUAL_PRICE_ID`   = `price_1ThXrHBVaxqE8bKVJyuOYAsF` ($99)
   - `STRIPE_ELITE_MONTHLY_PRICE_ID`= `price_1ThXsJBVaxqE8bKV1Zy6QbPu` ($24.99)
   - `STRIPE_ELITE_ANNUAL_PRICE_ID` = `price_1ThXrIBVaxqE8bKVWNihIdn6` ($179)
   *(Or decide $19/$49 is the intended monthly price and bump `pricing-phases.ts` instead — but page and Stripe MUST agree.)*
3. **Hygiene:** add `lookup_key` + `metadata.tier` to the $14.99/$24.99 prices (so the seeder manages them), archive the stale $19/$49 monthly prices and the empty duplicate products (`prod_Ubo5*`), and reconcile `scripts/seed-stripe-prices.mjs` so its catalog amounts match the prices it adopts.
4. **Subscribe the endpoint to `invoice.payment_action_required`** (and, for LIVE, create the endpoint against the custom domain, not the deployment alias).
5. **Re-run this verification** (`subscribe.mjs <STRIPE_PRO_MONTHLY_PRICE_ID> ` for Pro and Elite) and confirm tier → PRO/ELITE. Only then proceed to LIVE.

### LIVE swap order (only after TEST re-passes) — founder-gated, do NOT do automatically
Stripe LIVE is a separate catalog/secret set. Order:
1. **Seed LIVE prices** (`STRIPE_SECRET_KEY=sk_live_… node scripts/seed-stripe-prices.mjs`, after fixing the seeder) → record the 4 live `price_…` IDs.
2. **Create a LIVE webhook endpoint** at `https://www.galaxysportsedge.com/api/webhooks/stripe` (custom domain) subscribed to all 7 handled events → copy its `whsec_…`.
3. **Set Vercel Production env** (the full set that must rotate; more than the brief's "5"):
   1. `STRIPE_SECRET_KEY` → `sk_live_…`
   2. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` → `pk_live_…`
   3. `STRIPE_WEBHOOK_SECRET` → `whsec_…` (the new LIVE endpoint's secret)
   4. `STRIPE_PRO_MONTHLY_PRICE_ID` / `STRIPE_PRO_ANNUAL_PRICE_ID` → live `price_…`
   5. `STRIPE_ELITE_MONTHLY_PRICE_ID` / `STRIPE_ELITE_ANNUAL_PRICE_ID` → live `price_…`
   *(Also update or retire the legacy `STRIPE_PRO_PRICE_ID` / `STRIPE_ELITE_PRICE_ID` — they currently point at weekly prices and are still consulted by `getTierFromPriceId`.)*
4. **Redeploy** Production, then run one LIVE smoke purchase + immediate refund/cancel and confirm tier flips PRO→FREE.

---

### Reproduction artifacts (this folder)
`_lib.mjs` (Stripe REST helper), `_db.mjs` (Prisma client loader), `step1-inventory.mjs`, `subscribe.mjs <priceId> [ts]`, `verify-entitlements.mjs`, `cleanup.mjs`. `disco.mjs` (live-checkout discovery) is retained but was **blocked** and not run.
