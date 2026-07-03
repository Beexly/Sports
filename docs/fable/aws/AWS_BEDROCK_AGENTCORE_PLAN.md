# Bedrock AgentCore Plan

Official references:
- https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/what-is-bedrock-agentcore.html
- https://aws.amazon.com/bedrock/agentcore/
- https://aws.amazon.com/bedrock/agentcore/pricing/

Observed AWS positioning:
- AgentCore is an agent platform for building, deploying, and operating agents with permissions, governance, monitoring, and tool/data access controls.
- Pricing is consumption-based per AWS pricing page.

Repo fit:
- Useful only after an agent action model exists.
- Must not bypass existing trust, source rights, or cost guardrails.

Required before any build:
- Tool allowlist.
- Human approval points.
- Spend cap.
- Audit event schema.
- Test harness with local fake tools.
