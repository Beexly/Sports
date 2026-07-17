---
paths:
  - "**/*settle*.{ts,tsx}"
  - "**/*settlement*.{ts,tsx}"
  - "**/*clv*.{ts,tsx}"
  - "**/*calibrat*.{ts,tsx}"
  - "**/*proof*.{ts,tsx}"
  - "**/*stripe*.{ts,tsx}"
  - "**/*entitlement*.{ts,tsx}"
  - "packages/db/prisma/**"
---

# Protected money-truth rules

- State the exact invariant before editing.
- Compare behavior against the base SHA, not prose memory.
- Never silently change canonical population, methodology, thresholds, epochs, settlement terminality, CLV sign/close derivation, or proof semantics.
- Every settled eligible record remains auditable; infrastructure failure may not erase a loss.
- Write-once fields remain write-once.
- New nullable fields require pre-migration failure behavior and additive migration tests.
- Production migration and live billing mutations are founder-only.
- Invoke `gse-red-team` before final verification.
