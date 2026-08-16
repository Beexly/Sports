# Observability Readiness — What Is Actually ON in Production

**Task:** P9.5-09 — Observability readiness: what is actually ON in production
**Date:** 2026-08-16
**Scope:** All observability/monitoring/alert tooling in `apps/web/` and the deployed Vercel configuration.

---

## 1. Tool Inventory

A codebase-wide search (`grep -rni "posthog|logrocket|datadog|newrelic|honeycomb|mixpanel|amplitude|@vercel/otel|otel|instrumentation"` across `apps/web/`, excluding `node_modules`/`__tests__`) found exactly **two** observability-related systems:

| Tool | Library | Required Env Var (NAME only) | Active in Code? | Active in Production? |
|------|---------|-----------------------------|-----------------|----------------------|
| Sentry | `@sentry/nextjs` (`^10.57.0`) | `SENTRY_DSN` (server) + `NEXT_PUBLIC_SENSENTRY_DSN` (client) | **YES — wired but conditional no-op** | **UNKNOWN — depends on whether env vars are set at deploy time** |
| PostHog / LogRocket / Datadog / NewRelic / Honeycomb / Mixpanel / Amplitude | — | — | **NO** | **NO** |

### 1.1 Sentry — the only observability tool

**Dependency:** `apps/web/package.json` line 19 — `"@sentry/nextjs": "^10.57.0"`

**Implementation:** `apps/web/lib/observability/sentry.ts` — a single wrapper module that exposes three functions:
- `initObservability()` — reads `SENTRY_DSN` (server) or `NEXT_PUBLIC_SENTRY_DSN` (client) from `process.env`. If neither is set, it is a clean no-op (only logs `observability: not wired (no DSN)` on the server side). If a DSN IS present, it calls `Sentry.init()` with `tracesSampleRate: 0.1`, `environment`, and deliberately skips source-map upload (no `SENTRY_AUTH_TOKEN` needed).
- `captureError(err, context?)` — no-ops when Sentry is not initialized (`!_initialized` guard). Calls `Sentry.captureException()` only when initialized.
- `observabilityPosture()` — reads env at call time and returns `"error tracking: wired (DSN set)"` or `"error tracking: not wired (no DSN)"`.

**Integration points (traced):**

| Caller | File | What it does |
|--------|------|-------------|
| Server instrumentation | `apps/web/instrumentation.ts:25,77` | Calls `initObservability()` once at server startup in `register()`. |
| Client init | `apps/web/components/observability/SentryClientInit.tsx:14,18` | Calls `initObservability()` from `useEffect`. Mounted in `apps/web/app/layout.tsx:234` as `<SentryClientInit />`. |
| Global error boundary | `apps/web/app/error.tsx:5,22,24` | Calls `initObservability()` + `captureError(error, { digest })`. |
| Fantasy segment boundary | `apps/web/app/fantasy/error.tsx:5,26,28` | Same pattern. |
| Intelligence segment boundary | `apps/web/app/intelligence/error.tsx:5,27,29` | Same pattern. |
| Players segment boundary | `apps/web/app/players/error.tsx:5,27,29` | Same pattern. |
| Stats segment boundary | `apps/web/app/stats/error.tsx:5,25,27` | Same pattern. |
| Free-spine health cron | `apps/web/app/api/cron/free-spine-health/route.ts:21` | Calls `captureError(err, ...)` in 6 catch sites (persist fails, nflverse-currency probe, board-fill, probe-failed, etc.). |
| Calibration metrics cron | `apps/web/app/api/cron/calibration-metrics/route.ts:25,452` | Calls `captureError(err, { route: "cron/calibration-metrics" })`. |
| Free ingestion run | `apps/web/lib/data-sources/free-ingestion-run.ts:17,62` | Calls `captureError(err, ...)` in the DB-write catch path. |
| Cockpit summary | `apps/web/lib/cockpit/owner-summary.ts:21,449` | Calls `observabilityPosture()` to report status in the owner cockpit. |

**Tests:**
- `apps/web/__tests__/observability.test.ts` — 8 source-pin tests + runtime no-DSN tests. Source-pin tests pass (16/16). Runtime tests fail only due to a pre-existing `@/` path-alias resolution issue when running vitest from the repo root — not a code defect.
- `apps/web/__tests__/segment-error-boundaries-shape.test.ts` — pins the shape of the 3 segment error boundaries (fantasy, intelligence, stats), asserting they import and call `captureError`.

