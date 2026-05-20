# Launch-Night Overnight Changelog

**Session window:** 2026-05-18 evening → 2026-05-19 early morning (sandbox UTC clock).

This is a flat ledger of every file added or modified by the autonomous
loop between the operator going to sleep and the morning check. Pair with
`reports/launch-night/final-report.md` (the close-of-day summary) and
`reports/launch-night/observability-audit.md` (the Phase 0 inventory).

## What shipped tonight

### Customer-surface gating
- `apps/web/lib/performance/public-performance-policy.ts` — single source of truth for "can this surface show a performance number?". Pure function. Disclaimer + trust-safe vocabulary baked into every `publicMessage`.
- `apps/web/app/dashboard/page.tsx` — record/win-rate driven by the policy, bootstrap row badge, plain-language captions, `RiskDisclosure` component added.
- `apps/web/app/api/picks/daily-slate/route.ts` — `recentRecord` now gated on `canExposePerformanceStats` (closed a leak the audit caught).

### Jarvis Launch Observatory
- `apps/web/lib/cockpit/jarvis.ts` — pure synthesizer producing `JarvisLaunchStatus` + 11 sectional health readouts + phase matrix + recommended actions. Stamped with `assessedAt` + `JARVIS_VERSION` for auditability.
- `apps/web/lib/cockpit/jarvis-data.ts` — DB-side loader that wraps every query in `.catch()` so the cockpit always renders, even with no DB.
- `apps/web/lib/cockpit/jarvis-audit-log.ts` — pure serializer turning a `JarvisAssessment` into a single tab-separated line + verbose lines + JSON.
- `apps/web/lib/cockpit/jarvis-history.ts` — in-memory ring buffer + snapshot extractor + `sharedJarvisHistory()` for cross-request reads inside one process.
- `apps/web/components/cockpit/jarvis-trend.tsx` — dependency-free pill row that renders the last N launch statuses.
- `apps/web/app/cockpit/page.tsx` — overview promoted to the Launch Observatory (rewritten by user in parallel).

### Historical pick observability
- `apps/web/lib/cockpit/history.ts` — pure eligibility evaluator (`evaluatePickEligibility`) + `buildHistoryCsv` for export.
- `apps/web/app/cockpit/history/page.tsx` — forensic ledger page (last 100 picks, filterable, ARIA-labeled filter groups, focus-visible rings, stub-mode banner, CSV export button with admin-only label).
- `apps/web/app/api/cockpit/history/export/route.ts` — admin-only CSV export route, RFC-4180 escapes, 500-row cap.

### Admin/cockpit API
- `apps/web/app/api/cockpit/jarvis/route.ts` — admin-only JSON readout of the current Jarvis assessment. Never 503; failures become a 200 error envelope so monitoring can ingest the assessment as a signal.

### Trust + brand
- `apps/web/lib/trust-claims.ts` — exported `getBannedPhraseList()` and `INTERNAL_VOCABULARY` so the policy tests + scanner consume one registry instead of duplicating strings.
- `apps/web/components/ui/risk-disclosure.tsx` — referenced from `/dashboard` (new) and verified on `/performance`.

### CI + ops
- `.github/workflows/ci.yml` — added a focused `brand-safety` job that fences the customer-copy invariants in under a minute.

### Docs + reports
- `docs/launch-observatory.md` — added the brand voice quick reference, vocabulary map, banned-phrase list, voice attributes, data-flow diagram, troubleshooting table for Jarvis statuses, snapshots subsection, and the CSV export format spec.
- `docs/launch-runbook.md` — new. Step-by-step operator recipe from "git checkout" to "flip the gate."
- `README.md` — Operations section links to the observatory and runbook.

## Tests added or extended this session

