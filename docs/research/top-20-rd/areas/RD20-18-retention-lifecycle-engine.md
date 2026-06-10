# RD20-18: Retention Lifecycle Engine

Status: R&D handoff
Priority: P1
Horizon: Growth system
Owner mode: Analytics + lifecycle

## Strategic Thesis

GSE should treat retention as product infrastructure: activation events, lifecycle stages, weekly cadence, digests, message caps and privacy-safe personalization.

## Why This Matters Now

Sports and fantasy products are seasonal. Without lifecycle design, users churn between slates, seasons and draft windows.

## Competitor Pressure

Sportsbooks and fantasy media spend heavily on lifecycle marketing. GSE cannot outspend them; it needs sharper habit loops.

## Current Repo Anchors

- docs/research/gse-retention-growth-finance-market-research.md
- docs/email-sequences/welcome-flow.md
- docs/content-surfaces.md

## External Sources

- [Braze 2026 Customer Engagement Review](https://www.braze.com/press-releases/the-2026-braze-customer-engagement-review-ai-innovation-meets-the-trust-plateau) - Trust gap and privacy risk in AI-assisted customer engagement.
- [Amplitude mastering retention](https://amplitude.com/books/mastering-retention/current-user-retention) - Retention analysis through activation and habit-forming behaviors.
- [Optimove sportsbook retention reports](https://www.optimove.com/resources/reports) - Sportsbook retention, lifecycle and segmentation research.
- [Baymard checkout UX research](https://baymard.com/blog/current-state-of-checkout-ux) - Conversion lift evidence for removing friction from checkout.

## Product Surfaces

- onboarding
- weekly digest
- What Changed email
- pricing/onboarding flow
- reactivation series
- analytics cockpit

## Data Inputs

- activation events
- watchlists
- scenario saves
- optimizer imports
- digest opens
- tier state
- privacy preferences

## R&D Questions

- What is the first meaningful value moment?
- Which event predicts D7 return?
- How do we message without fatigue?
- What happens in offseason?

## MVP Plan

1. Retention event taxonomy
2. activation funnel definition
3. weekly NFL cadence map
4. email/in-app digest spec

## V1 Plan

1. Instrument core events
2. activation dashboard
3. weekly digest builder
4. trial/upgrade lifecycle copy

## V2 / Moat Plan

1. Personalized lifecycle orchestration
2. cohort-based retention experiments
3. offseason best-ball loop
4. winback campaigns

## Claude Build Tasks

1. RD20-18-01: Create analytics event taxonomy docs
2. RD20-18-02: Define activation and habit metrics
3. RD20-18-03: Draft lifecycle message map
4. RD20-18-04: Specify privacy and frequency caps
5. RD20-18-05: Create dashboard requirements for retention cockpit

## Acceptance Criteria

- Every lifecycle message maps to a user action or source event
- Frequency caps exist
- Users can control notifications
- Activation metrics are defined before paid acquisition

## Risk Register

- Message fatigue
- privacy misuse
- vanity metrics
- paid acquisition before retention

## Metrics To Track

- activation rate
- D7/D30 retention
- digest open/click rate
- free-to-paid conversion
- churn by plan

## Handoff Note

Claude should implement this area in docs/spec form first unless the task card explicitly calls for code. Production code changes require source, entitlement, brand-safety and test gates to be named before editing.
