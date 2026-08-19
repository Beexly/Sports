# Incident Response + Rollback Runbook

**Scope:** This runbook is grounded in real files in this repo. Every procedure cites the
implementing file or flag. Where the repo has no answer, "NO PROCEDURE EXISTS" is written
explicitly rather than invented.

**Last verified against:** repo state 2026-08-16.

---

## 0. Quick reference — at a glance

| Scenario | What to do | Evidence |
|---|---|---|
| Site degraded vs down | Read `/api/health` → `ok`+HTTP 503 = DB/ingestion; `status=degraded` = settlement lag | `apps/web/app/api/health/route.ts` |
| Board not refreshing | Trigger `/api/cron/refresh-odds` or `/api/cron/free-spine-health` with Bearer | `vercel.json` crons §12-13, §69-71 |
| Kill a broken feature fast | Unset/reverse the env flag (no code redeploy of logic needed) | `.env.example` §§244-294 |
| Paid ingestion 401s | Check `THE_ODDS_API_KEY` configured; circuit breaker may have opened | `packages/data-ingestion/src/odds-api-circuit-breaker.ts` |
| Payment circuit open | Odds API returned 402; circuit is open for 6h; set `ODDS_API_CIRCUIT_FORCE_OPEN=1` to force | `packages/data-ingestion/src/odds-api-circuit-breaker.ts:80-83` |
| Roll back a bad deploy | Vercel Dashboard → Deployments → pick last-good → "Promote to Production" | `.claude/worktrees/phase3/reports/go-live/ROLLBACK_PLAN.md:47-48` |
| DB is the cause | `/api/health` → `checks.database.status`; `DATABASE_URL` presence; Neon dashboard | `apps/web/lib/health/live-capability-probes.ts` |
| No error visibility | Sentry reads `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN`; no-ops when absent | `apps/web/lib/observability/sentry.ts:25-56` |

---

## 1. Deployment model — how code actually reaches production

**Source of truth:** `vercel.json` (line 3) build command + Vercel auto-deploy on `main`.

- A change reaches production by **merging to `main`**. Vercel auto-deploys every push to `main`
  (and to a branch alias for PRs). There is no separate "promote" button for application code on
  the default flow.
- `vercel.json` build command:
  ```
  cd ../.. && npm run db:generate && node scripts/deploy/migrate-if-configured.mjs && NODE_OPTIONS=--max-old-space-size=8192 npm run build --workspace=@sports/web
  ```
- **Deployment is alias-based.** Vercel serves the app under `https://www.galaxysportsedge.com`
  (custom domain). `vercel.json` does NOT define a `alias` field for custom promotion — Vercel's
  default production deployment on `main` is the path.
- **Critical:** `vercel rollback` does NOT work here. The ROLLBACK_PLAN in this repo states
  (line 47-48): "On Vercel: Deployments → pick the last good one → **Promote to Production** (instant)."
  The Vercel CLI `rollback` command is a different mechanism (restores old build files) that is
  not the documented path for this project. The repo's prior finding records this explicitly:
  this deployment is alias-based, so the revert path is **manual promotion of the last known-good
  deployment via the Vercel Dashboard**.

### Deployment SHA verification

- Confirm what is actually live by reading `/api/ops/public-surface-truth` → `deployment.sha`.
- Per `docs/ops/DEPLOY_LAG.md` (line 23, 14): "Code on main is not live until Vercel serves that
  SHA. Always probe `deployment.sha` before concluding settlement code 'failed.'"

### Build-time migration gate

- `scripts/deploy/migrate-if-configured.mjs` runs `prisma migrate deploy` at build time when
  `VERCEL_ENV=production`. It fails closed on DB errors. See `handoff/DEPLOY_READINESS.md` §2 for
  the entity-graph migration status and `MIGRATE_GATE_ALLOW_UNVERIFIED` escape hatch.

---

## 2. Telling degraded from down — health probes

### `/api/health`

**Source:** `apps/web/app/api/health/route.ts`

