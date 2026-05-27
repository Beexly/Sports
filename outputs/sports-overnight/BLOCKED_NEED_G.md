# BLOCKED_NEED_G.md — Questions Requiring Human Decision

**Updated:** 2026-05-27T07:14:00Z

## Open Questions

### BQ-001: Next.js 14 → 15 upgrade scope
**Context:** Current `next@14.2.15` has 4 HIGH CVEs including SSRF (CVSS 8.6, deadline 2026-06-10).
Upgrade to `^15.5.16` is required to clear all CVEs. Next.js 15 has breaking changes:
  - `cookies()`, `headers()`, `params`, `searchParams` are now async
  - `cacheLife` and `cacheTag` API changes
  - `ReactDOM.preload` behavior changes

**Question:** Should the overnight agent attempt the Next.js 15 upgrade autonomously, or should this be scheduled for human review?

*If YES*: Agent will attempt upgrade, run tests, fix breaking changes, open PR.
*If NO*: Agent will schedule it in STATE.md and continue with other improvements.

---

*All other streams are unblocked. BQ-001 does not block further overnight runs.*
