# Manual Longevity Instruments

**Status:** Manual operating instruments.
**Created:** 2026-05-23
**Related decision:** DEC-NEXT-032

## What changed

The longevity audit now has three manual instruments that can be used before the admin cockpit exists:

- [weekly-brand-position-smoke-test.md](../templates/weekly-brand-position-smoke-test.md)
- [founder-capacity-ledger.csv](../templates/founder-capacity-ledger.csv)
- [proof-surface-freshness-tracker.csv](../templates/proof-surface-freshness-tracker.csv)

## DEC-NEXT-032 - Add manual longevity instruments before automation

**Decision:** Create manual trackers for brand-position drift, founder capacity, and proof-surface freshness.

**Rationale:** The longevity audit named the right sensors, but waiting for automation creates an avoidable blind spot. Manual instruments let Garrett start measuring the highest-risk slow failures immediately.

**Use:**

- Run the brand-position smoke test during Friday retrospectives.
- Fill the founder capacity ledger weekly until a cockpit replaces it.
- Update the proof-surface freshness tracker before any public traffic push.

**Guardrail:** These instruments create visibility only. They do not change launch gates, pricing, or public promises.
