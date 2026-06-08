# Blocked — Needs G Decision

## BQ-1: Next.js CVE upgrade path

**Question (yes/no in 30s):** Should Next.js be upgraded from `14.2.15` to `15.x` to fix 10 known security CVEs?

**Context:**
- `npm audit` reports 1 critical + 4 high vulnerabilities
- Critical: `glob` CLI command injection (GHSA-5j98-mcp5-4vw2) — via ESLint + Next.js dep chain
- High: Next.js HTTP request smuggling (GHSA-ggv3-7p47-pfv8), cache poisoning (GHSA-vfv6-92ff-j949, GHSA-wfc6-r584-vfw7), DoS via Image Optimizer (GHSA-9g9p-9gw9-jx7f)
- All fixes require `next@15+` — breaking change to App Router APIs
- The project is self-hosted (not Vercel managed) so the smuggling CVEs are applicable
- `npm audit fix --force` would install next@16.2.7 which is a very large jump

**If YES:** Plan a dedicated Next.js upgrade branch (high-effort, regression-risk, 2–3h)
**If NO:** Accept risk; document in RISK_AND_FAILURE_REGISTER.md; re-evaluate at next framework cycle