Returns:
```json
{
  "ok": true,              // database + ingestion checks only
  "status": "healthy"|"degraded",
  "checks": { "database": {...}, "ingestion": {...} },
  "capabilities": [...],
  "capabilityGraph": [...],
  "schedulerLiveness": {...},
  "deployment": { "sha": "...", "observedAt": "..." }
}
```

**Semantics (from `docs/ops/CLAUDE_OWNER_LAUNCH_HANDOFF.md` §Concepts):**
- `ok: true` + HTTP 200 → DB and ingestion checks pass.
- `ok: false` + HTTP 503 → **database or ingestion checks failed** (pipeline death). This is "down."
- `status: "degraded"` while `ok: true` → settlement capability is CRITICAL/DEGRADED, or a
  non-critical check is off. This is "degraded," not "down."
- Settlement CRITICAL alone does **not** 503 the health route; it sets `status: degraded` and the
  `settlement` capability to `unavailable`. Sentinel/uptime still uses `ok + HTTP`.

### `/api/ops/public-surface-truth`

**Source:** `apps/web/app/api/ops/public-surface-truth/route.ts`

The ops truth endpoint. Without Bearer: `detail: "public"`. With Bearer:
`detail: "operator"`, includes `bySport` + `operatorNext`, settlement counts, gates, revenue
ladder, founderNextSteps.

### Health alert cron

**Source:** `apps/web/app/api/cron/health-alert/route.ts` — schedule `*/15 * * * *`
(in `vercel.json` line 74, CRON_MATRIX.md line 37).

Alerts on:
- Any live check status ≠ `ok`
- Ingestion last-success age > 90 minutes
- Settlement capability is `unavailable` / critically behind

Alert fires on transition healthy→unhealthy, or every 4 hours while still unhealthy.
Notification via `HEALTH_ALERT_WEBHOOK_URL` (Slack/Discord/generic webhook). If unset, the cron
still runs and logs `[health-alert] ALERT: ...` in Vercel logs.

**Zero-code backup:** Point Better Stack / Cronitor / UptimeRobot at `/api/health`, alert when
HTTP status ≠ 200. (Source: `docs/ops/HEALTH_ALERTING.md` §6-7.)

### What surfaces if the board silently stops refreshing at 3am

1. `free-spine-health` cron (every 2h Vercel + 4h GH external) writes a fresh
   `IngestionRun` with `status: SUCCESS` when free scores probe OK.
   Source: `apps/web/app/api/cron/free-spine-health/route.ts:101-109`,
   `docs/ops/FREE_MODE_INGESTION_HEALTH.md`.
2. `/api/health` ingestion check goes stale → `ok: false` → 503 → health-alert fires
   → `HEALTH_ALERT_WEBHOOK_URL` pings Slack/Discord.
3. **If `HEALTH_ALERT_WEBHOOK_URL` is unset** AND `SENTRY_DSN` is unset → the answer is:
   **nothing surfaces to a human automatically.** The only signal is the Vercel cron logs
   (`[health-alert] ALERT: ...`). See `docs/ops/HEALTH_ALERTING.md` line 33 for this gap.
4. The owner should check `deployment.sha` and the cron logs. `scripts/ops/impeccable-probe.mjs`
   can be scripted as an external canary (exit 0/1/2) as a DIY alerting layer.

---

## 3. Forcing a board refresh

### Manual trigger (curl with CRON_SECRET)

```bash
# Refresh odds — paid path (uses THE_ODDS_API_KEY if present)
curl -sS -H "Authorization: Bearer ***" \
  "https://www.galaxysportsedge.com/api/cron/refresh-odds"

# Free multi-source spine + signal slate (no Odds key needed)
curl -sS -H "Authorization: Bearer ***" \
  "https://www.galaxysportsedge.com/api/cron/free-spine-health"

# Generate signal slate only (model signals, no book odds)
curl -sS -H "Authorization: Bearer ***" \
  "https://www.galaxysportsedge.com/api/cron/generate-signal-slate"

# Board fill (ESPN seed + odds + signal)
curl -sS -H "Authorization: Bearer ***" \
  "https://www.galaxysportsedge.com/api/cron/board-fill"
```

