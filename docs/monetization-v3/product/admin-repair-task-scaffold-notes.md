# Admin Repair Task Scaffold Notes

**Status:** Engineering scaffold. No persistence or admin UI yet.
**Related decision:** DEC-NEXT-041

## DEC-NEXT-041 - Add admin repair task model

**Decision:** Add pure admin repair-task generation for onboarding and provider heartbeat failures before wiring a cockpit.

**Why now:** Once Vault opens, the dangerous failures are not just failed code paths. They are silent partial failures that need a human-visible repair queue: member paid but no Discord role, email provider stale, webhook heartbeat old, etc.

## Implemented

- [admin-repair-tasks.ts](../../../apps/web/lib/admin-repair-tasks.ts) creates normalized repair task objects from onboarding health and provider heartbeat status.
- [admin-repair-tasks.test.ts](../../../apps/web/lib/admin-repair-tasks.test.ts) covers p0 onboarding tasks, watch-only suppression, and provider stale/unconfigured tasks.

## Task Sources

- `vault_onboarding`
- `provider_heartbeat`
- `proof_surface_freshness` (reserved for the future proof freshness monitor)

## Still Unwired

- Durable repair-task storage.
- Admin cockpit list.
- Assignment, status, and resolution timestamps.
- Incident escalation when p0 tasks breach threshold.

## Guardrail

The repair-task model does not send alerts, mutate member state, call providers, or expose data publicly. It creates local task objects only.
