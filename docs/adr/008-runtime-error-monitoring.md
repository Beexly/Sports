# ADR 008: Runtime Error Monitoring

**Status:** Proposed  
**Decision Date:** 2026-09-02  
**Authors:** Hermes Agent (overnight pre-launch audit)  
**Reviewers:** Operator

## Context

The platform currently lacks real-time runtime error capture. Existing observability:
- **`/api/cron/health-alert`** — Scheduled status poll, cannot capture individual exceptions with stack traces
- **`ai-control-plane/observability.ts`** — Covers AI execution path only
- **Gap:** Unhandled route handler exceptions (e.g., checkout 500 at 02:14) are invisible until logs are manually inspected

Production deployment on Vercel means distributed serverless functions. Errors can occur in any instance, and structured logs alone don't provide:
- Real-time alerting with context
- Stack trace aggregation across instances
- Error grouping and deduplication
- Rate/impact analysis (which errors are spiking?)

**Security consideration:** This repo handles:
- Live Stripe keys and webhooks
- Production database credentials  
- User PII (email, payment methods)
- B2B API keys

Any error payload can capture request context (headers, bodies, user data). The monitoring solution must not leak sensitive data.

## Decision Options

### Option 1: Hosted Error Monitoring Service

**Candidates:** Sentry, Rollbar, Honeybadger, Highlight.io

**Pros:**
- Battle-tested SDKs with framework integrations
- Automatic stack trace parsing and grouping
- Source map support for minified code
- Real-time alerting (Slack, email, PagerDuty)
- Historical trends and release tracking
- Team collaboration features (assign, resolve, ignore)

**Cons:**
- **External data flow:** Every error payload (stack, route, headers) leaves the infrastructure
- **Vendor lock-in:** Error history lives in their DB
- **Cost:** ~$26-79/mo for 50K events (Sentry Team plan)
- **Privacy compliance:** Need to scrub PII before transmission or configure allowlists
- **New dependency:** Another service to monitor, pay for, maintain

**Data flow:** Error → Vercel edge → Sentry ingest endpoint (US/EU) → Sentry storage → Dashboard

### Option 2: Self-Hosted Collector

**Candidates:** Sentry self-hosted, GlitchTip, OpenTelemetry + Jaeger

**Pros:**
- Data stays on our infrastructure
- No per-event costs beyond compute
- Full control over retention and scrubbing
- Can run on existing Neon Postgres or add lightweight service

**Cons:**
- **Operational burden:** We maintain the collector, storage, UI, uptime
- **Setup time:** Container orchestration, DB schema, UI deployment
- **Alerting:** Need to wire notifications separately
- **Complexity:** Overkill for current scale (<1K daily errors estimated)

**Data flow:** Error → Vercel function → Self-hosted collector (HTTP POST) → Postgres/S3 → Self-hosted UI

### Option 3: Structured Logs + Existing Health Webhook (Interim)

**Approach:** Capture errors in Next.js error boundaries and route handlers, POST structured JSON to the existing `/api/cron/health-alert` webhook path.

**Pros:**
- **Zero new dependencies**
- **Zero new external services**
- **Buildable tonight** with helper function + 3-route pilot
- Data stays internal until operator decides on long-term solution
- Webhook target is already operator-controlled (can route to Slack, Discord, log aggregator)

**Cons:**
- No automatic grouping or deduplication (raw stream)
- No historical UI (webhook fires once per error)
- Noisy if high error rate
- Limited to what we build (no source maps, no release tracking)

**Data flow:** Error → In-process helper → `/api/cron/health-alert` → Operator webhook → Slack/Discord/logs

## Recommended Path Forward

**Phase 1 (Immediate — this PR):**  
Implement **Option 3** as interim solution:
- Build helper: `lib/observability/capture-route-error.ts`
- Wire into 3 routes:  
  1. `/api/subscriptions/checkout` (payment critical path)  
  2. `/api/picks` (highest-traffic public GET)  
  3. `/api/performance` (second-highest public GET)
- Payload: `{ route, errorClass, message, stack, timestamp }` — **no headers, bodies, user data**
- POST to existing health webhook if configured

**Phase 2 (Owner decision before GA):**  
Operator evaluates error volume and decides:
- **Low volume (<100/day):** Keep interim, add Slack/Discord webhook
- **Moderate volume (100-1K/day):** Add Sentry free tier (5K events/mo) with strict scrubbing
- **High volume or need grouping:** Self-host GlitchTip on existing Neon infra

## Security & Privacy Constraints

Any implementation MUST:
1. **Never log:**
   - Request bodies
   - Authorization headers
   - User emails or IDs
   - API keys or tokens
   - Stripe objects
2. **Scrub before transmission:**
   - URLs (strip query params with PII)
   - Error messages (check for embedded secrets)
3. **Rate limit error reporting** (max 10/min per route to prevent DoS of webhook)

## Testing Plan

- Unit tests for error capture helper (mock webhook)
- Integration test: trigger error in checkout route, verify webhook call
- Load test: 100 rapid errors don't crash the reporter

## Success Criteria

Within 24 hours of a production error:
- Operator receives notification with route + stack trace
- No PII or secrets in error payload
- Error rate <1% of traffic (normal operations)

## References

- Existing health alert: `apps/web/app/api/cron/health-alert/route.ts`
- AI observability: `apps/web/lib/ai-control-plane/observability.ts`
- Security audit findings: `handoff/AUDIT_FINDINGS.md` GSE-SEC-015

---

**Proposed by:** Hermes Agent (overnight audit)  
**Awaiting:** Operator approval before external service adoption