Auth contract: Bearer `CRON_SECRET` (or `CRON_SECRET_PREVIOUS` during rotation). Without the
secret → 401. Without the secret set at all → 500 `CRON_SECRET not configured`.
Source: `apps/web/lib/cron/authorize.ts:81-87`, `docs/ops/CRON_MATRIX.md` §Auth contract.

### External GitHub Actions cron (backstop)

GitHub Actions runs some crons at reduced cadence as a backstop for Vercel cron failures.
Source: `.github/workflows/external-cron.yml` (workflow file). Schedules per `docs/ops/CRON_MATRIX.md`
§Cadence truth:

| Job | Primary (Vercel) | Backstop (GH External Cron) |
|---|---|---|
| free-spine-health | `0,30 * * * *` (hourly at :00/:30) | `5 */2 * * *` (every 2h) |
| settle-picks | `20 * * * *` | hourly `:15` |
| autonomy-cycle | `7,22,37,52 * * * *` | hourly `:22` |
| calibration-metrics | `40 */6 * * *` | manual / autonomy re-fire |
| health-alert | `*/15 * * * *` | — |

### Automated smoke

`scripts/ops/gamma-cron-smoke.sh` — 401 then 200 smoke for applicable crons.
Source: `docs/ops/CRON_MATRIX.md` line 53, `scripts/ops/gamma-cron-smoke.sh`.

---

## 4. Kill-switches — disabling a broken feature fast

**Golden rule from ROLLBACK_PLAN.md line 7:** "Unsetting an env var disables a feature; it never
deletes data. The app degrades to its honest 'not configured' state."

### Data / ingestion kill-switches

| To stop... | Env var | Value | Source |
|---|---|---|---|
| Paid Odds API calls | `THE_ODDS_API_KEY` | Blank/delete | `docs/ops/OPERATOR.md` line 8; free path takes over |
| Odds API circuit force-open | `ODDS_API_CIRCUIT_FORCE_OPEN` | `1` / `true` | `packages/data-ingestion/src/odds-api-circuit-breaker.ts:80-83` |
| Odds API circuit auto-open | HTTP 402 from upstream | auto | `packages/data-ingestion/src/odds-api-circuit-breaker.ts:199-208` (opens after 1 consecutive 402; stays open 6h) |
| Free AI content lane | `CONTENT_FREE_LANE_ENABLED` | `false` | `.env.example:390` |
| Free AI lane (Cerebras) | `CEREBRAS_API_KEY` | Blank | `.env.example:389` |
| Internal LLM (non-user) | `INTERNAL_LLM_API_KEY` | Blank | `.env.example:385` |
| Scraping / ingestion jobs | `TEAM_RATES_AVAILABLE` | `false` | `.env.example:190` |
| Anonymous moderation reports | `ANONYMOUS_MODERATION_REPORTS_ENABLED` | `false` | `.env.example:199` |

### Product surface kill-switches

| To stop... | Env var | Value | Source |
|---|---|---|---|
| Public picks board | `PUBLIC_PICKS_ENABLED` | `false` | `.env.example:291`; `apps/web/lib/launch/public-surface-gate.ts:34` |
| Stale-data bet on public picks | `FORCE_NO_BET_IF_STALE` | `false` | `.env.example:342`; read at the read boundary |
| Live board firing | `LIVE_BOARD` | `false` | `free-settlement-runner.ts:570`; `CLAUDE.md` rule #5 |
| Performance stats / track record | `PERFORMANCE_STATS_ENABLED` | `false` | `free-settlement-runner.ts:572`; `.env.example:293` |
| Stats public surface | `STATS_PUBLIC` | `false` | `apps/web/lib/launch/public-surface-gate.ts:26` |
| Glass Ledger (publish ledger) | `PUBLISH_LEDGER` | `false` | `apps/web/lib/ledger/ledger-view.ts:86` |

### Learning / calibration gates

