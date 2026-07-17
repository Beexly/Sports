---
paths:
  - "packages/data-ingestion/**"
  - "packages/ingestion-pipeline/**"
  - "apps/web/lib/scraping/**"
  - "apps/web/lib/source-rights/**"
  - "apps/web/lib/sources/**"
  - "**/*source-registry*"
  - "**/*evidence*"
  - "**/*media*"
---

# Source, evidence, and media rules

- Every acquisition route must pass the canonical clearance engine before network access.
- Every persisted record carries an immutable point-in-time rights snapshot and attribution.
- No login, paywall, CAPTCHA, technical-control, rate-limit, or anti-bot evasion.
- Facts and bounded metadata only unless explicit rights permit more.
- Candidate/discovery material is not public evidence.
- AI/model output is never an external source of truth.
- Raw licensed payloads, protected media, or proprietary predictions never leak through public APIs, metadata, logs, or fixtures.
- Fail closed on unknown rights or stale evidence.
