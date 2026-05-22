# Scheduler Strategy

## Why we use an external scheduler

Vercel Hobby supports one cron execution per day per path, while Sports
needs more frequent write-side maintenance:

- `POST /api/cron/refresh-odds` every 30 minutes
- `POST /api/cron/settle-picks` at `:15` each hour

To keep the application on the current Vercel tier, we run these higher
frequency jobs through GitHub Actions and keep daily Vercel cron entries
as a fallback backstop.

## Components

### 1) Vercel cron (backstop)

`vercel.json` remains unchanged and keeps conservative daily cron entries.
If GitHub Actions is paused, daily runs still execute and prevent complete
scheduler outage.

### 2) GitHub Actions external cron (primary high-frequency path)

Workflow: `.github/workflows/external-cron.yml`

Behavior:

- Schedule `*/30 * * * *` triggers `refresh-odds`
- Schedule `15 * * * *` triggers `settle-picks`
- Manual dispatch can target either route

The workflow routes scheduled runs from `github.event.schedule`, not from
the current runner clock. This keeps delayed GitHub runners from calling
the wrong endpoint when a scheduled run starts late.

Both requests call production at `CRON_TARGET_URL` and authenticate with
`CRON_SECRET` bearer auth.

Operational hardening:

- One cron run per schedule/target runs at a time; queued runs are not
  cancelled.
- Each job has a 10-minute timeout.
- Targets are allowlisted before any request is sent.
- `curl` uses retries plus connection and total request timeouts.
- Temporary response files are removed on exit.

## Required secrets

### GitHub repository secrets

- `CRON_SECRET`: Must match Vercel production `CRON_SECRET`
- `CRON_TARGET_URL`: Production base URL
  (`https://galaxysportsedge.com`)

### Vercel environment variables

- `CRON_SECRET` in Production and Preview
- `ANTHROPIC_API_KEY` in Production and Preview

## Rotation and operations

### Rotating `ANTHROPIC_API_KEY`

1. Update `.env.production.local` locally
2. Replace Vercel Production and Preview values
3. Trigger a production redeploy
4. Run deploy readiness + smoke checks

### Verifying scheduler health

1. Manually dispatch workflow with `target=refresh-odds`
2. Confirm run succeeded with HTTP 200
3. Verify response body reports `ok: true`
4. Re-run production smoke tests

## Guardrails

- Scheduler endpoints are intentionally write-side only.
- No public UX, pricing, or performance claims are exposed by this
  strategy.
- Do not change launch gates or public product behavior when adjusting
  scheduler mechanics.

## Upgrade path

If Vercel plan changes and higher-frequency native cron becomes available,
we can migrate interval scheduling from GitHub Actions back to Vercel and
retain this workflow as emergency fallback.
