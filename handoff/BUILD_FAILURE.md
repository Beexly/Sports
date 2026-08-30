# P7-07 — Production Build Failure Report

**Date:** 2026-08-15
**Task:** P7-07 — Production build verification
**Command:** `npm run build > handoff/build-raw.txt 2>&1`
**Exit code:** 1 (FAILURE)
**Status:** BLOCKED

## Exact Error

```
Error: DEV_FAKE_ADMIN must be unset in production — it grants ELITE to the
dev-admin session and would bypass the paywall. Unset it and redeploy.
    at C:\Users\Garrett\Sports\apps\web\.next\server\app\api\blog\route.js:1:5254

> Build error occurred
Error: Failed to collect page data for /api/blog
    at C:\Users\Garrett\Sports\node_modules\next\dist\build\utils.js:1269:15
```

## Failure Point

- **Phase:** `Collecting page data ...` (Next.js build phase — page data
  collection for `/api/blog`)
- **File (source of guard):** `apps/web/lib/entitlements.ts` (line 31-42)
- **File (compiled artifact):** `apps/web/.next/server/app/api/blog/route.js`
  (generated, destroyed after run)

## Root-Cause Diagnosis

1. Next.js 14.2.35 loads environment files during build. Build log line 6:
   `Environments: .env.local, .env`
2. `apps/web/.env.local` (line 122) contains:
   ```
   DEV_FAKE_ADMIN=true
   ```
3. The boot-time guard in `apps/web/lib/entitlements.ts`
   (`assertDevAdminDisabledInProd`) runs at module load and checks:
   ```js
   if (env["NODE_ENV"] === "production" && env["DEV_FAKE_ADMIN"] === "true") {
     throw new Error("DEV_FAKE_ADMIN must be unset in production — ...");
   }
   ```
4. During `npm run build`, Next.js sets `NODE_ENV=production` and loads
   `apps/web/.env.local`, so `DEV_FAKE_ADMIN` is `"true"`. The guard fires
   and aborts page-data collection for `/api/blog`, failing the entire build.

## Why This Is BLOCKED (Not Auto-Fixed)

- **The cause file is gitignored and not tracked by git.** `apps/web/.env.local`
  does not appear in `git status` and cannot be committed. Verified:
  `git check-ignore apps/web/.env.local` exits 0 (ignored).
- **The cause file was NOT touched by this sprint.** `git status --short`
  shows only these modified files:
  - `apps/web/app/cockpit/api-costs/budget-override-control.tsx`
  - `apps/web/lib/data-sources/free-score-persist.ts`
  - `handoff/PHASE4_SUMMARY.md`
  - `handoff/SPRINT_JOURNAL.md`
  - `handoff/SPRINT_QUEUE.md`
  None of these is `/api/blog`, `entitlements.ts`, or any env file.
- **DEV_FAKE_ADMIN is explicitly owner-gated hardening.** Per
  `reports/claude/GALAXY_FULL_AUDIT_2026-05-29.md` (line 91):
  > "DEV_FAKE_ADMIN — Owner-gated hardening (do NOT auto-change — protects
  > the launch workflow)"
- **Alternative attempted (ONE retry, per task rules):** ran
  `env -u DEV_FAKE_ADMIN npm run build` — same failure. The `env -u`
  override does not help because Next.js loads `apps/web/.env.local`
  (which contains `DEV_FAKE_ADMIN=true`) at the framework level, overriding
  the process environment.

## What Would Fix It

Unset or remove `DEV_FAKE_ADMIN=true` from `apps/web/.env.local` (line 122).
This is a **local, gitignored environment file** — the change is local-only and
cannot be committed. This setting is a deliberate launch-night convenience
(`DEV_FAKE_ADMIN=true` lets the dev-admin session get ELITE tier during demo
mode — see `QUICKSTART.md`, `reports/launch-night/run-dashboard-tonight.md`).
It must be set to `false` (or removed) for any production build to succeed.

**This fix is owner-gated and requires explicit approval** — it is not a
code change and does not belong to any sprint-touched file.

## VERIFY Outcome

`handoff/build-raw.txt` exists (55 lines) showing the documented failure with
root cause. The build-output file satisfies the VERIFY requirement of
"showing either a successful build or a documented failure with root cause."

## Cleanup Performed

- `rm -rf apps/web/.next` — removed the regenerable, gitignored build artifact
  (the ONE deletion permitted by the task).
