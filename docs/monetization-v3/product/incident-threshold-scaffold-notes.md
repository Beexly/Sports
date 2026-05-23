# Incident Threshold Scaffold Notes

**Status:** Engineering scaffold. No alert transport yet.
**Related decision:** DEC-NEXT-043

## DEC-NEXT-043 - Add incident threshold logic

**Decision:** Add pure incident-signal evaluation for onboarding repair rate, p0 repair tasks, and stale proof surfaces.

**Why now:** Repair tasks are useful only if the worst ones escalate. Before Vault launch, the system needs deterministic thresholds for "this needs operator attention now" even before Slack, email, or admin alerts exist.

## Implemented

- [incident-thresholds.ts](../../../apps/web/lib/incident-thresholds.ts) evaluates incident signals from onboarding failure rate and repair tasks.
- [incident-thresholds.test.ts](../../../apps/web/lib/incident-thresholds.test.ts) covers the 5 percent onboarding threshold, p0 repair tasks, stale proof-surface signals, and quiet state.

## Thresholds

- `onboarding_failure_rate`: p0 when repair-required signups exceed 5 percent.
- `p0_repair_tasks`: p0 when one or more p0 repair tasks exist.
- `proof_surface_staleness`: p1 when proof surfaces exceed freshness windows.

## Still Unwired

- Admin cockpit display.
- Alert routing.
- Incident log persistence.
- Owner assignment and resolution workflow.

## Guardrail

This scaffold does not send alerts, page Garrett, mutate data, or create incidents in external systems. It only returns local incident signals.
