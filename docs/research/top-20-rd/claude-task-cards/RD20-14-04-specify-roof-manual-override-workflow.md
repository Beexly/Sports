# RD20-14-04: Specify roof/manual override workflow

Area: RD20-14 - Weather and Stadium Intelligence
Priority: P1
Phase: Phase 2/3

## Suggested Scope

- docs/research/gse-nfl-signal-taxonomy.md
- docs/data/source-provider-module-taxonomy.md
- packages/data-ingestion/src

## Guardrails

- Wrong stadium coordinates
- roof state not available
- overstating weather effect

## Acceptance Criteria

- Weather data shows source and retrieved time
- Stale weather is blocked or labelled
- Roof/surface uncertainty is explicit

## Claude Procedure

1. Read the area brief in docs/research/top-20-rd/areas.
2. Inspect the actual repo files before editing.
3. Prefer docs/spec work first if implementation dependencies are missing.
4. Keep edits narrow and list changed files in the final response.
5. Run the smallest relevant validation command, or explain why this is docs-only.
