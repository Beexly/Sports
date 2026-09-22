# ADR 008: Runtime Error Monitoring

**Status:** Proposed
**Decision Date:** 2026-09-20
**Authors:** Hermes Agent
**Reviewers:** Operator

## Context

The platform currently has scheduled health status reporting, but no focused
capture of individual ordinary route-handler exceptions with a stack trace.
`/api/cron/health-alert` reports aggregate capability state; it cannot explain a
checkout 500 that occurred moments earlier. The AI control plane has separate
observability and does not cover these public and checkout routes.

Production runs on Vercel serverless functions, so an error may occur in any
instance. Structured logs alone require manual log inspection and do not provide
real-time alerting, grouping, deduplication, or release-level error analysis.

This repository handles live Stripe credentials, production database
credentials, user email, and API keys. An error payload can accidentally include
request context, so the monitoring design must minimize and scrub transmitted
data.

## Decision Options

### Option 1: Hosted Error Monitoring

Candidates include Sentry, Rollbar, Honeybadger, and Highlight.io.

**Benefits**
- Mature framework integrations, stack parsing, grouping, source maps, and
  alerting.
- Historical trends, release tracking, and team workflow.

**Costs and data flow**
- A new dependency and an external data flow.
- Error payloads leave the machine for the vendor's ingest endpoint and storage.
- Vendor lock-in, possible cost, and additional privacy/configuration work are
  required before adoption.

### Option 2: Self-Hosted Collector

Candidates include Sentry self-hosted, GlitchTip, or an OpenTelemetry collector.

**Benefits**
- Error data remains on infrastructure we control.
- We control scrubbing, retention, and storage.

**Costs and data flow**
- Error → Vercel function → self-hosted collector → database/object storage → UI.
- We would operate the collector, storage, UI, upgrades, and alerting.
- This is disproportionate to the current scale and would require a new service.

### Option 3: Structured Route Reports + Existing Webhook (Interim)

Capture a small, sanitized report in selected route handlers and POST it to the
existing `HEALTH_ALERT_WEBHOOK_URL` destination used by the health-alert cron.

**Benefits**
- Zero new dependencies and zero new external services.
- Buildable immediately with a small helper and a three-route pilot.
- The webhook target is already operator-controlled and can forward to Slack,
  Discord, or a log aggregator.
- No request body, headers, tokens, or user email are collected.

**Costs**
- No automatic grouping, source-map enrichment, or historical error UI.
- A raw webhook stream can be noisy under an error burst.
- Process-local rate limiting does not coordinate across serverless instances.

**Data flow:** route exception → in-process helper → existing health-alert webhook destination → operator webhook.

## Decision

Adopt Option 3 as a temporary pilot while keeping ADR 008 proposed. Implement
one zero-dependency helper and wire it into exactly these three routes:

1. `POST /api/subscriptions/checkout` — payment-critical path.
2. `GET /api/picks` — highest-traffic public GET surface.
3. `GET /api/performance` — second-highest public GET surface.

The report contains only `route`, `errorClass`, sanitized `message`, sanitized
`stack`, `timestamp`, and static `severity`. It never receives request context.
The webhook delivery is best-effort and rate-limited per route.

## Security and Privacy Constraints

1. Never include request bodies, headers, authorization values, tokens, user
   email, user IDs, Stripe objects, or database credentials in a report.
2. Scrub query parameters, common credential assignments, email addresses, and
   Stripe key formats from exception messages and stacks before transmission.
3. Cap stack text and rate-limit reports to ten per route per minute.
4. Never let webhook failure mask or replace the original route exception.
5. Do not adopt a hosted or self-hosted monitoring service until the operator
   approves the external data flow and operational ownership.

## Testing Plan

- Unit-test payload construction, sensitive-data scrubbing, webhook posting,
  rate limiting, fallback behavior, and wrapper rethrow behavior.
- Verify each of the three route boundaries imports and uses the helper.
- Run the web typecheck, lint, and the focused Vitest file before committing.

## Success Criteria

- A selected route exception produces a webhook report with route, error class,
  message, stack, and timestamp.
- No request body, header, token, or user email appears in the report.
- The helper does not block the route response or turn webhook failure into a
  second exception.

## References

- Existing health alert: `apps/web/app/api/cron/health-alert/route.ts`
- Interim helper: `apps/web/lib/observability/capture-route-error.ts`
- AI observability (separate path): `apps/web/lib/ai-control-plane/observability.ts`

---

**Proposed by:** Hermes Agent
**Awaiting:** Operator approval before any external monitoring adoption
