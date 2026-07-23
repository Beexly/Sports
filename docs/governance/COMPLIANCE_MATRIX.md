# Governed Receipts — Compliance Matrix

> **DISCLAIMER**: This is an internal engineering mapping, prepared by the
> team that built the control plane, for the team's own traceability
> purposes. It is **not** a legal opinion, **not** an audit finding, and
> **not** a claim of certification or compliance with any regulatory
> framework, standard, or law. Only qualified counsel and/or an accredited
> auditor can make those determinations. Framework column names below use
> generic theme language (e.g. "Govern", "Map", "Traceability") borrowed
> from public frameworks for orientation only — inclusion in this table
> asserts nothing about GSE/Beexly's actual conformance status.

## Purpose

This table maps concrete runtime controls that ship in this repository to
the generic *themes* used by widely-referenced AI governance frameworks, so
an engineer (or a counterparty's engineer) can quickly see which control
addresses which kind of concern. It does not assert that any theme is
"satisfied" — only that a control exists which is *relevant* to it.

## Mapping

| Runtime control (this repo) | Where | NIST AI RMF function (generic) | ISO/IEC 42001 theme (generic) | EU AI Act theme (generic) |
|---|---|---|---|---|
| Agent/tool inventory — every gated tool call routes through `createGoverned()` with an explicit `tool` name and `agentId` | `packages/governed/src/governed.ts` | Map | AI system inventory / roles & responsibilities | Record-keeping |
| `SrqcVersion` register — human-activated certificate-version tracking | `apps/web/lib/ai-control-plane/formal-incident.ts` | Govern | Change management / versioning | Technical documentation |
| Admit/refuse decision, computed pre-execution | `admitUnderSRQC` (`srqc-projection.ts`), wired via `governed-gate.ts` | Manage | Operational controls | Human oversight (decision is inspectable, not opaque) |
| Signed, publicly verifiable receipt per gated call | `packages/governed/src/receipt-sign-ed25519.ts`, `GET /api/receipts/[id]`, `GET /.well-known/receipt-keys.json` | Manage / Measure | Traceability / Logging | Record-keeping, transparency |
| Append-only control-event ledger backing the receipt | `apps/web/lib/ai-control-plane/event-ledger.ts` | Measure | Logging | Record-keeping |
| Shadow metrics — `SHADOW_WOULD_REFUSE` tag recorded even when nothing is blocked | `governed.ts` (SHADOW branch) | Measure | Monitoring | Post-market monitoring (posture) |
| Key rotation / retirement / revocation for receipt signatures | `packages/governed/src/rotate-keys.ts`, `keyring.ts` | Manage | Operational controls / cryptographic key management | Cybersecurity (generic) |
| Default-safe posture — SHADOW unless `SRQC_ENFORCE=1` explicitly set | `resolveSrqcModeFromEnv` (`srqc-projection.ts`) | Govern | Risk-based control activation | Human oversight (no silent auto-block) |
| **NON-CLAIMS** (see below) | — | — | — | — |

## Non-claims

- No claim of NIST AI RMF conformance, ISO/IEC 42001 certification, or EU AI
  Act compliance is made anywhere in this repository's code, comments, or
  documentation.
- No claim that any AI system built on this control plane has been
  independently audited.
- No claim about risk-tier classification under the EU AI Act — see
  `docs/governance/EU_AI_ACT_POSTURE.md` for the (also non-asserted) posture
  discussion.
- This table will go stale as the code evolves; treat it as a snapshot, not
  a living certification artifact, unless and until an explicit process
  exists to keep it current against an actual audit.
