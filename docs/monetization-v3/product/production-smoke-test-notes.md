# Production Smoke Test Notes

**Status:** Internal engineering scaffold.
**Created:** 2026-05-23
**Related decision:** DEC-NEXT-024, DEC-NEXT-064, DEC-NEXT-071

## What changed

The repo now includes a production smoke-test script pair:

- [smoke-prod.ps1](../../../scripts/smoke-prod.ps1) for this Windows workspace and Codex runs.
- [smoke-prod.sh](../../../scripts/smoke-prod.sh) for bash-capable CI or Linux/macOS operators.

Both scripts require `PROD_BASE_URL` and perform read-only GET checks against:

- `/api/health`
- `/`
- `/vault`
- `/vault?cancel=true`
- `/vault?source=smoke-prod`
- `/methodology`
- `/loss-room`
- `/passes`
- `/ledger`
- `/api/vault/seat-count`
- `/api/proof/freshness`

The scripts do not create Stripe sessions, mutate production data, assign Discord roles, send emails, or trigger any checkout side effects.

## DEC-NEXT-024 - Add read-only production smoke scripts before deploy decisions

**Decision:** Add smoke scripts now, but keep production execution gated by an explicit `PROD_BASE_URL` environment variable.

**Rationale:** The overnight audit found that [smoke-prod.sh](../../../scripts/smoke-prod.sh) was missing. A deploy decision should never depend on memory or ad hoc URL checks. The scripts give Garrett and Codex a repeatable pre-deploy and post-deploy check without authorizing a deploy tonight.

**Guardrail:** If `PROD_BASE_URL` is not set, the scripts exit with code 2 and do not infer a production hostname.

**Follow-up:** Once Garrett confirms the production hostname, run `npm run smoke:prod` and append any failures to [issue-queue.md](../../../docs/ops/issue-queue.md).

## DEC-NEXT-035 - Add read-only public API checks to production smoke

**Decision:** Extend production smoke coverage to include the public Vault seat-count and proof freshness endpoints.

**Rationale:** These endpoints are now safe, read-only launch surfaces. Smoke coverage should catch broken JSON routes before public traffic or proof-surface campaigns depend on them.

**Guardrail:** Smoke scripts still use GET-only checks and do not hit validation-only POST routes, cron routes, webhooks, checkout, or member-only routes.

## DEC-NEXT-037 - Add public health endpoint

**Decision:** Add `/api/health` as a read-only liveness contract and include it in production smoke.

**Rationale:** Production checks should have a stable JSON endpoint in addition to page checks. The health endpoint reports service identity, timestamp, environment, and optional git SHA without exposing secrets.

**Guardrail:** The endpoint does not inspect providers, mutate data, or validate customer-specific state.

## DEC-NEXT-064 - Add smoke response-shape checks

**Decision:** Extend production smoke scripts beyond HTTP status checks for critical JSON endpoints.

**Why now:** A route can return HTTP 200 while its public response contract is wrong. Health, seat count, and proof freshness are small JSON contracts that should be checked for stable markers before launch.

## DEC-NEXT-064 Implemented

- [smoke-prod.ps1](../../../scripts/smoke-prod.ps1) checks JSON markers for `/api/health`, `/api/vault/seat-count`, and `/api/proof/freshness`.
- [smoke-prod.sh](../../../scripts/smoke-prod.sh) performs the same marker checks with `curl` and `grep`.

## DEC-NEXT-064 Guardrail

The checks remain read-only. They validate public response shape only and do not infer provider readiness or launch approval.

## DEC-NEXT-071 - Add smoke fail-closed route checks

**Decision:** Extend production smoke scripts to verify selected private/scaffold routes remain closed.

**Why now:** Pre-launch smoke should catch accidental exposure as well as outages. Admin readiness, member dashboard API, and scaffold cron endpoints must not silently become public 200s before auth/provider wiring is real.

## DEC-NEXT-071 Implemented

- `/api/admin/launch-readiness` must return HTTP 403.
- `/api/vault/member` must return HTTP 401.
- `/api/cron/vault-welcome-emails` must return HTTP 501.

## DEC-NEXT-071 Guardrail

These checks are GET-only and do not mutate production data.