| Env var | Default | Effect of `false` | Source |
|---|---|---|---|
| `CANONICAL_HISTORY_ENABLED` | `false` | No canonical record; picks stay `isBootstrap=true` | `.env.example:289` |
| `DERIVED_MODEL_HISTORY_ENABLED` | `false` | No ATS/H2H/venue form scoring | `.env.example:290` |
| `OUTCOME_LEARNING_ENABLED` | `false` | No learning-eligible samples stamped | `.env.example:317` |
| `CALIBRATION_ADJUSTMENTS_ENABLED` | `false` | Calibrator is identity passthrough (no behavior change) | `.env.example:333` |
| `FEATURED_PICK_PROMOTION_ENABLED` | `false` | No auto-featured ELITE/STRONG picks | `.env.example:292` |
| `PUBLIC_BLOG_ENABLED` | `false` | No content publishing | `.env.example:294` |
| `DEMO_PICKS_ENABLED` | `false` | No sample picks (must be false in prod) | `.env.example:050-050` |

### Payment / money-path kill-switches

| To stop... | Env var | Value | Source |
|---|---|---|---|
| Checkout / Stripe billing | `STRIPE_SECRET_KEY` | Blank | `.claude/worktrees/phase3/reports/go-live/ROLLBACK_PLAN.md:18` |
| Webhook-driven entitlements | `STRIPE_WEBHOOK_SECRET` | Blank | `apps/web/app/api/webhooks/stripe/route.ts:44` |
| Webhook signature verification skips | `STRIPE_WEBHOOK_SECRET` present + matches | Must match Dashboard endpoint signing secret | `docs/ops/STRIPE_GO_LIVE_CHECKLIST.md` §3, §3a |
| Stripe webhook endpoint | Disable in Stripe Dashboard | — | `docs/ops/STRIPE_GO_LIVE_CHECKLIST.md` §3 |
| Stripe checkout ToS consent | `STRIPE_TERMS_CONSENT_ENABLED` | `false` | `.env.example:117` |

### Autonomy kill-switches

| Env var | Default | Effect | Source |
|---|---|---|---|
| `AUTONOMY_EXECUTE` | not set (false) | `false` = dry-run plan only; `true` = executes allow-listed safe crons | `apps/web/app/api/cron/autonomy-cycle/route.ts:7,46` |
| `AUTONOMY_MAX_ACTIONS_PER_CYCLE` | default in `safe-cron-targets.ts` | Caps actions per cycle | `apps/web/app/api/cron/autonomy-cycle/route.ts:26` |

### Rate-limiting / abuse kill-switches

| Env var | Default | Effect | Source |
|---|---|---|---|
| `CONFORMAL_ABSTAIN_ENABLED` | `false` | Show/abstain only; does not publish | `docs/ops/FOUNDING_LAUNCH_CHECKLIST.md:27` |
| `RANKING_PAUSE_APPLY` | off | Pauses ranking map application | `apps/web/app/api/ops/ranking-pause-apply/route.ts` |

---

## 5. Rolling back a bad deploy

**This is NOT `vercel rollback`.** The repo's own ROLLBACK_PLAN.md (line 47-48) states the path:

> 1. On Vercel: Deployments → pick the last good one → **Promote to Production** (instant).
> 2. The previous build serves immediately; env vars are unchanged.

### Step-by-step

1. Go to Vercel Dashboard → Project **sports-web** → Deployments.
2. Find the last deployment with the known-good SHA (confirm via `/api/ops/public-surface-truth`
   → `deployment.sha`).
3. Click **"Promote to Production"** on that deployment.
4. Env vars are unchanged by promotion — verify the promoted deployment inherits the same
   production env (it does; promotion does not change env).

### Why `vercel rollback` does not apply

- This deployment is alias-based. `vercel rollback` (CLI) restores old build artifacts but is not
  the documented revert mechanism for this project's Vercel-produced deployments.
- The repo's prior finding (`docs/ops/DEPLOY_LAG.md` line 23): code on `main` is not live until
  Vercel serves it. The SHA mismatch between `main` and the live deployment is the most common
  false-diagnosis. Always confirm `deployment.sha` before concluding code "failed."

### If the bad deploy wrote bad data

