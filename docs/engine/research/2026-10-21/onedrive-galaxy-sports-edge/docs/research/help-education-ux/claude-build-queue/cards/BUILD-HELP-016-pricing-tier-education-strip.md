# BUILD-HELP-016: Pricing tier education strip

## Duplicate Gate

duplicate_check_status: EXTENSION
matched_existing_ids: BUILD-115
relation_to_existing: Extends existing onboarding/help/video/copy queue item with page-level teachability.
reason_not_duplicate: Pricing tier education strip focuses on 10-second comprehension and contextual help coverage, not generic help docs.

## Goal

Pricing tier education strip.

## Why It Matters

Users need to find value in 10 seconds. GSE is proprietary and complex, so every major item needs an immediate explanation, a next action, and a trust-safe media or visual path.

## Product Surface

- pricing
- paywalls

## User Value

Users know what they are seeing, why it matters, how to use it, and what to do next without reading a manual.

## Internal Value

Galaxy Studios, support, product, and growth teams get a repeatable help asset pipeline instead of one-off explanations.

## Legal / Method Boundary

No founder-only methodology leakage. No fake certainty. Promotions/risk surfaces need clear disclosures and responsible-play-safe copy.

## Implementation Plan

1. Verify real app source and existing design system.
2. Add or specify the smallest help pattern for the target surface.
3. Include one short summary, one next action, one trust note, and one media/visual slot.
4. Add mobile and reduced-motion behavior.
5. Add analytics and QA checks where applicable.

## Acceptance Criteria

- A new user understands the item in 10 seconds.
- The item has a help affordance.
- The help text sounds human.
- There is a video, motion, table, visual, or example path.
- Method boundaries are protected.

## Test Plan

Run visual screenshot QA, mobile readability checks, copy audit, reduced-motion check, and help coverage scan.

## Rollback Plan

Remove the isolated component/content entry or hide it behind a feature flag. No data or billing changes.

## Priority

P0

## Difficulty

S

## Claude Code Prompt

You are Claude Code in the real Galaxy Sports Edge / GSN shipping clone. Execute only BUILD-HELP-016: Pricing tier education strip. Verify repo root, branch, dirty state, framework, routes, and design system first. Do not change billing, secrets, launch gates, or proprietary methodology. Add a focused help/education/readability improvement with mobile, accessibility, reduced-motion, human copy, and screenshot QA. Report files changed, checks run, and rollback.
