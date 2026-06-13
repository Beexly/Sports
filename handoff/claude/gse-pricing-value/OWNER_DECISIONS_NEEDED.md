# Owner Decisions Needed — Pricing & Value

Code ships reasonable, labeled defaults; these are the calls only you can make.
Until decided, the value-architecture config is **inert** (not wired to the live
pricing page), so nothing customer-facing changes without your sign-off.

## 1. Which pricing model is canonical? (BLOCKER for page wiring)
Three exist in the repo:
- **A — Proof-gated phase ladder** (current source of truth, `pricing-phases.ts`):
  FOUNDING Pro $14.99/$99, Elite $24.99/$179 → escalates with proof milestones.
- **B — 4-tier value ladder** (this sprint): Free / Pro / Elite / Operator(waitlist).
  Prices for Pro/Elite match A's FOUNDING. Adds Operator + richer Free preview.
- **C — PR #14**: weekly billing ($14.99/$21.99/$49.99 per week) + a VIP tier.
**Recommendation:** adopt **B layered on A** (already how the config is built — B
reads prices from A). Close/park PR #14 unless you specifically want weekly + VIP.

## 2. Free tier specifics
- Delayed picks vs sample-only? (default: sample/preview only, full picks gated)
- Exact # of free preview signals per day? (default: 1/day or sample-only)

## 3. Operator
- Public waitlist vs hidden? (default: waitlist, shown as "Command")
- Do NOT launch billable Operator until exports/scenario/automation are real.
  (Currently a marketing/waitlist tier only — NOT a billable SubscriptionTier.)

## 4. Annual discounts / promos
- Aggressive vs restrained annual pricing? (current annual ≈ 37–45% below 12×mo)
- Approve any promo codes? All 7 in `promo-codes.ts` are **inactive + unapproved**
  by default. Activating requires: owner approval + live Stripe coupon infra.
- Founding-access end date?

## 5. Billing/policy
- Refund policy? Trial policy?
- Activate live Stripe coupons? (none created yet)

## 6. Feature readiness (affects what we can sell honestly)
- CLV: live, demo, preview, or disabled? (default: preview — only where data supports)
- Galaxy Twin: demo vs live? (default: demo until live data wired)
- Alerts (basic/rich): planned — confirm when to build.

## Owner-only actions (never auto-done)
Changing prices, creating live Stripe coupons, launching Operator billing,
flipping a promo active, changing the public tier structure on the live pricing
page. The pricing-page rewrite to the 4-tier model awaits decision #1.
