# RD20-01-03: Create a docs-only ADR for canonical source families and cross-check families

Area: RD20-01 - Source-Provenanced World Model
Priority: P0
Phase: Phase 1

## Suggested Scope

- docs/brain/source-hierarchy.md
- docs/brain/evidence-vault.md
- docs/research/gse-data-architecture-map.md
- packages/data-ingestion/src

## Guardrails

- Over-collecting raw provider payloads
- Treating model output as source truth
- Duplicating truth domains

## Acceptance Criteria

- Every new factor has source_id, retrieved_at, transform_version, freshness_ttl and activation_state
- Public output cannot include a factor without activated source provenance
- Cockpit can explain why a factor is stale, blocked or shadowed

## Claude Procedure

1. Read the area brief in docs/research/top-20-rd/areas.
2. Inspect the actual repo files before editing.
3. Prefer docs/spec work first if implementation dependencies are missing.
4. Keep edits narrow and list changed files in the final response.
5. Run the smallest relevant validation command, or explain why this is docs-only.
