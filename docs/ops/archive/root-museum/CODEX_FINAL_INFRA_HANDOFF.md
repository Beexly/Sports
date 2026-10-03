# Galaxy Sports Edge - Codex Final Infrastructure Handoff

Date: 2026-05-21
Workspace: `C:\Users\Garrett\Documents\Claude\Projects\AI Sports`
Branch: `sports-intelligence-os-phase-9-ci`
Production URL: `https://galaxysportsedge.com`

## Current State

Code remains locally green after the infrastructure pass:

- `npm.cmd run typecheck` passed across all workspaces.
- `npm.cmd run test:brand-safety --workspace=apps/web` passed: 19 files / 497 tests.
- `npm.cmd run build` passed.
- `git diff --check` passed.
- Previous full web test still stands from this pass: `npm.cmd run test --workspace=apps/web` passed: 110 files / 1,342 tests.

Production is live, but deployment is intentionally paused until Anthropic is fixed:

- Previous production smoke: `npm.cmd run smoke:prod -- --url=https://galaxysportsedge.com` returned `Result: live, 1 warning(s)`.
- Previous warning: `/api/health` returned HTTP 503 before DB/Redis were provisioned.
- Latest `npm.cmd run deploy:ready` now returns `Result: 1 failure(s)`.

## What Codex Fixed

- Validated and hardened the Evidence Audit Drawer work.
- Fixed TypeScript issues in the interactive galaxy and optional Neon serverless scaffold.
- Repaired stale cockpit/runbook contract tests.
- Fixed `/picks` SSR origin handling so localhost/preview fetches the current host instead of production.
- Added `PublicPick.isAuditAvailable` so sample/demo picks no longer show a dead Evidence Audit button.
- Kept real published picks eligible for the forensic Evidence Audit Drawer.
- Added the Evidence Readiness Matrix in `packages/prediction-engine/src/evidence-readiness-matrix.ts`.
- Added tests for factor activation, shadow-mode protection, staleness blocking, trust normalization, and true-EV blocking.
- Added source strategy notes in `docs/research/evidence-source-strategy-2026-05-21.md`.
- Provisioned Neon Postgres through the Vercel integration.
- Provisioned Upstash Redis through the Vercel integration.
- Added `pg` and `ioredis` to root dependencies so `deploy:ready` can actually prove Postgres and Redis reachability.
- Set local `.env.production.local` with `DATABASE_URL`, `DIRECT_URL`, and `REDIS_URL` from the provider integrations.
- Set Vercel Production `DIRECT_URL` from the Neon unpooled connection string.

## Infrastructure Now Green

These checks are proven green in `deploy:ready`:

- `DATABASE_URL` present.
- `DIRECT_URL` present.
- `REDIS_URL` present.
- Postgres reachable: `SELECT 1 returned`.
- Redis reachable: `PING -> PONG`.
- The Odds API key valid: `74 sports listed; 20000 requests remaining`.
- Stripe secret key valid in test mode.
- `STRIPE_PRO_PRICE_ID` resolves to `$19.00/month`.
- `STRIPE_ELITE_PRICE_ID` resolves to `$49.00/month`.
- `vercel.json` crons present: 3 schedules.
- Security headers present.
- Bootstrap gate sanity passes.

## Remaining Blocker

Only one blocker remains before database push, deploy, and production smoke:

1. Rotate/fix Anthropic key:
   - Latest deploy-readiness result: `Anthropic API key HTTP 401`.
   - Browser session is not logged into Anthropic Platform; it lands on the sign-in page.
   - Create a fresh Anthropic API key, then update local `.env.production.local` and Vercel Production/Preview `ANTHROPIC_API_KEY`.
   - Do not commit the key.

## Commands To Continue

After the Anthropic key is replaced:

```powershell
cd "C:\Users\Garrett\Documents\Claude\Projects\AI Sports"
npm.cmd run deploy:ready
```

Expected before deploy: zero failures.

Then:

```powershell
npm.cmd run db:push
```

Trigger one live ingestion cycle and verify evidence rows:

```powershell
# Use the app's existing cron/admin trigger once deploy readiness is zero.
# Confirm IngestionRun and SourceSnapshot rows are created.
```

Deploy:

```powershell
vercel.cmd --prod --yes --no-clipboard --scope pick-pilot-s-projects
```

Smoke:

```powershell
npm.cmd run smoke:prod -- --url=https://galaxysportsedge.com
```

## Claude Continuation Prompt

Continue from `CODEX_FINAL_INFRA_HANDOFF.md` in `C:\Users\Garrett\Documents\Claude\Projects\AI Sports`.

Do not change product code unless a verification command proves it is necessary. The code is green locally. Neon Postgres and Upstash Redis are already provisioned through Vercel integrations, and `deploy:ready` proves both services reachable. Your task is infrastructure finalization only:

1. Create or locate a fresh Anthropic API key. The current key fails deploy readiness with HTTP 401.
2. Update `.env.production.local` and Vercel Production/Preview `ANTHROPIC_API_KEY`. Do not print or commit the key.
3. Run `npm.cmd run deploy:ready`; stop unless it returns zero failures.
4. Run `npm.cmd run db:push`.
5. Trigger one real odds ingestion using the paid Odds API key already present; confirm `IngestionRun` and `SourceSnapshot` rows exist.
6. Deploy with `vercel.cmd --prod --yes --no-clipboard --scope pick-pilot-s-projects`.
7. Run `npm.cmd run smoke:prod -- --url=https://galaxysportsedge.com`.
8. Report exact deploy-readiness output, build URL, production URL, and smoke summary.

Do not commit secrets. Do not enable public performance stats, true EV, Kelly, or public pick claims until canonical data is real and gates prove readiness.
