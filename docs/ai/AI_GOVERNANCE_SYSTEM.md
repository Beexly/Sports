# AI Governance System — Galaxy Sports Edge

## Posture

Galaxy uses AI to **draft, summarize, and explain**. It does not use AI
to **decide, bet, or transact**. Every AI surface operates inside a
named boundary, against a named risk control, with a named human owner.

## Framework alignment

Methodological alignment only — no certification claimed:

- **NIST AI RMF (Govern / Map / Measure / Manage)** — each risk control
  is tagged with the NIST function it operationalizes.
- **OWASP LLM Top 10** — each control names the OWASP risk it mitigates.
- **ISO/IEC 42001-style management discipline** — owner, review cadence,
  amendment process, audit trail.

## Architecture

```
docs/ai/
├── AI_GOVERNANCE_SYSTEM.md       (this file)
├── AGENT_RISK_REGISTER.md        (per-risk owner + status)
├── AI_ASSISTANT_BOUNDARIES.md    (per-surface behavior contract)
└── AI_EVALUATION_RUBRIC.md       (pre-ship evaluation criteria)

apps/web/lib/ai-governance/
├── risk-controls.ts              (10 RISK_CONTROLS, OWASP-tagged)
├── assistant-boundaries.ts       (6 ASSISTANT_BOUNDARIES + checker)
└── agent-actions.ts              (allow-list + hard-forbidden list)
```

## Three layers

1. **Risk control catalog** (10 entries) — what we mitigate, how, who.
2. **Assistant boundary register** (6 entries) — what the user-facing
   assistant must refuse and how to detect a refusal violation.
3. **Agent action register** — what an autonomous agent may do
   (allow-list of ~10) and what no agent may ever do (hard-forbidden
   list of 13 actions including `place-bet`, `transfer-funds`,
   `modify-guardrails`).

## Defense in depth

- **Before the call**: prompts forbid behavior; system / user prompts
  are structurally separated.
- **During the call**: assistant boundaries scan output for refusal
  pattern hits.
- **After the call**: trust-gate scans the rendered surface for banned
  phrases; compliance-scanner enforces tier-specific copy rules.

## Amendments

- Owner-only amendments to RISK_CONTROLS, ASSISTANT_BOUNDARIES, and the
  agent action lists.
- Every amendment dated and journaled.
- The trust-gate, no-fake-percentages test, and compliance scanner are
  named in `HARD_FORBIDDEN_ACTIONS` so no agent can self-modify them.

## Review cadence

- Quarterly: re-evaluate RISK_CONTROLS against current OWASP top 10
  guidance.
- Monthly: review boundary refusal rates from production logs (bucketed).
- Per-release: pre-ship evaluation against AI_EVALUATION_RUBRIC.md.
