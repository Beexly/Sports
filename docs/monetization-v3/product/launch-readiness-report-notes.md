# Launch Readiness Report Notes

**Status:** Engineering scaffold. No admin UI yet.
**Related decision:** DEC-NEXT-063

## DEC-NEXT-063 - Add launch-readiness verdict aggregation

**Decision:** Add a pure launch-readiness report helper that combines environment readiness, provider heartbeats, open repair tasks, docs audit status, and production smoke status into one verdict.

**Why now:** Vault now has multiple safety signals. Without a single verdict shape, launch triage can become a checklist scattered across docs, scripts, and logs. The helper keeps the eventual admin cockpit and morning brief aligned.

## Implemented

- [launch-readiness.ts](../../../apps/web/lib/launch-readiness.ts) exposes `getVaultLaunchReadinessReport(input)`.
- [launch-readiness.test.ts](../../../apps/web/lib/launch-readiness.test.ts) covers ready, blocked, and warning verdicts.

## Verdict Rules

- `blocked`: missing launch env, failed docs audit, failed production smoke, stale/unconfigured provider heartbeat, or open P0 repair task.
- `warning`: production smoke not run or open P1 repair task.
- `ready`: no blockers and no warnings.

## Still Unwired

- Admin cockpit display.
- Durable provider heartbeat records.
- Durable repair-task store.
- Production smoke result persistence.

## Guardrail

This helper does not call providers, infer launch approval, deploy code, or activate Vault. It only aggregates already-known signals into a machine-readable verdict.
