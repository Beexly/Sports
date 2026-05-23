# Proof Freshness Scaffold Notes

**Status:** Static metadata scaffold.
**Created:** 2026-05-23
**Related decision:** DEC-NEXT-033

## What changed

The proof surfaces now expose freshness metadata without adding marketing pressure:

- [proof-freshness.ts](../../../apps/web/lib/proof-freshness.ts) - typed surface metadata, stale-window calculation, and list helper.
- [proof-surface-freshness.tsx](../../../apps/web/components/proof-surface-freshness.tsx) - restrained "last updated" line for public proof pages.
- [freshness route](../../../apps/web/app/api/proof/freshness/route.ts) - public JSON projection for synthetic monitoring and future cockpit warnings.
- [proof-freshness.test.ts](../../../apps/web/lib/proof-freshness.test.ts) - regression coverage for fresh/stale status.

## DEC-NEXT-033 - Add proof-surface freshness metadata

**Decision:** Add static freshness metadata and stale-window logic to Methodology, Loss Room, Pass List, and Ledger.

**Rationale:** The longevity audit identified proof-surface staleness as a slow trust failure. Static metadata gives the site, smoke tests, and future cockpit a shared contract before database-backed freshness exists.

**Guardrails:**

- No marketing CTA is added.
- No short-form campaign automation is enabled.
- No database write is introduced.
- Freshness text stays subordinate to the proof content.

**Follow-up:** Replace static timestamps with source-of-truth update times when Ledger, Pass List, Loss Room, and methodology changelog persistence are wired.
