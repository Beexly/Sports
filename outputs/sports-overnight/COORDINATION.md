# COORDINATION.md — Overnight APEX Operator

**Last updated:** 2026-05-27T07:13:00Z
**Mode:** WRITE (git push via branch claude/magical-volta-8aaB4)
**Run:** 1

## Active Stream Claims (TTL 90 min from registration)

| Stream | Claim | Files Touched | Registered | Expires |
|--------|-------|---------------|------------|---------|
| security-sweep | DEV_FAKE_ADMIN prod guard | lib/auth.ts, lib/entitlements.ts, middleware.ts | 07:09Z | 08:39Z |
| repair-deps | @testing-library/dom install | apps/web/package.json | 07:06Z | 08:36Z |
| repair-ts | ignoreDeprecations + Prisma generate | tsconfig.json | 07:06Z | 08:36Z |
| grow-security-audit | security-audit.mjs guardrail + CI job | scripts/guardrails/security-audit.mjs, .github/workflows/ci.yml | 07:11Z | 08:41Z |

## Completed Streams (Run 1)

- **security-sweep**: DEV_FAKE_ADMIN now gated by `NODE_ENV !== "production"` in 3 locations
- **repair-deps**: `@testing-library/dom@^10.4.0` added; all 110 test files now pass
- **repair-ts**: `ignoreDeprecations: "5.0"` silences baseUrl deprecation; `prisma generate` fixed 22 TS2305 errors; 0 type errors
- **grow-security-audit**: New `scripts/guardrails/security-audit.mjs` + CI job #8 + `guard:security` npm script

## Next Run Candidates

1. Next.js 15 upgrade (HIGH — SSRF CVE GHSA-c4j6-fc7j-m34r deadline 2026-06-10)
2. Remove `eslint-disable @typescript-eslint/no-explicit-any` from auth.ts (3 instances — type-safe solution available)
3. Vite CJS deprecation warning in test output (cosmetic but noisy)
4. External cron workflow hardening (check for secret-less design)
