# NEXT BUILD — Pricing, Value Architecture, Feature-Gating, Promo, Forecast

Execute this AFTER the owner confirms the pricing model (see OWNER_DECISIONS_NEEDED).
Central test: *A brand-new visitor understands Galaxy's value in 10 seconds, feels
protected from hype/noise/forced action, and knows exactly why each plan costs
more than the one below it.*

## Implementation checklist (16 areas, from the owner brief)

1. **Audit pricing surfaces** — map every route/component/config/copy/CTA/gate
   for plans, locks, promos, checkout, account. Centralize, don't scatter.
2. **Real value ladder** — Free "understand how Galaxy thinks" / Pro "read
   today's board with confidence" / Elite "understand the market behind the
   board" / Operator "run a serious workflow." Each: plain-English promise, who
   it's for, what unlocks, what stays gated, why the next tier exists.
3. **Feature gating system** — each feature: key, display name, plain-English
   explanation, internal description, plan availability, status (live/demo/
   preview/waitlist/planned/disabled), data-readiness, proof requirement,
   compliance risk, value score, competitor analog, UI lock behavior, upgrade CTA.
   Free shows locked value WITHOUT exposing the whole product.
4. **Customer-friendly feature copy** — translate Market Gravity, No-Bet,
   Confidence, CLV, Galaxy Twin, Parlay MRI, Edge Board into grounded premium
   language. No hype.
5. **Pricing page** — hero 10s value prop, trust subhead, plan cards, comparison
   matrix, "What Free includes/excludes," "Why Galaxy gates picks," "How
   confidence works," "What No-Bet means," proof/calibration, founding/promo,
   FAQ, responsible-gaming footer, mobile-first, accessible locked states.
6. **Promo strategy** — config/draft only unless live coupon infra + owner
   approval exist. Codes (see PROMO_CODES_DRAFT): GALAXYFOUNDING, KICKOFF20,
   CFBPREP15, IQUPGRADE, BLACKFIELD30, RETURN15, NOHYPE. Each: audience, offer,
   eligible plans, window, usage limit, stackable:false, compliance copy, owner
   approval, active flag, kill-switch metric.
7. **Forecast scenarios** — worst/base/best/decline/seasonal/churn/promo-overuse/
   data-cost/support-burden. Track free users, Pro/Elite conversion, churn,
   annual adoption, ARPU, MRR, refund risk, support load, data cost, seasonality.
   Label all as assumptions; never guaranteed.
8. **Blind-spot register** — Free gives too much, tiers not differentiated,
   Elite too shallow, Operator too early, promo addiction, confidence confusion,
   "guarantees wins" perception, compliance, fake-live perception, stale data,
   support burden, refund risk, mobile friction, checkout trust, onboarding,
   activation. Each: risk level, why, user symptom, business impact, fix, owner
   decision.
9. **Competitor alignment audit** — map Galaxy features to competitor categories
   (betting intel, odds comparison, picks subs, DFS optimizers, sims, trackers,
   data platforms, fantasy, pro/enterprise). Per feature: analog, match/exceed/
   reframe/avoid, customer job, depth required, proof burden, gate, readiness,
   risk if sold early. A checkbox ≠ a feature.
10. **Onboarding / post-purchase** — success page, first-run, plan-specific
    onboarding, "start here," watchlist prompt, RG reminder, confidence + No-Bet
    explainers, locked/unlocked explanation. First "I get it" within 60s.
11. **Analytics event plan** — pricing_page_view, plan_card_view,
    plan_compare_expand, feature_lock_click, upgrade_cta_click,
    promo_code_apply/success/fail, checkout_start/complete/abandon,
    free_preview_pick_view, locked_pick_click, no_bet_explainer_view,
    confidence_explainer_view, calibration_view, elite_feature_view,
    operator_waitlist_join, cancellation_start/reason_submit. Document each.
12. **Compliance/trust** — banned vs allowed wording (see START_HERE). RG copy on
    paid conversion surfaces. Must keep CI Trust Gate + Brand Safety green.
13. **Implementation** — centralized config, TS type-safe, route metadata,
    tests, run lint/typecheck. Document anything that can't run.
14. **Docs** — full handoff package in this folder.
15. **Owner decisions** — reasonable labeled defaults in code; document the rest.
16. **Final standard** — Free "I can see how they think" / Pro "I can use this
    daily" / Elite "I understand the market better than alone" / Operator "I run
    my whole workflow here." Don't overpromise, fake readiness, leak the paid
    product, weaken compliance, or bury value in jargon.

## Defaults (unless repo logic contradicts)

- Free: max 1 preview signal/day (or sample-only if no live data); full picks &
  reasoning hidden; locked rows visible; methodology + education open.
- Pro: full daily board, core reasoning, basic filters, proof ledger, No-Bet
  reasoning, limited alerts if available.
- Elite: advanced market maps, deeper movement, advanced filters, watchlists,
  calibration reports, CLV if supported, premium Academy + briefings.
- Operator: waitlist by default; never imply live unless implemented.

## Repo anchors (current state)

- Pricing source of truth: `apps/web/lib/pricing/pricing-phases.ts`,
  `apps/web/lib/pricing.ts`, `apps/web/lib/entitlements.ts`,
  `packages/types` (SubscriptionTier, Entitlements).
- Pricing UI: `apps/web/app/pricing/page.tsx`, `apps/web/components/pricing/*`.
- Stripe: `apps/web/app/api/webhooks/stripe/route.ts`,
  `apps/web/app/api/subscriptions/checkout/*`, `scripts/seed-stripe-prices.mjs`.
- Picks/board surfaces: `apps/web/app/picks`, `/board`, `/brief`, `/today`.
- Feature/readiness gates: env flags (PUBLIC_PICKS_ENABLED etc.) + capability
  registry `apps/web/lib/jarvis/capability-registry.ts`.
- Open competing proposal: PR #14 (weekly billing + VIP).