- Settlement, ingestion, and webhook rows are append-only / idempotent. `ROllBACK_PLAN.md`
  (line 52-55): "Captured evidence and settled-pick history (append-only; not rewritten)."
- For migrations: PostgreSQL forward-only. If a migration misbehaves, restore from the
  provider's point-in-time backup (Neon/Supabase/Railway). `ROllBACK_PLAN.md` line 43-44.
- Stripe subscriptions are grandfathered and not cancelled by unsetting keys.
  `ROllBACK_PLAN.md` line 53-55.

---

## 6. Diagnosing the DB as the cause

### Health check path

- `/api/health` → `checks.database.status` = `"ok"` when DB is reachable.
  Source: `apps/web/app/api/health/route.ts:22`, `apps/web/lib/health/live-capability-probes.ts`.
- If `checks.database.status !== "ok"` → `ok: false`, HTTP 503. This is DB-level.
- The health route also reports `deployment.sha` so you can correlate "is the live SHA the one
  with the fix?" alongside DB status.

### DB connection model

- Production uses **Neon** (Postgres). `DATABASE_URL` = pooled Prisma URL, `DIRECT_URL` =
  non-pooled direct URL.
  Source: `.env.example` line 2-3, `docs/ops/CLAUDE_COWORK_PROMPT_P0.md` §1.
- Neon has **hard connection limits**. A connection-pool exhaustion under spike is a real past
  incident class (see `docs/ops/CLAUDE_MAX_PRO_HANDOFF_2026-08-06.md` and the Neon "unreachable"
  notes in the sprint queue).
- `requireDurableWriteStore()` in `@sports/db` gates write-capable DB access. If the durable
  store is unreachable, write-dependent routes fail closed with HTTP 503.
  Source: `apps/web/app/api/webhooks/stripe/route.ts:60-73`.

### DB diagnosis steps

1. Hit `/api/health` — if `checks.database.status !== "ok"`, DB is unreachable from the
   serverless isolate.
2. Confirm `DATABASE_URL` is set in Vercel Production env (Vercel → Settings → Environment
   Variables). The readiness script (`node scripts/check-deploy-readiness.mjs`) checks
   `DATABASE_URL` + `DIRECT_URL` presence at build time (line 120-153).
3. Check Neon dashboard for connection count, compute time budget exhaustion (free tier caps).
4. Check recent migrations: `scripts/deploy/migrate-if-configured.mjs` runs
   `prisma migrate deploy` at Vercel build time (line 236-238). A pending/unapplied migration
   referencing columns the code reads is the class of incident documented in
   `handoff/DEPLOY_READINESS.md` §4 (schema drift).
5. If migration needs manual application: `npm run db:migrate` against production
   (`docs/ops/CLAUDE_OWNER_LAUNCH_HANDOFF.md` line 43-45, `docs/ops/CLAUDE_COWORK_PROMPT_P0.md`
   §1).

---

## 7. Paid ingestion 401s / payment circuit opens

### Odds API 401 / 403 (auth failure)

- **Source:** `packages/data-ingestion/src/odds-api-circuit-breaker.ts:166` — `operator_forced_open`
  cause; the circuit distinguishes auth failure (401/403) from payment failure (402).
- Per `docs/ops/OPERATOR.md` line 8: if `THE_ODDS_API_KEY` is "present+deactivated," the free
  path does NOT engage. **Delete or blank** `THE_ODDS_API_KEY` to fall to the free path.
- The free settlement path works with `THE_ODDS_API_KEY` absent. Source:
  `apps/web/lib/data-sources/free-settlement-runner.ts` (header comment line 2: "oddsApiRequired=false").

### Odds API 402 (payment required — credits exhausted)

- **Source:** `packages/data-ingestion/src/odds-api-circuit-breaker.ts:9, 163-168`.
- The circuit opens after 1 consecutive 402. It stays open for 6h (`openDurationMs = 6h`,
  line 77), then goes `half_open` — one probe at a time.
- `ODDS_API_CIRCUIT_FORCE_OPEN=1` forces open without any upstream response (founder hard-stop,
  line 80-83).
