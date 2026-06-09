# BUILD-119 - Founder alpha notebook weekly edge hypotheses and validation outcomes

## Priority

- Priority: P3
- Difficulty: XL
- Category: founder_only
- Legal risk: Medium
- Maintenance risk: High

## Objective

Build a focused, source-provenanced implementation path for founder alpha notebook weekly edge hypotheses and validation outcomes without changing production behavior until a separate implementation approval exists.

## Source Families

- MANUAL_REVIEW
- INTERNAL_MODEL
- FOUNDER_NOTES

## Product Surfaces

- FO
- ADMIN
- REPORT

## Suggested Repo Touchpoints

- apps/web/lib/entitlements.ts
- packages/prediction-engine/src/readiness.ts
- docs/source-providers

## Dependencies

- BUILD-109
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
