# P0-Only Staging Manifest

Date: 2026-06-09
Repo: `C:\Users\Garrett\Sports`  ·  Branch: `safety/sports-wip-2026-06-04`
Status: **PREPARED — not staged, not committed, not deployed.** (Owner authorizes staging/commit/deploy.)

Decision frame: **ship the deploy clone narrow first.** Everything outside the P0 fail-closed launch repair (control-plane feature, world-model types, broad research, Voice OS, snapshots) is **Launch 2** and is excluded here.

## Self-consistency check (verified)
The P0 subset builds on a clean checkout WITHOUT the excluded files:
- `apps/web/package.json` change is ONLY the `test:cockpit` script gaining the two `cockpit-control-plane` tests → control-plane feature, not a P0 dependency.
- `packages/types/src/index.ts` change is ONLY `export * from "./world-model.js"` → world-model feature, not a P0 dependency.
- `apps/web/lib/health/checks.ts` imports nothing from `@sports/types`; P0 routes read readiness from `@sports/prediction-engine` (unchanged).

## STAGE — the P0 fail-closed launch repair (22 paths)

App / script (modified):
```
apps/web/app/api/board/state/route.ts
apps/web/app/api/health/route.ts
apps/web/app/api/promotions/route.ts
apps/web/app/performance/page.tsx
apps/web/app/admin/dashboard/dashboard-view.tsx
apps/web/lib/auth.ts
apps/web/lib/board/passes.ts
apps/web/lib/board/state.ts
apps/web/lib/calibration/report.ts
apps/web/lib/entitlements.ts
apps/web/lib/promotions/public-payload.ts
apps/web/middleware.ts
scripts/prod-probe.mjs
```
New P0 routes / helper (untracked dirs):
```
apps/web/app/api/live/
apps/web/app/api/ready/
apps/web/lib/health/
```
P0 regression tests (modified):
```
apps/web/__tests__/board-gate-decisions.test.ts
apps/web/__tests__/entitlements-dev-admin.test.ts
apps/web/__tests__/guardrails.test.ts
apps/web/__tests__/health-route.test.ts
apps/web/__tests__/prod-probe-script.test.ts
apps/web/__tests__/promotions-public-payload.test.ts
```

### Suggested clean-commit command (run yourself when ready)
```
git add apps/web/app/api/board/state/route.ts apps/web/app/api/health/route.ts apps/web/app/api/promotions/route.ts apps/web/app/performance/page.tsx apps/web/app/admin/dashboard/dashboard-view.tsx apps/web/lib/auth.ts apps/web/lib/board/passes.ts apps/web/lib/board/state.ts apps/web/lib/calibration/report.ts apps/web/lib/entitlements.ts apps/web/lib/promotions/public-payload.ts apps/web/middleware.ts scripts/prod-probe.mjs apps/web/app/api/live apps/web/app/api/ready apps/web/lib/health apps/web/__tests__/board-gate-decisions.test.ts apps/web/__tests__/entitlements-dev-admin.test.ts apps/web/__tests__/guardrails.test.ts apps/web/__tests__/health-route.test.ts apps/web/__tests__/prod-probe-script.test.ts apps/web/__tests__/promotions-public-payload.test.ts
git status            # confirm ONLY the 22 P0 paths are staged
git commit -m "fix(launch): fail-closed public routes + liveness/readiness split + prod DEV_FAKE_ADMIN guard"
```

## EXCLUDE — do NOT stage in the P0 commit (Launch 2 / unrelated)
- Control-plane feature: `apps/web/app/cockpit/sources/page.tsx`, `apps/web/lib/cockpit/intelligence-control-plane.ts`, `apps/web/__tests__/cockpit-control-plane.test.ts`, `apps/web/__tests__/cockpit-control-plane-render.test.tsx`, `apps/web/package.json`
- World-model: `packages/types/src/index.ts`, `packages/types/src/world-model.ts`, `packages/types/src/__tests__/world-model.test.ts`
- Generated snapshots: `reports/launch-night/snapshots/*.html`
- Research / evidence / generated: `docs/research/**`, `reports/codex/**`, `docs/command-center/**` (incl. this file)

## P1 — optional, safe, already green (your call to include or hold)
- `apps/web/__tests__/method-leakage-gate.test.ts` — new standing method/secret-leakage gate (35 tests, additive, no source touched). Safe to include; not required for P0.

## Still blocked on owner (before deploy)
1. Provision production-like DB + ingestion → flips `/api/ready` (and `?check=ingestion-freshness`) to 200.
2. `APP_URL=<target> node scripts/prod-probe.mjs` → green.
3. Stage exactly the 22 P0 paths above (command provided), commit, deploy.

