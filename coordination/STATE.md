# STATE.md — Overnight Operator

## Run 1 — 2026-06-02T07:00Z
- **Mode**: WRITE (git + MCP)
- **Branch**: claude/magical-volta-tvJpG
- **Status**: completed
- **Tests**: 1894 passing, 0 failing (was 1889 passing, 1 failing)

## Changes This Run
1. `REPAIR` apps/web/lib/correlation/load-settled-picks.ts — replaced removed `Prisma.validator` with `satisfies` (Prisma 5 compat)
2. `IMPROVE` apps/web/next.config.mjs — added Content-Security-Policy header; migrated deprecated `images.domains` → `images.remotePatterns`
3. `IMPROVE` vercel.json — added Content-Security-Policy header (mirrors next.config.mjs)
4. `IMPROVE` apps/web/__tests__/next-config-policy.test.ts — updated tests: CSP assertion + remotePatterns assertion
5. `GROW` .github/workflows/security-audit.yml — new dedicated security audit CI job (weekly + on lockfile PRs)

## Active Blockers
None.

## Blocked Questions (for G)
See BLOCKED_NEED_G.md
