# CSV Header Contract Notes

**Status:** Validation hardening.
**Related decision:** DEC-NEXT-076

## DEC-NEXT-076 - Enforce monetization CSV header contract

**Decision:** Add a generated CSV header contract and fail validation if a tracked CSV's header changes without an intentional contract update.

**Why now:** CSV parsing catches malformed files, but not header drift. The monetization pack relies on CSV trackers for interviews, KPI review, outreach, risk, referrals, retention, and production logs. Silent header drift can break workflows later even when files still parse.

## Implemented

- [csv-header-contract.json](../tools/csv-header-contract.json) snapshots the current header row for every CSV under `docs/monetization-v3/`.
- [validate-monetization-v3.ps1](../tools/validate-monetization-v3.ps1) checks every CSV against the contract and fails when a CSV is missing from the contract or a header changes.

## Updating The Contract

Only update the contract when a CSV header change is intentional. After editing a CSV header, regenerate the contract and include the rationale in the relevant decision/log note.

## Guardrail

This contract checks header stability only. It does not validate row-level semantics or require every CSV to contain data rows.
