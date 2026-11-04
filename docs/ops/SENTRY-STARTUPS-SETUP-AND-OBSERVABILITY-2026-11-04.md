# Sentry for Startups Setup & AI Observability Architecture

**Date:** 2026-11-04  
**Organization:** `galaxy-sports-edge`  
**Credit Grant:** $5,000 credit grant (active through November 4, 2027)  
**MCP Server:** `https://mcp.sentry.dev/mcp/galaxy-sports-edge` (or `https://mcp.sentry.dev/mcp`)  
**Status:** Integrated & Tested (Next.js 14 Web + Python 3.13 Intelligence Fleet)

---

## 1. Executive Summary & Capabilities Unlocked

Galaxy Sports Edge has been onboarded to **Sentry for Startups** with **$5,000 in credits**. This infrastructure upgrade enables:
1. **Full-Stack Error Monitoring:** Real-time production exception tracking with stack traces, breadcrumbs, release tagging, and environment segregation (`development`, `staging`, `production`).
2. **End-to-End Distributed Tracing:** Latency analysis across Next.js API routes, server actions, database queries, and background ingestion jobs.
3. **AI Agent Monitoring & GenAI Observability:** Dedicated tracking of Hermes, Jev, and model evaluation runs:
   - Span hierarchy: Agent runs $\to$ Tool calls $\to$ Model responses.
   - Conversation clustering by `gen_ai.conversation.id`.
   - Token accounting (input tokens, output tokens, total tokens) and model spend tracking across Anthropic, OpenAI, and DeepSeek.
4. **Seer AI Autonomous Debugging:** Sentry's Seer agent analyzes incoming errors, identifies root causes, and directly prepares automated pull requests or handoffs to coding agents via the Sentry MCP server.
5. **Model Context Protocol (MCP) Server Integration:** Live connectivity for coding assistants (Claude Code, Cursor, Antigravity) to query issues, inspect trace flamegraphs, and review exception logs directly from the IDE.

---

## 2. Model Context Protocol (MCP) Configuration

### A. Claude Code Setup (User / Global Scope)
Executed and configured via:
```bash
claude mcp add --transport http -s user sentry https://mcp.sentry.dev/mcp
```
*(On first interactive run, run `/mcp` in Claude Code to complete the one-time OAuth browser authorization).*

### B. Project Repository Configuration (`.mcp.json`)
The repository's root `.mcp.json` has been updated:
```json
{
  "mcpServers": {
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    },
    "context7": {
      "type": "http",
      "url": "https://mcp.context7.com/mcp"
    },
    "vercel": {
      "type": "http",
      "url": "https://mcp.vercel.com"
    },
    "sentry": {
      "type": "http",
      "url": "https://mcp.sentry.dev/mcp/galaxy-sports-edge"
    }
  }
}
```

---

## 3. Web & Next.js Implementation (`apps/web`)

### Architecture Principles:
- **Deterministic Zero-Secret Build:** We do **not** use `withSentryConfig` or build-time upload plugins. Next.js builds remain 100% deterministic and require no secret tokens at build time.
- **Runtime Initialization:** Sentry is initialized at runtime in `apps/web/instrumentation.ts` (server) and `apps/web/components/observability/SentryClientInit.tsx` (client) only when `SENTRY_DSN` or `NEXT_PUBLIC_SENTRY_DSN` is present.
- **Graceful Degradation:** When DSN is absent, all tracing, logging, and error calls cleanly no-op with zero overhead.

### Key API Surface (`apps/web/lib/observability/sentry.ts`):
```typescript
import {
  initObservability,
  captureError,
  traceAIAgentRun,
  traceAIToolCall,
  recordAITokenUsage,
  observabilityPosture
} from "@/lib/observability/sentry";

// Tracing an AI agent run:
const result = await traceAIAgentRun(
  {
    agentName: "hermes-forensic",
    model: "claude-3-7-sonnet",
    conversationId: "conv-123",
    prompt: "Evaluate Week 9 line movements"
  },
  async () => {
    // Agent execution logic
    return await executeAgentLogic();
  }
);

// Tracing a tool execution:
const odds = await traceAIToolCall(
  { toolName: "fetch_odds", args: { market: "spread" } },
  async () => await fetchOdds()
);

// Recording token usage:
recordAITokenUsage({ inputTokens: 420, outputTokens: 180, totalTokens: 600 });
```

---

## 4. Python GSE Intelligence Implementation (`intelligence/observability`)

### Package: `intelligence/observability/sentry_ai_tracer.py`
Installed package: `sentry-sdk>=2.73.0` (with built-in `MCPIntegration`).

### Key API Surface:
```python
from intelligence.observability.sentry_ai_tracer import (
    init_python_observability,
    trace_ai_agent_run,
    trace_ai_tool_call,
    record_ai_token_usage,
    capture_python_error,
    get_observability_posture,
)

# Initialize at startup (reads SENTRY_DSN from environment):
init_python_observability()

# Trace agent lifecycle:
with trace_ai_agent_run(agent_name="jev-simulation", model="~typesafe/jev-latest", conversation_id="game-101"):
    with trace_ai_tool_call(tool_name="simulate_snap", input_args={"snap": 42, "down": 3}):
        outcome = run_snap_eval()
    record_ai_token_usage(model="~typesafe/jev-latest", input_tokens=320, output_tokens=85)
```

---

## 5. Environment Variables Reference

| Variable | Scope | Purpose | Example |
|---|---|---|---|
| `SENTRY_DSN` | Server / Python | Ingestion DSN for backend services | `https://***@***.ingest.sentry.io/***` |
| `NEXT_PUBLIC_SENTRY_DSN` | Client (Browser) | Ingestion DSN for frontend errors & replays | `https://***@***.ingest.sentry.io/***` |
| `SENTRY_ORG` | All | Sentry Organization Slug | `galaxy-sports-edge` |
| `SENTRY_PROJECT` | All | Default project name | `sports-web` / `sports-intelligence` |
| `SENTRY_TRACES_SAMPLE_RATE` | All | Performance tracing sample rate | `0.1` (prod) / `1.0` (dev) |
| `SENTRY_REPLAY_SAMPLE_RATE` | Client | Session replay rate | `0.1` |
| `SENTRY_AUTH_TOKEN` | Local / CI | For Sentry MCP / Seer PR integration | User personal access token |

---

## 6. Verification & Test Coverage

1. **Next.js Vitest Suite:** `apps/web/__tests__/observability.test.ts` (16 passed)
   - Tested: zero-DSN no-op paths, idempotent init, AI agent run tracing, tool call tracing, token recording, posture reporting, source pins.
2. **Python Pytest Suite:** `intelligence/observability/tests/test_sentry_ai_tracer.py` (9 passed)
   - Tested: zero-DSN no-op paths, exception propagation, initialized mock spans, token usage recording, error capture with context bag.
3. **Repository Guardrails:** All 35 guardrails passing (`node scripts/guardrails/run-all.mjs`).
