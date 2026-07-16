# Remaining Work Queue

## Safe, highest-leverage sequence

1. **Live record QA**: rerun unit, type, lint, build, guardrails, axe, keyboard, zoom, mobile, and screenshots against one real eligible Game Room record. The owner-only selected-game route now renders Twin, Brain, postgame autopsy, and draft-only Studio package when playback is available; this still needs an eligible persisted row.
2. **Owner-gated persistence proof**: after approval, implement the minimal immutable decision snapshot and pick-specific calibration effect. Use a shadow DB and no-guess backfill policy.
3. **Production correlation**: confirm deployed SHA, public domain reachability, DB health, odds freshness, and cron receipts. Record exact timestamps and row counts; do not infer.
4. **PR completion**: update #112 with the final handoff commit and CI receipts. Mark ready or merge only after required checks and owner review.

## Completed in the selected-game Cockpit slice

- The existing consumer bundle is wired into the owner-only selected-game route.
- Postgame autopsy projection renders only from captured settlement events in the same envelope.
- Studio package renders as read-only `DRAFT_ONLY`, with human-review blockers and no external posting path.

## Stop conditions

- If schema approval is absent, skip migration work and continue with server-only consumer integrations.
- If no eligible record exists, render unavailable and fix the writer/persistence path only with authority; never seed a fake public record.
- If a source lacks customer-display rights, exclude it from public projections.
