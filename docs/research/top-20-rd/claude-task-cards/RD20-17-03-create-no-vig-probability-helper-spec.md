# RD20-17-03: Create no-vig probability helper spec

Area: RD20-17 - Betting-Adjacent Market Intelligence
Priority: P1
Phase: Phase 2/3

## Suggested Scope

- docs/brain/market-gravity.md
- docs/data/source-provider-module-taxonomy.md
- packages/data-ingestion/src/odds-api-client.ts

## Guardrails

- Regulatory exposure
- provider rights
- tout language

## Acceptance Criteria

- Raw odds redistribution respects provider terms
- No Kelly or stake recommendations public
- Market movement is not labelled sharp money without proof

## Claude Procedure

1. Read the area brief in docs/research/top-20-rd/areas.
2. Inspect the actual repo files before editing.
3. Prefer docs/spec work first if implementation dependencies are missing.
4. Keep edits narrow and list changed files in the final response.
5. Run the smallest relevant validation command, or explain why this is docs-only.
