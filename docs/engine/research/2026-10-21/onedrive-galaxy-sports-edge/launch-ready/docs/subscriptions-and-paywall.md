# Subscriptions and Paywall

## Tiers

| Tier | Price | Picks | Confidence | Line Movement | Alerts |
|------|-------|-------|------------|---------------|--------|
| Free | $0 | 1/day (confidence hidden) | No | No | No |
| Pro | $19/mo | All picks | Yes | Yes | No |
| Elite | $49/mo | All picks + early access | Yes | Yes | Yes |

## Architecture: Server-Side Enforcement ONLY

**The paywall is NEVER enforced on the client.** Premium content is filtered on the server before it reaches the client. The client receives only what the user is entitled to.

```
Request → API Route → Auth Middleware → Entitlement Check → Filter Data → Response
```

## Stripe Integration

### Products and Prices
- Pro: `STRIPE_PRO_PRICE_ID` (monthly recurring)
- Elite: `STRIPE_ELITE_PRICE_ID` (monthly recurring)

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

```typescript
async function getEntitlements(userId: string): Promise<Entitlements> {
  const subscription = await db.subscription.findFirst({
    where: { userId, status: { in: ['active', 'trialing'] } }
  })
  return {
    tier: subscription?.tier ?? 'FREE',
    canSeePremiumPicks: ['PRO', 'ELITE'].includes(subscription?.tier ?? ''),
    canSeeConfidence: ['PRO', 'ELITE'].includes(subscription?.tier ?? ''),
    canSeeLineMovement: ['PRO', 'ELITE'].includes(subscription?.tier ?? ''),
    canGetAlerts: subscription?.tier === 'ELITE',
    dailyPickLimit: subscription ? null : 1,  // null = unlimited
  }
}
```

## Customer Portal

Users manage subscriptions via Stripe Customer Portal (no custom billing UI needed). A redirect link is generated server-side and opened in new tab.
