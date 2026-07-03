# AgentCore Security Firebreak

Future AgentCore use is governed by a default-deny firebreak.

Global rules:
- no deploy permission by default
- no paid-resource permission by default
- no external-source automation by default
- no publishing authority by default
- no restricted-source retrieval
- all tool use logged
- owner approval required for any write outside docs/evidence lanes

Agents:
- JARVIS / CIO
- TAL / data reliability
- SCOUT / model/picks
- Legal/source-risk sentinel
- Calibration auditor
- Market forensic agent
- Content/briefing agent
- Partner-demo agent
- Revenue/pricing agent
- GitHub triage agent

Rollback:
- disable env gate
- revoke tool token
- remove route/job binding
- preserve audit log
