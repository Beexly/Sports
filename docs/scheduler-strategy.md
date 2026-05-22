# Scheduler Strategy

_Last updated: 2026-05-21_

## TL;DR

| Cadence | Today | Why |
| --- | --- | --- |
| Daily per-sport refresh | Vercel cron (declared in `vercel.json`) | Free on Hobby, runs even if GitHub is down |
| **30-minute refresh** | **GitHub Actions** (`.github/workflows/external-cron.yml`) | Free, no Vercel Pro upgrade needed for launch |
| Hourly pick settlement | GitHub Actions (`:15` past the hour) | Same workflow, separate job |
| `jarvis-snapshot` | Vercel daily (13:00 UTC) | Daily cadence is sufficient |

The Vercel daily crons are intentionally **not removed**. They are the
belt-and-suspenders backstop: if GitHub Actions has an outage, the daily
refresh still keeps the platform from going completely stale.

## Why not Vercel Pro right now

- Hobby cron cap is once per day. Pro unlocks unlimited cron at $20/mo
  per member.
- Pre-launch traffic doesn't justify the spend yet; we have no paying
  accounts (see memory `sports-launch-decisions`).
- The route itself doesn't care who invokes it — it just checks
  `Authorization: Bearer ${CRON_SECRET}`. So Vercel cron and GitHub
  Actions are interchangeable from the route's perspective.

## How the external scheduler works

`/.github/workflows/external-cron.yml` runs on two schedules:

- `*/30 * * * *` — refresh odds across all `SUPPORTED_SPORTS`
- `15 * * * *` — settle picks for any games that have completed

Each job pulls two secrets from the repository's Actions secrets:

- `CRON_SECRET` — must match the value in Vercel Production env
- `CRON_TARGET_URL` — `https://galaxysportsedge.com` (no trailing slash)

A failed HTTP call fails the job, which shows up in the Actions tab.
There is no retry loop — GitHub's next scheduled tick is the retry.

## Setup checklist (one-time)

1. In GitHub → repo Settings → Secrets and variables → Actions:
   - Add `CRON_SECRET` (copy from Vercel Production env)
   - Add `CRON_TARGET_URL` (e.g. `https://galaxysportsedge.com`)
2. Push the workflow file to `main`. GitHub will pick up the schedule
   on the next tick.
3. Manually trigger once via the Actions tab → "External Cron" → "Run
   workflow" → choose `refresh-odds`. Confirm a `200` response.

## Known limitations

- **GitHub schedule drift.** Scheduled workflows can be delayed by up to
  ~10 minutes under heavy GHA load. Acceptable for odds refresh; the
  important constraint is that we don't go a full day without a refresh.
- **No persistent state.** GitHub Actions can't keep state between runs.
  All state lives in the database. The cron route is idempotent.
- **Concurrent runs are disabled** via `concurrency.group` so two
  half-hour overlaps don't double-write.

## Upgrade path

When traffic justifies it (or if 30-min refresh proves insufficient):

1. Upgrade Vercel to Pro.
2. Replace the daily entries in `vercel.json` with `*/30 * * * *`.
3. Either remove `external-cron.yml` or leave it disabled as backup.
4. No application code change required — the route doesn't know or
   care who invokes it.

## Backup option: cron-job.org

If GitHub Actions becomes unreliable, the same routes can be hit from
[cron-job.org](https://cron-job.org/) with the `Authorization` header
configured. Documented here as a fallback only — GitHub is the primary
external scheduler.

## Brand-safety note

The cron routes are write-side only. They don't expose any picks,
performance numbers, EV claims, or stake recommendations to the public.
Nothing here changes the launch-gate posture documented in
`docs/launch-qa-checklist.md`.
