# Vault Integration Scaffold Notes

**Status:** Inert engineering scaffold.
**Created:** 2026-05-23
**Related decision:** DEC-NEXT-025

## What changed

The repo now has a typed but non-mutating Vault integration scaffold:

- [config.ts](../../../apps/web/lib/vault/config.ts) - Vault product, annual price, cap, and env-derived integration identifiers.
- [types.ts](../../../apps/web/lib/vault/types.ts) - shared membership, checkout metadata, and cron job types.
- [entitlements.ts](../../../apps/web/lib/vault/entitlements.ts) - pure Vault access helpers.
- [discord.ts](../../../apps/web/lib/vault/discord.ts) - deterministic Discord role-assignment planning only.
- [emails.ts](../../../apps/web/lib/vault/emails.ts) - welcome and renewal schedule constants.
- [cron.ts](../../../apps/web/lib/vault/cron.ts) - shared scaffold response for cron routes.
- [api.ts](../../../apps/web/lib/vault/api.ts) - consistent Vault error response helpers.
- [seats.ts](../../../apps/web/lib/vault/seats.ts) - public-safe founding seat count projection.
- [applications.ts](../../../apps/web/lib/vault/applications.ts) - validation-only application intake helper.
- [seat-count route](../../../apps/web/app/api/vault/seat-count/route.ts) - public founding seat count endpoint.
- [apply route](../../../apps/web/app/api/vault/apply/route.ts) - validates application input but returns HTTP 501 until storage is enabled.
- Member-only route anchors under [api/vault](../../../apps/web/app/api/vault) - member, digests, office-hours, referrals, and quarterly reviews return server-side access or write-disabled errors.
- Webhook route anchors under [api/webhooks](../../../apps/web/app/api/webhooks) - Stripe and Discord webhook endpoints return HTTP 501 until signatures, idempotency, and provider clients are wired.
- [vault-welcome-emails route](../../../apps/web/app/api/cron/vault-welcome-emails/route.ts) - inert welcome-email cron endpoint.
- [vault-renewals route](../../../apps/web/app/api/cron/vault-renewals/route.ts) - inert renewal cron endpoint.
- [vault-discord-repair route](../../../apps/web/app/api/cron/vault-discord-repair/route.ts) - inert Discord repair cron endpoint.

Every cron route returns HTTP 501 with a scaffold-only message. No Stripe, Discord, database, or email provider SDK is initialized.

## DEC-NEXT-025 - Add inert Vault integration scaffolds without external side effects

**Decision:** Create typed integration scaffolds so morning engineering can wire Stripe, Discord, email, and cron behavior against concrete files.

**Rationale:** The overnight audit found complete absence of [apps/web/lib/vault](../../../apps/web/lib/vault) and [apps/web/app/api/cron](../../../apps/web/app/api/cron). Leaving those folders empty creates unnecessary implementation ambiguity. Inert scaffolds reduce ambiguity while preserving the launch guardrails.

**Guardrails:**

- No live Stripe session creation.
- No Discord API calls.
- No transactional email sends.
- No database writes.
- No application persistence.
- No member gating changes.
- No production deploy.

**Follow-up:** Replace scaffold-only cron responses with authenticated jobs after Vault execution gates clear.
