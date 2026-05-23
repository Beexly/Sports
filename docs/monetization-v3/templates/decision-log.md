# Decision Log

Use one entry per material decision. Do not delete prior entries.

## Entry Template

Date:
Decision:
Track:
Runway scenario:
Decision type: activate / maintain / intervene / kill / override / defer
Evidence:
Metric threshold:
Owner:
Next review date:
Notes:

## Entry 001

Date: 2026-05-22
Decision: Record current runway scenario before monetization build begins.
Track: Portfolio
Runway scenario: TBD by Garrett
Decision type: defer
Evidence: v3 plan requires runway calibration before track activation.
Metric threshold: N/A
Owner: Garrett
Next review date: Last Friday of current month
Notes: Fill this before authorizing Vault, Almanac, or Live spend.

## Required Next Entries

### DEC-NEXT-001 - Runway Scenario Confirmed

Date:
Decision:
Track: Portfolio
Runway scenario: 6 / 12 / 24+
Decision type: activate / defer
Evidence:
Metric threshold:
Owner: Garrett
Next review date:
Notes:

### DEC-NEXT-002 - Vault Customer Dev Decision

Date:
Decision: GO at $200 / Likely go with retest / Pivot to $150 / Deep pivot / No-go
Track: Vault
Runway scenario:
Decision type: activate / intervene / kill / defer
Evidence:
Metric threshold:
Owner: Garrett
Next review date:
Notes:

### DEC-NEXT-003 - Vault Landing Page Canonical Version

Date:
Decision: Codex draft / Claude variant / merged canonical
Track: Vault
Runway scenario:
Decision type: maintain
Evidence:
Metric threshold:
Owner: Garrett
Next review date:
Notes:

### DEC-NEXT-004 - Vault Founding-50 Cohort Selected

Date:
Decision:
Track: Vault
Runway scenario:
Decision type: activate
Evidence:
Metric threshold:
Owner: Garrett
Next review date:
Notes:

### DEC-NEXT-005 - Almanac Customer Dev Kickoff

Date:
Decision:
Track: Almanac
Runway scenario:
Decision type: activate / defer
Evidence:
Metric threshold:
Owner: Garrett
Next review date:
Notes:

### DEC-NEXT-006 - Almanac Price Tier Confirmed

Date:
Decision: $99 / $79 / digital-only
Track: Almanac
Runway scenario:
Decision type: activate / intervene / defer
Evidence:
Metric threshold:
Owner: Garrett
Next review date:
Notes:

### DEC-NEXT-007 - Live Track Activation

Date:
Decision:
Track: Live
Runway scenario:
Decision type: activate / defer
Evidence:
Metric threshold:
Owner: Garrett
Next review date:
Notes:

### DEC-NEXT-008 - Sketch Outreach Path

Date:
Decision: warm intro / 1099 BD consultant / cold outreach last resort
Track: Live
Runway scenario:
Decision type: activate / defer
Evidence:
Metric threshold:
Owner: Garrett
Next review date:
Notes:

### DEC-NEXT-009 - Referral Program V1 Policy Lock

Date:
Decision: Lock 10% / 12-month referral program policy, or defer referral program
Track: Vault
Runway scenario:
Decision type: activate / defer / override
Evidence:
Metric threshold: Referral share of new Vault signups healthy between 5% and 25%
Owner: Garrett
Next review date:
Notes:

### DEC-NEXT-010 - Press Kit V1 Published

Date:
Decision: Publish / defer Galaxy press kit
Track: Portfolio
Runway scenario:
Decision type: activate / defer
Evidence:
Metric threshold:
Owner: Garrett
Next review date:
Notes:

## Overnight Integration Entries

These entries record Codex maintenance decisions made under Garrett's 2026-05-23 overnight autonomy instruction. They do not activate Vault, Almanac, Live, pricing, hiring, partnerships, or deployment.

### DEC-NEXT-011 - Brand-Safety Normalization Pass

