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

## Personal AWS Learning Feed

Bedrock and AgentCore learning improves local agent governance before any model call or runtime exists.

Learning effects:
- better distinction between a local fake agent, a paid model call, and a hosted agent runtime.
- stronger tool permission matrix.
- stronger policy boundaries for agent actions.
- clearer cost exposure around model calls, runtime, and paid tools.
- better evaluation rubrics for tool refusal, evidence labeling, and rollback.

No-cost repo actions:
- local fake-agent workflow only.
- prompt/tool policy docs only.
- deterministic tests for blocked actions before any model integration.

Still blocked:
- paid model calls.
- AgentCore runtime.
- marketplace payments.
- secret-reading tools.
- deploy or production write authority.
