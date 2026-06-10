# RD20-04-04: Create UI wire spec for lock/exclude/exposure controls

Area: RD20-04 - GSE Optimizer
Priority: P0
Phase: Phase 1

## Suggested Scope

- docs/research/gse-nfl-optimizer-competitor-inventory.md
- docs/research/gse-nfl-optimizer-pattern-analysis.md
- apps/web
- packages/prediction-engine/src

## Guardrails

- Terms violations from scraping
- Overpromising edge
- Slow combinatorial generation

## Acceptance Criteria

- Optimizer accepts only user upload or approved provider data
- Every projection has source/version/freshness
- Generated lineups are reproducible from stored input hash

## Claude Procedure

1. Read the area brief in docs/research/top-20-rd/areas.
2. Inspect the actual repo files before editing.
3. Prefer docs/spec work first if implementation dependencies are missing.
4. Keep edits narrow and list changed files in the final response.
5. Run the smallest relevant validation command, or explain why this is docs-only.
