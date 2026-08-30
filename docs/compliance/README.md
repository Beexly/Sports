# Compliance Control Monitor (CCM) + ISMS alignment kit

This directory and `packages/compliance/` implement an internal SOC 2 Trust
Services Criteria (TSC) + ISO 27001 Annex A **control library with
continuous evidence collection, exception tracking, and an evidence-pack
export**.

## What this is

- A hand-maintained control library (`packages/compliance/src/control-library.ts`,
  mirrored in [`CONTROL_LIBRARY.md`](./CONTROL_LIBRARY.md)) mapping our
  controls to SOC 2 TSC, ISO 27001 Annex A, and (where relevant) NIST AI RMF
  reference points.
- A Compliance Control Monitor (`runCcm`) that runs a set of automated
  checks (receipt logging, receipt signatures, policy-version presence,
  production change management, MFA coverage), persists evidence for each
  check, and opens a tracked exception for every failing check.
- An evidence-pack export (`exportCompliancePack` /
  `scripts/compliance/export-evidence-pack.ts`) that bundles the control
  library, the last CCM run, and a sample of evidence into one JSON file for
  internal review.
- An admin status view at `/admin/compliance` showing the last run,
  per-control pass/fail, and open exceptions.

## What this is NOT — NON-CLAIMS

> **This package never claims, implies, or simulates a SOC 2 report or an
> ISO 27001 certificate, in code, in these docs, or in any UI copy.**
>
> - It does **not** issue a SOC 2 report of any type. A SOC 2 report can only
>   be issued by an accredited, independent CPA firm after they perform the
>   audit themselves.
> - It does **not** confer ISO 27001 certification. ISO 27001 certification
>   can only be issued by an accredited certification body after a formal
>   certification audit.
> - It does **not** replace legal counsel or an accredited auditor. Nothing
>   here is legal, audit, or compliance advice.
> - It does **not** claim EU AI Act conformity or any other regulatory
>   conformity assessment.
>
> Every document in this directory, the CCM run output, and the exported
> evidence pack all carry this same disclaimer:
>
> **"Internal alignment pack only. Not a SOC 2 report or ISO 27001
> certificate."**

## Usage

Run the CCM (writes real evidence/run/exception rows to Postgres):

```bash
DATABASE_URL=... DIRECT_URL=... npx tsx scripts/compliance/run-ccm.ts
```

Exits `0` if the run was fully passing, `1` otherwise. See the file for
which data sources are currently TODO-stubbed (empty arrays) pending real
integrations — it does not fabricate passing results for data it hasn't
actually collected.

Export the evidence pack from the last real run:

```bash
DATABASE_URL=... DIRECT_URL=... npx tsx scripts/compliance/export-evidence-pack.ts
```

Writes `docs/compliance/exports/compliance-pack-YYYYMMDD.json`.

View status: `/admin/compliance` (admin-gated, same as every other `/admin/*`
route in this app).

## Package layout

- `packages/compliance/` — the framework-agnostic control library, evidence
  hashing, checks, runner, and export-pack logic. No database or Next.js
  dependency; fully unit-testable with mocks (`packages/compliance/__tests__/ccm.test.ts`).
  It also has **no dependency on SRQC / `admitUnderSRQC`** — this package
  only monitors evidence after the fact, it never gates an admission
  decision.
- `apps/web/lib/compliance/store.ts` — Prisma adapters wiring the runner's
  injected `persistEvidence` / `saveRun` / `openException` seams to the
  `ComplianceEvidence` / `ComplianceCheckRun` / `ComplianceException` tables.
- `apps/web/app/admin/compliance/page.tsx` — the status view.
- `scripts/compliance/` — cron entry point and evidence-pack export CLI.

## Receipts integration status

The receipt checks (`CTL-LOG-001`/`CTL-LOG-002`) are written against a
**locally-defined** `ReceiptRow` / `VerifyFn` shape that mirrors the sibling
`feat/governed-receipts` branch's (not yet merged) `SignedGovernedReceipt`
and `verifyReceiptEd25519`. Every integration point carries a
`// TODO(governed-receipts): swap for the real @sports/governed export once
feat/governed-receipts merges` comment. Until that merge, `run-ccm.ts` feeds
these checks empty/stubbed data — see that script's comments for exactly
what is and isn't wired.

## See also

- [`ISMS_SCOPE.md`](./ISMS_SCOPE.md) — draft ISMS scope statement.
- [`RISK_REGISTER.md`](./RISK_REGISTER.md) — risk register template.
- [`STATEMENT_OF_APPLICABILITY.md`](./STATEMENT_OF_APPLICABILITY.md) — Annex A SoA draft.
- [`SOC2_TYPE_II_PATH.md`](./SOC2_TYPE_II_PATH.md) — honest Type I vs Type II readiness checklist.
- [`CONTROL_LIBRARY.md`](./CONTROL_LIBRARY.md) — human-readable control table.