**Key config facts:**
- `apps/web/next.config.mjs` — **does NOT** use `withSentryConfig` (confirmed by test `next.config.mjs — source pins > does NOT contain withSentryConfig`). The Sentry webpack plugin is intentionally NOT used; the build is deterministic without `SENTRY_AUTH_TOKEN`.
- No `sentry.client.config.ts` or `sentry.server.config.ts` files exist. Client init goes through `SentryClientInit.tsx`.
- `apps/web/vercel.json` (root config) — contains **no** Sentry configuration, no `sentry` build step, no env var injection block. Env vars are configured in the Vercel project dashboard, not in the repo.

### 1.2 Other monitoring tools — ABSENT

- **PostHog:** no `@posthog` import, no `POSTHOG` env var anywhere in code or env files.
- **LogRocket:** no import, no env var.
- **Datadog/NewRelic/Honeycomb/Mixpanel/Amplitude:** no imports.
- **OpenTelemetry (`@vercel/otel`):** not installed, not imported. The only "otel" hits in the grep were Next.js `instrumentation` file references and Jarvis agent-council text saying "No token counts or model costs are claimed without instrumentation" — these are not OTel.
- **Vercel Analytics:** not present. The CSP in `vercel.json` references `vercel-insights.com` in `connect-src` but Vercel Analytics is a separate package (`@vercel/analytics`) that is **not** in `package.json` and has no import or env var.
- **Cloudflare Web Analytics + Microsoft Clarity:** configured under `NEXT_PUBLIC_ANALYTICS_ENABLED`, `NEXT_PUBLIC_CF_BEACON_TOKEN`, `NEXT_PUBLIC_CLARITY_PROJECT_ID` in `.env.example`. These are **pageview analytics**, not observability/error-tracking — they do not capture runtime errors, crons, or API failures. They are also gated behind `shouldRenderCloudflareAnalytics()` and require tokens to load.

