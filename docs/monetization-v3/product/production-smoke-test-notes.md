# Production Smoke Test Notes

**Status:** Internal engineering scaffold.
**Created:** 2026-05-23
**Related decision:** DEC-NEXT-024

## What changed

The repo now includes a production smoke-test script pair:

- [smoke-prod.ps1](../../../scripts/smoke-prod.ps1) for this Windows workspace and Codex runs.
- [smoke-prod.sh](../../../scripts/smoke-prod.sh) for bash-capable CI or Linux/macOS operators.

Both scripts require `PROD_BASE_URL` and perform read-only GET checks against:

- `/`
- `/vault`
- `/vault?cancel=true`
- `/vault?source=smoke-prod`
- `/methodology`
- `/loss-room`
- `/passes`
- `/ledger`

The scripts do not create Stripe sessions, mutate production data, assign Discord roles, send emails, or trigger any checkout side effects.

## DEC-NEXT-024 - Add read-only production smoke scripts before deploy decisions

**Decision:** Add smoke scripts now, but keep production execution gated by an explicit `PROD_BASE_URL` environment variable.

**Rationale:** The overnight audit found that [smoke-prod.sh](../../../scripts/smoke-prod.sh) was missing. A deploy decision should never depend on memory or ad hoc URL checks. The scripts give Garrett and Codex a repeatable pre-deploy and post-deploy check without authorizing a deploy tonight.

**Guardrail:** If `PROD_BASE_URL` is not set, the scripts exit with code 2 and do not infer a production hostname.

**Follow-up:** Once Garrett confirms the production hostname, run `npm run smoke:prod` and append any failures to [issue-queue.md](../../../docs/ops/issue-queue.md).
