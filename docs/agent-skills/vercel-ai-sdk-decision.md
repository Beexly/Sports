# Vercel AI SDK — decision (IGNORE for money path)

**Decision: IGNORE for settlement / Stripe / outbox / free-path.**

## Audit
- Claude surfaces already use `apps/web/lib/claude-api/*` (model-router, provider-dispatch, free-lane, cost-monitor).
- No requirement for Vercel AI SDK (`ai` package) on critical money path.
- Adding SDK would increase surface area without ≥0.5% EV on reliability.

## When to adopt later
- New streaming chat UX on Model Court / Studio **if** DX wins measured
- Use AI Gateway only if multi-provider keys need unified spend tags

## Do not
- Force `ai` dependency into packages/db or workers
- Rewrite content generation mid-flight for SDK tourism
