# Stripe Webhook Decisioning — Spec (R&D-extract scaffold)

> **Status:** scaffold. Owner Pass 13 verified a P0 silent priceId-
> downgrade bug in this primary tree at
> `apps/web/app/api/webhooks/stripe/route.ts:184-188` (see
> `docs/ops/issue-queue.md`). Codex's `getStripeCheckoutSessionDecision`
> in the OneDrive clone is the canonical fix. This spec captures the
> fix shape so it can be implemented in the primary tree as Tier-1
> commit 1.3 of the owner's port plan, or by a future Claude/Codex
> session if the port plan is re-routed.
>
> Master plan reference: Part 4 non-negotiable #3 (entitlements
> server-side); Part 7 verification rituals (every commit lint +
> typecheck + build + test green).
>
> Sibling specs: `email-lifecycle-spec.md`,
> `referral-attribution-spec.md`.

## The bug being fixed

`apps/web/app/api/webhooks/stripe/route.ts` line 184-188:

```typescript
function getTierFromPriceId(priceId: string | undefined):
  "FREE" | "PRO" | "ELITE" {
  if (priceId === process.env["STRIPE_ELITE_PRICE_ID"]) return "ELITE";
  if (priceId === process.env["STRIPE_PRO_PRICE_ID"]) return "PRO";
  return "FREE";
}
```

Two correctness holes:

1. **Silent downgrade.** Unknown priceId → returns FREE. New Stripe
   priceId (admin updated pricing, A/B test, tier ladder change) +
   stale env vars = every paid user who hits a webhook gets silently
   downgraded.
2. **Undefined-equality.** `STRIPE_ELITE_PRICE_ID` unset (returns
   `undefined`) AND incoming `priceId` undefined → returns ELITE for
   a user with no actual price.

## The fix shape

Replace the binary string-compare with a structured decision function:

```typescript
// lib/billing/checkout-decision.ts (new file)
export type StripeCheckoutSessionDecision =
  | {
      action: "set-tier";
      tier: "FREE" | "PRO" | "ELITE";
      reason: "matched-env-elite" | "matched-env-pro" | "explicit-free";
    }
  | {
      action: "review-required";
      reason: "unknown-price-id" | "missing-env-var" | "ambiguous-undefined-equality";
      observedPriceId: string | undefined;
      hint: string; // operator-readable next step
    };

export function getStripeCheckoutSessionDecision(
  priceId: string | undefined,
  env: {
    elitePriceId: string | undefined;
    proPriceId: string | undefined;
  }
): StripeCheckoutSessionDecision {
  // Guard: refuse to compare against an unset env var (defense against
  // the undefined === undefined hole).
  if (env.elitePriceId && priceId === env.elitePriceId) {
    return { action: "set-tier", tier: "ELITE", reason: "matched-env-elite" };
  }
  if (env.proPriceId && priceId === env.proPriceId) {
    return { action: "set-tier", tier: "PRO", reason: "matched-env-pro" };
  }
  if (!priceId) {
    return {
      action: "review-required",
      reason: "ambiguous-undefined-equality",
      observedPriceId: priceId,
      hint:
        "Stripe webhook arrived with no priceId. Inspect event payload " +
        "and decide manually before mutating Subscription.tier.",
    };
  }
  if (!env.elitePriceId || !env.proPriceId) {
    return {
      action: "review-required",
      reason: "missing-env-var",
      observedPriceId: priceId,
      hint:
        "STRIPE_ELITE_PRICE_ID or STRIPE_PRO_PRICE_ID is unset. " +
        "Set the env var or confirm intentional downgrade.",
    };
  }
  return {
    action: "review-required",
    reason: "unknown-price-id",
    observedPriceId: priceId,
    hint:
      `Price ID ${priceId} matches neither STRIPE_ELITE_PRICE_ID nor ` +
      `STRIPE_PRO_PRICE_ID. Likely a new Stripe price was issued. Map ` +
      "it to a tier, update env vars, or confirm intentional downgrade.",
  };
}
```

Pure function. No side effects. Trivially testable against fixtures
covering every branch. Lives at `lib/billing/checkout-decision.ts` so
the webhook route imports it and the new admin review surface
(`/cockpit/billing-review`) can call it too.