Date: 2026-05-23
Decision: Normalize banned vocabulary in last-24-hour monetization docs using canonical substitutions; no load-bearing phrases required escalation.
Track: Portfolio / brand safety
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: Last-24-hour scan found banned phrasing in brand, audit, Discord, partnership, Almanac, press, knowledge-base, and customer-dev files; substitutions were mechanical and preserved meaning.
Metric threshold: Brand-safety scan returns no matches for the configured banned phrase set.
Owner: Codex; Garrett review optional
Next review date: Next validation pass before launch
Notes: Does not alter canonical landing page under DEC-NEXT-003.

### DEC-NEXT-012 - Monetization Pack Navigation Lock

Date: 2026-05-23
Decision: Reorganize `docs/monetization-v3/README.md` as the pack navigation surface and append recent additions to the root master brief.
Track: Portfolio / documentation
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: Pack grew beyond the stale 141-file brief state; standard validation now checks 159 Markdown files.
Metric threshold: README references every monetization Markdown/CSV artifact or intentional folder index; index sweep returns no unindexed pack files.
Owner: Codex
Next review date: After Claude's next artifact batch lands
Notes: Navigation only; no strategic content rewrite.

### DEC-NEXT-013 - Vault PRD Operational Spec Alignment

Date: 2026-05-23
Decision: Update `product/vault-prd.md` to reference newer operational specs for Discord architecture, day-by-day onboarding, renewal emails, and founder unavailability.
Track: Vault
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: New operational specs were added after the original PRD and define canonical behavior that engineering should follow by reference.
Metric threshold: PRD source operating docs include all four requested operational specs.
Owner: Codex
Next review date: Before Vault engineering kickoff
Notes: References only; no duplicated Claude content.

### DEC-NEXT-014 - Phase-N Scaffold Gap Filing

Date: 2026-05-23
Decision: File Phase-N engineering gaps for missing Vault integration scaffold, missing cron scaffold, missing Discord role automation scaffold, and missing production smoke script.
Track: Vault / engineering
Runway scenario: TBD by Garrett
Decision type: defer
Evidence: `apps/web/lib/vault/`, `apps/web/app/api/cron/`, and `scripts/smoke-prod.sh` were absent or not runnable in this clone.
Metric threshold: Morning peak block has explicit issue queue and engineering issue pack entries before any implementation starts.
Owner: Codex after execution gates clear
Next review date: Morning engineering triage
Notes: No implementation and no deploy were performed.

### DEC-NEXT-023 - Web Proof-Surface Scaffold

Date: 2026-05-23
Decision: Add a compileable Next.js scaffold for Galaxy public proof surfaces before wiring paid Vault integrations.
Track: Portfolio / engineering
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: The monetization docs define `/methodology`, `/loss-room`, `/passes`, `/ledger`, and `/vault` strongly enough to create implementation anchors.
Metric threshold: `npm run typecheck:web`, `npm run build:web`, `npm audit`, and local route smoke pass without deploying.
Owner: Codex; Garrett review optional
Next review date: Before any production deploy
Notes: This scaffold does not replace DEC-NEXT-003 canonical Vault landing copy and does not implement checkout, Discord, email, or member gating.

### DEC-NEXT-024 - Read-Only Production Smoke Scripts

Date: 2026-05-23
Decision: Add read-only production smoke scripts gated by explicit `PROD_BASE_URL`.
Track: Portfolio / engineering
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: The overnight issue queue flagged that `scripts/smoke-prod.sh` was missing or not runnable from this Windows workspace.
Metric threshold: Smoke scripts exist for PowerShell and bash; dry run without `PROD_BASE_URL` exits safely with code 2.
Owner: Codex; Garrett confirms production hostname
Next review date: Morning production-smoke triage
Notes: No production URL was inferred and no production deploy was attempted.

### DEC-NEXT-025 - Vault Integration Scaffold

