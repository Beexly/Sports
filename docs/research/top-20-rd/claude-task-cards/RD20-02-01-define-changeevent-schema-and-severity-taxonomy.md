# RD20-02-01: Define ChangeEvent schema and severity taxonomy

Area: RD20-02 - What Changed Engine
Priority: P0
Phase: Phase 1

## Suggested Scope

- docs/brain/signal-ledger.md
- docs/brain/weak-signal-engine.md
- docs/research/nfl-world-state-machine.md
- workers/data-refresh/src/index.ts

## Guardrails

- Notification spam
- False urgency
- Market movement interpreted as inside information

## Acceptance Criteria

- Every change event links before value, after value, source and timestamp
- No notification can be emitted from Tier 5 or Tier 6 as fact
- Users can filter by team, player, game, market and severity

## Claude Procedure

1. Read the area brief in docs/research/top-20-rd/areas.
2. Inspect the actual repo files before editing.
3. Prefer docs/spec work first if implementation dependencies are missing.
4. Keep edits narrow and list changed files in the final response.
5. Run the smallest relevant validation command, or explain why this is docs-only.
