# AgentCore Security Firebreak

Future AgentCore use is governed by a default-deny firebreak.

Global rules:
- no deploy permission by default
- no paid-resource permission by default
- no external-source automation by default
- no publishing authority by default
- no restricted-source retrieval
- no secret-reading authority by default
- no production write authority by default
- no secrets in memory
- no model-edge claims without measured evidence
- all tool use logged
- owner approval required for any write outside docs/evidence lanes

Agent tiers:
- JARVIS / CIO: Tier 0-1 only until owner approval.
- TAL / data reliability: Tier 0-1 only; source changes require legal/source owner review.
- SCOUT / model/picks: Tier 0-1 only; model runtime requires owner approval.
- Legal/source-risk sentinel: Tier 0 only.
- Calibration auditor: Tier 0-1 only; promotion requires owner approval.
- Market forensic agent: Tier 0-1 only; live mode remains disabled by default.
- Content/briefing agent: Tier 0 only; publishing requires owner approval.
- Partner-demo agent: Tier 0-1 only; partner data requires legal/partner approval.
- Revenue/pricing agent: Tier 0 only; billing changes prohibited.
- GitHub triage agent: Tier 0 only unless GitHub auth and owner approval exist.

Permission source of truth:
- `docs/fable/aws/AGENT_TOOL_PERMISSION_MATRIX.md`
- `docs/fable/aws/AGENT_EVALUATION_RUBRICS.md`
- `apps/web/lib/fable/aws-decision-engine.ts`

Rollback:
- disable env gate
- revoke tool token
- remove route/job binding
- preserve audit log
