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
