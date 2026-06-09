# BUILD-107 - Scenario toggles player inactive roof closed wind spike line move

## Priority

- Priority: P3
- Difficulty: M
- Category: product_engagement
- Legal risk: Low-medium
- Maintenance risk: Medium

## Objective

Build a focused, source-provenanced implementation path for scenario toggles player inactive roof closed wind spike line move without changing production behavior until a separate implementation approval exists.

## Source Families

- INTERNAL_MODEL
- NWS
- LICENSED_SPORTS_API
- USER_INPUT

## Product Surfaces

- PWA
- REPORT
- ALERT

## Suggested Repo Touchpoints

- apps/web/app/picks/page.tsx
- apps/web/app/api/picks/route.ts
- apps/web/lib/entitlements.ts

## Dependencies

- BUILD-097
- BUILD-004

## Implementation Notes

- Start by adding or confirming source provenance, source freshness, and blocked-source behavior.
- Keep model formulas, weights, reveal logic, and source-risk details founder-only unless a product-tier spec explicitly says otherwise.
- Do not scrape NFL, ESPN, sportsbook, social, publisher, or video surfaces. Use approved APIs, licensed feeds, manual review, or explicit owner-approved sources.
- If external data is involved, write adapter tests with mocked responses before any live API usage.

## Acceptance Checks

- A code reviewer can trace every feature value back to source, timestamp, and transformation.
- Missing or blocked sources degrade gracefully and do not generate fake confidence.
- Any public-facing text avoids official affiliation, wagering instruction, medical diagnosis, and copied/proprietary rating language.
- The card can be run as a small Claude Code task with clear files, tests, and rollback scope.
