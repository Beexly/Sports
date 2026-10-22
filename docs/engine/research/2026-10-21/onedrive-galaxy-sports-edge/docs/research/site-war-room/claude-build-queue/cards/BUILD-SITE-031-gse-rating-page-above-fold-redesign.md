# BUILD-SITE-031: GSE Rating page above-fold redesign

## Duplicate Gate

duplicate_check_status: EXTENSION
matched_existing_ids: BUILD-GV2-011
relation_to_existing: Extends existing design/help/growth/trust work with route-level site implementation.
reason_not_duplicate: GSE Rating page above-fold redesign is scoped to the world-class website/product experience layer and has a concrete route/surface target.
parent_id: BUILD-GV2-011
supersedes_id:
dependency_ids: 
merge_notes: Keep route-specific work here and link to existing help/growth/design cards.

## Goal

GSE Rating page above-fold redesign.

## Why It Matters

Improves visual quality, 10-second clarity, trust, conversion, engagement, retention, performance, or monetization without exposing founder-only methodology.

## Current Problem

The visible workspace does not expose the runnable app. Prior docs identify the need for help, source trust, conversion, education, and design tokens, but route-level implementation needs the real shipping clone.

## Product Surface

- /intelligence/rating

## Customer Value

Users understand what they are seeing, why it matters, where the risk is, and what to do next.

## Business Value

Better activation, more time on site, clearer PRO/ELITE value, safer promotions, stronger trust, and better support deflection.

## Design Direction

Premium sports intelligence command center: cinematic but fast, high contrast, calm reading states, strong hierarchy, sports-native signal language, no casino/tout feel.

## Copy Direction

Human, direct, grounded, no fake certainty, no method leakage, no hype without proof, no guaranteed-betting language.

## Data/Analytics Needed

Use route-specific events from 15-analytics-event-tracking-design.md. Avoid sensitive raw queries or payment data.

## Public/Private Boundary

Public sees reveal-less explanations, confidence-safe language, and last-verified/source cues where appropriate. Founder/admin sees source weights, internal QA, and private methods.

## Legal / Compliance Boundary

No live sportsbook/casino affiliate links, no guaranteed wins, no irresponsible gambling copy, no minors targeting, no legal claims without approval.

## Repo Context

Likely files: real app routes/components/design tokens in the shipping clone. Files to avoid: secrets, billing, production DB, launch gates, private methodology, live affiliate link config.

## Implementation Plan

1. Verify the real clone root, branch, dirty state, framework, package manager, and existing UI conventions.
2. Locate the target route/component.
3. Implement the smallest route-safe change.
4. Add mobile, reduced-motion, accessibility, and empty/loading/error states as relevant.
5. Run typecheck/lint/build or available checks.
6. Capture screenshots before/after where possible.

## Acceptance Criteria

- A new user understands the surface within 10 seconds.
- Mobile layout works.
- Accessibility basics pass.
- No method leakage or betting-hype copy.
- Performance budget is not worsened.
- Rollback is isolated.

## Test Plan

Typecheck, lint, build, route probe, Playwright screenshot, mobile viewport screenshot, keyboard/focus check, reduced-motion check, and copy scan where available.

## Rollback Plan

Revert the isolated component/route/style change or disable behind a feature flag. No production data rollback should be needed.

## Priority

P0

## Difficulty

L

## Risks

Design risk: visual polish without clarity. Performance risk: LOW. Legal risk: LOW. Method leakage risk: HIGH.

## Claude Code Prompt

You are Claude Code in the real Galaxy Sports Edge / GSN shipping clone. Execute only BUILD-SITE-031: GSE Rating page above-fold redesign. First verify repo root, branch, dirty state, package manager, framework, route files, and existing design system. Read docs/research/site-war-room plus matched existing IDs: BUILD-GV2-011. Do not expose founder-only methodology, use fake data, deploy, touch secrets, mutate production DB, change billing, or create live affiliate links. Implement a focused, reversible UX/design improvement; preserve mobile, accessibility, performance, and responsible-gambling boundaries. Run checks and capture before/after screenshots where possible.
