# BLOCKED — Needs Human Decision

## B1: Next.js Major Version Upgrade (CRITICAL SECURITY)
**Question**: Is the team ready to test and ship a Next.js 14→16 major upgrade?
**Why**: 14 active HIGH CVEs in next@14.2.35 — DoS, HTTP smuggling, cache poisoning, XSS, SSRF. The only fix is next@^16.0.0.
**Impact if deferred**: Production app is vulnerable to publicly-disclosed attacks.
**Estimated effort**: 2–4 days of testing (page router → app router changes, API surface differences).
**Unblock action**: Reply YES/NO. If YES, overnight will draft the upgrade branch and test suite.

---
*Generated: 2026-05-24T07:00Z | Run 1*
