# Phase-0 Cost Slice Confirmation

2026-06-24. Confirmation artifact for F3.

These slices are already shipped as code and remain protective only. This pass did not add credentials, alter deploy settings, change cache policy, provision storage, or flip any production flag.

| Slice | Shipped control | Code owner | Green evidence | Open gate |
| --- | --- | --- | --- | --- |
| Deploy gate | Vercel ignored-build decision builds trunk, active trunk, merge commits, or deploy-relevant paths; docs-only inactive branches skip preview builds. | `scripts/vercel-skip-build.mjs` | `node scripts/vercel-skip-build.test.mjs` | `[OWNER]/[INFRA]` Vercel project must point its ignored-build command at this script. |
| Snapshot hash-only | Production source snapshots keep SHA-256 hash, byte count, and metadata while omitting raw payload JSON by default. | `packages/ingestion-pipeline/src/source-snapshot.ts` | `npm run test --workspace=packages/ingestion-pipeline -- src/__tests__/source-snapshot.test.ts` | `[INFRA]` Runtime env may explicitly set `SOURCE_SNAPSHOT_MODE`; storage pruning remains ops-owned. |
| CDN/cache policy | Admin and monitoring endpoints use `Cache-Control: no-store`; the public promotions route has a short public cache only after compliance filtering. | `apps/web/app/api/cockpit/*`, `apps/web/app/api/promotions/route.ts` | `npx vitest run __tests__/cockpit-history-export.test.ts __tests__/cockpit-jarvis-api.test.ts __tests__/cockpit-jarvis-trend-api.test.ts` from `apps/web` | `[OWNER]/[INFRA]` Broader CDN route policy and edge cache rollout remain manual review because cross-user cache leakage is a production risk. |

## Confirmation Notes

- This document is a confirmation ledger, not a new runtime control.
- Phase-0 cost posture is green only for the code paths above and the tests named here.
- No paid provider, model provider, projection provider, pricing rung, public publishing flag, or storage service was changed.
- Existing build warnings about Sentry/OpenTelemetry static analysis, stub Prisma in local production builds, and edge-runtime static generation are pre-existing and remain outside this slice.