- **No quotes are invented when the circuit is open** — calls fail fast, no upstream request is
  made, no fabricated odds. Source: `packages/data-ingestion/src/odds-api-client.ts:166-170`.

### Recovery

1. Confirm `THE_ODDS_API_KEY` is valid (Stripe-style key check via Vercel env). If deactivated,
   blank it for free path, or replace with a working key + redeploy.
2. If `ODDS_API_CIRCUIT_FORCE_OPEN=1` was set, unset it and redeploy.
3. Wait for the 6h open window to expire (or redeploy to reset process-local state).
4. Trigger `/api/cron/refresh-odds` manually to confirm recovery.

---

## 8. Auth / cron secret issues

### CRON_SECRET not configured

- All cron routes return HTTP 500 with `{"error": "CRON_SECRET not configured"}` when neither
  `CRON_SECRET` nor `CRON_SECRET_PREVIOUS` is set.
  Source: `apps/web/lib/cron/authorize.ts:81-83`.

### CRON_SECRET mismatch

- Vercel cron sends `Authorization: Bearer ***`. If the secret in Vercel env ≠ what the route
  expects → 401.
- **Dual-secret rotation:** set `CRON_SECRET_PREVIOUS` = old, `CRON_SECRET` = new, redeploy.
  `authorizeCronSecret` accepts either. Remove `CRON_SECRET_PREVIOUS` after one stable day.
  Source: `apps/web/lib/cron/authorize.ts:72-79`, `docs/ops/CRON_SECRET_VERIFY.md` §7.

### Spoofed x-vercel-cron header

- Default auth mode is `"bearer_only"` (GSE-SEC-016). The `x-vercel-cron: 1` header is NOT
  accepted unless a route explicitly opts into `"dual"` mode. Only read-only health-probe crons
  use dual mode. Side-effecting crons must not.
  Source: `apps/web/lib/cron/authorize.ts:16-24, 52-55`.

### Verify cron auth

```bash
# Negative (must 401)
curl -sS -o /tmp/cron-noauth.json -w "%{http_code}" \
  "https://www.galaxysportsedge.com/api/cron/health-alert"
# expect: 401 or 500 (if unset)

# Positive (must 200 with Bearer)
curl -sS -H "Authorization: Bearer ***" \
  "https://www.galaxysportsedge.com/api/cron/health-alert" | head -c 400
# expect: HTTP 200
```

Automated smoke: `CRON_SECRET=… BASE_URL=https://www.galaxysportsedge.com
node scripts/ops/verify-cron-secret.mjs` (exit 0 = both checks pass).
Source: `docs/ops/CRON_SECRET_VERIFY.md` §2-3, `scripts/ops/verify-cron-secret.mjs`.

---

## 9. Observability — what error visibility exists

| Tool | Required env var | Active when | Lost if absent | Source |
|---|---|---|---|---|
| Sentry (error tracking) | `SENTRY_DSN` (server) / `NEXT_PUBLIC_SENTRY_DSN` (client) | DSN present | Zero error visibility in production; errors are logged to Vercel logs only | `apps/web/lib/observability/sentry.ts:25-56` |
| Cloudflare Web Analytics | `NEXT_PUBLIC_CF_BEACON_TOKEN` | Token set + `NEXT_PUBLIC_ANALYTICS_ENABLED=true` | No traffic analytics | `.env.example:229,232` |
| Microsoft Clarity | `NEXT_PUBLIC_CLARITY_PROJECT_ID` | Token set + `NEXT_PUBLIC_ANALYTICS_ENABLED=true` | No session analytics | `.env.example:229,233` |
| PostHog | N/A — **not found in repo** | — | NO PROCEDURE EXISTS — PostHog is referenced in `CLAUDE_OWNER_LAUNCH_HANDOFF.md` line 73 ("PostHog only after privacy review") but is not wired in code | grep of `apps/web/lib/`, `packages/` |

### Sentry specifics

- `initObservability()` in `apps/web/lib/observability/sentry.ts` is called from
  `instrumentation.ts` (server) or a client init component.
