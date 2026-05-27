# Run 1 Summary — 2026-05-27

**Duration:** ~11 min | **Status:** completed | **Branch:** claude/magical-volta-8aaB4

## What Changed

### REPAIR (2 items)
1. **Missing test dependency fixed** — `@testing-library/dom@^10.4.0` added to `apps/web/package.json`. This was the sole failing test file (`performance-gate.test.tsx`). Root cause: `@testing-library/react@16.x` requires `@testing-library/dom@^10` as a peer dep, which was not declared.
2. **TypeScript restored to clean** — two sub-fixes:
   - Added `"ignoreDeprecations": "5.0"` to `tsconfig.json` to silence the `baseUrl` deprecation error (TS 5.9 introduced this warning; it caused `tsc --noEmit` to exit 1).
   - Ran `npm run db:generate` to regenerate the Prisma client. This resolved 22 `TS2305` errors for `CockpitTaskStatus`, `Promotion`, `OperatorAgent`, `CockpitRiskLevel`, and `CockpitComplianceStatus`. These types exist in `packages/db/prisma/schema.prisma` but were never generated in the CI-free environment.

### IMPROVE (1 item)
3. **DEV_FAKE_ADMIN production guard** — The `DEV_FAKE_ADMIN=true` escape hatch bypassed all auth but had no runtime enforcement against production use. Added `process.env["NODE_ENV"] !== "production"` guard to all three touch points: `lib/auth.ts` (auth session), `lib/entitlements.ts` (subscription tier), `middleware.ts` (route protection). Even if `DEV_FAKE_ADMIN=true` is accidentally set in a Vercel prod env, it will no longer grant admin sessions.

### GROW (1 item)
4. **Security audit guardrail** — New `scripts/guardrails/security-audit.mjs` with:
   - Accepted-exception registry (14 tracked Next.js CVEs with expiry dates)
   - Fails on any NEW high/critical CVE not in the registry
   - Warns on tracked CVEs with deadline info
   - New CI job `#8` in `.github/workflows/ci.yml`
   - `guard:security` npm shortcut
   - `guardrails` composite now includes security scan
   - Auto-covered by existing `scripts-path-coverage.test.ts` (test count: 12 → 13)

## Disprove Gate Results

| Claim | Gate | Result |
|-------|------|--------|
| Test dependency fixed | `npx vitest run performance-gate.test.tsx` | PASS (10/10 tests) |
| TS clean | `npx tsc --noEmit` exit 0 | PASS (0 errors) |
| All tests green | `npx vitest run` | PASS (110 files, 1343 tests) |
| Security audit runs | `node scripts/guardrails/security-audit.mjs` | PASS (exit 0, warns on 14 tracked CVEs) |
| DEV_FAKE_ADMIN guard | Code inspection + entitlements test | PASS (3/3 tests pass) |

## Open Risk

**Next.js 14 → 15 upgrade** — Two urgent SSRF/bypass CVEs (GHSA-c4j6-fc7j-m34r, GHSA-36qx-fr4f-26g5) have deadline 2026-06-10. These require upgrading `next` from `^14.2.15` to `^15.5.16`. Next.js 15 has breaking async API changes in App Router (cookies/headers/params become async). Recommend human approval before autonomous upgrade attempt (BQ-001).

## Calibration Check

- No calibration gates were loosened.
- No `PUBLIC_*_ENABLED` or `PERFORMANCE_STATS_ENABLED` flags were touched.
- No `.env*` files were modified.
- No `main` branch was touched.
