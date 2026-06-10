# RD20-10: Free/Pro/Elite Entitlement Architecture

Status: R&D handoff
Priority: P0
Horizon: Revenue foundation
Owner mode: Product + gating

## Strategic Thesis

The tier model should be obvious, fair and structurally enforced. Free builds trust, Pro saves time, Elite gives scenario depth and portfolio tools, Founder keeps formulas and experiments private.

## Why This Matters Now

Competitors monetize through premium tools, rankings and community. GSE needs a product split that encourages upgrade without weakening trust or exposing the moat.

## Competitor Pressure

FantasyPros, Footballguys, FTN, Action Network and OddsJam all gate advanced tooling. Free utility is expected; advanced workflow is paid.

## Current Repo Anchors

- docs/subscriptions-and-paywall.md
- apps/web/lib/entitlements.ts
- apps/web/app/api/picks/route.ts

## External Sources

- [FantasyPros premium plans](https://www.fantasypros.com/premium/plans/) - Consensus rankings, league sync, draft and DFS premium pattern.
- [Footballguys premium](https://premium.footballguys.com/) - Long-running premium content and tools bundle reference.
- [FTN tools](https://ftnfantasy.com/tools) - Competitor suite pattern for fantasy, DFS and betting tools.
- [Baymard checkout UX research](https://baymard.com/blog/current-state-of-checkout-ux) - Conversion lift evidence for removing friction from checkout.

## Product Surfaces

- Pricing page
- feature gates
- upgrade modals
- API projection layer
- cockpit entitlement audit

## Data Inputs

- user tier
- feature registry
- source legal state
- public/pro/elite projection rules
- billing state

## R&D Questions

- Which features are genuinely useful for Free?
- What is the minimal Pro moment?
- Which Elite surfaces justify high price?
- How do gates avoid looking manipulative?

## MVP Plan

1. Feature entitlement matrix
2. server-side projection contract
3. upgrade copy rules
4. fixture tier previews

## V1 Plan

1. Route/API gating audit
2. pricing page clarity pass
3. Pro feature activation events
4. billing-state fallback states

## V2 / Moat Plan

1. Usage-based feature trials
2. team/creator plans
3. B2B widget tiers
4. founder control panel

## Claude Build Tasks

1. RD20-10-01: Create FeatureRegistry and TierProjection spec
2. RD20-10-02: Map current entitlements.ts behavior to feature matrix
3. RD20-10-03: Draft pricing page content boundaries
4. RD20-10-04: Design upgrade modal states by blocked feature
5. RD20-10-05: Add tests that hidden fields are removed server-side

## Acceptance Criteria

- Gating is enforced server-side
- Free tier remains useful without exposing paid data
- Upgrade prompts name the value being unlocked
- Founder-only data cannot appear in public API responses

## Risk Register

- Leaky gates
- dark-pattern pricing
- over-gating trust signals
- billing/env blocker

## Metrics To Track

- free activation
- feature-block-to-upgrade conversion
- refund rate
- Pro/Elite retention

## Handoff Note

Claude should implement this area in docs/spec form first unless the task card explicitly calls for code. Production code changes require source, entitlement, brand-safety and test gates to be named before editing.
