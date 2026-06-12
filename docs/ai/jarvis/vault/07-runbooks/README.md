---
vault: jarvis
folder: 07-runbooks
created: 2026-06-12
updated: 2026-06-12
tags: [jarvis, galaxy, runbooks]
---

# 07 — Runbooks

Step-by-step manual procedures for human operators. A runbook exists for every
MANUAL capability and every approval-gated action.

## Expected runbooks

- Settlement run (manual settlement worker trigger and verification)
- Calibration review (canonical ledger vs confidence buckets)
- Ingestion recovery (stale/failed adapter diagnosis)
- Performance gate opening (checklist before PERFORMANCE_STATS_ENABLED=true)
- Public picks gate opening (checklist before PUBLIC_PICKS_ENABLED=true)
- Overnight run (launching and reviewing the overnight test sweep)

## Protocol

- A runbook documents the procedure as it IS, not as designed to become.
- Each step states what to verify before proceeding — no blind sequences.
- When a runbook step becomes automated, mark it and link the code path.
