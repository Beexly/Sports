# BUILD-057 - Cluster injury risk to offensive line secondary pass rush skill positions

## Priority

- Priority: P2
- Difficulty: S
- Category: injury_availability
- Legal risk: High
- Maintenance risk: Medium

## Objective

Build a focused, source-provenanced implementation path for cluster injury risk to offensive line secondary pass rush skill positions without changing production behavior until a separate implementation approval exists.

## Source Families

- PUBLIC_LEAGUE
- PUBLIC_TEAM
- LICENSED_SPORTS_API
- OPEN_NFLVERSE

## Product Surfaces

- API
- OPS
- ALERT
- REPORT

## Suggested Repo Touchpoints

- packages/types/src/index.ts
- packages/prediction-engine/src/signal-snapshot.ts
- packages/ingestion-pipeline/src/process-sport.ts

## Dependencies

- BUILD-047
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
