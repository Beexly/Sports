# Launch Night — Observability Audit

**Date:** 2026-05-18
**Branch:** `sports-intelligence-os-phase-9-ci`
**Repo:** Beexly/Sports

## Scope

Stand up the Jarvis Launch Observatory: one coherent surface that answers, with
evidence and no fabrication, what the customer can see, what the operator can
see, what historical picks exist, which results count, and what must happen
before public launch.

## Inventory — actual state

### Customer routes (in `apps/web/app/`)
- `/`, `/picks`, `/performance`, `/pricing`, `/dashboard`, `/blog`, `/blog/[slug]`
- `/promotions`, `/brief` (already added in prior phases)
- `/auth/signin`, `/auth/error`

### Admin routes
- `/admin`, `/admin/dashboard`, `/admin/picks`, `/admin/posts`, `/admin/users`

### Cockpit routes (ADMIN-gated by `apps/web/app/cockpit/layout.tsx`)
- `/cockpit` (overview, currently labelled "Jarvis Overview")
- `/cockpit/agents`, `/cockpit/agents/[agentKey]`
- `/cockpit/brief`, `/cockpit/calibration`, `/cockpit/content`
- `/cockpit/media`, `/cockpit/promotions`, `/cockpit/promotions/[slug]`
- `/cockpit/review`, `/cockpit/sources`
- `/cockpit/tasks`, `/cockpit/tasks/[taskId]`
- **Missing:** `/cockpit/history` (forensic pick ledger)

### API routes
- `/api/health`, `/api/picks`, `/api/picks/daily-slate`, `/api/performance`
- `/api/blog`, `/api/brief`, `/api/promotions`
- `/api/admin/dashboard`, `/api/admin/trigger-refresh`, `/api/admin/promotions`
- `/api/cockpit/agents`, `/api/cockpit/brief`, `/api/cockpit/calibration`
- `/api/cockpit/content[/...]`, `/api/cockpit/readiness`
- `/api/cockpit/tasks[/...]`
- `/api/subscriptions/checkout`, `/api/subscriptions/portal`, `/api/webhooks/stripe`
- **Missing:** `/api/cockpit/history` (optional — `lib/cockpit/history.ts` will load directly)

### Domain libraries
- `lib/auth.ts`, `lib/entitlements.ts`, `lib/trust-claims.ts`, `lib/stripe.ts`
- `lib/brief/compose.ts`, `lib/calibration/compute.ts`
- `lib/cockpit/agents.ts`, `lib/cockpit/intelligence.ts`, `lib/cockpit/transitions.ts`
- `lib/content/workflow.ts`, `lib/content-engine/*`, `lib/content-generator.ts`
- `lib/promotions/guards.ts`, `lib/promotions/public-payload.ts`
- `lib/source-intelligence/index.ts`
- **Missing:** `lib/cockpit/jarvis.ts` (synthesis layer)
- **Missing:** `lib/cockpit/history.ts` (forensic ledger query)
- **Missing:** `lib/performance/public-performance-policy.ts` (shared readiness policy)

### Prisma models (confirmed via `schema.prisma`)
- `Pick` with `result` (PickResult), `settledAt`, `isPublished`, `isFeatured`,
  `isBootstrap`, `confidence`, `edgeScore`, `consensusPct`, `bookmakerCount`,
  `tier`, `pickGrade`, `riskLevel`, `reasoning`, `reasoningShort`,
  `factorBreakdown`, `modelVersion`, `generatedAt`, `dataFreshnessAt`
- `PickSignalSnapshot` with full forensic signal data + `isBootstrap`,
  `settlementResult`, `settledAt`, `eligibleForLearning`, `usedDerivedHistory`,
  `usedScheduleSignal`, `modelVersion`
- `PickResult` enum: PENDING, WIN, LOSS, PUSH, VOID
- `Promotion`, `DailyBrief` + `DailyBriefSection` + `DailyBriefItem`,
  `CalibrationProposal`, `ContentDraft` + sources + reviews,
  `CockpitTask`, `CockpitDecision`, `CockpitMediaItem`, `OperatorAgent` enum

