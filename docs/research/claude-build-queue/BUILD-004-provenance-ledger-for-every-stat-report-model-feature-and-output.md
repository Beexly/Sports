# BUILD-004 - Provenance ledger for every stat report model feature and output

## Priority

- Priority: P0
- Difficulty: M
- Category: foundation
- Legal risk: Medium
- Maintenance risk: Medium

## Objective

Build a focused, source-provenanced implementation path for provenance ledger for every stat report model feature and output without changing production behavior until a separate implementation approval exists.

## Source Families

- MANUAL_REVIEW
- OPEN_NFLVERSE
- LICENSED_SPORTS_API
- INTERNAL_MODEL

## Product Surfaces

- ADMIN
- API
- FO

## Suggested Repo Touchpoints

- packages/db/prisma/schema.prisma
- packages/ingestion-pipeline/src/source-snapshot.ts
- apps/web/app/cockpit/sources/page.tsx

## Dependencies

- BUILD-001

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
