# Dirty Tree Safety Check

Date: 2026-06-09
Repo: `C:\Users\Garrett\Sports`
Branch: `safety/sports-wip-2026-06-04`

## Result

Risk level: HIGH.

Reason: the working tree contains a mix of launch-blocker app fixes, tests, generated launch snapshots, command-center evidence, untracked control-plane work, and broad research artifacts. Nothing was reset, deleted, or reverted.

## Dirty Counts

Resume safety check before the final evidence pass showed:

- Modified tracked files: 32
- Untracked files/directories: many, dominated by `docs/research/**`, generated screenshots/logs, and new route/helper files.
- Dirty tree status: not safe for blind staging, merge, deploy, or bulk formatting.

## Classification

| Path class | Classification | P0 action |
|---|---|---|
| `apps/web/app/api/board/state/route.ts` | app code change | Safe edit scope for P0 fail-closed route repair. |
| `apps/web/app/api/health/route.ts` | app code change | Safe edit scope for liveness/readiness split. |
| `apps/web/app/api/promotions/route.ts` | app code change | Safe edit scope for promotions fail-closed API response. |
| `apps/web/app/api/live/route.ts` | app code change | New P0 liveness route. |
| `apps/web/app/api/ready/route.ts` | app code change | New P0 dependency readiness route. |
| `apps/web/lib/health/checks.ts` | app code change | New sanitized health dependency helper. |
| `apps/web/lib/board/state.ts` | app code change | Safe edit scope for degraded board payload. |
| `apps/web/lib/board/passes.ts` | app code change | Safe edit scope for degraded pass-list payload. |
| `apps/web/lib/calibration/report.ts` | app code change | Safe edit scope for degraded calibration payload. |
| `apps/web/lib/promotions/public-payload.ts` | app code change | Safe edit scope for degraded promotions payload. |
| `apps/web/app/performance/page.tsx` | app code change | Safe edit scope for avoiding gated build-time DB call. |
| `apps/web/lib/auth.ts` | app code change | Safe edit scope for production DEV_FAKE_ADMIN guard. |
| `apps/web/lib/entitlements.ts` | app code change | Safe edit scope for production DEV_FAKE_ADMIN guard. |
| `apps/web/middleware.ts` | app code change | Safe edit scope for production DEV_FAKE_ADMIN guard. |
| `apps/web/app/admin/dashboard/dashboard-view.tsx` | app code change | Safe copy-only edit to remove client-visible dev bypass env name. |
| `scripts/prod-probe.mjs` | app/script change | Safe edit scope for `/api/live` and `/api/ready` semantics. |
| `apps/web/__tests__/*board*`, `*health*`, `*promotions*`, `*prod-probe*`, `*entitlements*`, `guardrails.test.ts` | test change | Safe edit scope for P0 regression coverage and timeout fix. |
| `apps/web/app/cockpit/sources/page.tsx` | app code change | Existing dirty work; avoid except where already modified by prior agent. |
| `apps/web/package.json` | config change | Existing dirty work; avoid. |
| `packages/types/src/index.ts` | app/type change | Existing dirty work; avoid. |
| `packages/types/src/world-model.ts` and `packages/types/src/__tests__/world-model.test.ts` | app/type change | Existing untracked work; avoid. |
| `apps/web/lib/cockpit/intelligence-control-plane.ts` and cockpit-control-plane tests | app/test change | Existing untracked control-plane work; avoid except file-header test fix already applied. |
| `reports/launch-night/snapshots/*.html` | generated artifact | Avoid manual edits. |
| `reports/codex/**` | generated artifact | Evidence/log artifacts only. |
| `docs/research/**` | command-center/generated research docs | Avoid in this P0 sprint. |
| `docs/command-center/**` | command-center generated evidence | Safe to create/update for this sprint. |

## Safe To Edit

- P0 route/API fail-closed code listed above.
- P0 tests tied to those route/API/security changes.
- `scripts/prod-probe.mjs`.
- `docs/command-center/**` evidence and scorecard files.

## Avoid

- Existing broad research docs under `docs/research/**`.
- Existing generated launch snapshots unless deliberately regenerated.
- Existing cockpit/source-control-plane work outside the P0 blocker path.
- `packages/types/**` world-model work.
- Any env file or secret-bearing file.

## Approval Needed Before Major Work

Yes. The tree remains too mixed for blind staging, rebasing, deployment, or broad refactors. Stage only reviewed P0 files, or create a clean branch/patch from the identified P0 subset.
