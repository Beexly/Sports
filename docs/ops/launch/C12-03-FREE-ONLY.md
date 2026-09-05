# C12-03 — PART 4: Making Free-Only Real

Runtime: agent (filesystem + shell). Enumeration run this session against
`hermes/c12-close-the-pass` @ `4e5a58963` + WIP. The switch list below is VERIFIED, not guessed.

## 4.1 — Every path to a paid checkout, enumerated [VERIFIED]

Searched: `checkout.sessions.create` / `checkoutSession` / `stripe.checkout` across `apps/web`,
plus every reference to `api/subscriptions/checkout` outside tests.

**There is exactly ONE code path that creates a Stripe Checkout Session:**
`apps/web/app/api/subscriptions/checkout/route.ts` (POST). Everything else calls it.

UI callers of that endpoint:
1. `apps/web/components/pricing/subscribe-button.tsx:134` — `POST /api/subscriptions/checkout`.
   Mounted on: `/pricing` (plans grid) and `/launch` (founding page CTA).
2. `/dashboard` upgrade prompts — render through the same SubscribeButton/tier-gate panel
   (`components/pricing/tier-gate-panel.tsx`), same single endpoint.

Dead ends checked and ruled out [VERIFIED absent]:
- Marketing/transactional email links to checkout: **no marketing email system exists** (only the
  settlement-outbox worker sends mail, and it links to the site, not to checkout).
- Other Stripe session creation: only `subscriptions/portal` (billing portal, existing customers
  only — cannot create a subscription) and `webhooks/stripe` (inbound only).
- Deep links: any hand-typed POST still lands on the same route — covered by the choke below.

## 4.2 — The change that closes every path

**Landed in this pass** (not recommended — merged): `apps/web/lib/billing/paid-checkout.ts` +
guard at the top of the checkout POST handler (`route.ts:59`), BEFORE auth/session lookup so the
closed state costs zero DB/Stripe work:

```ts
if (!paidCheckoutOpen()) {
  return NextResponse.json(
    { error: "Paid plans are opening soon. Everything free stays free — the board, stats, and alerts are open today.",
      code: "paid_checkout_closed" },
    { status: 503 },
  );
}
```

`paidCheckoutOpen()` closes only on the literal trimmed, lowercased `"false"` of
`PAID_CHECKOUT_OPEN`. Because the choke is server-side and singular, every surface in 4.1 —
including deep links and future callers — is closed by one variable. The billing portal
(`/api/subscriptions/portal`) is deliberately NOT gated.

Test pinning: `__tests__/subscriptions-checkout-route.test.ts` grew closed-state rows; part of the
34-test file, all green (116/116 run).

## 4.3 — The ONE-LINE REVERT

Deleting `PAID_CHECKOUT_OPEN` from the Vercel environment (Project → Settings → Environment
Variables → remove → redeploy) re-opens paid checkout. One action, no code. Setting it to any other
value (e.g. `"true"`) also opens. The revert is genuinely one line because the default is OPEN and
only the literal string `"false"` closes.

## 4.4 — What an EXISTING paying subscriber sees

Nothing breaks, by construction:
- Their entitlements resolve from the existing Stripe subscription via webhook sync; free-only
  changes no entitlement code.
- They can still open the billing portal (`/api/subscriptions/portal` → `createPortalSession`) to
  manage or cancel — deliberately left open while new checkout is closed.
- The checkout route's existing double-billing guard redirects live subscribers to the portal before
  the choke would matter, so a paying user who clicks an upgrade CTA sees their portal, not a 503.
- A NEW subscription from an existing customer (e.g. adding Elite) is blocked like any new checkout —
  that is the intended meaning of free-only.

[VERIFIED: portal route read this session; keys live since 2026-07-09 — whether any subscriber exists
is a Stripe-dashboard question, not answerable from the repo. Check: Stripe dashboard → Customers.]

## 4.5 — What free-only does NOT fix

S3 (minors) and S10 (ESPN rights) do not care whether money changed hands — both survive the
free-only decision. That is why both also got fixes in C12-02: the age gate ships always-on, and the
ESPN disclosure is live on /data. Free-only also does not fix the Neon/PITR unknown (C12-01 §2.6) —
no-revenue weeks still lose the database.

## 4.6 — The public sentence

> "Everything on Galaxy Sports Edge is free during our founding window — the board, the stats, and
> the records. Paid tiers open shortly. The engine is a deterministic factor model with every
> factor shown; we're not AI, we're math you can read."

True today (nothing paid is sold), promises no date, and states the model per brand rule 8.
`PAID_CHECKOUT_OPEN=false` pairs with this copy going up.
