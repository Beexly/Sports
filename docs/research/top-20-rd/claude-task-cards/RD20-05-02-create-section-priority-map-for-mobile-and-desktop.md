# RD20-05-02: Create section priority map for mobile and desktop

Area: RD20-05 - Player Intelligence Cards
Priority: P1
Phase: Phase 2/3

## Suggested Scope

- docs/brain/entity-graph.md
- docs/brain/fantasy-war-room.md
- docs/performance/player-performance-intelligence.md

## Guardrails

- Overcrowded cards
- stale injury data
- ranking clone behavior

## Acceptance Criteria

- No player card shows fabricated stats
- Unknown is rendered as unknown, not hidden
- Card has source/freshness state per major signal

## Claude Procedure

1. Read the area brief in docs/research/top-20-rd/areas.
2. Inspect the actual repo files before editing.
3. Prefer docs/spec work first if implementation dependencies are missing.
4. Keep edits narrow and list changed files in the final response.
5. Run the smallest relevant validation command, or explain why this is docs-only.
