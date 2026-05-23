# Environment Readiness Contract

**Status:** Engineering-owned. Readiness layer before Vault launch.
**Related decision:** DEC-NEXT-036, DEC-NEXT-055

## DEC-NEXT-036 - Add an explicit environment contract

**Decision:** Treat launch-critical environment variables as an auditable contract instead of scattered implementation knowledge.

**Why now:** The Vault launch path depends on Stripe, Discord, transactional email, proof-surface feature flags, and production smoke tests. Missing one variable can make a Day 0 verification fail in a way that looks like product failure when it is actually configuration drift.

**Implementation:**

- [env-contract.json](../../../apps/web/lib/env-contract.json) is the source of truth for variable names, categories, launch phase, type, examples, and purpose.
- [env-contract.ts](../../../apps/web/lib/env-contract.ts) exposes typed helpers for app/runtime readiness checks.
- [check-env-contract.ps1](../../../scripts/check-env-contract.ps1) performs local preflight checks without printing secrets.
- [.env.example](../../../.env.example) documents placeholder values and keeps production secrets out of source control.

## Launch-Critical Groups

**Stripe**

- `STRIPE_VAULT_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`

**Discord**

- `DISCORD_BOT_TOKEN`
- `DISCORD_GALAXY_GUILD_ID`
- `DISCORD_VAULT_MEMBER_ROLE_ID`
- `DISCORD_VAULT_FOUNDING_MEMBER_ROLE_ID`

**Email**

- `TRANSACTIONAL_EMAIL_PROVIDER`
- `TRANSACTIONAL_EMAIL_API_KEY`
- `TRANSACTIONAL_EMAIL_FROM`

**Storage**

- `DATABASE_URL`

## DEC-NEXT-055 - Add durable storage to launch env contract

**Decision:** Add `DATABASE_URL` as a launch-critical environment variable.

**Why now:** Vault cannot safely open without durable member state, webhook idempotency, lifecycle email rows, repair tasks, and referral attribution. The implementation can still choose the actual database adapter later, but the launch-readiness contract should not pretend storage is optional.

**Guardrail:** This does not choose a database vendor, initialize a client, run migrations, or write records. It only makes durable storage visible in environment preflight checks.

## Guardrail

The contract does not validate the actual secret values or call third-party APIs. It only prevents silent omission. Real integration verification still happens through the Day -7 and Day -5 Vault pre-launch checklist.

## Morning Use

Run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\check-env-contract.ps1 -RequiredFor vault-launch
```

If it fails, fill the missing variables in the target environment before running Stripe or Discord end-to-end tests.