## Integration in the webhook handler

`apps/web/app/api/webhooks/stripe/route.ts` `syncSubscription()`
becomes:

```typescript
async function syncSubscription(
  stripeSubscription: Stripe.Subscription
): Promise<void> {
  // ... existing customerId resolution ...
  const priceId = stripeSubscription.items.data[0]?.price.id;
  const decision = getStripeCheckoutSessionDecision(priceId, {
    elitePriceId: process.env["STRIPE_ELITE_PRICE_ID"],
    proPriceId: process.env["STRIPE_PRO_PRICE_ID"],
  });

  if (decision.action === "review-required") {
    // Persist the review-required event WITHOUT mutating
    // Subscription.tier. Operator reconciles in /cockpit/billing-review.
    await db.webhookEvent.create({
      data: {
        stripeEventId: `review-required:${stripeSubscription.id}:${Date.now()}`,
        type: "review-required",
        payload: JSON.parse(JSON.stringify({ decision, subscription: stripeSubscription })),
      },
    });
    console.warn(
      `[stripe] Review-required webhook for sub ${stripeSubscription.id}: ` +
      `${decision.reason} — ${decision.hint}`
    );
    return;
  }

  // ... existing tier-set path, now using decision.tier ...
}
```

## Test plan

`apps/web/__tests__/stripe-checkout-decision.test.ts`:

- **happy path**: priceId matches `STRIPE_ELITE_PRICE_ID` → returns
  `{ action: "set-tier", tier: "ELITE", reason: "matched-env-elite" }`.
- **happy path**: priceId matches `STRIPE_PRO_PRICE_ID` → PRO.
- **silent-downgrade guard**: unknown priceId + both env vars set →
  returns `review-required` with `reason: "unknown-price-id"`, NOT
  `set-tier FREE`.
- **undefined-equality guard**: priceId undefined + env vars unset →
  returns `review-required` with `reason: "ambiguous-undefined-equality"`,
  NOT `set-tier ELITE`.
- **missing-env guard**: priceId set but `STRIPE_ELITE_PRICE_ID` unset
  → returns `review-required` with `reason: "missing-env-var"`.
- **pure function**: same inputs always produce same outputs;
  deterministic across calls.

`apps/web/__tests__/stripe-webhook.test.ts` (the dedicated webhook
test already logged as P2 gap):

- **review-required path**: malformed priceId in `customer.subscription.updated`
  payload → no mutation to `Subscription.tier`, WebhookEvent row created
  with `type: "review-required"`, 200 returned to Stripe.
- **happy path**: valid priceId → existing tier-set behavior.

## Admin review surface

`/cockpit/billing-review` (new route, Phase 2 deliverable per master
plan):

- Lists `WebhookEvent` rows where `type === "review-required"`.
- For each: show decision reason, observed priceId, hint, original
  payload (folded JSON), affected user/subscription, two CTAs:
  "Map this priceId to TIER" (writes the new mapping) or "Confirm
  downgrade" (mutates Subscription.tier to FREE intentionally).

## Hard rules

1. **Never silently mutate `Subscription.tier`.** If the decision is
   ambiguous, write to `WebhookEvent.status: "review-required"` and
   leave tier alone.
2. **Pure decision function.** No DB calls, no env reads inside the
   function — env is injected so tests can pass arbitrary states.
3. **Operator-readable hints.** Every `review-required` outcome
   includes a `hint` string explaining the next step.
4. **No regression in idempotency.** The existing
   `webhookEvent.findUnique` idempotency check still gates the whole
   handler. Review-required events use a synthetic event ID to avoid
   colliding with real Stripe event IDs.

## Phase landing

The fix is P0 per `docs/ops/issue-queue.md` and per owner Pass 13.
Lands as Tier-1 commit 1.3 of the owner's port plan when ratified.

If the port plan is re-routed to a Claude autonomous fix instead: the
spec above is implementation-ready. Estimated effort: ~2-3 hours
focused work (new file + test suite + webhook route integration +
cockpit review surface stub + entry in decision-log.md acknowledging
the autonomous-fix path).
