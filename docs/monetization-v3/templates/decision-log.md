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

### DEC-NEXT-033 - Proof Surface Freshness Metadata

Date: 2026-05-23
Decision: Add static freshness metadata, public freshness JSON, and stale-window tests for Methodology, Loss Room, Pass List, and Ledger.
Track: Portfolio / engineering
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: The longevity audit flagged stale proof surfaces as a slow trust failure, especially once short-form traffic starts routing to them.
Metric threshold: Public proof pages expose restrained freshness text; `/api/proof/freshness` returns all tracked surfaces; stale-window tests pass.
Owner: Codex; Garrett review optional
Next review date: Before routing public short-form traffic to proof surfaces
Notes: Static timestamps are placeholders until source-of-truth update times exist.

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

### DEC-NEXT-032 - Manual Longevity Instruments

Date: 2026-05-23
Decision: Add manual trackers for brand-position drift, founder capacity, and proof-surface freshness before automation exists.
Track: Portfolio / operations
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: Longevity systems audit identified high-risk slow failures that need immediate sensors before a cockpit is built.
Metric threshold: Three usable templates exist and are indexed: weekly brand smoke test, founder capacity ledger, and proof-surface freshness tracker.
Owner: Garrett runs; Codex maintains templates
Next review date: First Friday retrospective after Vault launch
Notes: Creates visibility only; does not change launch gates or public commitments.

### DEC-NEXT-034 - Short-Form UTM Parser

Date: 2026-05-23
Decision: Add strict parser coverage for allowed short-form UTM source, medium, campaign, and draft id values.
Track: Portfolio / engineering
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: `product/public-proof-surface-monetization-spec.md` and `templates/short-form-utm-map.csv` define allowed attribution fields, but the app only had a Vault source-link helper.
Metric threshold: Parser rejects disallowed paid/ad values and accepts approved short-form campaign fields.
Owner: Codex; Garrett review optional
Next review date: Before storing attribution events or publishing short-form tests
Notes: Parser only; no analytics SDK, tracking pixel, checkout route, or public posting automation.

### DEC-NEXT-035 - Production Smoke Public API Coverage

Date: 2026-05-23
Decision: Add read-only public API checks for Vault seat count and proof freshness to the production smoke scripts.
Track: Portfolio / engineering
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: `/api/vault/seat-count` and `/api/proof/freshness` are safe public GET endpoints that future proof-surface and Vault surfaces depend on.
Metric threshold: Smoke scripts include the two public API routes while avoiding POST routes, cron routes, webhooks, checkout, and member-only routes.
Owner: Codex; Garrett confirms production hostname before running against production
Next review date: First production smoke run
Notes: Still no production hostname inferred and no production deploy authorized.

### DEC-NEXT-036 - Environment Readiness Contract

Date: 2026-05-23
Decision: Add an explicit environment variable contract, examples, preflight script, and typed readiness helpers.
Track: Portfolio / engineering
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: Vault launch depends on Stripe, Discord, transactional email, production smoke, scaffold values, and feature flags that should not live only in implementation memory.
Metric threshold: Env contract tests pass; `.env.example` contains placeholders only; preflight script reports missing variables without printing secrets.
Owner: Codex; Garrett supplies real environment values
Next review date: Before Stripe, Discord, or email end-to-end tests
Notes: Does not validate actual secret values or call third-party APIs.

### DEC-NEXT-037 - Public Health Endpoint

Date: 2026-05-23
Decision: Add a read-only `/api/health` endpoint and include it in production smoke.
Track: Portfolio / engineering
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: Production smoke should have a stable JSON liveness contract in addition to page checks.
Metric threshold: Health report tests pass; endpoint appears in the Next route manifest; smoke checks include `/api/health`.
Owner: Codex; Garrett review optional
Next review date: First production smoke run
Notes: Does not inspect providers, mutate data, or expose secrets.

### DEC-NEXT-038 - Launch Readiness Audit Script

Date: 2026-05-23
Decision: Add a repeatable local launch-readiness audit script that runs the core docs, brand, decision-log, web, build, and dependency gates.
Track: Portfolio / engineering
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: Overnight validation required many separate commands; pre-launch needs a single repeatable gate that does not rely on operator memory.
Metric threshold: `npm run audit:launch` runs docs validation, exact brand scan, DEC-NEXT uniqueness, web tests, typecheck, build, and npm audit. Optional flags cover env and production smoke.
Owner: Codex maintains; Garrett runs before launch windows
Next review date: Day -7 Vault pre-launch checklist
Notes: Script does not deploy, mutate production data, create Stripe sessions, assign Discord roles, trigger cron routes, or infer production hostnames.

### DEC-NEXT-039 - Vault Onboarding Health Logic

Date: 2026-05-23
Decision: Add pure first-24-hour onboarding health logic for the Vault post-payment access chain.
Track: Vault / engineering
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: The longevity audit and engineering issue pack both flag silent post-payment access failure as a P0 launch risk.
Metric threshold: Tests cover the 15-minute repair window, day-one dashboard watch signal, and rolling repair failure-rate calculation.
Owner: Codex maintains scaffold; Garrett verifies operational thresholds before launch
Next review date: Before first paid Vault transaction
Notes: Logic only. No provider calls, storage, admin queue, Discord mutation, email send, or production alerting is wired.

### DEC-NEXT-040 - Provider Heartbeat Status Logic

