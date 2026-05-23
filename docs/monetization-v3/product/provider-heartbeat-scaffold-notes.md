# Provider Heartbeat Scaffold Notes

**Status:** Engineering scaffold. No live provider checks yet.
**Related decision:** DEC-NEXT-040

## DEC-NEXT-040 - Add provider heartbeat status logic

**Decision:** Add pure heartbeat status logic for launch-critical providers before wiring live provider checks or an admin cockpit.

**Why now:** The Vault launch path can fail through third-party drift: Stripe webhooks, transactional email, Discord role permissions, private storage access, or analytics ingestion. A stable status model lets the eventual admin cockpit show stale providers before members report access failures.

## Implemented

- [provider-heartbeats.ts](../../../apps/web/lib/provider-heartbeats.ts) defines the launch-critical provider set and stale-window logic.
- [provider-heartbeats.test.ts](../../../apps/web/lib/provider-heartbeats.test.ts) covers healthy, stale, unconfigured, and provider-set behavior.

## Provider Set

- `stripe_webhook`
- `transactional_email`
- `discord_bot`
- `private_storage`
- `analytics_ingestion`

## Stale Windows

- Stripe, email, and Discord: stale after 60 minutes without a successful check.
- Private storage and analytics: stale after 24 hours without a successful check.

## Still Unwired

- Live non-mutating provider checks.
- Durable heartbeat storage.
- Admin cockpit display.
- Incident alerting.

## Guardrail

This scaffold does not call external providers, mutate customer data, send test emails, assign Discord roles, or touch storage. It only defines the state machine.
