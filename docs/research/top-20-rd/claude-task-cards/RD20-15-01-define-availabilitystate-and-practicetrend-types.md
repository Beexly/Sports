# RD20-15-01: Define AvailabilityState and PracticeTrend types

Area: RD20-15 - Injury and Availability Intelligence
Priority: P1
Phase: Phase 2/3

## Suggested Scope

- docs/brain/source-hierarchy.md
- docs/research/gse-source-risk-register.md
- docs/performance/sports-science-evidence-vault.md

## Guardrails

- Medical speculation
- wrong inactive status
- rumor leakage

## Acceptance Criteria

- Official status overrides lower tiers
- Medical diagnosis language is blocked
- Replacement impact is labelled as model estimate

## Claude Procedure

1. Read the area brief in docs/research/top-20-rd/areas.
2. Inspect the actual repo files before editing.
3. Prefer docs/spec work first if implementation dependencies are missing.
4. Keep edits narrow and list changed files in the final response.
5. Run the smallest relevant validation command, or explain why this is docs-only.