Date: 2026-05-23
Decision: Add pure provider heartbeat status logic for Stripe, transactional email, Discord, private storage, and analytics.
Track: Vault / engineering
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: The longevity audit and engineering issue pack both flag provider drift as a launch risk that would otherwise surface through customer complaints.
Metric threshold: Tests cover healthy, stale, unconfigured, and launch-critical provider-set behavior.
Owner: Codex maintains scaffold; Garrett verifies provider choices before launch
Next review date: Before founding-50 invitations send
Notes: Logic only. No live provider calls, storage, admin cockpit, alerts, Discord mutation, or email sends are wired.

### DEC-NEXT-041 - Admin Repair Task Model

Date: 2026-05-23
Decision: Add pure admin repair-task generation for onboarding health and provider heartbeat failures.
Track: Vault / engineering
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: The launch hardening backlog needs silent partial failures to become visible repair work before they become member complaints.
Metric threshold: Tests cover p0 onboarding tasks, watch-only suppression, and provider stale/unconfigured tasks.
Owner: Codex maintains scaffold; Garrett defines admin cockpit operating cadence
Next review date: Before admin cockpit implementation
Notes: Model only. No persistence, alerts, provider calls, member mutation, assignment workflow, or public exposure is wired.

### DEC-NEXT-042 - Proof Surface Repair Tasks

Date: 2026-05-23
Decision: Convert stale public proof-surface freshness status into internal admin repair tasks.
Track: Portfolio / engineering
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: Proof surfaces are the trust layer for Vault and short-form traffic; stale proof surfaces should become visible operator work before campaigns point traffic at them.
Metric threshold: Tests create a p1 repair task for stale proof surfaces and ignore fresh surfaces.
Owner: Codex maintains scaffold; Garrett owns proof-surface update cadence
Next review date: Before routing short-form traffic to proof surfaces
Notes: Logic only. No persistence, admin cockpit, public CTA, automated content update, or campaign blocking is wired.

### DEC-NEXT-043 - Incident Threshold Logic

Date: 2026-05-23
Decision: Add pure incident-signal evaluation for onboarding repair rate, p0 repair tasks, and stale proof surfaces.
Track: Vault / engineering
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: Repair queues need deterministic escalation rules before alerting is wired, especially during the founding-50 payment window.
Metric threshold: Tests cover the 5 percent onboarding threshold, p0 repair task threshold, stale proof-surface signal, and quiet state.
Owner: Codex maintains scaffold; Garrett defines alert routing before launch
Next review date: Before Day -7 pre-launch verification
Notes: Logic only. No alerts, paging, admin persistence, external incident creation, or data mutation is wired.

### DEC-NEXT-044 - Explainable Vault Entitlement Decisions

Date: 2026-05-23
Decision: Extend Vault entitlement checks with explainable access-state reasons and deterministic time injection.
Track: Vault / engineering
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: Support, cancellation, refund, and Discord role repair flows need to know why access is granted or denied, not just the Boolean outcome.
Metric threshold: Tests cover active/trialing/past-due access, canceled paid-through access, expired/refunded denial, malformed timestamps, no-member state, and founding-member checks.
Owner: Codex maintains scaffold; Garrett confirms support-policy wording
Next review date: Before refund and cancellation webhook implementation
Notes: Logic only. No Stripe calls, refund decisions, Discord role changes, subscription mutation, or support sends are wired.

### DEC-NEXT-045 - Stripe Webhook Decision Logic

Date: 2026-05-23
Decision: Add pure Stripe webhook duplicate-event and action-mapping logic before real webhook mutation.
Track: Vault / engineering
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: Stripe duplicate events can otherwise create duplicate founding numbers, incorrect refunds, or repeated referral clawbacks.
Metric threshold: Tests cover duplicate-event skipping, supported action mapping, and unsupported-event ignore behavior.
Owner: Codex maintains scaffold; Garrett confirms Stripe event list before launch
Next review date: Before Stripe webhook implementation
Notes: Logic only. No signature verification, durable event log, member mutation, refund action, founding seat assignment, or referral payout behavior is wired.

### DEC-NEXT-046 - Founding Seat Assignment Decisioning

Date: 2026-05-23
Decision: Add pure founding-seat assignment decisioning for next-seat, cap-reached, and manual-review states.
Track: Vault / engineering
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: Founding numbers are a trust artifact; duplicate or client-computed numbers would damage the founding-1000 promise.
Metric threshold: Tests cover next assignment, cap reached, duplicate existing numbers, and invalid existing numbers.
Owner: Codex maintains scaffold; Garrett approves cap and waitlist language
Next review date: Before Stripe checkout cap gating
Notes: Logic only. No database transaction, unique constraint, member creation, checkout gating, or waitlist claim flow is wired.

### DEC-NEXT-047 - Vault Lifecycle Email Schedule Logic

Date: 2026-05-23
Decision: Expand Vault lifecycle email schedule logic to cover welcome, retention, and renewal timing with skip rules.
Track: Vault / engineering
Runway scenario: TBD by Garrett
Decision type: maintain
Evidence: Welcome, retention, and renewal copy exists in separate docs; implementation needs one timing contract to avoid cadence drift.
Metric threshold: Tests cover welcome days, retention days, renewal offsets, due-date calculation, inactive-member skips, and healthy-engagement Day 60 skip.
Owner: Codex maintains scaffold; Garrett approves copy before provider load
Next review date: Before transactional email provider implementation
Notes: Schedule only. No email sends, provider calls, durable lifecycle rows, engagement inference, unsubscribe handling, or customer messaging is wired.
