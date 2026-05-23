# Ops Issue Queue

Date initialized: 2026-05-23

This queue records production-smoke and operational readiness issues that should be triaged during Garrett's next peak block. Do not treat this file as authorization to deploy.

| ID | Date | Severity | Surface | Finding | Evidence | Recommended owner | Status |
|---|---|---|---|---|---|---|---|
| OPS-2026-05-23-001 | 2026-05-23 | P1 launch-blocking | Production smoke pipeline | Production smoke scripts now exist, but a real production run still requires confirmed `PROD_BASE_URL`. | Added `scripts/smoke-prod.ps1` and `scripts/smoke-prod.sh` under DEC-NEXT-024; dry run without `PROD_BASE_URL` exits safely with code 2. | Codex during next engineering block | Mitigated; pending production URL run |
| OPS-2026-05-23-002 | 2026-05-23 | P1 launch-blocking | Vault integration scaffold | `apps/web/lib/vault/` now has inert typed scaffolds, application validation, and seat-count helpers, but live Stripe, Discord, email, database, persistence, and repair-queue behavior remains unimplemented. | Added scaffold files under DEC-NEXT-025; no external SDK calls or writes exist. | Codex after execution gates clear | Mitigated; implementation pending |
| OPS-2026-05-23-003 | 2026-05-23 | P1 launch-blocking | Vault cron scaffold | `apps/web/app/api/cron/` now has scaffold-only Vault cron routes, but they return HTTP 501 and do not send lifecycle emails or repair Discord roles. | Added scaffold routes under DEC-NEXT-025; build passes. | Codex after execution gates clear | Mitigated; implementation pending |
| OPS-2026-05-23-004 | 2026-05-23 | P1 launch-blocking | Vault referral program | Referral attribution and clawback rules are now testable, but no durable referral clicks, checkout metadata, payout batches, or abuse queue exist. | Added pure decision scaffold under DEC-NEXT-052; provider/payment mutations remain disabled. | Codex after persistence and Stripe are wired | Mitigated; implementation pending |
| OPS-2026-05-23-005 | 2026-05-23 | P1 launch-blocking | Vault lifecycle emails | Lifecycle email queue decisions are now testable, but there is no durable lifecycle table, provider send worker, unsubscribe enforcement, or held-row repair queue. | Added pure delivery decision scaffold under DEC-NEXT-053; all provider sends remain disabled. | Codex after persistence and email provider are wired | Mitigated; implementation pending |
| OPS-2026-05-23-006 | 2026-05-23 | P1 launch-blocking | Vault persistence | Persistence migration contract exists, but no migration files, ORM models, database adapter, transaction implementation, backup, or restore runbook exists. | Added adapter-neutral contract under DEC-NEXT-056. | Codex after database provider is selected | Open |
