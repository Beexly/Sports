# Statement of Applicability (SoA) — DRAFT TEMPLATE

> **Status: draft template, to be completed by a real ISMS owner.** This is
> not a completed Statement of Applicability and does not constitute or
> imply ISO 27001 certification — an SoA is one input to a certification
> audit performed by an accredited certification body, not a substitute for
> one. See [`README.md`](./README.md) for the full non-claims disclaimer.

## Purpose

Lists the ISO 27001 Annex A control families that `CONTROL_LIBRARY`
(`packages/compliance/src/control-library.ts`) currently touches, with
applicability and justification columns for a real ISMS owner to complete.
This is deliberately a subset of the full Annex A control set — it reflects
only the controls this CCM currently automates, not a full Annex A coverage
review.

## Columns

- **Annex A control**: control family identifier.
- **Applicable?**: Yes/No — to be confirmed by the ISMS owner.
- **Justification**: why the control is (or isn't) applicable to this ISMS
  scope (see `ISMS_SCOPE.md`).
- **Implemented via**: which `CONTROL_LIBRARY` entry / CCM check backs it,
  if any.

## Table

| Annex A control | Applicable? | Justification | Implemented via |
|---|---|---|---|
| A.5.1 Policies for information security | TBD | Foundational governance control; underlies the whole control library | (policy documentation — not yet formalized) |
| A.5.15 Access control | TBD | Privileged access to production systems must be controlled | `CTL-ACC-001` |
| A.5.17 Authentication information | TBD | Credentials/MFA factors for privileged accounts | `CTL-ACC-001` |
| A.5.19 Information security in supplier relationships | TBD | Third-party/subprocessor risk is in ISMS scope | `CTL-SUP-001` |
| A.5.21 Managing information security in the ICT supply chain | TBD | Vendor/supply-chain risk for ICT dependencies | `CTL-SUP-001` |
| A.8.5 Secure authentication | TBD | MFA for privileged accounts | `CTL-ACC-001` |
| A.8.15 Logging | TBD | Agent decisions and control-relevant events are logged | `CTL-LOG-001`, `CTL-AI-001` |
| A.8.16 Monitoring activities | TBD | Continuous control monitoring (the CCM itself) | `CTL-MON-001`, `CTL-AI-001` |
| A.8.24 Use of cryptography | TBD | Receipt signing / key management | `CTL-LOG-002`, `CTL-KEY-001` |
| A.8.25 Secure development life cycle | TBD | Change management touches SDLC practices | `CTL-CHG-001` |
| A.8.32 Change management | TBD | Production deploys require PR + passing checks | `CTL-CHG-001` |

## Review

Every "TBD" above must be resolved by a named ISMS owner before this
document is treated as a real SoA. This template does not assert
applicability on its own.
