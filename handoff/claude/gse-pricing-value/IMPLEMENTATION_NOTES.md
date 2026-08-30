# Implementation Notes — Pricing Sprint (Increment 1)

## Shipped this increment (config + tests + docs — all green, additive, inert)

- `apps/web/lib/pricing/value-architecture.ts` — 4-tier customer value ladder
  (Free/Pro/Elite/Operator), POSITIONING + EMOTIONAL_VALUE, prices sourced from
  `pricing-phases.ts` FOUNDING (no drift). Operator = waitlist marketing tier
  (NOT a billable SubscriptionTier — no Prisma/Stripe enum change).
- `apps/web/lib/pricing/feature-gates.ts` — feature-gating map: 26 features with
  customer explanation, minTier, status (live/demo/preview/waitlist/planned),
  freePreview + lockBehavior, upgrade CTA. Helpers: getFeature, isFeatureUnlocked,
  featuresForTier, freeVisibleFeatures.
- `apps/web/lib/pricing/promo-codes.ts` — 7 promo codes, all INACTIVE + UNAPPROVED,
  non-stackable, with compliance + kill-switch metadata. No Stripe coupons created.
- `apps/web/__tests__/pricing-value-architecture.test.ts` — 22 tests: ladder order,
  whyNextTier, **Free must not leak the paid product**, price-drift guard vs
  pricing-phases, strict superset per tier, Galaxy-Twin/CLV are Elite+, Operator
  features Operator-only, banned-hype-phrase scan across all customer copy,
  promos inactive-by-default.

Why "inert": none of these modules are imported by a page/route yet, so the live
site is unchanged. They are the backbone the pricing page + locked-state
components will consume once the model is confirmed (Owner Decision #1).

Gates: typecheck 0 · pricing tests 22/22 pass. (Hard entitlements remain
server-enforced via `packages/types` getEntitlements — unchanged.)

## Next increments (in priority order)

1. **Owner confirms pricing model** (see OWNER_DECISIONS_NEEDED #1).
2. **Wire the pricing page** (`apps/web/app/pricing/page.tsx`) to consume
   value-architecture + feature-gates: 10-second hero value prop, 4 plan cards,
   feature comparison matrix, "What Free includes/excludes," "Why Galaxy gates
   picks," "How confidence works," "What No-Bet means," proof/calibration
   section, founding/promo section, FAQ, responsible-gaming footer, mobile-first,
   accessible locked states. (Touches a live, tested page — do deliberately.)
3. **Locked-state components** + upgrade CTAs reading feature-gates lockBehavior.
4. **Onboarding / post-purchase** success + first-run (60s "I get it").
5. **Analytics event plan** (events listed in NEXT_BUILD_PROMPT §11).
6. **Forecast scenarios + blind-spot register + competitor audit** docs.

## Guardrails honored
No banned hype phrases (test-enforced + repo Trust Gate/Brand Safety CI). No
Stripe coupons created. No billable tier added. No change to server-side
entitlements. Free preview deliberately excludes the full board/reasoning.
