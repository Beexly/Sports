# RD20-07-02: Draft mobile command center wire spec

Area: RD20-07 - Live Slate Command Center
Priority: P1
Phase: Phase 2/3

## Suggested Scope

- docs/product/live-war-room-spec.md
- docs/cockpit-spec.md
- apps/web/app/cockpit
- workers/data-refresh/src/index.ts

## Guardrails

- Performance degradation
- alert overload
- source outage

## Acceptance Criteria

- Live view clearly labels last update time
- Stale data blocks or degrades action language
- Critical interactions have immediate visual feedback

## Claude Procedure

1. Read the area brief in docs/research/top-20-rd/areas.
2. Inspect the actual repo files before editing.
3. Prefer docs/spec work first if implementation dependencies are missing.
4. Keep edits narrow and list changed files in the final response.
5. Run the smallest relevant validation command, or explain why this is docs-only.