- `tracesSampleRate: 0.1`, `environment: NODE_ENV`. No source-map upload plugin (intentional).
- When `SENTRY_DSN` is absent → `console.info("observability: not wired (no DSN)")` and
  `captureError()` is a clean no-op.

---

## 10. Incident severity bands

### Health status → interpretation

| `/api/health` | Meaning | Action |
|---|---|---|
| `ok: false`, HTTP 503 | DB or ingestion check failed — **pipeline death** | DB diagnosis (§6); check cron schedule (§3) |
| `ok: true`, `status: "degraded"` | Settlement CRITICAL or non-critical check off | Check `capabilities[].status` for `settlement`; trigger settle-picks (§3) |
| `ok: true`, `status: "healthy"` | All checks pass | Normal operation |

### Settlement bands (source: `apps/web/lib/performance/settlement-health.ts`)

| Band | overdue PENDING (>6h) | Meaning |
|---|---|---|
| HEALTHY | 0 | Within grace, no overdue picks |
| DEGRADED | 1–4 | Some overdue picks; drain needed |
| CRITICAL | ≥5 (default threshold) | Settlement stuck; free-path settle drain |

### Settlement recovery

```bash
# Ensure THE_ODDS_API_KEY is blank to use free path (per OPERATOR.md)
curl -sS -H "Authorization: Bearer ***" \
  "https://www.galaxysportsedge.com/api/cron/settle-picks" | python3 -m json.tool | head -80
# Expect: path:"free", clvRepair, snapshotRepair, teamGameLogRepair fields
```

Source: `apps/web/app/api/cron/settle-picks/route.ts`,
`apps/web/lib/data-sources/free-settlement-runner.ts`,
`docs/ops/OPERATOR.md` §1, `docs/ops/CRON_SECRET_VERIFY.md` §4.

---

## 11. Emergency contact / escalation

| Role | Channel |
|---|---|
| Payment issues (Stripe) | Stripe Dashboard → Developers → Webhooks (verify `STRIPE_WEBHOOK_SECRET` matches endpoint signing secret) |
| Data provider issues (Odds API) | Deactivate `THE_ODDS_API_KEY` → free path engages; `ODDS_API_CIRCUIT_FORCE_OPEN=1` to hard-stop |
| DB issues | Neon dashboard; confirm `DATABASE_URL` + `DIRECT_URL` on Vercel env |
| Cron issues | `CRON_SECRET` mismatch → rotate via dual-secret (§8); deploy lag → confirm `deployment.sha` (§1) |
| No error visibility | Set `SENTRY_DSN` in Vercel Production env (server side) |

---

## 12. Gaps — NO PROCEDURE EXISTS

1. **PostHog instrumentation.** Referenced in `CLAUDE_OWNER_LAUNCH_HANDOFF.md:73` ("PostHog only
   after privacy review") but no code implementation found. NO PROCEDURE EXISTS for PostHog error
   visibility.
2. **Automated deployment rollback.** There is no CLI/scripted rollback — it is a manual Vercel
   Dashboard "Promote to Production" step. No `scripts/ops/` tool automates this.
3. **External uptime monitoring as a first-class feature.** The zero-code backup (Better Stack /
   Cronitor on `/api/health`) is documented but not configured in-repo. If `HEALTH_ALERT_WEBHOOK_URL`
   is unset AND no external monitor is wired, NO PROCEDURE EXISTS for automated alerting.
4. **`gemini-3.6-flash` never used.** Per memory, never default to Gemini even if `GEMINI_API_KEY`
   is present while Google is commented in config. NO PROCEDURE EXISTS to auto-route to Gemini.

---

## VERIFY

Every procedure cites the real file or flag implementing it. Gaps are named explicitly (§12).
The document covers: telling degraded from down (§2); forcing a board refresh (§3); disabling a
broken feature fast (§4); rolling back a bad deploy including the alias-based non-`vercel rollback`
finding (§5); diagnosing the DB (§6); paid ingestion 401s and payment circuit (§7); cron auth
(§8); observability (§9); severity bands (§10); escalation (§11); and gaps (§12).