Verified this session (deploy clone): typecheck ✓ · lint ✓ · 1863 tests ✓ · build ✓ · runtime probe ✓ (public routes 200-degraded, `/api/ready` correctly 503, auth gates redirect) · roster/Player-Lab scope gate closed (no route, no public claims).

---

## Launch-readiness audit addendum (2026-06-09)

Verdict: **GO-WITH-FIXES.** A 5-lens read-only audit (error-resilience, a11y, brand-safety, honest-content, auth-gate) found the deploy clone launch-grade. Brand-safety + auth-gate: **zero** findings. Two true-blockers fixed under the freeze:

- **Trust-copy fix** — replaced internal-debt phrasing `"Signal snapshot pending backfill."` (which leaked implementation debt + read as unreliable data on public trust surfaces) with `"Signal snapshot not available for this entry."` Pure string, no logic/test impact (no test pinned it). **ADD these 3 files to the P0 stage:**
```
apps/web/app/ledger/page.tsx
apps/web/app/performance/losses/page.tsx
apps/web/app/performance/losses/[id]/page.tsx
```
- **Promotions compliance copy** — `app/promotions/page.tsx` H1 `"Vetted sportsbook promotions."` → `"Sportsbook offers, reviewed before they appear."` (removes a present-tense claim that GSE endorses live sportsbook promos before any approved offer exists; subhead disclaimers already present). No test/snapshot pinned the string. **ADD `apps/web/app/promotions/page.tsx` to the P0 stage.**

So the P0 commit is now **26 paths** (22 fail-closed + 3 trust-copy + 1 promotions). Append all 4 copy files to the `git add` command. (Route copy audit `docs/command-center/launch/19-...md`; the rest — home intelligence-first framing, board/picks degraded-state lines, pricing-vs-checkout verification — is **owner/Launch-2**: pricing copy must be verified against live Stripe or checkout stays gated.)

Everything else is **Launch 2** (per scope freeze): defense-in-depth try/catch on 6 API-route db calls (pages already backstop them), a11y polish (contrast on 10px labels, skip-link, lang-attr), `"Email sign-in coming soon"` divider reword, and sample/preview terminology consistency. Full Launch-2 list in the audit output.

---

## Wave 2 — fail-closed truth contract (2026-06-09) — ADD to the P0 stage

The masked-success cron bug was the real launch blocker: `refresh-odds` discarded `processSport()`'s return, always pushed `ok:true`, and returned a default HTTP 200, so a provider 401/403/429/5xx was invisible to Vercel cron + uptime monitoring. Fixed + regression-guarded. This is launch-critical and belongs IN the P0 commit.

Source (modified/new):
```
packages/data-ingestion/src/provider-status.ts          # NEW — pure job-truth classifier
packages/data-ingestion/src/odds-api-client.ts          # OddsApiError carries classified providerStatus
packages/data-ingestion/src/index.ts                    # re-export classifier + types
packages/ingestion-pipeline/src/process-sport.ts        # records IngestionRun FAILED + classified reason
apps/web/app/api/cron/refresh-odds/route.ts             # keys off result.status; HTTP 200/207/502 by outcome
apps/web/lib/health/checks.ts                           # freshness tightened 120 -> 60 min (founder rule)
```
Tests (new):
```
packages/data-ingestion/src/__tests__/provider-status.test.ts   # 19 classifier cases
apps/web/__tests__/refresh-odds-truth-contract.test.ts          # 5 cases — failed pull never reports 200/ok:true
```
Append to the `git add`:
```
git add packages/data-ingestion/src/provider-status.ts packages/data-ingestion/src/odds-api-client.ts packages/data-ingestion/src/index.ts packages/ingestion-pipeline/src/process-sport.ts apps/web/app/api/cron/refresh-odds/route.ts apps/web/__tests__/refresh-odds-truth-contract.test.ts packages/data-ingestion/src/__tests__/provider-status.test.ts
# apps/web/lib/health/ is already in the P0 untracked-dir add above (includes checks.ts)
```
Verified (deploy clone, 2026-06-09): data-ingestion typecheck ✓ · data-ingestion vitest 30 ✓ (incl. 19 classifier) · ingestion-pipeline typecheck ✓ · apps/web typecheck ✓ · cron truth-contract 5/5 ✓ · health-route 7/7 ✓ · full apps/web suite 1863 ✓ (pre-Wave-2 baseline) · freshness now fails `/api/ready` closed past 60 min. Does NOT weaken freshness, hide failures, or surface stale-as-live.
