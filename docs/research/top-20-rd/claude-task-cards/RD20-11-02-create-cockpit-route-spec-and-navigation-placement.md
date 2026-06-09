# RD20-11-02: Create cockpit route spec and navigation placement

Area: RD20-11 - Founder-Only Intelligence Layer
Priority: P1
Phase: Phase 2/3

## Suggested Scope

- docs/brain/operator-cockpit-governance.md
- docs/cockpit-spec.md
- apps/web/app/cockpit

## Guardrails

- Formula leakage
- overbuilding cockpit before user value
- unverified competitor claims

## Acceptance Criteria

- Founder-only fields never leave internal routes
- Each experiment has owner, status, source and decision log
- Every provider cost estimate is labelled verified/unverified

## Claude Procedure

1. Read the area brief in docs/research/top-20-rd/areas.
2. Inspect the actual repo files before editing.
3. Prefer docs/spec work first if implementation dependencies are missing.
4. Keep edits narrow and list changed files in the final response.
5. Run the smallest relevant validation command, or explain why this is docs-only.
