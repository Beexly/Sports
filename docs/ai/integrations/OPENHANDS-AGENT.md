# OpenHands: Autonomous Software Agent Platform

> Source: `All-Hands-AI/OpenHands` (MIT, ~50k★)
> Purpose: Async dev automation — nightly health agents, PR automation, research-to-code pipelines

## What This Solves

Claude Code is synchronous — you prompt, it responds, you review. OpenHands runs
autonomously in the background while you sleep:

- **Nightly regression agent:** runs tests, diagnoses failures, writes fixes, opens PRs
- **PR automation:** when a data provider changes their odds API schema, an OpenHands
  agent rewrites the TypeScript types and migration automatically
- **Research-to-code:** agent browses ESPN box scores + sports-reference.com, synthesizes
  data, and writes ingestion scripts into the GSN codebase
- **Parallel agent fleet:** run Claude Code for architecture while OpenHands handles
  boilerplate (test fixtures, type stubs, API adapters)

## How It Differs from Claude Code

| | Claude Code | OpenHands |
|---|---|---|
| Mode | Interactive session | Autonomous / scheduled |
| Agent type | Single | Multi-agent, pluggable (can run Claude Code internally) |
| Triggers | Manual | Manual, webhook, schedule, GitHub event |
| Tool access | MCP servers | Browser, terminal, code editor, GitHub, Slack |
| Best for | Architecture, security review, complex reasoning | Repetitive tasks, async automation, parallel work |

Key insight: OpenHands **can run Claude Code as one of its agents** via the Agent Canvas
ACP protocol — so the two are complementary, not competing.

## Installation

```bash
# UI via npm (Agent Canvas)
npm install -g @openhands/agent-canvas
agent-canvas

# Docker (sandboxed — recommended for GSN dev)
docker run -it --rm \
  -p 8000:8000 \
  -v "$HOME/.openhands:/home/openhands/.openhands" \
  -v "/workspace/sports:/projects/sports" \
  ghcr.io/openhands/agent-canvas:1
# Open http://localhost:8000
```

## GSN Use Case 1: Nightly Health Agent

Set a scheduled automation that runs every night at 2am:

```json
{
  "schedule": "0 2 * * *",
  "agent": "openhands",
  "model": "claude-sonnet-4-20250514",
  "project": "/projects/sports",
  "task": "Run the full test suite (npm run test). If any tests fail: (1) read the error output, (2) identify the root cause, (3) write the fix if it's under 50 lines, (4) open a GitHub PR titled 'fix: nightly regression YYYY-MM-DD'. If tests pass, post a Slack message to #gsn-engineering: 'Nightly health check passed ✓'",
  "integrations": ["github", "slack"],
  "env": {
    "GITHUB_TOKEN": "${GITHUB_TOKEN}",
    "SLACK_TOKEN": "${SLACK_TOKEN}"
  }
}
```

## GSN Use Case 2: Odds API Schema Migration Automation

Wire a GitHub webhook: when a PR is opened with title containing "odds api schema change":

```json
{
  "trigger": "github:pull_request:opened",
  "filter": "title contains 'odds api schema change'",
  "agent": "claude-code",
  "task": "The Odds API changed their response schema. Read the PR description for the new shape. Update DataNormalizer.normalizeScores() in packages/data-ingestion/src/ to handle the new shape. Add a TypeScript type for the new response. Update the relevant unit test in packages/data-ingestion/src/__tests__/. Run npm run typecheck and npm run test to verify. Push the fix to the same branch."
}
```

## GSN Use Case 3: Research-to-Code Pipeline

```
Agent task: "Browse https://www.pro-football-reference.com/years/2025/passing.htm
and extract the top 20 QBs by EPA/play. Then write a TypeScript function
getEliteQBs(): Promise<QB[]> in packages/data-ingestion/src/reference-data.ts
that returns this data. Add a test in __tests__/reference-data.test.ts."
```

The agent browses the page (with vision understanding), extracts the table,
writes the TypeScript, and runs the tests — all without you touching it.

## GSN Use Case 4: Parallel Development Fleet

While you're in a Claude Code session on security fixes, OpenHands handles:

```
Canvas config (3 parallel agents):
  Agent A: "Write Vitest unit tests for all uncovered functions in
            packages/prediction-engine/src/ until coverage reaches 80%."

  Agent B: "Generate TypeScript JSDoc for all exported functions in
            apps/web/lib/community/ that are missing documentation."

  Agent C: "Find all TODO comments in the codebase, triage them by
            severity, and open GitHub issues for any rated HIGH."
```

All three run simultaneously. You review the PRs they open.

## GitHub Integration

Configure once in Agent Canvas:

```json
{
  "integrations": {
    "github": {
      "token": "${GITHUB_TOKEN}",
      "repo": "Beexly/Sports",
      "auto_create_prs": true,
      "pr_base_branch": "main",
      "pr_label": "agent-generated"
    }
  }
}
```

OpenHands creates properly labeled PRs with descriptions of what it did
and why — same pattern as Claude Code PRs.

## Slack Integration

```json
{
  "integrations": {
    "slack": {
      "token": "${SLACK_BOT_TOKEN}",
      "default_channel": "#gsn-engineering",
      "notify_on": ["task_complete", "pr_opened", "test_failure"]
    }
  }
}
```

## Remote Container Note

OpenHands requires Docker daemon access to run its agent sandbox. In a Claude Code
Remote session (CCR), verify the container permits spawning Docker children (DinD).
For local dev, Docker Desktop handles this automatically. For production automation,
deploy the OpenHands agent canvas on a separate VM or EC2 instance with full Docker
access — point it at the Sports GitHub repo and let it run.

## Cost Model

OpenHands uses Claude (or any LLM) per agent task. At typical task complexity:
- Nightly health check (pass): ~2,000 tokens → ~$0.006
- Nightly health check (fix needed): ~20,000 tokens → ~$0.060
- Research-to-code pipeline: ~50,000 tokens → ~$0.15

Run it through LiteLLM (see LITELLM-GATEWAY.md) for cost tracking and fallback.

## Status

- [ ] Install Agent Canvas: `npm install -g @openhands/agent-canvas`
- [ ] Configure GitHub integration with GITHUB_TOKEN
- [ ] Configure Slack integration for #gsn-engineering
- [ ] Set up nightly health agent (2am UTC)
- [ ] Wire GitHub webhook for odds API schema change automation
- [ ] Test with one manual task: "run tests and report results to Slack"
- [ ] Add agent-generated label to GitHub for tracking agent-opened PRs
