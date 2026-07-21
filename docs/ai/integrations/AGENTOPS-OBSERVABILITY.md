# AgentOps: AI Agent Observability + Tracing

> Source: `agentops-ai/agentops` (MIT, 4k★)
> Purpose: Full observability for every AI call, agent run, and tool use — Datadog for AI agents

## What This Solves

After Wave 2, GSN has:
- LiteLLM for cost tracking (how much per model)
- OpenHands for async automation

What's still missing: **tracing**. When a pick takes 4.5 seconds, which step caused it?
When pick quality drops on Monday nights, is it a model regression or a data issue?
When a user triggers $2 in AI spend, was it from picks generation or the chat advisor?

AgentOps answers these:
- **Session replay**: every agent run as a timeline — which tools were called, what the model saw, what it returned
- **Per-user cost attribution**: user A costs $0.02/session; user B costs $0.80/session
- **Error tracing**: when a pick errors, see the exact prompt that caused it
- **Latency breakdown**: LLM call vs tool call vs DB query
- **Model comparison**: same prompt, different models, side-by-side output

## How It Differs from LiteLLM

| | LiteLLM | AgentOps |
|---|---|---|
| Primary use | Request routing + cost budget | Tracing + replay + debugging |
| Output | Spend dashboard, rate limits | Session timeline, error replay |
| Granularity | Per model | Per session, per agent, per tool |
| User attribution | Virtual key groups | Session-level user tags |
| Replay | No | Yes — see full agent run |
| Alerts | Spend cap alerts | Latency, error rate, cost anomaly |

Use both: LiteLLM = traffic cop, AgentOps = black box recorder.

## Installation

```bash
# TypeScript (for Next.js / Node workers)
npm install agentops

# Python (for promptflow evaluations, OpenHands, llm CLI)
pip install agentops
```

## TypeScript Integration for GSN

### Instrument the pick generation service

**`apps/web/lib/ai/agentops.ts`**:
```typescript
import AgentOps from "agentops";

let agentOps: AgentOps | null = null;

export function getAgentOps(): AgentOps {
  if (!agentOps) {
    agentOps = new AgentOps({
      apiKey: process.env.AGENTOPS_API_KEY!,
      tags: ["gsn", process.env.NODE_ENV ?? "development"],
    });
  }
  return agentOps;
}
```

**`apps/web/lib/ai/picks-agent.ts`**:
```typescript
import { getAgentOps } from "./agentops.js";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export async function generatePickWithTracing(
  gameId: string,
  userId: string,
  tier: "FREE" | "PRO" | "ELITE",
): Promise<GeneratedPick> {
  const ao = getAgentOps();
  
  // Start a traced session — every AI call inside is recorded
  const session = ao.startSession({
    tags: ["pick-generation", tier, `game:${gameId}`],
    metadata: { userId, gameId, tier },
  });

  try {
    // Fetch game context (tool call — traced)
    const gameData = await session.traceAction(
      "fetch-game-context",
      () => db.game.findUnique({ where: { id: gameId }, include: { picks: false } })
    );

    // Call Claude (LLM call — traced)
    const response = await session.traceAction(
      "claude-pick-generation",
      () => client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 512,
        system: GSN_PICK_SYSTEM_PROMPT,
        messages: [{ role: "user", content: buildPickPrompt(gameData) }],
      })
    );

    const pick = parsePick(response.content[0].text);
    session.endSession("Success");
    return pick;

  } catch (err) {
    session.endSession("Fail", { error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}
```

### Per-user session tagging

For the picks advisor chat endpoint:
```typescript
// apps/web/app/api/chat/route.ts
const session = ao.startSession({
  tags: ["chat-advisor"],
  metadata: {
    userId: session?.user?.id,
    subscriptionTier: session?.user?.subscriptionTier,
    sessionStart: new Date().toISOString(),
  },
});
```

This gives you a dashboard breakdown: "ELITE tier users average $0.08/session; FREE tier users average $0.003/session."

## BullMQ Worker Integration

Instrument the data-refresh worker so every settlement run is traced:

**`workers/data-refresh/src/index.ts`**:
```typescript
import agentops from "agentops";

agentops.init({ 
  apiKey: process.env.AGENTOPS_API_KEY!,
  tags: ["data-refresh-worker"],
});

// Each BullMQ job processor becomes a traced session:
worker.on("active", (job) => {
  job.data._agentOpsSessionId = agentops.startSession({
    tags: ["settlement", job.name],
    metadata: { jobId: job.id, sport: job.data.sport },
  }).sessionId;
});

worker.on("completed", (job) => {
  agentops.endSession(job.data._agentOpsSessionId, "Success");
});

worker.on("failed", (job, err) => {
  agentops.endSession(job.data._agentOpsSessionId, "Fail", { error: err.message });
});
```

## Dashboard Queries (app.agentops.ai)

After instrumentation, the dashboard answers:

**Cost per user:**
```
Filter: metadata.userId = "user_123"
Group by: tags[pick-generation, chat-advisor]
Metric: total_cost, avg_latency
```

**Pick generation latency breakdown:**
```
Session type: pick-generation
Timeline view: fetch-game-context → claude-pick-generation → parsePick
Identify: which step is the P99 bottleneck?
```

**Error rate by model:**
```
Filter: LLM calls where error is not null
Group by: model
→ "Haiku errors 3x more often on structured JSON output than Sonnet"
```

**Nightly health check (OpenHands agent):**
```
Filter: tags[nightly-health]
Show: success rate, token count, cost per run
Alert: if cost > $0.50/run (indicates unexpected re-runs or runaway agents)
```

## Alerts to Configure

In app.agentops.ai → Alerts:

| Alert | Threshold | Action |
|---|---|---|
| Pick generation latency | P95 > 4s | PagerDuty or Slack #gsn-alerts |
| Session error rate | > 5% in 15min | Immediate Slack notification |
| User cost anomaly | Single user > $5/day | Review + possible rate limit |
| Daily spend | > $50/day | Budget alert |
| Model error rate | Any model > 2% errors | Fallback to secondary model |

## Environment Variables

```bash
# .env.local (apps/web)
AGENTOPS_API_KEY=aos_...

# workers/data-refresh/.env
AGENTOPS_API_KEY=aos_...
```

## Cost

AgentOps free tier: 10,000 sessions/month. Paid: $0.002/session beyond that.

At GSN's expected load (500 pick generations/day + 200 chat sessions):
- Sessions/month: ~21,000
- Cost: (21,000 - 10,000) × $0.002 = **$22/month**
- Compared to debugging a single latency regression manually: easily worth it

## Status

- [ ] `npm install agentops` in `apps/web` and `workers/data-refresh`
- [ ] Create `apps/web/lib/ai/agentops.ts` singleton
- [ ] Wrap `generatePick()` with session tracing
- [ ] Wrap `/api/chat` endpoint with session tracing
- [ ] Add AGENTOPS_API_KEY to Vercel env vars
- [ ] Instrument BullMQ worker job lifecycle
- [ ] Set up cost + latency + error alerts in dashboard
- [ ] Add AgentOps session ID to structured logs for cross-system correlation
