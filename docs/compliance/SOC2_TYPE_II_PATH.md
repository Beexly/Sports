# Path to SOC 2 — honest readiness checklist

> This document describes what a real SOC 2 engagement requires and where
> this repo currently stands against that list. **Nothing in this repo, this
> checklist, or any exported evidence pack is a SOC 2 report, and completing
> every item below still does not produce one** — only an accredited,
> independent CPA firm can issue a SOC 2 report, after they perform the
> audit themselves. See [`README.md`](./README.md).

## Type I vs Type II

- **Type I** — a point-in-time assessment: are the described controls
  suitably *designed* as of a specific date? No operating-effectiveness
  testing over time is required.
- **Type II** — an assessment of whether the described controls operated
  *effectively* over an observation period, typically **3–12 months**. This
  requires sustained, continuous evidence — not a one-time snapshot.

## Prerequisites — honest status

| Prerequisite | Status |
|---|---|
| Control library defined | ✓ Done — `packages/compliance/src/control-library.ts` |
| CCM checks implemented (unit-tested) | ✓ Done — `packages/compliance/__tests__/ccm.test.ts` |
| CCM wired to real Postgres persistence | ✓ Done — `apps/web/lib/compliance/store.ts`, tables live in `packages/db/prisma/schema.prisma` |
| CCM running continuously (scheduled/cron) | ✗ Not done — `scripts/compliance/run-ccm.ts` exists as a manually-invokable entry point; no scheduler wires it up yet |
| Real data sources feeding every check | ✗ Not done — receipts, deploy events, and access snapshots are TODO-stubbed to empty arrays pending `feat/governed-receipts`, a deploy webhook log, and an IdP integration (none exist in this repo yet) |
| Evidence retained over an observation period | ✗ Not started — no runs have accumulated real evidence over time yet |
| Exceptions tracked to closure | Partial — exceptions are opened automatically (`ComplianceException`); there is no closure workflow/UI yet beyond the raw table |
| Formal risk register | ✗ Not done — `RISK_REGISTER.md` is a template with example rows only |
| ISMS scope formally adopted | ✗ Not done — `ISMS_SCOPE.md` is a draft, not reviewed/approved |
| Statement of Applicability completed | ✗ Not done — `STATEMENT_OF_APPLICABILITY.md` has "TBD" in every applicability cell |
| Engage an accredited CPA firm (for SOC 2) | ✗ Not started |
| Engage an accredited certification body (for ISO 27001) | ✗ Not started |

## What "done" means here

Every ✓ above refers only to internal tooling existing and working (tests
passing, real Prisma persistence, honest stub comments) — it is evidence
this package is a credible starting point for an eventual audit engagement,
not evidence that an audit has occurred or that any control has been proven
effective over time.
