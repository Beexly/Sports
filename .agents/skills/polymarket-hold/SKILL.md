---
name: polymarket-hold
description: Polymarket is a compliance hold, not unfinished product work. Refuse ticket creation or market enablement without counsel clearance.
effort: medium
allowed-tools: Read, Grep, Glob, Bash(npm run *), Bash(node scripts/*)
---

# Polymarket compliance hold

## Law
Polymarket and prediction-market integrations are on **compliance hold** — they are **not** incomplete product features. Never open build tickets, enable market ingestion, or schedule `/api/cron/gamma` without a counsel-approved `source-rights-registry` entry.

## Required Behavior & Verification
- Document prediction-market status strictly as `compliance hold` (`docs/ops/ORBIT_UNLOCK.md`).
- Keep `polymarket-gamma` and unregistered prediction sources at `cleared: false` in `apps/web/lib/data-sources/source-router.ts`.
- Done when `npm run agent:eval` (`router-cleared-flags` & `polymarket-hold`) exits `0`.
