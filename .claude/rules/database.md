---
paths:
  - "packages/db/prisma/**"
  - "packages/db/src/**"
  - "**/migrations/**"
---

# Database rules

- Schema changes are additive unless a separately approved migration plan proves otherwise.
- Never run production migrations.
- Validate migrations against a disposable or shadow database.
- Preserve out-of-band production objects unless an owner-approved reconciliation explicitly addresses them.
- New fields need pre-migration code behavior, rollback reasoning, indexes where query evidence requires them, and tests for absent-column behavior when deployment ordering matters.
- No destructive seed or reset path may run in production.
