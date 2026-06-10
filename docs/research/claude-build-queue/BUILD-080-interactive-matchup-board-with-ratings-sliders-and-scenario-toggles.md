# BUILD-080 - Interactive matchup board with ratings sliders and scenario toggles

## Priority

- Priority: P2
- Difficulty: L
- Category: video_game_analog
- Legal risk: Low-medium
- Maintenance risk: High

## Objective

Build a focused, source-provenanced implementation path for interactive matchup board with ratings sliders and scenario toggles without changing production behavior until a separate implementation approval exists.

## Source Families

- OPEN_NFLVERSE
- INTERNAL_MODEL
- USER_INPUT
- NGS_AGGREGATE

## Product Surfaces

- GAME
- SIM
- PWA
- FO

## Suggested Repo Touchpoints

- packages/prediction-engine/src/scoring.ts
- apps/web/app/picks/page.tsx

## Dependencies

- BUILD-070
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
