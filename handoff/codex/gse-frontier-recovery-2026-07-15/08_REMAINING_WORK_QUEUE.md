# Remaining Work Queue

## Safe, highest-leverage sequence

1. **Wire the existing consumer bundle into owner-only surfaces**: use the real `GameRoomPlayback` result to expose the selected-game Twin read model and deterministic “why” certificate in Cockpit. Reuse `requireCockpitAdmin`; return unavailable when playback is null; add no DB table and no fake fixture.
2. **Add postgame consumption without new truth**: on a genuinely settled eligible record, project the existing event stream into the loss/win autopsy view. Do not regenerate reasoning from outcome knowledge.
3. **Keep Studio draft-only**: allow the existing Media control plane to receive the scene package, but retain `autoPublishAllowed: false`, human review, rights/freshness/health gates, and no external send path.
4. **Owner-gated persistence proof**: after approval, implement the minimal immutable decision snapshot and pick-specific calibration effect. Use a shadow DB and no-guess backfill policy.
5. **Live record QA**: rerun unit, type, lint, build, guardrails, axe, keyboard, zoom, mobile, and screenshots against one real eligible Game Room record.
6. **Production correlation**: confirm deployed SHA, public domain reachability, DB health, odds freshness, and cron receipts. Record exact timestamps and row counts; do not infer.
7. **PR completion**: update #112 with the final handoff commit and CI receipts. Mark ready or merge only after required checks and owner review.

## Stop conditions

- If schema approval is absent, skip migration work and continue with the server-only consumer integrations.
- If no eligible record exists, render unavailable and fix the writer/persistence path only with authority; never seed a fake public record.
- If a source lacks customer-display rights, exclude it from public projections.
