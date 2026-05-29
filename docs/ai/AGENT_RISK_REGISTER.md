# Agent Risk Register — Galaxy Sports Edge

Per-risk register backing `apps/web/lib/ai-governance/risk-controls.ts`.
Each entry maps an OWASP LLM Top 10 risk to a NIST AI RMF function, a
severity, a control, and an owner.

Owner: founder (all controls).
Last reviewed: 2026-05-29.

| ID | OWASP Risk | NIST Fn | Severity | Control Summary | Enforcement | Status |
|---|---|---|---|---|---|---|
| rc-001 | prompt-injection | manage | high | Structural separation of system and user prompts; external content wrapped in `<untrusted_external_data>`; refuse embedded instructions. | code | active |
| rc-002 | insecure-output-handling | manage | high | Generated content gated by `evaluateGeneratedBlogPolicy`. Model is never treated as an outcome authority. | code | active |
| rc-003 | sensitive-information-disclosure | govern | critical | System prompts, weights, thresholds server-only. TS-014 in trade-secret inventory. | design | active |
| rc-004 | excessive-agency | govern | critical | Model cannot bet, message, or pay. Boundaries enumerated in `assistant-boundaries.ts`. | design | active |
| rc-005 | overreliance | measure | high | Every pick has a failure case; every analytical surface links methodology; calibration gate. | design | active |
| rc-006 | training-data-poisoning | map | medium | Vendor API only; no fine-tune; prompts versioned. | review | active |
| rc-007 | model-DoS | manage | medium | Budget enforcement via `evaluateClaudeBudgetUsage`. | code | active |
| rc-008 | supply-chain | govern | medium | Pinned SDK; no third-party model hubs; no untrusted plugins. | review | active |
| rc-009 | model-theft | govern | medium | Repo private; prompts server-only; publish-gated public surface. | design | active |
| rc-010 | insecure-plugin-design | govern | low | No public plugin/tool-use surface. | design | active |

## Incident response

- Suspected boundary violation: page owner, freeze the surface, capture
  the offending prompt/response under the AI Tool Confidentiality Policy.
- Suspected secret disclosure: rotate keys, scan git history, file
  internal incident; never escalate via auto-message.
- Suspected prompt-injection in user-generated content: tighten the
  `<untrusted_external_data>` envelope; add a test repro.

## Amendments

Owner-only. Every amendment dated. Move retired controls to a "retired"
table at the bottom of this file rather than deleting them — auditability
requires history.
