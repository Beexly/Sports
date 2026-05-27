# STATE.md — Overnight APEX Operator

**Mode:** WRITE (branch: claude/magical-volta-8aaB4)
**Run:** 1 of 8 (00:45–07:10 schedule)
**Started:** 2026-05-27T07:03:00Z
**Completed:** 2026-05-27T07:14:00Z
**Status:** completed

## Baseline (before Run 1)

| Metric | Value |
|--------|-------|
| Failing test files | 1 (`performance-gate.test.tsx`) |
| TS errors | 96 (1 deprecation + 22 TS2305 + 62 TS7006 + others) |
| Audit vulns (high) | 4 (all in next@14 or dev tools) |
| Security CI job | None |
| Prisma client generated | No |

## After Run 1

| Metric | Value |
|--------|-------|
| Failing test files | 0 |
| TS errors | 0 |
| Audit vulns (high, unaccepted) | 0 |
| Security CI job | ✅ Added (#8 in ci.yml) |
| Prisma client generated | ✅ |

## Repairs Completed

1. `@testing-library/dom@^10.4.0` added to devDependencies — fixed performance-gate test
2. `ignoreDeprecations: "5.0"` in tsconfig.json — silenced TS baseUrl deprecation
3. `npm run db:generate` run — resolved 22 TS2305 Prisma type errors (full type chain restored)

## Improve Completed

1. `DEV_FAKE_ADMIN` bypass gated by `NODE_ENV !== "production"` in `auth.ts`, `entitlements.ts`, `middleware.ts`

## Grow Completed

1. `scripts/guardrails/security-audit.mjs` — new guardrail with exception registry, expiry dates, and clear CVE tracking
2. `.github/workflows/ci.yml` — new `security-audit` CI job (#8)
3. `package.json` — `guard:security` npm shortcut + `guardrails` composite now includes security scan

## Open Tracked CVEs (Next.js 14 → 15 required)

| GHSA | Severity | CVSS | Deadline |
|------|----------|------|----------|
| GHSA-c4j6-fc7j-m34r | HIGH | 8.6 | 2026-06-10 |
| GHSA-36qx-fr4f-26g5 | HIGH | 7.5 | 2026-06-10 |
| GHSA-q4gf-8mx6-v5v3 | HIGH | 7.5 | 2026-06-26 |
| GHSA-8h8q-6873-q5fj | HIGH | 7.5 | 2026-06-26 |
| + 10 moderate | – | – | 2026-06-26 |

**Action:** Upgrade `next` in `apps/web/package.json` from `^14.2.15` to `^15.5.16`.
Next.js 15 has breaking changes (App Router async APIs, etc.). Recommend dedicated PR.

## Next Run Priorities

1. REPAIR: Attempt Next.js 15 upgrade (or scope/document breaking changes)
2. IMPROVE: Remove `eslint-disable @typescript-eslint/no-explicit-any` in auth.ts
3. IMPROVE: Suppress Vite CJS deprecation in test output  
4. GROW: Add weekly security scan workflow (separate from CI)
