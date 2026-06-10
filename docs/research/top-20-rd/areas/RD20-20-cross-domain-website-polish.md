# RD20-20: Cross-Domain Website Polish

Status: R&D handoff
Priority: P0
Horizon: Best website standard
Owner mode: Frontend excellence

## Strategic Thesis

To be one of the best websites of 2026, GSE must feel like a high-performance decision OS: fast, dense, accessible, cinematic where appropriate, and frictionless in core flows.

## Why This Matters Now

The best product strategy fails if the interface feels slow, confusing, generic or inaccessible. Web quality itself is a competitive advantage.

## Competitor Pressure

Sportsbooks and consumer apps are mobile-first; DFS tools are powerful but often cluttered. GSE should combine operational density with premium interaction design.

## Current Repo Anchors

- docs/design/component-system-maturity.md
- docs/design/design-md-spec.md
- docs/launch-qa-checklist.md
- apps/web

## External Sources

- [web.dev Interaction to Next Paint](https://web.dev/inp/) - Current responsiveness standard and lifecycle interaction metric.
- [Google Search Central INP launch](https://developers.google.com/search/blog/2023/05/introducing-inp) - INP replaced FID as a Core Web Vital on March 12, 2024.
- [Next.js production checklist](https://nextjs.org/docs/app/guides/production-checklist) - Production performance, security and rendering checklist.
- [Next.js Partial Prerendering](https://nextjs.org/docs/15/app/getting-started/partial-prerendering) - Static shell plus streamed dynamic holes pattern for personalized pages.
- [W3C WCAG 2.2 new success criteria](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/) - Accessibility requirements for target size, focus, dragging and authentication.
- [Baymard checkout UX research](https://baymard.com/blog/current-state-of-checkout-ux) - Conversion lift evidence for removing friction from checkout.

## Product Surfaces

- home/dashboard
- picks
- player/game pages
- optimizer
- Scenario Lab
- pricing
- onboarding
- cockpit

## Data Inputs

- component maturity levels
- Core Web Vitals
- accessibility audits
- route performance
- conversion funnel events
- visual regression

## R&D Questions

- What is the default first screen?
- Which interactions must be instant?
- Where should dense data collapse on mobile?
- Which components are Level 3-ready?

## MVP Plan

1. Website quality scorecard
2. route-level performance budget
3. WCAG 2.2 checklist
4. component maturity audit
5. checkout/onboarding friction review

## V1 Plan

1. Core route polish pass
2. TrustBadge/EvidenceDrawer components
3. mobile optimizer UX
4. pricing and onboarding cleanup

## V2 / Moat Plan

1. Visual regression suite
2. interaction-performance telemetry
3. motion system
4. design system Level 3 promotion workflow

## Claude Build Tasks

1. RD20-20-01: Create route-by-route website quality audit template
2. RD20-20-02: Define performance budgets including INP
3. RD20-20-03: Map WCAG 2.2 checks to components
4. RD20-20-04: Draft mobile layout rules for dense data
5. RD20-20-05: Specify visual regression and screenshot verification

## Acceptance Criteria

- Core interactions provide immediate feedback
- Interactive targets meet WCAG 2.2 minimums
- Routes have performance budgets and loading states
- No text overlaps or responsive breakage on mobile

## Risk Register

- Overdesigned visuals hurting performance
- data density overwhelming users
- accessibility debt
- pricing/onboarding friction

## Metrics To Track

- INP/LCP/CLS by route
- mobile conversion
- task completion time
- a11y issue count
- checkout completion

## Handoff Note

Claude should implement this area in docs/spec form first unless the task card explicitly calls for code. Production code changes require source, entitlement, brand-safety and test gates to be named before editing.