### Readiness gates (`packages/prediction-engine/src/readiness.ts`)
- `canPersistCanonicalHistory`, `canUseDerivedHistory`, `canExposePublicPicks`,
  `canPromoteFeaturedPicks`, `canPublishContent`, `canExposePerformanceStats`,
  `canLearnFromOutcomes`, `canApplyCalibrationAdjustments` (constant false),
  `isBootstrapMode`, `confidenceDisplayMode`, `minDataQualityForGameLog`,
  `minSettledPicksForLearning`

## Safety findings

| Surface | Gate? | Notes |
|---|---|---|
| `/api/performance` (route.ts) | ✅ Yes — `canExposePerformanceStats` check returns 503 with `bootstrapGateResponse` | Also filters `isBootstrap: false`, `isPublished: true` |
| `/performance/page.tsx` | ✅ Yes — `canExposePerformanceStats` short-circuits to `<PerformanceBootstrapState />` | Bootstrap branch hits no DB; gated branch reads `db.performanceSummary` but only after the gate |
| `/api/picks/route.ts` | ✅ Yes — `canExposePublicPicks` returns 503; filters `isBootstrap: false`, `isPublished: true` | |
| `/picks/page.tsx` | ⚠️ Indirect — relies on `/api/picks` 503; renders results from API only | Should display an explicit "bootstrap collecting" message when picks are empty/blocked, not silently |
| `/dashboard/page.tsx` | ❌ **Bug** — computes 14-day record/win-rate from `db.pick.findMany` directly without checking `canExposePerformanceStats`, without excluding `isBootstrap=true`, and with no readiness fallback | This is the primary fix in Phase 2 |
| `/admin/dashboard` + `/admin/picks` + `/admin/*` | ✅ Yes — `session.user.role !== "ADMIN"` redirect | |
| `/cockpit/*` | ✅ Yes — `app/cockpit/layout.tsx` redirects non-admin | |

## Missing for tonight's launch observatory

1. **Jarvis synthesis layer** — `lib/cockpit/jarvis.ts` returning a structured
   `JarvisLaunchAssessment` consumed by `/cockpit` overview.
2. **Forensic pick ledger** — `/cockpit/history` with last 100 picks, eligibility
   reasons, signal snapshot presence, learning eligibility.
3. **Public-performance policy** — `lib/performance/public-performance-policy.ts`
   producing the canonical counts the dashboard and Jarvis both consume.
4. **Dashboard win-rate gate** — `/dashboard/page.tsx` must hide win-rate /
   record claims when `canExposePerformanceStats=false` *or* the underlying
   picks are bootstrap-era.
5. **Admin↔Cockpit cross-link** — small note on `/admin/dashboard` directing
   operators to `/cockpit` for the Jarvis synthesis.
6. **Docs** — `docs/launch-observatory.md` describing customer vs operator vs
   Jarvis split and how to verify locally.

## Sandbox blockers (carry-over)

- `node_modules/` partially populated and cannot be removed (sandbox ACL) →
  `npm install`/`lint`/`typecheck`/`test`/`build` cannot run.
- `.git/index.lock` exists and cannot be removed (sandbox ACL) → `git add` /
  `git commit` blocked from inside the sandbox.

All edits land on the Windows-side filesystem via the Read/Write/Edit tools.
Validation and commit/push must be performed by the operator once the sandbox
ACL is cleared with the recipe in `handoff.md §8.11`.

## Phase plan (this pass)

1. Public-performance policy helper.
2. Gate `/dashboard` win rate; small label fix on `/picks`.
3. Jarvis synthesis layer (`lib/cockpit/jarvis.ts`) + tests.
4. Promote `/cockpit` overview with Jarvis assessment + phase matrix + missing-layer matrix.
5. `/cockpit/history` forensic pick ledger.
6. Tests: admin-gating smoke for new routes, dashboard gate test, Jarvis unit test.
7. Docs: `docs/launch-observatory.md`.
8. Attempt commit/push/PR (will note sandbox blocker if it fires).
