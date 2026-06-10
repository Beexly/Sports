# RD20-08-03: Write sample-size gated public copy rules

Area: RD20-08 - Autopsy and Calibration Mode
Priority: P1
Phase: Phase 2/3

## Suggested Scope

- docs/brain/calibration-feedback-loop.md
- docs/product/ledger-and-loss-room-spec.md
- docs/calibration-proposals/FROZEN.md

## Guardrails

- Cherry-picking
- performance claims too early
- automated weight changes

## Acceptance Criteria

- Autopsy references original publication snapshot
- Hindsight is labeled separately from pregame evidence
- Public performance claims stay gated

## Claude Procedure

1. Read the area brief in docs/research/top-20-rd/areas.
2. Inspect the actual repo files before editing.
3. Prefer docs/spec work first if implementation dependencies are missing.
4. Keep edits narrow and list changed files in the final response.
5. Run the smallest relevant validation command, or explain why this is docs-only.
