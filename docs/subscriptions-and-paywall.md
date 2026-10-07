# Subscriptions and Paywall

## Tiers

| Tier | Price (FOUNDING) | Picks | Confidence | Line Movement | Alerts |
|------|------------------|-------|------------|---------------|--------|
| Free | $0 | daily teaser, 2/day (confidence hidden) | No | No | No |
| Fantasy | $4.99/mo · $49/yr | fantasy suite; same teaser on the betting board | No | No | No |
| Pro | $14.99/mo · $99/yr | All picks | Yes | Yes | No |
| Elite | $24.99/mo · $179/yr | All picks + CLV ledger | Yes | Yes | Yes |

**Do not quote a price from this table without checking it first.** The amounts
above are the live FOUNDING rung of a proof-gated ladder, and the ladder advances
by operator action (`PRICING_PHASE`). The single source of truth for every amount
is `apps/web/lib/pricing/pricing-phases.ts`. The free daily pick allowance is
owned by `packages/types/src/index.ts` (`dailyPickLimit`) — read it there rather
than from prose.

## Architecture: Server-Side Enforcement ONLY

**The paywall is NEVER enforced on the client.** Premium content is filtered on the server before it reaches the client. The client receives only what the user is entitled to.

```
Request → API Route → Auth Middleware → Entitlement Check → Filter Data → Response
```

## Stripe Integration

### Products and Prices

Checkout resolves a price id **per tier and per interval**
(`apps/web/lib/billing/price-ids.ts`):

- Pro: `STRIPE_PRO_MONTHLY_PRICE_ID` · `STRIPE_PRO_ANNUAL_PRICE_ID`
- Elite: `STRIPE_ELITE_MONTHLY_PRICE_ID` · `STRIPE_ELITE_ANNUAL_PRICE_ID`
- Fantasy: `STRIPE_FANTASY_MONTHLY_PRICE_ID` · `STRIPE_FANTASY_ANNUAL_PRICE_ID`

Only the two **monthly** vars fall back to the legacy `STRIPE_PRO_PRICE_ID` /
`STRIPE_ELITE_PRICE_ID`. The annual vars and both Fantasy vars have no fallback:
leave one unset and that plan is unbuyable.

The amount on each Stripe price must equal the advertised phase amount.
`apps/web/lib/stripe.ts` fails **closed** on a mismatch (GSE-SEC-024) — the
checkout route answers 503 rather than charging a figure the site never
advertised. So a price created off a stale number does not undercharge; it takes
the whole tier offline. Confirm the amount against
`apps/web/lib/pricing/pricing-phases.ts` before creating the price.

Each var may also hold a **comma-separated list**. The first entry is what
checkout charges; every entry is still recognised when classifying an existing
subscription back to a tier, which is how founding members stay grandfathered.
**Prepend a new id — never replace the list.**

### Webhooks Handled
- `customer.subscription.created` → activate subscription
- `customer.subscription.updated` → update tier/status
- `customer.subscription.deleted` → downgrade to free
- `invoice.payment_succeeded` → confirm active
- `invoice.payment_failed` → mark past_due, restrict access

### Webhook Security
- All webhooks verified with `stripe.webhooks.constructEvent()`
- Raw body required (not parsed JSON) for signature verification
- Idempotency: each event ID stored to prevent duplicate processing

## Subscription Lifecycle

```
User signs up → Free tier (immediate)
User subscribes → Stripe checkout → webhook → Pro/Elite tier activated
Payment fails → grace period (3 days) → downgrade to free
User cancels → active until period end → then downgrade to free
User upgrades → immediate access upgrade
User downgrades → access until period end → then new tier
```

## Entitlement Check (server-side)

The real implementation is `getEntitlements()` in `packages/types/src/index.ts`.
It owns every flag and the daily pick allowance, and it covers a tier this
document predates (FANTASY) and flags it never had (`canUseTrendLab`,
`canUseClvLedger`, `canUseFantasyDraftSuite`, …). **Call it — do not reimplement
it from a snippet.**

```typescript
// Sketch of the CALL SITE, not of the entitlement values.
import { getEntitlements } from "@sports/types";

const subscription = await db.subscription.findFirst({
  where: { userId, status: { in: ['active', 'trialing'] } },
});
const entitlements = getEntitlements(subscription?.tier ?? 'FREE');
// entitlements.dailyPickLimit — null means unlimited; the FREE value is defined
// in packages/types/src/index.ts, never in this document.
```

## Customer Portal

Users manage subscriptions via Stripe Customer Portal (no custom billing UI needed). A redirect link is generated server-side and opened in new tab.
