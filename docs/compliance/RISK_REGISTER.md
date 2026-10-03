# Risk Register — TEMPLATE

> **Status: template only.** The rows below marked EXAMPLE are illustrative
> placeholders, not a real risk assessment. A formal risk register must be
> populated and owned by a designated risk owner as part of ISMS operation
> (see [`SOC2_TYPE_II_PATH.md`](./SOC2_TYPE_II_PATH.md) — "formal risk
> register" is a listed prerequisite, not yet met). This document does not
> constitute a completed risk assessment and confers no certification — see
> [`README.md`](./README.md).

## Columns

| Column | Meaning |
|---|---|
| Risk ID | Stable identifier, e.g. `RISK-001` |
| Description | What could go wrong and why it matters |
| Likelihood | Low / Medium / High (or a numeric scale, once adopted) |
| Impact | Low / Medium / High (or a numeric scale, once adopted) |
| Owner | Named individual accountable for tracking/mitigating |
| Mitigation | Current or planned control(s) addressing the risk |
| Status | Open / Mitigating / Accepted / Closed |
| Review date | Next scheduled review of this risk |

## Register

| Risk ID | Description | Likelihood | Impact | Owner | Mitigation | Status | Review date |
|---|---|---|---|---|---|---|---|
| RISK-001 (EXAMPLE) | Privileged account compromised due to missing MFA | Medium | High | Security Lead | `CTL-ACC-001` MFA coverage check | Mitigating | TBD |
| RISK-002 (EXAMPLE) | Production deploy bypasses code review / CI checks | Low | High | Engineering Lead | `CTL-CHG-001` change-management check | Mitigating | TBD |
| RISK-003 (EXAMPLE) | Agent decision receipts are unsigned or unverifiable, breaking after-the-fact audit | Medium | Medium | AI Platform Lead | `CTL-LOG-002` receipt-signature check (pending `feat/governed-receipts` merge) | Open | TBD |

Add real rows, remove the EXAMPLE markers only once each row reflects an
actual assessed risk with a real owner and review cadence.