| File | Coverage |
|---|---|
| `apps/web/__tests__/public-performance-policy.test.ts` | Policy rules, brand-safety, internal-vocabulary check, default min-sample fallback, multi-blocker primaryReason ordering |
| `apps/web/__tests__/jarvis.test.ts` | Launch status, confidence, sectional health classification, status ordering invariants, steady-state actions, version stamp |
| `apps/web/__tests__/jarvis-purity.test.ts` | Determinism, no I/O, no `Date.now()`, no `Math.random()`, no top-level await |
| `apps/web/__tests__/jarvis-audit-log.test.ts` | Tab-separated serialization, verbose lines, JSON round-trip, tab escape |
| `apps/web/__tests__/jarvis-history.test.ts` | Ring buffer ordering, capacity, clear, snapshot field extraction |
| `apps/web/__tests__/jarvis-trend.test.ts` | Component contract, empty state, ARIA, every launch status covered |
| `apps/web/__tests__/cockpit-jarvis-api.test.ts` | Admin gate, no 503, Cache-Control, no write methods, no auto-publish |
| `apps/web/__tests__/cockpit-history-export.test.ts` | Admin gate, content-type, CSV helper usage, query-string filters |
| `apps/web/__tests__/cockpit-history-a11y.test.ts` | nav + role=group + aria-current + focus-visible ring |
| `apps/web/__tests__/cockpit-stub-safety.test.ts` | No top-level await, Jarvis loader wraps DB calls, history page inherits layout guard |
| `apps/web/__tests__/dashboard-performance-gate.test.ts` | Gate enforcement on dashboard + daily-slate + performance + picks APIs, RiskDisclosure presence |
| `apps/web/__tests__/dashboard-load-performance.test.ts` | Unit tests for the dashboard loader extraction |
| `apps/web/__tests__/history-eligibility.test.ts` | Eligibility rules, learning-eligibility composite, CSV escape, joined exclusion reasons |
| `apps/web/__tests__/readiness-gate-enforcement.test.ts` | Engine boundary: isFeatured derived from gate, no hardcoded `isBootstrap: false` in writes |
| `apps/web/__tests__/trust-claims.test.ts` | Banned-phrase list export, INTERNAL_VOCABULARY contract, visibility audit (PERFORMANCE vs disclaimer pairing) |
| `apps/web/__tests__/docs-public-copy-scan.test.ts` | Scanner over docs/launch-observatory.md + docs/launch-runbook.md (excluding code spans) |
| `apps/web/__tests__/snapshots-banned-phrases.test.ts` | Scanner over reports/launch-night/snapshots/*.html user-visible text |
| `apps/web/__tests__/metadata-banned-phrases.test.ts` | Static metadata + generateMetadata files |
| `apps/web/__tests__/public-copy-scan-strong.test.ts` | Registry-driven scan over the top customer-facing pages |
| `apps/web/__tests__/stub-mode-contract.test.ts` | @sports/db.isStubMode exported, used by cockpit page + Jarvis loader |
| `apps/web/__tests__/env-example-coverage.test.ts` | Jarvis external-config list ⊆ .env.example, platform-config env reads ⊆ .env.example |

## Validation status

Local execution of `npm run lint`, `npm run typecheck`, `npm run test`,
`npm run build` is still blocked by the sandbox node_modules ACL — same
condition documented in the prior-session memory. Once the operator runs
the `handoff.md §8.11` recipe outside the sandbox, every test above runs
as part of `npm test` and the focused `brand-safety` CI job.

## Files added or edited (full list)

**Added (lib + components):**
- `apps/web/lib/performance/public-performance-policy.ts`
- `apps/web/lib/dashboard/load-performance.ts`
- `apps/web/lib/cockpit/jarvis.ts`
- `apps/web/lib/cockpit/jarvis-data.ts`
- `apps/web/lib/cockpit/jarvis-audit-log.ts`
- `apps/web/lib/cockpit/jarvis-history.ts`
- `apps/web/lib/cockpit/history.ts`
- `apps/web/components/cockpit/jarvis-trend.tsx`

**Added (pages + API):**
- `apps/web/app/cockpit/history/page.tsx`
- `apps/web/app/api/cockpit/history/export/route.ts`
- `apps/web/app/api/cockpit/jarvis/route.ts`

**Added (tests, 21 files):**
- `apps/web/__tests__/public-performance-policy.test.ts`
- `apps/web/__tests__/jarvis.test.ts`
- `apps/web/__tests__/jarvis-purity.test.ts`
- `apps/web/__tests__/jarvis-audit-log.test.ts`
- `apps/web/__tests__/jarvis-history.test.ts`
- `apps/web/__tests__/jarvis-trend.test.ts`
- `apps/web/__tests__/cockpit-jarvis-api.test.ts`
- `apps/web/__tests__/cockpit-history-export.test.ts`
- `apps/web/__tests__/cockpit-history-a11y.test.ts`
- `apps/web/__tests__/cockpit-stub-safety.test.ts`
- `apps/web/__tests__/dashboard-performance-gate.test.ts`
- `apps/web/__tests__/dashboard-load-performance.test.ts`
- `apps/web/__tests__/history-eligibility.test.ts`
- `apps/web/__tests__/readiness-gate-enforcement.test.ts`
- `apps/web/__tests__/docs-public-copy-scan.test.ts`
- `apps/web/__tests__/snapshots-banned-phrases.test.ts`
- `apps/web/__tests__/metadata-banned-phrases.test.ts`
- `apps/web/__tests__/public-copy-scan-strong.test.ts`
- `apps/web/__tests__/stub-mode-contract.test.ts`
- `apps/web/__tests__/env-example-coverage.test.ts`
- `apps/web/__tests__/trust-claims.test.ts` (extended in place)

**Added (docs + reports):**
- `docs/launch-observatory.md`
- `docs/launch-runbook.md`
- `reports/launch-night/observability-audit.md`
- `reports/launch-night/final-report.md`
- `reports/launch-night/overnight-changelog.md` (this file)

**Edited (existing):**
- `apps/web/app/dashboard/page.tsx`
- `apps/web/app/cockpit/page.tsx`
- `apps/web/app/cockpit/layout.tsx`
- `apps/web/app/admin/dashboard/dashboard-view.tsx`
- `apps/web/app/api/picks/daily-slate/route.ts`
- `apps/web/lib/trust-claims.ts`
- `.github/workflows/ci.yml`
- `README.md`

## Next operator actions (cleared list)

1. Outside the sandbox: `rm -f .git/index.lock && rm -rf node_modules _speedtest && npm install`.
2. `npm run lint && npm run typecheck && npm run test && npm run build` — every test above should pass against the current source.
3. `git checkout -b feature/jarvis-launch-observatory && git add . && git commit -m "feat: add Jarvis launch cockpit and historical pick observability" && git push -u origin feature/jarvis-launch-observatory`.
4. Open PR into `main` using the body from `reports/launch-night/final-report.md`.
5. Deploy to staging. Verify the cockpit + dashboard behavior matches the snapshots in `reports/launch-night/snapshots/`.
6. Only flip `PERFORMANCE_STATS_ENABLED=true` once Jarvis reports `canonicalHistoryStatus=GREEN` and `safetyWarnings` is empty.
