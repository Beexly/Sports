# Checkout Health Monitor — Agent-Safe Runbook (#822)

**Owner:** GSE operations
**Scope:** Beexly/Sports checkout verification after a deploy. This is a monitor and verification checklist, not a Stripe catalogue or configuration procedure.

## Safety boundary

- Read public health and pricing surfaces only.
- Do **not** create or edit Stripe Products/Prices, change Vercel environment variables, flip `PRICING_PHASE` or any `STRIPE_*_PRICE_ID`, or weaken the amount-match guard.
- The proven catalogue is already live. A failure here is an escalation signal; it is not permission to repair money configuration from an agent.

## 1. Run the read-only public probes

Set the deployed public URL and run these from the repository root:

```bash
HOST=https://www.galaxysportsedge.com npm run e2e:pricing-smoke
APP_URL=https://www.galaxysportsedge.com npm run synthetic:run
```

`e2e:pricing-smoke` performs a GET of `/pricing` and a body-less/auth-free POST to `/api/subscriptions/checkout`. The POST is only a route-existence/validation probe: a 401, 403, 400, or 405 is expected; a 404 is a failure. It does not authenticate, create a checkout session, or charge anything.

`synthetic:run` runs the existing production probe and writes local JSON artifacts under `.synthetic-monitoring`. Do not set `SYNTHETIC_MONITORING_FILE_ISSUES=1` during an agent run; issue-queue writes are an operator action.

Expected public results:

- `/api/health` is HTTP 200 and reports healthy/deployed state.
- `/pricing` is HTTP 200 and contains a tier plus a dollar-formatted recurring price signal.
- No unexpected HTTP 503 appears on the health or public checkout surfaces. A documented/bootstrap gate response must remain distinguishable from an outage.
- No response or log reports an amount mismatch, invalid price, or missing checkout price ID.

## 2. Verify Subscribe manually after deploy

Using the approved authenticated test account and the deployed URL:

1. Open `/pricing` and select **Subscribe** for the tier/interval under test.
2. Confirm the request reaches the checkout flow without HTTP 503.
3. Confirm the checkout UI/session opens and the displayed amount matches the selected plan and interval. Treat any `amount mismatch`, invalid price, or missing price-ID error as a hard failure.
4. In Stripe test mode, complete only the approved operator test flow, then verify the entitlement/webhook result according to the owner checklist. Do not use an agent to alter Stripe state.
5. Record the deploy, URL, timestamp, probe output, and pass/fail result in the incident or deploy record.

## 3. Failure handling

If a probe or Subscribe check fails, preserve the response and deployment identifier, stop further checkout attempts, and escalate to the owner. Do not create a replacement price, change an environment variable, flip a phase/gate, or loosen the amount-match guard as a workaround.

## Source evidence

- `scripts/e2e/pricing-smoke.mjs` — public pricing and checkout-route smoke.
- `scripts/prod-probe.mjs` — read-only health/public-route probe used by `synthetic:run`.
- `scripts/synthetic-monitoring-runner.mjs` — structured monitor artifact writer.
- `apps/web/lib/stripe.ts` and `scripts/lib/stripe-price-check.mjs` — amount-match fail-closed behavior; do not bypass it.
- `docs/ops/STRIPE_GO_LIVE_CHECKLIST.md` — owner-only payment operations; this runbook does not replace it.
