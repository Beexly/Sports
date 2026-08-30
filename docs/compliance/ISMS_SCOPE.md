# ISMS Scope Statement — DRAFT

> **Status: draft seed content, to be reviewed and formally adopted by a
> designated ISMS owner. Not yet an approved scope statement.** This document
> does not claim ISO 27001 certification or conformity — see
> [`README.md`](./README.md) for the full non-claims disclaimer.

## Purpose

Defines the boundary of the Information Security Management System (ISMS)
for Beexly/Sports (Galaxy Sports Edge): what is in scope for the controls in
`packages/compliance/src/control-library.ts`, and what is explicitly out of
scope pending future work.

## In scope (draft)

- Production application infrastructure serving Beexly/Sports (apps/web and
  its runtime dependencies, packages/db and the primary Postgres database).
- Agent/automation systems that make governed decisions on behalf of the
  platform (the governed-receipts admit/refuse decision surface, once
  merged), and the CI/CD pipeline that deploys production changes.
- Identity and access management for privileged/admin accounts on
  production systems.
- The Compliance Control Monitor itself (`packages/compliance/`) and the
  evidence/exception data it produces.

## Out of scope (draft — pending future ISMS work)

- Physical security of any office or data-center facility (cloud provider
  physical security is inherited/relied-upon, not independently assessed
  here).
- End-user devices not owned/managed by the organization.
- Third-party subprocessor internal controls beyond what is captured in the
  supplier register (see `CTL-SUP-001` and `STATEMENT_OF_APPLICABILITY.md`).
- Any subsidiary, acquired product, or business unit not explicitly named
  above.

## Interfaces and dependencies (draft)

- **Cloud/hosting provider**: production infrastructure and managed Postgres
  run on a third-party cloud provider; their compliance attestations (if
  any) are a supplier-risk input, not incorporated by reference into this
  ISMS.
- **Identity provider**: privileged account MFA state is read from an IdP
  integration (not yet built — `CTL-ACC-001` is currently fed by a manual
  snapshot; see `scripts/compliance/run-ccm.ts`).
- **Governed-receipts subsystem**: the decision-logging surface this ISMS's
  logging controls (`CTL-LOG-001`, `CTL-LOG-002`) depend on is being built on
  a sibling branch (`feat/governed-receipts`) and is not yet merged.

## Review

This scope statement has not been formally reviewed or approved. A named
ISMS owner should review, revise, and sign off on this document before it is
treated as authoritative for any external-facing purpose.