Date: 2026-05-23
Decision: Add inert Vault integration scaffolds, public seat-count projection, validation-only application intake, and scaffold-only cron routes without live provider side effects.
Track: Vault / engineering
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: Issue queue OPS-2026-05-23-002 and OPS-2026-05-23-003 flagged missing Vault integration and cron scaffolds; `apps/web/lib/vault/`, `apps/web/app/api/vault/`, and `apps/web/app/api/cron/` now provide typed implementation anchors.
Metric threshold: Typecheck, build, and monetization validation pass while Stripe, Discord, email, database writes, member gating, and application persistence remain disabled.
Owner: Codex; Garrett review optional
Next review date: Before Vault execution gates clear
Notes: This does not activate Vault, launch checkout, persist applications, or deploy production behavior.

### DEC-NEXT-027 - Vault API Contract Route Anchors

Date: 2026-05-23
Decision: Add protected Vault API and webhook route anchors with consistent error shapes while keeping member data, webhooks, and writes disabled.
Track: Vault / engineering
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: `product/vault-api-contracts.md` specifies member, digest, office-hours, referral, quarterly-review, Stripe webhook, and Discord webhook surfaces that were not present in the app scaffold.
Metric threshold: Routes compile and return server-side `VAULT_ACCESS_REQUIRED`, `VAULT_WRITE_NOT_ENABLED`, or `VAULT_WEBHOOK_NOT_ENABLED` responses instead of leaking placeholder data.
Owner: Codex; Garrett review optional
Next review date: Before wiring authentication, persistence, or provider SDKs
Notes: This is a route-contract scaffold only. It does not add authentication, Stripe handling, Discord handling, referral payouts, or gated content.

### DEC-NEXT-026 - Web Regression Test Harness

Date: 2026-05-23
Decision: Add a Vitest harness covering pure Vault helper behavior before live provider integrations are wired.
Track: Vault / engineering
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: The clone had build/typecheck validation but no app-level regression harness; the new Vault helpers include pure logic that can be tested safely.
Metric threshold: `npm run test:web`, `npm run typecheck:web`, `npm run build:web`, `npm audit`, and monetization validation pass.
Owner: Codex; Garrett review optional
Next review date: When Stripe, Discord, email, or persistence adapters are implemented
Notes: Test harness does not call external providers or production endpoints.

### DEC-NEXT-028 - Proof Email Capture Validation Scaffold

Date: 2026-05-23
Decision: Add validation-only proof-surface email capture plumbing while keeping subscriber persistence disabled.
Track: Portfolio / engineering
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: Public proof surface monetization spec calls for quiet email capture, but storage and consent handling are not yet implemented.
Metric threshold: Payload validation tests pass; endpoint returns HTTP 501 for valid payloads until persistence is intentionally wired.
Owner: Codex; Garrett review optional
Next review date: Before enabling `PROOF_SURFACE_EMAIL_CAPTURE_ENABLED`
Notes: Does not store emails, send emails, route to checkout, or add paid tracking.

### DEC-NEXT-030 - Contextual Vault CTA Feature Gate

Date: 2026-05-23
Decision: Gate contextual Vault CTA rendering behind `CONTEXTUAL_VAULT_CTA_ENABLED` and add source-link regression coverage.
Track: Portfolio / engineering
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: `product/public-proof-surface-monetization-spec.md` requires contextual CTAs to stay quiet, reversible, and disabled in production until Vault GO.
Metric threshold: Public proof pages compile with CTAs off by default; source-link tests pass.
Owner: Codex; Garrett review optional
Next review date: Before enabling contextual Vault CTAs in production
Notes: This does not add click analytics, checkout routing, or paid tracking.

### DEC-NEXT-031 - Longevity Systems Audit

Date: 2026-05-23
Decision: Add a longevity audit layer that converts slow-failure risks into sensors, thresholds, and hardening backlog items.
Track: Portfolio / operations
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: Vault pre-mortem named underprepared risks around onboarding, brand drift, calibration, founder capacity, and operating cadence.
Metric threshold: Audit creates hardening backlog with P0/P1 items and engineering issue-pack entries for onboarding health, provider heartbeat, and proof-surface freshness.
Owner: Codex; Garrett review optional
Next review date: Before Vault launch checklist Day -7
Notes: Does not authorize deploy, paid integrations, pricing changes, or track activation.
