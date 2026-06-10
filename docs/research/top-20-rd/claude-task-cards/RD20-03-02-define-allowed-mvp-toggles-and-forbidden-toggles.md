# RD20-03-02: Define allowed MVP toggles and forbidden toggles

Area: RD20-03 - Scenario Lab
Priority: P0
Phase: Phase 1

## Suggested Scope

- docs/brain/ask-the-brain.md
- docs/product/game-room-spec.md
- docs/research/gse-product-signal-map.md
- packages/prediction-engine/src

## Guardrails

- Users confusing hypothetical with source truth
- Medical speculation
- Slow interactive performance

## Acceptance Criteria

- Scenario output never overwrites verified state
- Every scenario includes changed assumptions
- Hypothetical data is visually and structurally distinct

## Claude Procedure

1. Read the area brief in docs/research/top-20-rd/areas.
2. Inspect the actual repo files before editing.
3. Prefer docs/spec work first if implementation dependencies are missing.
4. Keep edits narrow and list changed files in the final response.
5. Run the smallest relevant validation command, or explain why this is docs-only.
