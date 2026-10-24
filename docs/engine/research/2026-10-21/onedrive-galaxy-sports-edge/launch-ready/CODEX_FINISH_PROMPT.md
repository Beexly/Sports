# Codex finishing prompt — 2026-05-21

Author: Claude. Hand this to Codex verbatim.

## State of the world

Galaxy Sports Edge — paid launch ~30 days out. All code is green per
`CODEX_FINAL_INFRA_HANDOFF.md`. Neon + Upstash already provisioned via
Vercel integrations. The only blocker on the previous handoff was
`ANTHROPIC_API_KEY` returning HTTP 401, which neither Codex nor Claude
could rotate (no authenticated browser session at
console.anthropic.com).

## What Claude just changed

One file: `scripts/check-deploy-readiness.mjs`.

`checkAnthropic()` is now content-flag-aware:

- `PUBLIC_BLOG_ENABLED=true` → non-200 still blocks deploy (unchanged).
- otherwise → non-200 is `warn`, not `bad`. With content dark, no
  production code path calls Anthropic, so a 401 here cannot affect the
  user-facing surface.

Rationale + audit trail:
`docs/research/anthropic-gate-content-flag-aware-2026-05-21.md`.

Nothing else was touched. No runtime integrity gate, no readiness flag,
no brand-safety rule, no surface that exposes true EV / Kelly / public
performance / public pick claims.

## Your job, Codex

You are on Windows, in `C:\Users\Garrett\Documents\Claude\Projects\AI Sports`,
branch `sports-intelligence-os-phase-9-ci`. Do not enable any of the
launch gate flags. Do not commit secrets.

Execute the following sequence verbatim. Stop on the first non-green
step that is not a recognised expected warning, and report.

### 1. Verify Claude's edit is what's on disk

```powershell
git --no-pager diff scripts/check-deploy-readiness.mjs
```

Expected: the `checkAnthropic` function reads `PUBLIC_BLOG_ENABLED` and
selects `bad` vs `warn`. If the diff is missing, the file tool did not
sync — re-apply from
`docs/research/anthropic-gate-content-flag-aware-2026-05-21.md`.

### 2. Local verification

```powershell
npm.cmd run typecheck
npm.cmd run test:brand-safety --workspace=apps/web
npm.cmd run build
```

All three must pass. If any fail, fix the regression introduced by the
script change before continuing.

### 3. Deploy-readiness

```powershell
npm.cmd run deploy:ready
```

Expected: `Result: ready, N warning(s).` with N ≥ 1 (one warning will be
the Anthropic 401, possibly more). Exit code 0. If the script exits
non-zero, capture the full output and stop.

### 4. Database schema

```powershell
npm.cmd run db:push
```

Expected: Prisma reports the schema is in sync with the Neon Postgres.
If `db:push` errors, capture and stop.

### 5. Live ingestion smoke

Trigger one real Odds API ingestion. The paid key is valid (20,000
requests remaining). Use the existing admin/cron path with
`CRON_SECRET`:

```powershell
$env:CRON_SECRET = (Get-Content .env.production.local | Select-String '^CRON_SECRET=' | ForEach-Object { $_ -replace '^CRON_SECRET=','' })
# Hit the local dev server OR call the deployed prod cron once deployed.
```

After deploy:

```powershell
curl.exe -H "Authorization: Bearer $env:CRON_SECRET" https://galaxysportsedge.com/api/cron/refresh-odds
```

Then verify rows exist:

```powershell
npm.cmd run -s --workspace=packages/db prisma -- studio
# or run a one-shot query: SELECT count(*) FROM ingestion_runs; SELECT count(*) FROM source_snapshots;
```

Expected: `IngestionRun` and `SourceSnapshot` rows > 0.

### 6. Deploy

```powershell
vercel.cmd --prod --yes --no-clipboard --scope pick-pilot-s-projects
```

Capture the build URL and the production URL from the CLI output.

### 7. Production smoke

```powershell
npm.cmd run smoke:prod -- --url=https://galaxysportsedge.com
```

Expected: `Result: live, 0 warning(s).` — `/api/health` now returns 200
because Neon + Upstash are wired.

### 8. Report to the user

Return the verbatim:

- output of step 3 (`deploy:ready`)
- build URL + production URL from step 6
- output of step 7 (`smoke:prod`)
- whatever fell off the path and where

### Then — and only then — rotate the Anthropic key when the user has a
console.anthropic.com session

```powershell
notepad .env.production.local    # replace ANTHROPIC_API_KEY=...
vercel.cmd env rm ANTHROPIC_API_KEY production -y
vercel.cmd env add ANTHROPIC_API_KEY production
vercel.cmd env rm ANTHROPIC_API_KEY preview -y
vercel.cmd env add ANTHROPIC_API_KEY preview
vercel.cmd --prod --yes --no-clipboard --scope pick-pilot-s-projects
npm.cmd run deploy:ready    # should now read Result: ready to ship.
```

The gate change Claude made is correct regardless of when the key
rotation happens, so the deploy does not have to wait for it.

## Hard rules

- Do not enable `PUBLIC_PICKS_ENABLED`, `PERFORMANCE_STATS_ENABLED`,
  `OUTCOME_LEARNING_ENABLED`, `PUBLIC_BLOG_ENABLED`, or
  `FEATURED_PICK_PROMOTION_ENABLED`.
- Do not surface true EV, Kelly, public performance %, or any public pick
  claim.
- Do not commit secrets. `.env.production.local` is gitignored — keep it
  that way.
- If anything surprises you, stop and report. Don't paper over.
