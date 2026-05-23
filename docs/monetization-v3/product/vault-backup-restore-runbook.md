# Vault Backup and Restore Runbook

**Status:** Engineering runbook. Provider-neutral.
**Related decision:** DEC-NEXT-057

## DEC-NEXT-057 - Require a Vault backup and restore runbook before launch

**Decision:** Treat backup verification and restore rehearsal as launch readiness requirements for Vault persistence.

**Why now:** Vault's highest-trust data is small but sensitive: member access, founding numbers, lifecycle email state, referral attribution, and repair tasks. A database without a rehearsed restore path can still fail the founding cohort if a migration, provider incident, or operator mistake corrupts launch data.

## What Must Be Backed Up

Launch-critical tables:

- `vault_members`;
- `vault_processed_stripe_events`;
- `vault_lifecycle_emails`;
- `vault_referral_attributions`;
- `vault_referral_payouts`;
- `vault_admin_repair_tasks`;
- `vault_audit_events`;
- any auth/user mapping table required to evaluate Vault access.

Non-launch-critical tables can follow the broader app backup policy, but the tables above must be included in the Vault restore rehearsal.

## Minimum Backup Policy

Before founding-50 invitations send:

- point-in-time recovery or equivalent provider backup enabled;
- daily automated backups retained for at least 30 days;
- manual pre-launch snapshot taken immediately before Day 0 send;
- migration rollback or forward-fix path documented for each Vault migration;
- one restore rehearsal completed into a non-production environment.

After public launch:

- continue daily backups;
- keep pre-launch snapshot until at least Day 90;
- run restore rehearsal quarterly;
- run restore rehearsal before any schema change touching Vault access, Stripe webhooks, referrals, lifecycle emails, or repair tasks.

## Restore Rehearsal Checklist

Use a non-production environment.

1. Restore the latest backup or snapshot.
2. Verify `vault_members` row count.
3. Verify founding numbers are unique and sequential where expected.
4. Verify `vault_processed_stripe_events` prevents a known duplicate event from replaying.
5. Verify one active, one canceled-paid-through, one refunded, and one expired member access state.
6. Verify lifecycle email rows preserve statuses and scheduled timestamps.
7. Verify referral attribution and payout rows preserve accrued/paid amounts.
8. Verify open repair tasks remain open.
9. Run `npm run audit:launch`.
10. Record rehearsal result in the decision log or weekly engineering log.

## Restore Decision Tree

### Case 1: Migration failed before launch traffic

Default action: restore snapshot or rollback migration. Do not send founding-50 invitations until restored state passes rehearsal checks.

### Case 2: Checkout writes partially failed

Default action: do not restore the whole database if only a few rows are affected. Use repair tasks and audit events to correct member state manually, preserving Stripe as source of truth.

### Case 3: Stripe webhook replay caused duplicate effects

Default action: stop webhook route, preserve raw event payloads, use `vault_processed_stripe_events` and audit events to identify duplicate mutations, then repair affected rows. Do not delete audit events.

### Case 4: Founding numbers duplicated or skipped

Default action: freeze checkout, export affected rows, preserve paid members' access, and correct under a written decision-log entry. If a member already saw a number, do not silently change it without direct explanation.

### Case 5: Provider outage corrupted lifecycle email state

Default action: preserve member access, pause email worker, mark affected rows as held, create repair tasks, and resume only after provider heartbeat is healthy.

## Data Handling Guardrails

- Never export member data into personal folders or public docs.
- Never paste real emails, Stripe IDs, or Discord IDs into issue text unless the issue tracker is private and access-controlled.
- Redact member identifiers in morning briefs.
- Audit events should be append-only; corrections write new events.
- A restore rehearsal should use production-like structure, not production-visible traffic.

## Pre-Launch Acceptance Criteria

- Backup policy enabled.
- One restore rehearsal completed.
- Rehearsal notes saved privately.
- Founding number uniqueness verified after restore.
- Duplicate Stripe event replay check verified after restore.
- Garrett knows where the latest snapshot lives.

## Still Unwired

- Provider-specific backup configuration.
- Migration tool selection.
- Restore rehearsal environment.
- Private rehearsal log location.

## Guardrail

This runbook does not authorize a provider choice, production migration, deploy, or restore action. It defines the readiness bar the implementation must clear before Vault opens.
