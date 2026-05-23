# Ops Issue Queue

Date initialized: 2026-05-23

This queue records production-smoke and operational readiness issues that should be triaged during Garrett's next peak block. Do not treat this file as authorization to deploy.

| ID | Date | Severity | Surface | Finding | Evidence | Recommended owner | Status |
|---|---|---|---|---|---|---|---|
| OPS-2026-05-23-001 | 2026-05-23 | P1 launch-blocking | Production smoke pipeline | Requested `scripts/smoke-prod.sh` could not run because the script is missing or the WSL bash path is unavailable in this environment. | Command attempted from repo root; WSL returned `execvpe(/bin/bash) failed: No such file or directory`. | Codex during next engineering block | Open |
| OPS-2026-05-23-002 | 2026-05-23 | P1 launch-blocking | Vault integration scaffold | `apps/web/lib/vault/` is absent, so Stripe/Vault constants, entitlement helpers, member creation, and Discord repair hooks have no current scaffold in this clone. | `Get-ChildItem apps/web/lib/vault` returned missing path. | Codex after execution gates clear | Open |
| OPS-2026-05-23-003 | 2026-05-23 | P1 launch-blocking | Vault cron scaffold | `apps/web/app/api/cron/` is absent, so welcome email, lifecycle, renewal, and infrastructure-only continuity jobs have no current scaffold in this clone. | `Get-ChildItem apps/web/app/api/cron` returned missing path. | Codex after execution gates clear | Open |
