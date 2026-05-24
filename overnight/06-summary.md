# Overnight Run 1 — Morning Summary (2026-05-24)

## What Happened

Fresh clone of the repo had **zero working tooling** — no `node_modules`, no Prisma client, broken tests, broken typecheck. All issues resolved. The repo now has a clean baseline: 1,578 tests passing, 0 TypeScript errors, all guardrails green.

## Top 5 Findings (ranked by leverage)

| # | Finding | Leverage | Status |
|---|---|---|---|
| 1 | node_modules absent → tests/typecheck broken on fresh clone | 45 | **FIXED** |
| 2 | Next.js 14.2.35 has 14 active HIGH CVEs (DoS, XSS, SSRF, smuggling) | 45 | **BLOCKED** — needs human decision |
| 3 | Prisma client not generated → 40 TS errors incl. missing CockpitTaskStatus | 36 | **FIXED** via `prepare` script |
| 4 | GitHub Actions missing `permissions:` blocks (GITHUB_TOKEN write-all) | 36 | **FIXED** |
| 5 | No automation path from `npm install` to working typecheck | 36 | **FIXED** via `prepare: npm run db:generate` |

## What Was Fixed

1. **`package.json`** — Added `"prepare": "npm run db:generate"`. From now on, `npm install` automatically generates Prisma types. Prevents the cryptic-40-errors-after-fresh-clone failure mode.

2. **`.github/workflows/ci.yml`** — Added `permissions: contents: read` at workflow level. GITHUB_TOKEN now uses least-privilege.

3. **`.github/workflows/daily-smoke.yml`** — Same `permissions: contents: read` fix.

4. **`.github/workflows/external-cron.yml`** — Added `permissions: {}` (no checkout, no write needed).

5. **`workers/content-publishing/tsconfig.json`** and **`workers/data-refresh/tsconfig.json`** — Added `"ignoreDeprecations": "5.0"` to make the TypeScript 7.0 moduleResolution deprecation explicit and auditable rather than silently breaking when TypeScript 7 ships.

6. **`.github/workflows/security-audit.yml`** — New weekly CVE monitoring workflow. Runs `npm audit` on schedule and summarizes HIGH/CRITICAL findings in GitHub Actions summary. Currently `continue-on-error: true` until Next.js major upgrade is complete.

## Highest Risk Open Item

**Next.js 14 → 16 upgrade required for 14 HIGH CVEs** — see `BLOCKED_NEED_G.md`.

This is the most impactful deferred action. The vulnerabilities are publicly known and include DoS vectors. The app is in production (`galaxysportsedge.com`). The fix is semver-major and requires testing.

## PRs and Stack Order

No PRs opened (no GITHUB_TOKEN in environment). Changes committed and pushed to `claude/magical-volta-yiUwL`.

## False Positive Trend

- `sk-` grep pattern → all were `risk-disclosure` component references (false positive validated)
- Workers tsconfig `moduleResolution=node` → currently silent in TypeScript 5.9.3; only an error in TypeScript 7+

## Blocked Questions (≤5, yes/no, ≤30 seconds)

1. **Is the team ready to begin a Next.js 14→16 upgrade?** (14 active HIGH CVEs depend on this)

## First 30-Minute Plan for Next Session

1. Attempt Next.js upgrade on a new branch: `npm install next@^16 eslint-config-next@^16`
2. Run typecheck and tests
3. Fix any breaking changes (likely: middleware API, image config changes)
4. Run build to confirm no production regressions
5. Document remaining gaps in BLOCKED_NEED_G.md

## KPI Status

- Tests: 1578 passing ✓
- TypeCheck: 0 errors ✓
- Guardrails: all green ✓
- Security: 14 CVEs open (blocked on human decision)
- CI permissions: hardened ✓
