# Claude pickup from Codex Evidence Engine pass — 2026-05-21

**Status going in:** code is on disk and green (typecheck, build, brand-safety 481/481, perf/risk 315/315). What's blocking deploy is **credentials**, not code. The sandbox I'm running in has no Vercel/Neon/Upstash CLI, so the credential steps need either you to run them locally or me to drive your browser via computer-use.

## What I just did (code-side, no credentials needed)

- **Added Vercel cron schedule** to `vercel.json`. Codex's deploy:ready was failing on "no crons" — fixed. Three crons added:
  - `/api/cron/refresh-odds` every 30 min
  - `/api/cron/settle-picks` every 15 min
  - `/api/cron/jarvis-snapshot` hourly
  All three handlers already exist under `apps/web/app/api/cron/`.
- **Verified cron auth.** All three routes fail-closed on missing or mismatched `CRON_SECRET` (500/401). The Vercel `Authorization: Bearer <CRON_SECRET>` pattern is wired correctly. No public DOS surface after schedule is live.
- **Audited Codex's Prisma schema additions for additivity.** Confirmed safe for `npm run db:push`:
  - `model SourceSnapshot { ... }` — new table, no existing data to migrate.
  - `enum SourceSnapshotKind { ... }` — new enum.
  - `IngestionRun.sourceSnapshots` — new back-relation, no schema rewrite.
  - New `PickSignalSnapshot` flag fields (`hadPlayerSignal`, `hadOfficialsSignal`, `hadVenueEnvironmentSignal`, `hadPaceSignal`, `hadMilestoneSignal`) are `Boolean @default(false)` — additive, existing rows safe.
  - New quantitative fields are nullable `Int?` / `Float?` — additive.
- **Traced ingestion → SourceSnapshot write end-to-end.** `processSport()` calls `recordSourceSnapshot()` with the raw `events` payload + `ingestionRunId` BEFORE normalization. SHA-256 hash + payload bytes recorded. Snapshot write is in a try/catch so a snapshot failure logs a warning but doesn't kill the run — correct tradeoff (evidence collection is best-effort, ingestion is primary). Forensic chain intact.
- **Public-surface data-leak scan.** Homepage `fetchHomepagePicks` calls `/api/picks` returning `PublicPick` shape — no trueEV, no Kelly, no player names, no ref data, no venue, no pace. Mission Control component is pure static literals. InteractiveGalaxy is `"use client"` with no data fetch. Galaxy evidence node copy explicitly frames player/official/venue/EV/pace as gated shadow evidence. Brand-safety surface is clean.

## What still needs your hands or your approval

These all require account/credential decisions that should not be made by the agent:

### 1. Neon Postgres
Sign in / sign up at https://console.neon.tech → create project `galaxy-sports-edge` in `us-east-1` (matches Vercel `iad1`). Copy two connection strings from the project dashboard:
- **Pooled** (port 6543, ends with `pgbouncer=true`) → set as `DATABASE_URL`
- **Direct** (port 5432) → set as `DIRECT_URL`

### 2. Upstash Redis
Sign in / sign up at https://console.upstash.com → create a Redis database in `us-east-1`. Copy the `redis://` connection string (the one with credentials baked in, not the REST URL) → set as `REDIS_URL`.

### 3. Anthropic key rotation
Current key returns 401 in deploy-readiness. Console: https://console.anthropic.com → API keys → rotate. Update `ANTHROPIC_API_KEY` everywhere.

### 4. Push the three new env vars to Vercel + local env

Local (`.env.production.local`):
```
DATABASE_URL=postgres://...pgbouncer=true
DIRECT_URL=postgres://...:5432/...
REDIS_URL=rediss://default:...@...:6379
ANTHROPIC_API_KEY=sk-ant-...
```

Vercel (run from `C:\Users\Garrett\Documents\Claude\Projects\AI Sports`):
```
vercel.cmd env add DATABASE_URL production
vercel.cmd env add DIRECT_URL production
vercel.cmd env add REDIS_URL production
vercel.cmd env rm ANTHROPIC_API_KEY production
vercel.cmd env add ANTHROPIC_API_KEY production
```

### 5. Verify, push schema, ingest, ship

```
npm.cmd run deploy:ready
npm.cmd run db:push
# trigger one ingestion cycle via admin/cron route — confirm IngestionRun + SourceSnapshot row created
npm.cmd run typecheck
npm.cmd run test:brand-safety --workspace=apps/web
npm.cmd run build
vercel.cmd --prod --yes --no-clipboard --scope pick-pilot-s-projects
npm.cmd run smoke:prod -- --url=https://galaxysportsedge.com
```

**Stop and report at any failure.** Do not deploy if `db:push` fails or if live ingestion can't write a `SourceSnapshot`.

## Notes
- Rotate the previously-pasted Odds API key when convenient — it has been in chat.
- Existing test debt in `packages/db/prisma/seed.ts` and a few cockpit/runbook tests is unrelated to launch — don't get pulled in unless you're cleaning debt explicitly.
