# RD20-13-02: Map claim states to source hierarchy

Area: RD20-13 - News Claim Cards
Priority: P1
Phase: Phase 2/3

## Suggested Scope

- docs/brain/claim-governance.md
- docs/media/content-provenance-and-review.md
- docs/content-automation.md

## Guardrails

- Copyright overcapture
- rumor amplification
- medical speculation

## Acceptance Criteria

- Claim card stores metadata, not copied article body
- Tier 5 claims remain cockpit-only
- Contradictions require visible state

## Claude Procedure

1. Read the area brief in docs/research/top-20-rd/areas.
2. Inspect the actual repo files before editing.
3. Prefer docs/spec work first if implementation dependencies are missing.
4. Keep edits narrow and list changed files in the final response.
5. Run the smallest relevant validation command, or explain why this is docs-only.
