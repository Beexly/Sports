# Run 1 Morning Synthesis — 2026-06-02

## Top 5 Findings (ranked by leverage)

| # | Finding | Class | Leverage | Blast | Status |
|---|---------|-------|----------|-------|--------|
| 1 | CSP header missing on all routes | OBSERVED | 27 | MEDIUM | **FIXED** |
| 2 | No npm audit CI gate | OBSERVED | 27 | MEDIUM | **FIXED** |
| 3 | `Prisma.validator` removed in Prisma 5 — 1 test broken | OBSERVED | 24 | HIGH | **FIXED** |
| 4 | Dependency upgrade debt chain (Next 15 / Prisma 6 / Vitest 3) | INFERENCE | 24 | MEDIUM | OPEN — needs sprint decision |
| 5 | `images.domains` deprecated → `remotePatterns` | OBSERVED | 18 | LOW | **FIXED** |

## Highest-Risk Open Items
1. **Vitest UI CVE** (critical, dev-only): see BLOCKED_NEED_G Q1. Risk is dev-env only; CI safe.
2. **Next.js DoS** (high, limited surface): `remotePatterns` now uses explicit hostnames — mitigated but not resolved until Next.js 15 upgrade.
3. **Upgrade debt chain**: three major-version bumps deferred. Compound risk grows weekly.
4. **CSP `unsafe-inline`**: accepted for now (Next.js 14 constraint). Removable after Next.js 15 nonce support.

## PRs This Run
None opened (all changes on feature branch `claude/magical-volta-tvJpG`).

## Blocked Questions (≤5, yes/no, ≤30s each)
1. Is `vitest --ui` ever run in a shared/network-accessible dev environment? → see security-audit.yml notes
2. Is there a planned Next.js 14→15 / Prisma 5→6 / Vitest 2→3 upgrade sprint?
3. Is nonce-based CSP (removes `unsafe-inline`) on the roadmap?

## First 30-Minute Plan for Next Run
1. (10 min) Investigate and document the `npm audit fix` safe changes (non-breaking `qs`, `ws` already done in commit 50ca06a — re-verify scope)
2. (10 min) Audit all cockpit sub-routes for missing auth: specifically check `/cockpit/studio`, `/cockpit/calibration`, `/cockpit/sources` pages for server-side auth guards (layout.tsx covers all, but spot-check dynamic routes)
3. (10 min) Deep-audit `packages/prediction-engine` for any usage of removed Prisma APIs (pattern sweep) — the `Prisma.validator` fix may not be the only one

## Calibration/Safety Invariants
All calibration gates unchanged. `PUBLIC_PICKS_ENABLED`, `PUBLIC_BLOG_ENABLED`, `PERFORMANCE_STATS_ENABLED`, `CANONICAL_HISTORY_ENABLED` all still gated off. No gate logic was touched.
