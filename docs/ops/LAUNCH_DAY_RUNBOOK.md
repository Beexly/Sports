# Launch day runbook (10 minutes)

A human can run this top to bottom in about 10 minutes. It only reads live state — it
never flips a gate, never touches a secret, and it is safe to run repeatedly.

For the full list of every open manual owner action (with exact commands), run:

```bash
npm run ops:runbook
```

or see `docs/ops/OPERATOR_TASKS.md` directly. This doc is the day-of sequence; that one
is the standing checklist.

---

## T-24h (day before kickoff)

```bash
npm run launch:ready
```

Reads `scripts/check-launch-readiness.mjs` — read-only, no secrets, probes the live
production endpoints (`/api/health?strict=1`, `/api/ops/public-surface-truth`, the picks
and proof APIs) plus the repo (cron config mirror, operator tasks, nflverse currency).

**What "green" looks like:** the script prints one `PASS` / `WARN` / `FAIL` line per
item, then a summary line:

```
[launch-readiness] https://www.galaxysportsedge.com at <timestamp>
  PASS health (strict)         HTTP 200, status=healthy, settlement=healthy
  PASS scheduler liveness      healthy (last cron success 1m ago)
  PASS settlement              HEALTHY, 0 overdue of <N> commenced
  ...
[launch-readiness] 0 FAIL, <N> WARN, <N> PASS
```

Exit code is `1` if there is any `FAIL` row — that is a stop, read the row's detail and
fix it before continuing. A `WARN` is not a stop by itself (e.g. calibration eligibility
RED is expected pre-PROVEN; nflverse currency WARN is expected before week 1) but read
each one.

Also confirm every open owner action from `npm run ops:runbook` that is safe to close out
early (env vars, GitHub settings) is done — nothing in this section is time-sensitive to
kickoff itself.

## T-2h (final check before the slate goes live)

```bash
npm run launch:ready
node scripts/check-operator-tasks.mjs
```

`check-operator-tasks.mjs` re-parses `docs/ops/OPERATOR_TASKS.md` and prints, per task,
either a real repo-verified verdict or `manual — see task text`. **What "green" looks
like:** the summary line at the end —

```
[operator-tasks] <N> open, <N> done, <N> repo-verified
```

An `open` count above zero is not itself a stop (several tasks are legitimately
account/console-level and stay open until the owner does them by hand — `NEON-RO`,
`CONN-PRUNE`, `PUSH-PROTECT`, `BRANCH-PROTECT`). What matters is that nothing shows
`repo-check: UNVERIFIED` for an item you believe you already fixed.

If `THE_ODDS_API_KEY` posture is being decided this window, see `npm run ops:runbook`'s
`ODDS-API-KEY` entry — either state (present or absent) is safe; the free grader is the
primary settlement pass every cycle regardless (`apps/web/lib/settlement/path-select.ts`).

## Kickoff

Nothing to run by hand. The board serves from cron-refreshed data
(`apps/web/vercel.json`); confirm live one more time:

```bash
curl -sS "https://www.galaxysportsedge.com/api/health?strict=1" | jq '{ok, status}'
```

**What "green" looks like:** `{"ok": true, "status": "healthy"}`. `apps/web/app/api/health/route.ts`
returns HTTP 200 with `ok: true` only when `?strict=1` is set AND the database + ingestion
checks are `ok` AND the settlement capability is not `degraded`/`unavailable`. Without
`?strict=1` the route stays HTTP 200 even while settlement lags — that mode is for the
Nightly Sentinel, not this check. If it is not green: read the `checks` and
`capabilities` arrays in the JSON body for which probe failed, and the matching row in
`npm run launch:ready`'s output for the same detail with more context.

## T+6h (settlement check)

```bash
curl -sS -H "Authorization: Bearer $CRON_SECRET" \
  "https://www.galaxysportsedge.com/api/cron/settle-picks" | jq .
npm run launch:ready
```

**What "green" looks like:** the settle-picks response's `path` is `"free"` or
`"free+odds-api"` (never an error), and `npm run launch:ready`'s `settlement` row reads
`PASS ... HEALTHY, 0 overdue`. `SETTLEMENT_DEFAULT_GRACE_HOURS = 6`
(`apps/web/lib/performance/settlement-health.ts`) is exactly why this check sits at T+6h
— it is the first point overdue picks can legitimately exist. 1-4 overdue is `DEGRADED`
(not a stop, watch it); ≥5 is `CRITICAL` and is a stop — re-run settle-picks and see
`docs/ops/SETTLEMENT_BACKLOG_CLEARANCE.md` if it does not drain.

---

## Rollback

If a deploy is bad: Vercel → Project → Deployments → find the last known-good
deployment → **Promote to Production**. This re-points the production alias without a
new build; it does not touch the database (migrations are additive/idempotent —
`packages/db/prisma/migrations/20260101000000_baseline/migration.sql` — so an older
deployment is expected to run against a newer schema without erroring). After promoting,
re-run `npm run launch:ready` against the restored deployment to confirm.

---

## If something is red

1. Read the failing row's `detail` field (both `launch:ready` and `check-operator-tasks`
   print one) — it names the exact reason, not just pass/fail.
2. Cross-reference `npm run ops:runbook` for the exact command to fix it, if it is a
   manual owner action.
3. If it is a code/data issue rather than an owner action, it is not this runbook's
   scope — see the relevant `docs/ops/*.md` runbook (`FREE_MODE_INGESTION_HEALTH.md` for
   ingestion, `SETTLEMENT_BACKLOG_CLEARANCE.md` for settlement, `HEALTH_ALERTING.md` for
   the alert cron itself).