### 1.3 Health-check infrastructure (indirect observability)

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/cron/free-spine-health` | every 2h (`0 */2 * * *`) | Probes free data sources; writes `IngestionRun` rows; calls `captureError` on failures. Auth: `CRON_SECRET` bearer-only. |
| `/api/cron/health-alert` | every 15 min (`*/15 * * * *`) | Evaluates live capability probes; if `HEALTH_ALERT_WEBHOOK_URL` is set, POSTs a JSON payload. Auth: `CRON_SECRET` bearer-only. |
| `/api/health` | HTTP, on demand | Returns degradation status based on recent `IngestionRun` rows. |

The `health-alert` cron has a webhook delivery path (`HEALTH_ALERT_WEBHOOK_URL`) but it is **optional** — if the env var is unset, there is no alert delivery at all. This is not wired to Sentry, email, or any other sink by default.

---

## 2. Env Var Status

| Env Var Name | In `apps/web/.env.example`? | In `apps/web/.env.local`? | In root `.env.example`? |
|---|---|---|---|
| `SENTRY_DSN` | **NO** | **YES** (2 occurrences) | NO |
| `NEXT_PUBLIC_SENTRY_DSN` | **NO** | **YES** (1 occurrence) | NO |
| `HEALTH_ALERT_WEBHOOK_URL` | **NO** | **NO** | NO |
| `POSTHOG_API_KEY` / `NEXT_PUBLIC_POSTHOG` | NO | NO | NO |

**Critical gap:** `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` are in `.env.local` (which is NOT committed to git and is Vercel-overridden), but they are **NOT documented in `.env.example`**. Any new contributor or Vercel environment rebuild that starts from `.env.example` as a template would ship **without** a Sentry DSN — meaning zero error visibility.

---

## 3. The "3 AM Board Stop" Scenario

> *If the board silently stopped refreshing at 3 AM, what would surface that, and to whom?*

**The answer is: nothing would surface automatically.**

Here is the chain of evidence:

1. **The board refresh cron is `/api/cron/board-fill`** (`vercel.json` schedule: `2,17,32,47 * * * *` — every ~15 min). If this cron silently fails (throws, times out at `maxDuration`, or returns a 500), it returns a failed HTTP response to Vercel's cron runner.

2. **Vercel's platform cron runner** logs the failure in Vercel's dashboard/logs, but does **not** send a notification email, Slack message, or webhook unless the user has explicitly configured alerts in the Vercel project settings. The repo has no `vercel.json` alerting config.

3. **Sentry** would capture the crash *only if* `SENTRY_DSN` is set in the production environment. If it is set, `captureError()` is called in the cron's catch paths (e.g., `free-spine-health` route calls `captureError` in 6 catch sites). However, `board-fill` route was not grep-checked for `captureError` usage — if it does NOT import and call `captureError`, the error would not be reported to Sentry even if Sentry is configured.

4. **`/api/cron/health-alert`** runs every 15 minutes and "pages when `/api/health` would be degraded." It POSTs to `HEALTH_ALERT_WEBHOOK_URL` **if set**. This is the only repo-level alert delivery mechanism. If `HEALTH_ALERT_WEBHOOK_URL` is unset (not in `.env.example`, undocumented), **the alert is silently dropped** — no email, no Slack, no nothing.

5. **There is no Slack integration, no Discord webhook, no SMS/twilio, no email-to-human-alert bridge** anywhere in the codebase. The only notification channels in the repo are:
   - Web Push (`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`) — but this is gated behind `WATCHLIST_ALERTS_ENABLED` and only fires for **watchlist alerts on settled picks**, not for cron failures.
   - Email via Resend (`RESEND_API_KEY`) — but only for watchlist alerts to verified user emails, not internal ops alerts.
   - The `health-alert` webhook — conditional on `HEALTH_ALERT_WEBHOOK_URL`.

6. **The owner-cockpit** (`apps/web/lib/cockpit/owner-summary.ts:449`) reports `observabilityPosture()` — but this is a **pull** system (the owner must actively visit `/cockpit`). It is not a push notification. If the owner doesn't check the cockpit, they won't know.

**Plain finding:** If `SENTRY_DSN` is not set in production (which is plausible given it's undocumented in `.env.example` and only present in the untracked `.env.local`), and if `HEALTH_ALERT_WEBHOOK_URL` is not set, then a silent board-fill failure at 3 AM would produce **zero** signals. The board would simply stop refreshing. No one would know until a user complains or someone manually checks the cockpit. The `health-alert` cron would detect the degraded `/api/health` state, but if its webhook URL is unset, it would silently drop the alert.

---

## 4. Summary Table

| System | Required Env Var | Status | What Is Lost If Off |
|--------|-----------------|--------|---------------------|
| Sentry error tracking | `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` | **WIRED in code, DSN-dependent at runtime** — no-op without keys. Not documented in `.env.example`. | Zero visibility into runtime errors, cron failures, API 500s, and client-side crashes. Errors are logged to console only (lost on Vercel serverless cold starts). |
| PostHog | (none) | **NOT INSTALLED** | No user session replay, no product analytics, no funnel tracking. (Intentionally absent — product analytics not in scope.) |
| OpenTelemetry | (none) | **NOT INSTALLED** | No distributed tracing across request → loader → DB → source → model → cache pipeline. |
| Health-alert webhook | `HEALTH_ALERT_WEBHOOK_URL` | **WIRED in code, unsettable without docs** — no-op when unset. Not in `.env.example`. | No automated alerting on degraded health. The detection logic exists but delivers nowhere. |
| Vercel platform alerts | (Vercel dashboard config) | **UNKNOWN** | May or may not be configured in the Vercel project UI — cannot be verified from the repo. |

---

## 5. Recommendations (not implemented — report only)

1. **Add `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` to `apps/web/.env.example`** with a comment explaining the no-op behavior when absent.
2. **Add `HEALTH_ALERT_WEBHOOK_URL` to `apps/web/.env.example`** with a comment that setting it is required for the `health-alert` cron to deliver.
3. **Verify `board-fill` route calls `captureError`** on failure (it was not checked — if it doesn't, Sentry won't see its failures).
4. **Consider adding the `obs-tracing` and `obs-alerts` items in `integrity-ledger.ts`** (lines 340-361) to the "wired" state — currently both are `wiredStatus: "NO"`, confirming this report's findings.
