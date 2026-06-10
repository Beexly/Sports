# BUILD-019 - Matchup matrix pass rush protection run game front pace pressure

## Priority

- Priority: P1
- Difficulty: M
- Category: nfl_core
- Legal risk: Low-medium
- Maintenance risk: Medium

## Objective

Build a focused, source-provenanced implementation path for matchup matrix pass rush protection run game front pace pressure without changing production behavior until a separate implementation approval exists.

## Source Families

- OPEN_NFLVERSE
- LICENSED_SPORTS_API
- INTERNAL_MODEL

## Product Surfaces

- SIM
- OPS
- REPORT

## Suggested Repo Touchpoints

- packages/prediction-engine/src/scoring.ts
- packages/prediction-engine/src/game-context.ts
- packages/prediction-engine/src/signal-snapshot.ts

## Dependencies

- BUILD-009
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
